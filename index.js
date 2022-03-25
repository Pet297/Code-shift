import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import fs from 'fs';
import path from 'path';
import testVisitor from './ruleTranslator.js';
import TranslateRule from './ruleTranslator.js';
import { FindCodeChanges, SupplyCodeChanges } from './distance.js'
import { AddText } from './statementPosition.js'
import { GetAnimationSequence } from './animationSequence.js'
import { IntermediateTextEnumerator, CollapseIntermediateText } from './animationEnumerator.js'
import { WriteGifFile, WriteGifFileSH, WriteGifFileSHTransform, WriteGifFileSHAdd, WriteGifFileSHMoveUp, WriteGifFileSHRemove } from './gifWriter.js'
import { ListOfChangesToFile, FileToListOfChanges } from './intermediateOutput.js';
import { LevenChanges } from './levenAnimator.js';
import RenmameVariable from './variableRenamer.js';
import { checkTokensEqual } from './distance.js';

function CallbackMove(callback)
{
    //TODO
}

function CallbackRemove(callback)
{
    //TODO
}

function CodeToTree(codeFile) {
    const input = fs.readFileSync(codeFile).toString()

    const chars = new antlr4.InputStream(input);
    const lexer = new JavaScriptLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new JavaScriptParser(tokens);
    parser.buildParseTrees = true;
    const tree = parser.program();

    testVisitor(tree,0);

    return tree;
}

async function DoGifOutput2(resenum, output, resolve) {
    var gifnumber = 0;
    var prevText;
    var text;
    while (true) {
        prevText = text;
        text = resenum.GetNextStillText();
        if (text === undefined) break;
        else {
            text = CollapseIntermediateText(text);

            if (text[0]=='^' && text[3].length > 0)
            {
                var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteGifFileSHMoveUp(
                            text[1],
                            text[2],
                            text[3],
                            text[4],
                            i/19.0,
                            '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                            resolve)
                    );
                    promises.push(promise);
                    gifnumber++;
                }
                await Promise.all(promises);
            }

            if (text[0]=='+' && text[2].length > 0)
            {
                var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteGifFileSHAdd(
                            text[1],
                            text[2],
                            text[3].concat(text[4]),
                            i/19.0,
                            '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                            resolve)
                    );
                    promises.push(promise);
                    gifnumber++;
                }
                await Promise.all(promises);
            }

            if (text[0]=='x' && text[2].length > 0)
            {
                var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteGifFileSHRemove(
                            text[3],
                            text[2],
                            text[4],
                            i/19.0,
                            '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                            resolve)
                    );
                    promises.push(promise);
                    gifnumber++;
                }
                await Promise.all(promises);
            }

            if (text[0]=='*' && (!checkTokensEqual(text[2], text[4]))) {
                var tokenList = [];

                tokenList = tokenList.concat(text[1]);
                tokenList.push([text[4],text[2]]);
                tokenList = tokenList.concat(text[3]);

                var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteGifFileSHTransform(
                        tokenList,
                        i/19.0,
                        '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                        resolve)
                    );
                    promises.push(promise);
                    gifnumber++;
                }
                await Promise.all(promises);
            }

            if (text[0]=='R' && text[5] !== undefined)
            {
                var tokenList = [];

                tokenList = tokenList.concat(text[1]);
                for (var token of text[3]) {
                    if (token.isIdentifier && token.text == text[5][0]) {
                        var ti2 = token.Clone();
                        ti2.text = text[5][1];
                        tokenList.push([
                            [ti2],
                            [token]              
                        ]);
                    }
                    else tokenList.push(token);
                }

                var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteGifFileSHTransform(
                        tokenList,
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

    var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteGifFileSH(
                            prevText[1].concat(prevText[3], prevText[4], prevText[2]),
                            '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                            resolve)
                    );
                    promises.push(promise);
                    gifnumber++;
                }
                await Promise.all(promises);

    let promise = new Promise(
        resolve => WriteGifFile('.output/frame*.gif', '.output/result.gif', resolve)
        )
    await promise;

    //delete individual frames
    for (var i=0; i < gifnumber;i++) {
        var framePath = path.join(".", ".output", "frame"+ (i+1001).toString() +".gif");
        fs.unlink(framePath, CallbackRemove);
    }

    //move result
    const outputPath = path.join(".", ".output", "result.gif");
    fs.rename(outputPath, output, CallbackMove);

    resolve();
}

// Find differences between two source codes,
//  output lists of changes to a file.
async function Exec1N(code1, code2, output, resolve) {

    const tree1 = CodeToTree(code1);
    let root1 = TranslateRule(tree1);
    const tree2 = CodeToTree(code2);
    let root2 = TranslateRule(tree2);
    AddText(root1, tree1.start.source[1].strdata);
    AddText(root2, tree2.start.source[1].strdata);

    var result = FindCodeChanges([root1], [root2], tree1.start.source[1].strdata, tree2.start.source[1].strdata);
    ListOfChangesToFile(result.inputDestinations, result.outputSources, result.renames, output, resolve)
}

// Find differences between two source codes,
//  output resulting animation to a GIF.
//  The list of changes is given.
async function Exec1M(code1, code2, changes12, output, resolve) {

    const tree1 = CodeToTree(code1);
    let root1 = TranslateRule(tree1);
    const tree2 = CodeToTree(code2);
    let root2 = TranslateRule(tree2);
    AddText(root1, tree1.start.source[1].strdata);
    AddText(root2, tree2.start.source[1].strdata);

    var changes = FileToListOfChanges(changes12);
    var result = SupplyCodeChanges([root1], [root2], changes.renames, changes.src, changes.dst);
    var result2 = GetAnimationSequence(result.inputDestinations, result.outputSources);

    var resenum = new IntermediateTextEnumerator(result.inputDestinations, result.outputSources, result2);
    var promise = new Promise(
        resolve => DoGifOutput2(resenum, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
}

// Find differences between two source codes,
//  output resulting animation to a GIF.
//  The list of changes is automatically generated.
async function Exec1F(code1, code2, output, resolve) { 

    const tree1 = CodeToTree(code1);
    let root1 = TranslateRule(tree1);
    const tree2 = CodeToTree(code2);
    let root2 = TranslateRule(tree2);
    AddText(root1, tree1.start.source[1].strdata);
    AddText(root2, tree2.start.source[1].strdata);

    var result = FindCodeChanges([root1], [root2], tree1.start.source[1].strdata, tree2.start.source[1].strdata);
    var result2 = GetAnimationSequence(result.inputDestinations, result.outputSources);

    var resenum = new IntermediateTextEnumerator(result.inputDestinations, result.outputSources, result2);
    var promise = new Promise(
        resolve => DoGifOutput2(resenum, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
}

// New version for testing.
async function Exec1F2(code1, code2, output, resolve) { 

    const tree1 = CodeToTree(code1);
    let root1 = TranslateRule(tree1);
    const tree2 = CodeToTree(code2);
    let root2 = TranslateRule(tree2);

    var result = FindCodeChanges([root1], [root2], tree1.start.source[1].strdata, tree2.start.source[1].strdata);
    var result2 = GetAnimationSequence(result.inputDestinations, result.outputSources, result.renames);

    var resenum = new IntermediateTextEnumerator(result.inputDestinations, result.outputSources, result2);
    var promise = new Promise(
        resolve => DoGifOutput2(resenum, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
}

async function RunTests() {

    const tests = [
        // OLD TESTS:
        //'./tests/test_F1_0', './tests/test_F1_1', '../F1',
        //'./tests/test_F2_0', './tests/test_F2_1', '../F2',
        //'./tests/test_F3_0', './tests/test_F3_1', '../F3',
        //'./tests/test_C1_0', './tests/test_C1_1', '../C1',
        //'./tests/test_C2_0', './tests/test_C2_1', '../C2',
        //'./tests/test_D1_0', './tests/test_D1_1', '../D1',
        //'./tests/test_D2_0', './tests/test_D2_1', '../D2',

        // NEW TESTS:

    ]
    const fullExecution = true;
    const intermediateFileGen = false;
    const supplyChangesExecution = false;

    for (var i = 0; i < tests.length; i+=3) {
        if (fullExecution) {
            var promise = new Promise(
                resolve => Exec1F2(tests[i+0], tests[i+1], tests[i+2] + '.gif', resolve)
                );
            await promise;
        }
        if (intermediateFileGen) {
            var promise = new Promise(
                resolve => Exec1N(tests[i+0], tests[i+1], tests[i+2] + '.xml', resolve)
                );
            await promise;
        }
        if (supplyChangesExecution) {
            var promise = new Promise(
                resolve => Exec1M(tests[i+0], tests[i+1], tests[i+2] + '.xml', tests[i+2] + '.gif', resolve)
                );
            await promise;
        }
    }
}

async function SimpleTest() {
    var promises = [];
    var gifnumber = 0;
    for (var i=0; i<20; i++)
    {
        let promise = new Promise(
            resolve => WriteChangingAnimationFile(
                "Text 1\r\nText 2\r\n",
                "Text 3\r\nText 4\r\n",
                "Nunc mi ipsum faucibus vitae\r\n",
                "Lorem ipsum dolor sit amet\r\nLorem ipsum\r\n",
                i/19.0,
                '.output\\frame' + (gifnumber+1001).toString() + '.gif',
                resolve)
        );
        promises.push(promise);
        gifnumber++;
    }
    await Promise.all(promises);
    
    let promise = new Promise(
        resolve => WriteGifFile('.output/frame*.gif', '.output/result.gif', resolve)
        )
    await promise;

    //delete individual frames
    for (var i=0; i < gifnumber;i++) {
        var framePath = path.join(".", ".output", "frame"+ (i+1001).toString() +".gif");
        fs.unlink(framePath, CallbackRemove);
    }

    //move result
    const outputPath = path.join(".", ".output", "result.gif");
    fs.rename(outputPath, '../TT.gif', CallbackMove);
}

async function SimpleTest2() {
    const tree1 = CodeToTree('./tests/test_D1_0');
    const tree2 = CodeToTree('./tests/test_D1_1');
    let root1 = TranslateRule(tree1);
    let root2 = TranslateRule(tree2);
    AddText(root1, tree1.start.source[1].strdata);
    AddText(root2, tree2.start.source[1].strdata);

    RenmameVariable(root1.localCode, 'c', 'b');
}

async function SimpleTest3() {
    const tree1 = CodeToTree('./tests/test_D1_0');
    let root1 = TranslateRule(tree1);
    console.log(root1);

    let promise = new Promise(
        resolve => WriteGifFileSH(
            root1.tokens,
            '..\\test.gif',
            resolve)
    );

    await promise;
}

async function SimpleTest4(id) {
    const tree1 = CodeToTree('./tests/test_T' + id);
    let root1 = TranslateRule(tree1);
    console.log(root1);
}

const recognizedFlags = ['-i', '-o', '-c', '-l', '-n', '-f', '-h']
function IsRecognizedFlag(flag)
{
    for (var flag0 of recognizedFlags) {
        if (flag == flag0) return true;
    }
    return false;
}

function ShowHelp() {
    console.log("Code shift pre-release v0.4");
    console.log("Tool for automatic comparison of different varisons of source code");
    console.log("and generating animation of its possible intermediate states.");
    console.log("---------------------------");
    console.log("Author: Petr Martinek");
    console.log("Licence: ISC");
    console.log("---------------------------");
    console.log("Command line arguments:");
    console.log("");
    console.log("-i <filename>     : Input file with source code");
    console.log("-o <filename>     : Output file for GIF animation");
    console.log("-c <filename>     : Input file with manual list of changes");
    console.log("-l <language name>: Language of the source code");
    console.log("-n                : Do not generate GIF");
    console.log("-f                : Generate XML file with changes instead of GIF");
    console.log("-h                : Show this help");
    console.log("---------------------------");
    console.log("Basic usage:");
    console.log("-i [old source code] -i [new source code] -o [GIF filename]");
    console.log("---------------------------");
    console.log("Notes:");
    console.log("-The number of input files must be 1 more than the number of output files.");
    console.log("-If lists of animations are present,");
    console.log(" there must be as much of them as output files.");
    console.log("-If flag -f is present, output files are XML files.");
    console.log("-If no language option is specified,");
    console.log(" it is assumed based on filename of 1st input file.");
}

async function UserInput() {
    console.log(process.argv);

    var outputGif = true;
    var outputIntermediateFile = false;
    var inputFiles = [];
    var outputFiles = [];
    var intermediateFiles = [];
    var language = 'JS'; //TODO[15]: JS-independent
    var showHelp = false;
    var intermediateFilesUsed = false;

    // 1) Parse CMD arguments
    for(var i = 2; i < process.argv.length; i++) {

        // Expected flag
        if (IsRecognizedFlag(process.argv[i])) {

            // No-param flags
            if (process.argv[i] == '-h') showHelp = true;
            else if (process.argv[i] == '-n') outputGif = false;
            else if (process.argv[i] == '-f') outputIntermediateFile = true;

            // Single-param flags
            else {

                // Next argument is param for the flag
                if (i + 1 < process.argv.length) {
                    if (process.argv[i] == '-i') inputFiles.push(process.argv[i+1]);
                    if (process.argv[i] == '-o') outputFiles.push(process.argv[i+1]);
                    if (process.argv[i] == '-c') intermediateFiles.push(process.argv[i+1]);
                    if (process.argv[i] == '-l') language = process.argv[i+1];
                    i++;
                }

                // There is no next argument
                else {
                    console.error('ERROR: Expected a parameter after flag ' + process.argv[i] + '.');
                    return;
                }
            }
        }

        // Unrecognized flag
        else {
            if (process.argv[i].startsWith('-')) console.error('ERROR: Flag ' + process.argv[i] + ' is not recognized.');
            else console.error('ERROR: Next Argument was expected to be a flag, not \"' + process.argv[i] + '\".');
            return;
        }
    }

    // 2) Show help, if instructed:
    if (showHelp || inputFiles.length == 0) {
        ShowHelp();
        return;
    }

    // 3) Check logical correctness:
    if (intermediateFiles.length > 0) intermediateFilesUsed = true;
    if (intermediateFilesUsed && (inputFiles.length != intermediateFiles.length + 1))
    {
        console.error('ERROR: The difference of input and intermediate files specified wasn\'t 1.');
        return;
    }
    if (inputFiles.length != outputFiles.length + 1)
    {
        console.error('ERROR: The difference of input and output files specified wasn\'t 1.');
        return;
    }

    // 4) Execute based on settings:
    //TODO[15]: JS-independent
    //TODO[07]: Intermediate file
    const N = inputFiles.length - 1;
    for (var i = 0; i < N; i++) {
        var promise = new Promise(
            resolve => Exec1F(inputFiles[i], inputFiles[i+1], outputFiles[i], resolve)
            );
        await promise;
    }
}

//FIX
//SimpleTest4('20');
//SimpleTest4('21');
//SimpleTest4('27');
//SimpleTest4('28');
//SimpleTest4('42');
//SimpleTest4('57');

//RunTests();
UserInput();
