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
if (treeNode == null) return null;
switch (treeNode.ruleIndex)
{
    case 0: // program(0) -> (HB)? (48)? 'EOF'
        return TranslateRule(FindChild(treeNode, 48));
    case 1: // sourceElement(1) -> (2)
        return TranslateRule(FindChild(treeNode, 2));
    case 2: // statement(2) -> (3)|(15)|(5)|(12)|(18)|(40)|(19)|(20)|(21)|(23)|(24)|(25)|
            //                    -> (26)|(27)|(33)|(28)|(34)|(35)|(38)|(39)
        return TranslateRule(treeNode.children[0]);
    case 3: // block(3) -> '{' (4) '}'
        return TranslateRule(FindChild(treeNode, 4));
    case 4: // statementList(4) -> (2)+
        let statements4 = [];
        let children4 = FindChildren(treeNode, 2);
        for (const child of children4)
        {
            statements4.push(TranslateRule(child));
        }
        return new SemanticDefinition([], statements4, "statement_list", null);
    case 5: // importSatement(5) -> 'Import' (6)
        return null;
    case 6: // importFromBlock(6) -> (8)? (9) (10) (74) | (8)? (7) (10) (74) | (STRINGLITERAL) (74)
        return null;
    case 7: // moduleItems(7) -> '{' [(11) ',']* [(11) ','?]? '}'
        return null;
    case 8: // importDefault(8) -> (11) ','
        return null;
    case 9: // importNamespace(9) -> ['*' | (69)] ['As' (69)]?
        return null;
    case 10: // importFrom(10) -> 'From' (STRINGLITERAL)
        return null;
    case 11: // aliasName(11) -> (69) ['As' (69)]?
        return null;
    case 12: // exportStatement(12) -> 'Export' (13) (74) | 'Export' (14) (74) | 'Export' 'Default' (57) (74)
        let t14_12 = TranslateRule(FindChild(treeNode, 14));
        let t57_12 = TranslateRule(FindChild(treeNode, 57));
        if (t14_12 != null) return t14_12;
        else return t57_12;
    case 13: // exportFromBlock(13) -> (9) (10) (74) | (7) (10)? (74)
        return null;
    case 14: // declaration(14) -> (15) | (40) | (39)
        let t15_14 = TranslateRule(FindChild(treeNode, 15));
        let t40_14 = TranslateRule(FindChild(treeNode, 40));
        let t39_14 = TranslateRule(FindChild(treeNode, 39));

        let declarations14 = []

        if (t15_14 != null)
        {
            for (const defined of t15_14.dependingVariables)
            {
                declarations14.push(new SemanticDefinition(t15_14.dependentOn,[],"variable",defined));
            }
        }
        if (t40_14 != null) declarations14.push(t40_14);
        if (t39_14 != null) declarations14.push(t39_14);
        return declarations14;
    case 15: // variableStatement(15) -> (16) (74)
        return TranslateRule(FindChild(treeNode, 16));
    case 16: // variableDeclarationList(16) -> (22) (17) [',' (17)]*
        let variableActions16 = [];
        let children16 = FindChildren(treeNode, 17);
        for (const child of children16)
        {
            variableActions16.push(TranslateRule(child));
        }
        return variableActions16;
    case 17: // variableDeclaration(17) -> (58) ['=' (57)]?
        let asigned17 = ScanLiterals(FindChild(treeNode, 58));
        let dependent17 = ScanLiterals(FindChild(treeNode, 57));
        if (dependent17 == null) dependent17 = [];
        return new SemanticAction(asigned17, dependent17);
    case 18: // emptyStatement(18) -> ';'
        return null;
    case 19: // expressionStatement(19) -> (!!)? (56) (74)
        return TranslateRule(FindChild(treeNode, 56));
    case 20: // ifStatement(20) -> 'If' '(' (56) ')' (2) ['Else' (2)]?
        let condition20 = TranslateRule(FindChild(treeNode, 56));
        let codes20 = FindChildren(treeNode, 2);
        let codeblocks20 = [];

        for (const child of codes20)
        {
            codeblocks20.push(TranslateRule(child));
        }

        return new SemanticDecision(condition20, codeblocks20, "if");

    case 21: // iterationStatement(21) -> 'Do' (2) 'While' '(' (56) ')' (74) |
             //                              -> 'While' '(' (56) ')' (2)
             //                              -> 'For' '(' [(56)|(16)]? ';' (56)? ';' (56)? ')' (2)
             //                              -> 'For' '(' [(57)|(16)] 'In' (56) ')' (2)
             //                              -> 'For' 'Await'? '(' [(57)|(16)] (70='of')? (56) ')' (2)
        // Decisions are based on (56)s, repetaedly executed code is in (2), in code blocks (2) variables listed in (16) are dependent
        let code21 = TranslateRule(FindChild(treeNode, 2));
        let decisions21 = FindChildren(treeNode, 56);
        let depvar21 = TranslateRule(FindChild(treeNode, 16));

        let decisionblocks21 = [];

        for (const child of decisions21)
        {
            decisionblocks21.push(TranslateRule(child));
        }
        // TODO: Pridat zavislost na (16), rozlisit druh iterace?
        return new SemanticDecision(decisionblocks21, code21, "iteration");

    case 22: // varModifier(22) -> 'Var' | (73) | 'Const'
        return null;
    case 23: // continueStatement(23) -> 'Continue' [(!!)? (70)]? (74)
        return null;
    case 24: // breakStatement(24) -> 'Break' [(!!)? (70)]? (74)
        return null;
    case 25: // returnStatement(25) -> 'Return' [(!!)? (56)]? (74)
        return TranslateRule(FindChild(treeNode, 56));
    case 26: // yieldStatement(26) -> 'Yield' [(!!)? (56)]? (74)
        return TranslateRule(FindChild(treeNode, 56));
    case 27: // withStatement(27) -> 'With' '(' (56) ')' (2)
        // TODO: Good use case for (56)?
        return TranslateRule(FindChild(treeNode, 2));
    case 28: // switchStatement(28) -> 'Switch' '(' (56) ')' (29)
        let switch28 = TranslateRule(FindChild(treeNode, 29));
        let conditions28 = TranslateRule(FindChild(treeNode, 56));

            // TODO: format conditions28

        return new SemanticDecision(conditions28, switch28, "switch");

    case 29: // caseBlock(29) -> '{' (30)? [(32) (30)?]? '}'
        let switch29 = TranslateRule(FindChild(treeNode, 30));
        let default29 = TranslateRule(FindChild(treeNode, 32));
        // TODO: Proc 2krat (30)?

        if (switch29 == null) switch29 = [];
        if (default29 != null) switch29.push(default29);

        return switch29;

    case 30: // caseClauses(30) -> (31)+
        let switch30 = [];
        let clauses30 = FindChildren(treeNode, 2);
        for (const clause of clauses30)
        {
            let clause30 = TranslateRule(clause);
            switch30.push(clause30);
        }
    return clauses30;
    case 31: // caseClause(31) -> 'Case' (56) ':' (4)?
        return TranslateRule(FindChild(treeNode, 4));
    case 32: // defaultClause(32) -> Default ':' (4)?
        return TranslateRule(FindChild(treeNode, 4));
    case 33: // labelledStatement(33) -> (70) ':' (2)
    return TranslateRule(FindChild(treeNode, 2));
    case 34: // throwStatement(34) -> 'Throw' (!!)? (56) (74)
        return null;
    case 35: // tryStatement(35) -> 'Try' (3) [ (36) (37)? | (37) ]
        let code1_35 = TranslateRule(FindChild(treeNode, 3));
        let code2_35 = TranslateRule(FindChild(treeNode, 36));
        let code3_35 = TranslateRule(FindChild(treeNode, 37));

        let codes35 = [];
        if (code1_35 != null) codes35.push(code1_35);
        if (code2_35 != null) codes35.push(code2_35);
        if (code3_35 != null) codes35.push(code3_35);

        return new SemanticDecision([],codes35,"try");

    case 36: // catchProduction(36) -> 'Catch' ['(' (58) ')']? (3)
        //TODO: dependency of (58)
        return TranslateRule(FindChild(treeNode, 3));
    case 37: // finallyProduction(37) -> 'Finally' (3)
        return TranslateRule(FindChild(treeNode, 3));
    case 38: // debuggerStatement(38) -> 'Debugger' (74)
        return new SemanticAction([],[]);
    case 39: // functionDeclaration(39) -> 'Async'? 'Function' '*'? (70) '(' (44)? ')' (47)
        let funcName39 = TranslateRule(FindChild(treeNode,70));
        let params39 = TranslateRule(FindChild(treeNode,44));
        let body39 = TranslateRule(FindChild(treeNode,47));
        if (params39 == null) params39 = [];
        return new SemanticDefinition(params39,body39,"function", funcName39);
    case 40: // classDeclaration(40) -> 'Class' (70) (41)
        let className40 = ScanLiterals(FindChild(treeNode, 70));
        let body40 = TranslateRule(FindChild(treeNode, 41));

        return new SemanticDefinition(body40.paramList,body40.localCode,"class",className40);
    case 41: // classTail(41) -> ['Extends' (57)]? '{' (42)* '}'
        let functions41 = [];
        let children41 = FindChildren(treeNode, 42);

        //only if contains EXTENDS
        let extending41 = TranslateRule(FindChild(treeNode,57));
        let extendinglist41 = [];
        if (extending41 != null) extendinglist41.push(extending41);
    
        for (const child of children41)
        {
            //Preklad spravne
            if (child != null) functions41.push(TranslateRule(child));
        }
        return new SemanticDefinition(extendinglist41,functions41,"class_functions", null);
    case 42: // classElement(42) -> ['Static' | !!? (70) | 'Async']* [(43) | (58) '=' (59) ';'] | (18) | '#'? (53) '=' (57)
        // 43: method/getter/setter
        // 58: class_variable
        // 18: [EMPTY STATEMENT]
        // 53: property
        let mgs42 = TranslateRule(FindChild(treeNode,43));
        let cv42 = TranslateRule(FindChild(treeNode,58));
        let property42 = TranslateRule(FindChild(treeNode,53));

        if (mgs42 != null) return mgs42;
        else if (cv42 != null) return new SemanticDefinition([],[],"class_variable", cv42);
        else if (property42 != null) return new SemanticDefinition([],[],"class_property",property42);
        else return null;

    case 43: // methodDefinition(43) -> '*'? '#'? (53) '(' (44)? ')' (47) | '*'? '#'? (67) '(' ')' (47) | '*'? '#'? (68) '(' (44)? ')' (47)
        let methodName43 = TranslateRule(FindChild(treeNode,53));
        let getterName43 = TranslateRule(FindChild(treeNode,67));
        let setterName43 = TranslateRule(FindChild(treeNode,68));
        let params43 = TranslateRule(FindChild(treeNode,44));
        let code43 = TranslateRule(FindChild(treeNode,47));

        let type43 = null;
        let name43 = null;

        if (methodName43 != null)
        {
            type43 = "method";
            name43 = methodName43;
        }
        if (getterName43 != null)
        {
            type43 = "get";
            name43 = methodName43;
        }
        if (setterName43 != null)
        {
            type43 = "set";
            name43 = methodName43;
        }

        if (params43 == null) params43 = [];
        
        return new SemanticDefinition(params43,code43,type43,name43);
    case 44: // formalParameterList(44) -> (45) [',' (45)]* [',' (46)]? | (46)
        let params44 = [];
        let children44 = FindChildren(treeNode, 45);
        for (const child of children44)
        {
            params44.push(TranslateRule(child));
        }
        let lastparam44 = FindChildren(treeNode, 46);
        if (lastparam44 != null) params44.push(lastparam44);

        return params44;
    case 45: // formalParameterArg(45) -> (58) ['=' (57)]?
        return TranslateRule(FindChild(treeNode, 58));
    case 46: // lastFormalParameterArg(46) -> (ELLIPSIS)? (57)
        return null;
    case 47:  // functionBody(47) -> '{' (48)? '}'
        let body47 = TranslateRule(FindChild(treeNode,48));
        return body47;
    case 48: // sourceElements(48) -> (1)+
        let blocks48 = [];
        let children48 = FindChildren(treeNode, 1);
        for (const child of children48)
        {
            let block48 = TranslateRule(child);
            if (block48 != null) blocks48.push(block48);
        }
        return new SemanticDefinition([], blocks48, "program", null);
    case 49: // arrayLiteral(49) -> '[' (50) ']'
        return null;
    case 50: // elementList(50) -> ','* (51)? [','+ (51)]* ','*
        // TODO: SPOJIT DEP.
        return null;
    case 51: // arrayElement(51) -> (ELLIPSIS)? (57)
        // TODO: PRIDAT DO DEP.
        return null;
    case 52: // propertyAssignment(52) -> (53) ':' (57) | '[' (57) ']' ':' (57) | 'Async'? '*'? (53) '(' (44)? ')' (47) | (67) '(' ')' (47) | (68) '(' (45) ')' (47) | (ELLIPSIS)? (57)
        return null;
    case 53: // propertyName(53) -> (69) | (STRINGLITERAL) | (NUMERICLITERAL) | '[' (57) ']'
        return TranslateRule(FindChild(treeNode,69));
    case 54: // arguments(54) -> '(' [(55) [',' (55)]* ','?]? ')'
        let children54 = FindChildren(treeNode, 55);
        let names54 = [];

        for (const child of children54)
        {
            names54.push(TranslateRule(child));
        }
        return names54;
    case 55: // argument(55) -> (ELIPSIS)? (57) | (ELIPSIS)? (70)
        let name1_55 = FindChildren(treeNode, 57);
        let name2_55 = FindChildren(treeNode, 70);

        if (name1_55) return name1_55;
        else return name2_55.dependingVariables[0];
        //TODO: mozna chyba

    case 56: // expressionSequence(56) -> (57) [',' (57)]*
        let children56 = FindChildren(treeNode, 57);
        let dep56 = [];
        let val56 = [];

        for (const child of children56)
        {
            let act56 = TranslateRule(child);
            MergeArrays(dep56, act56.dependingVariables);
            MergeArrays(val56, act56.dependentOn)
        }

        return new SemanticAction(dep56,val56);
    case 57: // singleExpression(57)       -> (60) | 'Class' (70)? (41) | (57) '[' (56) ']' | (57) '?'? '.' '#'? (69) | (57) (54) | 'New' (57) (54)? | 'New' '.' (70) |
             //                            -> | (57) (!!)? '++' | (57) (!!)? '--' | ['Delete'|'Void'|'Typeof'|'++'|'--'|'+'|'-'|'~'|'!'|'Await'] (57)
             //                            -> | (57) ['**'|'*'|'/'|'%'|'+'|'-'|'??'|'<<'|'>>'|'>>>'|'<'|'>'|'<='|'>='|'Instanceof'|'In'|'=='|'!='|'==='|'!=='|'&'|'^'|'|'|'&&'|'||'] (57) |
             //                            -> | (57) '?' (57) ':' (57) | (57) '=' (57) | (57) (63) (57) | 'Import' '(' (57) ')' | (57) (TEMPLATESTRINGLITERAL) |
             //                            -> | (26) | 'This' | (70) | 'Super' | (64) | (49) | (59) | '(' (56) ')'

        let t26_57 = TranslateRule(FindChild(treeNode,26));
        let t41_57 = TranslateRule(FindChild(treeNode,41));
        let t49_57 = TranslateRule(FindChild(treeNode,49));
        let t54_57 = TranslateRule(FindChild(treeNode,54));
        let t56_57 = TranslateRule(FindChild(treeNode,56));
        let cs57_57 = FindChildren(treeNode,57);
        let t59_57 = TranslateRule(FindChild(treeNode,59));
        let t60_57 = TranslateRule(FindChild(treeNode,60));
        let t63_57 = TranslateRule(FindChild(treeNode,63));
        let t64_57 = TranslateRule(FindChild(treeNode,64));
        let t69_57 = TranslateRule(FindChild(treeNode,69));
        let t70_57 = TranslateRule(FindChild(treeNode,70));

        let ts57_57 = [];

        for (const child of cs57_57)
        {
            ts57_57.push(TranslateRule(child));
        }

        switch(ts57_57.length)
        {
            case 0:
                // 'This' | 'Super' | (26) | (49) | (59) | (60) | (64) | (70) | 'Class' (70)? (41) | 'New' '.' (70) | '(' (56) ')'
                if (t70_57 != null) return new SemanticAction(t70_57,[]);
                if (t56_57 != null) return t56_57;
                else return new SemanticAction([],[]);

            case 1:
                // (57) '[' (56) ']' | (57) '?'? '.' '#'? (69) | (57) (54) | 'New' (57) (54)? | (57) (!!)? '++' | (57) (!!)? '--' | ['Delete'|'Void'|'Typeof'|'++'|'--'|'+'|'-'|'~'|'!'|'Await'] (57) | 'Import' '(' (57) ')' | (57) (TEMPLATESTRINGLITERAL)
                return ts57_57[0];

            case 2:
                // (57) ['**'|'*'|'/'|'%'|'+'|'-'|'??'|'<<'|'>>'|'>>>'|'<'|'>'|'<='|'>='|'Instanceof'|'In'|'=='|'!='|'==='|'!=='|'&'|'^'|'|'|'&&'|'||'] (57) | (57) '=' (57) | (57) (63) (57)
                if (treeNode.children[1]?.ruleIndex == 63 || treeNode.children[1].symbol.text == '=')
                {
                    //asignment
                    let left20_57 = [];
                    let right20_57 = [];

                    MergeArrays(left20_57, ts57_57[0].dependingVariables);
                    MergeArrays(left20_57, ts57_57[1].dependingVariables);

                    MergeArrays(right20_57, ts57_57[0].dependentOn);
                    MergeArrays(right20_57, ts57_57[1].dependingVariables);
                    MergeArrays(right20_57, ts57_57[1].dependentOn);

                    return new SemanticAction(left20_57,right20_57);
                }
                else
                {
                    //binary operator
                    let left21_57 = [];
                    let right21_57 = [];

                    MergeArrays(left21_57, ts57_57[0].dependingVariables);
                    MergeArrays(left21_57, ts57_57[1].dependingVariables);

                    MergeArrays(right21_57, ts57_57[0].dependentOn);
                    MergeArrays(right21_57, ts57_57[1].dependentOn);

                    return new SemanticAction(left21_57,right21_57);
                }
            case 3:
                // (57) '?' (57) ':' (57)
                dependendencies3_57 = []
                asigned3_57 = []
                for (const child of ts57_57)
                {
                    let dep3_57 = TranslateRule(child);
                    MergeArrays(dependendencies3_57,dep3_57.dependingVariables);
                    MergeArrays(asigned3_57,dep3_57.dependentOn);
                }
                return new SemanticAction(dependendencies3_57, asigned3_57)
        }

    case 58: // assignable(58) -> (70) | (49) | (59)
        // returns name or null
        return TranslateRule(FindChild(treeNode, 70));
    case 59: // objectLiteral(59) -> '{' [(52) [',' (52)]*]? '}'
        return null;
    case 60: // anonymousFunction(60) -> (39) | (ASYNC)? (FUNCTION) '*'? '(' (44)? ')'
        let sd39_60 = TranslateRule(FindChild(treeNode,39));
        let params44_60 = TranslateRule(FindChild(treeNode,44));
        if (sd39_60 != null)
        {
            return new SemanticDefinition(sd30_60.paramList, sd30_60.localCode, "anonymous_function", sd30_60.name)
        }
        else if (params44_60 != null)
        {
            return new SemanticDefinition(params44_60, [], "anonymous_function", null)
        }
        else
        {
            return new SemanticDefinition([], [], "anonymous_function", null)
        }
    case 61: // arrowFunctionParameters(61) -> (70) | '(' (44)? ')'
        let funcName61 = TranslateRule(FindChild(treeNode,70));
        let params61 = TranslateRule(FindChild(treeNode,44));
        if (params61 == null) params61 = [];
        return new SemanticDefinition(params61,[],"arrow_function", funcName61);
    case 62: // arrowFunctionBody(62) -> (57) | (47)
        let ex57_62 = TranslateRule(FindChild(treeNode,57));
        let params47_62 = TranslateRule(FindChild(treeNode,47));
        if (ex57_62 == null)  return new SemanticDefinition([], [ex57_62], "statements", null);
        else return params47_62;
    case 63: // assignmentOperator(63) -> '*=' | '/=' | '%=' | '+=' | ... | '**='
        return null;
    case 64: // literal(64) -> (NULLLITERAL) | (BOOLEANLITERAL) | (STRINGLITERAL) | (TEMPLATESTRINGLITERAL) | (REGULAREXPRESSIONLITTERAL) | (65) | (66)
        return null;
    case 65: // numericLiteral(65) -> (DEC-L) | (HEX-IL) | (OCT-IL) | (OCT-IL2) | (BIN-IL)
        return null;
    case 66: // bigintLiteral(66) -> (B-DEC-IL) | (B-HEX-IL) | (B-OCT-IL) | (B-BIN-IL)
        return null;
    case 67: // getter(67) -> (!!) (70) (53)
        return TranslateRule(FindChild(treeNode, 70));
    case 68: // setter(68) -> (!!) (70) (53)
        return TranslateRule(FindChild(treeNode, 70));
    case 69: // identifierName(69) -> (70) | (71)
        let child69 = FindChild(treeNode, 70);
        if (child69 != null) return TranslateRule(child69);
        else return [];
    case 70: // identifier(70) -> (IDENTIFIER) | (NONSTRICTLET) | (ASYNC)
        return ScanLiterals(treeNode);
    case 71: // reservedWord(71) -> (72) | (NULLLITERAL) | (BOOLEANLITERAL)
        return null;
    case 72: // keyword(72) -> 'Break' | 'Do' | 'Instanceof' | ... | (73) | ... | 'As'
        return null;
    case 73: // let_(73) -> (NONSTRICTLET) | (STRICTLET)
        return null;
    case 74: // eos(74) -> ';' | (EOF) | (!!) | (!!)
        return null;
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

function MergeArrays(destination, source) {
    for (var v of source) {
        destination.push(v);
    }
    //destination.sort();
    destination = Array.from( new Set([ 1, 1, 'a', 'a' ]) );
}

export class SemanticDefinition
{
    constructor(paramList, localCode, definitionType, name) {
        this.paramList = paramList;
        this.localCode = localCode;
        this.definitionType = definitionType;
        this.name = name;
    }
}

export class SemanticAction
{
    constructor(dependingVariables, dependentOn)
    {
        this.dependingVariables = dependingVariables;
        this.dependentOn = dependentOn;
    }

}

export class SemanticDecision
{
    constructor(dependentOn, perConditionCode, conditionType)
    {
        this.dependentOn = dependentOn;
        this.perConditionCode = perConditionCode;
        this.conditionType = conditionType;
    }
}

class SemanticPlainText
{
    constructor()
    {

    }
}