/**
 * Stores basic information about tokens from given grammar within Code-shift.
 */
export class TokenInfo {
    /**
     * Creates new instance of TokenInfo
     * @param {string} text The text of the token.
     * @param {number} start Postion of this token in the original source code.
     * @param {number} stop Postion of the end of this token in the original source code.
     * @param {number} tokenIndex Ordinal number of this token within the source code.
     * @param {boolean} isIdentifier Flag indicating whether this token is an identifier.
     * @param {string} color Color string used for syntax highliting.
     */
    constructor (text, start, stop, tokenIndex, isIdentifier, color) {
        this.text = text;
        this.start = start;
        this.stop = stop;
        this.tokenIndex = tokenIndex;
        this.isIdentifier = isIdentifier;
        this.color = color;
    }

    /**
     * Clones this instance of TokenInfo.
     * @returns Cloned instance.
     */
    Clone() {
        return new TokenInfo(this.text, this.start, this.stop, this.tokenIndex, this.isIdentifier, this.color);
    }
}

/**
 * Common interface for all blocks of code
 * @abstract
 */
 export class BaseCodeBlock {
    /**
     * Abstract class - Do not call
     */
    constructor() {
        if (this.constructor == BaseCodeBlock) {
            throw new Error("An instance of abstract class 'BaseCodeBlock' was to be crated.");
        }
    }
    /**
     * Enumerates all tokens of this codeblock in infix order.
     */
    *getTokens() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Determines, whether this codeblock contains any token.
     * @returns {boolean} boolean indicator.
     */
    isEmpty() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Adds new tokens to the left-most leaf of this codeblock.
     * @param {TokenInfo[]} tokens List of tokens to prepend.
     */
    addTokensToStart(tokens) {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Adds new tokens to the right-most leaf of this codeblock.
     * @param {TokenInfo[]} tokens List of tokens to append.
     */
    addTokensToEnd(tokens) {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Returns the left-most token of this codeblock.
     * @returns {TokenInfo} The first token.
     */
    getFirstToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Returns the right-most token of this codeblock.
     * @returns {TokenInfo} The last token.
     */
    getLastToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Removes the left-most token of this codeblock.
     */
    removeFirstToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Removes the right-most token of this codeblock.
     */
    removeLastToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Enumerates all tokens of this codeblock in infix order that are marked as identifiers.
     */
    *getIdentifiers() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Returns length of this codeblock in characters.
     * @returns {number} Length in characters.
     */
    getLengthInCharacters() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    /**
     * Gets all text of this codeblock in infix order, applying renames to any identifiers.
     * @param {object} renames 
     */
    getText(renames = {}) {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
}
/**
 * Common interface for all leaf blocks of code.
 * @abstract
 */
 export class BaseTokenList extends BaseCodeBlock {
    /**
     * @property {TokenInfo[]} tokens List of tokens in this node.
     */
    tokens = [];
    
    /**
     * Creates a new instance of BaseTokenList
     * @param {TokenInfo[]} tokens List of tokens.
     */
    constructor(tokens) {
        super();
        /**
         * Individual tokens of this block of code.
         * @type {TokenInfo[]}
         */
        this.tokens = tokens;
    }

    *getTokens() {
        for (var token of this.tokens) {
            yield token;
        }
    }
    
    isEmpty() {
        return this.tokens.length == 0;
    }

    addTokensToStart(tokens) {
        this.tokens = tokens.concat(this.tokens);
    }

    addTokensToEnd(tokens) {
        this.tokens = this.tokens.concat(tokens);
    }

    getFirstToken() {
        return this.tokens[0];
    }

    getLastToken() {
        if (this.tokens.length == 0) return undefined;
        else return this.tokens[this.tokens.length - 1];
    }

    removeFirstToken() {
        if (this.tokens.length == 0) return undefined;
        else {
            var token = this.tokens[0];
            this.tokens.splice(0,1);
            return token;
        }
    }

    removeLastToken() {
        if (this.tokens.length == 0) return undefined;
        else {
            var token = this.tokens[this.tokens.length - 1];
            this.tokens.splice(this.tokens.length - 1,1);
            return token;
        }
    }

    *getIdentifiers() {
        for (var token of this.tokens) if (token.isIdentifier) yield token.text;
    }

    getLengthInCharacters() {
        var length = 0;
        for (var token of this.tokens) length += token.text.length;
        return length;
    }

    getText(renames = {}) {
        var text = '';
        for (var token of this.tokens) {
            if (token.isIdentifier && token.text in renames) renames[token.text];
            else text += token.text;
        }
        return text;
    }
}
/**
 * Common interface for all non-leaf blocks of code
 * @abstract
 */
 export class BaseCommandList extends BaseCodeBlock {
    /**
     * Creates a new instance of BaseCommandList
     * @param {BaseCodeBlock[]} innerCode List of child blocks.
     */
    constructor(innerCode) {
        super();
        /**
         * List of child blocks.
         * @type {BaseCodeBlock[]}
         */
        this.innerCode = innerCode;
    }

    *getTokens() {
        for (var object of this.innerCode) {
            yield* object.getTokens();
        }
    }

    isEmpty() {
        if (this.innerCode.length == 0) return true;
        else {
            for (var block of this.innerCode) {
                if (!block.isEmpty()) return false;
            }
            return true;
        }
    }

    addTokensToStart(tokens) {
        if (this.innerCode.length == 0) {
            this.innerCode.push(new NonsemanticText(tokens));
        }
        else {
            this.innerCode[0].addTokensToStart(tokens);
        }
    }

    addTokensToEnd(tokens) {
        if (this.innerCode.length == 0) {
            this.innerCode.push(new NonsemanticText(tokens));
        }
        else {
            this.innerCode[this.innerCode.length - 1].addTokensToEnd(tokens);
        }
    }

    getFirstToken() {
        if (this.innerCode.length == 0) return undefined;
        else return this.innerCode[0].getFirstToken();
    }

    getLastToken() {
        if (this.innerCode.length == 0) return undefined;
        else return this.innerCode[this.innerCode.length - 1].getLastToken();
    }

    removeFirstToken() {
        if (this.innerCode.length == 0) return undefined;
        else {
            var token = this.innerCode[0].removeFirstToken();
            if (this.innerCode[0].isEmpty()) this.innerCode.splice(0,1);
            return token;
        }
    }

    removeLastToken() {
        if (this.innerCode.length == 0) return undefined;
        else {
            var token = this.innerCode[this.innerCode.length - 1].removeFirstToken();
            if (this.innerCode[this.innerCode.length - 1].isEmpty()) this.innerCode.splice(this.innerCode.length - 1,1);
            return token;
        }
    }
    
    *getIdentifiers() {
        for (var object of this.innerCode) {
            yield* object.getIdentifiers();
        }
    }
    
    getLengthInCharacters() {
        var length = 0;
        for (var object of this.innerCode) length += object.getLengthInCharacters();
        return length;
    }
    
    getText(renames = {}) {
        var text = '';
        for (var object of this.innerCode) text += object.getText(renames);
        return text;
    }
}
/**
 * This class isn't meant to be used for code distance calculation.
 * After all necessary preparations are done, instance of this class
 * should be used to create either 'SemanticDefinition'
 * or 'SemanticDefinition' instance.
 */
export class NonsemanticCommandList extends BaseCommandList {
    /**
     * Creates a new instance of NonsemanticCommandList
     * @param {BaseCodeBlock[]} innerCode List of child blocks.
     */
    constructor(innerCode) {
        super(innerCode);
    }
}
/**
 * Stores a block of code, which defines something
 * within the given scope
 */
export class SemanticDefinition extends BaseCommandList
{
    /**
     * Creates a new instance of SemanticDefinition
     * @param {string[]} dependentOn List of identifiers this definition depends on.
     * @param {string[]} paramList List of new identifiers dependent within this block.
     * @param {BaseCodeBlock[]} innerCode List of child blocks.
     * @param {string} definitionType Type of this definition.
     * @param {string} name Name of the defined identifier.
     */
    constructor(dependentOn, paramList, innerCode, definitionType, name) {

        super(innerCode);

        /**
         * List of identifiers this definition depends on.
         * @type {string[]}
         */
        this.dependentOn = dependentOn;
        /**
         * List of new identifiers dependent within this block.
         * @type {string[]}
         */
        this.paramList = paramList;
        /**
         * Type of this definition.
         * @type {string}
         */
        this.definitionType = definitionType;
        /**
         * Name of the defined identifier.
         * @type {string}
         */
        this.name = name;
    }
}
/**
 * Stores a block of code,
 * which doesn't define something within the given scope
 */
export class SemanticDecision extends BaseCommandList
{
    /**
     * Creates a new instance of SemanticDecision
     * @param {string[]} dependentOn List of identifiers the decision depends on.
     * @param {string[]} paramList List of new identifiers dependent within this block.
     * @param {BaseCodeBlock[]} innerCode List of child blocks.
     * @param {string} decisionType Type of this decision.
     */
    constructor(dependentOn, paramList, innerCode, decisionType)
    {
        super(innerCode);

        /**
         * List of identifiers this decision depends on.
         * @type {string[]}
         */
        this.dependentOn = dependentOn;
        /**
         * List of new identifiers dependent within this block.
         * @type {string[]}
         */
        this.paramList = paramList;
        /**
         * Type of this decision.
         * @type {string}
         */
        this.decisionType = decisionType;
    }
}
/**
 * Stores a leaf block of code
 */
export class SemanticAction extends BaseTokenList
{
    /**
     * Creates a new instance of SemanticAction
     * @param {string[]} dependingVariables List of identifiers whose value is being changed.
     * @param {string[]} dependentOn List of identifiers the asigned value depends on, if any.
     * @param {TokenInfo[]} tokens List of tokens.
     */
    constructor(dependingVariables, dependentOn, tokens)
    {
        super(tokens);

        /**
         * List of identifiers whose value is being changed.
         * @type {string[]}
         */
        this.dependingVariables = dependingVariables;
        /**
         * List of identifiers the asigned value depends on, if any.
         * @type {string[]}
         */
        this.dependentOn = dependentOn;
    } 
}
/**
 * Stores a block of code, which has no meaning within the given scope,
 * or whose semantic role in measuring distance is to be ignored.
 */
export class NonsemanticText extends BaseTokenList
{
    /**
     * Creates a new instance of NonsemanticText
     * @param {TokenInfo[]} tokens List of tokens.
     * @param {string} specialType Unique identifier within a block for automatic matching.
     */
    constructor(tokens, specialType)
    {
        super(tokens);

        /**
         * Unique identifier within a block for automatic matching.
         * @type {string}
         */
        this.specialType = specialType;
    }
}
