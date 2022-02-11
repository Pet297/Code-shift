import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';

export function GetAnimationSequence(sourceChanges, destinationChanges)
{
    var animationList = [];

    // Step 1 - List removals
    for (var index in sourceChanges)
    {
        if (sourceChanges[index].address == 'x') animationList.push(new DeletingAnimation(index));
    }

    // Step 2 - From top to bottom move things up. Go smart about some things

    // This will be used to keep intermediate order of blocks after moving some
    var sourceBlocks = []
    var lastBlock = -1
    for (var index in sourceChanges)
    {
        if (sourceChanges[index].address != 'x') sourceBlocks.push(index);
    }
    // Now figure out the order of animations
    for (var index in destinationChanges)
    {
        if (destinationChanges[index].address == '+') {

            animationList.push(new AddingAnimation(index));

            // Adding animations are independent of moving animations:
            lastBlock = -1
        }
        else
        {
            var srcaddress = destinationChanges[index].address;

            // Move up, unless we are already up.
            if (sourceBlocks[0] != destinationChanges[index].address) animationList.push(new MovingUpAnimation(srcaddress, true));
            else animationList.push(new MovingUpAnimation(srcaddress, false));
            lastBlock = destinationChanges[index].address;
            sourceBlocks = sourceBlocks.filter(function(e){return e != destinationChanges[index].address;});

            // Apply changes
            //if (sourceChanges[srcaddress].children.length == 0 && destinationChanges[index].children == 0)animationList.push(new ChangingAnimation(srcaddress, true));
            // TODO: but only if there are any to apply

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
    constructor (sourceAddress, execute = true)
    {
        this.sourceAddress = sourceAddress;
        this.execute = execute;
    }
}

export class ChangingAnimation {
    constructor (sourceAddress, execute = true)
    {
        this.sourceAddress = sourceAddress;
        this.execute = execute;
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