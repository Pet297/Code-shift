import {SemanticDefinition, SemanticAction, SemanticDecision} from './testVisitor.js';

// The smaller the number, the more severe the penalty
const missingDependingVariablePenalty = 100;
const missingParamPenalty = 10;
const differentDefinitionTypePenalty = 2;
const differentNamePenalty = 20;
const differentDefinitionNamePenalty = 5;
const swapPenalty = 5;               // oabcde  => abcdeo counts as 1 swap, not 5

const innerCodeMultiplierPenalty = 2;

export default function FindCodeChanges(codeBefore, codeAfter) {

    // SPECIAL CASE: Only 1 object in the input and output --> If same type of definition, assume they are related
    if (codeBefore.length == 1 && codeAfter.length == 1
        && codeBefore[0] instanceof SemanticDefinition && codeAfter[0] instanceof SemanticDefinition
        && codeBefore[0].definitionType == codeAfter[0].definitionType) {
        return FindCodeChanges_Special_OneBlock(codeBefore, codeAfter);
    }


    // 0) Setup variables to hold final or intermediate results
    var inputDestinations = {};
    var outputSources = {};
    var dist = 0;
    var unpairedBefore = [];
    var unpairedAfter = [];

    for (var i = 0; i < codeBefore.length; i++)
    {
        unpairedBefore.push(i);
    }
    for (var i = 0; i < codeAfter.length; i++)
    {
        unpairedAfter.push(i);
    }

    // A) BRUTE FORCE SECTION - NO moving in and out

    // A0) Assume definitions of the same name and type are related.
    for (var i = 0; i < unpairedBefore.length; i++)
    {
        if (codeBefore[unpairedBefore[i]] instanceof SemanticDefinition)
        {
            for (var j = 0; j < unpairedAfter.length; j++)
            {
                if (codeAfter[unpairedAfter[j]] instanceof SemanticDefinition)
                {
                    if (codeBefore[unpairedBefore[i]].definitionType == codeAfter[unpairedAfter[j]].definitionType && codeBefore[unpairedBefore[i]].name == codeAfter[unpairedAfter[j]].name)
                    {
                        inputDestinations[unpairedBefore[i]] = [unpairedAfter[j]]
                        outputSources[j] = [unpairedBefore[i]]

                        var innerChanges = FindCodeChanges(codeBefore[unpairedBefore[i]].localCode, codeAfter[unpairedAfter[j]].localCode);
                        dist += innerChanges.distance * innerCodeMultiplierPenalty;
                        dist += listDistance(codeBefore[unpairedBefore[i]].paramList, codeAfter[unpairedAfter[j]].paramList) * missingParamPenalty;

                        inputDestinations[unpairedBefore[i]] = new CodeChange(unpairedAfter[j],innerChanges.inputDestinations);
                        outputSources[unpairedAfter[j]] = new CodeChange(unpairedBefore[i],innerChanges.outputSources);

                        unpairedBefore.splice(i, 1);
                        unpairedAfter.splice(j, 1);
                        i--;
                        j--;
                        break;
                    }
                }
            }
        }
    }

    // A1) List all pairs of the same blocks - supposedly unchanged code, though there could be new duplicities
    var equalPairs = [];
    for (var i of unpairedBefore) {
        for (var j of unpairedAfter) {
            if (checkStatementsForEquality(codeBefore[i], codeAfter[j]) == true)
            {
                equalPairs.push([i,j]);
            }
        }
    }

    // A2) If any number appears just once on 1 side, assume that's the unchanged part

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
                inputDestinations[equalPairs[index][0]] = new CodeChange(equalPairs[index][1], []);
                outputSources[equalPairs[index][1]] = new CodeChange(equalPairs[index][0], []);

                unpairedBefore = unpairedBefore.filter(id => id != equalPairs[index][0]);
                unpairedAfter = unpairedAfter.filter(id => id != equalPairs[index][1]);

                equalPairs = equalPairs.filter(pair => pair[1] != equalPairs[index][1]);
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
                inputDestinations[equalPairs[index][0]] = new CodeChange(equalPairs[index][1], []);
                outputSources[equalPairs[index][1]] = new CodeChange(equalPairs[index][0], []);
                
                unpairedBefore = unpairedBefore.filter(id => id != equalPairs[index][0]);
                unpairedAfter = unpairedAfter.filter(id => id != equalPairs[index][1]);

                equalPairs = equalPairs.filter(pair => pair[0] != equalPairs[index][0]);
            }
        }
    } while (equalPairsLeft != equalPairs.length)

    // B) Heuristic section - compare all pairs of statements and rate their distances [dist, before, after]
    // TODO: (?) Cap max distance in code to avoid O(n^2) and prevent crazy O(exp) algorithms down the line (?)
    var distances = [];
    for (var i = 0; i < codeBefore.length; i++) {
        for (var j = 0; j < codeAfter.length; j++) {
            distances.push([statementDistance(codeBefore[i], codeAfter[j]),i,j]);
        }
    }

    distances.sort((la, lb) => la - lb);

    // TODO: Keep removing low ones


    // C) AUTO DELETIONS AND ADDITIONS
    for (var i = 0; i < codeBefore.length; i++) {
        if (!(i in inputDestinations)) {
            inputDestinations[i] = new CodeChange('x', []);
        }
    }

    for (var i = 0; i < codeAfter.length; i++) {
        if (!(i in outputSources)) {
            outputSources[i] = new CodeChange('+', []);
        }
    }

    // TODO: proper distance
    return new ListOfChanges(inputDestinations, outputSources, dist);
}

function FindCodeChanges_Special_OneBlock(codeBefore, codeAfter) {
    var localChanges = FindCodeChanges(codeBefore[0].localCode, codeAfter[0].localCode);
    var inputDestinations = {};
    var outputSources = {};
    inputDestinations[0] = new CodeChange(0, localChanges.inputDestinations);
    outputSources[0] = new CodeChange(0, localChanges.outputSources);
    return new ListOfChanges(inputDestinations, outputSources, localChanges.distance);
}

export class CodeChange {

    constructor (address, children) {
        this.address = address;
        this.children = children;
    }

}

export class ListOfChanges {

    constructor (inputDestinations, outputSources, distance) {
        this.inputDestinations = inputDestinations;
        this.outputSources = outputSources;
        this.distance = distance;
    }

}

// Checks 2 generic lists for equality
function checkListsEqual(list1, list2) {
    if (list1.length === list2.length) return list1.every((l, i) => l === list2[i]);
    return false;
}

// Count distance of 2 generic lists, using unit penalty
function listDistance(list1, list2) {
    var dist = 0;
    for (var x in list1)
    {
        if (!list2.includes(x)) dist++;
    }
    for (var x in list2)
    {
        if (!list1.includes(x)) dist++;
    }
    return dist;
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
function statementDistance(block1, block2) {
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        var dist = 0;
        if (block1.definitionType != block2.definitionType) dist += differentDefinitionTypePenalty;
        if (block1.name != block2.name) dist += differentNamePenalty;
        dist += missingParamPenalty * listDistance(block1.paramList, block2.paramList);
        dist += innerCodeMultiplierPenalty * FindCodeChanges(block1.localCode, block2.localCode).distance;
        return dist;
    }
    else if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        var dist = 0;
        dist += missingParamPenalty * listDistance(block1.dependentOn, block2.dependentOn);
        dist += missingDependingVariablePenalty * listDistance(block1.dependingVariables, block2.dependingVariables);
        return dist;
    }
    else if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        //TODO: Lists of lists
        var dist = 0;
        dist += missingParamPenalty * listDistance(block1.dependentOn, block2.dependentOn);
        return 1000;
    }
    //TODO: more
    return 1000;
}