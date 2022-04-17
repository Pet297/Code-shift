import { FindCodeChanges, SupplyCodeChanges } from './distance.js';
import { GetAnimationSequence } from './animationSequence.js';
import { IntermediateTextEnumerator } from './animationEnumerator.js';
import { GIFWriter } from './gifWriter.js';
import { ListOfChangesToFile, FileToListOfChanges } from './intermediateOutput.js';
import { TranslateFileDefault, TranslateFileByLanguage } from './languageDefinitions.js';

async function DoGifOutput(resenum, output, resolve) {    
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

// Finds differences between two source codes,
//  outputs lists of changes to a file.
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
    var promise = new Promise(
        resolve => ListOfChangesToFile(result.inputDestinations, result.outputSources, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
}
// Finds differences between two source codes,
//  outputs resulting animation to a GIF.
//  The list of changes is given.
async function MidInputExecutionSingle(code1, code2, changes12, output, language, resolve) {
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
        resolve => DoGifOutput(resenum, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
}

// Finds differences between two source codes,
//  outputs resulting animation to a GIF.
//  The list of changes is found automatically.
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
        resolve => DoGifOutput(resenum, output, resolve)
        );
    promise.then(()=>resolve());
    await promise;
    
}

// Does 1st part of partial execution on multiple files
async function MidOutputExecutionMulti(codeFiles, outputFiles, language, resolve) {
    for (var i = 0; i < codeFiles.length - 1; i++) {
        var promise = new Promise(
            resolve0 => MidOutputExecutionSingle(codeFiles[i], codeFiles[i+1], outputFiles[i], language, resolve0)
            );
        if (i == codeFiles.length - 2) promise.then(()=>resolve());
        await promise;
    }
}

// Does 2nd part of partial execution on multiple files
async function MidInputExecutionMulti(codeFiles, changeFiles, outputFiles, language, resolve) {
    for (var i = 0; i < codeFiles.length - 1; i++) {
        var promise = new Promise(
            resolve0 => MidInputExecutionSingle(codeFiles[i], codeFiles[i+1], changeFiles[i], outputFiles[i], language, resolve0)
            );
        if (i == codeFiles.length - 2) promise.then(()=>resolve());
        await promise;
    }
}

// Does full execution on multiple files
async function FullExecutionMulti(codeFiles, outputFiles, language, resolve) {
    for (var i = 0; i < codeFiles.length - 1; i++) {
        var promise = new Promise(
            resolve0 => FullExecutionSingle(codeFiles[i], codeFiles[i+1], outputFiles[i], language, resolve0)
            );
        if (i == codeFiles.length - 2) promise.then(()=>resolve());
        await promise;
    }
}

//TODO: 1-to-N
//TODO: otestovat 1. a 2. exekuci
//TODO: test vyberu jazyka

async function SimpleTest(file, language, resolve) {
    var root = TranslateFileByLanguage(file, language);
    console.log(root);
    resolve();
}

const recognizedFlags = ['-i', '-o', '-c', '-l', '-f', '-h', '-t']
function IsRecognizedFlag(flag)
{
    for (var flag0 of recognizedFlags) {
        if (flag == flag0) return true;
    }
    return false;
}

function ShowHelp() {
    console.log("Code shift pre-release v0.6.1");
    console.log("Tool for automatic comparison of different versions of source code");
    console.log("and generating animation of its supposed intermediate states.");
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
    console.log("-f                : Generate XML file with changes instead of GIF");
    console.log("-h                : Show this help");
    console.log("-t                : Do translation test");
    console.log("---------------------------");
    console.log("Basic usage:");
    console.log("> Regular full exection - input: source codes, output: GIF");
    console.log("  -i [old source code] -i [new source code] -o [GIF filename]");
    console.log("> Partial exection - input: source codes, output: XML list of changes");
    console.log("  -f -i [old source code] -i [new source code] -o [XML filename]");
    console.log("> Partial exection - input: source codes and XML list of changes, output: GIF");
    console.log("  -i [old source code] -i [new source code] -c [XML filename] -o [GIF filename]");
    console.log("> For debuging - tests whether a file translates to simple representation.");
    console.log("-t [source code]");
    console.log("---------------------------");
    console.log("Notes:");
    console.log("-The number of input files must be 1 more than the number of output files.");
    console.log("-If lists of XML files with changes are present,");
    console.log("  there must be as much of them as output files.");
    console.log("-If flag -f is present, output files are XML files with list of changes.");
    console.log("-If no language option is specified,");
    console.log("  it is assumed based on filename of 1st input file.");
}

async function UserInput(args, resolve) {

    var outputIntermediateFile = false;
    var inputFiles = [];
    var outputFiles = [];
    var intermediateFiles = [];
    var language = undefined;
    var showHelp = false;
    var intermediateFilesUsed = false;
    var testTranslation = false;

    // 1) Parse CMD arguments
    for(var i = 2; i < args.length; i++) {

        // Expected flag
        if (IsRecognizedFlag(args[i])) {

            // No-param flags
            if (args[i] == '-h') showHelp = true;
            else if (args[i] == '-f') outputIntermediateFile = true;

            // Single-param flags
            else {

                // Next argument is param for the flag
                if (i + 1 < args.length) {
                    if (args[i] == '-i') inputFiles.push(args[i+1]);
                    if (args[i] == '-o') outputFiles.push(args[i+1]);
                    if (args[i] == '-c') intermediateFiles.push(args[i+1]);
                    if (args[i] == '-t')
                    {
                        testTranslation = true;
                        inputFiles.push(args[i+1]);
                    }
                    if (args[i] == '-l') language = args[i+1];
                    i++;
                }

                // There is no next argument
                else {
                    console.error('ERROR: Expected a parameter after flag ' + args[i] + '.');
                    return;
                }
            }
        }

        // Unrecognized flag
        else {
            if (args[i].startsWith('-')) console.error('ERROR: Flag ' + args[i] + ' is not recognized.');
            else console.error('ERROR: Next Argument was expected to be a flag, not \"' + args[i] + '\".');
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
    if (intermediateFilesUsed && outputIntermediateFile) {
        console.error('ERROR: Two execution modes specified at once.');
        return;
    }

    // 4) Execute based on settings:
    // 4A) translation test
    if (testTranslation) {
        var promise = new Promise(
            resolve0 => SimpleTest(inputFiles[0], language, resolve0)
            );
        promise.then(() => (resolve()));    
        await promise; 
    }
    // 4B) intermediate input
    else if (intermediateFilesUsed) {
        var promise = new Promise(
            resolve0 => MidInputExecutionMulti(inputFiles, intermediateFiles, outputFiles, language, resolve0)
            );
        promise.then(() => (resolve()));    
        await promise;    
    }
    // 4C) intermediate output
    else if (outputIntermediateFile) {
        var promise = new Promise(
            resolve0 => MidOutputExecutionMulti(inputFiles, outputFiles, language, resolve0)
            );
        promise.then(() => (resolve()));    
        await promise; 
    }
    // 4D) regular execution
    else {
        var promise = new Promise(
            resolve0 => FullExecutionMulti(inputFiles, outputFiles, language, resolve0)
            );
        promise.then(() => (resolve()));    
        await promise; 
    }
}

// Testing:
// var testId = 'D3';
// UserInput([undefined, undefined, '-l', 'JS', '-i', './tests/test_' + testId + '_0', '-i', './tests/test_' + testId + '_1', '-o', '../' + testId + '.gif'], ()=>{});
// UserInput([undefined, undefined, '-l', 'JS', '-f', '-i', './tests/test_' + testId + '_0', '-i', './tests/test_' + testId + '_1', '-o', '../' + testId + '.xml'], ()=>{});
// UserInput([undefined, undefined, '-l', 'JS', '-i', './tests/test_' + testId + '_0', '-i', './tests/test_' + testId + '_1', '-c', '../' + testId + '.xml', '-o', '../' + testId + '.gif'], ()=>{});
// UserInput(['-l', 'JS', '-t', './tests/test_' + testId + '_0', ()=>{});

// Runs the program:
UserInput(process.argv, ()=>{});
