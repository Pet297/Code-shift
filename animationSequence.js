import VariableRename from './variableRenamer.js';

export function GetAnimationSequence(sourceChanges, destinationChanges, renames)
{
    var animationList = [];

    // Step 1 - List removals
    for (var index in sourceChanges) {
        if (sourceChanges[index].address == 'x') animationList.push(new DeletingAnimation(index));
    }

    // Step 1.5 - Add renames
    for (var origName in renames) {
        var affectedTokens = [];
        VariableRename(sourceChanges, origName, affectedTokens);

        var anim = new RenamingAnimation(origName, renames[origName], affectedTokens);
        animationList.push(anim);
        // TODO: Not propagate on children?
        // TODO: Be specific about block
    }

    // Step 2 - From top to bottom move things up.
    for (var index in destinationChanges) {
        if (destinationChanges[index].address == '+') {
            animationList.push(new AddingAnimation(index));
        }
        else {
            var srcaddress = destinationChanges[index].address;

            // Move up
            animationList.push(new MovingUpAnimation(srcaddress));

            // Apply changes, or do internal animation
            if (sourceChanges[srcaddress].children.length != 0 || destinationChanges[index].children != 0) animationList.push(new InternalAnimationSequence(srcaddress, GetAnimationSequence(sourceChanges[srcaddress].children, destinationChanges[index].children, renames)));
            else if (!CheckTokensSame(sourceChanges[srcaddress].tokens, destinationChanges[index].tokens)) animationList.push(new ChangingAnimation(srcaddress));
        }
    }
    // TODO[09]: Reduce number of animations by grouping related ones.
    return animationList;
}

function CheckTokensSame(tokens1, tokens2) {
    if (tokens1.length != tokens2.length) return false;
    for (var i = 0; i < tokens1.length; i++) {
        if (tokens1[i].text != tokens2[i].text) return false;
    }
    return true;
}

export class DeletingAnimation {
    constructor (sourceAddress)
    {
        this.sourceAddress = sourceAddress;
    }
}

export class MovingUpAnimation {
    constructor (sourceAddress)
    {
        this.sourceAddress = sourceAddress;
    }
}

export class ChangingAnimation {
    constructor (sourceAddress)
    {
        this.sourceAddress = sourceAddress;
    }
}

export class InternalAnimationSequence {
    constructor (sourceAddress, animationSequence)
    {
        this.sourceAddress = sourceAddress;
        this.animationSequence = animationSequence;
    }
}

export class AddingAnimation {
    constructor (destinationAddress)
    {
        this.destinationAddress = destinationAddress;
    }
}

export class RenamingAnimation {
    constructor (origName, newName, tokensToRename)
    {
        this.origName = origName;
        this.newName = newName;
        this.tokens = tokensToRename;
    }
}