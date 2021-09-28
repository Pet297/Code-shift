import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import testVisitor from './testVisitor.js';
import TranslateRule from './testVisitor.js';
import fs from 'fs';
import FindCodeChanges from './distance.js'
import {ListOfChanges} from './distance.js'
import { Console } from 'console';

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

console.log(l);
console.log(l1);

var result = FindCodeChanges([l], [l1]);
console.log("");
