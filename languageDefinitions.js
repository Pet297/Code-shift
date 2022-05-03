import fs from 'fs';
import JSToTree from './javaScriptTranslator.js';
import { TokenInfo, NonsemanticText, BaseCodeBlock } from './languageInterface.js';

const languageDefinitions = [
    {
        names : ["JAVASCRIPT", "JS"],
        extensions : [".js"],
        method : JSToTree
    },
    {
        names : ["NONE"],
        extensions : [],
        method : TranslateFileNoLang
    }
];

/**
 * Translates given source code as a single nonsemantic block as expected in the NONE language.
 * @param {string} text The source code to translate representation of.
 * @returns {BaseCodeBlock} The result of the representation translation.
 */
function TranslateFileNoLang(text) {
    var token = new TokenInfo(text, 0, text.length-1, 0, false, '#ffffff');
    return new NonsemanticText([token], "Only block");
}

/**
 * Translates representation of given source code in given language.
 * If language is undefined, determines language by the file extension.
 * @param {string} filename Path to the source code file.
 * @param {string} language Language to use when translating representation.
 * @returns {BaseCodeBlock} The result of the representation translation.
 */
export function TranslateFileByLanguage(filename, language) {
    if (language === undefined) language = DetermineLanguage(filename);
    var langUp = language.toUpperCase();

    for (var definition of languageDefinitions) {
        if (definition.names.includes(langUp)) {
            return TranslateFile(filename, definition.method);
        }
    }

    // No language matching
    return TranslateFile(filename, TranslateFileNoLang);
}

/**
 * Determines language of given source code based on the extension of the file.
 * @param {string} filename The file to determine language of.
 * @returns {string} Supposed language of the source code, if supported.
 */
export function DetermineLanguage(filename) {
    var extension = filename.substring(filename.lastIndexOf('.') + 1);

    for (var definition of languageDefinitions) {
        if (definition.extensions.includes(extension)) {
            try {
                return definition.names[0];
            }
            catch {
                throw Error('Input file doesn\'t exist - ' + filename);
            }
        }
    }

    return 'NONE';
}

/**
 * Translates representation of given source code, using given translating function.
 * @param {string} filename Path to the source code file.
 * @param {(code: string) => BaseCodeBlock} f Function to use while translating. The first parametr is the source code itself, not the path.
 * @returns 
 */
function TranslateFile(filename, f) {
    try {
        var text = fs.readFileSync(filename).toString();
        return f(text);
    }
    catch {
        throw Error('Input file doesn\'t exist - ' + filename);
    }
}