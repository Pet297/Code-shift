import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText, BaseTokenList, BaseCommandList, BaseCodeBlock, TokenInfo} from './languageInterface.js';
import leven from 'js-levenshtein';

// Constants for measuring code distance:
const differentDefinitionTypePenalty = 20.0;
const differentDefinitionNamePenalty = 20.0;
const differentDecisionTypePenalty = 10.0;
const missingParamPenalty = 1.0;
const missingDependingVariablePenalty = 100.0;
const missingDependentVariablePenalty = 5.0;
const innerCodeMultiplierPenalty = 0.95;
const swapPenalty = 0.0005;
const addPenalty = 0.2;
const levenDifferencePenalty = 0.45;

// Limit to use to shorten execution:
const maxDistance = 5000.0;

// Highest ratio of distance before rename and after rename at which to consider the rename:
const renameTreshold = 0.95;

/**
 * Find distance between two source codes in simplified representation,
 * along with list of changes to attain path of this length.
 * @param {BaseCodeBlock[]} codeBefore The first source code in simplified representation.
 * @param {BaseCodeBlock[]} codeAfter The second source code in simplified representation.
 * @param {object} parentRenames List of renames considered from parent scopes.
 * @returns {ListOfChanges} Object containing information about related blocks of code, distance and renames.
 */
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

    var codeDistance = 0;
    var unpairedBefore = [];
    var unpairedAfter = [];

    // 0.1) Keep track of what to pair
    for (var i = 0; i < codeBefore.length; i++) {
        unpairedBefore.push(i);
    }
    for (var i = 0; i < codeAfter.length; i++) {
        unpairedAfter.push(i);
    }


    // A) Rename detection
    var renamesList = {...parentRenames};
    // A1) List definitions so we can try to detect renames 
    var definitionsBefore = [];
    var definitionsAfter = [];
    for (var i of unpairedBefore) {
        if (codeBefore[i] instanceof SemanticDefinition && !(codeBefore[i].name in parentRenames)) {
            definitionsBefore.push(codeBefore[i].name);
        }
    }
    for (var j of unpairedAfter) {
        if (codeAfter[j] instanceof SemanticDefinition) {
            definitionsAfter.push(codeAfter[j].name);
        }
    }

    // A2) (Recursively) Calculate distances for potential renames and track lowest distance rename.
    while (true)
    {      
        var norename = FindCodeChangesShort(codeBefore, codeAfter, renamesList);
        var minDist = norename;
        var minRename = null;
        var minRenameIndex = null;

        for (var i in definitionsBefore) {
            for (var j in definitionsAfter) {
                if (!definitionsAfter.includes(definitionsBefore[i]))
                {
                    var origName = definitionsBefore[i];
                    var newName = definitionsAfter[j];     
                    var renamesList0 = {...renamesList};
                    renamesList0[origName] = newName;
                    var dist = FindCodeChangesShort(codeBefore, codeAfter, renamesList0);

                    if (dist < minDist) {
                        minDist = dist;
                        minRename = [origName, newName];
                        minRenameIndex = [i, j];
                    }
                }
            }
        }

        // A3) Pick lowest distance and continue if distance is low enough, or stop
        if (minRename !== null && minDist < renameTreshold * norename) {
            renamesList[minRename[0]] = minRename[1];
            definitionsBefore.splice(minRenameIndex[0],1);
            definitionsAfter.splice(minRenameIndex[1],1);
        }
        else {
            break;
        }
    }

    // B) Go from top to bottom in the destination list and compare each destination block with all unmoved source blocks
    for (var i = 0; i < unpairedAfter.length; i++) {

        var minimalDistance = addPenalty * codeAfter[i].getLengthInCharacters();
        var minimalIndexUB = -1;
        var minimalIndexB = -1;
        var minimalIndexA = i;
        var moveUpAmount = 0;

        for (var j0 = 0; j0 < unpairedBefore.length; j0++) {

            var j = unpairedBefore[j0];

            // B1) Try semantic matching with other blocks
            var distance = StatementDistance(codeBefore[j], codeAfter[i], renamesList);
            distance += moveUpAmount * swapPenalty;
            if (distance < minimalDistance) {
                minimalIndexA = i;
                minimalIndexB = j;
                minimalIndexUB = j0;
                minimalDistance = distance;
            }


            // B2) Try nonsemantic M-to-1
            var M = 1;
            var multiBefore = [codeBefore[j]];
            var multiAfter = [codeAfter[i]];
            var multiBeforeIndex = [j];
            distance = MultiStatementDistance(multiBefore, multiAfter, renamesList);

            while(true) {
                // Try increasing N
                if (j0 + M < unpairedBefore.length) {
                    var multiBefore2 = [...multiBefore];
                    var multiBeforeIndex2 = [...multiBeforeIndex];
                    multiBefore2.push(codeBefore[unpairedBefore[j0 + M]]);
                    multiBeforeIndex2.push(unpairedBefore[j0 + M]);

                    var multiDistance = MultiStatementDistance(multiBefore2, multiAfter, renamesList);

                    if (multiDistance < distance) {
                        M++;
                        multiBefore = multiBefore2;
                        multiBeforeIndex = multiBeforeIndex2;
                        distance = multiDistance;

                        continue;
                    }
                }
                break;
            }
            distance *= levenDifferencePenalty;
            distance += moveUpAmount * swapPenalty;
            if (distance < minimalDistance) {
                minimalIndexA = i;
                minimalIndexB = multiBeforeIndex;
                minimalIndexUB = j0;
                minimalDistance = distance;
            }

            // B3) Try nonsemantic 1-to-N
            var N = 1;
            multiBefore = [codeBefore[j]];
            multiAfter = [codeAfter[i]];
            var multiAfterIndex = [i];
            var distance = MultiStatementDistance(multiBefore, multiAfter, renamesList);

            while(true) {
                // Try increasing N
                if (i + N < unpairedAfter.length) {
                    var multiAfter2 = [...multiAfter];
                    var multiAfterIndex2 = [...multiAfterIndex];
                    multiAfter2.push(codeAfter[i + N]);
                    multiAfterIndex2.push(i + N);

                    var multiDistance = MultiStatementDistance(multiBefore, multiAfter2, renamesList);

                    if (multiDistance < distance) {
                        N++;
                        multiAfter = multiAfter2;
                        multiAfterIndex = multiAfterIndex2;
                        distance = multiDistance;

                        continue;
                    }
                }
                break;
            }
            distance *= levenDifferencePenalty;
            distance += moveUpAmount * swapPenalty;
            if (distance < minimalDistance) {
                minimalIndexA = multiAfterIndex;
                minimalIndexB = j;
                minimalIndexUB = j0;
                minimalDistance = distance;
            }

            moveUpAmount += codeBefore[j].getLengthInCharacters();
        }

        // Adding the output block is the best
        if (minimalIndexB == -1) {
            outputSources[minimalIndexA] = new CodeChange('+', [], {...renamesList});
        }
        // 1-to-N
        else if (Array.isArray(minimalIndexA)) {
            for (var p of minimalIndexA) outputSources[p] = new CodeChange('M' + minimalIndexB.toString(), [], {...renamesList});
            inputDestinations[minimalIndexB] = new CodeChange(minimalIndexA, [], {...renamesList});

            i += minimalIndexA.length - 1;
            unpairedBefore.splice(minimalIndexUB, 1);
        }
        // M-to-1
        else if (Array.isArray(minimalIndexB)) {
            for (var p of minimalIndexB) inputDestinations[p] = new CodeChange('M' + minimalIndexA.toString(), [], {...renamesList});
            outputSources[minimalIndexA] = new CodeChange(minimalIndexB, [], {...renamesList});
            unpairedBefore.splice(minimalIndexUB, minimalIndexB.length);
        }
        // 1-to-1 Rewrite
        else {
            inputDestinations[minimalIndexB] = new CodeChange(minimalIndexA, [], {...renamesList});
            outputSources[minimalIndexA] = new CodeChange(minimalIndexB, [], {...renamesList});
            unpairedBefore.splice(minimalIndexUB, 1);
        }

        codeDistance += minimalDistance;
    }

    // C) Unpaired blocks are assumed to be added or deleted.
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

                codeDistance += innerCodeMultiplierPenalty * innerChanges.distance;
        }
    }

    // E) Add list of tokens to the code change object for drawing GIFs.
    for (var index in inputDestinations) {
        inputDestinations[index].tokens = Array.from(codeBefore[index].getTokens());
    }
    for (var index in outputSources) {
        outputSources[index].tokens = Array.from(codeAfter[index].getTokens());
    }

    return new ListOfChanges(inputDestinations, outputSources, codeDistance, renamesList);
}

/**
 * Find distance between two source codes without further checking for renames.
 * @param {[BaseCodeBlock]} codeBefore The first source code in simplified representation.
 * @param {[BaseCodeBlock]} codeAfter The second source code in simplified representation.
 * @param {object} parentRenames List of renames considered from parent scopes.
 * @returns {number} Distance of the two source codes.
 */
function FindCodeChangesShort(codeBefore, codeAfter, parentRenames = {}) {
    
    // 0) Setup variables to hold final or intermediate results
    var inputDestinations = [];
    var outputSources = [];
    inputDestinations.length = codeBefore.length;
    outputSources.length = codeAfter.length;

    var codeDistance = 0;
    var unpairedBefore = [];
    var unpairedAfter = [];

    // 0.1) Keep track of what to pair
    for (var i = 0; i < codeBefore.length; i++) {
        unpairedBefore.push(i);
    }
    for (var i = 0; i < codeAfter.length; i++) {
        unpairedAfter.push(i);
    }
    
    // Go from top to bottom in the destination list and compare each destination block with all unmoved source blocks
    var renamesList = {...parentRenames};
    for (var i = 0; i < unpairedAfter.length; i++) {

        var minimalDistance = addPenalty * codeAfter[i].getLengthInCharacters();
        var minimalIndexUB = -1;
        var minimalIndexB = -1;
        var moveUpAmount = 0;

        for (var j0 = 0; j0 < unpairedBefore.length; j0++) {

            var j = unpairedBefore[j0];

            // B1) Try semantic matching with other blocks
            var distance = OneLevelDistance(codeBefore[j], codeAfter[i], renamesList) + moveUpAmount * swapPenalty;
            if (distance < minimalDistance) {
                minimalIndexB = j;
                minimalIndexUB = j0;
                minimalDistance = distance;
            }

            moveUpAmount += codeBefore[j].getLengthInCharacters();
        }

        // 1-to-1 Rewrite
        if (minimalIndexB != -1) {
            unpairedBefore.splice(minimalIndexUB, 1);
        }

        codeDistance += minimalDistance;
    }

    // B) Go from top to bottom in the destination list and compare each destination block with all unmoved source blocks
    for (var i = 0; i < unpairedAfter.length; i++) {

        var minimalDistance = addPenalty * codeAfter[i].getLengthInCharacters();
        var minimalIndexUB = -1;
        var minimalIndexB = -1;
        var minimalIndexA = i;
        var moveUpAmount = 0;

        for (var j0 = 0; j0 < unpairedBefore.length; j0++) {

            var j = unpairedBefore[j0];

            // B1) Try semantic matching with other blocks
            var distance = OneLevelDistance(codeBefore[j], codeAfter[i], renamesList);
            distance += moveUpAmount * swapPenalty;
            if (distance < minimalDistance) {
                minimalIndexA = i;
                minimalIndexB = j;
                minimalIndexUB = j0;
                minimalDistance = distance;
            }


            // B2) Try nonsemantic M-to-1
            var M = 1;
            var multiBefore = [codeBefore[j]];
            var multiAfter = [codeAfter[i]];
            var multiBeforeIndex = [j];
            distance = MultiStatementDistance(multiBefore, multiAfter, parentRenames);

            while(true) {
                // Try increasing N
                if (j0 + M < unpairedBefore.length) {
                    var multiBefore2 = [...multiBefore];
                    var multiBeforeIndex2 = [...multiBeforeIndex];
                    multiBefore2.push(codeBefore[unpairedBefore[j0 + M]]);
                    multiBeforeIndex2.push(unpairedBefore[j0 + M]);

                    var multiDistance = MultiStatementDistance(multiBefore2, multiAfter, parentRenames);

                    if (multiDistance < distance) {
                        M++;
                        multiBefore = multiBefore2;
                        multiBeforeIndex = multiBeforeIndex2;
                        distance = multiDistance;

                        continue;
                    }
                }
                break;
            }
            distance *= levenDifferencePenalty;
            distance += moveUpAmount * swapPenalty;
            if (distance < minimalDistance) {
                minimalIndexA = i;
                minimalIndexB = multiBeforeIndex;
                minimalIndexUB = j0;
                minimalDistance = distance;
            }

            // B3) Try nonsemantic 1-to-N
            var N = 1;
            multiBefore = [codeBefore[j]];
            multiAfter = [codeAfter[i]];
            var multiAfterIndex = [i];
            var distance = MultiStatementDistance(multiBefore, multiAfter, parentRenames);

            while(true) {
                // Try increasing N
                if (i + N < unpairedAfter.length) {
                    var multiAfter2 = [...multiAfter];
                    var multiAfterIndex2 = [...multiAfterIndex];
                    multiAfter2.push(codeAfter[i + N]);
                    multiAfterIndex2.push(i + N);

                    var multiDistance = MultiStatementDistance(multiBefore, multiAfter2, parentRenames);

                    if (multiDistance < distance) {
                        N++;
                        multiAfter = multiAfter2;
                        multiAfterIndex = multiAfterIndex2;
                        distance = multiDistance;

                        continue;
                    }
                }
                break;
            }
            distance *= levenDifferencePenalty;
            distance += moveUpAmount * swapPenalty;
            if (distance < minimalDistance) {
                minimalIndexA = multiAfterIndex;
                minimalIndexB = j;
                minimalIndexUB = j0;
                minimalDistance = distance;
            }

            moveUpAmount += codeBefore[j].getLengthInCharacters();
        }

        // Adding the output block is the best
        if (minimalIndexB == -1) {
            outputSources[minimalIndexA] = new CodeChange('+', [], {...renamesList});
        }
        // 1-to-N
        else if (Array.isArray(minimalIndexA)) {
            for (var p of minimalIndexA) outputSources[p] = new CodeChange('M' + minimalIndexB.toString(), [], {...renamesList});
            inputDestinations[minimalIndexB] = new CodeChange(minimalIndexA, [], {...renamesList});

            i += minimalIndexA.length - 1;
            unpairedBefore.splice(minimalIndexUB, 1);
        }
        // M-to-1
        else if (Array.isArray(minimalIndexB)) {
            for (var p of minimalIndexB) inputDestinations[p] = new CodeChange('M' + minimalIndexA.toString(), [], {...renamesList});
            outputSources[minimalIndexA] = new CodeChange(minimalIndexB, [], {...renamesList});
            unpairedBefore.splice(minimalIndexUB, minimalIndexB.length);
        }
        // 1-to-1 Rewrite
        else {
            inputDestinations[minimalIndexB] = new CodeChange(minimalIndexA, [], {...renamesList});
            outputSources[minimalIndexA] = new CodeChange(minimalIndexB, [], {...renamesList});
            unpairedBefore.splice(minimalIndexUB, 1);
        }

        codeDistance += minimalDistance;
    }

    // D) RECURSION: Blocks with innerCode will have their changes calculated as well
    for (var i in codeBefore)
    {
        var goalAdress = inputDestinations[i]?.address;
        if (goalAdress !== undefined && goalAdress != 'x' && goalAdress in codeAfter &&
            (codeAfter[goalAdress] instanceof BaseCommandList && codeBefore[i] instanceof BaseCommandList)) {
                var innerChanges = FindCodeChanges(codeBefore[i].innerCode, codeAfter[goalAdress].innerCode, renamesList);

                inputDestinations[i] = new CodeChange(goalAdress,innerChanges.inputDestinations, {...renamesList});
                outputSources[goalAdress] = new CodeChange(parseInt(i),innerChanges.outputSources, {...renamesList});

                codeDistance += innerCodeMultiplierPenalty * innerChanges.distance;
        }
    }

    return codeDistance;
}

/**
 * Returns a CodeChange object based on supplied list of changes instead of an automatically found one.
 * @param {BaseCodeBlock[]} codeBefore The first source code in simplified representation.
 * @param {BaseCodeBlock[]} codeAfter The second source code in simplified representation.
 * @param {ListOfChanges} changesBefore The list of changes to consider for 'before' code.
 * @param {ListOfChanges} changesAfter The list of changes to consider for 'after' code.
 * @returns 
 */
export function SupplyCodeChanges(codeBefore, codeAfter, changesBefore, changesAfter) {
    AddTokenData(codeBefore, changesBefore);
    AddTokenData(codeAfter, changesAfter);

    return new ListOfChanges(changesBefore, changesAfter, 0, changesBefore.renames);
}

/**
 * Given a list of changes and related block of code, adds tokens from the code block to the list of changes.
 * @param {BaseCodeBlock[]} code The block of code to get tokens from.
 * @param {ListOfChanges} changes The list of changes to add the tokens to.
 */
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

/**
 * Forces inner execution of distance algorithm for a one-block code.
 * @param {BaseCodeBlock[]} codeBefore The first one-block source code in simplified representation.
 * @param {BaseCodeBlock[]} codeAfter The second one-block source code in simplified representation.
 * @param {object} parentRenames List of renames considered from parent scopes.
 * @returns {ListOfChanges} Object containing information about related blocks of code, distance and renames.
 */
function FindCodeChanges_Special_OneBlock(codeBefore, codeAfter, parentRenames = {}) {
    var localChanges = FindCodeChanges(codeBefore[0].innerCode, codeAfter[0].innerCode, parentRenames);
    var inputDestinations = [undefined];
    var outputSources = [undefined];
    inputDestinations[0] = new CodeChange(0, localChanges.inputDestinations, {...localChanges.renames});
    outputSources[0] = new CodeChange(0, localChanges.outputSources, {...localChanges.renames});
    return new ListOfChanges(inputDestinations, outputSources, localChanges.distance, {...localChanges.renames});
}

/**
 * Keeps information about a source and a destination block of code being related based on distance calculation.
 */
export class CodeChange {
    /**
     * Creates an instance of CodeChange.
     * @param {*} address Object representing address of the related block, usually a number.
     * @param {CodeChange[]} children List of child CodeChanges, relating child code of the blocks this instance relates.
     * @param {object} renames List of renames that are to be executed at the scope of child blocks of the block this instance describes.
     */
    constructor (address, children, renames) {
        this.address = address;
        this.children = children;
        this.renames = renames;
    }

    /**
     * Returns number of children objects of this CodeChange object.
     */
    get length() {
        this.children.length;
    }

}

/**
 * Keeps information about distance of two source codes and a lists of related blocks and renames, which can be used to atain path of this distance.
 */
export class ListOfChanges {
    /**
     * Creates an instance of ListOfChanges.
     * @param {CodeChange[]} inputDestinations List of CodeChanges relating blocks in the 'before' code to the ones in the 'after' code.
     * @param {CodeChange[]} outputSources List of CodeChanges relating blocks in the 'after' code to the ones in the 'before' code.
     * @param {number} distance Distance of the two source codes.
     * @param {object} renames List of renames considered at the scope of the current code.
     */
    constructor (inputDestinations, outputSources, distance, renames) {
        this.inputDestinations = inputDestinations;
        this.outputSources = outputSources;
        this.distance = distance;
        this.renames = renames;
    }

}

/**
 * Checks two lists of tokens for equality, considering a list of renames.
 * @param {TokenInfo[]} list1 The first list of tokens to check.
 * @param {TokenInfo[]} list2 The second list of tokens to check.
 * @param {object} renames The renames to apply to the first list.
 * @returns {boolean} Boolean indicating equality of the lists.
 */
export function CheckTokensEqual(list1, list2, renames = {}) {
    if (list1.length === list2.length) return list1.every((l, i) => (
        (!l.isIdentifier && !list2[i].isIdentifier && l.text === list2[i].text) ||
        (l.isIdentifier && list2[i].isIdentifier && Rename(l.text, renames) == list2[i].text)));
    return false;
}

/**
 * Checks two identifier lists for equality.
 * @param {string[]} list1 The first list of identifiers to check.
 * @param {string[]} list2 The second list of identifiers to check.
 * @param {object} renames The renames to apply to the first list.
 * @returns {boolean} Boolean indicating equality of the lists.
 */
function CheckIdentifierListsEqual(list1, list2, renames = {}) {
    var newList1 = RenameElementsOfList(list1, renames);
    if (newList1.length === list2.length) return newList1.every((l, i) => l === list2[i]);
    return false;
}

/**
 * Asigns distance to a pair of identifier lists.
 * @param {*} list1 The first list of identifiers to check.
 * @param {*} list2 The second list of identifiers to check.
 * @param {*} renames The renames to apply to the first list.
 * @returns {number} Distance of the two lists.
 */
function ListDistance(list1, list2, renames = {}) {
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

/**
 * Checks two list of codeblocks for equality.
 * @param {BaseCodeBlock[]} code1 The first list of codeblocks to check.
 * @param {BaseCodeBlock[]} code2 The second list of codeblocks to check.
 * @param {object} renames The renames to apply to the first list.
 * @returns {Boolean} Boolean indicating equality of the lists.
 */
function checkCodeListForEquality(code1, code2, renames = {}) {
    if (code1.length === code2.length) return code1.every((c, i) => checkStatementsForEquality(c, code2[i], renames));
    return false;
}

/**
 * Checks two codeblocks for equality.
 * @param {BaseCodeBlock} block1 The first codeblock to check.
 * @param {BaseCodeBlock} block2 The second codeblock to check.
 * @param {object} renames The renames to apply to the first block.
 * @returns {Boolean} Boolean indicating equality of the blocks.
 */
function checkStatementsForEquality(block1, block2, renames = {}) {
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        return (
            block1.definitionType == block2.definitionType
            && Rename(block1.name, renames) == block2.name
            && CheckIdentifierListsEqual(block1.paramList, block2.paramList, renames)
            && CheckIdentifierListsEqual(block1.dependentOn, block2.dependentOn, renames)
            && checkCodeListForEquality(block1.innerCode, block2.innerCode, renames));
    }
    else if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        return (
            CheckIdentifierListsEqual(block1.dependingVariables, block2.dependingVariables, renames)
            && CheckIdentifierListsEqual(block1.dependentOn, block2.dependentOn, renames)
            && CheckTokensEqual(block1.tokens, block2.tokens, renames));
    }
    else if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        return (
            block1.decisionType === block2.decisionType
            && CheckIdentifierListsEqual(block1.paramList, block2.paramList, renames)
            && CheckIdentifierListsEqual(block1.dependentOn, block2.dependentOn, renames)
            && checkCodeListForEquality(block1.innerCode, block2.innerCode, renames));
    }
    else if (block1 instanceof NonsemanticText && block2 instanceof NonsemanticText) {
        return (
            block1.specialType === block2.specialType
            && CheckTokensEqual(block1.tokens, block2.tokens, renames));
    }
    return false;
}

/**
 * Compares two codeblocks and returns their distance.
 * @param {BaseCodeBlock} block1 The first codeblock to compare.
 * @param {BaseCodeBlock} block2 The second codeblock to compare.
 * @param {object} renames The renames to apply to the first block.
 * @returns {number} Distance of the two blocks.
 */
function StatementDistance(block1, block2, renames = {}) {

    var mininimal = maxDistance;

    // Any pair of blocks: try Nonsemantic Rewrite
    if (block1 !== undefined && block2 !== undefined) {
        var rawText1 = block1.getText(renames);
        var rawText2 = block2.getText();

        var levenDistance = leven(rawText1, rawText2);
        var codeDistance = levenDifferencePenalty * levenDistance;

        if (codeDistance < mininimal) mininimal = codeDistance;
    }

    // Pairs of blocks of same type: try Semantic Rewrite
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        
        if (block1.definitionType == block2.definitionType && Rename(block1.name, renames) === block2.name) return 0;

        var codeDistance = 0;

        // Penalties for individual properties of the semantic block
        if (block1.definitionType != block2.definitionType) codeDistance += differentDefinitionTypePenalty;
        if (Rename(block1.name, renames) != block2.name) codeDistance += differentDefinitionNamePenalty;
        codeDistance += missingParamPenalty * ListDistance(RenameElementsOfList(block1.paramList, renames), block2.paramList);
        codeDistance += missingDependentVariablePenalty * ListDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);

        // Penalty for inner code difference
        var changes = FindCodeChanges(block1.innerCode, block2.innerCode, renames)
        codeDistance += innerCodeMultiplierPenalty * changes.distance;

        if (codeDistance < mininimal) mininimal = codeDistance;
    }
    else if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        var codeDistance = 0;

        // Penalties for individual properties of the semantic block
        codeDistance += missingDependingVariablePenalty * ListDistance(RenameElementsOfList(block1.dependingVariables, renames), block2.dependingVariables);
        codeDistance += missingDependentVariablePenalty * ListDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);

        // Penalty for inner code difference (Levensthein Distance)
        var rawText1 = block1.getText(renames);
        var rawText2 = block2.getText();
        var levenDistance = leven(rawText1, rawText2);

        codeDistance += innerCodeMultiplierPenalty * levenDistance;

        if (codeDistance < mininimal) mininimal = codeDistance;
    }
    else if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        var codeDistance = 0;

        // Penalties for individual properties of the semantic block
        if (block1.decisionType != block2.decisionType) codeDistance += differentDecisionTypePenalty;
        codeDistance += missingParamPenalty * ListDistance(RenameElementsOfList(block1.paramList, renames), block2.paramList);
        codeDistance += missingDependentVariablePenalty * ListDistance(RenameElementsOfList(block1.dependentOn, renames), block2.dependentOn);

        // Penalty for inner code difference
        var changes = FindCodeChanges(block1.innerCode, block2.innerCode, renames)
        codeDistance += innerCodeMultiplierPenalty * changes.distance;

        if (codeDistance < mininimal) mininimal = codeDistance;
    }
    else if (block1 instanceof NonsemanticText && block2 instanceof NonsemanticText) {
        if (block1.specialType !== undefined && block1.specialType == block2.specialType) return 0;
    }

    // Return
    return mininimal;
}

/**
 * Compares two groups of codeblocks and returns their M-to-N distance.
 * @param {BaseCodeBlock[]} blocks1 The first group of codeblocks to compare.
 * @param {BaseCodeBlock[]} blocks2 The second group of codeblocks to compare.
 * @param {object} renames The renames to apply to the first group.
 * @returns 
 */
function MultiStatementDistance(blocks1, blocks2, renames = {}) {
    var rawText1 = "";
    var rawText2 = "";

    for (var block of blocks1) rawText1 += block.getText(renames);
    for (var block of blocks2) rawText2 += block.getText();
    var levenDistance = leven(rawText1, rawText2);

    if (maxDistance > levenDistance) return levenDistance;
    else return maxDistance;
}

/**
 * Returns distance of two block after flatening them. This is faster, than StatementDistance.
 * @param {BaseCodeBlock} block1 The first codeblock to compare.
 * @param {BaseCodeBlock} block2 The second codeblock to compare.
 * @param {object} renames The renames to apply to the first block.
 * @returns {number} Distance of the two blocks.
 */
function OneLevelDistance(block1, block2, renames = {}) {
    return StatementDistance(ConvertBlockToOneLevel(block1), ConvertBlockToOneLevel(block2), renames);
}

/**
 * Flatens a block of code to a single level.
 * @param {BaseCodeBlock} block The block to flatten.
 * @returns {BaseCodeBlock} The flattened block
 */
function ConvertBlockToOneLevel(block) {
    if (block instanceof SemanticDefinition) {
        var innerTokens = [...block.getTokens()];
        return new SemanticDefinition(block.dependentOn, block.paramList, [new NonsemanticText(innerTokens)], block.definitionType, block.name);
    }
    else if (block instanceof SemanticAction) {
        return new SemanticAction(block.dependingVariables, block.dependentOn, block.tokens);
    }
    else if (block instanceof SemanticDecision) {
        var innerTokens = [...block.getTokens()];
        return new SemanticDecision(block.dependentOn, block.paramList, [new NonsemanticText(innerTokens)], block.decisionType);
    }
    else if (block instanceof NonsemanticText) {
        return block;
    }
    else {
        throw Error("No action take in 'ConvertBlockToOneLevel' in 'distance.js'. This shouldn't happen")
    }
}

/**
 * Given a list of identifiers, returns a new list with all identifiers renamed.
 * @param {string[]} original The list of identifiers to apply renames to.
 * @param {object} renames The renames to apply to the identifiers.
 * @returns {string[]} New names of the original identifiers.
 */
function RenameElementsOfList(original, renames = {}) {
    var newList = [];
    for (var element of original) {
        newList.push(Rename(element, renames));
    }
    return newList;
}

/**
 * Given a identifier, returns its new name after applying renames.
 * @param {string} original The identifier to apply renames to.
 * @param {object} renames The renames to apply to the identifier.
 * @returns {string} New name of the original identifier.
 */
function Rename(original, renames = {}) {
    if (original in renames) {
        return renames[original];
    }
    else return original;
}