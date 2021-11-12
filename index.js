import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import testVisitor from './ruleTranslator.js';
import TranslateRule from './ruleTranslator.js';
import fs from 'fs';
import FindCodeChanges from './distance.js'
import {ListOfChanges} from './distance.js'
import { Console } from 'console';
import { AddText } from './statementPosition.js'
import { GetAnimationSequence } from './animationSequence.js'
import { EnumerateStillTexts } from './frameDescriptor.js'

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
console.log(EnumerateStillTexts(result.inputDestinations, result.outputSources, result2));
