import xmljs from 'xml2js';
import fs from 'fs';
import { CodeChange } from './distance.js';

export function ListOfChangesToFile(sourceChanges, destinationChanges, outputFile, resolve) {

    var srcc = ChangesToSimpleObject(sourceChanges);
    var dstc = ChangesToSimpleObject(destinationChanges);

    var obj = {src: srcc, dst: dstc}
    var builder = new xmljs.Builder();
    var xml = builder.buildObject(obj);

    fs.writeFile(outputFile, xml, 'utf8', ()=>{resolve()})
}

export function FileToListOfChanges(file) {
    var xml = fs.readFileSync(file).toString();
    var obj = undefined;
    xmljs.parseString(xml, (err, result) => {
        obj = result;
    });

    var srcc = SimpleObjectToChanges(obj.root.src);
    var dstc = SimpleObjectToChanges(obj.root.dst);

    return {src:srcc, dst:dstc};
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
    if (obj[0] == '') return[];
    var output = [];
    for (var key in obj[0]) {
        var pos = key.substring(1);
        output[pos] = new CodeChange(obj[0][key][0].address[0], SimpleObjectToChanges(obj[0][key][0].children));
    }
    return output;
}
