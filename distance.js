import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText, BaseTokenList, BaseCommandList} from './languageInterface.js';
import leven from 'js-levenshtein';

// Penalties for difference: The smaller the number, the more severe the penalty
const missingDependingVariablePenalty = 100.0;
const missingParamPenalty = 10.0;
const differentDefinitionTypePenalty = 20.0;
const differentConditionTypePenalty = 10.0;
const differentNamePenalty = 20.0;
const swapPenalty = 2.0;
const innerCodeMultiplierPenalty = 1.0;
const levenDifferencePenalty = 10.0;
const blockAddedPenalty = 10.0;
const blockDeletedPenalty = 10.0;

// Bonuses for simmilarity: The larger the number, the better
const sharedDependingVariableBonus = 20.0;
const sharedParamBonus = 10.0;
const sameDefinitionTypeBonus = 30.0;
const sameConditionTypeBonus = 20.0;
const sameNameBonus = 1000.0;
const innerCodeMultiplierBonus = 1.0;
const levenSimmilarityBonus = 5.0;

// Limits to use to shorten execution
const maxDistance = 1000.0;
const maxMove = (blockAddedPenalty + blockDeletedPenalty) / swapPenalty;

// Decides, whether two statements with following simmilarity:difference ratio are considered related.
const changeTreshold = 2.0;
const renameTreshold = 0.9;

export function FindCodeChanges(codeBefore, codeAfter, parentRenames = {}) {

    // SPECIAL CASE: Only 1 object in the input and output --> If same type of definition, assume they are related
    if (codeBefore.length == 1 && codeAfter.length == 1
        && codeBefore[0] instanceof SemanticDefinition && codeAfter[0] instanceof SemanticDefinition
        && codeBefore[0].definitionType == codeAfter[0].definitionType) {
        return FindCodeChanges_Special_OneBlock(codeBefore, codeAfter, parentRenames);
    }

    // 0) Setup variables to hold final or intermediate results
    var inputDestinations = [];
    var outputSources = [];
    inputDestinations.length = codeBefore.length;
    outputSources.length = codeAfter.length;

    var difference = 0.0;
    var sameness = 0.0;
    var unpairedBefore = [];
    var unpairedAfter = [];

    // 1) Keep track of what to pair
    for (var i = 0; i < codeBefore.length; i++) {
        unpairedBefore.push(i);
    }
    for (var i = 0; i < codeAfter.length; i++) {
        unpairedAfter.push(i);
    }

    // A) AUTOMATIC PAIRS

    // A1) Assume definitions of the same name and type are related. (Still, use parent renames, if any)
    for (var i = 0; i < unpairedBefore.length; i++) {
        if (codeBefore[unpairedBefore[i]] instanceof SemanticDefinition) {
            for (var j = 0; j < unpairedAfter.length; j++) {
                if (codeAfter[unpairedAfter[j]] instanceof SemanticDefinition) {
                    if (codeBefore[unpairedBefore[i]].definitionType == codeAfter[unpairedAfter[j]].definitionType && Rename(codeBefore[unpairedBefore[i]].name, parentRenames) == codeAfter[unpairedAfter[j]].name) {

                        var innerChanges = FindCodeChanges(codeBefore[unpairedBefore[i]].innerCode, codeAfter[unpairedAfter[j]].innerCode, parentRenames);
                        difference += innerChanges.difference * innerCodeMultiplierPenalty;
                        difference += listDistance(codeBefore[unpairedBefore[i]].paramList, codeAfter[unpairedAfter[j]].paramList, parentRenames) * missingParamPenalty;
                        sameness += innerChanges.sameness * innerCodeMultiplierBonus;
                        sameness += listSimilarity(codeBefore[unpairedBefore[i]].paramList, codeAfter[unpairedAfter[j]].paramList, parentRenames) * sharedParamBonus;

                        inputDestinations[unpairedBefore[i]] = new CodeChange(unpairedAfter[j],innerChanges.inputDestinations, {...parentRenames});
                        outputSources[unpairedAfter[j]] = new CodeChange(unpairedBefore[i],innerChanges.outputSources, {...parentRenames});

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
    
    // A2) Assume nonsemantic blocks with of the same special type are related.
    for (var i = 0; i < unpairedBefore.length; i++) {
        if (codeBefore[unpairedBefore[i]] instanceof NonsemanticText) {
            for (var j = 0; j < unpairedAfter.length; j++) {
                if (codeAfter[unpairedAfter[j]] instanceof NonsemanticText) {
                    if (codeBefore[unpairedBefore[i]].specialType !== undefined && codeBefore[unpairedBefore[i]].specialType == codeAfter[unpairedAfter[j]].specialType) {

                        inputDestinations[unpairedBefore[i]] = new CodeChange(unpairedAfter[j], [], {...parentRenames});
                        outputSources[unpairedAfter[j]] = new CodeChange(unpairedBefore[i], [], {...parentRenames});

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

    // A3) List all pairs of the same blocks - supposedly unchanged code, though there could be new duplicities
    // Note that it's way faster to check for equality then calculate distances and find two blocks with distance 0.
    // This will shrink to possible pairs in later sections.
    var equalPairs = [];
    for (var i of unpairedBefore) {
        for (var j of unpairedAfter) {
            if (checkStatementsForEquality(codeBefore[i], codeAfter[j], parentRenames) == true)
            {
                equalPairs.push([i,j]);
            }
        }
    }

    // A3.1) If any block appears just once on 1 side, assume that's the unchanged part
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
                inputDestinations[equalPairs[index][0]] = new CodeChange(equalPairs[index][1], [], {...parentRenames});
                outputSources[equalPairs[index][1]] = new CodeChange(equalPairs[index][0], [], {...parentRenames});

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
                inputDestinations[equalPairs[index][0]] = new CodeChange(equalPairs[index][1], [], {...parentRenames});
                outputSources[equalPairs[index][1]] = new CodeChange(equalPairs[index][0], [], {...parentRenames});
                
                unpairedBefore = unpairedBefore.filter(id => id != equalPairs[index][0]);
                unpairedAfter = unpairedAfter.filter(id => id != equalPairs[index][1]);

                equalPairs = equalPairs.filter(pair => pair[0] != equalPairs[index][0]);
            }
        }
    } while (equalPairsLeft != equalPairs.length)

    // B) Distance calculation - compare all pairs of statements and rate their distances [dist, before, after]
    var renamesList = {...parentRenames};
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

    while (true)
    {
        // B2) Calculate distances for potential renames and build renaming tables
        var norename = CheckForRenames(codeBefore, codeAfter, unpairedBefore, unpairedAfter, renamesList);
        var norenameRel = norename[1]/norename[0];
        if (norenameRel === Infinity) break;
        var minDist = Infinity;
        var minRename = null;

        for (var i in definitionsBefore) {
            for (var j in definitionsAfter) {
                var origName = definitionsBefore[i];
                var newName = definitionsAfter[j];
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
            definitionsBefore.splice(i,1);
            definitionsAfter.splice(j,1);
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

        if (codeBefore[i] instanceof SemanticDefinition && codeAfter[j] instanceof SemanticDefinition) {
            if (codeBefore[i].name != codeAfter[j].name) renamesList[codeBefore[i].name] = codeAfter[j].name;
        }

        inputDestinations[i] = new CodeChange(j, [], {...renamesList});
        outputSources[j] = new CodeChange(i, [], {...renamesList});

        distances = distances.filter(l => l[2] != i && l[3] != j);
        unpairedBefore = unpairedBefore.filter(id => id != i);
        unpairedAfter = unpairedAfter.filter(id => id != j);
    }


    // C) PAIR THE REST: Unpaired blocks are assumed to be added or deleted.
    for (var i = 0; i < codeBefore.length; i++) {
        if (!(i in inputDestinations)) {
            inputDestinations[i] = new CodeChange('x', [], {...renamesList});
        }
    }

    for (var i = 0; i < codeAfter.length; i++) {
        if (!(i in outputSources)) {
            outputSources[i] = new CodeChange('+', [], {...renamesList});
        }
    }

    // D) RECURSION: Blocks with innerCode will have their changes calculated as well
    for (var i in codeBefore)
    {
        var goalAdress = inputDestinations[i].address;
        if (goalAdress != 'x' && goalAdress in codeAfter &&
            (codeAfter[goalAdress] instanceof BaseCommandList && codeBefore[i] instanceof BaseCommandList)) {
                var innerChanges = FindCodeChanges(codeBefore[i].innerCode, codeAfter[goalAdress].innerCode, renamesList);

                inputDestinations[i] = new CodeChange(goalAdress,innerChanges.inputDestinations, {...renamesList});
                outputSources[goalAdress] = new CodeChange(parseInt(i),innerChanges.outputSources, {...renamesList});
        }
    }
    

    // E) CALCULATE INTERNAL DISTANCE:
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

    // F) CALCULATE EXTERNAL DISTANCE:
    // Based on how many swaps does it take to transform one code into the other,
    // increase the measurre of difference.
    // TODO: Keep spliting if delete - add is shorter
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

    // Z) ADD RAW TEXT: For simpler GIF output
    for (var index in inputDestinations) {
        inputDestinations[index].tokens = Array.from(codeBefore[index].getTokens());
    }
    for (var index in outputSources) {
        outputSources[index].tokens = Array.from(codeAfter[index].getTokens());
    }

    // ZZ) FINISH
    return new ListOfChanges(inputDestinations, outputSources, difference, sameness, renamesList);
}

// Same like previous function, but does only 1-level and doesn't go deeper.
// TODO: Refactor + reasonably rewrite
function CheckForRenames(codeBefore, codeAfter, unpairedBefore, unpairedAfter, renames = {}) {
    var difference = 0.0;
    var sameness = 0.0;
    
    var unpairedBeforeLocal = [];
    var unpairedAfterLocal = [];

    var inputDestinations = [];
    var outputSources = [];
    inputDestinations.length = codeBefore.length;
    outputSources.length = codeAfter.length;

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
        inputDestinations[i] = new CodeChange(j, [], {...renames});
        outputSources[j] = new CodeChange(i, [], {...renames});

        distances = distances.filter(l => l[2] != i && l[3] != j);
        unpairedBeforeLocal = unpairedBeforeLocal.filter(id => id != i);
        unpairedAfterLocal = unpairedAfterLocal.filter(id => id != j);
    }

    // C) AUTO DELETIONS AND ADDITIONS
    for (var i = 0; i < codeBefore.length; i++) {
        if (!(i in inputDestinations)) {
            inputDestinations[i] = new CodeChange('x', [], {...renames});
        }
    }

    for (var i = 0; i < codeAfter.length; i++) {
        if (!(i in outputSources)) {
            outputSources[i] = new CodeChange('+', [], {...renames});
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

export function SupplyCodeChanges(codeBefore, codeAfter, changesBefore, changesAfter) {
    
    // Adds all read tokens to one of the leaves.
    AddTokenData(codeBefore, changesBefore);
    AddTokenData(codeAfter, changesAfter);

    // Return, as normally
    return new ListOfChanges(changesBefore, changesAfter, 1, 1000);
}

function AddTokenData(code, changes) {
    for (var index in changes) {
        if (code[index] instanceof BaseTokenList) {
            if ('tokens' in code[index]) changes[index].tokens = code[index].tokens;
        }
        else if (code[index] instanceof BaseCommandList) {
            AddTokenData(code[index].innerCode, changes[index].children);
        }
        else {
            throw new Error("No action taken in function 'AddTokenData' in file 'distance.js'.")
        }
    }
}

function FindCodeChanges_Special_OneBlock(codeBefore, codeAfter, parentRenames = {}) {
    var localChanges = FindCodeChanges(codeBefore[0].innerCode, codeAfter[0].innerCode, parentRenames);
    var inputDestinations = [undefined];
    var outputSources = [undefined];
    inputDestinations[0] = new CodeChange(0, localChanges.inputDestinations, {...localChanges.renames});
    outputSources[0] = new CodeChange(0, localChanges.outputSources, {...localChanges.renames});
    return new ListOfChanges(inputDestinations, outputSources, localChanges.difference, localChanges.sameness, {...localChanges.renames});
}

export class CodeChange {

    constructor (address, children, renames) {
        this.address = address;
        this.children = children;
        this.renames = renames;
    }

    get length() {
        this.children.length;
    }

}

export class ListOfChanges {

    constructor (inputDestinations, outputSources, difference, sameness, renames) {
        this.inputDestinations = inputDestinations;
        this.outputSources = outputSources;
        this.difference = difference;
        this.sameness = sameness;
        this.renames = renames;
    }

}

// Checks 2 lists of tokens for equality
// TODO: XOR
export function checkTokensEqual(list1, list2, renames = {}) {
    if (list1.length === list2.length) return list1.every((l, i) => (l.text === list2[i].text || (l.isIdentifier && list2[i].isIdentifier && Rename(l.text, renames) == list2[i].text)));
    return false;
}

// Checks 2 generic lists for equality
function checkListsEqual(list1, list2, renames = {}) {
    var newList1 = RenameElementsOfList(list1, renames);
    if (newList1.length === list2.length) return newList1.every((l, i) => l === list2[i]);
    return false;
}

// Count distance of 2 generic lists, using unit penalty
function listDistance(list1, list2, renames = {}) {
    var dist = 0;
    var newList1 = RenameElementsOfList(list1, renames);
    var set1 = [...new Set(newList1)];
    var set2 = [...new Set(list2)];
    for (var x of set1)
    {
        if (!set2.includes(x)) dist++;
    }
    for (var x of set2)
    {
        if (!set1.includes(x)) dist++;
    }
    return dist;
}

// Counts number of shared elements of 2 generic lists, using unit penalty
function listSimilarity(list1, list2, renames = {}) {
    var sim = 0;
    var newList1 = RenameElementsOfList(list1, renames);
    var set1 = [...new Set(newList1)];
    var set2 = [...new Set(list2)];
    for (var x of set1)
    {
        if (set2.includes(x)) sim++;
    }
    return sim;
}

// Checks 2 lists of statements (codes) for equality
function checkCodeListForEquality(code1, code2, renames = {}) {
    if (code1.length === code2.length) return code1.every((c, i) => checkStatementsForEquality(c, code2[i], renames));
    return false;
}

// Checks 2 simple statements for absolute equality
function checkStatementsForEquality(block1, block2, renames = {}) {
    // TODO: expanze definice
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        return (
            block1.definitionType == block2.definitionType
            && Rename(block1.name, renames) == block2.name
            && checkListsEqual(block1.paramList, block2.paramList, renames)
            && checkCodeListForEquality(block1.innerCode, block2.innerCode, renames));
    }
    if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        return (
            checkListsEqual(block1.dependingVariables, block2.dependingVariables, renames)
            && checkListsEqual(block1.dependentOn, block2.dependentOn, renames));
    }
    if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        return (
            block1.conditionType === block2.conditionType
            && checkListsEqual(block1.dependentOn, block2.dependentOn, renames)
            && checkCodeListForEquality(block1.innerCode, block2.innerCode, renames));
    }
}

// Compares 2 simple statements and returns their distance based on how different they are
function StatementDistance(block1, block2, renames = {}) {
    // Set default. If more distance function are aplicable, take minimum.
    var mininimal = [1.0, maxDistance];

    // Any pair of blocks - do leven:
    if (block1 !== undefined && block2 !== undefined) {
        var rawText1 = "";
        var rawText2 = "";

        for (var token of block1.getTokens())
        {
            if (token.isIdentifier) rawText1 += Rename(token.text, renames);
            else rawText1 += token.text;
        }
        for (var token of block2.getTokens()) rawText2 += token.text;

        var ld = leven(rawText1, rawText2);
        var long = Math.max(rawText1.length, rawText2.length);
        var dist = 1 + levenDifferencePenalty * ld;
        var sim = 1 + levenSimmilarityBonus * (long - ld);

        var mininimal = [sim, dist];
    }

    // Pairs of blocks of same type: do specific comparison and see if better than leven
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        var dist = 1.0;
        var sim = 1.0;

        if (block1.definitionType != block2.definitionType) dist += differentDefinitionTypePenalty;
        else sim += sameDefinitionTypeBonus;

        if (Rename(block1.name, renames) != block2.name) dist += differentNamePenalty;
        else sim += sameNameBonus;

        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.paramList, renames), block2.paramList);
        sim += sharedParamBonus * listSimilarity(RenameElementsOfList(block1.paramList, renames), block2.paramList);

        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);
        sim += sharedParamBonus * listSimilarity(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);

        var changes = FindCodeChanges(block1.innerCode, block2.innerCode, renames)
        dist += innerCodeMultiplierPenalty * changes.difference;
        sim += innerCodeMultiplierBonus * changes.sameness;
        if (mininimal[0] * sim > mininimal[1] * dist) mininimal = [sim, dist];
    }
    else if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        var dist = 1.0;
        var sim = 1.0;

        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);
        sim += sharedParamBonus * listSimilarity(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);

        dist += missingDependingVariablePenalty * listDistance(RenameElementsOfList(block1.dependingVariables, renames), block2.dependingVariables);
        sim += sharedDependingVariableBonus * listSimilarity(RenameElementsOfList(block1.dependingVariables, renames), block2.dependingVariables);

        if (mininimal[0] * sim > mininimal[1] * dist) mininimal = [sim, dist];
    }
    else if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        var dist = 1.0;
        var sim = 1.0;

        if (block1.conditionType != block2.conditionType) dist += differentConditionTypePenalty;
        else sim += sameConditionTypeBonus;

        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.paramList, renames), block2.paramList);
        sim += sharedParamBonus * listSimilarity(RenameElementsOfList(block1.paramList, renames), block2.paramList);

        dist += missingParamPenalty * listDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);
        sim += sharedParamBonus * listSimilarity(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);

        var changes = FindCodeChanges(block1.innerCode, block2.innerCode, renames)
        dist += innerCodeMultiplierPenalty * changes.difference;
        sim += innerCodeMultiplierBonus * changes.sameness;

        if (mininimal[0] * sim > mininimal[1] * dist) mininimal = [sim, dist];
    }

    // Return
    return mininimal;
}

function OneLevelDistance(block1, block2, renames = {}) {
    //TODO one level?
    //rename!
    return StatementDistance(block1, block2);
}

function ConvertBlockToOneLevel(block, renames = {}) {
    if (block instanceof SemanticDefinition) {
        return new SemanticDefinition(RenameElementsOfList(block.dependentOn, renames),RenameElementsOfList(block.paramList, renames), [], block.definitionType, Rename(block.name, renames));
    }
    else if (block instanceof SemanticAction) {
        return new SemanticAction(RenameElementsOfList(block.dependingVariables, renames), RenameElementsOfList(block.dependentOn, renames), block.tokens);
    }
    else if (block instanceof SemanticDecision) {
        return new SemanticDecision(RenameElementsOfList(block.dependentOn, renames),RenameElementsOfList(block.paramList, renames), [], block.conditionType);
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