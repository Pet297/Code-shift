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
        method : (file) => { return TranslateFileNoLang(file); }
    },
    {
        names : ["C#"],
        extensions : [".cs"],
        method : (file) => { throw new Error("C# parser is not implemented yet.") }
    }
];

export function TranslateFileNoLang(filename) {   
    var text = fs.readFileSync(filename).toString();
    var token = new TokenInfo(text, 0, text.length-1, 0, false, false, '#ffffff');
    return new NonsemanticText([token], "Only block");
}

export function TranslateFileDefault(filename) {

    var language = DetermineLanguage(filename);
    
    return TranslateFileByLanguage(filename, language);

}

export function TranslateFileByLanguage(filename, language) {

    var langUp = language.toUpperCase();

    for (var definition of languageDefinitions) {
        if (definition.names.includes(langUp)) {
            return TranslateFile(filename, definition.method);
        }
    }

    // No language matching
    return TranslateFileNoLang(filename);
}

export function DetermineLanguage(filename) {
    var extension = filename.substring(filename.lastIndexOf('.') + 1);

    for (var definition of languageDefinitions) {
        if (definition.extensions.includes(extension)) {
            try {
                return definition.names[0];
            }
            catch {

            }
        }
    }

    return 'NONE';
}

function TranslateFile(filename, f) {
    return f(filename);
}