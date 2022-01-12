import fs from 'fs';
import gm from 'gm';

export function WriteGifFile(inputFilenames, outputFilename, resolve) {
    let imageMagick = gm.subClass({imageMagick: true});

    imageMagick().delay(10).loop(-1).in(inputFilenames).write(outputFilename, ()=>{resolve()});
}

export function WriteStationaryAnimationFile(text,filename) {
    //TODO
}

export function WriteMovingAnimationFile(textStat0,textStat1,textStat2,movingText,percentage,filename,resolve) {
    let imageMagick = gm.subClass({imageMagick: true});

    let gms = imageMagick(400,400,'#000F')
    .setFormat('gif')
    .fill('#ffffff')
    .font('Consolas')
    .fontSize(15);

    //TODO: proper split
    var lines0 = textStat0.split('\r\n');
    var lines1 = textStat1.split('\r\n');
    var lines2 = textStat2.split('\r\n');
    var linesM = movingText.split('\r\n');
    var lc0 = lines0.length-1;
    var lc1 = lines1.length-1;
    var lc2 = lines2.length-1;
    var lcM = linesM.length-1;
    var py0 = 25;
    var py1 = (lc0) * 20 + 25;
    var pyM = (lc0 + lc1) * 20 + 25;
    var py1e = (lc0 + lcM) * 20 + 25;
    var py2 = (lc0 + lc1 + lcM) * 20 + 25;

    var pya1 = py1 * (1-percentage) + py1e * percentage;
    var pyaM = pyM * (1-percentage) + py1 * percentage;

    //TODO: pos X, constants


    var i = 0;
    for(var s of lines0)
    {
        gms.drawText(-10,py0 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    for(var s of lines1)
    {
        gms.drawText(-10,pya1 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    for(var s of lines2)
    {
        gms.drawText(-10,py2 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    for(i = 0;i<lcM;i++)
    {
        gms.fill('#004000');
        gms.drawRectangle(0, pyaM + 20 * i + 5, 400, pyaM + 20 * i - 15);
        gms.fill('#ffffff');
        gms.drawText(-10,pyaM + 20 * i,'. ' + linesM[i]);
    }

    gms.write(filename, ()=>{resolve()});
}

export function WriteAddingAnimationFile(textStat0,textStat1,textStat2,movingText,percentage,filename,resolve) {
    let imageMagick = gm.subClass({imageMagick: true});

    let gms = imageMagick(400,400,'#000F')
    .setFormat('gif')
    .fill('#ffffff')
    .font('Consolas')
    .fontSize(15);

    var lines0 = textStat0.split('\r\n');
    var lines1 = textStat1.split('\r\n');
    var lines2 = textStat2.split('\r\n');
    var linesM = movingText.split('\r\n');
    var lc0 = lines0.length-1;
    var lc1 = lines1.length-1;
    var lc2 = lines2.length-1;
    var lcM = linesM.length-1;
    var py0 = 25;
    var py1 = (lc0) * 20 + 25;
    var py2 = (lc0 + lc1) * 20 + 25;
    var py1e = (lc0 + lcM) * 20 + 25;
    var py2e = (lc0 + lc1 + lcM) * 20 + 25;

    var percMove = Math.min(percentage * 2, 1);
    var percOpac = Math.max(percentage * 2 - 1, 0);

    var pya1 = py1 * (1-percMove) + py1e * percMove;
    var pya2 = py2 * (1-percMove) + py2e * percMove;

    var i = 0;
    for(var s of lines0)
    {
        gms.drawText(-10,py0 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    for(var s of lines1)
    {
        gms.drawText(-10,pya1 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    for(var s of lines2)
    {
        gms.drawText(-10,pya2 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    if (percOpac > 0)
    {
        for(i = 0;i<lcM;i++)
        {
            var color = MixColors(0,64,0,255,255,255,percOpac);

            gms.fill('#004000');
            gms.drawRectangle(0, py1 + 20 * i + 5, 400, py1 + 20 * i - 15);
            gms.fill('#' + color);
            gms.drawText(-10,py1 + 20 * i,'. ' + linesM[i]);
        }
    }

    gms.write(filename, ()=>{resolve()});
}

export function WriteDeletingAnimationFile(textStat0,textStat1,textStat2,movingText,percentage,filename,resolve) {
    let imageMagick = gm.subClass({imageMagick: true});

    let gms = imageMagick(400,400,'#000F')
    .setFormat('gif')
    .fill('#ffffff')
    .font('Consolas')
    .fontSize(15);

    var lines0 = textStat0.split('\r\n');
    var lines1 = textStat1.split('\r\n');
    var lines2 = textStat2.split('\r\n');
    var linesM = movingText.split('\r\n');
    var lc0 = lines0.length-1;
    var lc1 = lines1.length-1;
    var lc2 = lines2.length-1;
    var lcM = linesM.length-1;
    var py0 = 25;
    var py1 = (lc0) * 20 + 25;
    var py2 = (lc0 + lc1) * 20 + 25;
    var py2e = (lc0 + lc1 + lcM) * 20 + 25;

    var percMove = Math.max(percentage * 2 - 1, 0);
    var percOpac = 1 - Math.min(percentage * 2, 1);

    var pya2 = py2e * (1-percMove) + py2 * percMove;

    var i = 0;
    for(var s of lines0)
    {
        gms.drawText(-10,py0 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    for(var s of lines1)
    {
        gms.drawText(-10,py1 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    for(var s of lines2)
    {
        gms.drawText(-10,pya2 + 20 * i,'. ' + s);
        i++;
    }
    i = 0;
    if (percOpac > 0)
    {
        for(i = 0;i<lcM;i++)
        {
            var color = MixColors(0,64,0,255,255,255,percOpac);

            gms.fill('#004000');
            gms.drawRectangle(0, py2 + 20 * i + 5, 400, py2 + 20 * i - 15);
            gms.fill('#' + color);
            gms.drawText(-10,py2 + 20 * i,'. ' + linesM[i]);
        }
    }

    gms.write(filename, ()=>{resolve()});
}

function MixColors(r0,g0,b0,r1,g1,b1,percentage) {
    let r = r0 + (r1 - r0) * percentage;
    let g = g0 + (g1 - g0) * percentage;
    let b = b0 + (b1 - b0) * percentage;
    return ToHexadecimal(r) + ToHexadecimal(g) + ToHexadecimal(b)
}

let hexit = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F']
function ToHexadecimal(num) {
    let byte1 = Math.trunc(num / 16)
    let byte2 = Math.trunc(num % 16)
    return hexit[byte1] + hexit[byte2]
}
