import { FindCodeChanges, SupplyCodeChanges } from './distance.js';
import { GetAnimationSequence } from './animationSequence.js';
import { AnimationEnumerator } from './animationEnumerator.js';
import { GIFWriter } from './gifWriter.js';
import { ListOfChangesToFile, FileToListOfChanges } from './intermediateOutput.js';
import { TranslateFileByLanguage } from './languageDefinitions.js';

/**
 * Writes a GIF animation showing edits on a code, given an animation enumerator.
 * @param {IntermediateTextEnumerator} resenum The animation enumerator.
 * @param {string} output Output GIF file path.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function DoGifOutput(resenum, output, callback) {    
    var gw = new GIFWriter();

    var promise1 = new Promise( callback0 => gw.Begin(output, callback0));
    await promise1;

    for (var anim of resenum.EnumerateAnimations()) {
        var promise2 = new Promise( callback0 => gw.ApplyAnimation(anim, callback0));
        await promise2;
    }
    var promise3 = new Promise( callback0 => gw.End(callback0));
    await promise3;

    callback();
}

/**
 * Generates list of changes between two source codes and stores it as an XML file.
 * @param {string} code1 Path to the 'before' source code.
 * @param {string} code2 Path to the 'after' source code.
 * @param {string} output Output XML file path.
 * @param {string} language The language to use while translating representation.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function MidOutputExecutionSingle(code1, code2, output, language, callback) {
    var root1 = TranslateFileByLanguage(code1, language);
    var root2 = TranslateFileByLanguage(code2, language);

    var changes = FindCodeChanges([root1], [root2]);

    var promise = new Promise(
        callback0 => ListOfChangesToFile(changes.inputDestinations, output, callback0)
        );
    promise.then(()=>callback());
    await promise;
}

/**
 * Given two source codes and a list of changes, generates a GIF animation showing edits on the code.
 * @param {string} code1 Path to the 'before' source code.
 * @param {string} code2 Path to the 'after' source code.
 * @param {string} changes12 Path to the XML list of changes.
 * @param {string} output Output GIF file path.
 * @param {string} language The language to use while translating representation.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function MidInputExecutionSingle(code1, code2, changes12, output, language, callback) {
    var root1 = TranslateFileByLanguage(code1, language);
    var root2 = TranslateFileByLanguage(code2, language);
    var changeList = FileToListOfChanges(changes12, [root2]);
    if (root1 === undefined || root2 === undefined) throw Error("Input file doesn't exist");

    var changes = SupplyCodeChanges([root1], [root2], changeList.src, changeList.dst);
    var animationSequennce = GetAnimationSequence(changes.inputDestinations, changes.outputSources, changes.renames);
    var animationEnumerator = new AnimationEnumerator(changes.inputDestinations, changes.outputSources, animationSequennce);

    var promise = new Promise(
        callback0 => DoGifOutput(animationEnumerator, output, callback0)
        );
    promise.then(()=>callback());
    await promise;
}

/**
 * Generates list of changes between two source codes and stores it as an XML file.
 * @param {string} code1 Path to the 'before' source code.
 * @param {string} code2 Path to the 'after' source code.
 * @param {string} output Output GIF file path.
 * @param {string} language The language to use while translating representation.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function FullExecutionSingle(code1, code2, output, language, callback) { 
    var root1 = TranslateFileByLanguage(code1, language);
    var root2 = TranslateFileByLanguage(code2, language);
    if (root1 === undefined || root2 === undefined) throw Error("Input file doesn't exist");

    var changes = FindCodeChanges([root1], [root2]);
    var animationSequence = GetAnimationSequence(changes.inputDestinations, changes.outputSources, changes.renames);
    var animationEnumerator = new AnimationEnumerator(changes.inputDestinations, changes.outputSources, animationSequence);

    var promise = new Promise(
        callback0 => DoGifOutput(animationEnumerator, output, callback0)
        );
    promise.then(()=>callback());
    await promise;
}

/**
 * Does partial execution with output in the middle on multiple pairs of files.
 * @param {string[]} codeFiles List of paths to individual versions of the source code.
 * @param {string[]} outputFiles List of output XML paths.
 * @param {string} language The language to use while translating representation.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function MidOutputExecutionMulti(codeFiles, outputFiles, language, callback) {
    for (var i = 0; i < codeFiles.length - 1; i++) {
        var promise = new Promise(
            callback0 => MidOutputExecutionSingle(codeFiles[i], codeFiles[i+1], outputFiles[i], language, callback0)
            );
        if (i == codeFiles.length - 2) promise.then(()=>callback());
        await promise;
    }
}

/**
 * Does partial execution with input in the middle on multiple pairs of files.
 * @param {[string]} codeFiles List of paths to individual versions of the source code.
 * @param {[string]} changeFiles List of paths to individual XML files with changes.
 * @param {[string]} outputFiles List of output GIF paths.
 * @param {string} language The language to use while translating representation.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function MidInputExecutionMulti(codeFiles, changeFiles, outputFiles, language, callback) {
    for (var i = 0; i < codeFiles.length - 1; i++) {
        var promise = new Promise(
            callback0 => MidInputExecutionSingle(codeFiles[i], codeFiles[i+1], changeFiles[i], outputFiles[i], language, callback0)
            );
        if (i == codeFiles.length - 2) promise.then(()=>callback());
        await promise;
    }
}

/**
 * Does full execution on multiple pairs of files.
 * @param {string[]} codeFiles List of paths to individual versions of the source code.
 * @param {string[]} outputFiles List of output GIF paths.
 * @param {string} language The language to use while translating representation.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function FullExecutionMulti(codeFiles, outputFiles, language, callback) {
    for (var i = 0; i < codeFiles.length - 1; i++) {
        var promise = new Promise(
            callback0 => FullExecutionSingle(codeFiles[i], codeFiles[i+1], outputFiles[i], language, callback0)
            );
        if (i == codeFiles.length - 2) promise.then(()=>callback());
        await promise;
    }
}

/**
 * Tests whether a file translates in the given language.
 * @param {string} file Path to the file with source code.
 * @param {string} language The language to use while translating representation.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function SimpleTest(file, language, callback) {
    var root = TranslateFileByLanguage(file, language);
    console.log(root);
    callback();
}

const recognizedFlags = ['-i', '-o', '-c', '-l', '-f', '-h', '-t'];
/**
 * Checks whether given parameter flag or switch is valid.
 * @param {string} flag Flag or switch to test.
 */
function IsRecognizedFlag(flag)
{
    for (var flag0 of recognizedFlags) {
        if (flag == flag0) return true;
    }
    return false;
}

/**
 * Prints help for this software to the output.
 */
function ShowHelp() {
    console.log("Code shift pre-release v0.8.0");
    console.log("Tool for automatic comparison of different versions of source code");
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
    console.log("-Due to JS limitations, output path must be relative.");
}

/**
 * Parses list of input console arguments and takes an action based on them.
 * @param {*} args List of command line arguments. Note that args[0] is what runs node.js and args[1] is what runs code-shift.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 * @returns 
 */
async function UserInput(args, callback) {

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
                else {
                    throw Error('ERROR: Expected a parameter after flag ' + args[i] + '.');
                }
            }
        }

        // Unrecognized flag
        else {
            if (args[i].startsWith('-')) throw Error('ERROR: Flag ' + args[i] + ' is not recognized.');
            else throw Error('ERROR: Next Argument was expected to be a flag, not \"' + args[i] + '\".');
        }
    }

    // 2) Show help, if instructed:
    if (showHelp || inputFiles.length == 0) {
        ShowHelp();
        return;
    }

    // 3) Check logical correctness otherwise:
    if (intermediateFiles.length > 0) intermediateFilesUsed = true;
    if (intermediateFilesUsed && (inputFiles.length != intermediateFiles.length + 1))
    {
        throw Error('ERROR: The difference of input and intermediate files specified wasn\'t 1.');
    }
    if (inputFiles.length != outputFiles.length + 1)
    {
        throw Error('ERROR: The difference of input and output files specified wasn\'t 1.');
    }
    if (intermediateFilesUsed && outputIntermediateFile) {
        throw Error('ERROR: Two execution modes specified at once.');
    }

    // 4) Execute based on settings:
    // 4A) translation test
    if (testTranslation) {
        var promise = new Promise(
            callback0 => SimpleTest(inputFiles[0], language, callback0)
            );
        promise.then(() => (callback()));    
        await promise; 
    }
    // 4B) intermediate input
    else if (intermediateFilesUsed) {
        var promise = new Promise(
            callback0 => MidInputExecutionMulti(inputFiles, intermediateFiles, outputFiles, language, callback0)
            );
        promise.then(() => (callback()));    
        await promise;    
    }
    // 4C) intermediate output
    else if (outputIntermediateFile) {
        var promise = new Promise(
            callback0 => MidOutputExecutionMulti(inputFiles, outputFiles, language, callback0)
            );
        promise.then(() => (callback()));    
        await promise; 
    }
    // 4D) full execution
    else {
        var promise = new Promise(
            callback0 => FullExecutionMulti(inputFiles, outputFiles, language, callback0)
            );
        promise.then(() => (callback()));    
        await promise; 
    }
}

// Manual Testing:
var testId = 'D3';
// UserInput([undefined, undefined, '-l', 'JS', '-i', './tests/test_' + testId + '_0', '-i', './tests/test_' + testId + '_1', '-o', '../' + testId + '.gif'], ()=>{});
// UserInput([undefined, undefined, '-l', 'JS', '-f', '-i', './tests/test_' + testId + '_0', '-i', './tests/test_' + testId + '_1', '-o', '../' + testId + '.json'], ()=>{});
UserInput([undefined, undefined, '-l', 'JS', '-i', './tests/test_' + testId + '_0', '-i', './tests/test_' + testId + '_1', '-c', '../' + testId + '.json', '-o', '../' + testId + '.gif'], ()=>{});
// UserInput(['-l', 'JS', '-t', './tests/test_' + testId + '_0', ()=>{});

// Runs the program:
// UserInput(process.argv, ()=>{});
