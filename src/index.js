const _ = require('lodash'),
  Promise = require('bluebird'),
  fs = require('fs'),
  path = require('path'),
  childProcess = require('child_process'),
  moo = require('moo'),
  nearley = require("nearley"),
  grammar = require("./nearley/grammar"),
  tokens = require("./nearley/tokens").tokens,
  inspect = require('util').inspect;

const lexer = moo.compile(tokens);

/**
 * Parser for OpenSCAD code
 * 
 * @class SCADParser
 * 
 */
class SCADParser {
  constructor() {
    this.ignoredTokens = ['whitespace', 'eol'];
    this.results = null;
    this.cache = [];
    this.codeCache = [];
    this.tokenCache = [];
  }

  /**
   * Parse the supplied code
   * 
   * @param {string} code Cointains the code to be parsed
   * @param {string} file Name of the parsed file
   * @returns {RootNode} Root node of the code's AST
   */
  parse(code, file) {
    this.tokenCache[file] = [];
    try {
      const parser = new nearley.Parser(grammar.ParserRules, grammar.ParserStart);
      let token;

      // Feed whole code to lexer
      lexer.reset(code);

      // Iterate through code
      while (token = lexer.next()) {
        // Ignore token, if defined
        if (this.ignoredTokens.includes(token.type))
          continue;

        // Capture token
        this.tokenCache[file].push(token);

        // Feed the token to the parser
        parser.feed([token]);
      }
      return new RootNode(parser.results[0]);
    } catch (error) {
      // Get last lexed token
      const last = this.tokenCache[file][this.tokenCache[file].length - 1];

      // Check if last token is a LexerError
      if (last && last.type === 'LexerError') {
        let location = new Location(last);
        let excerpt = this.getCodeExcerpt(file, location);
        error = new Error(`Lexer error:\n${last.value} ${location.toString()}\nExcerpt:\n\n${excerpt}`);
        // Add the location to the error
        error.location = location;
      }
      else {
        let location = new Location(last);
        let excerpt = this.getCodeExcerpt(file, location);
        let lastTokens = this.tokenCache[file].slice(this.tokenCache[file].length - 3, this.tokenCache[file].length);
        error = new Error(
          `Parser error: Unexpected token '${last ? last.value : 'undefined'}' (Type: ${last ? last.type : 'undefined'}, ${location.toString()})\nLast tokens: ["${lastTokens.join('", "')}"]\nExcerpt:\n\n${excerpt}`);
        // Add the last 3 tokens to the error
        error.lastTokens = lastTokens;
        // Add the location to the error
        error.location = location;
        // Add the code excerpt to the error
        error.excerpt = excerpt;
      }
      throw error;
    }
  }

  /**
   * Render the supplied code (with OpenSCAD)
   * 
   * @param {string} code Cointains the code to be parsed
   * @param {string} file Name of the parsed file
   * @param {object} options Options passed to `nodescad`
   * @returns {RootNode} Root node of the code's AST
   */
  render(code, file, options) {
    const writeFile = Promise.promisify(fs.writeFile);
    const exec = Promise.promisify(childProcess.exec);

    const render = (options) => {
      return exec(
        options.binaryPath
        + ' -o ' + options.outputFile
        + ' --colorscheme=' + options.colorScheme
        + ' ' + options.inputFile
      );
    };

    let _options = _.merge({
      binaryPath: '/usr/bin/openscad',
      viewAll: true,
      autoCenter: true
    }, options);
    if (!code && file) {
      _options.inputFile = file;
      return render(_options);
    }
    else if (code) {
      let tmpFile = '/tmp/' + (path.basename(file) || 'scad-parser_tmp.scad');
      return writeFile(tmpFile, 'utf8')
        .then(() => {
          _options.inputFile = tmpFile;
          return render(_options);
        });

    }
  }

  /**
   * Parse the abstract syntax tree
   * 
   * @param {string} file Path to the code file
   * @param {string} [code=null] Code of the file to parse (Only supplied, if the file content was read before)
   * @returns {RootNode} Root node of the code's AST
   */
  parseAST(file, code = null) {
    /*    if (this.cache[file])
          return this.cache[file];*/

    if (!_.isString(file) && !_.isString(code))
      throw new Error('You have to pass either code or file parameter!');

    let result;
    if (code) {
      this.codeCache[file] = code;
      this.cache[file] = this.parse(code, file);
    }
    else {
      let code = fs.readFileSync(file, 'utf8');
      this.codeCache[file] = code;
      this.cache[file] = this.parse(code, file);
    }

    return this.cache[file];
  }

  findTokens(value = null, type = null, file) {
    let find = {};
    if (value)
      find.value = value;
    if (type)
      find.type = type;
    return _.filter(this.tokenCache[file], find);
  }

  getToken(column, line, file) {
    let out = null;
    _.each(this.tokenCache[file], token => {
      if (
        line == token.line &&
        (column >= token.col && column < (token.col + token.size))
      ) {
        out = token;
        return false;
      }
    });
    return out;
  }

  /**
   * Get an except of the code file
   * 
   * @param {string} file Path to the code file
   * @param {Location} location Location of interest
   * @param {number} [lines=3] Coount of lines to print before and after the line of interest
   * @returns {string} The code excerpt string
   * 
   * @memberOf SCADParser
   */
  getCodeExcerpt(file, location, lines = 3) {
    let code = this.codeCache[file].split('\n');

    let start = location.line - (lines + 2);
    if (start < 0)
      start = 0;
    let end = location.line + (lines - 1);
    if (end >= code.length)
      end = code.length - 1;
    code = code.slice(start, location.line + (lines - 1));

    function pad(n, width, z) {
      z = z || '0';
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    function drawMarker(indent) {
      return _.times(indent, () => ' ').join('') + _.times(location.column + 1, () => ' ').join('')
        + '^' + _.times(location.size - 2, () => '-').join('') + '^';
    }

    return _.map(code, (line, index) => {
      if (index != location.line - 1)
        return `${pad(index + start + 1, end.toString().length)}: ${line}`;
      else
        return `${pad(index + start + 1, end.toString().length)}: ${line}\n${drawMarker(end.toString().length)}`;
    }).join('\n');
  }
}

module.exports = SCADParser;