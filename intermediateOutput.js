import xmljs from 'xml2js';
import fs from 'fs';
import { CodeChange, ListOfChanges } from './distance.js';

/**
 * Serializes given list of changes to an XML file.
 * @param {ListOfChanges} sourceChanges 
 * @param {ListOfChanges} destinationChanges 
 * @param {string} outputFile 
 * @param {(value: any) => void} callback Callback function for asynchronous execution.
 */
export function ListOfChangesToFile(sourceChanges, destinationChanges, outputFile, callback) {

    // A) Convert list of changes to library-friendly representation
    var srcc = ChangesToSimpleObject(sourceChanges);
    var dstc = ChangesToSimpleObject(destinationChanges);
    var obj = {src: srcc, dst: dstc}

    // B) Convert the object to an XML string
    var builder = new xmljs.Builder();
    var xml = builder.buildObject(obj);

    // C) Write it to a file
    fs.writeFile(outputFile, xml, 'utf8', ()=>{callback()})
}

/**
 * Deserializes a list of changes from an XML file.
 * @param {string} file 
 * @returns {object} Object containing two ListOfChanges, one for source and one for destination.
 */
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

    return {src:srcc, dst:dstc};
}

/**
 * Converts a list of changes into a different representation for the xml2js library.
 * @param {ListOfChanges} listOfChanges The list of changes that is to be serialized.
 * @returns {object} A different representation of the list of changes.
 */
function ChangesToSimpleObject(listOfChanges) {
    var obj = {};
    for (var id in listOfChanges) {
        obj['_' + id] = {};
        obj['_' + id].address = listOfChanges[id].address;
        obj['_' + id].children = ChangesToSimpleObject(listOfChanges[id].children);
        obj['_' + id].renames = listOfChanges[id].renames;
    }
    return obj;
}

/**
 * Converts xml2js-friendly representation of list of changes back to internal representation.
 * @param {object} obj The object that was deserialized.
 * @returns {ListOfChanges} The resulting list of changes that was deserialized.
 */
function SimpleObjectToChanges(obj) {
    if (obj[0] == '') return[];
    var output = [];
    for (var key in obj[0]) {
        var pos = key.substring(1);
        output[pos] = new CodeChange(obj[0][key][0].address[0], SimpleObjectToChanges(obj[0][key][0].children), obj[0][key][0].renames?.[0]);
    }
    return output;
}
