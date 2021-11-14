import fs from 'fs';
import gm from 'gm';

export function WriteTestFile()
{
    let imageMagick = gm.subClass({imageMagick: true});

    imageMagick(400,400,'#000F')
    .setFormat('gif')
    .fill('#ffffff')
    .font('Consolas')
    .fontSize(15)
    .drawText(-10,25,'. function Hello(world) {')
    .drawText(-10,45,'.     console.log(\'Hello \' + world + \'!\');')
    .drawText(-10,65,'. }')
    .write('./.output/testout.gif', function (err) {console.log(err)});
}