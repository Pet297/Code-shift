import fs from 'fs';
import { CodeChange } from './distance.js';
import { BaseCodeBlock, BaseCommandList } from './languageInterface.js';

/**
 * Serializes given list of changes to an JSON file.
 * @param {CodeChange[]} sourceChanges Source list of changes to serialize.
 * @param {string} outputFile The output JSON file to which the list of changes should be serialized.
 */
export function ListOfChangesToFile(sourceChanges, outputFile) {
    var json = JSON.stringify(sourceChanges);
    fs.writeFileSync(outputFile, json, 'utf8');
}

export function FileToListOfChanges(file, codeAfter) {
    var json = fs.readFileSync(file).toString();
    var sourceChanges = JSON.parse(json);
    sourceChanges = SourceChangesAsCodeChange(sourceChanges);

    var destinationChanges = [];
    SourceChangesToDestinationChanges(sourceChanges, destinationChanges, codeAfter);

    return {src:sourceChanges, dst:destinationChanges};
}

/**
 * Given a relationships of source blocks to destination blocks, builds the inverse list of relationships.
 * @param {CodeChange[]} sourceChanges The list relating source blocks to destination blocks.
 * @param {[]} destinationChanges Output list that will hold relations of destination blocks to source blocks.
 * @param {BaseCodeBlock[]} codeAfter Simplified representation of source code 'after'.
 */
function SourceChangesToDestinationChanges(sourceChanges, destinationChanges, codeAfter) {
    destinationChanges.length = codeAfter.length;
    for (var i = 0; i < sourceChanges.length; i++) {
        if (typeof sourceChanges[i].address == 'number') {
            var children = [];
            if (codeAfter[sourceChanges[i].address] instanceof BaseCommandList) {
                SourceChangesToDestinationChanges(sourceChanges[i].children, children, codeAfter[sourceChanges[i].address].innerCode);
            }
            destinationChanges[sourceChanges[i].address] = new CodeChange(i, children, sourceChanges[i].renames);
        }
        else if (typeof  sourceChanges[i].address == 'string') {
            if (sourceChanges[i].address.startsWith('M')) {
                // Part of M:1
                var destinationAddress = parseInt(sourceChanges[i].address.substring(1));
                var comparisonAddress = sourceChanges[i].address;
                var related = [i];

                for (var j = i + 1; j < sourceChanges.length; j++) {
                    if (sourceChanges[j].address != comparisonAddress) {
                        break;
                    }
                    else related.push(j);
                }
                i = j - 1;

                destinationChanges[destinationAddress] = new CodeChange(related, [], sourceChanges[i].renames);
            }
        }
        else if (Array.isArray(sourceChanges[i].address)) {
            for (var a of sourceChanges[i].address) {
                destinationChanges[a] = new CodeChange(i, [], sourceChanges[i].renames);
            }
        }
    }
    for (var i = 0; i < destinationChanges.length; i++) {
        if (!(i in destinationChanges)) {
            destinationChanges[i] = new CodeChange('+', [], sourceChanges[i].renames);
        }
    }
}

/**
 * Recursively converts loaded generic object into instances of CodeChange, without its tokens.
 * @param {object[]} sourceChanges List of code changes as generic objects.
 * @returns {CodeChange[]} List of code changes as instances of CodeChange.
 */
function SourceChangesAsCodeChange(sourceChanges) {
    var returnList = [];
    for (var i = 0; i < sourceChanges.length; i++) {
        returnList[i] = new CodeChange(sourceChanges[i].address, SourceChangesAsCodeChange(sourceChanges[i].children), sourceChanges[i].renames);
    }
    return returnList;
}
