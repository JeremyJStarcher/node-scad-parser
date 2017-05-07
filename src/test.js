const expect = require('expect.js'),
  Random = require('random-js');

const SCADParser = require('../src');

const parser = new SCADParser();

const randEngine = Random.engines.nativeMath;


const miscExpressions = [
  'a*b',
  '4.77/c',
  '1+(2-(3+(4-5)+6)-7)',
  '( -a * z) +3'
];

const miscStatements = [
  'color("blue") cube([1,2,3]);',
  'action(a,b,c);',
  'variable=ref*3+x*x;'
];

const randMaps = {
  operators: '*/%+-'
};

const rand = {
  pick: (values) => Random.pick(randEngine, _.isString(values) ? values.split('') : values),
  string: (value, length) => Random.string(value)(randEngine, length),
  integer: (min, max) => Random.integer(min, max)(randEngine),
  float: (min, max, inclusive) => Random.real(min, max, inclusive)(randEngine),
  identifier: () => {
    const prefix = rand.pick('_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const name = rand.string('_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', rand.integer(3, 9))
    return prefix + name;
  },
  statement: (count = null) => {
    if (!_.isNumber(count))
      return rand.pick(miscStatements);
    return _.times(count, () => rand.statement());
  },
  value: () => {
    let value = 1;
    switch(rand.integer(0,100)%3) {
      case 0:
      value=rand.integer(-10e6, 10e6);
      break;
      case 1:
      value=rand.float(-10e6, 10e6, true);
      break;
      case 2:
      value=rand.float(-10e6, 10e6, true).toExponential();
      break;
    }
    return value;
  },
  expression: () => {
    let length = rand.integer(2,6);
    let values = _.times(length, () => rand.value());
    let operators = _.times(length-1, () => rand.pick(randMaps.operators));

    return _.map(values, (value, index) => {
      return `${value}${operators[index] ? operators[index] : ''}`;
    }).join('');
  }
};

describe('SCADParser', function () {

  it('should have created an instance of SCADParser', function () {
    expect(parser).to.be.a(SCADParser);
  });

  describe('parseAST', function () {
    const statementTest = (statement, file, expected, furtherTests = (root) => { }) => {

      function truncateStatement(statement = '', max = 64) {
        const placeholder = '...';
        const statementLength = statement.length;
        if (statementLength > max) {
          const partA = statement.substring(0, max - placeholder.length - 1);
          return `${partA}${placeholder}`;
        }
        return statement;
      }

      it(`should parse ${/^[aeiou].*/i.test(expected.name) ? 'an' : 'a'} ${expected.name}: ${JSON.stringify(truncateStatement(statement))}`, function () {
        const root = parser.parseAST(file, statement);
        expect(root.children).to.have.length(1);
        expect(root.children[0]).to.be.a(expected);
        furtherTests(root);
      });
    };

    describe('with variable statements as input', function () {
      const variableTest = (value = 1, varType = NumberValue, furtherTests = (value) => { }) => {
        const name = rand.identifier();
        const statement = `${name} = ${value};`;
        const file = `var-${name}-${varType.name}.scad`;
        statementTest(statement, file, VariableNode, root => {
          expect(root.children[0].value).to.be.a(varType);

          if (
            varType !== VectorValue && 
            varType !== RangeValue && 
            varType !== ExpressionNode
            ) {
            let cleanValue = value.toString().replace('-', '').replace(/"([^"]*)"/, '$1');
            if (varType === BooleanValue)
              cleanValue = cleanValue === 'true' ? true : false;
            const expectedValue = new varType([], cleanValue);
            if (value < 0)
              expectedValue.setNegative(true);
            expect(root.children[0].value.isEqual(expectedValue)).to.equal(true);
          }

          furtherTests(root.children[0].value);
        });
      };

      for (let i = 0; i < 5; i++) {
        variableTest(rand.integer(-10e6, 10e6), NumberValue);
      }
      for (let i = 0; i < 5; i++) {
        variableTest(rand.float(-10e6, 10e6, true), NumberValue);
      }
      for (let i = 0; i < 5; i++) {
        variableTest(rand.float(-10e6, 10e6, true).toExponential(), NumberValue);
      }

      for (let i = 0; i < 5; i++) {
        variableTest('"' + rand.string('_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', rand.integer(3, 30)) + '"', StringValue);
      }

      variableTest(true, BooleanValue);
      variableTest(false, BooleanValue);

      for (let i = 0; i < 5; i++) {
        const vectorValues = _.times(rand.integer(3, 30), () => rand.integer(-10e6, 10e6));
        const vector = `[${vectorValues.join(', ')}]`;
        variableTest(vector, VectorValue, (value) => {
          expect(value.value).to.have.length(vectorValues.length);
          let expected = new VectorValue([], _.map(vectorValues, (expected, index) => {
            const expectedValue = new NumberValue([], expected.toString().replace('-', ''));
            if (expected < 0)
              expectedValue.setNegative(true);
            return expectedValue;
          }));
          expect(value.isEqual(expected)).to.equal(true);
        });
      }

      for (let i = 0; i < 5; i++) {
        const range = `[${_.times(rand.integer(2, 3), () => rand.integer(-10e6, 10e6)).join(':')}]`;
        variableTest(range, RangeValue, (value) => {
          /** @todo Check values */
        });
      }

      for (let i = 0; i < 5; i++) {
        variableTest(rand.identifier(), ReferenceValue);
      }

      for (let i = 0; i < 5; i++) {
        variableTest(rand.expression(), ExpressionNode);
      }
    });

    describe('with comment statements as input', function () {
      let slCommentStatement = '// Single line comment\n';
      let mlCommentStatement = '/* Multi\nline\ncomment */';

      statementTest(slCommentStatement, 'sl-comment.scad', CommentNode, root => {
        expect(root.children[0].text).to.equal('Single line comment');
        expect(root.children[0].multiline).to.equal(false);
      });
      statementTest(mlCommentStatement, 'ml-comment.scad', CommentNode, root => {
        expect(root.children[0].text).to.equal(' Multi\nline\ncomment ');
        expect(root.children[0].multiline).to.equal(true);
      });
    });

    describe('with include/use statements as input', function () {
      let includeStatement = 'include <file.scad>;';
      let useStatement = 'use <file.scad>;';

      statementTest(includeStatement, 'include.scad', IncludeNode, root => {
        expect(root.children[0].file).to.equal('file.scad');
      });
      statementTest(useStatement, 'use.scad', UseNode, root => {
        expect(root.children[0].file).to.equal('file.scad');
      });
    });

    describe('with module statements as input', function () {
      const moduleTest = (statementCount) => {
        const modStatements = rand.statement(statementCount);
        let moduleStatement = `module ${rand.identifier()}() { ${modStatements.join('\n')} }`;
        statementTest(moduleStatement, 'module.scad', ModuleNode, root => {
          expect(root.children[0].children).to.have.length(modStatements.length);
        });
      };

      for (let i = 0; i < 5; i++) {
        moduleTest(rand.integer(4, 8));
      }
    });

    describe('with function statements as input', function () {
      const functionTest = () => {
        const funcExpression = rand.expression();
        let functionStatement = `function ${rand.identifier()}() = ${funcExpression};`;
        statementTest(functionStatement, 'module.scad', FunctionNode, root => {
        });
      };

      for (let i = 0; i < 5; i++) {
        functionTest();
      }
    });
  });

  describe('Exceptions', function () {
    it('should throw an error, if neither code or file are passed to parseAST', function () {
      expect(parser.parseAST).to.throwException(/You have to pass either code or file parameter!/);
    });

    it('should throw a lexer error on "&%!" as invalid code', function () {
      expect(function () {
        try {
          parser.parseAST('lexer_error.scad',
            '&%!;'
          );
        } catch (error) {
          throw error;
        }
      }).to.throwException(/Lexer error/);
    });

    it('should throw a parser error on "myVar module ;" as invalid code', function () {
      expect(function () {
        try {
          parser.parseAST('parser_error.scad',
            'myVar module ;'
          );
        } catch (error) {
          throw error;
        }
      }).to.throwException(/Parser error/);
    });
  });

});