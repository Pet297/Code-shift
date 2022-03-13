// Executes matrix-form of Levenshtein distance calculation in O(n^2)
// and extracts individual changes for animation

// TODO: Eliminate 2 same long functions replacing them by 1 long + 2 short fcs.

export default function LevenChanges(inputString, outputString)
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
    retList.reverse();

    // Connect related entries
    var unchangedRegion = null;
    var retlist2 = [];
    var tempString0 = "";
    var tempString1 = "";
    for (var entry of retList) {

        if (unchangedRegion === null) {
            if (entry[0] == 'o') unchangedRegion = true;
            else unchangedRegion = false;
        }

        if (unchangedRegion && entry[0] != 'o') {
            unchangedRegion = false;
            retlist2.push(tempString0);
            tempString0 = "";
        }
        else if (!unchangedRegion && entry[0] == 'o') {
            unchangedRegion = true;
            retlist2.push([tempString0,tempString1]);
            tempString0 = "";
            tempString1 = "";
        }

        if (unchangedRegion) tempString0 += entry[1];
        else if (!unchangedRegion) {
            if (entry[0] == '+') tempString1 += entry[1];
            else if (entry[0] == 'x') tempString0 += entry[1];
            else if (entry[0] == 'C') {
                tempString0 += entry[1];
                tempString1 += entry[2];
            }
        }
    }

    if (unchangedRegion) {
        if (tempString0.length > 0) retlist2.push(tempString0);
    }
    else if (!unchangedRegion) {
        if (tempString0.length + tempString1.length > 0) retlist2.push([tempString0,tempString1]);
    }

    // Return
    return retlist2;
}

export function LevenChangesColored(inputString, outputString)
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
            if (inputString[i - 1][0] == outputString[j - 1][0]) {
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
    retList.reverse();

    // Connect related entries
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
            retlist2.push(tempString0);
            tempString0 = [];
        }
        else if (!unchangedRegion && entry[0] == 'o') {
            unchangedRegion = true;
            retlist2.push([tempString0,tempString1]);
            tempString0 = [];
            tempString1 = [];
        }

        if (unchangedRegion) tempString0.push(entry[1]);
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
        if (tempString0.length > 0) retlist2.push(tempString0);
    }
    else if (!unchangedRegion) {
        if (tempString0.length + tempString1.length > 0) retlist2.push([tempString0,tempString1]);
    }

    // Return
    return retlist2;
}

// TODO: Class "Unchanging" + "Changing"