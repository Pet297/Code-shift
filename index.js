import fs from 'fs';
import path from 'path';
import { FindCodeChanges, SupplyCodeChanges } from './distance.js';
import { GetAnimationSequence } from './animationSequence.js';
import { IntermediateTextEnumerator } from './animationEnumerator.js';
import { GIFWriter } from './gifWriter.js';
import { ListOfChangesToFile, FileToListOfChanges } from './intermediateOutput.js';
import { TranslateFileDefault, TranslateFileByLanguage } from './languageDefinitions.js';

async function DoGifOutput2(resenum, output, resolve) {    
    var gw = new GIFWriter();

    var promise1 = new Promise( resolve => gw.Begin(output, resolve));
    await promise1;

    for (var anim of resenum.EnumerateStillTexts()) {
        var promise2 = new Promise( resolve => gw.ApplyAnimation(anim, resolve));
        await promise2;
    }
    var promise3 = new Promise( resolve => gw.End(resolve));
    await promise3;

    resolve();
}

// Find differences between two source codes,
//  output lists of changes to a file.
async function MidOutputExecutionSingle(code1, code2, output, language, resolve) {

    var root1 = undefined;
    var root2 = undefined;

    if (language === undefined) {
        root1 = TranslateFileDefault(code1);
        root2 = TranslateFileDefault(code2);
    }
    else {
        root1 = TranslateFileByLanguage(code1, language);
        root2 = TranslateFileByLanguage(code2, language);
    }

    var result = FindCodeChanges([root1], [root2]);
    ListOfChangesToFile(result.inputDestinations, result.outputSources, output, resolve);
}
// Find differences between two source codes,
//  output resulting animation to a GIF.
//  The list of changes is given.
async function MidInputExecutionSingle(code1, code2, changes12, output, language, resolve) {

    //TODO:
    var root1 = undefined;
    var root2 = undefined;

    if (language === undefined) {
        root1 = TranslateFileDefault(code1);
        root2 = TranslateFileDefault(code2);
    }
    else {
        root1 = TranslateFileByLanguage(code1, language);
        root2 = TranslateFileByLanguage(code2, language);
    }

    var changeObject = FileToListOfChanges(changes12);

    var result = SupplyCodeChanges([root1], [root2], changeObject.src, changeObject.dst);
    var result2 = GetAnimationSequence(result.inputDestinations, result.outputSources, result.renames);

    var resenum = new IntermediateTextEnumerator(result.inputDestinations, result.outputSources, result2);
    var promise = new Promise(
        resolve => DoGifOutput2(resenum, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
}

async function FullExecutionSingle(code1, code2, output, language, resolve) { 

    var root1 = undefined;
    var root2 = undefined;

    try
    {
        if (language === undefined) {
            root1 = TranslateFileDefault(code1);
            root2 = TranslateFileDefault(code2);
        }
        else {
            root1 = TranslateFileByLanguage(code1, language);
            root2 = TranslateFileByLanguage(code2, language);
        }
    }
    catch
    {
    }

    // Find changes and generate animation sequence
    var result = FindCodeChanges([root1], [root2]);
    var result2 = GetAnimationSequence(result.inputDestinations, result.outputSources, result.renames);
    // Define animation enumerator
    var resenum = new IntermediateTextEnumerator(result.inputDestinations, result.outputSources, result2);
    // Gif genereation
    var promise = new Promise(
        resolve => DoGifOutput2(resenum, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
    
}

// Does full execution on multiple files
async function FullExecutionMulti(codeFiles, outputFiles, language, resolve) {
    for (var i = 0; i < codeFiles.length - 1; i++) {
        var promise = new Promise(
            resolve0 => FullExecutionSingle(codeFiles[i], codeFiles[i+1], outputFiles[i], language, resolve0)
            );
        await promise;
    }
    if (i == codeFiles.length - 2) promise.then(()=>resolve());
}

//TODO: 1-to-N

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
        //'./tests/test_C3_0', './tests/test_C3_1', '../C3',
        './tests/test_D3_0', './tests/test_D3_1', '../D3',
        //'./tests/test_A1_0', './tests/test_A1_1', '../A1',
        //'./tests/test_A2_0', './tests/test_A2_1', '../A2',
        //'./tests/test_G1_0', './tests/test_G1_1', '../G1',
        //'./tests/test_F4_0', './tests/test_F4_1', '../F4',
        //'./tests/test_F5_0', './tests/test_F5_1', '../F5',
        //'./tests/test_F6_0', './tests/test_F6_1', '../F6',

    ]
    const fullExecution = true;
    const intermediateFileGen = false;
    const supplyChangesExecution = false;

    for (var i = 0; i < tests.length; i+=3) {
        if (fullExecution) {
            var promise = new Promise(
                resolve => FullExecutionSingle(tests[i+0], tests[i+1], tests[i+2] + '.gif', "JS", resolve)
                );
            await promise;
        }
        if (intermediateFileGen) {
            var promise = new Promise(
                resolve => MidOutputExecutionSingle(tests[i+0], tests[i+1], tests[i+2] + '.xml', "JS", resolve)
                );
            await promise;
        }
        if (supplyChangesExecution) {
            var promise = new Promise(
                resolve => MidInputExecutionSingle(tests[i+0], tests[i+1], tests[i+2] + '.xml', tests[i+2] + '.gif', "JS", resolve)
                );
            await promise;
        }
    }
}

async function SimpleTest4(id) {
    let root1 = TranslateFileByLanguage('./tests/test_T' + id, 'JS');
    console.log(root1);
}

async function SimpleTest(file) {
    let root1 = TranslateFileByLanguage(file, 'JS');
    console.log(root1);
}

const recognizedFlags = ['-i', '-o', '-c', '-l', '-n', '-f', '-h', '-t']
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
    var language = undefined;
    var showHelp = false;
    var intermediateFilesUsed = false;
    var testTranslation = false;

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
                    if (process.argv[i] == '-t')
                    {
                        testTranslation = true;
                        inputFiles.push(process.argv[i+1]);
                    }
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
    if (testTranslation) {
        SimpleTest(inputFiles[0]);
    }
    else {
        //TODO: Intermediate file
        const N = inputFiles.length - 1;
        for (var i = 0; i < N; i++) {
            var promise = new Promise(
                resolve => FullExecutionMulti(inputFiles, outputFiles, language, resolve)
                );
            await promise;
        }
    }
}

//RunTests();
UserInput();
