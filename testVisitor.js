function VisitRules1(tree, depth = 0, func_num = -1, prev = -1, l = [])
{
    if (typeof tree.children === 'undefined')
    {
        //console.log("#" + tree.symbol.type + " - " + tree.symbol.text + " - Rule " + prev);
        if (tree.symbol.type == 117)
        {
            l.push({id: prev, name: tree.symbol.text});
            //console.log();
        }
    }
    else
    {
        tree.children.forEach(element => {VisitRules(element, depth + 1, tree.ruleIndex, func_num, l);});
    }
}
    
export default function VisitRules(tree, depth)
{
        if (typeof tree.children === 'undefined')
        {
            console.log(('--'.repeat(depth)) + " : #" + tree.symbol.type + " - " + tree.symbol.text);
        }
        else
        {

        var str = ('--'.repeat(depth)) + '( ' + tree.ruleIndex + " : ";
        var first = true;

        tree.children.forEach(element => {
            if (first) str += element.ruleIndex 
            else str += ", " + element.ruleIndex
            first = false;
        });
        str += " )";

        console.log(str);
        
            tree.children.forEach(element => {
                VisitRules(element, depth + 1);               
                });
        }
    
}

export function TranslateRule(treeNode) {

switch (treeNode.ruleIndex)
{
    case 0: // program(0) -> (HB)? (48)? 'EOF'
        return TranslateRule(FindChild(treeNode, 48));
    case 1: // sourceElement(1) -> (2)
        return TranslateRule(FindChild(treeNode, 2));
    case 2: // TODO: statement(2) -> (3)|(15)|(5)|(12)|(18)|(40)|(19)|(20)|(21)|(23)|(24)|(25)|
            //                    -> (26)|(27)|(33)|(28)|(34)|(35)|(38)|(39)
        return TranslateRule(treeNode.children[0]);
    case 3: // TODO: block(3) -> '{' (4) '}'
        return null;
    case 4: // TODO: statementList(4) -> (2)+
        return null;
    case 5: // TODO: importSatement(5) -> 'Import' (6)
        return null;
    case 6: // TODO: importFromBlock(6) -> (8)? (9) (10) (74) | (8)? (7) (10) (74) | (STRINGLITERAL) (74)
        return null;
    case 7: // TODO: moduleItems(7) -> '{' [(11) ',']* [(11) ','?]? '}'
        return null;
    case 8: // TODO: importDefault(8) -> (11) ','
        return null;
    case 9: // TODO: importNamespace(9) -> ['*' | (69)] ['As' (69)]?
        return null;
    case 10: // TODO: importFrom(10) -> 'From' (STRINGLITERAL)
        return null;
    case 11: // TODO: aliasName(11) -> (69) ['As' (69)]?
        return null;
    case 12: // TODO: exportStatement(12) -> 'Export' (13) (74) | 'Export' (14) (74) | 'Export' 'Default' (57) (74)
        return null;
    case 13: // TODO: exportFromBlock(13) -> (9) (10) (74) | (7) (10)? (74)
        return null;
    case 14: // TODO: declaration(14) -> (15) | (40) | (39)
        return null
    case 15: // variableStatement(15) -> (16) (74)
        return TranslateRule(FindChild(treeNode, 16));
    case 16: // TODO: variableDeclarationList(16) -> (22) (17) [',' (17)]*
        return TranslateRule(FindChild(treeNode, 17));
    case 17: // TODO: variableDeclaration(17) -> (58) ['=' (57)]?
        let asigned17 = ScanLiterals(FindChild(treeNode, 58));
        let dependent17 = ScanLiterals(FindChild(treeNode, 57));
        return new SemanticAction(asigned17[0], dependent17);
    case 18: // emptyStatement(18) -> ';'
        return null;
    case 19: // TODO: expressionStatement(19) -> (!!)? (56) (74)
        return null;
    case 20: // TODO: ifStatement(20) -> 'If' '(' (56) ')' (2) ['Else' (2)]?
        return null;
    case 21: // TODO: iterationStatement(21) -> 'Do' (2) 'While' '(' (56) ')' (74) |
             //                              -> 'While' '(' (56) ')' (2)
             //                              -> 'For' '(' [(56)|(16)]? ';' (56)? ';' (56)? ')' (2)
             //                              -> 'For' '(' [(57)|(16)] 'In' (56) ')' (2)
             //                              -> 'For' 'Await'? '(' [(57)|(16)] (70='of')? (56) ')' (2)
        return null;
    case 22: // TODO: varModifier(22) -> 'Var' | (73) | 'Const'
        return null;
    case 23: // TODO: continueStatement(23) -> 'Continue' [(!!)? (70)]? (74)
        return null;
    case 24: // TODO: breakStatement(24) -> 'Break' [(!!)? (70)]? (74)
        return null;
    case 25: // TODO: returnStatement(25) -> 'Return' [(!!)? (56)]? (74)
        return null;
    case 26: // TODO: yieldStatement(26) -> 'Yield' [(!!)? (56)]? (74)
        return null;
    case 27: // TODO: withStatement(27) -> 'With' '(' (56) ')' (2)
        return null;
    case 28: // TODO: switchStatement(28) -> 'Switch' '(' (56) ')' (29)
        return null;
    case 29: // TODO: caseBlock(29) -> '{' (30)? [(32) (30)?]? '}'
        return null;
    case 30: // TODO: caseClauses(30) -> (31)+
        return null;
    case 31: // TODO: caseClause(31) -> 'Case' (56) ':' (4)?
        return null;
    case 32: // TODO: defaultClause(32) -> Default ':' (4)?
        return null;
    case 33: // TODO: labelledStatement(33) -> (70) ':' (2)
        return null;
    case 34: // TODO: throwStatement(34) -> 'Throw' (!!)? (56) (74)
        return null;
    case 35: // TODO: tryStatement(35) -> 'Try' (3) [ (36) (37)? | (37) ]
        return null;
    case 36: // TODO: catchProduction(36) -> 'Catch' ['(' (58) ')']? (3)
        return null;
    case 37: // TODO: finallyProduction(37) -> 'Finally' (3)
        return null;
    case 38: // TODO: debuggerStatement(38) -> 'Debugger' (74)
        return null;
    case 39: // TODO: functionDeclaration(39) -> 'Async'? 'Function' '*'? (70) '(' (44)? ')' (47)
        let funcName39 = TranslateRule(FindChild(treeNode,70));
        let params39 = TranslateRule(FindChild(treeNode,44));
        let body39 = TranslateRule(FindChild(treeNode,47));
        return new SemanticDefinition(params39,body39,"function", funcName39);
    case 40: // TODO: classDeclaration(40) -> 'Class' (70) (41)
        let className = treeNode.children[1].children[0].symbol.text;
        let body2 = TranslateRule(treeNode.children[2]);
        return CollapseDefinition(body2, [], className, "class");
    case 41: // TODO: classTail(41) -> ['Extends' (57)]? '{' (42)* '}'
        let functions41 = [];
        let children41 = FindChildren(treeNode, 42);
        //only if contains EXTENDS
        let extending41 = TranslateRule(FindChild(treeNode,57));
        let extending41list = [];
        if (extending41 != null) extending41list.push(extending41);
    
        for (const child of children41)
        {
            //Preklad spravne
            functions41.push(TranslateRule(child.children[0]));
        }
        return new SemanticDefinition(extending41list,functions,"class_functions", "");
    case 42: // TODO: classElement(42) -> ['Static' | !!? (70) | 'Async']* [(43) | (58) '=' (59) ';'] | (18) | '#'? (53) '=' (57)
        return null
    case 43: // TODO: methodDefinition(43) -> '*'? '#'? (53) '(' (44)? ')' (47) | '*'? '#'? (67) '(' ')' (47) | '*'? '#'? (68) '(' (44)? ')' (47)
        return new SemanticDefinition([],[],"class_function", "NAME");
    case 44: // TODO: formalParameterList(44) -> (45) [',' (45)]* [',' (46)]? | (46)
        let params44 = [];
        let children44 = FindChildren(treeNode, 45);
        for (const child of children44)
        {
            params44.push(TranslateRule(child));
        }
        return params44;
    case 45: // TODO: formalParameterArg(45) -> (58) ['=' (57)]?
        return null
    case 46: // TODO: lastFormalParameterArg(46) -> (ELLIPSIS)? (57)
        return null
    case 47:  // TODO: functionBody(47) -> '{' (48)? '}'
        let fake = null;
        let body47 = TranslateRule(FindChild(treeNode,48));
        return null;
    case 48: // sourceElements(48) -> (1)+
        let blocks = [];
        let children1 = FindChildren(treeNode, 1);
        for (const child of children1)
        {
            let block = TranslateRule(child);
            if (block != null) blocks.push(block);
        }
        return new SemanticDefinition([], blocks, "statements", "Program");
    case 49: // TODO: arrayLiteral(49) -> '[' (50) ']'
        return null
    case 50: // TODO: elementList(50) -> ','* (51)? [','+ (51)]* ','*
        return null
    case 51: // TODO: arrayElement(51) -> (ELLIPSIS)? (57)
        return null
    case 52: // TODO: propertyAssignment(52) -> (53) ':' (57) | '[' (57) ']' ':' (57) | 'Async'? '*'? (53) '(' (44)? ')' (47) | (67) '(' ')' (47) | (68) '(' (45) ')' (47) | (ELLIPSIS)? (57)
        return null
    case 53: // TODO: propertyName(53) -> (69) | (STRINGLITERAL) | (NUMERICLITERAL) | '[' (57) ']'
        return null
    case 54: // TODO: arguments(54) -> '(' [(55) [',' (55)]* ','?]? ')'
        return null
    case 55: // TODO: argument(55) -> (ELIPSIS)? (57) | (ELIPSIS)? (70)
        return null
    case 56: // TODO: expressionSequence(56) -> (57) [',' (57)]*
        return null
    case 57: // TODO: singleExpression(57) -> (60) | 'Class' (70)? (41) | (57) '[' (56) ']' | (57) '?'? '.' '#'? (69) | (57) (54) | 'New' (57) (54)? | 'New' '.' (70) |
             //                            -> | (57) (!!)? '++' | (57) (!!)? '--' | ['Delete'|'Void'|'Typeof'|'++'|'--'|'+'|'-'|'~'|'!'|'Await'] (57)
             //                            -> | (57) ['**'|'*'|'/'|'%'|'+'|'-'|'??'|'<<'|'>>'|'>>>'|'<'|'>'|'<='|'>='|'Instanceof'|'In'|'=='|'!='|'==='|'!=='|'&'|'^'|'|'|'&&'|'||'] (57) |
             //                            -> | (57) '?' (57) ':' (57) | (57) '=' (57) | (57) (63) (57) | 'Import' '(' (57) ')' | (57) (TEMPLATESTRINGLITERAL) |
             //                            -> | (26) | 'This' | (70) | 'Super' | (64) | (49) | (59) | '(' (56) ')'
        return TranslateRule(FindChild(treeNode, 70));
    case 58: // TODO: assignable(58) -> (70) | (49) | (59)
        return TranslateRule(FindChild(treeNode, 70));
    case 59: // TODO: objectLiteral(59) -> '{' [(52) [',' (52)]*]? '}'
        return null
    case 60: // TODO: anonymousFunction(60) -> (39) | (ASYNC)? (FUNCTION) '*'? '(' (44)? ')'
        return null
    case 61: // TODO: arrowFunctionParameters(61) -> (70) | '(' (44)? ')'
        return null
    case 62: // TODO: arrowFunctionBody(62) -> (57) | (47)
        return null
    case 63: // TODO: assignmentOperator(63) -> '*=' | '/=' | '%=' | '+=' | ... | '**='
        return null
    case 64: // TODO: literal(64) -> (NULLLITERAL) | (BOOLEANLITERAL) | (STRINGLITERAL) | (TEMPLATESTRINGLITERAL) | (REGULAREXPRESSIONLITTERAL) | (65) | (66)
        return null
    case 65: // TODO: numericLiteral(65) -> (DEC-L) | (HEX-IL) | (OCT-IL) | (OCT-IL2) | (BIN-IL)
        return null
    case 66: // TODO: bigintLiteral(66) -> (B-DEC-IL) | (B-HEX-IL) | (B-OCT-IL) | (B-BIN-IL)
        return null
    case 67: // TODO: getter(67) -> (!!) (70) (53)
        return null
    case 68: // TODO: setter(68) -> (!!) (70) (53)
        return null
    case 69: // TODO: identifierName(69) -> (70) | (71)
        return null
    case 70: // TODO: identifier(70) -> (IDENTIFIER) | (NONSTRICTLET) | (ASYNC)
        return ScanLiterals(treeNode);
    case 71: // TODO: reservedWord(71) -> (72) | (NULLLITERAL) | (BOOLEANLITERAL)
        return null
    case 72: // TODO: keyword(72) -> 'Break' | 'Do' | 'Instanceof' | ... | (73) | ... | 'As'
        return null
    case 73: // TODO: let_(73) -> (NONSTRICTLET) | (STRICTLET)
        return null
    case 74: // TODO: eos(74) -> ';' | (EOF) | (!!) | (!!)
        return null
    default:
        return null;
}
}

function FindChild(treeNode, index) {
    if (treeNode == null) return null;
    for (const child of treeNode.children)
    {
        if (child !== undefined)
        {
            if (child?.ruleIndex == index)
            {
                return child;
            }
        }
    }
    return null;
}

function FindChildren(treeNode, index) {
    let l = [];
    if (treeNode == null) return l;
    for (const child of treeNode.children)
    {
        if (child !== undefined)
        {
            if (child?.ruleIndex == index)
            {
                l.push(child);
            }
        }
    }
    return l;
}

function CollapseDefinition(definition, newParams, newName, newType) {
    return new SemanticDefinition(newParams, definition.localCode, newType, newName);
}
// Pozor, konstanta 117
function ScanLiterals(treeNode, l = []) {
    if (typeof treeNode.children === 'undefined')
    {
        if (treeNode.symbol.type == 117)
        {
            l.push(treeNode.symbol.text);
        }
    }
    else
    {
        treeNode.children.forEach(element => {ScanLiterals(element,l);});
    }
    return l;
}

class SemanticDefinition
{
    constructor(paramList, localCode, definitionType, name) {
        this.paramList = paramList;
        this.localCode = localCode;
        this.definitionType = definitionType;
        this.name = name;
    }
}

class SemanticAction
{
    constructor(dependingVariables, dependentOn)
    {
        this.dependingVariables = dependingVariables;
        this.dependentOn = dependentOn;
    }

}

class SemanticPlainText
{
    constructor()
    {

    }
}