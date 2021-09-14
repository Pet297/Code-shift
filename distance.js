import {SemanticDefinition, SemanticAction, SemanticDecision} from './testVisitor.js';

// The smaller the number, the more severe the penalty
const missingDependingVariablePenalty = -100;
const missingParamPenalty = -10;
const differentDefinitionType = -2;
const differentDefinitionName = -5;
const swapPenalty = -5;               // oabcde  => abcdeo counts as 1 swap, not 5

const codeDifferenceMultiplier = 2;

// Something like this should be returned
// For every "line" in input, mark its position in output
// For every "line" in output, mark its position in output

// "+" - add
// "x" - delete
// moving statements (possibly into functions):
// [5]  - reachable by index [5] on the root list of statements
// [0, 3] - reachable by indices [0], then [3] from the root list of statements

export default function FindCodeChanges(codeBefore, codeAfter) {

    // SPECIAL CASE: Only 1 object in the input and output --> If same type of definition, assume they are related
    if (codeBefore.length == 1 && codeAfter.length == 1
        && codeBefore[0] instanceof SemanticDefinition && codeAfter[0] instanceof SemanticDefinition
        && codeBefore[0].definitionType == codeAfter[0].definitionType) {
        return FindCodeChanges_Special_OneBlock(codeBefore, codeAfter);
    }


    // GENERAL CASE:
    // 0) Setup arrays to hold result
    var inputDestinations = {}
    var outputSources = {}

    // A) BRUTE FORCE SECTION - NO moving in and out

    // A1) List all pairs of the same blocks - supposedly unchanged code, though there could be new duplicities
    var equalPairs = [];
    for (var i = 0; i < codeBefore.length; i++) {
        for (var j = 0; j < codeAfter.length; j++) {
            if (checkStatementsForEquality(codeBefore[i], codeAfter[j]) == true)
            {
                equalPairs.push([i,j]);
            }
        }
    }

    // A2) If any number appears on just once on 1 side, assume that's the unchanged part

    var equalPairsLeft = equalPairs.length;
    do {
        equalPairsLeft = equalPairs.length;

        for (var i = 0; i < codeBefore.length; i++) {
            var appearances = 0;
            var index = -1;
            for (var j = 0; j < equalPairs.length; j++) {
                if (equalPairs[j][0] == i) {
                    appearances++;
                    index = j;
                }
            }
            if (appearances == 1) {
                inputDestinations[equalPairs[index][0]] = [equalPairs[index][1]];
                outputSources[equalPairs[index][1]] = [equalPairs[index][0]];
                equalPairs.splice(index, 1);
            }
        }

        for (var i = 0; i < codeAfter.length; i++) {
            var appearances = 0;
            var index = -1;
            for (var j = 0; j < equalPairs.length; j++) {
                if (equalPairs[j][1] == i) {
                    appearances++;
                    index = j;
                }
            }
            if (appearances == 1) {
                inputDestinations[equalPairs[index][0]] = [equalPairs[index][1]];
                outputSources[equalPairs[index][1]] = [equalPairs[index][0]];
                equalPairs.splice(index, 1);
            }
        }
    } while (equalPairsLeft != equalPairs.length)

    // TODO: HEURISTIC SECTION

    // C) AUTO DELETIONS AND ADDITIONS
    for (var i = 0; i < codeBefore.length; i++) {
        if (!(i in inputDestinations)) {
            inputDestinations[i] = 'x';
        }
    }

    for (var i = 0; i < codeAfter.length; i++) {
        if (!(i in outputSources)) {
            outputSources[i] = '+';
        }
    }

    return new ListOfChanges(inputDestinations, outputSources);
}

function FindCodeChanges_Special_OneBlock(codeBefore, codeAfter) {
    return FindCodeChanges(codeBefore[0].localCode, codeAfter[0].localCode).moveUp(0);
}

export class ListOfChanges {

    constructor (inputDestinations, outputSources, address = []) {
        this.inputDestinations = inputDestinations;
        this.outputSources = outputSources;
        this.address = address;
    }

    moveUp (outerAddress) {
        var newInputDestinations = {};
        var newOutputSources = {};
        var newAddress = [];

        // Push outerAddress into every adresing list eq. if outer a. is 3 and inner a. is 5, turn [5] into [5,3]
        for (var v of this.address) newAddress.push(v);
        newAddress.push(outerAddress);

        for (var i in this.inputDestinations) {
            newInputDestinations[i] = [];
            for (var a of this.inputDestinations[i]) newInputDestinations[i].push(a);
            newInputDestinations[i].push(outerAddress)
        }

        for (var i in this.outputSources) {
            newOutputSources[i] = [];
            for (var a of this.outputSources[i]) newOutputSources[i].push(a);
            newOutputSources[i].push(outerAddress)
        }

        return new ListOfChanges(newInputDestinations, newOutputSources, newAddress);
    }
}


// Checks 2 generic lists for equality
function checkListsEqual(list1, list2) {
    if (list1.length === list2.length) return list1.every((l, i) => l === list2[i]);
    return false;
}

// Checks 2 lists of statements (codes) for equality
function checkCodeListForEquality(code1, code2) {
    if (code1.length === code2.length) return code1.every((c, i) => checkStatementsForEquality(c, code2[i]));
    return false;
}

// Checks 2 lists of codes for equality
function checkCodeListListForEquality(codes1, codes2) {
    if (codes1.length === codes2.length) return codes1.every((c, i) => checkCodeListForEquality(c, codes2[i]));
    return false;
}

// Checks 2 simple statements for absolute equality
function checkStatementsForEquality(block1, block2) {
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        return (
            block1.definitionType == block2.definitionType
            && block1.name == block2.name
            && checkListsEqual(block1.paramList, block2.paramList)
            && checkCodeListForEquality(block1.localCode, block2.localCode));
    }
    if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        return (
            checkListsEqual(block1.dependingVariables, block2.dependingVariables)
            && checkListsEqual(block1.dependentOn, block2.dependentOn));
    }
    if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        return (
            block1.conditionType === block2.conditionType
            && checkListsEqual(block1.dependentOn, block2.dependentOn)
            && checkCodeListListForEquality(block1.perConditionCode, block2.perConditionCode));
    }
}

// Compares 2 simple statements and returns their distance based on how different they are
function compareForDistance(block1, block2) {
    // TODO: implement
    return 0;
}