export default function VisitRules(tree, depth = 0, func_num = -1, prev = -1, l = [])
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