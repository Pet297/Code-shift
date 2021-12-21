import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import fs from 'fs';
import testVisitor from './ruleTranslator.js';
import TranslateRule from './ruleTranslator.js';
import FindCodeChanges from './distance.js'
import {ListOfChanges} from './distance.js'
import { Console, debug } from 'console';
import { AddText } from './statementPosition.js'
import { GetAnimationSequence } from './animationSequence.js'
import { IntermediateTextEnumerator, CollapseIntermediateText } from './frameDescriptor.js'
import { WriteMovingAnimationFile, WriteAddingAnimationFile, WriteDeletingAnimationFile, WriteGifFile } from './gifWriter.js'

const input = fs.readFileSync('./test3a').toString()

const chars = new antlr4.InputStream(input);
const lexer = new JavaScriptLexer(chars);
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new JavaScriptParser(tokens);
parser.buildParseTrees = true;
const tree = parser.program();

testVisitor(tree,0);

let l = TranslateRule(tree);

const input1 = fs.readFileSync('./test3b').toString()

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

var gifnumber = 0;
while (true)
{
    var text = resenum.GetNextStillText();
    if (text === undefined) break;
    else {
        text = CollapseIntermediateText(text);

        console.log(text[0]);
        console.log(text[1]);
        console.log(text[2]);
        console.log(text[3]);
        console.log(text[4]);

        if (text[0]=='^')
        {
            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteMovingAnimationFile(
                        text[1],
                        text[3],
                        text[4],
                        text[2],
                        i/19.0,
                        '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                        resolve)
                );
                promises.push(promise);
                gifnumber++;
            }
            await Promise.all(promises);
        }

        if (text[0]=='+')
        {
            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteAddingAnimationFile(
                        text[1],
                        text[3],
                        text[4],
                        text[2],
                        i/19.0,
                        '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                        resolve)
                );
                promises.push(promise);
                gifnumber++;
            }
            await Promise.all(promises);
        }

        if (text[0]=='x')
        {
            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteDeletingAnimationFile(
                        text[1],
                        text[3],
                        text[4],
                        text[2],
                        i/19.0,
                        '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                        resolve)
                );
                promises.push(promise);
                gifnumber++;
            }
            await Promise.all(promises);
        }
    }

}

let promise = new Promise(
    resolve => WriteGifFile('.output/frame*.gif', '.output/result.gif', resolve)
    )
await promise;
