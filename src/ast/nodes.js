/**
 * Abstract nodes of the scad language
 * @module ast/nodes
 */
const _ = require('lodash');

function Nodes(registerClass) {

    /**
     * Node base class
     * 
     * @class Node
     * 
     * @param {Array.Node} children Children of this node
     * @param {any} [privateProps={}] Private properties of this node
     * @param {any} token The token of this node
     */
    class Node {
        constructor(children, token) {
            if (_.isArray(children)) {
                children = _.filter(children, x => !!x);
                _.each(children, (child) => {
                    child.parent = this;
                });
                this.children = children;
            }
            else
                this.children = [];

            this.location = token ? new Location(token) : null;
        }

        /**
         * Get the name of this class
         * 
         * @readonly
         * @returns [String} Name of the constructor
         */
        get className() {
            return this.constructor.name;
        }

        /**
         * Set the children of this node
         * 
         * @param {Array.Node} children Children of this node
         * @returns {Node} this
         */
        setChildren(children) {
            children = _.filter(children, x => !!x);
            this.children = [];
            _.each(children, child => {
                this.children.push(child);
                child.parent = this;
            });
            return this;
        }

        /**
         * Create a string with count whitespaces
         * 
         * @param {number} count Count of whitespaces
         * @returns [String}
         */
        indentToString(count) {
            return _.times(count * 2, () => ' ').join('');
        }

        /**
         * Get string representation of children
         * 
         * @param {Object} options Options for outputting the children
         * @returns [String}
         */
        childrenToString(options) {
            let { indent: indentCount, children } = options;
            let indent = this.indentToString(indentCount);
            if (_.isString(children)) {
                if (/\n/.test(children))
                    return children.replace('\n', '\n' + indent) + indent;
                else
                    return children.toString();
            }
            else if (_.isArray(children)) {
                if (children.length > 0)
                    return '\n' + _.map(children, child => {
                        if (child === null)
                            return '(null)\n' + indent;
                        if (_.isNumber(child))
                            return child + '\n' + indent;
                        return child.toString({ indent: indentCount + 1 }) + '\n';
                    }).join('') + indent;
                return '';
            }

            if (children)
                return children.toString();
            return '(null)';
        }

        /**
         * Get string representation of params
         * 
         * @param {array} params Params to convert
         * @returns [String}
         */
        paramsToString(params) {
            return _.map(params, (val, name) => ' ' + name + '="' + val + '"').join('');
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0, params: {}, children: []}] 
         * @returns [String}
         */
        toString(options = {
            indent: 0,
            params: {},
            children: []
        }) {
            let indent = this.indentToString(options.indent);
            return `${indent}<${this.className.replace('Node', '')}${this.paramsToString(options.params)}>${this.childrenToString(options)}</${this.className.replace('Node', '')}>`;
        }
    }
    registerClass(Node);

    /**
     * Root node of an AST
     * 
     * @class RootNode
     * @extends {Node}
     * 
     * @param {Array.Node} children Children of this node
     */
    class RootNode extends Node {
        constructor(children) {
            super(children, null);
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString(options = { indent: 0 }) {
            return super.toString({ children: this.children, indent: options.indent })
        }
    }
    registerClass(RootNode);

    /**
     * Code comment
     * 
     * @class CommentNode
     * @extends {Node}
     * 
     * @param {any} token 
     * @param {any} text 
     * @param {boolean} [multiline=false] 
     */
    class CommentNode extends Node {
        constructor(token, text, multiline = false) {
            super(null, token);
            this.text = multiline ? text : text.trim();
            this.multiline = multiline;
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString(options = { indent: 0 }) {
            const indent = this.indentToString(options.indent);
            return super.toString({
                children: this.text,
                indent: options.indent
            })
        }
    }
    registerClass(CommentNode);

    /**
     * Variable definition
     * 
     * @class VariableNode
     * @extends {Node}
     * 
     * @param {any} token 
     * @param {any} name 
     * @param {any} value 
     */
    class VariableNode extends Node {
        constructor(token, name, value) {
            super(null, token);
            this.name = name;
            this.value = value;
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString(options = { indent: 0 }) {
            return super.toString({
                children: this.value,
                params: {
                    name: this.name,
                    type: this.value.constructor.name
                },
                indent: options.indent
            });
        }
    }
    registerClass(VariableNode);

    /**
     * Include statement
     * 
     * @class IncludeNode
     * @extends {Node}
     * 
     * @param {any} token 
     * @param {any} file 
     */
    class IncludeNode extends Node {
        constructor(token, file) {
            super(null, token);
            this.file = file;
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString(options = { indent: 0 }) {
            return super.toString({
                children: this.file,
                indent: options.indent
            })
        }
    }
    registerClass(IncludeNode);

    /**
     * Use statement
     * 
     * @class UseNode
     * @extends {IncludeNode}
     */
    class UseNode extends IncludeNode {
    }
    registerClass(UseNode);

    /**
     * Module definition
     * 
     * @class ModuleNode
     * @extends {Node}
     * 
     * @param {any} token 
     * @param {any} name 
     * @param {any} params 
     * @param {any} block 
     */
    class ModuleNode extends Node {
        constructor(token, name, params, block) {
            super(block, token);
            this.name = name;
            this.params = params;
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString(options = { indent: 0 }) {
            let params = {
                name: this.name
            };
            if (this.params !== null && this.params.length > 0)
                params.params = this.params;

            return super.toString({
                children: this.children,
                indent: options.indent,
                params
            });
        }
    }
    registerClass(ModuleNode);

    /**
     * For loop statement
     * 
     * @class ForLoopNode
     * @extends {Node}
     * 
     * @param {any} token 
     * @param {any} params 
     * @param {any} block 
     */
    class ForLoopNode extends Node {
        constructor(token, params, block) {
            super(block, token);
            this.params = params;
        }
    }
    registerClass(ForLoopNode);

    /**
     * Action call statement
     * 
     * @class ActionNode
     * @extends {Node}
     * 
     * @param {any} token 
     * @param {any} name 
     * @param {any} [params=[]] 
     */
    class ActionNode extends Node {
        constructor(token, name, params = []) {
            super(null, token);
            this.name = name.replace(/([!#\*\%]?)(.*)/, '$2');
            this.modifier = name.replace(/([!#\*\%]?)(.*)/, '$1');
            this.params = params;
        }

        /**
         * Set a label
         * 
         * @param {string} label 
         * @returns {ActionNode} this
         * 
         * @memberOf ActionNode
         */
        setLabel(label) {
            this.label = label;
            return this;
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString(options = { indent: 0 }) {
            let params = {
                name: this.name,
            };
            if (this.label !== null)
                params.label = this.label;
            if (this.modifier !== null)
                params.modifier = this.modifier;
            if (this.params !== null && this.params.length > 0)
                params.params = this.params;
            return super.toString({
                indent: options.indent,
                children: this.children,
                params
            });
        }
    }
    registerClass(ActionNode);

    /**
     * Function definition
     * 
     * @class FunctionNode
     * @extends {Node}
     * 
     * @param {any} token 
     * @param {any} name 
     * @param {any} params 
     * @param {any} expression 
     */
    class FunctionNode extends Node {
        constructor(token, name, params, expression) {
            super(null, token);
            this.name = name;
            this.params = params;
            this.expression = expression;
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString(options = { indent: 0 }) {
            let params = {
                name: this.name
            };
            if (this.params && this.params.length > 0)
                params.params = this.params;
            return super.toString({
                children: this.expression,
                indent: options.indent,
                params
            });
        }
    }
    registerClass(FunctionNode);

    /**
     * Expression
     * 
     * @class ExpressionNode
     * @extends {Node}
     * 
     * @param {any} leftExpression 
     * @param {any} [rightExpression=null] 
     * @param {any} [operator=null] 
     * @param {boolean} [negative=false] 
     */
    class ExpressionNode extends Node {
        constructor(leftExpression, rightExpression = null, operator = null, negative = false) {
            super(null, null);

            this.leftExpression = leftExpression;
            this.rightExpression = rightExpression;
            this.operator = operator;
            this.negative = negative;

            if (leftExpression.constructor.name === 'ExpressionNode') {
                leftExpression.parent = this;
            }
            if (rightExpression !== null && rightExpression.constructor.name === 'ExpressionNode') {
                rightExpression.parent = this;
            }
        }

        /**
         * Turn this expression negative
         * 
         * @param {Boolean} neg 
         * @returns {ReferenceValue} this
         */
        setNegative(neg) {
            this.negative = neg;
            return this;
        }

        /**
         * Get string representation of this node
         * 
         * @param {Object} [options={ indent: 0 }] 
         * @returns [String}
         */
        toString() {
            if (this.rightExpression === null)
                return `${this.negative ? '- ' : ''}${this.leftExpression}`;
            if (this.rightExpression !== null && this.operator !== null)
                return `${this.negative ? '- ' : ''}(${this.leftExpression}${this.operator}${this.rightExpression})`;
        }
    }
    registerClass(ExpressionNode);
};

module.exports = Nodes;