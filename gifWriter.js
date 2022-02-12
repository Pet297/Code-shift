import fs from 'fs';
import gm from 'gm';
import os from 'os';

// CONSTANTS
const lineSpacing = 20;
const firstLineY = 25;
const lineWidth = 400;
const lineHighlightOffset = 5;

// IMPORTANT FUNCTIONS
function StartNewGIF() {
    var imageMagick = gm.subClass({imageMagick: true});
    var gms = imageMagick(400,400,'#000F')
    .setFormat('gif')
    .fill('#ffffff')
    .font('Consolas')
    .fontSize(15);
    return gms;
}
function DrawLines(gms, lines, y0) {
    var i = 0;
    for(var s of lines)
    {
        // of-screen '. ' is added, because image magick seems to trim initial spaces
        gms.drawText(-10, y0 + lineSpacing * i, '. ' + s);
        i++;
    }
}
function DrawHighlitedLines(gms, lines, highlightColor, textColor, y0) {
    for(var i = 0; i < lines.length - 1; i++) {
        gms.fill(highlightColor);
        gms.drawRectangle(0, y0 + lineSpacing * i + lineHighlightOffset, lineWidth, y0 + lineSpacing * i + lineHighlightOffset - lineSpacing);
        gms.fill(textColor);
        gms.drawText(-10, y0 + lineSpacing * i,'. ' + lines[i]);
    }
}

// PUBLIC INTERFACE

// Given list of input image filenames (wildcard '*'), writes GIF file
export function WriteGifFile(inputFilenames, outputFilename, resolve) {
    let imageMagick = gm.subClass({imageMagick: true});

    imageMagick().delay(10).loop(-1).in(inputFilenames).write(outputFilename, ()=>{resolve()});
}

// Writes single GIF image with no animation
export function WriteStationaryAnimationFile(text,filename) {
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

    // Nonchanging text
    DrawLines(gms, lines0, py0);

    // Changing text
    var textColor = MixColors(0,64,0,255,255,255,percOpac);
    if (percOpac > 0) DrawHighlitedLines(linesM, '#004000', textColor, py2);

    var i = 0;
        var bgcolor = MixColors(0,64,0,32,64,0,percentage);
        gms.fill(bgcolor);
        gms.drawRectangle(0, pyM + lineSpacing * i - lineSpacing + lineHighlightOffset + lcMa * lineSpacing, lineWidth, pyM + lineSpacing * i - lineSpacing + lineHighlightOffset);

        var color0 = MixColors(16,64,0,255,255,255,perc0);
        var color1 = MixColors(16,64,0,255,255,255,perc1);

        if (perc0 > 1) for(i=0;i<lcM0;i++)
        {
            gms.fill(color0);
            gms.drawText(-10,pyM + 20 * i,'. ' + linesM0[i]);
        }
        if (perc1 > 1) for(i=0;i<lcM1;i++)
        {
            gms.fill(color1);
            gms.drawText(-10,pyM + 20 * i,'. ' + linesM1[i]);
        }
    
    // More nonchanging text
    gms.fill('#ffffff');
    DrawLines(gms, lines1, pya1);

    gms.write(filename, ()=>{resolve()});
}


// Returns RGB color as a color string
function RGBtoString(r,g,b) {
    return '#' + ToHexadecimal(r) + ToHexadecimal(g) + ToHexadecimal(b)
}

// Mixes 2 colors given as RGB values and returns color string
function MixColors(r0,g0,b0,r1,g1,b1,percentage) {
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
