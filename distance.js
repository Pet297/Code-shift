// The smaller the number, the more severe the penalty
const missingDependingVariablePenalty = -100;
const missingParamPenalty = -10;
const differentDefinitionType = -2;
const differentDefinitionName = -5;
const swapPenalty = -5;               // oabcde  => abcdeo counts as 1 swap, not 5

const codeDifferenceMultiplier = 2;

// Something like this should be returned
    /*
    removedBlocksLeft = []
    removedBlocksRight = []
    addedBlocksLeft = []
    addedBlocksRight = []
    duplicatedBlocksLeft = []
    duplicatedBlocksRight = []
    + "move block into a function (definition of another block)"
    + "meaningless plain text became code - (eg. a comment was uncomennted)"
    */

export default function codeChangesNoRename(codeBefore, codeAfter) {

    // 0) Setup array to calculate result
    relatedPairs = []

    // A) BRUTE FORCE SECTION

    // A1) List all pairs of the same blocks - supposedly unchanged code, though there could be new duplicities
    equalPairs = [];
    for (i = 0; i < codeBefore.length; i++) {
        for (j = 0; j < codeAfter.length; j++) {
            if (checkForEquality(block1, block2) == true)
            {
                equalPairs.push([i,j]);
            }
        }
    }

    // A2) If any number appears on just once on 1 side, assume that's the unchanged part

    for (i = 0; i < codeBefore.length; i++) {
        appearances = 0;
        index = -1;
        for (j = 0; j < equalPairs.length; j++) {
            if (pair[0] == i) {
                appearances++;
                index = j;
            }
        }
        if (appearances == 1) {
            relatedPairs.push(equalPairs[index])
            equalPairs.splice(index, 1);
        }
    }

    for (i = 0; i < codeAfter.length; i++) {
        appearances = 0;
        index = -1;
        for (j = 0; j < equalPairs.length; j++) {
            if (pair[1] == i) {
                appearances++;
                index = j;
            }
        }
        if (appearances == 1) {
            relatedPairs.push(equalPairs[index])
            equalPairs.splice(index, 1);
        }
    }

    //TODO: Repeat A3 until nothing found

    // HEURISTIC SECTION
    while (codeBefore.length > 0 || codeAfter.length > 0) {

    }

    //SemanticDefinition(paramList,localCode,definitionType,name)
    //SemanticAction(dependingVariables, dependentOn)
    //SemanticDecision(dependentOn,perConditionCode,conditionType)

    //return list of changes
}

function checkForEquality(block1, block2) {
    if (block1 instanceof SemanticDefinition && block2 instanceof SemanticDefinition) {
        //TODO:
    }
    if (block1 instanceof SemanticAction && block2 instanceof SemanticAction) {
        //TODO:
    }
    if (block1 instanceof SemanticDecision && block2 instanceof SemanticDecision) {
        //TODO:
    }
}

function compareForDistance() {

}