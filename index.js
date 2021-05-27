import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import testVisitor from './testVisitor.js';
import {TransformRulesF} from './testVisitor.js';
import fs from 'fs';

const input = fs.readFileSync('./test1a').toString()

const chars = new antlr4.InputStream(input);
const lexer = new JavaScriptLexer(chars);
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new JavaScriptParser(tokens);
parser.buildParseTrees = true;
const tree = parser.program();


let l = [];
testVisitor(tree,0,-1,-1,l);
console.log(l);
let l2 = TransformRulesF(l);
console.log(l2);

