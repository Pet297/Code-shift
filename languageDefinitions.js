import fs from 'fs';
import JSToTree from './javaScriptTranslator.js';
import { TokenInfo, SemanticAction, SemanticDecision, SemanticDefinition, NonsemanticText, NonsemanticCommandList, BaseCodeBlock, BaseCommandList, BaseTokenList } from './languageInterface.js';

const languageDefinitions = [
    {
        names : ["JAVASCRIPT", "JS"],
        extensions : [".js"],
        method : (file) => { return JSToTree(file); }
    },
    {
        names : ["NONE"],
        extensions : [],
        method : (file) => { return TranslateFile(file); }
    },
    {
        names : ["C#"],
        extensions : [".cs"],
        method : (file) => { throw new Error("C# parser is not implemented yet.") }
    }
];

export function TrnaslateFileNoLang(filename) {   
    var text = fs.readFileSync(filename).toString();
    var token = new TokenInfo(text, 0, text.length-1, 0, false, false, 0);
    return new NonsemanticText([token], "Only block");
}

export function TranslateFileDefault(filename) {
    var extension = filename.substring(filename.lastIndexOf('.') + 1);

    for (var definition of languageDefinitions) {
        if (definition.extensions.includes(extension)) {
            try {
                return TranslateFile(filename, definition.method);
            }
            catch {

            }
        }
    }

    // No language matching
    return TrnaslateFileNoLang(filename);
}

export function TranslateFileByLanguage(filename, language) {

    for (var definition of languageDefinitions) {
        if (definition.names.includes(language)) {
            return TranslateFile(filename, definition.method);
        }
    }

    // No language matching
    return TrnaslateFileNoLang(filename);
}

function TranslateFile(filename, f) {
    return f(filename);
}