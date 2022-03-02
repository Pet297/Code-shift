import xmljs from 'xml2js';
import fs from 'fs';
import { CodeChange } from './distance.js';

// Given 2 lists of changes between source and destination, serializes them as XML into given file
export function ListOfChangesToFile(sourceChanges, destinationChanges, renames, outputFile, resolve) {

    // A) Convert list of changes to library-friendly representation
    var srcc = ChangesToSimpleObject(sourceChanges);
    var dstc = ChangesToSimpleObject(destinationChanges);
    var obj = {src: srcc, dst: dstc, renames: renames}

    // B) Convert the object to an XML string
    var builder = new xmljs.Builder();
    var xml = builder.buildObject(obj);

    // C) Write it to a file
    fs.writeFile(outputFile, xml, 'utf8', ()=>{resolve()})
}

// Given a file, deserializes it into two lists of changes, returned as one object
export function FileToListOfChanges(file) {

    // A) Read XML file
    var xml = fs.readFileSync(file).toString();

    // B) Using the library, convert it to a simple object
    var obj = undefined;
    xmljs.parseString(xml, (err, result) => {
        obj = result;
    });

    // C) Convert the simple object to 'CodeChange' type.
    var srcc = SimpleObjectToChanges(obj.root.src);
    var dstc = SimpleObjectToChanges(obj.root.dst);
    var renc = SimpleObjectToChanges(obj.root.renames)

    return {src:srcc, dst:dstc, renames:renc};
}

// Converts a list of changes into a different representation to work well with the XML library
function ChangesToSimpleObject(listOfChanges) {
    var obj = {};
    for (var id in listOfChanges) {
        obj['_' + id] = {};
        obj['_' + id].address = listOfChanges[id].address;
        obj['_' + id].children = ChangesToSimpleObject(listOfChanges[id].children);
    }
    return obj;
}

// Converts a XML-library-friendly representation back to list of changes
function SimpleObjectToChanges(obj) {
    if (obj[0] == '') return[];
    var output = [];
    for (var key in obj[0]) {
        var pos = key.substring(1);
        output[pos] = new CodeChange(obj[0][key][0].address[0], SimpleObjectToChanges(obj[0][key][0].children));
    }
    return output;
}
