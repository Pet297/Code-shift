import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import fs from 'fs';
import testVisitor from './ruleTranslator.js';
import TranslateRule from './ruleTranslator.js';
import FindCodeChanges from './distance.js'
import {ListOfChanges} from './distance.js'
import { Console } from 'console';
import { AddText } from './statementPosition.js'
import { GetAnimationSequence } from './animationSequence.js'
import { IntermediateTextEnumerator } from './frameDescriptor.js'
import { WriteMovingAnimationFile, WriteGifFile } from './gifWriter.js'

const input = fs.readFileSync('./test2a').toString()

const chars = new antlr4.InputStream(input);
const lexer = new JavaScriptLexer(chars);
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new JavaScriptParser(tokens);
parser.buildParseTrees = true;
const tree = parser.program();

testVisitor(tree,0);

let l = TranslateRule(tree);

const input1 = fs.readFileSync('./test2b').toString()

const chars1 = new antlr4.InputStream(input1);
const lexer1 = new JavaScriptLexer(chars1);
const tokens1 = new antlr4.CommonTokenStream(lexer1);
const parser1 = new JavaScriptParser(tokens1);
parser1.buildParseTrees = true;
const tree1 = parser1.program();

testVisitor(tree1,0);

let l1 = TranslateRule(tree1);

AddText(l, tree.start.source[1].strdata);
AddText(l1, tree1.start.source[1].strdata);

console.log(l);
console.log(l1);

var result = FindCodeChanges([l], [l1], tree.start.source[1].strdata, tree1.start.source[1].strdata);
var result2 = GetAnimationSequence(result.inputDestinations, result.outputSources);

var resenum = new IntermediateTextEnumerator(result.inputDestinations, result.outputSources, result2);

while (true)
{
    var text = resenum.GetNextStillText();
    if (text === undefined) break;
    else {
        console.log(text);
        console.log('###########');
    }
}

for (var i = 0; i < 40; i++)
{
    WriteMovingAnimationFile(
        'var a = 0;\r\n',
        'function A(d,e) {\r\n    d = e + e;\r\n    return d + e;\r\n}\r\n',
        'c = a;\r\nd = 0;\r\nc = a + b;\r\nd = c + d;\r\nreturn a + b;\r\n',
        'var b = 0;\r\n',
        i/39.0,
        '.output\\frame' + (i+1001).toString() + '.gif'
    );
}
WriteGifFile('.output/frame*.gif', '.output/result.gif')
