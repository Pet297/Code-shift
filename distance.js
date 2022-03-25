import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';
import leven from 'js-levenshtein';

// Penalties for difference: The smaller the number, the more severe the penalty
const missingDependingVariablePenalty = 100.0;
const missingParamPenalty = 10.0;
const differentDefinitionTypePenalty = 20.0;
const differentNamePenalty = 20.0;
const swapPenalty = 5.0;
const innerCodeMultiplierPenalty = 2.0;
const levenDifferencePenalty = 10.0;
const blockAddedPenalty = 5.0;
const blockDeletedPenalty = 5.0;

// Bonuses for simmilarity: The larger the number, the better
const sharedDependingVariableBonus = 20.0;
const sharedParamBonus = 10.0;
const sameDefinitionTypeBonus = 30.0;
const sameNameBonus = 1000.0;
const innerCodeMultiplierBonus = 2.0;
const levenSimmilarityBonus = 2.0;

// Decides, whether two statements with following simmilarity:difference ratio are considered related.
const changeTreshold = 2.0;
const renameTreshold = 0.9;

export function FindCodeChanges(codeBefore, codeAfter, rawBefore, rawAfter, parentRenames = {}) {

    // SPECIAL CASE: Only 1 object in the input and output --> If same type of definition, assume they are related
    if (codeBefore.length == 1 && codeAfter.length == 1
        && codeBefore[0] instanceof SemanticDefinition && codeAfter[0] instanceof SemanticDefinition
        && codeBefore[0].definitionType == codeAfter[0].definitionType) {
        return FindCodeChanges_Special_OneBlock(codeBefore, codeAfter);
    }

    // 0) Setup variables to hold final or intermediate results
    var inputDestinations = {};
    var outputSources = {};
    var difference = 0.0;
    var sameness = 0.0;
    var unpairedBefore = [];
    var unpairedAfter = [];

    for (var i = 0; i < codeBefore.length; i++) {
        unpairedBefore.push(i);
    }
    for (var i = 0; i < codeAfter.length; i++) {
        unpairedAfter.push(i);
    }

    // A) BRUTE FORCE SECTION - NO moving in and out

    // A0) Assume definitions of the same name and type are related.
    for (var i = 0; i < unpairedBefore.length; i++) {
        if (codeBefore[unpairedBefore[i]] instanceof SemanticDefinition) {
            for (var j = 0; j < unpairedAfter.length; j++) {
                if (codeAfter[unpairedAfter[j]] instanceof SemanticDefinition) {
                    if (codeBefore[unpairedBefore[i]].definitionType == codeAfter[unpairedAfter[j]].definitionType && codeBefore[unpairedBefore[i]].name == codeAfter[unpairedAfter[j]].name) {
                        var innerChanges = FindCodeChanges(codeBefore[unpairedBefore[i]].localCode, codeAfter[unpairedAfter[j]].localCode, parentRenames);
                        difference += innerChanges.difference * innerCodeMultiplierPenalty;
                        // TODO: Better rename call
                        difference += listDistance(codeBefore[unpairedBefore[i]].paramList, codeAfter[unpairedAfter[j]].paramList) * missingParamPenalty;
                        sameness += innerChanges.sameness * innerCodeMultiplierBonus;
                        sameness += listSimilarity(codeBefore[unpairedBefore[i]].paramList, codeAfter[unpairedAfter[j]].paramList) * sharedParamBonus;

                        inputDestinations[unpairedBefore[i]] = new CodeChange(unpairedAfter[j].toString(),innerChanges.inputDestinations);
                        outputSources[unpairedAfter[j]] = new CodeChange(unpairedBefore[i].toString(),innerChanges.outputSources);

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
                inputDestinations[equalPairs[index][0]] = new CodeChange(equalPairs[index][1].toString(), []);
                outputSources[equalPairs[index][1]] = new CodeChange(equalPairs[index][0].toString(), []);

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
                inputDestinations[equalPairs[index][0]] = new CodeChange(equalPairs[index][1].toString(), []);
                outputSources[equalPairs[index][1]] = new CodeChange(equalPairs[index][0].toString(), []);
                
                unpairedBefore = unpairedBefore.filter(id => id != equalPairs[index][0]);
                unpairedAfter = unpairedAfter.filter(id => id != equalPairs[index][1]);

                equalPairs = equalPairs.filter(pair => pair[0] != equalPairs[index][0]);
            }
        }
    } while (equalPairsLeft != equalPairs.length)

    // B) Heuristic section - compare all pairs of statements and rate their distances [dist, before, after]

    // B1) List definitions so we can try to detect renames
    var definitionsBefore = [];
    var definitionsAfter = [];
    for (var i of unpairedBefore) {
        if (codeBefore[i] instanceof SemanticDefinition) {
            definitionsBefore.push(codeBefore[i].name);
        }
    }
    for (var j of unpairedAfter) {
        if (codeAfter[j] instanceof SemanticDefinition) {
            definitionsAfter.push(codeAfter[j].name);
        }
    }

    var renamesList = {...parentRenames};
    while (true)
    {
        // B2) Calculate distances for potential renames and build renaming tables
        var norename = CheckForRenames(codeBefore, codeAfter, unpairedBefore, unpairedAfter, renamesList);
        var norenameRel = norename[1]/norename[0];
        if (norenameRel === Infinity) break;
        var renamesValues = [];
        var minDist = Infinity;
        var minRename = null;

        for (var origName of definitionsBefore) {
            for (var newName of definitionsAfter) {
                // Go through every input block and try to find matching output block
                // To each renaming pair, asign a value of sameness and difference
                // Based on large ratios, accept some changes      
                var renamesList0 = {...renamesList};
                renamesList0[origName] = newName;
                var simDst = CheckForRenames(codeBefore, codeAfter, unpairedBefore, unpairedAfter, renamesList0);
                //renamesValues.push([simDst[0] / simDst[1], origName, newName, simDst[0], simDst[1]]);

                var rel = simDst[1]/simDst[0]; //Different / Same
                if (rel !== Infinity && (rel < minDist || minDist === Infinity)) {
                    minDist = rel;
                    minRename = [origName, newName];
                }
            }
        }

        // B3) Pick lowest distance, if low enough, or stop
        if (minRename !== null && minDist < renameTreshold * norenameRel) {
            renamesList[minRename[0]] = minRename[1];
            //TODO: Definitions before remove
            //TODO: Definitions after remove
        }
        else {
            break;
        }
    }

    // B4) Calculate distances between every block with renamings
    // TODO[12]: (?) Cap max distance in code to avoid O(n^2) and prevent crazy O(exp) algorithms down the line
    var distances = [];
    for (var i of unpairedBefore) {
        for (var j of unpairedAfter) {
            var dist = StatementDistance(codeBefore[i], codeAfter[j], renamesList);
            var rel = dist[1]/dist[0]; //Different / Same
            if (rel !== Infinity && rel < changeTreshold) distances.push([rel,dist[1],i,j]);
        }
    }

    distances.sort((la, lb) => (la[0] == lb[0] ? la[1] - lb[1] : la[0] - la[0])); // (Lexicographic based on entry 1 and 2 only)

    while (distances.length > 0) {
        var i = distances[0][2]; // Index before
        var j = distances[0][3]; // Index after
        inputDestinations[i] = new CodeChange(j.toString(), []);
        outputSources[j] = new CodeChange(i.toString(), []);

        distances = distances.filter(l => l[2] != i && l[3] != j);
        unpairedBefore = unpairedBefore.filter(id => id != i);
        unpairedAfter = unpairedAfter.filter(id => id != j);
    }


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

    // D) CALCULATE LOCAL DISTANCE
    // For each paired code, add their sameness and difference to the total.
    // For each removed or added line, add penalty.
    for (var i in inputDestinations) {
        if (inputDestinations[i].address != 'x') {
            var dist = StatementDistance(codeBefore[i], codeAfter[inputDestinations[i].address], renamesList);
            sameness += dist[0];
            difference += dist[1];
        }
    }
    difference += unpairedBefore.length * blockDeletedPenalty;
    difference += unpairedAfter.length * blockAddedPenalty;

    // E) CALCULATE PHYSICAL DISTANCE
    // Based on how many swaps does it take to transform one code into the other,
    // increase the measurre of difference.
    var unordered = [];
    var ordered = [];
    for (var i in inputDestinations) {
        if (inputDestinations[i].address != 'x') {
            unordered.push(inputDestinations[i].address);
            ordered.push(inputDestinations[i].address);
        }
    }
    ordered.sort();

    for (var x of ordered) {
        for (var i = 0; i < unordered.length; i++) {
            if (unordered[i] == x) {
                difference += i * swapPenalty; // penalty for each swap.
                unordered.splice(i, 1);
                break;
            }
        }
    }

    // Z) ADD RAW TEXT
    for (var index in inputDestinations) {
        if ('tokens' in codeBefore[index]) {
            inputDestinations[index].tokens = codeBefore[index].tokens;
        }
    }
    for (var index in outputSources) {
        if ('tokens' in codeAfter[index]) {
            outputSources[index].tokens = codeAfter[index].tokens;
        }
    }

    // ZZ) FINISH
    return new ListOfChanges(inputDestinations, outputSources, renamesList, difference, sameness);
}

function CheckForRenames(codeBefore, codeAfter, unpairedBefore, unpairedAfter, renames = {}) {
    var difference = 0.0;
    var sameness = 0.0;
    
    var unpairedBeforeLocal = [];
    var unpairedAfterLocal = [];
    var inputDestinations = [];
    var outputSources = [];

    for (var x of unpairedBefore) unpairedBeforeLocal.push(x);
    for (var x of unpairedAfter) unpairedAfterLocal.push(x);

    var distances = [];
    for (var i of unpairedBeforeLocal) {
        for (var j of unpairedAfterLocal) {
            var dist = OneLevelDistance(codeBefore[i], codeAfter[j], renames);
            var rel = dist[1]/dist[0]; //Different / Same
            if (rel !== Infinity && rel < changeTreshold) distances.push([rel,dist[1],i,j]);
        }
    }

    distances.sort((la, lb) => (la[0] == lb[0] ? la[1] - lb[1] : la[0] - la[0])); // (Lexicographic based on entry 1 and 2 only)

    while (distances.length > 0)
    {
        var i = distances[0][2]; // Index before
        var j = distances[0][3]; // Index after
        inputDestinations[i] = new CodeChange(j.toString(), []);
        outputSources[j] = new CodeChange(i.toString(), []);

        distances = distances.filter(l => l[2] != i && l[3] != j);
        unpairedBeforeLocal = unpairedBeforeLocal.filter(id => id != i);
        unpairedAfterLocal = unpairedAfterLocal.filter(id => id != j);
    }

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

    // D) CALCULATE LOCAL DISTANCE
    // For each paired code, add their sameness and difference to the total.
    // For each removed or added line, add penalty.
    for (var i in inputDestinations) {
        if (inputDestinations[i].address != 'x') {
            var dist = OneLevelDistance(codeBefore[i], codeAfter[inputDestinations[i].address], renames);
            sameness += dist[0];
            difference += dist[1];
        }
    }
    difference += unpairedBeforeLocal.length * blockDeletedPenalty;
    difference += unpairedAfterLocal.length * blockAddedPenalty;

    // E) CALCULATE PHYSICAL DISTANCE
    // Based on how many swaps does it take to transform one code into the other,
    // increase the measurre of difference.
    var unordered = [];
    var ordered = [];
    for (var i in inputDestinations) {
        if (inputDestinations[i].address != 'x') {
            unordered.push(inputDestinations[i].address);
            ordered.push(inputDestinations[i].address);
        }
    }
    ordered.sort();

    for (var x of ordered) {
        for (var i = 0; i < unordered.length; i++) {
            if (unordered[i] == x) {
                difference += i * swapPenalty; // penalty for each swap.
                unordered.splice(i, 1);
            }
        }
    }

    // ZZ) FINISH
    return [1 + sameness, 1 + difference];
}

export function SupplyCodeChanges(codeBefore, codeAfter, renames, changesBefore, changesAfter) {
    
    // Z) ADD RAW TEXT
    AddTokenData(codeBefore, changesBefore);
    AddTokenData(codeAfter, changesAfter);

    // Return, as normally
    return new ListOfChanges(changesBefore, changesAfter, renames, 0, 1000);
}

function AddTokenData(code, changes) {
    for (var index in changes) {
        if (code[index] instanceof SemanticAction) {
            if ('tokens' in code[index]) changes[index].tokens = code[index].tokens;
        }
        else if (code[index] instanceof SemanticDefinition) {
            AddTokenData(code[index].localCode, changes[index].children);
        }
        else if (code[index] instanceof NonsemanticText) {
            if ('tokens' in code[index]) changes[index].tokens = code[index].tokens;
        }
        //TODO[11]:Decision
    }
}

function FindCodeChanges_Special_OneBlock(codeBefore, codeAfter) {
    var localChanges = FindCodeChanges(codeBefore[0].localCode, codeAfter[0].localCode);
    var inputDestinations = {};
    var outputSources = {};
    inputDestinations[0] = new CodeChange('0', localChanges.inputDestinations);
    outputSources[0] = new CodeChange('0', localChanges.outputSources);
    //TODO: urovne renames
    return new ListOfChanges(inputDestinations, outputSources, localChanges.renames, localChanges.difference, localChanges.sameness);
}

export class CodeChange {

    constructor (address, children) {
        this.address = address;
        this.children = children;
    }

}

export class ListOfChanges {

    constructor (inputDestinations, outputSources, renames, difference, sameness) {
        this.inputDestinations = inputDestinations;
        this.outputSources = outputSources;
        this.renames = renames;
        this.difference = difference;
        this.sameness = sameness;
    }

}

// Checks 2 generic lists for equality
export function checkTokensEqual(list1, list2) {
    if (list1.length === list2.length) return list1.every((l, i) => l.text === list2[i].text);
    return false;
}

// Checks 2 generic lists for equality
function checkListsEqual(list1, list2) {
    if (list1.length === list2.length) return list1.every((l, i) => l === list2[i]);
    return false;
}

// Count distance of 2 generic lists, using unit penalty
function listDistance(list1, list2) {
    var dist = 0;
    for (var x of list1)
    {
        if (!list2.includes(x)) dist++;
    }
    for (var x of list2)
    {
        if (!list1.includes(x)) dist++;
    }
    return dist;
}

// Counts number of shared elements of 2 generic lists, using unit penalty
function listSimilarity(list1, list2) {
    var sim = 0;
    for (var x of list1)
    {
        if (list2.includes(x)) sim++;
    }
    return sim;
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
function StatementDistance(block1, block2, renames = {}) {
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        var dist = 0.0;
        var sim = 0.0;

        if (block1.definitionType != block2.definitionType) dist += differentDefinitionTypePenalty;
        else sim += sameDefinitionTypeBonus;

        if (Rename(block1.name, renames) != block2.name) dist += differentNamePenalty;
        else sim += sameNameBonus;

        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.paramList, renames), block2.paramList);
        sim += sharedParamBonus * listSimilarity(RenameElementsOfList(block1.paramList, renames), block2.paramList);

        var changes = FindCodeChanges(block1.localCode, block2.localCode, renames)
        dist += innerCodeMultiplierPenalty * changes.difference;
        sim += innerCodeMultiplierBonus * changes.sameness;
        return [sim + 1, dist + 1];
    }
    else if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        var dist = 0.0;
        var sim = 0.0;

        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);
        sim += sharedParamBonus * listSimilarity(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);
        dist += missingDependingVariablePenalty * listDistance(RenameElementsOfList(block1.dependingVariables, renames), block2.dependingVariables);
        sim += sharedDependingVariableBonus * listSimilarity(RenameElementsOfList(block1.dependingVariables, renames), block2.dependingVariables);

        return [sim + 1, dist + 1];
    }
    else if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        //TODO[10]: Lists of lists
        var dist = 0.0;
        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);
        return [1.0, 1000.0];
    }
    else
    {
        if (block1.tokens === undefined) return [1.0, 1000.0];
        if (block2.tokens === undefined) return [1.0, 1000.0];
        else
        {

            var rawText1 = "";
            var rawText2 = "";

            for (var token of block1.tokens)
            {
                if (token.isIdentifier) rawText1 += Rename(token.text, renames);
                else rawText1 += token.text;
            }
            for (var token of block2.tokens) rawText2 += token.text;

            var ld = leven(rawText1, rawText2);
            var long = Math.max(rawText1.length, rawText2.length);
            var dist = 1 + levenDifferencePenalty * ld;
            var sim = 1 + levenSimmilarityBonus * (long - ld);
            return [sim, dist];
        }
    }
}

function OneLevelDistance(block1, block2, renames = {}) {
    return StatementDistance(ConvertBlockToOneLevel(block1, renames), ConvertBlockToOneLevel(block2));
}

function ConvertBlockToOneLevel(block, renames = {}) {
    //TODO:[12] Semantic decision
    if (block instanceof SemanticDefinition) {
        return new SemanticDefinition(RenameElementsOfList(block.paramList, renames), [], block.definitionType, Rename(block.name, renames));
    }
    else if (block instanceof SemanticAction) {
        return new SemanticAction(RenameElementsOfList(block.dependingVariables, renames), RenameElementsOfList(block.dependentOn, renames), block.tokens);
    }
    else if (block instanceof NonsemanticText) {
        return block;
    }
    else return undefined;
}

function RenameElementsOfList(original, renames = {}) {
    var newList = [];
    for (var element of original) {
        newList.push(Rename(element, renames));
    }
    return newList;
}

function Rename(original, renames = {}) {
    if (original in renames) {
        return renames[original];
    }
    else return original;
}