import fs from 'fs';
import gm from 'gm';

export function WriteGifFile(inputFilenames, outputFilename) {
    let imageMagick = gm.subClass({imageMagick: true});

    let gms = imageMagick().delay(50).loop(-1).in(inputFilenames).write(outputFilename, function (err) {console.log(err)});
}

export function WriteStationaryAnimationFile(text,filename) {
    //TODO
}

export function WriteMovingAnimationFile(textStat0,textStat1,textStat2,movingText,percentage,filename) {
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

    gms.write(filename, function (err) {console.log(err)});
}
