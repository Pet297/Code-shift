/**
 * Executes matrix-form of Levenshtein distance and extracts individual changes for animation.
 * @param {[string,string][]} inputString
 * List of 2-tuples representing colored text before the change.
 * First element of the two tuple is a string.
 * Second element of the 2-tuple is the color of this string.
 * @param {[string,string][]} outputString
 * List of 2-tuples representing colored text after the change.
 * First element of the two tuple is a string.
 * Second element of the 2-tuple is the color of this string.
 * @returns {(UnchangedLevenPart | ChangingLevenPart)[]}
 * Partitioned colored strings representing how they should be animated,
 * while transitioning from one to the other.
 */
export function LevenChangesColored(inputString, outputString)
{
    // A) Preparation
    var height = inputString.length + 1;
    var width = outputString.length + 1;

    var matrix = new Array(height);
    matrix[0] = new Array(width);
    matrix[0][0] = 0;

    // First column fill-in + row init
    for (var i = 0; i < height; i++) {
        matrix[i] = new Array(width);
        matrix[i][0] = i;
    }

    // First row fill-in
    for (var i = 0; i < width; i++) {
        matrix[0][i] = i;
    }

    // B) Leven distance calculation
    for (var i = 1; i < height; i++) {
        for (var j = 1; j < width; j++) {
            if (inputString[i - 1][0] == outputString[j - 1][0]) {
                matrix[i][j] = matrix[i-1][j-1];
            }
            else {
                matrix[i][j] = 1 + Math.min(matrix[i-1][j-1], matrix[i][j-1], matrix[i-1][j]);
            }
        }
    }

    // C) Shortest path extraction
    var retList = [];
    var posI = height - 1;
    var posJ = width - 1;
    while (posI != 0 || posJ != 0) {
        // auto-add prefix
        if (posI == 0) {
            posJ--;
            retList.push(['+', outputString[posJ]]);
        }
        // auto-remove prefix
        else if (posJ == 0) {
            posI--;
            retList.push(['x', inputString[posI]]);
        }
        // substitution
        else if (matrix[posI][posJ] == matrix[posI-1][posJ-1] + 1) {
            posI--;
            posJ--;
            retList.push(['C', inputString[posI], outputString[posJ]]);
        }
        // addition
        else if (matrix[posI][posJ] == matrix[posI][posJ-1] + 1) {
            posJ--;
            retList.push(['+', outputString[posJ]]);
        }
        // deletion
        else if (matrix[posI][posJ] == matrix[posI-1][posJ] + 1) {
            posI--;
            retList.push(['x', inputString[posI]]);
        }
        // no change
        else if (matrix[posI][posJ] == matrix[posI-1][posJ-1]) {
            posI--;
            posJ--;
            retList.push(['o', inputString[posI], outputString[posJ]]);
        }
        else {
            throw Error("No action taken in LevenChangesColored in levenAnimator.js. This shouldn't happen.");
        }
    }
    retList.reverse();

    // D) Connect related entries
    var unchangedRegion = null;
    var retlist2 = [];
    var tempString0 = [];
    var tempString1 = [];
    for (var entry of retList) {

        if (unchangedRegion === null) {
            if (entry[0] == 'o') unchangedRegion = true;
            else unchangedRegion = false;
        }

        if (unchangedRegion && entry[0] != 'o') {
            unchangedRegion = false;
            retlist2.push(new UnchangedLevenPart(tempString0,tempString1));
            tempString0 = [];
            tempString1 = [];
        }
        else if (!unchangedRegion && entry[0] == 'o') {
            unchangedRegion = true;
            retlist2.push(new ChangingLevenPart(tempString0,tempString1));
            tempString0 = [];
            tempString1 = [];
        }

        if (unchangedRegion)
        {
            tempString0.push(entry[1]);
            tempString1.push(entry[2]);
        }
        else if (!unchangedRegion) {
            if (entry[0] == '+') tempString1.push(entry[1]);
            else if (entry[0] == 'x') tempString0.push(entry[1]);
            else if (entry[0] == 'C') {
                tempString0.push(entry[1]);
                tempString1.push(entry[2]);
            }
        }
    }

    if (unchangedRegion) {
        if (tempString0.length > 0) retlist2.push(new UnchangedLevenPart(tempString0, tempString1));
    }
    else if (!unchangedRegion) {
        if (tempString0.length + tempString1.length > 0) retlist2.push(new ChangingLevenPart(tempString0,tempString1));
    }

    return retlist2;
}

/**
 * Represents a colored string, which doesn't change (in text) during rewrite animation.
 * The color of the string might still change.
 */
export class UnchangedLevenPart {
    /**
     * Creates an instance of UnchangedLevenPart.
     * @param {[string, string][]} before
     * List of 2-tuples representing colored text before the change.
     * First element of the two tuple is a string.
     * Second element of the 2-tuple is the color of this string.
     * @param {[string, string][]} after
     * List of 2-tuples representing colored text after the change.
     * First element of the two tuple is a string.
     * Second element of the 2-tuple is the color of this string.
     */
    constructor(before, after) {
        /**
         * List of 2-tuples representing colored text before the change.
         * First element of the two tuple is a string.
         * Second element of the 2-tuple is the color of this string.
         * @type {[string, string][]}
         */
        this.before = before;
        /**
         * List of 2-tuples representing colored text after the change.
         * First element of the two tuple is a string.
         * Second element of the 2-tuple is the color of this string.
         * @type {[string, string][]}
         */
        this.after = after;
    }
}
/**
 * Represents a colored sstring, which changes during rewrite animation.
 */
export class ChangingLevenPart {
    /**
     * Creates an instance of ChangingLevenPart.
     * @param {[string, string][]} before
     * List of 2-tuples representing colored text before the change.
     * First element of the two tuple is a string.
     * Second element of the 2-tuple is the color of this string.
     * @param {[string, string][]} after
     * List of 2-tuples representing colored text after the change.
     * First element of the two tuple is a string.
     * Second element of the 2-tuple is the color of this string.
     */
    constructor(before, after) {
        /**
         * List of 2-tuples representing colored text before the change.
         * First element of the two tuple is a string.
         * Second element of the 2-tuple is the color of this string.
         * @type {[string, string][]}
         */
        this.before = before;
        /**
         * List of 2-tuples representing colored text after the change.
         * First element of the two tuple is a string.
         * Second element of the 2-tuple is the color of this string.
         * @type {[string, string][]}
         */
        this.after = after;
    }
}