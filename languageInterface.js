/**
 * Class for storing basic information about tokens from given grammar within Code-shift.
 */
export class TokenInfo {
    constructor (text, start, stop, tokenIndex, isLiteral, isIdentifier, colorClass) {
        this.text = text;
        this.start = start;
        this.stop = stop;
        this.tokenIndex = tokenIndex;
        this.isLiteral = isLiteral;
        this.isIdentifier = isIdentifier;
        this.colorClass = colorClass;
    }

    Clone() {
        return new TokenInfo(this.text, this.start, this.stop, this.tokenIndex, this.isLiteral, this.isIdentifier, this.colorClass);
    }
}

/**
 * Common interface for all blocks of code
 * @abstract
 */
 export class BaseCodeBlock {
    constructor() {
        if (this.constructor == BaseCodeBlock) {
            throw new Error("An instance of abstract class 'BaseCodeBlock' was to be crated.");
        }
    }
    *getTokens() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
    
    isEmpty() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }

    addTokensToStart(tokens) {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }

    addTokensToEnd(tokens) {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }

    getFirstToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }

    getLastToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }

    removeFirstToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }

    removeLastToken() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }

    getIdentifiers() {
        throw new Error("A method was to be called on an instance of abstract class 'BaseCodeBlock'.");
    }
}
/**
 * Common interface for all LEAF blocks of code
 * @abstract
 */
 export class BaseTokenList extends BaseCodeBlock {

    constructor(tokens) {
        super();
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
}
/**
 * Common interface for all NON-LEAF blocks of code
 * @abstract
 */
 export class BaseCommandList extends BaseCodeBlock {

    constructor(innerCode) {
        super();
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
}
/**
 * This class isn't meant to be used for code distance calculation.
 * After all necessary preparations are done, instance of this class
 * should be used to create either 'SemanticDefinition'
 * or 'SemanticDefinition' instance.
 */
export class NonsemanticCommandList extends BaseCommandList {
    constructor(innerCode) {
        super(innerCode);
    }
}
/**
 * Class for storing a block of code, which defines something
 * within the given scope
 */
export class SemanticDefinition extends BaseCommandList
{
    constructor(paramList, innerCode, definitionType, name) {

        super(innerCode);

        this.paramList = paramList;
        this.definitionType = definitionType;
        this.name = name;
    }
}
/**
 * Class for storing a block of code, which doesn't define something
 * within the given scope
 */
export class SemanticDecision extends BaseCommandList
{
    constructor(dependentOn, innerCode, conditionType)
    {
        super(innerCode);

        this.dependentOn = dependentOn;
        this.conditionType = conditionType;
    }
}
/**
 * Class for storing a leaf block of code
 */
export class SemanticAction extends BaseTokenList
{
    constructor(dependingVariables, dependentOn, tokens)
    {
        super(tokens);

        this.dependingVariables = dependingVariables;
        this.dependentOn = dependentOn;
    } 
}
/**
 * Class for storing a block of code, which has no meaning within the given scope,
 * or whose semantic role in measuring distance is to be ignored.
 */
export class NonsemanticText extends BaseTokenList
{
    constructor(tokens, specialType)
    {
        super(tokens);

        this.specialType = specialType;
    }
}
