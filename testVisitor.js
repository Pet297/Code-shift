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

// PROGRAM -> STATEMENTs
if (treeNode.ruleIndex == 0) return TranslateRule(FindChild(treeNode, 48));
// STATEMENTs -> (STATEMENT)*
else if (treeNode.ruleIndex == 48)
{
    let blocks = [];
    let children1 = FindChildren(treeNode, 1);
    for (const child of children1)
    {
        let block = TranslateRule(child);
        if (block != null) blocks.push(block);
    }
    return new SemanticDefinition([], blocks, "statements", "Program");
}
// STATEMENT -> TYPE (a lot of rules)
else if (treeNode.ruleIndex == 1)
{
    return TranslateRule(treeNode.children[0]);
}
else if (treeNode.ruleIndex == 2)
{
    return TranslateRule(treeNode.children[0]);
}
else if (treeNode.ruleIndex == 39)
{
    let funcName = FindChild(treeNode,70)?.children[0].symbol.text;
    let params = TranslateRule(FindChild(treeNode,44));
    let body = TranslateRule(FindChild(FindChild(treeNode,47)),48);
    return new SemanticDefinition(params,body,"function", funcName);
}
else if (treeNode.ruleIndex == 44)
{
    let params = [];
    let children45 = FindChildren(treeNode, 45);
    for (const child of children45)
    {
        params.push(FindChild(FindChild(child,58),70).children[0].symbol.text);
    }
    return params;
}
else if (treeNode.ruleIndex == 41)
{
    let functions = [];
    let children42 = FindChildren(treeNode, 42);

    for (const child of children42)
    {
        functions.push(TranslateRule(child.children[0]));
    }
    return new SemanticDefinition([],functions,"class_functions", "");
}
//CLASS extends
else if (treeNode.ruleIndex == 40)
{
    let className = treeNode.children[1].children[0].symbol.text;
    let body = TranslateRule(treeNode.children[2]);
    return CollapseDefinition(body, [], className, "class");
}
else if (treeNode.ruleIndex == 43)
{
    return new SemanticDefinition([],[],"class_function", "NAME");
}
else if (treeNode.ruleIndex == 15) {
    return TranslateRule(FindChild(treeNode, 16));
}
else if (treeNode.ruleIndex == 16) {
    return TranslateRule(FindChild(treeNode, 17));
}
else if (treeNode.ruleIndex == 17) {
    let asigned = ScanLiterals(FindChild(treeNode, 58));
    let dependent = ScanLiterals(FindChild(treeNode, 57));
    return new SemanticAction(asigned[0], dependent);
}
else if (treeNode.ruleIndex == 19) {
    let dependent = ScanLiterals(FindChild(treeNode, 56));
    let asigned = dependent[0];
    dependent.shift();
    return new SemanticAction(asigned, dependent);
}
else return null;

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