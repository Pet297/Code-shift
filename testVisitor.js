export default function VisitRules(tree, depth = 0, func_num = -1, prev = -1)
{
    if (typeof tree.children === 'undefined')
    {
        //console.log("#" + tree.symbol.type + " - " + tree.symbol.text + " - Rule " + prev);
        if (tree.symbol.type == 117) console.log("[" + prev + "] " + tree.symbol.text);
    }
    else
    {
        tree.children.forEach(element => {VisitRules(element, depth + 1, tree.ruleIndex, func_num);});
    }
}
    
function VisitRules0(tree, depth)
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