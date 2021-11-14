import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';

export function GetAnimationSequence(sourceChanges, destinationChanges)
{
    var animationList = [];

    // Step 1 - List removals
    for (var index in sourceChanges)
    {
        if (sourceChanges[index].address == 'x') animationList.push(new DeletingAnimation(index));
    }

    // Step 2 - From top to bottom - move things up (or add them) at each step, check recursively
    for (var index in destinationChanges)
    {
        if (destinationChanges[index].address == '+') animationList.push(new AddingAnimation(index));
        else
        {
            var srcaddress = destinationChanges[index].address;
            animationList.push(new MovingUpAnimation(srcaddress));
            if (sourceChanges[srcaddress].children.length == 0 && destinationChanges[index].children == 0)animationList.push(new ChangingAnimation(srcaddress));
            if (sourceChanges[srcaddress].children.length != 0 || destinationChanges[index].children != 0) animationList.push(new InternalAnimationSequence(srcaddress, GetAnimationSequence(sourceChanges[srcaddress].children, destinationChanges[index].children)));
        }
    }

    // TODO: Remove irrelevant animations related to "adding" whitespace or similar.
    // TODO: Reduce number of animations by grouping related ones.
    return animationList;
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