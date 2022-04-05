import JSToTree from './javaScriptTranslator.js';

const languageDefinitions = [
    {
        names : ["JAVASCRIPT", "JS"],
        extensions : [".js"],
        method : (file) => { return JSToTree(file); }
    },
    {
        names : ["C#"],
        extensions : [".cs"],
        method : (file) => { throw new Error("C# parser is not implemented yet.") }
    }
];

export function TrnaslateFileNoLang(filename) {
    // TODO dummy
}

export function TranslateFileDefault(filename) {
    var extension = filename.substring(filename.lastIndexOf('.') + 1);

    for (var definition of languageDefinitions) {
        if (definition.extensions.includes(extension)) {
            return TranslateFile(filename, definition.method);
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