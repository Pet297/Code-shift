import xmljs from 'xml2js';
import fs from 'fs';
import { CodeChange } from './distance.js';

export function ListOfChangesToFile(sourceChanges, destinationChanges, outputFile, resolve) {

    var srcc = ChangesToSimpleObject(sourceChanges);
    var dstc = ChangesToSimpleObject(destinationChanges);

    //TODO[!!]: Add all 3 modes of execution and add text to the thing bellow.
    var src2 = SimpleObjectToChanges(srcc);

    var obj = {src: srcc, dst: dstc}
    var builder = new xmljs.Builder();
    var xml = builder.buildObject(obj);

    fs.writeFile(outputFile, xml, 'utf8', ()=>{resolve()})
}

function ChangesToSimpleObject(listOfChanges) {
    var obj = {};

    for (var id in listOfChanges) {
        obj['_' + id] = {};
        obj['_' + id].address = listOfChanges[id].address;
        obj['_' + id].children = ChangesToSimpleObject(listOfChanges[id].children);
    }

    return obj;
}

function SimpleObjectToChanges(obj) {
    var output = [];
    for (var key in obj) {
        var index = key.substring(1);
        output[parseInt(index)] = new CodeChange(obj[key].address, SimpleObjectToChanges(obj[key].children));
    }
    return output;
}
