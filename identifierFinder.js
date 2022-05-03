import { CodeChange } from "./distance.js";
import { TokenInfo } from "./languageInterface.js";

/**
 * Finds tokens representing an identifier and returns them in a list.
 * @param {CodeChange[]} listOfChanges The list of source changes to find the tokens in.
 * @param {string} originalName The identifier to find.
 * @param {TokenInfo[]} outputList The list that will hold all found tokens.
 */
export default function FindIdentifiers(listOfChanges, originalName, outputList) {
    for (var i in listOfChanges) {
        if ('tokens' in listOfChanges[i]) {
            for (var token of listOfChanges[i].tokens) {
                if (token.isIdentifier && token.text == originalName) outputList.push(token);
            }
        }
        else FindIdentifiers(listOfChanges[i].children, originalName, outputList );
    }
}