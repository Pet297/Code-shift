import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';
import {DeletingAnimation, AddingAnimation, MovingUpAnimation, ChangingAnimation, InternalAnimationSequence} from './animationSequence';

export function EnumerateStillTexts(sourceChanges, destinationChanges, animationSequence)
{
    // keep the list of intermediate texts
    var results = [];

    // Build the list of elements at the begining. Keep processed part and unprocessed part
    var proccessedList = [];
    var unproccessedList = [];
    var currentAddress = [];
    BuildInitialArray(sourceChanges, [], unproccessedList);

    while (animationSequence.length > 0)
    {
        results.push(GetStillText(sourceChanges, destinationChanges, unproccessedList));
        var anim = animationSequence.shift();
    }

    return results;
}

function GetStillText(sourceChanges, destinationChanges, currentBlocks)
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

function BuildInitialArray(sourceChanges, addressArray, unproccessedList) {
    for (var index in sourceChanges)
    {
        var na = [...addressArray];
        na.push(index);
        if (sourceChanges[index].children.length != 0)
        {
            BuildInitialArray(sourceChanges[index].children, na, unproccessedList);
        }
        else
        {
            unproccessedList.push([na,'o']);
        }
    }
}

function FindByAddress(listOfChanges, address) {

    var currentList = listOfChanges[address[0]];

    for (var a in address) {
        if (a != 0) currentList = currentList.children[address[a]];
    }

    return currentList.rawText;
}