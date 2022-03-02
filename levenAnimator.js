// Executes matrix-form of Levenshtein distance calculation in O(n^2)
// and extracts individual changes for animation

export function LevenChanges(inputString, outputString)
{
    // TODO: String length 0

    var height = inputString.length + 1;
    var width = outputString.length + 1;

    var matrix = new Array(height);

    // First column fill-in + row init
    for (var i = 0; i < height; i++) {
        matrix[i] = new Array(width);
        matrix[i][0] = i;
    }

    // First row fill-in
    for (var i = 0; i < width; i++) {
        matrix[0][i] = i;
    }

    // Leven distance calculation
    for (var i = 1; i < height; i++) {
        for (var j = 1; j < width; j++) {
            if (inputString[i - 1] == outputString[j - 1]) {
                matrix[i][j] = matrix[i-1][j-1];
            }
            else {
                matrix[i][j] = 1 + Math.min(matrix[i-1][j-1], matrix[i][j-1], matrix[i-1][j]);
            }
        }
    }

    // Shortest path extraction
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
            retList.push(['o', inputString[posI]]);
        }
        else {
            console.error("Implementation of LevenChanges in levenAnimator.js is wrong. This shouldn't happen.");
        }
    }

    // Return
    return retList;
}