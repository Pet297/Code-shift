import VariableRename from './variableRenamer.js';

export function GetAnimationSequence(sourceChanges, destinationChanges, renames = {}, parentRenames = {})
{
    var animationList = [];

    // Step 1 - List removals
    for (var index = 0; index < sourceChanges.length; ) {

        var deletionsList = [];

        while (sourceChanges[index]?.address == 'x') {
            deletionsList.push(index);
            index++;
        }

        if (deletionsList.length == 0) index++;
        else animationList.push(new DeletingCommand(deletionsList));
    }

    // Step 2 - Add renames
        for (var origName in renames) {
            if (!(origName in parentRenames)) {
            var affectedTokens = [];
            VariableRename(sourceChanges, origName, affectedTokens);

            var anim = new RenamingCommand(origName, renames[origName], affectedTokens);
            animationList.push(anim);
        }
    }

    // Step 3 - From top to bottom move things up.
    for (var index = 0; index < destinationChanges.length; index++) {
        if (destinationChanges[index].address == '+') {

            var additionsList = [];

            while (destinationChanges[index]?.address == '+') {
                additionsList.push(index);
                index++;
            }

            animationList.push(new AddingCommand(additionsList));
            index--;
        }
        else {
            var srcaddress = destinationChanges[index].address;

            // List of what will move up
            var toMoveUp = [srcaddress];

            // Look ahead for grouped renames
            var expected = index + 1;
            var toSkip = 0;
            for (var index2 = srcaddress + 1; index2 < sourceChanges.length; index2++) {
                if (sourceChanges[index2]?.address == 'x');
                else if (sourceChanges[index2]?.address == expected) {
                    // Add to group
                    toMoveUp.push(index2);
                    expected++;
                    toSkip++;
                }
                else break;
            }

            // Push Moving Animation
            animationList.push(new MovingUpCommand(toMoveUp));

            // Apply changes to everything that was moved up (or do its internal animation)
            for (var i = 0; i <= toSkip; i++) {
                if (sourceChanges[toMoveUp[i]].children.length != 0 && destinationChanges[index].children != 0) animationList.push(new InternalCommandSequence(toMoveUp[i], GetAnimationSequence(sourceChanges[toMoveUp[i]].children, destinationChanges[index].children, sourceChanges[toMoveUp[i]].renames, renames)));
                else if (!CheckTokensSame(sourceChanges[toMoveUp[i]].tokens, destinationChanges[index].tokens)) animationList.push(new ChangingCommand(toMoveUp[i]));
                if (i != toSkip) index++;
            }
        }
    }
    return animationList;
}

function CheckTokensSame(tokens1, tokens2) {
    if (tokens1.length != tokens2.length) return false;
    for (var i = 0; i < tokens1.length; i++) {
        if (tokens1[i].text != tokens2[i].text) return false;
    }
    return true;
}

export class DeletingCommand {
    constructor (sourceAddress)
    {
        this.sourceAddress = sourceAddress;
    }
}

export class MovingUpCommand {
    constructor (sourceAddress)
    {
        this.sourceAddress = sourceAddress;
    }
}

export class ChangingCommand {
    constructor (sourceAddress)
    {
        this.sourceAddress = sourceAddress;
    }
}

export class InternalCommandSequence {
    constructor (sourceAddress, animationSequence)
    {
        this.sourceAddress = sourceAddress;
        this.animationSequence = animationSequence;
    }
}

export class AddingCommand {
    constructor (destinationAddress)
    {
        this.destinationAddress = destinationAddress;
    }
}

export class RenamingCommand {
    constructor (origName, newName, tokensToRename)
    {
        this.origName = origName;
        this.newName = newName;
        this.tokens = tokensToRename;
    }
}