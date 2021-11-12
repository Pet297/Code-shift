import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';

export function GetStillText(sourceChanges, destinationChanges, currentBlocks)
{
    var stillText = "";

    for (var block of currentBlocks)
    {
        if (block[1] == 'o') {
            stillText += FindByAddress(sourceChanges,block[0]);
        }
        else if (block[1] == '+') {
            stillText += FindByAddress(destinationChanges,block[0]);
        }
        else if (block[1] == 'x') {
            stillText += FindByAddress(sourceChanges,block[0]);
        }
        else if (block[1] == '*') {
            // TODO: In destination
            stillText += "Edited";
        }
    }

    return stillText;
}

function FindByAddress(listOfChanges, address) {

    var currentList = listOfChanges[0];

    for (var a of address) {
        currentList = currentList.children[a];
    }

    return currentList.rawText;
}