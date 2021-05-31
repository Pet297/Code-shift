import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import testVisitor from './testVisitor.js';
import {TransformRulesF, TranslateRule} from './testVisitor.js';
import fs from 'fs';
import { Console } from 'console';

const input = fs.readFileSync('./test1b').toString()

const chars = new antlr4.InputStream(input);
const lexer = new JavaScriptLexer(chars);
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new JavaScriptParser(tokens);
parser.buildParseTrees = true;
const tree = parser.program();

//testVisitor(tree,0);

let l = TranslateRule(tree);
console.log(l);

