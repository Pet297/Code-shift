import antlr4 from 'antlr4';
import JavaScriptLexer from './grammars/JavaScriptLexer.js';
import JavaScriptParser from './grammars/JavaScriptParser.js';
import fs from 'fs';
import path from 'path';
import testVisitor from './ruleTranslator.js';
import TranslateRule from './ruleTranslator.js';
import FindCodeChanges from './distance.js'
import { AddText } from './statementPosition.js'
import { GetAnimationSequence } from './animationSequence.js'
import { IntermediateTextEnumerator, CollapseIntermediateText } from './frameDescriptor.js'
import { WriteStationaryAnimationFile, WriteMovingAnimationFile, WriteAddingAnimationFile, WriteDeletingAnimationFile, WriteChangingAnimationFile, WriteGifFile } from './gifWriter.js'
import { debug } from 'console';

function CallbackMove(callback)
{
    //TODO
}

function CallbackRemove(callback)
{
    //TODO
}

async function Exec1F(code1, code2, output, resolve) {
    const input = fs.readFileSync(code1).toString()

    const chars = new antlr4.InputStream(input);
    const lexer = new JavaScriptLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new JavaScriptParser(tokens);
    parser.buildParseTrees = true;
    const tree = parser.program();

    testVisitor(tree,0);

    let l = TranslateRule(tree);

    const input1 = fs.readFileSync(code2).toString()

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

    var result = FindCodeChanges([l], [l1], tree.start.source[1].strdata, tree1.start.source[1].strdata);
    var result2 = GetAnimationSequence(result.inputDestinations, result.outputSources);

    var resenum = new IntermediateTextEnumerator(result.inputDestinations, result.outputSources, result2);

    var gifnumber = 0;
    var prevText;
    var text;
    while (true) {
        prevText = text;
        text = resenum.GetNextStillText();
        if (text === undefined) break;
        else {
            text = CollapseIntermediateText(text);

            if (text[0]=='^' && text[3] != '')
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

            if (text[0]=='+' && text[2] != '')
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

            if (text[0]=='x' && text[2] != '')
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

            if (text[0]=='*' && text[5])
            {
                var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteChangingAnimationFile(
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

    var promises = [];
                for (var i=0; i<20; i++)
                {
                    let promise = new Promise(
                        resolve => WriteStationaryAnimationFile(
                            prevText[1] + prevText[3] + prevText[4] + prevText[2],
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

async function RunTests() {

    const tests = [
        './tests/test_F1_0', './tests/test_F1_1', '../F1.gif',
        './tests/test_F2_0', './tests/test_F2_1', '../F2.gif',
        './tests/test_F3_0', './tests/test_F3_1', '../F3.gif',
        './tests/test_C1_0', './tests/test_C1_1', '../C1.gif',
        './tests/test_C2_0', './tests/test_C2_1', '../C2.gif', 
    ]

    for (var i = 0; i < tests.length; i+=3) {
        var promise = new Promise(
            resolve => Exec1F(tests[i+0], tests[i+1], tests[i+2], resolve)
            );
        await promise;
    }
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
    console.log("Code shift pre-release v0.3");
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

RunTests();
//UserInput();
