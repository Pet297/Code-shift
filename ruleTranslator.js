// color classes for syntax high-lighting in JS
const JS_NOCLASS = 0;
const JS_KEYWORD = 1;
const JS_IDENTIFIER = 2;
const JS_NUMERICCONSTANT = 3;
const JS_STRINGCONSTANT = 4;
const JS_CONSTANT = 5;
const JS_OPERATOR = 6;
const JS_COMMENT = 7;

export default function TranslateRule(treeNode) {

if (treeNode == null) return null;
else if (! ('ruleIndex' in treeNode)) {
    return null;
}
else switch (treeNode.ruleIndex) {
    case 0: // program(0) -> (HB)? (48)? 'EOF'
        var cmd = TranslateRule(FindChild(treeNode, 48));
        var cmdList = FillInTokens(treeNode, cmd.localCode);
        var st0 = new SemanticDefinition([], cmdList.commands, "program", null);
        return st0;

    case 1: // sourceElement(1) -> (2)
        return TranslateRule(FindChild(treeNode, 2));

    case 2: // statement(2) -> (3)|(15)|(5)|(12)|(18)|(40)|(19)|(20)|(21)|(23)|(24)|(25)|
            //                    -> (26)|(27)|(33)|(28)|(34)|(35)|(38)|(39)
        var st2 = TranslateRule(treeNode.children[0]);
        return st2;

    case 3: // block(3) -> '{' (4) '}'
        return TranslateRule(FindChild(treeNode, 4));

    case 4: // statementList(4) -> (2)+
        let statements4 = [];
        let children4 = FindChildren(treeNode, 2);
        for (const child of children4)
        {
            var child4 = TranslateRule(child);
            var cmds4 = ToCommandList(child4);
            for (var cmd of cmds4.commands) {
                statements4.push(cmd);
            }
        }
        return new NonsemanticCommandList(statements4);

    //case 5: // importSatement(5) -> 'Import' (6)
    //case 6: // importFromBlock(6) -> (8)? (9) (10) (74) | (8)? (7) (10) (74) | (STRINGLITERAL) (74)
    //case 7: // moduleItems(7) -> '{' [(11) ',']* [(11) ','?]? '}'
    //case 8: // importDefault(8) -> (11) ','
    //case 9: // importNamespace(9) -> ['*' | (69)] ['As' (69)]?
    //case 10: // importFrom(10) -> 'From' (STRINGLITERAL)
    //case 11: // aliasName(11) -> (69) ['As' (69)]?
    case 12: // exportStatement(12) -> 'Export' (13) (74) | 'Export' (14) (74) | 'Export' 'Default' (57) (74)
        let t14_12 = TranslateRule(FindChild(treeNode, 14));
        let t57_12 = TranslateRule(FindChild(treeNode, 57));
        if (t14_12 != null) return t14_12;
        if (t57_12 != null) return t57_12;
        else return new NonsemanticIdentifierList(TreenodeToTokens(treeNode));

    //case 13: // exportFromBlock(13) -> (9) (10) (74) | (7) (10)? (74)

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
            var child16 = TranslateRule(child);
            //Add 'var' as part of the command
            child16.tokens = TreenodeToTokens(treeNode);
            child16.localCode[0].tokens = TreenodeToTokens(treeNode);
            var cmds16 = ToCommandList(child16);
            for (var cmd of cmds16.commands) {
                variableActions16.push(cmd);
            }
        }
        return new NonsemanticCommandList(variableActions16);

    case 17: // variableDeclaration(17) -> (58) ['=' (57)]?
        let asigned17 = TranslateRule(FindChild(treeNode, 58));
        let dependendencies17 = TranslateRule(FindChild(treeNode, 57));
        // If we are defining anonymous function
        if (dependendencies17 instanceof SemanticDefinition)
        {
            let fillIn17 = FillInTokens(treeNode, dependendencies17.localCode);
            return new SemanticDefinition([], fillIn17.commands, dependendencies17.definitionType, asigned17.identifiers[0]);
        }
        if (dependendencies17 === null) dependendencies17 = [];
        let tokens17 = TreenodeToTokens(treeNode);
        let sd17 = new SemanticDefinition(dependendencies17.dependentOn, [new NonsemanticText(tokens17)], "variable", asigned17.identifiers[0]);
        sd17.tokens = tokens17;
        return sd17;

    //case 18: // emptyStatement(18) -> ';'

    case 19: // expressionStatement(19) -> (!!)? (56) (74)
        return TranslateRule(FindChild(treeNode, 56));

    //TODO: 20-21 upresnit mezery
    case 20: // ifStatement(20) -> 'If' '(' (56) ')' (2) ['Else' (2)]?
        let dependencies20 = [];
        let decisions20 = FindChildren(treeNode, 56);

        for (const child of decisions20)
        {
            var ids = new NonsemanticIdentifierList(TreenodeToTokens(child));
            dependencies20 = dependencies20.concat(ids.identifiers);
        }

        // List statements
        let code20 = [];
        for (var child of treeNode.children) {
            var childCode = TranslateRule(child);       
            if (childCode != null) {
                var cmdList = ToCommandList(childCode);
                var childFill = FillInTokens(child, cmdList.commands);
                for (var command of childFill.commands) {
                    code20.push(command);
                }
            }
        }
        var codeFill = FillInTokens(treeNode, code20);

        return new SemanticDecision(dependencies20, codeFill.commands, "if");

    case 21: // iterationStatement(21) -> 'Do' (2) 'While' '(' (56) ')' (74) |
             //                              -> 'While' '(' (56) ')' (2)
             //                              -> 'For' '(' [(56)|(16)]? ';' (56)? ';' (56)? ')' (2)
             //                              -> 'For' '(' [(57)|(16)] 'In' (56) ')' (2)
             //                              -> 'For' 'Await'? '(' [(57)|(16)] (70='of')? (56) ')' (2)
             // Decisions are based on (56)s, repetaedly executed code is in (2), in code blocks (2) variables listed in (16) are dependent
        let dependencies21 = [];
        let decisions21 = FindChildren(treeNode, 56);
        let depvar21 = FindChild(treeNode, 16);

        if (depvar21 != null) {
            var ids = new NonsemanticIdentifierList(TreenodeToTokens(depvar21));
            dependencies21 = dependencies21.concat(ids.identifiers);
        }

        for (const child of decisions21)
        {
            var ids = new NonsemanticIdentifierList(TreenodeToTokens(child));
            dependencies21 = dependencies21.concat(ids.identifiers);
        }

        // List statements
        let code21 = [];
        for (var child of treeNode.children) {
            var childCode = TranslateRule(child);       
            if (childCode != null) {
                var cmdList = ToCommandList(childCode);
                var childFill = FillInTokens(child, cmdList.commands);
                for (var command of childFill.commands) {
                    code21.push(command);
                }
            }
        }
        var codeFill = FillInTokens(treeNode, code21);

        return new SemanticDecision(dependencies21, codeFill.commands, "iteration");

    //case 22: // varModifier(22) -> 'Var' | (73) | 'Const'
    //case 23: // continueStatement(23) -> 'Continue' [(!!)? (70)]? (74)
    //case 24: // breakStatement(24) -> 'Break' [(!!)? (70)]? (74)

    case 25: // returnStatement(25) -> 'Return' [(!!)? (56)]? (74)
        return FillInTokensSimple(treeNode, TranslateRule(FindChild(treeNode, 56)));

    case 26: // yieldStatement(26) -> 'Yield' [(!!)? (56)]? (74)
        return FillInTokensSimple(treeNode, TranslateRule(FindChild(treeNode, 56)));

    case 27: // withStatement(27) -> 'With' '(' (56) ')' (2)
        let dependencies27 = [];
        let decisions27 = FindChildren(treeNode, 56);

        for (const child of decisions27)
        {
            var ids = new NonsemanticIdentifierList(TreenodeToTokens(child));
            dependencies27 = dependencies27.concat(ids.identifiers);
        }
        
        let code27 = TranslateRule(FindChild(treeNode,2));
        let cmdList27 = ToCommandList(code27);
        let cmdFill27 = FillInTokens(treeNode, cmdList27.commands);
        return new SemanticDecision(dependencies27 , cmdFill27.commands, "with");

    case 28: // switchStatement(28) -> 'Switch' '(' (56) ')' (29)
        let dependencies28 = [];
        let decisions28 = FindChildren(treeNode, 56);

        for (const child of decisions28)
        {
            var ids = new NonsemanticIdentifierList(TreenodeToTokens(child));
            dependencies28 = dependencies28.concat(ids.identifiers);
        }
        let switch28 = TranslateRule(FindChild(treeNode, 29));
        let cmdList28 = ToCommandList(switch28);
        let cmdFill28 = FillInTokens(treeNode, cmdList28.commands);

        return new SemanticDecision(decisions28, cmdFill28.commands, "switch");

    case 29: // caseBlock(29) -> '{' (30)? [(32) (30)?]? '}'
        let switch29 = TranslateRule(FindChild(treeNode, 30));
        let default29 = TranslateRule(FindChild(treeNode, 32));

        if (switch29 == null) switch29 = [];
        else switch29 = switch29.commands;
        if (default29 != null) switch29 = switch29.concat(default29.commands);

        return FillInTokens(treeNode, switch29);

    case 30: // caseClauses(30) -> (31)+
        let switch30 = [];
        let clauses30 = FindChildren(treeNode, 31);
        for (const clause of clauses30)
        {
            let clause30 = TranslateRule(clause);
            let cmdl30 = ToCommandList(clause30);
            switch30 = switch30.concat(cmdl30.commands);
        }
    return FillInTokens(treeNode ,switch30);

    case 31: // caseClause(31) -> 'Case' (56) ':' (4)?
        return TranslateRule(FindChild(treeNode, 4));

    case 32: // defaultClause(32) -> Default ':' (4)?
        return TranslateRule(FindChild(treeNode, 4));

    case 33: // labelledStatement(33) -> (70) ':' (2)
    return TranslateRule(FindChild(treeNode, 2));

    //case 34: // throwStatement(34) -> 'Throw' (!!)? (56) (74)

    case 35: // tryStatement(35) -> 'Try' (3) [ (36) (37)? | (37) ]
        // List statements
        let code35 = [];
        for (var child of treeNode.children) {
            var childCode = TranslateRule(child);       
            if (childCode != null) {
                var cmdList = ToCommandList(childCode);
                var childFill = FillInTokens(child, cmdList.commands);
                for (var command of childFill.commands) {
                    code35.push(command);
                }
            }
        }
        var codeFill = FillInTokens(treeNode, code35);

        return new SemanticDecision([],code35,"try");

    //case 36: // catchProduction(36) -> 'Catch' ['(' (58) ')']? (3)

    //case 37: // finallyProduction(37) -> 'Finally' (3)

    //case 38: // debuggerStatement(38) -> 'Debugger' (74)

    case 39: // functionDeclaration(39) -> 'Async'? 'Function' '*'? (70) '(' (44)? ')' (47)
        let funcName39 = TranslateRule(FindChild(treeNode,70));
        let params39 = TranslateRule(FindChild(treeNode,44));
        let body39 = TranslateRule(FindChild(treeNode,47));

        let bodyFillIn39 = FillInTokens(treeNode, body39.localCode);

        return new SemanticDefinition(params39.identifiers,bodyFillIn39.commands,"function", funcName39.identifiers[0]);

    case 40: // classDeclaration(40) -> 'Class' (70) (41)
        let className40 = TranslateRule(FindChild(treeNode,70));
        let body40 = TranslateRule(FindChild(treeNode, 41));

        let bodyFillIn40 = FillInTokens(treeNode, body40.localCode);

        return new SemanticDefinition([],bodyFillIn40.commands,"class",className40.identifiers[0]);

    case 41: // classTail(41) -> ['Extends' (57)]? '{' (42)* '}'
        let functions41 = [];
        let children41 = FindChildren(treeNode, 42);

        //only if contains EXTENDS
        let extending41 = TranslateRule(FindChild(treeNode,57));
        let extendinglist41 = [];
        if (extending41 != null) extendinglist41.push(extending41);
    
        // TODO: Jako ostatni
        for (const child of children41)
        {
            if (child != null) functions41.push(TranslateRule(child));
        }

        let bodyFillIn41 = FillInTokens(treeNode, functions41);

        // TODO: seznam prikazu
        return new SemanticDefinition(extendinglist41,functions41,"class_functions", null);
    case 42: // classElement(42) -> ['Static' | !!? (70) | 'Async']* [(43) | (58) '=' (59) ';'] | (18) | '#'? (53) '=' (57)
        // 43: method/getter/setter
        // 58: class_variable
        // 18: [EMPTY STATEMENT]
        // 53: property
        let mgs42 = TranslateRule(FindChild(treeNode,43));
        let cv42 = TranslateRule(FindChild(treeNode,58));
        let property42 = TranslateRule(FindChild(treeNode,53));

        let code42 = ToCommandList(new NonsemanticIdentifierList(TreenodeToTokens(treeNode)));

        //TODO: Doplnit

        if (mgs42 != null) return mgs42;
        else if (cv42 != null) return new SemanticDefinition([],code42.commands,"class_variable", cv42);
        else if (property42 != null) return new SemanticDefinition([],code42.commands,"class_property",property42.identifiers[0]);
        else return new NonsemanticIdentifierList(TreenodeToTokens(treeNode));

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
            name43 = methodName43.identifiers[0];
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

        if (params43 == null) params43 = { identifiers: []};
        
        return new SemanticDefinition(params43.identifiers,code43.localCode,type43,name43);
    //case 44: // formalParameterList(44) -> (45) [',' (45)]* [',' (46)]? | (46)
    //case 45: // formalParameterArg(45) -> (58) ['=' (57)]?
    //case 46: // lastFormalParameterArg(46) -> (ELLIPSIS)? (57)
    case 47:  // functionBody(47) -> '{' (48)? '}'
        let body47 = TranslateRule(FindChild(treeNode,48));
        return body47;
    case 48: // sourceElements(48) -> (1)+
        let blocks48 = [];
        let children48 = FindChildren(treeNode, 1);
        for (const child of children48)
        {
            let block48 = TranslateRule(child);
            if (block48 != null)
            {
                if (block48 instanceof NonsemanticCommandList) {
                    for (const block of block48.commands) {
                        blocks48.push(block);
                    }
                }
                else {
                    blocks48.push(block48);
                }
            }
        }

        var cmdList = FillInTokens(treeNode, blocks48);
        var st48 = new SemanticDefinition([], cmdList.commands, "program", null);
        return st48;

    //case 49: // arrayLiteral(49) -> '[' (50) ']'
    //case 50: // elementList(50) -> ','* (51)? [','+ (51)]* ','*
    //case 51: // arrayElement(51) -> (ELLIPSIS)? (57)
    //case 52: // propertyAssignment(52) -> (53) ':' (57) | '[' (57) ']' ':' (57) | 'Async'? '*'? (53) '(' (44)? ')' (47) | (67) '(' ')' (47) | (68) '(' (45) ')' (47) | (ELLIPSIS)? (57)
    //case 53: // propertyName(53) -> (69) | (STRINGLITERAL) | (NUMERICLITERAL) | '[' (57) ']'
    //case 54: // arguments(54) -> '(' [(55) [',' (55)]* ','?]? ')'
    //case 55: // argument(55) -> (ELIPSIS)? (57) | (ELIPSIS)? (70)

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
        return new SemanticAction(dep56,val56, TreenodeToTokens(treeNode));

    case 57: // singleExpression(57)       -> (60) | 'Class' (70)? (41) | (57) '[' (56) ']' | (57) '?'? '.' '#'? (69) | (57) (54) | 'New' (57) (54)? | 'New' '.' (70) |
             //                            -> | (57) (!!)? '++' | (57) (!!)? '--' | ['Delete'|'Void'|'Typeof'|'++'|'--'|'+'|'-'|'~'|'!'|'Await'] (57)
             //                            -> | (57) ['**'|'*'|'/'|'%'|'+'|'-'|'??'|'<<'|'>>'|'>>>'|'<'|'>'|'<='|'>='|'Instanceof'|'In'|'=='|'!='|'==='|'!=='|'&'|'^'|'|'|'&&'|'||'] (57) |
             //                            -> | (57) '?' (57) ':' (57) | (57) '=' (57) | (57) (63) (57) | 'Import' '(' (57) ')' | (57) (TEMPLATESTRINGLITERAL) |
             //                            -> | (26) | 'This' | (70) | 'Super' | (64) | (49) | (59) | '(' (56) ')'

        // Anonymous class
        let t41_57 = TranslateRule(FindChild(treeNode,41));
        if (t41_57 != null) return t41_57;

        // Anonymous function
        let t60_57 = TranslateRule(FindChild(treeNode,60));
        if (t60_57 != null) return t60_57;

        let t56_57 = TranslateRule(FindChild(treeNode,56));
        let cs57_57 = FindChildren(treeNode,57);
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
                if (t70_57 != null) return new SemanticAction(t70_57.identifiers,[], TreenodeToTokens(treeNode));
                if (t56_57 != null) return t56_57;
                else return new SemanticAction([],[], TreenodeToTokens(treeNode));

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

                    return new SemanticAction(left20_57,right20_57, TreenodeToTokens(treeNode));
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

                    return new SemanticAction(left21_57,right21_57, TreenodeToTokens(treeNode));
                }
            case 3:
                // (57) '?' (57) ':' (57)
                var dependendencies3_57 = []
                var asigned3_57 = []
                for (const child of ts57_57)
                {
                    MergeArrays(dependendencies3_57,child.dependingVariables);
                    MergeArrays(asigned3_57,child.dependentOn);
                }
                return new SemanticAction(dependendencies3_57, asigned3_57, TreenodeToTokens(treeNode))
        }

    //case 58: // assignable(58) -> (70) | (49) | (59)
    //case 59: // objectLiteral(59) -> '{' [(52) [',' (52)]*]? '}'
    case 60: // anonymousFunction(60) -> (39) | (ASYNC)? (FUNCTION) '*'? '(' (44)? ')'
        // TODO: sd
        let sd39_60 = TranslateRule(FindChild(treeNode,39));
        let params44_60 = TranslateRule(FindChild(treeNode,44));
        let sd47_60 = TranslateRule(FindChild(treeNode,47));
        if (sd39_60 != null)
        {
            return new SemanticDefinition(sd30_60.paramList, sd30_60.localCode, "anonymous_function", sd30_60.name)
        }
        else if (params44_60 != null)
        {
            return new SemanticDefinition(params44_60.identifiers, sd47_60.localCode, "anonymous_function", null)
        }
        else
        {
            return new SemanticDefinition([], [], "anonymous_function", null)
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
        return new NonsemanticIdentifierList(TreenodeToTokens(treeNode));
    }
}
// TODO: [id] -> NonsemIdList 62, 61, 58
// TODO: 59 - zavislost na vnitrku
// TODO: 57 simplify
// TODO: 68 - setter
// TODO skoro vse s decision

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

function MergeArrays(destination, source) {
    for (var v of source) {
        destination.push(v);
    }
}

// Specific to JS
// TODO: Language interface
function TreenodeToTokens(treeNode) {
    var tokens = [];

    for (var i = treeNode.start.tokenIndex; i <= treeNode.stop.tokenIndex; i++) {
        tokens.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
    }

    return tokens;
}
export function GetTokenInfo(commonToken) {
    var colorClass = JS_NOCLASS;
    var identifier = false;
    var literal = false;

    var text = commonToken.text;

    if (commonToken.type >= 2 && commonToken.type <= 3) colorClass = JS_COMMENT;
    if (commonToken.type == 4) colorClass = JS_STRINGCONSTANT;
    if (commonToken.type >= 18 && commonToken.type <= 27) colorClass = JS_OPERATOR;
    if (commonToken.type >= 30 && commonToken.type <= 58) colorClass = JS_OPERATOR;
    if (commonToken.type >= 59 && commonToken.type <= 60) { colorClass = JS_CONSTANT; literal = true; }
    if (commonToken.type >= 61 && commonToken.type <= 69) { colorClass = JS_NUMERICCONSTANT; literal = true; }
    if (commonToken.type >= 70 && commonToken.type <= 116) colorClass = JS_KEYWORD;
    if (commonToken.type == 117) { colorClass = JS_IDENTIFIER; identifier = true; literal = true; }
    if (commonToken.type >= 118 && commonToken.type <= 119) { colorClass = JS_STRINGCONSTANT; literal = true; }
    if (commonToken.type >= 122 && commonToken.type <= 123) colorClass = JS_COMMENT;

    return new TokenInfo(text, commonToken.start, commonToken.stop, commonToken.tokenIndex, literal, identifier, colorClass);
}
function ToCommandList(command) {
    if (command instanceof NonsemanticIdentifierList) {
        var command1 = new NonsemanticText(command.tokens);
        return new NonsemanticCommandList([command1]);
    }
    else if (command instanceof NonsemanticCommandList) {
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
        console.error("Unexpected: No if clause executed in \"ToCommandList\" in \"ruleTranslator.js\".");
    }
}
function FillInTokens(treeNode, commandList) {
    var from = treeNode.start.tokenIndex;
    var to = treeNode.stop.tokenIndex;
    var newList = [];
    var lastCmd = null;

    for (var cmd of commandList) {
        if (cmd.tokens[0].tokenIndex != from) {
            // create new nonsemantic text
            var tokensNt = [];
            var comment = [];
            var commentMode = false;
            for (var i = from; i < cmd.tokens[0].tokenIndex; i++) {
                var tokenType = treeNode.parser._input.tokens[i].type;
                if (!commentMode && tokenType != 122 && tokenType != 123 && tokenType != 2 && tokenType != 3) tokensNt.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
                else
                {
                    comment.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
                    commentMode = true;
                }
            }
            if (lastCmd === null || !('tokens' in lastCmd)) {
                var nt = new NonsemanticText(tokensNt);
                newList.push(nt);
            }
            else PushTokensToEnd(lastCmd, tokensNt);
            if (comment.length != 0) newList.push(new NonsemanticText(comment));
        }
        
        // add previous
        newList.push(cmd);
        from = cmd.tokens[cmd.tokens.length - 1].tokenIndex + 1;
        lastCmd = cmd;
    }

    // add nonsemantic end if any
    if (from <= to) {
        // create new nonsemantic text
        var tokensEnd = [];
        for (var i = from; i <= to; i++) {
            tokensEnd.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
        }
        var nt = new NonsemanticText(tokensEnd);
        newList.push(nt);
    }

    return new NonsemanticCommandList(newList);
}
function FillInTokensSimple(treeNode, command) {
    var from = treeNode.start.tokenIndex;
    var to = treeNode.stop.tokenIndex;

    command.tokens = [];

    for (var i = from; i <= to; i++) {
        command.tokens.push(GetTokenInfo(treeNode.parser._input.tokens[i]));
    }

    return command;
}
function PushTokensToEnd(block, tokens) {
    for (var token of tokens) {
        block.tokens.push(token);
    }

    //TODO: Decision
    if (block instanceof SemanticDefinition) {
        if (block.definitionType != 'variable') block.localCode.push(new NonsemanticText(tokens));
        else if (block.definitionType == 'variable') block.localCode[0].tokens = block.localCode[0].tokens.concat(tokens);
    }
}

// Common interface
// - tokens: list of tokens in source code
// - variables: list of tokens, that are also variables

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

class NonsemanticIdentifierList {
    constructor(tokens) {
        this.tokens = tokens;
        this.literals = [];
        this.identifiers = [];

        for (var token of tokens) {
            if (token.isIdentifier) this.identifiers.push(token.text);
            if (token.isLiteral) this.literals.push(token.text);
        }
    }
}

class NonsemanticCommandList {
    constructor(commands) {
        this.commands = commands;

        this.tokens = [];
        for (var cmd of this.commands) {
            MergeArrays(this.tokens, cmd.tokens);
        }
    }
}

export class SemanticDefinition
{
    constructor(paramList, localCode, definitionType, name) {
        this.paramList = paramList;
        this.localCode = localCode;
        this.definitionType = definitionType;
        this.name = name;

        this.tokens = [];
        for (var cmd of localCode) {
            MergeArrays(this.tokens, cmd.tokens);
        }
    }
}

export class SemanticAction
{
    constructor(dependingVariables, dependentOn, tokens)
    {
        this.dependingVariables = dependingVariables;
        this.dependentOn = dependentOn;

        
        this.tokens = [];
        for (var token of tokens) {
            this.tokens.push(token);
        }
    }

}

export class SemanticDecision
{
    constructor(dependentOn, localCode, conditionType)
    {
        this.dependentOn = dependentOn;
        this.localCode = localCode;
        this.conditionType = conditionType;

        this.tokens = [];
        for (var cmd of localCode) {
            MergeArrays(this.tokens, cmd.tokens);
        }
    }
}

export class NonsemanticText
{
    constructor(tokens)
    {
        this.tokens = [];
        for (var token of tokens) {
            var info = GetTokenInfo(token);
            this.tokens.push(token);
        }
    }
}