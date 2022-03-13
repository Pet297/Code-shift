import fs from 'fs';
import gm from 'gm';
import os from 'os';
import { LevenChanges, LevenChangesColored, ChangingLevenPart, UnchangedLevenPart } from './levenAnimator.js';
import { GetTokenInfo } from './ruleTranslator.js';

// CONSTANTS
const lineSpacing = 20;
const firstLineY = 25;
const firstCharX = 10;
const lineWidth = 400;
const lineHighlightOffset = 5;

const fontSize = 15;
const fontWidth = 8; // Specific for Consolas at 15
const tabSpaces = 4;

// IMPORTANT FUNCTIONS
function StartNewGIF() {
    var imageMagick = gm.subClass({imageMagick: true});
    var gms = imageMagick(400,400,'#000F')
    .setFormat('gif')
    .fill('#ffffff')
    .font('Consolas')
    .fontSize(fontSize);
    return gms;
}
function DrawLines(gms, lines, y0, xoffset = 0) {
    var i = 0;
    for(var s of lines)
    {
        var spaces = 0;
        var s0 = s;
        var firstLine = Math.max(1 - i, 0);

        while(true)
        {
            if (s0.charAt(0) == ' ')
            {
                spaces++;
                s0 = s0.substring(1);
            }
            else if (s0.charAt(0) == '\t')
            {
                spaces += tabSpaces;
                s0 = s0.substring(1);
            }
            else break;
        }
        spaces += xoffset;

        gms.drawText(xoffset * fontWidth * firstLine + firstCharX, y0 + lineSpacing * i, s0);
        i++;
    }
}
function DrawColoredLines(gms, lines, textColor, y0, xoffset = 0) {
    for(var i = 0; i <= lines.length - 1; i++) {
        gms.fill(textColor);

        var spaces = 0;
        var s0 = lines[i];

        while(true)
        {
            if (s0.charAt(0) == ' ')
            {
                spaces++;
                s0 = s0.substring(1);
            }
            else if (s0.charAt(0) == '\t')
            {
                spaces += tabSpaces;
                s0 = s0.substring(1);
            }
            else break;
        }
        spaces += xoffset;

        gms.drawText(xoffset * fontWidth + firstCharX, y0 + lineSpacing * i, s0);
        i++;
    }
}
function DrawHighlitedLines(gms, lines, highlightColor, textColor, y0, xoffset = 0) {
    for(var i = 0; i <= lines.length - 1; i++) {
        //TODO: chyba?
        gms.fill(highlightColor);
        gms.drawRectangle(0, y0 + lineSpacing * i + lineHighlightOffset, lineWidth, y0 + lineSpacing * i + lineHighlightOffset - lineSpacing);
        gms.fill(textColor);

        var spaces = 0;
        var s0 = lines[i];

        while(true)
        {
            if (s0.charAt(0) == ' ')
            {
                spaces++;
                s0 = s0.substring(1);
            }
            else if (s0.charAt(0) == '\t')
            {
                spaces += tabSpaces;
                s0 = s0.substring(1);
            }
            else break;
        }
        spaces += xoffset;

        gms.drawText(xoffset * fontWidth + firstCharX, y0 + lineSpacing * i, s0);
        i++;
    }
}

// PUBLIC INTERFACE

const JS_NOCLASS = 0;
const JS_KEYWORD = 1;
const JS_IDENTIFIER = 2;
const JS_NUMERICCONSTANT = 3;
const JS_STRINGCONSTANT = 4;
const JS_CONSTANT = 5;
const JS_OPERATOR = 6;
const JS_COMMENT = 7;
const JS_COLOR = ['#606060', '#C040C0', '#A0A0FF', '#80FF40', '#E04040', '#4040FF', '#BBBBBB', '#00A000'];

export function WriteGifFileSH(tokens,filename,resolve) {
    var gms = StartNewGIF();
    var x = 0;
    var y = 0;

    for (var token of tokens) {
        var textC = JS_COLOR[textC.colorClass];

        if (token.text == '\n') {
            y++;
            x = 0;
        }
        else if (token.text == '\r') {
            
        }
        else {
            DrawColoredLines(gms,[token.text],textC,y * lineSpacing + firstLineY,x);
            x += token.text.length;
        }
    }

    gms.write(filename, ()=>{resolve()});
}

export function WriteGifFileSHMove(tokens,percentage,filename,resolve) {
    var gms = StartNewGIF();
    var x = 0;
    var y = 0;
    var nl = '\n';
    if (os.EOL == '\r') nl = '\r';

    var oldPos = [];
    var newPos = [];

    // Positions before
    x = 0;
    y = 0;
    for (var token of tokens) {
        oldPos.push({x:x, y:y});
        if (token instanceof TokenInfo) {
            if (token.text == nl) { y++; x = 0}
            else if (token.text == '\n' || token.text == '\r') {}
            else if (token.text == '\t') { x += tabSpaces; x -= x % tabSpaces }
            else x += token.text.length;
        }
        else {
            var text2 = "";
            for (var token2 of token[0]) {
                if (token2.text == nl) { y++; x = 0}
                else if (token2.text == '\n' || token.text == '\r') {}
                else if (token2.text == '\t') { x += tabSpaces; x -= x % tabSpaces }
                else x += token2.text.length;
            }
        }
    }

    // Positions after
    x = 0;
    y = 0;
    for (var token of tokens) {
        oldPos.push({x:x, y:y});
        if (token instanceof TokenInfo) {
            if (token.text == nl) { y++; x = 0}
            else if (token.text == '\n' || token.text == '\r') {}
            else if (token.text == '\t') { x += tabSpaces; x -= x % tabSpaces }
            else x += token.text.length;
        }
        else {
            var text2 = "";
            for (var token2 of token[1]) {
                if (token2.text == nl) { y++; x = 0}
                else if (token2.text == '\n' || token.text == '\r') {}
                else if (token2.text == '\t') { x += tabSpaces; x -= x % tabSpaces }
                else x += token2.text.length;
            }
        }
    }

    // Draw
    for (var i = 0; i < tokens.length; i++) { 
        var textC = JS_COLOR[textC.colorClass];

        if (token[i].text != '\n' && token[i].text != '\r' && token[i].text != '\t') {
            var pxa = (1-percentage) * oldPos[i].x + percentage * newPos[i].x;
            var pya = (1-percentage) * oldPos[i].y + percentage * newPos[i].y;
            DrawColoredLines(gms,[token.text],textC,pya * lineSpacing + firstLineY,pxa);
        }
        else if (!(token[i] instanceof TokenInfo)) {
            var coloredText1 = [];
            var coloredtext2 = [];

            // 1) Build colored strings
            for (var token2 of token[i][0]) {
                for (var j = 0; j < token2.text.length; j++) {
                    coloredText1.push([token2.text[j],token2.colorClass]);
                }
            }
            for (var token2 of token[i][1]) {
                for (var j = 0; j < token2.text.length; j++) {
                    coloredText2.push([token2.text[j],token2.colorClass]);
                }
            }

            // 2) Get changes
            var changingTextFull = LevenChangesColored(coloredText1, coloredtext2);

            // 3) Calculate old and new positions for every char
            var listMove = [];
            var listAdd = [];
            var listDel = [];

            var x1 = oldPos[i].x;
            var y1 = oldPos[i].y;
            var x2 = newPos[i].x;
            var y2 = newPos[i].y;
            for (var part of changingTextFull) {
                if (part instanceof UnchangedLevenPart) {
                    // Both same length
                    for (var char of part.part) {
                        //             char     color 1  color 2  b.x b.y a.x a.y
                        listMove.push([char[0], char[1], char[2], x1, y1, x2, y2]);

                        if (char[0] == nl) { y1++; x1 = 0; y2++; x2 = 0; }
                        else if (char[0] == '\n' || char[0] == '\r') {}
                        else if (char[0] == '\t') { x1 += tabSpaces; x1 -= x1 % tabSpaces; x2 += tabSpaces; x2 -= x2 % tabSpaces; }
                        else { x1++; x2++; }
                    }
                }
                else if (part instanceof ChangingLevenPart) {
                    // Before
                    for (var char of part.before) {
                        listAdd.push([char[0], char[1], x2, y2]);

                        if (char[0] == nl) { y1++; x1 = 0; }
                        else if (char[0] == '\n' || char[0] == '\r') {}
                        else if (char[0] == '\t') { x1 += tabSpaces; x1 -= x1 % tabSpaces; }
                        else { x1++; }
                    }
                    // After
                    for (var char of part.after) {
                        listAdd.push([char[0], char[1], x1, y1]);

                        if (char[0] == nl) { y2++; x2 = 0; }
                        else if (char[0] == '\n' || char[0] == '\r') {}
                        else if (char[0] == '\t') { x2 += tabSpaces; x2 -= x2 % tabSpaces; }
                        else { x2++; }
                    }
                }
            }

            // 4) Calculate relevant percentages
            var percentMove = Math.min(1, percentage * 2);
            var percentDissappear = Math.min(1, percentage * 2);
            var percentAppear = Math.max(0, (percentage - 0.5) * 2);

            // 5) Draw every character individualy
            if (percentage < 0.5) {
                for (var c of listDel) {
                    var color = MixColors(JS_COLOR[c[1]],'#000000',percentDissappear);
                    DrawColoredLines(gms,[c[0]],textC,c[3] * lineSpacing + firstLineY,c[2]);
                }
            }
            else {
                for (var c of listAdd) {
                    var color = MixColors('#000000',JS_COLOR[c[1]],percentAppear);
                    DrawColoredLines(gms,[c[0]],textC,c[3] * lineSpacing + firstLineY,c[2]);
                }
            }
            for (var c of listMove) {
                var xa = (1-percentMove) * c[3] + percentMove * c[5];
                var ya = (1-percentMove) * c[4] + percentMove * c[6];
                var color = MixColors(JS_COLOR[c[1]],JS_COLOR[c[2]],percentage);
                DrawColoredLines(gms,[c[0]],color,ya * lineSpacing + firstLineY,xa);
            }
        }
    }

    gms.write(filename, ()=>{resolve()});
}

// Given list of input image filenames (wildcard '*'), writes GIF file
export function WriteGifFile(inputFilenames, outputFilename, resolve) {
    let imageMagick = gm.subClass({imageMagick: true});

    imageMagick().delay(10).loop(-1).in(inputFilenames).write(outputFilename, ()=>{resolve()});
}

// Writes single GIF image with no animation
export function WriteStationaryAnimationFile(text,filename,resolve) {
    var lines = text.split(os.EOL);
    var gms = StartNewGIF();

    DrawLines(gms, lines, firstLineY);

    gms.write(filename, ()=>{resolve()});
}

// Writes single GIF image of text changing position
export function WriteMovingAnimationFile(textStat0,textStat1,textStat2,movingText,percentage,filename,resolve) {
    var gms = StartNewGIF();

    var lines0 = textStat0.split(os.EOL);
    var lines1 = textStat1.split(os.EOL);
    var lines2 = textStat2.split(os.EOL);
    var linesM = movingText.split(os.EOL);
    var lc0 = lines0.length-1;
    var lc1 = lines1.length-1;
    var lc2 = lines2.length-1;
    var lcM = linesM.length-1;
    var py0 = firstLineY;
    var py1 = (lc0) * lineSpacing + firstLineY;
    var pyM = (lc0 + lc1) * lineSpacing + firstLineY;
    var py1e = (lc0 + lcM) * lineSpacing + firstLineY;
    var py2 = (lc0 + lc1 + lcM) * lineSpacing + firstLineY;

    var pya1 = py1 * (1-percentage) + py1e * percentage;
    var pyaM = pyM * (1-percentage) + py1 * percentage;

    //TODO: pos X, constants

    DrawLines(gms, lines0, py0);
    DrawLines(gms, lines1, pya1);
    DrawLines(gms, lines2, py2);
    DrawHighlitedLines(gms, linesM, '#004000', '#ffffff', pyaM);

    gms.write(filename, ()=>{resolve()});
}

// Writes single GIF image of new text being added
export function WriteAddingAnimationFile(textStat0,textStat1,textStat2,movingText,percentage,filename,resolve) {
    var gms = StartNewGIF();

    var lines0 = textStat0.split(os.EOL);
    var lines1 = textStat1.split(os.EOL);
    var lines2 = textStat2.split(os.EOL);
    var linesM = movingText.split(os.EOL);
    var lc0 = lines0.length-1;
    var lc1 = lines1.length-1;
    var lc2 = lines2.length-1;
    var lcM = linesM.length-1;
    var py0 = firstLineY;
    var py1 = (lc0) * lineSpacing + firstLineY;
    var py2 = (lc0 + lc1) * lineSpacing + firstLineY;
    var py1e = (lc0 + lcM) * lineSpacing + firstLineY;
    var py2e = (lc0 + lc1 + lcM) * lineSpacing + firstLineY;

    var percMove = Math.min(percentage * 2, 1);
    var percOpac = Math.max(percentage * 2 - 1, 0);

    var pya1 = py1 * (1-percMove) + py1e * percMove;
    var pya2 = py2 * (1-percMove) + py2e * percMove;
    
    DrawLines(gms, lines0, py0);
    DrawLines(gms, lines1, pya1);
    DrawLines(gms, lines2, pya2);

    var textColor = MixColors(0,64,0,255,255,255,percOpac);
    if (percOpac > 0) DrawHighlitedLines(gms, linesM, '#004000', textColor, py1);

    gms.write(filename, ()=>{resolve()});
}

// Writes single GIF image of new text being deleted
export function WriteDeletingAnimationFile(textStat0,textStat1,textStat2,movingText,percentage,filename,resolve) {
    var gms = StartNewGIF();

    var lines0 = textStat0.split(os.EOL);
    var lines1 = textStat1.split(os.EOL);
    var lines2 = textStat2.split(os.EOL);
    var linesM = movingText.split(os.EOL);
    var lc0 = lines0.length-1;
    var lc1 = lines1.length-1;
    var lc2 = lines2.length-1;
    var lcM = linesM.length-1;
    var py0 = firstLineY;
    var py1 = (lc0) * lineSpacing + firstLineY;
    var py2 = (lc0 + lc1) * lineSpacing + firstLineY;
    var py2e = (lc0 + lc1 + lcM) * lineSpacing + firstLineY;

    var percMove = Math.max(percentage * 2 - 1, 0);
    var percOpac = 1 - Math.min(percentage * 2, 1);

    var pya2 = py2e * (1-percMove) + py2 * percMove;

    DrawLines(gms, lines0, py0);
    DrawLines(gms, lines1, py1);
    DrawLines(gms, lines2, pya2);

    var textColor = MixColors(0,64,0,255,255,255,percOpac);
    if (percOpac > 0) DrawHighlitedLines(gms, linesM, '#004000', textColor, py2);

    gms.write(filename, ()=>{resolve()});
}

// Writes single GIF image of new text being changed
export function WriteChangingAnimationFile(textStat0,textStat1,changingText0,changingText1,percentage,filename,resolve) {
    var gms = StartNewGIF();

    var lines0 = textStat0.split(os.EOL);
    var lines1 = textStat1.split(os.EOL);
    var linesM0 = changingText0.split(os.EOL);
    var linesM1 = changingText1.split(os.EOL);

    var lc0 = lines0.length-1;
    var lc1 = lines1.length-1;
    var lcM0 = linesM0.length-1;
    var lcM1 = linesM1.length-1;

    var lcMa = lcM0 * (1-percentage) + lcM1 * percentage;

    var py0 = firstLineY;
    var pyM = (lc0) * lineSpacing + firstLineY;
    var py10 = (lc0 + lcM0) * lineSpacing + firstLineY;
    var py11 = (lc0 + lcM1) * lineSpacing + firstLineY;

    var pya1 = py10 * (1-percentage) + py11 * percentage;

    var perc0 = 1 - Math.min(1 - percentage * 2, 1);
    var perc1 = Math.max(percentage * 2 - 1, 0);

    // 1) Nonchanging text
    DrawLines(gms, lines0, py0);

    // 2) Changing text
    var changingTextFull = LevenChanges(changingText0,changingText1);

    // 2A) Calculate initial and destination row and colum of each bit of the text
    var posY0 = lc0;
    var posX0 = 0;
    var posY1 = lc0;
    var posX1 = 0;
    var positions = [];

    // TODO: refactor, opacity of changed text
    for (var part of changingTextFull) {
        positions.push([posX0, posY0, posX1, posY1]);
        if (typeof part === "string") for (var char of part) {
            if (char == '\n') {
                posX0 = 0;
                posX1 = 0;
                posY0++;
                posY1++;
                //TODO: Spravne separator
            }
            else if (char == '\t') {
                posX0 += tabSpaces;
                posX1 += tabSpaces;
            }
            else if (char == '\r') {

            }
            else {
                posX0++;
                posX1++;
            }
        }
        else if (part instanceof Array) {
            for (var char of part[0]) {
                if (char == '\n') {
                    posX0 = 0;
                    posY0++;
                }
                else if (char == '\t') {
                    posX0 += tabSpaces;
                }
                else if (char == '\r') {
                
                }
                else {
                    posX0++;
                }
            }
            for (var char of part[1]) {
                if (char == '\n') {
                    posX1 = 0;
                    posY1++;
                }
                else if (char == '\t') {
                    posX1 += tabSpaces;
                }
                else if (char == '\r') {
                
                }
                else {
                    posX1++;
                }
            }
        }
    }

    // 2B) Calculate percentage of animation: |Part1|Part2| = |movement + disapearence|appearence|
    var percMove = Math.min(percentage * 2, 1);
    var opac = Math.max(0, 1 - percentage * 3) + Math.max(0, percentage * 2 - 1);

    // 2C) Draw background
    var bgColor = MixColors(0,64,0,0,0,64,percentage);
    gms.fill(bgColor);
    gms.drawRectangle(0, pyM - lineSpacing + lineHighlightOffset, lineWidth, pyM  - lineSpacing + lineHighlightOffset + lcMa * lineSpacing);
    var textColor = MixColors(0,32,32,255,255,255,opac);
    
    // 2D) Draw all the strings necessary at expected postions at expected opacities.
    for (var i = 0; i < changingTextFull.length; i++) {
        var posx = (1-percMove) * positions[i][0] + percMove * positions[i][2];
        var lineNo = (1-percMove) * positions[i][1] + percMove * positions[i][3];
        var posy = (lineNo) * lineSpacing + firstLineY;

        if (typeof changingTextFull[i] === "string") DrawColoredLines(gms, [changingTextFull[i]], '#FFFFFF', posy, posx);
        else if (changingTextFull[i] instanceof Array) {
            if (percentage > 0.5) DrawColoredLines(gms, [changingTextFull[i][1]], textColor, posy, posx);
            else DrawColoredLines(gms, [changingTextFull[i][0]], textColor, posy, posx);
        }
    }
    
    // 3) More nonchanging text
    gms.fill('#ffffff');
    DrawLines(gms, lines1, pya1);

    gms.write(filename, ()=>{resolve()});
}


// Returns RGB color as a color string
function RGBtoString(r,g,b) {
    return '#' + ToHexadecimal(r) + ToHexadecimal(g) + ToHexadecimal(b)
}

// Mixes 2 colors given as RGB values and returns color string
function MixColors(string0, string1, percentage) {
    let c0 = FromHexadecimal(string0);
    let c1 = FromHexadecimal(string1);
    return MixColors(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, percentage);
}
/*function MixColors(r0,g0,b0,r1,g1,b1,percentage) {
    let r = r0 + (r1 - r0) * percentage;
    let g = g0 + (g1 - g0) * percentage;
    let b = b0 + (b1 - b0) * percentage;
    return RGBtoString(r,g,b);
}*/

// Returns hexadecimal representation of a number in range 0 to 255.
let hexit = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F']
function ToHexadecimal(num) {
    let byte1 = Math.trunc(num / 16);
    let byte2 = Math.trunc(num % 16);
    return hexit[byte1] + hexit[byte2];
}

function FromHexadecimal(string) {
    return {
        r: HexCharToNum(string[1]) * 16 + HexCharToNum(string[2]),
        g: HexCharToNum(string[3]) * 16 + HexCharToNum(string[4]),
        b: HexCharToNum(string[5]) * 16 + HexCharToNum(string[6])
    }
}

function HexCharToNum(char) {
    switch(char) {
        case '0': return 0;
        case '1': return 1;
        case '2': return 2;
        case '3': return 3;
        case '4': return 4;
        case '5': return 5;
        case '6': return 6;
        case '7': return 7;
        case '8': return 8;
        case '9': return 9;
        case 'A': return 10;
        case 'B': return 11;
        case 'C': return 12;
        case 'D': return 13;
        case 'E': return 14;
        case 'F': return 15;
    }
}