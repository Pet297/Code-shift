import antlr4 from 'antlr4';
import { CommonToken } from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import { TokenInfo, SemanticAction, SemanticDecision, SemanticDefinition, NonsemanticText, NonsemanticCommandList, BaseCommandList, BaseTokenList, BaseCodeBlock } from './languageInterface.js';

// Color classes for syntax high-lighting in JS:
const JS_NOCLASS = 0;
const JS_KEYWORD = 1;
const JS_IDENTIFIER = 2;
const JS_NUMERICCONSTANT = 3;
const JS_STRINGCONSTANT = 4;
const JS_CONSTANT = 5;
const JS_OPERATOR = 6;
const JS_COMMENT = 7;
// Colors for syntax high-lighting in JS:
const JSColors = ['#606060', '#C040C0', '#A0A0FF', '#80FF40', '#E04040', '#4040FF', '#BBBBBB', '#00A000']

/**
 * Representation-translating function for Javascript - given source code in JavaScript, returns simplified representation of it.
 * @param {string} input Source code to translate representation of.
 * @returns {BaseCodeBlock} Simplified representation of the source code.
 */
export default function JSToTree(input) {
    const chars = new antlr4.InputStream(input);
    const lexer = new JavaScriptLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new JavaScriptParser(tokens);
    parser.buildParseTrees = true;
    const tree = parser.program();
    return TranslateRule(tree);
}
/**
 * Transles given ANTLR4 parse tree of JavaScript code into simplified representation.
 * @param {*} treeNode The root of the ANTLR4 parse tree.
 * @returns {BaseCodeBlock} Simplified representation of the code.
 */
function TranslateRule(treeNode) {

if (treeNode == null) return null;
else if (! ('ruleIndex' in treeNode)) {
    return TranslateAsNonSemanticText(treeNode);
}
else switch (treeNode.ruleIndex) {
    case 0: // program(0) -> (HB)? (48)? 'EOF'
        var cmdList = new NonsemanticCommandList([]);
        // Nodes [0], [1] and 2
        for (var child of treeNode.children) {
            if (child.ruleIndex == 48) TranslateNodeAndConcatInner(child, cmdList);
            else TranslateAsNonSemanticTextAndConcat(child, cmdList);
        }

        Normalize(treeNode, cmdList);
        cmdList.innerCode.splice(cmdList.innerCode.length - 1, 1); // Removes <EOF>

        return new SemanticDefinition([], [], cmdList.innerCode, 'program', undefined);

    case 1: // sourceElement(1) -> (2)
        return TranslateRule(treeNode.children[0]);

    case 2: // statement(2) -> (3)|(15)|(5)|(12)|(18)|(40)|(19)|(20)|(21)|(23)|(24)|(25)|
            //                    -> (26)|(27)|(33)|(28)|(34)|(35)|(38)|(39)
        return TranslateRule(treeNode.children[0]);

    case 3: // block(3) -> '{' (4) '}'
        var cmdList = new NonsemanticCommandList([]);
        // Nodes 0, 1 and 2
        TranslateAsNonSemanticTextAndConcat(treeNode.children[0], cmdList);
        TranslateNodeAndConcatInner(treeNode.children[1], cmdList);
        TranslateAsNonSemanticTextAndConcat(treeNode.children[2], cmdList);

        Normalize(treeNode, cmdList);
        return cmdList;

    case 4: // statementList(4) -> (2)+
        var cmdList = new NonsemanticCommandList([]);
        // All nodes
        for (const child of treeNode.children)
        {
            TranslateNodeAndConcatInner(child, cmdList);
        }

        Normalize(treeNode, cmdList);
        return cmdList;

    //case 5: // importSatement(5) -> 'Import' (6)
    //case 6: // importFromBlock(6) -> (8)? (9) (10) (74) | (8)? (7) (10) (74) | (STRINGLITERAL) (74)
    //case 7: // moduleItems(7) -> '{' [(11) ',']* [(11) ','?]? '}'
    //case 8: // importDefault(8) -> (11) ','
    //case 9: // importNamespace(9) -> ['*' | (69)] ['As' (69)]?
    //case 10: // importFrom(10) -> 'From' (STRINGLITERAL)
    //case 11: // aliasName(11) -> (69) ['As' (69)]?
    case 12: // exportStatement(12) -> 'Export' (13) (74) | 'Export' (14) (74) | 'Export' 'Default' (57) (74)
        
        if (ContainsChild(treeNode, 14)) {
            var token0 = TranslateNodeAndNormalize(treeNode.children[0]);
            var cmd = TranslateNodeAndNormalize(treeNode.children[1]);
            var token2 = TranslateNodeAndNormalize(treeNode.children[2]);

            PrependTokens(token0, cmd);
            AppendTokens(cmd, token2);

            Normalize(treeNode, cmd);
            return cmd;
        }
        else if (ContainsChild(treeNode, 57)) {
            var token0 = TranslateNodeAndNormalize(treeNode.children[0]);
            var token1 = TranslateNodeAndNormalize(treeNode.children[1]);
            var cmd = TranslateNodeAndNormalize(treeNode.children[2]);
            var token3 = TranslateNodeAndNormalize(treeNode.children[3]);

            PrependTokens(token1, cmd);
            PrependTokens(token0, cmd);
            AppendTokens(cmd, token3);

            Normalize(treeNode, cmd);
            return cmd;
        }
        else {
            return TranslateAsNonSemanticText(treeNode);
        }

    //case 13: // exportFromBlock(13) -> (9) (10) (74) | (7) (10)? (74)

    case 14: // declaration(14) -> (15) | (40) | (39)
        var child = TranslateRule(treeNode.children[0]);
        return ToCommandList(child);

    case 15: // variableStatement(15) -> (16) (74)
        var cmd = TranslateNodeAndNormalize(treeNode.children[0]);
        var token1 = TranslateNodeAndNormalize(treeNode.children[1]);

        AppendTokens(cmd, token1);

        Normalize(treeNode, cmd);
        return cmd;

    case 16: // variableDeclarationList(16) -> (22) (17) [',' (17)]*     
        var cmdList = new NonsemanticCommandList([]);
        // Nodes 0, 1
        var token0 = TranslateNodeAndNormalize(treeNode.children[0]);
        var cmd = TranslateNodeAndNormalize(treeNode.children[1]);
        PrependTokens(token0, cmd);
        cmdList.innerCode.push(cmd);
        // Nodes [2 3] [4 5] ...
        for (var n = 2; n < treeNode.children.length; n += 2) {
            // Node n - comma
            var tokenN = TranslateNodeAndNormalize(treeNode.children[n]); 
            AppendTokens(cmdList, tokenN);
            // Node (n+1) - next declaration
            TranslateNodeAndConcatBlock(treeNode.children[n+1], cmdList);
        }
        Normalize(treeNode, cmd);
        return cmd;

    case 17: // variableDeclaration(17) -> (58) ['=' (57)]?

        var name = TranslateNodeAndNormalize(treeNode.children[0]);
        var dependencies = [];

        if (treeNode.children.length > 1) {
            dependencies = TranslateNodeAndNormalize(treeNode.children[2]);

            // If we are defining anonymous function
            if (dependencies instanceof SemanticDefinition)
            {
                Normalize(treeNode, dependencies.innerCode);
                return new SemanticDefinition(ListOrEmpty(dependencies.dependentOn), [], functionCode.innerCode, dependencies.definitionType, FirstOrNone(Array.from(dependencies.getIdentifiers())));
            }
        }

        var cmd = TranslateAsNonSemanticText(treeNode);
        return new SemanticDefinition(Array.from(dependencies.getIdentifiers()), [], [cmd], "variable", FirstOrNone(Array.from(name.getIdentifiers())));

    //case 18: // emptyStatement(18) -> ';'

    case 19: // expressionStatement(19) -> (!!)? (56) (74)
        if (treeNode.children.length == 2) {
            var cmd = TranslateNodeAndNormalize(treeNode.children[0]);
            var token1 = TranslateNodeAndNormalize(treeNode.children[1]);

            AppendTokens(cmd, token1);

            Normalize(treeNode, cmd);
            return cmd;
        }
        else {
            var token0 = TranslateNodeAndNormalize(treeNode.children[0]);
            var cmd = TranslateNodeAndNormalize(treeNode.children[1]);
            var token2 = TranslateNodeAndNormalize(treeNode.children[2]);

            PrependTokens(token0, cmd);
            AppendTokens(cmd, token2);
            
            Normalize(treeNode, cmd);
            return cmd;
        }

    case 20: // ifStatement(20) -> 'If' '(' (56) ')' (2) ['Else' (2)]?
        // Get dependencies
        var dependencies = Array.from(TranslateNodeAndNormalize(treeNode.children[2]).getIdentifiers());

        var cmdList = new NonsemanticCommandList([]);
        // Nodes 0,1,2,3 - text about positive condition
        var textPositive = TreenodesToTokens(treeNode.children[0],treeNode.children[1],treeNode.children[2],treeNode.children[3]);
        cmdList.innerCode.push(new NonsemanticText(textPositive, 'IF'));
        // Node 4 - semantic block of code
        TranslateNodeAndConcatInner(treeNode.children[4], cmdList);

        if (treeNode.children.length > 5) {
            // Node [5] - text about negative condition
            TranslateAsNonSemanticTextAndConcat(treeNode.children[5], cmdList, 'ELSE');
            // Node [6] - semantic block of code
            TranslateNodeAndConcatInner(treeNode.children[6], cmdList);
        }
        Normalize(treeNode, cmdList);
        return new SemanticDecision(dependencies, [], cmdList.innerCode, "if");

    case 21: // iterationStatement(21) -> 'Do' (2) 'While' '(' (56) ')' (74) |
             //                              -> 'While' '(' (56) ')' (2)
             //                              -> 'For' '(' [(56)|(16)]? ';' (56)? ';' (56)? ')' (2)
             //                              -> 'For' '(' [(57)|(16)] 'In' (56) ')' (2)
             //                              -> 'For' 'Await'? '(' [(57)|(16)] (70='of')? (56) ')' (2)
             // Decisions are based on (56)s, repetaedly executed code is in (2), in code blocks (2) variables listed in (16) are dependent
        var dependencies = [];

        var cmdList = new NonsemanticCommandList([]);
        var tokensBefore = [];
        var tokensAfter = [];
        for (var child of treeNode.children)
        {
            if (child.ruleIndex == 2) {
                let block2 = TranslateNodeAndNormalize(child);
                if (tokensBefore.length > 0) cmdList.innerCode.push(new NonsemanticText(tokensBefore, 'Iteration head'));
                cmdList.innerCode = cmdList.innerCode.concat(block2.innerCode);
                tokensBefore = null;
            }
            else {
                var text = TranslateAsNonSemanticText(child);
                if (tokensBefore != null) {
                    // Happens if we didn't see (2)
                    tokensBefore = tokensBefore.concat(text.tokens);
                }
                else {
                    // Happens after seeing (2)
                    tokensAfter = tokensAfter.concat(text.tokens);
                }
                dependencies = dependencies.concat(Array.from(text.getIdentifiers()));
            }
        }
        if (tokensAfter.length > 0) cmdList.innerCode.push(new NonsemanticText(tokensAfter, 'Iteration end'));

        Normalize(treeNode, cmdList);
        return new SemanticDecision(dependencies, [], cmdList.innerCode, "iteration");

    //case 22: // varModifier(22) -> 'Var' | (73) | 'Const'
    //case 23: // continueStatement(23) -> 'Continue' [(!!)? (70)]? (74)
    //case 24: // breakStatement(24) -> 'Break' [(!!)? (70)]? (74)

    case 25: // returnStatement(25) -> 'Return' [(!!)? (56)]? (74)
        var child56 = FindChild(treeNode, 56);
        if (ContainsChild(treeNode)) {
            var action = TranslateRule(child56);
            var cmd = new SemanticAction([], Array.from(action.innerCode[0].getIdentifiers()), TreenodeToTokens(treeNode));
            Normalize(treeNode, cmd);
            return cmd;
        }
        else {
            var cmd = new SemanticAction([], [], TreenodeToTokens(treeNode));
            Normalize(treeNode, cmd);
            return cmd;
        }

    case 26: // yieldStatement(26) -> 'Yield' [(!!)? (56)]? (74)
        var child56 = FindChild(treeNode, 56);
        if (child56 != null) {
            var action = TranslateRule(child56);
            var cmd = new SemanticAction([], Array.from(action.innerCode[0].getIdentifiers()), TreenodeToTokens(treeNode));
            Normalize(treeNode, cmd);
            return cmd;
        }
        else {
            var cmd = new SemanticAction([], [], TreenodeToTokens(treeNode));
            Normalize(treeNode, cmd);
            return cmd;
        }

    case 27: // withStatement(27) -> 'With' '(' (56) ')' (2)
    var cmdList = new NonsemanticCommandList([]);

    // Nodes 0,1,2,3 - with statement head
    var text = TreenodesToTokens(treeNode.children[0],treeNode.children[1],treeNode.children[2],treeNode.children[3]);
    var cmd0123 = new NonsemanticText(text, 'WITH');
    var dependencies = Array.from(cmd0123.getIdentifiers());
    cmdList.innerCode.push(cmd0123);

    // Node 4 - semantic block of code
    TranslateNodeAndConcatInner(treeNode.children[4], cmdList);

    Normalize(treeNode, cmdList);
    return new SemanticDecision([], dependencies, cmdList.innerCode, "with");

    case 28: // switchStatement(28) -> 'Switch' '(' (56) ')' (29)
        
    var cmdList = new NonsemanticCommandList([]);

    // Nodes 0,1,2,3 - switch statement head
    var text = TreenodesToTokens(treeNode.children[0],treeNode.children[1],treeNode.children[2],treeNode.children[3]);
    var cmd0123 = new NonsemanticText(text, 'SWITCH');
    var dependencies = Array.from(cmd0123.getIdentifiers());
    cmdList.innerCode.push(cmd0123);

    // Node 4 - semantic block of code
    TranslateNodeAndConcatInner(treeNode.children[4], cmdList);

    Normalize(treeNode, cmdList);
    return new SemanticDecision(dependencies, [], cmdList.innerCode, "switch");

    case 29: // caseBlock(29) -> '{' (30)? [(32) (30)?]? '}'

    var cmdList = new NonsemanticCommandList([]);
        
        for (var child of treeNode.children) {
            // Nodes (30) and (32)
            if (child.ruleIndex == 30 || child.ruleIndex == 32) TranslateNodeAndConcatInner(child, cmdList);
            // Nodes '{' and '}'
            else TranslateAsNonSemanticTextAndConcat(child, cmdList);
        }

        Normalize(treeNode, cmdList);
        return cmdList;

    case 30: // caseClauses(30) -> (31)+

    var cmdList = new NonsemanticCommandList([]);

        // All nodes
        for (const child of treeNode.children)
        {
            TranslateNodeAndConcatInner(child, cmdList);
        }

        Normalize(treeNode, cmdList);
        return cmdList;

    case 31: // caseClause(31) -> 'Case' (56) ':' (4)?

        var cmdList = new NonsemanticCommandList([]);

        // Nodes 0,1,2 - case statement head
        var text = TreenodesToTokens(treeNode.children[0],treeNode.children[1],treeNode.children[2]);
        var cmd012 = new NonsemanticText(text, 'CASE');
        var dependencies = Array.from(cmd012.getIdentifiers());
        cmdList.innerCode.push(cmd012);
        // Node 3 - semantic block of code
        if (treeNode.children.length > 3) TranslateNodeAndConcatInner(treeNode.children[3], cmdList);

        Normalize(treeNode, cmdList);
        return new SemanticDecision(dependencies, [], cmdList.innerCode, "case");

    case 32: // defaultClause(32) -> Default ':' (4)?

        var cmdList = new NonsemanticCommandList([]);

        // Nodes 0,1 - case statement head
        var text = TreenodesToTokens(treeNode.children[0],treeNode.children[1]);
        var cmd01 = new NonsemanticText(text, 'DEFAULT');
        cmdList.innerCode.push(cmd01);
        // Node 2 - semantic block of code
        TranslateNodeAndConcatInner(treeNode.children[2], cmdList);

        Normalize(treeNode, cmdList);
        return new SemanticDecision(dependencies, [], cmdList.innerCode, "default");

    case 33: // labelledStatement(33) -> (70) ':' (2)

        var token0 = TranslateNodeAndNormalize(treeNode.children[0]);
        var token1 = TranslateNodeAndNormalize(treeNode.children[1]);
        var cmd = TranslateNodeAndNormalize(treeNode.children[2]);

        PrependTokens(token1, cmd);
        PrependTokens(token0, cmd);

        Normalize(treeNode, cmd);
        return cmd;

    //case 34: // throwStatement(34) -> 'Throw' (!!)? (56) (74)

    case 35: // tryStatement(35) -> 'Try' (3) [ (36) (37)? | (37) ]
        // List statements
        var cmdList = new NonsemanticCommandList([]);

        for (var child of treeNode.children) {
            // try
            if (!('ruleIndex' in child)) {
                TranslateAsNonSemanticTextAndConcat(child, cmdList, "TRY");
            }
            // cmd list
            else {
                TranslateNodeAndConcatInner(child, cmdList);
            }
        }

        Normalize(treeNode, cmdList);
        return new SemanticDecision([], [], cmdList.innerCode,"try");

    case 36: // catchProduction(36) -> 'Catch' ['(' (58) ')']? (3)
        var cmdList = new NonsemanticCommandList([]);

        // Catch head
        TranslateAsNonSemanticTextAndConcat(treeNode.children[0], cmdList, "CATCH");
        if (treeNode.children.length > 2) {
            var token1 = TranslateAsNonSemanticText(treeNode.children[1]);
            AppendTokens(cmdList, token1.tokens);
            var token2 = TranslateAsNonSemanticText(treeNode.children[2]);
            AppendTokens(cmdList, token2.tokens);
            var token3 = TranslateAsNonSemanticText(treeNode.children[3]);
            AppendTokens(cmdList, token3.tokens);
        }
        // Catch code
        TranslateNodeAndConcatInner(treeNode.children[treeNode.children.length - 1], cmdList);

        Normalize(treeNode, cmdList);
        return cmdList;

    case 37: // finallyProduction(37) -> 'Finally' (3)
        var cmdList = new NonsemanticCommandList([]);

        // Finally head
        TranslateAsNonSemanticTextAndConcat(treeNode.children[0], cmdList, "FINALLY");
        // Finally code
        TranslateNodeAndConcatInner(treeNode.children[1], cmdList);
        
        Normalize(treeNode, cmdList);
        return cmdList;

    //case 38: // debuggerStatement(38) -> 'Debugger' (74)

    case 39: // functionDeclaration(39) -> 'Async'? 'Function' '*'? (70) '(' (44)? ')' (47)
        
        var params = [];
        var name = undefined;
        var text = [];
        var cmdList = new NonsemanticCommandList([]);

        for (var child of treeNode.children)
        {   
            // Get name
            if (child.ruleIndex == 70) {
                var child70 = TranslateRule(child);
                name = FirstOrNone(Array.from(child70.getIdentifiers()));
            }
            // Get params
            if (child.ruleIndex == 44) {
                var child44 = TranslateRule(child);
                params = Array.from(child44.getIdentifiers());
            }

            // Node 7
            if (child.ruleIndex == 47) {
                cmdList.innerCode.push(new NonsemanticText(text, 'FUNCTION'));
                TranslateNodeAndConcatInner(child, cmdList);
            }
            // Nodes 0-6
            else {
                text = text.concat(TranslateAsNonSemanticText(child).tokens);
            }
        }

        Normalize(treeNode, cmdList);
        return new SemanticDefinition([], params, cmdList.innerCode, "function", name);

    case 40: // classDeclaration(40) -> 'Class' (70) (41)
        
        var token0 = TranslateAsNonSemanticText(treeNode.children[0]);
        var token1 = TranslateAsNonSemanticText(treeNode.children[1]);
        var cmd01 = new NonsemanticText(token0.tokens, "CLASS");
        cmd01.tokens = cmd01.tokens.concat(token1.tokens);

        var name = FirstOrNone(Array.from(token1.getIdentifiers()));

        var cmdList = TranslateNodeAndNormalize(treeNode.children[2]);
        cmdList.innerCode.splice(0,0,cmd01);

        Normalize(treeNode, cmdList);

        return new SemanticDefinition([], [], cmdList.innerCode,"class",name);

    case 41: // classTail(41) -> ['Extends' (57)]? '{' (42)* '}'
        
        var cmdList = new NonsemanticCommandList([]);

        var textBefore = [];
        var functions = [];
        var textAfter = [];
        var extending = [];

        for (var child of treeNode.children) {
            if (child.ruleIndex == 42) {
                var childCode = TranslateNodeAndNormalize(child);
                functions.push(childCode);
            }
            else {
                var text = TranslateRule(child);
                // extending what
                if (child.ruleIndex == 57) {
                    extending = Array.from(text.getIdentifiers());
                }
                // after class def.
                if (text.tokens[0].text == '}') {
                    textAfter = textAfter.concat(text.tokens);
                }
                // before class def.
                else {
                    textBefore = textBefore.concat(text.tokens);
                }
            }
        }

        cmdList.innerCode.push(new NonsemanticText(textBefore, 'CLASS 2'));
        for (var f of functions) {
            cmdList.innerCode = cmdList.innerCode.concat(f);
        }
        cmdList.innerCode.push(new NonsemanticText(textAfter, 'CLASS END'));

        Normalize(treeNode, cmdList);
        return cmdList;

    case 42: // classElement(42) -> ['Static' | !!? (70) | 'Async']* [(43) | (58) '=' (59) ';'] | (18) | '#'? (53) '=' (57)
        // 43: method/getter/setter
        // 58: class_variable
        // 18: [EMPTY STATEMENT]
        // 53: property

        // Determine, which type of class element this is:
        var rule43 = null;
        var rule53 = null;
        var rule57 = null;
        var rule58 = null;
        var rule59 = null;

        for (var child of treeNode.children) {
            if (child.ruleIndex == 43) rule43 = child;
            if (child.ruleIndex == 53) rule53 = child;
            if (child.ruleIndex == 57) rule57 = child;
            if (child.ruleIndex == 58) rule58 = child;
            if (child.ruleIndex == 59) rule59 = child;
        }

        var fullNonsemanticCode = TranslateAsNonSemanticText(treeNode);
        Normalize(treeNode, fullNonsemanticCode);

        // Based on the bools, determine what to do next
        if (rule43 != null) {
            var cmdList = new NonsemanticCommandList([]);
            var textHead = [];

            for (var child of treeNode.children) {
                if (child.ruleIndex != 43) {
                    textHead = textHead.concat(TranslateAsNonSemanticText(child).tokens);
                }
                else {
                    var fullCode = TranslateRule(child);
                    cmdList.innerCode = cmdList.innerCode.concat(fullCode.innerCode);
                    if (textHead.length > 0) cmdList.innerCode.splice(0,0,new NonsemanticText(textHead, 'METHOD HEAD'));
                }
            }

            Normalize(treeNode, cmdList);
            return new SemanticDefinition([], fullCode.paramList, cmdList.innerCode, fullCode.definitionType, fullCode.name);
        }
        else if (rule53 != null) {
            var t53 = TranslateRule(rule53);
            var t57 = TranslateRule(rule57);
            return new SemanticDefinition(Array.from(t57.getIdentifiers()), [], [fullNonsemanticCode], 'class property', FirstOrNone(Array.from(t53.getIdentifiers())));
        }
        else if (rule58 != null) {
            // Get tokens, save as variable definition
            var t58 = TranslateRule(rule58);
            var t59 = TranslateRule(rule59);
            return new SemanticDefinition(Array.from(t59.getIdentifiers()), [], [fullNonsemanticCode], 'class getter/setter', FirstOrNone(Array.from(t58.getIdentifiers())));
        }
        else {
            // Epmty statement, just return NS
            return fullNonsemanticCode;
        }
    case 43: // methodDefinition(43) -> '*'? '#'? (53) '(' (44)? ')' (47) | '*'? '#'? (67) '(' ')' (47) | '*'? '#'? (68) '(' (44)? ')' (47)
        
        var rule44 = null;
        var rule47 = null;
        var rule53 = null;
        var rule67 = null;
        var rule68 = null;

        for (var child of treeNode.children) {
            if (child.ruleIndex == 44) rule44 = child;
            if (child.ruleIndex == 47) rule47 = child;
            if (child.ruleIndex == 53) rule53 = child;
            if (child.ruleIndex == 67) rule67 = child;
            if (child.ruleIndex == 68) rule68 = child;
        }

        // Until (47), all is part of head
        var text = [];
        for (var child of treeNode.children) {
            if (child.ruleIndex != 47) {
                text = text.concat(TranslateAsNonSemanticText(child).tokens);
            }
        }
        var cmdList = new NonsemanticCommandList([]);
        cmdList.innerCode.push(new NonsemanticText(text, "CLASS g/s/m HEAD"));
        TranslateNodeAndConcatInner(rule47, cmdList);

        Normalize(treeNode, cmdList);

        var params = [];
        if (rule44 != null) params = Array.from(TranslateNodeAndNormalize(rule44).getIdentifiers());

        // Determine, if we are dealing with a getter, a setter or a method.
        if (rule53 != null) {
            var name = FirstOrNone(Array.from(TranslateNodeAndNormalize(rule53).getIdentifiers()));
            return new SemanticDefinition([], params, cmdList.innerCode, "method", name);
        }
        else if (rule67 != null) {
            var name = FirstOrNone(Array.from(TranslateNodeAndNormalize(rule67).getIdentifiers()));
            return new SemanticDefinition([], params, cmdList.innerCode, "getter", name);
        }
        else if (rule68 != null) {
            var name = FirstOrNone(Array.from(TranslateNodeAndNormalize(rule68).getIdentifiers()));
            return new SemanticDefinition([], params, cmdList.innerCode, "setter", name);
        }
        else {
            console.error("Error: something unexpected went worng while translating rule 43 in JS.")
        }
    //case 44: // formalParameterList(44) -> (45) [',' (45)]* [',' (46)]? | (46)
    //case 45: // formalParameterArg(45) -> (58) ['=' (57)]?
    //case 46: // lastFormalParameterArg(46) -> (ELLIPSIS)? (57)
    case 47:  // functionBody(47) -> '{' (48)? '}'
        var cmdList = new NonsemanticCommandList([]);
        // '{'
        TranslateAsNonSemanticTextAndConcat(treeNode.children[0], cmdList, "FUNCTION BODY 1");
        // Node 1 - code
        TranslateNodeAndConcatInner(treeNode.children[1], cmdList);
        // '}'
        TranslateAsNonSemanticTextAndConcat(treeNode.children[2], cmdList, "FUNCTION BODY 2");

        Normalize(treeNode, cmdList);
        return cmdList;

    case 48: // sourceElements(48) -> (1)+

        var cmdList = new NonsemanticCommandList([]);
        for (var child of treeNode.children) {
            TranslateNodeAndConcatBlock(child, cmdList);
        }

        Normalize(treeNode, cmdList);
        return new SemanticDefinition([], [], cmdList.innerCode, "program", null);

    //case 49: // arrayLiteral(49) -> '[' (50) ']'
    //case 50: // elementList(50) -> ','* (51)? [','+ (51)]* ','*
    //case 51: // arrayElement(51) -> (ELLIPSIS)? (57)
    //case 52: // propertyAssignment(52) -> (53) ':' (57) | '[' (57) ']' ':' (57) | 'Async'? '*'? (53) '(' (44)? ')' (47) | (67) '(' ')' (47) | (68) '(' (45) ')' (47) | (ELLIPSIS)? (57)
    //case 53: // propertyName(53) -> (69) | (STRINGLITERAL) | (NUMERICLITERAL) | '[' (57) ']'
    //case 54: // arguments(54) -> '(' [(55) [',' (55)]* ','?]? ')'
    //case 55: // argument(55) -> (ELIPSIS)? (57) | (ELIPSIS)? (70)

    case 56: // expressionSequence(56) -> (57) [',' (57)]*

        var cmdList = new NonsemanticCommandList([]);
        // Node 0 - first expression
        TranslateNodeAndConcatBlock(treeNode.children[0], cmdList);

        // Nodes [1 2] [3 4] ...
        for (var n = 1; n < treeNode.children.length; n += 2) {
            // Node n - comma
            var commaCmd = TranslateAsNonSemanticText(treeNode.children[n]);
            AppendTokens(cmdList, commaCmd.tokens);
            // Node (n+1) - next expression
            TranslateNodeAndConcatBlock(treeNode.children[n+1], cmdList);
        }
        
        Normalize(treeNode, cmdList);
        return cmdList;

    case 57: // singleExpression(57)       -> (60) | 'Class' (70)? (41) | (57) '[' (56) ']' | (57) '?'? '.' '#'? (69) | (57) (54) | 'New' (57) (54)? | 'New' '.' (70) |
             //                            -> | (57) (!!)? '++' | (57) (!!)? '--' | ['Delete'|'Void'|'Typeof'|'++'|'--'|'+'|'-'|'~'|'!'|'Await'] (57)
             //                            -> | (57) ['**'|'*'|'/'|'%'|'+'|'-'|'??'|'<<'|'>>'|'>>>'|'<'|'>'|'<='|'>='|'Instanceof'|'In'|'=='|'!='|'==='|'!=='|'&'|'^'|'|'|'&&'|'||'] (57) |
             //                            -> | (57) '?' (57) ':' (57) | (57) '=' (57) | (57) (63) (57) | 'Import' '(' (57) ')' | (57) (TEMPLATESTRINGLITERAL) |
             //                            -> | (26) | 'This' | (70) | 'Super' | (64) | (49) | (59) | '(' (56) ')'

             // Special behavior: rules "(60)" and "'Class' (70)? (41)" - First is anonymous function, the other is anonymous class, interpret as definition.
             // Otherwise, interpret as 'action' with no asignment, unless we are using rules "(57) '=' (57)" or "(57) (63) (57)", then asignment happens


        // See if any of the special actions is to be taken...
        var rule41present = false;
        var rule60present = false;
        var rule63present = false;

        for (var child of treeNode.children) {
            if (child.ruleIndex == 41) rule41present = true;
            if (child.ruleIndex == 60) rule60present = true;
            if (child.ruleIndex == 63 || child.symbol?.text == '=') rule63present = true;
        }

        // Decide how to translate this block and translate it
        if (rule41present) {
            // 'Class' (70)? (41)
            var cmdList = new NonsemanticCommandList([]);
            // rules 'Class' and (70)
            if (treeNode.children.length == 2) cmdList.innerCode.push(new NonsemanticText(TreenodesToTokens(treeNode.children[0]), 'A. Function head'));
            else if (treeNode.children.length == 3) cmdList.innerCode.push(new NonsemanticText(TreenodesToTokens(treeNode.children[0], treeNode.children[1]), 'A. Function head'));
            // rule (41)
            var functionCode = TranslateNodeAndNormalize(treeNode.children[treeNode.children.length-1]);
            cmdList.innerCode = cmdList.innerCode.concat(functionCode.innerCode);
            Normalize(treeNode, cmdList);
            return new SemanticDefinition(functionCode.dependentOn, functionCode.paramList, cmdList, functionCode.definitionType, functionCode.name);
        }
        else if (rule60present) {
            // Just one node with rule 60.
            return TranslateRule(treeNode.children[0]);
        }
        else if (rule63present) {
            // "(57) (63) (57)" or "(57) '=' (57)"
            var dependingVariables = Array.from(TranslateNodeAndNormalize(treeNode.children[0]).getIdentifiers());
            var dependentOn = Array.from(TranslateNodeAndNormalize(treeNode.children[2]).getIdentifiers());

            var tokenListFull = TranslateAsNonSemanticText(treeNode);
            Normalize(treeNode, tokenListFull);

            return new SemanticAction(dependingVariables, dependentOn, tokenListFull.tokens);
        }
        else {
            var tokenListFull = TranslateAsNonSemanticText(treeNode);
            Normalize(treeNode, tokenListFull);
            return tokenListFull;
        }

    //case 58: // assignable(58) -> (70) | (49) | (59)
    //case 59: // objectLiteral(59) -> '{' [(52) [',' (52)]*]? '}'
    case 60: // anonymousFunction(60) -> (39) | (ASYNC)? (FUNCTION) '*'? '(' (44)? ')'
        
        // (39)
        if (treeNode.children.length == 1) {
            var definitionIn39 = TranslateRule(treeNode.children[0]);
            // Change type of definition from regular to anonymous function
            return new SemanticDefinition(definitionIn39.dependentOn, definitionIn39.paramList, definitionIn39.paramList,"anonymous_function",definitionIn39.name);
        }
        // (ASYNC)? (FUNCTION) '*'? '(' (44)? ')'
        else {
            // Return as an empty function head.        
            var tokenListFull = TranslateAsNonSemanticText(treeNode, "EMPTY A. FUNCTION");
            Normalize(treeNode, tokenListFull);
            return tokenListFull;
        }

    //case 61: // arrowFunctionParameters(61) -> (70) | '(' (44)? ')'
    //case 62: // arrowFunctionBody(62) -> (57) | (47)
    //case 63: // assignmentOperator(63) -> '*=' | '/=' | '%=' | '+=' | ... | '**='
    //case 64: // literal(64) -> (NULLLITERAL) | (BOOLEANLITERAL) | (STRINGLITERAL) | (TEMPLATESTRINGLITERAL) | (REGULAREXPRESSIONLITTERAL) | (65) | (66)
    //case 65: // numericLiteral(65) -> (DEC-L) | (HEX-IL) | (OCT-IL) | (OCT-IL2) | (BIN-IL)
    //case 66: // bigintLiteral(66) -> (B-DEC-IL) | (B-HEX-IL) | (B-OCT-IL) | (B-BIN-IL)
    //case 67: // getter(67) -> (!!) (70) (53)
    //case 68: // setter(68) -> (!!) (70) (53)
    //case 69: // identifierName(69) -> (70) | (71)
    //case 70: // identifier(70) -> (IDENTIFIER) | (NONSTRICTLET) | (ASYNC)
    //case 71: // reservedWord(71) -> (72) | (NULLLITERAL) | (BOOLEANLITERAL)
    //case 72: // keyword(72) -> 'Break' | 'Do' | 'Instanceof' | ... | (73) | ... | 'As'
    //case 73: // let_(73) -> (NONSTRICTLET) | (STRICTLET)
    //case 74: // eos(74) -> ';' | (EOF) | (!!) | (!!)
    default:
        return TranslateAsNonSemanticText(treeNode);
    }
}
/**
 * Determines, whether given ANTLR4 parse tree node countains a child with given rule index.
 * @param {*} treeNode The node of the parse tree to search through.
 * @param {number} rule Rule index to search for.
 * @returns {boolean} Boolean indicating whether the child was found.
 */
function ContainsChild(treeNode, rule) {
    if (treeNode == null) return false;
    for (const child of treeNode.children)
    {
        if (child !== undefined)
        {
            if (child?.ruleIndex == rule)
            {
                return true;
            }
        }
    }
    return false;
}
/**
 * Given a parse tree node, searches its children for one with given rule index and returns it.
 * @param {*} treeNode The node of the parse tree to search through.
 * @param {number} rule Rule index to search for.
 * @returns {*} The child node.
 */
function FindChild(treeNode, rule) {
    if (treeNode == null) return null;
    for (const child of treeNode.children)
    {
        if (child !== undefined)
        {
            if (child?.ruleIndex == rule)
            {
                return child;
            }
        }
    }
    return null;
}
/**
 * Returns tokens of the given parse tree node.
 * @param {*} treeNode The node of the parse tree to get tokens of.
 * @returns {TokenInfo[]} Tokens of the parse tree node.
 */
function TreenodeToTokens(treeNode) {
    var tokens = [];

    if ('symbol' in treeNode) {
        tokens.push(GetTokenInfo(treeNode.symbol));
    }

    else for (var i = treeNode.start.tokenIndex; i <= treeNode.stop.tokenIndex; i++) {
        tokens.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
    }

    return tokens;
}
/**
 * Returns tokens of the given parse tree nodes.
 * @param  {...any} treeNodes The nodes of the parse tree to get tokens of.
 * @returns {TokenInfo[]]} Tokens of the parse tree nodes.
 */
function TreenodesToTokens(...treeNodes) {
    var tokens = [];

    for (var treeNode of treeNodes) {
        tokens = tokens.concat(TreenodeToTokens(treeNode));
    }

    return tokens;
}
/**
 * Translates given parse tree node as a single NonsemanticText.
 * Optionaly applies a specialType property to it.
 * @param {*} treeNode The node of the parse tree to translate.
 * @param {string} specialType The string to set special type of the nonsemantic text to.
 * @returns {NonsemanticText} The resulting simplified representation node. 
 */
function TranslateAsNonSemanticText(treeNode, specialType = undefined) {
    if ('symbol' in treeNode) {
        return new NonsemanticText([GetTokenInfo(treeNode.symbol)],specialType);
    }
    else {
        var ns = new NonsemanticText([], specialType);
        ExpandSingleCommand2(treeNode, treeNode.start.tokenIndex, treeNode.stop.tokenIndex,  ns);
        return ns;
    }
}
/**
 * Translates tokens with given indices (from, to) into a single NonsemanticText.
 * @param {*} treeNode Any node of the parse tree.
 * @param {number} from Index of the first token to include.
 * @param {number} to Index of the last token to include.
 * @param {string} specialType The string to set special type of the nonsemantic text to.
 * @returns {NonsemanticText} The resulting simplified representation node. 
 */
function TranslateAsNonSemanticText2(treeNode, from, to, specialType = undefined) {
    var ns = new NonsemanticText([], specialType);
    ExpandSingleCommand2(treeNode, from, to, ns);
    return ns;
}
/**
 * Given an ANTLR4 CommonToken, translates into internal representation as TokenInfo.
 * @param {CommonToken} commonToken The token to translate.
 * @returns {TokenInfo} The resulting token.
 */
function GetTokenInfo(commonToken) {
    var colorClass = JS_NOCLASS;
    var identifier = false;

    var text = commonToken.text;

    if (commonToken.type >= 2 && commonToken.type <= 3) colorClass = JS_COMMENT;
    if (commonToken.type == 4) colorClass = JS_STRINGCONSTANT;
    if (commonToken.type >= 18 && commonToken.type <= 27) colorClass = JS_OPERATOR;
    if (commonToken.type >= 30 && commonToken.type <= 58) colorClass = JS_OPERATOR;
    if (commonToken.type >= 59 && commonToken.type <= 60) colorClass = JS_CONSTANT;
    if (commonToken.type >= 61 && commonToken.type <= 69) colorClass = JS_NUMERICCONSTANT;
    if (commonToken.type >= 70 && commonToken.type <= 116) colorClass = JS_KEYWORD;
    if (commonToken.type == 117) { colorClass = JS_IDENTIFIER; identifier = true; }
    if (commonToken.type >= 118 && commonToken.type <= 119) { colorClass = JS_STRINGCONSTANT; }
    if (commonToken.type >= 122 && commonToken.type <= 123) colorClass = JS_COMMENT;

    return new TokenInfo(text, commonToken.start, commonToken.stop, commonToken.tokenIndex, identifier, JSColors[colorClass]);
}
/**
 * Given any sort of codeblock, returns it as NonsemanticCommandList either by doing nothing, or by placing a single command in the list.
 * @param {BaseCodeBlock} command Codeblock to turn into a command list.
 * @returns {NonsemanticCommandList} The resulting command list.
 */
function ToCommandList(command) {
    if (command instanceof NonsemanticCommandList) {
        return command;
    }
    else if (
        command instanceof SemanticDefinition ||
        command instanceof SemanticAction ||
        command instanceof SemanticDecision ||
        command instanceof NonsemanticText )
        {
            return new NonsemanticCommandList([command]);
        }
    else {
        throw Error("No if clause executed in 'ToCommandList' in 'JavaScriptTranslator.js'.");
    }
}
/**
 * Given a leaf simplified representation node, and a parse tree node,
 * Fills in mssing tokens from the parse tree node into the simplified representation node.
 * @param {*} treeNode The parse tree node to read tokens of.
 * @param {BaseTokenList} block The simplified representation node to fill tokens of.
 */
function ExpandSingleCommand(treeNode, block) {
    if ('symbol' in treeNode) {
        block.tokens = [GetTokenInfo(treeNode.symbol)];
    }
    else
    {
        var from = treeNode.start.tokenIndex;
        var to = treeNode.stop.tokenIndex;
        block.tokens = [];

        for(var i = from; i < to; i++) {
            block.tokens.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
        }
    }
}
/**
 * Given a leaf simplified representation node, and an index range,
 * Fills in mssing tokens given by the index range into the simplified representation node.
 * @param {*} treeNode Any parse tree node.
 * @param {number} from Index of the first token to include.
 * @param {number} to Index of the last token to include.
 * @param {BaseTokenList} block The simplified representation node to fill tokens of.
 */
function ExpandSingleCommand2(treeNode, from, to, block) {
    block.tokens = [];

    for(var i = from; i <= to; i++) {
        block.tokens.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
    }
}
/**
 * Fills-in missing tokens into a codeblock in simple representation.
 * The tokens come from a parse tree node, or are given by two indices.
 * @param {*} treeNode The parse tree node to get tokens from.
 * @param {BaseCodeBlock} block The codeblock to fill the tokens in.
 * @param {number} from Index of the first token to include.
 * @param {number} to Index of the last token to include.
 */
function FillInTokens(treeNode, block, from = undefined, to = undefined) {
    if (from == undefined || to == undefined) {
        from = treeNode.start.tokenIndex;
        to = treeNode.stop.tokenIndex;
    }

    if (block instanceof BaseCommandList) {
        FillInTokensNode(treeNode, block, from, to);
    }
    else if (block instanceof BaseTokenList) {
        FillInTokensLeaf(treeNode, block, from, to);
    }
    else
    {
        throw Error("Unexpected type of variable 'block' was passed to 'FillInTokens' in 'JavaScriptTranslator.js'.");
    }
}
/**
 * Fills-in missing tokens into a non-leaf codeblock in simple representation.
 * The tokens come from a parse tree node, or are given by two indices.
 * @param {*} treeNode  The parse tree node to get tokens from.
 * @param {BaseCommandList} commandBlock The codeblock to fill the tokens in.
 * @param {number} from Index of the first token to include.
 * @param {number} to Index of the last token to include.
 */
function FillInTokensNode(treeNode, commandBlock, from, to) {

    var pos = from;

    for (var i = 0; i < commandBlock.innerCode.length; i++) {
        if (pos < commandBlock.innerCode[i].getFirstToken().tokenIndex) {
            var childFrom = pos;
            var childTo = commandBlock.innerCode[i].getFirstToken().tokenIndex - 1;
            commandBlock.innerCode.splice(i,0,TranslateAsNonSemanticText2(treeNode, childFrom, childTo));
            i++;
        }
        FillInTokens(treeNode, commandBlock.innerCode[i], commandBlock.innerCode[i].getFirstToken().tokenIndex ,commandBlock.innerCode[i].getLastToken().tokenIndex);
        pos = commandBlock.innerCode[i].getLastToken().tokenIndex + 1;
    }

    if (pos < to) {
        var childFrom = pos;
        var childTo = to;
        commandBlock.innerCode.splice(i,0,[TranslateAsNonSemanticText2(childFrom, childTo)]);
    }
}
/**
 * Fills-in missing tokens into a leaf codeblock in simple representation.
 * The tokens come from a parse tree node, or are given by two indices.
 * @param {*} treeNode  The parse tree node to get tokens from.
 * @param {BaseTokenList} commandBlock The codeblock to fill the tokens in.
 * @param {number} from Index of the first token to include.
 * @param {number} to Index of the last token to include.
 */
function FillInTokensLeaf(treeNode, tokenBlock, from, to) {
    for (var i = from; i <= to; i++) {
        if (tokenBlock.tokens[i-from].tokenIndex != i) {
            tokenBlock.tokens.splice(i-from,0,GetTokenInfo(treeNode.parser._input.tokens[i]));
        }
    }
}
/**
 * Given a list of commands, moves '\t' tokens between neigboring commands so that they are at the begining.
 * @param {BaseCommandList} commandList List of commands to normalize.
 * @returns {BaseCommandList} Reference to the input command list. 
 */
function MoveTabs(commandList) {
    for (var i = 0; i < commandList.innerCode.length - 1; i++) {
        while (IsTab(commandList.innerCode[i].getLastToken())) {
            var token = commandList.innerCode[i].removeLastToken();
            commandList.innerCode[i+1].addTokensToStart([token]);

            if (commandList.innerCode[i].isEmpty()) {
                commandList.innerCode.splice(i,1);
                i--;
            }
        }
    }
    return commandList;
}
/**
 * Given a list of commands, moves newline and semicolon tokens between neigboring commands so that they are at the end.
 * @param {BaseCommandList} commandList List of commands to normalize.
 * @returns {BaseCommandList} Reference to the input command list. 
 */
function MoveNewlines(blockList) {
    for (var i = 0; i < blockList.innerCode.length - 1; i++) {
        while (IsNewline(blockList.innerCode[i+1].getFirstToken()) || (IsSemicolon(blockList.innerCode[i+1].getFirstToken()))) {
            var token = blockList.innerCode[i+1].removeFirstToken();
            blockList.innerCode[i].addTokensToEnd([token]);
            if (blockList.innerCode[i+1].isEmpty()) {
                blockList.innerCode.splice(i+1,1);
                if (i >= blockList.innerCode.length - 1) break;

            }
        }
    }
    return blockList;
}
/**
 * Unpacks any instance of NonsemanticCommandList as blocks from its innerCode.
 * @param {BaseCodeBlock[]} blockList 
 */
function UnpackNonsemanticCommandLists(blockList) {
    for (var i = 0; i < blockList.length; i++) {
        if (blockList[i] instanceof NonsemanticCommandList) {
            var cmd = blockList.splice(i, 1);
            var cmds = cmd[0].innerCode;
            blockList.splice(i, 0, cmds);
            i--;
        }
    }
}
/**
 * Given a list of commands (coming from translation of IF statement),
 * merges consecutive ELSE and IF commands into a single command with unique special type.
 * @param {BaseCommandList} commandList List of commands to normalize.
 * @returns {BaseCommandList} Reference to the input command list. 
 */
function MergeElseIf(blockList) {
    var elseifNum = 0;
    for (var i = 0; i < blockList.innerCode.length - 1; i++) {
        if (blockList.innerCode[i].specialType?.startsWith('ELSE IF')) {
            blockList.innerCode[i].specialType = 'ELSE IF ' + elseifNum.toString();
            elseifNum++;
        }
        if (blockList.innerCode[i].specialType == 'ELSE' && blockList.innerCode[i+1].specialType == 'IF') {
            while (!blockList.innerCode[i+1].isEmpty()) {
                var token = blockList.innerCode[i+1].removeFirstToken();
                blockList.innerCode[i].addTokensToEnd([token]);
            }
            blockList.innerCode.splice(i+1,1);
            blockList.innerCode[i].specialType = 'ELSE IF ' + elseifNum.toString();
            elseifNum++;
        }
    }
    return blockList;
}
/**
 * Determines whether given token is a character tabulation.
 * @param {TokenInfo} token Token to check.
 * @returns {boolean} Boolean indicating wheter it is one.
 */
function IsTab(token) {
    for (var char of token.text) {
        if (char != ' ' && char != '\t') {
            return false;
        }
    }
    return true;
}
/**
 * Determines whether given token is a new line token.
 * @param {TokenInfo} token Token to check.
 * @returns {boolean} Boolean indicating wheter it is one.
 */
function IsNewline(token) {
    for (var char of token.text) {
        if (char != '\r' && char != '\n') {
            return false;
        }
    }
    return true;
}
/**
 * Determines whether given token is a semicolon.
 * @param {TokenInfo} token Token to check.
 * @returns {boolean} Boolean indicating wheter it is one.
 */
function IsSemicolon(token) {
    return token.text == ';';
}
/**
 * Normalizes token partition into commands in the given codeblock.
 * @param {*} node Parse tree node that was translated into the given codeblock.
 * @param {BaseCodeBlock} commandList The codeblock to normalize.
 */
function Normalize(node, commandList)
{
    FillInTokens(node, commandList);
    if (commandList instanceof BaseCommandList) {
        UnpackNonsemanticCommandLists(commandList);
        MergeElseIf(commandList);
        MoveTabs(commandList);
        MoveNewlines(commandList);
    }
}
/**
 * Recursively translates given node as a codeblock.
 * @param {*} node The parse tree node to translate.
 * @returns {BaseCodeBlock} Normalized recursively translated codeblock.
 */
function TranslateNodeAndNormalize(node)
{
    var cmd = TranslateRule(node);
    Normalize(node, cmd);
    return cmd;
}
/**
 * Recursively translates given node and appends resulting codeblock into a command list.
 * @param {*} treeNode The parse tree node to translate.
 * @param {BaseCommandList} cmdList The command list to append the result to.
 */
function TranslateNodeAndConcatBlock(treeNode, cmdList) {
    var childCode = TranslateNodeAndNormalize(treeNode);
    if (childCode instanceof NonsemanticCommandList) {
        for (var block of childCode.innerCode) {
            cmdList.innerCode.push(block);
        }
    }
    else cmdList.innerCode.push(childCode);
}
/**
 *  Recursively translates given node and appends it's inner command list into a different command list.
 * @param {*} treeNode The parse tree node to translate. 
 * @param {BaseCommandList} cmdList The command list to append the result's commands to. 
 */
function TranslateNodeAndConcatInner(treeNode, cmdList) {
    var childCode = TranslateNodeAndNormalize(treeNode);
    if (childCode instanceof BaseCommandList) for (var block of childCode.innerCode) {
        cmdList.innerCode.push(block);
    }
    else cmdList.innerCode.push(childCode);
}
/**
 * Translates given node as a nonsemantic text and appens it into a command list.
 * @param {*} treeNode The parse tree node to translate. 
 * @param {BaseCommandList} cmdList The command list to append the result to. 
 * @param {string} specialType Optional special type to set the nonsemantic text to. 
 */
function TranslateAsNonSemanticTextAndConcat(treeNode, cmdList, specialType = undefined) {
    var block = new NonsemanticText([], specialType);
    ExpandSingleCommand(treeNode, block);
    cmdList.innerCode.push(block);
}
/**
 * Given 2 commands, prepends tokens of the first one into the second one.
 * @param {BaseTokenList} prependedCommand The command to prepend tokens from.
 * @param {BaseTokenList} affectedCommand The command to prepend tokens into.
 */
function PrependTokens(prependedCommand, affectedCommand) {
    affectedCommand.addTokensToStart(prependedCommand.tokens);
}
/**
 * Given 2 commands, appands tokens of the second one into the first one.
 * @param {BaseTokenList} affectedCommand The command to append tokens into.
 * @param {BaseTokenList} appendedTokens The command to append tokens from.
 */
function AppendTokens(affectedCommand, appendedTokens) {
    affectedCommand.addTokensToEnd(appendedTokens.tokens);
}
/**
 * Given a possibly empty list, returns first element of it if possible, or returns undefined.
 * @param {*[]} list The list to get first element of.
 * @returns {*} The first element or 'undefined'.
 */
function FirstOrNone(list) {
    if ('0' in list) return list[0];
    else return undefined;
}
/**
 * Given a list or undefined, returns the list itself or empty list respectively.
 * @param {*[]} list The list to return, or 'undefined'.
 * @returns {*[]} The input list or empty list.
 */
function ListOrEmpty(list) {
    if (Array.isArray(list)) return list;
    else return [];
}
