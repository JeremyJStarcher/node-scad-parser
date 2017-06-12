"use strict";
/**
 * Abstract syntax representation of the scad language
 *
 */
/*import * as _ from 'lodash';
import { inspect } from 'util';*/
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./values"));
__export(require("./nodes"));
/**
 * Location in the code
 *
 *
 *
 *
 */
class Location {
    constructor(token) {
        let { offset, size, lineBreaks, line, col } = token || { offset: 0, size: 0, lineBreaks: 0, line: 1, col: 1 };
        this.offset = offset;
        this.size = size;
        this.lineBreaks = lineBreaks;
        this.line = line;
        this.column = col;
    }
    toString() {
        return `[Location: Offset=${this.offset}, Size=${this.size}, lineBreaks=${this.lineBreaks}, Line=${this.line}, Column=${this.column}]`;
    }
}
exports.Location = Location;
//# sourceMappingURL=index.js.map