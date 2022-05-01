import fs from 'fs';
import path from 'path';
import gm from 'gm';
import os from 'os';
import { LevenChangesColored, ChangingLevenPart, UnchangedLevenPart } from './levenAnimator.js';
import { MovingUpAnimation, ChangingAnimation, AddingAnimation, RemovingAnimation, RenamingAnimation, EndingAnimation } from './animationEnumerator.js';
import { TokenInfo } from './languageInterface.js';

// Constants for gif files:
const lineSpacing = 20;
const firstLineY = 25;
const firstCharX = 10;
const gifWidth = 800;
const gifHeight = 800;
const gifBackground = '#000F';
const highlightColor = '#100000';
const highlightOffset = 5;
const fontSize = 15;
const fontWidth = 8; // Specific for Consolas at 15
const tabSpaces = 4;
const gifsPerAnimation = 15;

/**
 * This class iterprets animation descriptions and outputs them to multple stationary GIF files,
 * which then are connected into a single final animation.
 */
export class GIFWriter {
    
    _gifNumber = 100001;
    _finalText = [];
    _outputFile = undefined;
    /**
     * Creates an instance of GIFWriter.
     */
    constructor() {
    }
    /**
     * Begins a session for generating final animation.
     * @param {string} outputFile The GIF file to which the animation should be outputed.
     * @param {(value: any) => void} callback Callback function for asynchronous execution.
     */
    async Begin (outputFile, callback) {
        
        var promise = new Promise(
            resolve0 => ClearTemporaryFiles(resolve0)
        )
        await promise;

        this._gifNumber = 100001; //Using a high number so that numbered files are in alphabetical order as well.
        this._outputFile = outputFile;
        callback();
    }
    /**
     * Generates GIF files representing a single change in code.
     * @param {*} animation The change in code to animate.
     * @param {(value: any) => void} callback Callback function for asynchronous execution.
     */
    async ApplyAnimation (animation, callback) {
        if (animation instanceof MovingUpAnimation) {
            var promises = [];
            for (var i=0; i<gifsPerAnimation; i++)
            {
                let promise = new Promise(
                    callback0 => WriteGifFileSHMoveUp(
                        animation.textAbove,
                        animation.textMovingUp,
                        animation.textMovingDown,
                        animation.textBelow,
                        i/(gifsPerAnimation - 1),
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        callback0)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            callback();
        }

        else if (animation instanceof AddingAnimation) {
            var promises = [];
            for (var i=0; i<gifsPerAnimation; i++)
            {
                let promise = new Promise(
                    callback0 => WriteGifFileSHAdd(
                        animation.textAbove,
                        animation.textBeingAdded,
                        animation.textBelow,
                        i/(gifsPerAnimation-1),
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        callback0)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            callback();
        }

        else if (animation instanceof RemovingAnimation) {
            var promises = [];
            for (var i=0; i<gifsPerAnimation; i++)
            {
                let promise = new Promise(
                    callback0 => WriteGifFileSHRemove(
                        animation.textAbove,
                        animation.textBeingRemoved,
                        animation.textBelow,
                        i/(gifsPerAnimation-1),
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        callback0)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            callback();
        }

        else if (animation instanceof ChangingAnimation) {
            var tokenList = [];

            tokenList = tokenList.concat(animation.textAbove);
            tokenList.push([animation.textChangingFrom,animation.textChangingTo]);
            tokenList = tokenList.concat(animation.textBelow);

            var promises = [];
            for (var i=0; i<gifsPerAnimation; i++)
            {
                let promise = new Promise(
                    callback0 => WriteGifFileSHTransform(
                    tokenList,
                    i/(gifsPerAnimation-1),
                    '.output\\frame' + (this._gifNumber).toString() + '.gif',
                    callback0)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            callback();
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
            for (var i=0; i<gifsPerAnimation; i++)
            {
                let promise = new Promise(
                    callback0 => WriteGifFileSHTransform(
                    tokenList,
                    i/(gifsPerAnimation-1),
                    '.output\\frame' + (this._gifNumber).toString() + '.gif',
                    callback0)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            callback();
        }

        else if (animation instanceof EndingAnimation) {
            var promises = [];
            for (var i=0; i<gifsPerAnimation; i++)
            {
                let promise = new Promise(
                    callback0 => WriteGifFileSH(
                        animation.text,
                        '.output\\frame' + (this._gifNumber).toString() + '.gif',
                        callback0)
                );
                promises.push(promise);
                this._gifNumber++;
            }
            await Promise.all(promises);
            callback();
        }
    }
    /**
     * End a session for generating the final animation.
     * Concatenates all stationary files into a single animation.
     * @param {(value: any) => void} callback Callback function for asynchronous execution.
     */
    async End (callback) {
        var promise = new Promise(
            callback0 => WriteGifFile('.output/frame*.gif', '.output/result.gif', callback0)
            )
        await promise;
        
        //move result
        const outputPath = path.join(".", ".output", "result.gif");
        promise = new Promise(
            callback0 => fs.rename(outputPath, this._outputFile, callback0)
        )
        await promise;
            
        //delete individual frames
        promise = new Promise(
            callback0 => ClearTemporaryFiles(callback0)
        )
        await promise;
        
        callback();
    }   
}

/**
 * Clears all files in the temporary directory '.output'.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
async function ClearTemporaryFiles(callback) {
    var promises = [];
    var files = fs.readdirSync('.output');
    for (const file of files) {
        var promise = new Promise( (resolve0) => fs.unlink(path.join('.output', file), err => { if (err) throw err; else resolve0(); }));
        promises.push(promise);
    }
    var promiseAll = Promise.all(promises);
    promiseAll.then(() => callback())
    await Promise.all(promises);
}

/**
 * Begins a GraphicsMagick command, representing a creation of a new GIF.
 * @returns {gm.State} The newly created GraphicsMagick state object.
 */
function StartNewGIF() {
    var imageMagick = gm.subClass({imageMagick: true});
    var gms = imageMagick(gifWidth,gifHeight,gifBackground)
    .setFormat('gif')
    .fill('#ffffff')
    .font('Consolas')
    .fontSize(fontSize);
    return gms;
}
/**
 * 
 * @param {gm.State} gms The GraphicsMagick state object to edit.
 * @param {string} text The text to draw.
 * @param {string} textColor The color of the text.
 * @param {number} y0 Vertical offset in pixels.
 * @param {number} xoffset Horizontal offset in characters.
 */
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
/**
 * Transforms given percentage value into a different one to achieve effect of animation easing.
 * @param {number} percentage 
 */
function AnimationEasing(percentage) {
    return percentage * percentage * (3 - 2 * percentage);
}
/**
 * Writes a GIF file showing no animation.
 * @param {TokenInfo[]} tokens Tokens to draw.
 * @param {string} filename Filename of the output file.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
function WriteGifFileSH(tokens,filename,callback) {
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

    gms.write(filename, ()=>{callback()});
}
/**
 * Writes a GIF file, in which some groups of tokens transform into a diffrent groups and some tokens stay as they are.
 * @param {*[]} tokens List of changing groups of tokens and unchanging tokens.
 * @param {number} percentage The timestep at which to draw the animation.
 * @param {string} filename Filename of the output file.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
function WriteGifFileSHTransform(tokens,percentage,filename,callback) {
    percentage = AnimationEasing(percentage);
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

            // A) Build colored strings
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

            // B) Get changes
            var changingTextFull = LevenChangesColored(coloredText1, coloredText2);

            // C) Calculate old and new positions for every char
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

            // D) Calculate relevant percentages
            var percentMove = 1 - percentage;

            // E) Draw every character individualy
            for (var c of listDel) {
                var color = c[1] + ToHexadecimal((1-percentage) * 255);
                DrawColoredText(gms,c[0],color,c[3] * lineSpacing + firstLineY,c[2]);
            }
            for (var c of listAdd) {
                var color = c[1] + ToHexadecimal(percentage * 255);
                DrawColoredText(gms,c[0],color,c[3] * lineSpacing + firstLineY,c[2]);
            }
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

    gms.write(filename, ()=>{callback()});
}
/**
 * Writes a GIF file, in which a group of tokens moves up, moving a different group of tokens down in the process.
 * @param {TokenInfo[]} tokensPreceding List of tokens which don't move preceding the moving groups.
 * @param {TokenInfo[]} tokensMovingDown List of tokens which move down.
 * @param {TokenInfo[]} tokensMovingUp List of tokens which move up.
 * @param {TokenInfo[]} tokensAfter List of tokens which don't move, which come after the moving groups.
 * @param {number} percentage The timestep at which to draw the animation.
 * @param {string} filename Filename of the output file.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
function WriteGifFileSHMoveUp(tokensPreceding, tokensMovingDown, tokensMovingUp, tokensAfter, percentage, filename, callback) {
    percentage = AnimationEasing(percentage);
    var gms = StartNewGIF();
    
    // A) Determine position of each token before and after
    var obj00 = GetTokenPositions(tokensPreceding, 0, 0);

    var obj01 = GetTokenPositions(tokensMovingDown, obj00.x, obj00.y);
    var obj02 = GetTokenPositions(tokensMovingUp, obj01.x, obj01.y);
    var obj03 = GetTokenPositions(tokensAfter, obj02.x, obj02.y);

    var obj11 = GetTokenPositions(tokensMovingUp, obj00.x, obj00.y);
    var obj12 = GetTokenPositions(tokensMovingDown, obj11.x, obj11.y);
    var obj13 = GetTokenPositions(tokensAfter, obj12.x, obj12.y);

    // B) Get actual positions of moving objects
    var pos0 = obj00.positions;
    var pos1 = InterpolatePositions(obj01.positions, obj12.positions, 1-percentage);
    var pos2 = InterpolatePositions(obj02.positions, obj11.positions, 1-percentage);
    var pos3 = InterpolatePositions(obj03.positions, obj13.positions, 1-percentage);

    // C) Draw
    DrawTokens(tokensPreceding, pos0, gms);
    DrawTokens(tokensMovingDown, pos1, gms);
    DrawTokens(tokensMovingUp, pos2, gms);
    DrawTokens(tokensAfter, pos3, gms);

    gms.write(filename, ()=>{callback()});
}
/**
 * Writes a GIF file, in which a group of tokens gets deleted.
 * @param {TokenInfo[]} tokensPreceding List of tokens which don't change preceding the removed group.
 * @param {TokenInfo[]} tokensRemoved List of tokens which are being deleted.
 * @param {TokenInfo[]} tokensAfter List of tokens which don't change, which come after the removed group.
 * @param {number} percentage The timestep at which to draw the animation.
 * @param {string} filename Filename of the output file.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
function WriteGifFileSHRemove(tokensPreceding, tokensRemoved, tokensAfter, percentage, filename, callback) {
    percentage = AnimationEasing(percentage);
    var gms = StartNewGIF();
    
    // A) Determine position of each token before and after
    var obj00 = GetTokenPositions(tokensPreceding, 0, 0);

    var obj01 = GetTokenPositions(tokensRemoved, obj00.x, obj00.y);
    var obj02 = GetTokenPositions(tokensAfter, obj01.x, obj01.y);

    var obj12 = GetTokenPositions(tokensAfter, obj00.x, obj00.y);

    // B) Get actual positions of moving objects
    var pos0 = obj00.positions;
    var pos1 = obj01.positions;
    var pos2 = InterpolatePositions(obj02.positions, obj12.positions, percentage);

    // C) Draw
    DrawTokens(tokensPreceding, pos0, gms);
    DrawTokens(tokensRemoved, pos1, gms, 1-percentage);
    DrawTokens(tokensAfter, pos2, gms);
    
    gms.write(filename, ()=>{callback()});
}
/**
 * Writes a GIF file, in which a group of tokens gets added.
 * @param {TokenInfo[]} tokensPreceding List of tokens which don't change preceding the added group.
 * @param {TokenInfo[]} tokensRemoved List of tokens which are being added.
 * @param {TokenInfo[]} tokensAfter List of tokens which don't change, which come after the added group.
 * @param {number} percentage The timestep at which to draw the animation.
 * @param {string} filename Filename of the output file.
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
function WriteGifFileSHAdd(tokensPreceding, tokensAdded, tokensAfter, percentage, filename, callback) {
    WriteGifFileSHRemove(tokensPreceding, tokensAdded, tokensAfter, 1-percentage, filename, callback);
}
/**
 * Given a list of tokens and a starting position, returns position of each token, taking into account spaces, newlines and tabs.
 * @param {TokenInfo[]} tokens Token which should be positioned
 * @param {number} x Initial horizontal offset in characters.
 * @param {number} y Initial vertical offset in characters.
 * @returns {object} Object with resulting position as well as x and y coordinate of the end of the last token.
 */
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
/**
 * Given two arrays of two dimensional coordinates, returns their affine combination given by percentage.
 * @param {object[]} array0 The first array to combine.
 * @param {object[]} array1 The second array to combine.
 * @param {number} percentage The ammount by which to multiply the second array.
 * @returns {object[]} The combined array.
 */
function InterpolatePositions(array0, array1, percentage) {
    var ret = [];
    for (var i = 0; i < array0.length; i++) {
        ret.push({x: array0[i].x * (1-percentage) + array1[i].x * percentage, y: array0[i].y * (1-percentage) + array1[i].y * percentage})
    }
    return ret;
}
/**
 * Edits a GraphicsMagick state object, so a list of tokens gets drawn at specified positions.
 * @param {TokenInfo[]} tokens List of tokens to draw.
 * @param {object[]} positions List of two-dimesional coordinates, at which to draw each token.
 * @param {gm.State} gms The GraphicsMagick state object to edit.
 * @param {number} opacity The opacity at which to draw the tokens.
 */
function DrawTokens(tokens, positions, gms, opacity = 1) {
    for (var i = 0; i < tokens.length; i++) {
        var opacColor = MixColors('#000000', tokens[i].color, opacity);
        DrawColoredText(gms,tokens[i].text,opacColor,positions[i].y * lineSpacing + firstLineY, positions[i].x);
    }   
}
/**
 * Given a file with a wildcard ('*'), connects multiple image files into a single GIF file.
 * @param {string} inputFilenames 
 * @param {string} outputFilename 
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
function WriteGifFile(inputFilenames, outputFilename, callback) {
    let imageMagick = gm.subClass({imageMagick: true});

    imageMagick().delay(10).loop(-1).in(inputFilenames).write(outputFilename, ()=>{callback()});
}
/**
 * Given three numeric values from 0 to 255, returns a color string.
 * @param {number} r Amount of red.
 * @param {number} g Amount of green.
 * @param {number} b Amount of blue.
 * @returns {string} The resulting color string.
 */
function RGBtoString(r,g,b) {
    return '#' + ToHexadecimal(r) + ToHexadecimal(g) + ToHexadecimal(b)
}
/**
 * Mixes two colors given by color strings and and returns result as a color string.
 * @param {string} string0 The first color string to mix.
 * @param {string} string1 The second color string to mix.
 * @param {number} percentage Percentage at which to include the second color.
 * @returns {string} Color string of the resulting color.
 */
function MixColors(string0, string1, percentage) {
    let c0 = ColorStringToRGB(string0);
    let c1 = ColorStringToRGB(string1);
    return MixColors0(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, percentage);
}
/**
 * Mixes two colors given by two groups of RGB valies and returns result as a color string.
 * @param {number} r0 The amount of red in the first color.
 * @param {number} g0 The amount of green in the first color.
 * @param {number} b0 The amount of blue in the first color.
 * @param {number} r1 The amount of red in the second color.
 * @param {number} g1 The amount of green in the second color.
 * @param {number} b1 The amount of blue in the second color.
 * @param {number} percentage Percentage at which to include the second color.
 * @returns {string} Color string of the resulting color.
 */
function MixColors0(r0,g0,b0,r1,g1,b1,percentage) {
    let r = r0 + (r1 - r0) * percentage;
    let g = g0 + (g1 - g0) * percentage;
    let b = b0 + (b1 - b0) * percentage;
    return RGBtoString(r,g,b);
}
const hexit = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F']
/**
 * Given a number from 0 to 255, returns hexadecimal representation of it as a 2-character string.
 * @param {number} num The number to convert.
 * @returns {string} The two-character hexadecimal string.
 */
function ToHexadecimal(num) {
    let byte1 = Math.trunc(num / 16);
    let byte2 = Math.trunc(num % 16);
    return hexit[byte1] + hexit[byte2];
}
/**
 * Given a color string, returns it as an object containing the numeric value of red, green and blue.
 * @param {string} string The colorstring to convert.
 * @returns {object} Object containing the values of individual colors.
 */
function ColorStringToRGB(string) {
    return {
        r: HexCharToNum(string[1]) * 16 + HexCharToNum(string[2]),
        g: HexCharToNum(string[3]) * 16 + HexCharToNum(string[4]),
        b: HexCharToNum(string[5]) * 16 + HexCharToNum(string[6])
    }
}
/**
 * Converts a hexadecimal character (0-F) to its numeric value.
 * @param {string} char The character to convert. 
 * @returns {number} Numeric value of the character.
 */
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