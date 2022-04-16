export default function RenmameVariable(listOfChanges, originalName, outputList) {
    for (var i in listOfChanges) {
        //TODO: inheritance
        if ('tokens' in listOfChanges[i]) {
            for (var token of listOfChanges[i].tokens) {
                if (token.isIdentifier && token.text == originalName) outputList.push(token);
            }
        }
        else RenmameVariable(listOfChanges[i].children, originalName, outputList );
    }
}