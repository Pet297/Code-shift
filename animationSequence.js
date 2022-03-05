export function GetAnimationSequence(sourceChanges, destinationChanges)
{
    var animationList = [];

    // Step 1 - List removals
    for (var index in sourceChanges)
    {
        if (sourceChanges[index].address == 'x') animationList.push(new DeletingAnimation(index));
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
            if (sourceChanges[srcaddress].children.length != 0 || destinationChanges[index].children != 0) animationList.push(new InternalAnimationSequence(srcaddress, GetAnimationSequence(sourceChanges[srcaddress].children, destinationChanges[index].children)));
            else if (sourceChanges[srcaddress].rawText != destinationChanges[index].rawText) animationList.push(new ChangingAnimation(srcaddress));
        }
    }
    // TODO[09]: Reduce number of animations by grouping related ones.
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