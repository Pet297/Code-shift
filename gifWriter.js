import fs from 'fs';
import path from 'path';
import gm from 'gm';
import os from 'os';
import { LevenChangesColored, ChangingLevenPart, UnchangedLevenPart } from './levenAnimator.js';
import { MovingUpAnimation, ChangingAnimation, AddingAnimation, RemovingAnimation, RenamingAnimation, EndingAnimation } from './animationEnumerator.js';
import { TokenInfo } from './languageInterface.js';

// CONSTANTS
const lineSpacing = 20;
const firstLineY = 25;
const firstCharX = 10;
const lineWidth = 800;
const lineHighlightOffset = 5;

const fontSize = 15;
const fontWidth = 8; // Specific for Consolas at 15
const tabSpaces = 4;

// The important class
export class GIFWriter {
    
    _gifNumber = 100001;
    _finalText = [];
    _outputFile = undefined;

    constructor() {
    }
    async Begin (outputFile, resolve) {
        
        //delete individual frames
        var promise = new Promise(
            resolve0 => ClearTemporaryFiles(resolve0)
        )
        await promise;

        this._gifNumber = 100001;
        this._outputFile = outputFile;
        resolve();
    }
    async ApplyAnimation (animation, resolve) {
        if (animation instanceof MovingUpAnimation) {
            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteGifFileSHMoveUp(
                        animation.textAbove,
                        animation.textMovingUp,
                        animation.textMovingDown,
                        animation.textBelow,
                        i/19.0,
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        resolve)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            resolve();
        }

        else if (animation instanceof AddingAnimation) {
            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteGifFileSHAdd(
                        animation.textAbove,
                        animation.textBeingAdded,
                        animation.textBelow,
                        i/19.0,
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        resolve)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            resolve();
        }

        else if (animation instanceof RemovingAnimation) {
            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteGifFileSHRemove(
                        animation.textAbove,
                        animation.textBeingRemoved,
                        animation.textBelow,
                        i/19.0,
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        resolve)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            resolve();
        }

        else if (animation instanceof ChangingAnimation) {
            var tokenList = [];

            tokenList = tokenList.concat(animation.textAbove);
            tokenList.push([animation.textChangingFrom,animation.textChangingTo]);
            tokenList = tokenList.concat(animation.textBelow);

            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteGifFileSHTransform(
                    tokenList,
                    i/19.0,
                    '.output\\frame' + (this._gifNumber).toString() + '.gif',
                    resolve)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            resolve();
        }

        else if (animation instanceof RenamingAnimation)
        {
            var tokenList = [];

            tokenList = tokenList.concat(animation.textAbove);
            for (var token of animation.textChanging) {
                if (token.isIdentifier && token.text == animation.renameFrom) {
                    var ti2 = token.Clone();
                    ti2.text = animation.renameTo;
                    tokenList.push([
                        [ti2],
                        [token]              
                    ]);
                }
                else tokenList.push(token);
            }
            tokenList = tokenList.concat(animation.textBelow);

            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteGifFileSHTransform(
                    tokenList,
                    i/19.0,
                    '.output\\frame' + (this._gifNumber).toString() + '.gif',
                    resolve)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            resolve();
        }

        else if (animation instanceof EndingAnimation) {
            var promises = [];
            for (var i=0; i<20; i++)
            {
                let promise = new Promise(
                    resolve => WriteGifFileSH(
                        animation.text,
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        resolve)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            resolve();
        }
    }
    async End (resolve) {
        var promise = new Promise(
            resolve => WriteGifFile('.output/frame*.gif', '.output/result.gif', resolve)
            )
        await promise;
        
        //move result
        const outputPath = path.join(".", ".output", "result.gif");
        promise = new Promise(
            resolve => fs.rename(outputPath, this._outputFile, resolve)
        )
        await promise;
            
        //delete individual frames
        promise = new Promise(
            resolve => ClearTemporaryFiles(resolve)
        )
        await promise;
        
        resolve();
    }   
}
async function ClearTemporaryFiles(resolve) {
    var promises = [];
    var files = fs.readdirSync('.output');
    for (const file of files) {
        var promise = new Promise( (resolve0) => fs.unlink(path.join('.output', file), err => { if (err) throw err; else resolve0(); }));
        promises.push(promise);
    }
    var promiseAll = Promise.all(promises);
    promiseAll.then(() => resolve())
    await Promise.all(promises);
}

// IMPORTANT FUNCTIONS
function StartNewGIF() {
    var imageMagick = gm.subClass({imageMagick: true});
    var gms = imageMagick(800,800,'#000F')
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
function DrawColoredText(gms, text, textColor, y0, xoffset = 0) {
    
    var lines = text.split(os.EOL);

    for(var i = 0; i <= lines.length - 1; i++) {
        gms.fill(textColor);

        var spaces = 0;
        var s0 = lines[i];

        while(true)
        {
            if (s0[0] == ' ')
            {
                spaces++;
                s0 = s0.substring(1);
            }
            else if (s0[0] == '\t')
            {
                spaces += tabSpaces;
                spaces -= spaces % tabSpaces;
                s0 = s0.substring(1);
            }
            else break;
        }
        spaces += xoffset;

        gms.drawText(spaces * fontWidth + firstCharX, y0 + lineSpacing * i, s0);
        xoffset = 0;
    }
}
function DrawHighlitedLines(gms, lines, highlightColor, textColor, y0, xoffset = 0) {
    for(var i = 0; i <= lines.length - 1; i++) {
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

function WriteGifFileSH(tokens,filename,resolve) {
    var gms = StartNewGIF();
    var x = 0;
    var y = 0;
    var nl = '\n';
    if (os.EOL == '\r') nl = '\r';

    for (var token of tokens) {
        var textC = token.color;

        DrawColoredText(gms,token.text,textC,y * lineSpacing + firstLineY,x);
        
        for (var char of token.text) {
            if (char == nl) { y++; x = 0}
            else if (char == '\n' || char == '\r') {}
            else if (char == '\t') { x += tabSpaces; x -= x % tabSpaces }
            else x ++;
        }      
    }

    gms.write(filename, ()=>{resolve()});
}

function WriteGifFileSHTransform(tokens,percentage,filename,resolve) {
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
            for (var char of token.text) {
                if (char == nl) { y++; x = 0}
                else if (char == '\n' || char == '\r') {}
                else if (char == '\t') { x += tabSpaces; x -= x % tabSpaces }
                else x ++;
            }
        }
        else {
            for (var token2 of token[1]) {
                for (var char of token2.text) {
                    if (char == nl) { y++; x = 0}
                    else if (char == '\n' || char == '\r') {}
                    else if (char == '\t') { x += tabSpaces; x -= x % tabSpaces }
                    else x ++;
                }
            }
        }
    }

    // Positions after
    x = 0;
    y = 0;
    for (var token of tokens) {
        newPos.push({x:x, y:y});
        if (token instanceof TokenInfo) {
            for (var char of token.text) {
                if (char == nl) { y++; x = 0}
                else if (char == '\n' || char == '\r') {}
                else if (char == '\t') { x += tabSpaces; x -= x % tabSpaces }
                else x ++;
            }
        }
        else {
            for (var token2 of token[0]) {
                for (var char of token2.text) {
                    if (char == nl) { y++; x = 0}
                    else if (char == '\n' || char == '\r') {}
                    else if (char == '\t') { x += tabSpaces; x -= x % tabSpaces }
                    else x ++;
                }
            }
        }
    }

    // Draw
    for (var i = 0; i < tokens.length; i++) { 
        var textC = tokens[i].color;

        if (!(tokens[i] instanceof TokenInfo)) {
            var coloredText1 = [];
            var coloredText2 = [];

            // 1) Build colored strings
            for (var token2 of tokens[i][0]) {
                for (var j = 0; j < token2.text.length; j++) {
                    coloredText1.push([token2.text[j],token2.color]);
                }
            }
            for (var token2 of tokens[i][1]) {
                for (var j = 0; j < token2.text.length; j++) {
                    coloredText2.push([token2.text[j],token2.color]);
                }
            }

            // 2) Get changes
            var changingTextFull = LevenChangesColored(coloredText1, coloredText2);

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
                    for (var j = 0; j < part.before.length; j++) {
                        //             char     color 1  color 2  b.x b.y a.x a.y
                        listMove.push([part.before[j][0], part.before[j][1], part.after[j][1], x1, y1, x2, y2]);

                        if (part.before[j][0] == nl) { y1++; x1 = 0; y2++; x2 = 0; }
                        else if (part.before[j][0] == '\n' || part.before[j][0] == '\r') {}
                        else if (part.before[j][0] == '\t') { x1 += tabSpaces; x1 -= x1 % tabSpaces; x2 += tabSpaces; x2 -= x2 % tabSpaces; }
                        else { x1++; x2++; }
                    }
                }
                else if (part instanceof ChangingLevenPart) {
                    // Before
                    for (var char of part.before) {
                        listAdd.push([char[0], char[1], x1, y1]);

                        if (char[0] == nl) { y1++; x1 = 0; }
                        else if (char[0] == '\n' || char[0] == '\r') {}
                        else if (char[0] == '\t') { x1 += tabSpaces; x1 -= x1 % tabSpaces; }
                        else { x1++; }
                    }
                    // After
                    for (var char of part.after) {
                        listDel.push([char[0], char[1], x2, y2]);

                        if (char[0] == nl) { y2++; x2 = 0; }
                        else if (char[0] == '\n' || char[0] == '\r') {}
                        else if (char[0] == '\t') { x2 += tabSpaces; x2 -= x2 % tabSpaces; }
                        else { x2++; }
                    }
                }
            }

            // 4) Calculate relevant percentages
            var percentMove = 1 - percentage;
            var percentDissappear = percentage;
            var percentAppear = percentage;

            // 5) Draw every character individualy
            //if (percentage < 0.5) {
                for (var c of listDel) {
                    var color = MixColors(c[1],'#000000',percentDissappear);
                    DrawColoredText(gms,c[0],color,c[3] * lineSpacing + firstLineY,c[2]);
                }
            //}
            //else {
                for (var c of listAdd) {
                    var color = MixColors('#000000',c[1],percentAppear);
                    DrawColoredText(gms,c[0],color,c[3] * lineSpacing + firstLineY,c[2]);
                }
            //}
            for (var c of listMove) {
                var xa = (1 - percentMove) * c[3] + percentMove * c[5];
                var ya = (1 - percentMove) * c[4] + percentMove * c[6];
                var color = MixColors(c[1],c[2],1 - percentage);
                DrawColoredText(gms,c[0],color,ya * lineSpacing + firstLineY,xa);
            }
        }
        else if (tokens[i].text != '\n' && tokens[i].text != '\r' && tokens[i].text != '\t') {
            var pxa = (1-percentage) * oldPos[i].x + percentage * newPos[i].x;
            var pya = (1-percentage) * oldPos[i].y + percentage * newPos[i].y;
            DrawColoredText(gms,tokens[i].text,textC,pya * lineSpacing + firstLineY,pxa);
        }
    }

    gms.write(filename, ()=>{resolve()});
}

function WriteGifFileSHMoveUp(tokensPreceding, tokensMovingDown, tokensMovingUp, tokensAfter, percentage, filename, resolve) {
    var gms = StartNewGIF();
    
    // Determine position of each token (preceding)
    var obj00 = GetTokenPositions(tokensPreceding, 0, 0);

    // Determine position of all other tokens at the start
    var obj01 = GetTokenPositions(tokensMovingDown, obj00.x, obj00.y);
    var obj02 = GetTokenPositions(tokensMovingUp, obj01.x, obj01.y);
    var obj03 = GetTokenPositions(tokensAfter, obj02.x, obj02.y);

    // Determine position of all other tokens at the end
    var obj11 = GetTokenPositions(tokensMovingUp, obj00.x, obj00.y);
    var obj12 = GetTokenPositions(tokensMovingDown, obj11.x, obj11.y);
    var obj13 = GetTokenPositions(tokensAfter, obj12.x, obj12.y);

    // Get actual positions of moving objects
    var pos0 = obj00.positions;
    var pos1 = InterpolatePositions(obj01.positions, obj12.positions, 1-percentage);
    var pos2 = InterpolatePositions(obj02.positions, obj11.positions, 1-percentage);
    var pos3 = InterpolatePositions(obj03.positions, obj13.positions, 1-percentage);

    // Draw them all
    DrawTokens(tokensPreceding, pos0, gms);
    DrawTokens(tokensMovingDown, pos1, gms);
    DrawTokens(tokensMovingUp, pos2, gms);
    DrawTokens(tokensAfter, pos3, gms);

    gms.write(filename, ()=>{resolve()});
}

function WriteGifFileSHRemove(tokensPreceding, tokensRemoved, tokensAfter, percentage, filename, resolve) {
    var gms = StartNewGIF();
    
    // Determine position of each token (preceding)
    var obj00 = GetTokenPositions(tokensPreceding, 0, 0);

    // Determine position of all other tokens at the start
    var obj01 = GetTokenPositions(tokensRemoved, obj00.x, obj00.y);
    var obj02 = GetTokenPositions(tokensAfter, obj01.x, obj01.y);

    // Determine position of all other tokens at the end
    var obj12 = GetTokenPositions(tokensAfter, obj00.x, obj00.y);

    // Get actual positions of moving objects
    var pos0 = obj00.positions;
    var pos1 = obj01.positions;
    var pos2 = InterpolatePositions(obj02.positions, obj12.positions, percentage);

    // Draw them all
    DrawTokens(tokensPreceding, pos0, gms);
    DrawTokens(tokensRemoved, pos1, gms, 1-percentage);
    DrawTokens(tokensAfter, pos2, gms);
    
    gms.write(filename, ()=>{resolve()});
}

function WriteGifFileSHAdd(tokensPreceding, tokensAdded, tokensAfter, percentage, filename, resolve) {
    var gms = StartNewGIF();
    
    // Determine position of each token (preceding)
    var obj00 = GetTokenPositions(tokensPreceding, 0, 0);

    // Determine position of all other tokens at the start
    var obj02 = GetTokenPositions(tokensAfter, obj00.x, obj00.y);

    // Determine position of all other tokens at the end
    var obj11 = GetTokenPositions(tokensAdded, obj00.x, obj00.y);
    var obj12 = GetTokenPositions(tokensAfter, obj11.x, obj11.y);

    // Get actual positions of moving objects
    var pos0 = obj00.positions;
    var pos1 = obj11.positions;
    var pos2 = InterpolatePositions(obj02.positions, obj12.positions, percentage);

    // Draw them all
    DrawTokens(tokensPreceding, pos0, gms);
    DrawTokens(tokensAdded, pos1, gms, percentage);
    DrawTokens(tokensAfter, pos2, gms);
    
    gms.write(filename, ()=>{resolve()});
}

function GetTokenPositions(tokens, x, y) { 
    var xc = x;
    var yc = y;
    var nl = '\n';
    if (os.EOL == '\r') nl = '\r';
    var positions = [];

    for (var token of tokens) {
        positions.push({x: xc, y: yc});
        for (var char of token.text) {
            if (char == nl) {
                yc++;
                xc = 0;
            }
            else if (char == '\n' || char == '\r') {
                //nothing happens
            }
            else if (char == '\t') {
                xc += tabSpaces - (xc % tabSpaces);
            }
            else {
                xc ++;
            }
        }
    }
    return {positions: positions, x: xc, y: yc};
}

function InterpolatePositions(array0, array1, percentage) {
    var ret = [];
    for (var i = 0; i < array0.length; i++) {
        ret.push({x: array0[i].x * (1-percentage) + array1[i].x * percentage, y: array0[i].y * (1-percentage) + array1[i].y * percentage})
    }
    return ret;
}

function DrawTokens(tokens, positions, gms, opacity = 1) {
    for (var i = 0; i < tokens.length; i++) {
        var opacColor = MixColors('#000000', tokens[i].color, opacity);
        DrawColoredText(gms,tokens[i].text,opacColor,positions[i].y * lineSpacing + firstLineY, positions[i].x);
    }   
}

// Given list of input image filenames (wildcard '*'), writes GIF file
function WriteGifFile(inputFilenames, outputFilename, resolve) {
    let imageMagick = gm.subClass({imageMagick: true});

    imageMagick().delay(10).loop(-1).in(inputFilenames).write(outputFilename, ()=>{resolve()});
}

// Returns RGB color as a color string
function RGBtoString(r,g,b) {
    return '#' + ToHexadecimal(r) + ToHexadecimal(g) + ToHexadecimal(b)
}

// Mixes 2 colors given as RGB values and returns color string
function MixColors(string0, string1, percentage) {
    let c0 = FromHexadecimal(string0);
    let c1 = FromHexadecimal(string1);
    return MixColors0(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, percentage);
}
function MixColors0(r0,g0,b0,r1,g1,b1,percentage) {
    let r = r0 + (r1 - r0) * percentage;
    let g = g0 + (g1 - g0) * percentage;
    let b = b0 + (b1 - b0) * percentage;
    return RGBtoString(r,g,b);
}

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