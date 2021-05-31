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

export function TransformRulesF(l)
{
    let ll = [];
    l.forEach(element =>
        {
             if (element.id == 39)
             {
                 ll.push({name: element.name, children:[]});
             }
             else
             {
                 ll[ll.length-1].children.push(element);
             }
    });
    return ll;
}

export function TranslateRule(treeNode) {

// PROGRAM -> STATEMENTs
if (treeNode.ruleIndex == 0) return TranslateRule(treeNode.children[0]);
// STATEMENTs -> (STATEMENT)*
else if (treeNode.ruleIndex == 48)
{
    let blocks = [];
    for (const child of treeNode.children)
    {
        let block = TranslateRule(child);
        if (block != null) blocks.push(block);
    }
    return new SemanticDefinition([], blocks, "statements");
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
    let funcName = treeNode.children[1].children[0].symbol.text;
    let params = TranslateRule(treeNode.children[3]);
    let body = TranslateRule(treeNode.children[5].children[1]);
    return new SemanticDefinition(params,body,"function");
}
else if (treeNode.ruleIndex == 44)
{
    let params = [];
    for (const child of treeNode.children)
    {
        if (child.ruleIndex == 45)
        {
            params.push(child.children[0].children[0].children[0].symbol.text);
        }
    }
    return params;
}
else return null;

}

class SemanticDefinition
{
    constructor(paramList, localCode, definitionType) {
        this.paramList = paramList;
        this.localCode = localCode;
        this.definitionType = definitionType;
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