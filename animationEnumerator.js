import { DeletingCommand, AddingCommand, MovingUpCommand, ChangingCommand, InternalCommandSequence, RenamingCommand} from './animationSequence.js';
import { checkTokensEqual } from './distance.js';

export class IntermediateTextEnumerator
{
    _processedText = [];
    _toProcess = [];
    _unprocessedText = [];

    _currentChildIndex = -1;

    _sourceChanges = [];
    _destinationChanges = [];
    _animationSequence = [];

    // Prepares everething to enumerate intermediate code states between the versions.
    constructor(sourceChanges, destinationChanges, animationSequence)
    {
        this._sourceChanges = sourceChanges;
        this._destinationChanges = destinationChanges;
        this._animationSequence = animationSequence;

        BuildInitialArray(this._sourceChanges, this._unprocessedText);
    }

    // Enumerates animations to do for GIF output
    *EnumerateStillTexts()
    {
        // While there are animations to do, do them
        for (var anim of this._animationSequence) {
            yield* this._yieldAndApply(anim);
        }
        // If there is nothing left to do, yield the final state of the code.
        yield new EndingAnimation(this._getTokens(this._processedText));
    }

    *_yieldAndApply(command) {
        if (command instanceof MovingUpCommand) {
            // Clear previous moving up if uncleared          
            this._processedText = this._processedText.concat(this._toProcess);
            this._toProcess = [];
            // Get bounds of the moving text
            var index0 = IndexOfBlock(command.sourceAddress[0], this._unprocessedText);
            var index1 = index0 + command.sourceAddress.length;
            // Isolate the moving text
            var unproccessedAbove = this._unprocessedText.slice(0, index0);
            var changedList = this._unprocessedText.slice(index0, index1);
            var unproccessedBelow = this._unprocessedText.slice(index1);
            // Yield the animation
            var ret = new MovingUpAnimation(
                this._getTokens(this._processedText),
                this._getTokens(unproccessedAbove),
                this._getTokens(changedList),
                this._getTokens(unproccessedBelow)
            );
            if (ChangesAnything(ret)) yield ret;
            // Return to normalized state
            this._toProcess = changedList;
            this._unprocessedText = unproccessedAbove.concat(unproccessedBelow);
        }
        else if (command instanceof ChangingCommand) {
            // Find the changing text
            var index = IndexOfBlock(command.sourceAddress, this._toProcess);
            // Partially clear the 'toProcess' list
            this._processedText = this._processedText.concat(this._toProcess.slice(0,index));
            this._toProcess = this._toProcess.slice(index + 1);
            // Yield the animation
            var ret = new ChangingAnimation(
                this._getTokens(this._processedText),
                this._getTokens([[command.sourceAddress,'*']]),
                this._getTokens([[command.sourceAddress,'o']]),
                this._getTokens(this._toProcess.concat(this._unprocessedText))
            );
            if (ChangesAnything(ret)) yield ret;
            // Return to normalized state
            this._processedText = this._processedText.concat([[command.sourceAddress,'*']]);
        }
        else if (command instanceof AddingCommand) {
            // Clear previous moving up if uncleared          
            this._processedText = this._processedText.concat(this._toProcess);
            this._toProcess = [];
            // Build up the list of blocks
            var added = [];
            for (var i of command.destinationAddress) {
                added.push([i,'+']);
            }
            // Yield the animation
            var ret = new AddingAnimation(
                this._getTokens(this._processedText),
                this._getTokens(added),
                this._getTokens(this._unprocessedText)
            );
            if (ChangesAnything(ret)) yield ret;
            // Add the new text
            this._processedText = this._processedText.concat(added);
        }
        else if (command instanceof DeletingCommand) {
            // Clear previous moving up if uncleared          
            this._processedText = this._processedText.concat(this._toProcess);
            this._toProcess = [];
            // Get bounds of the deleted text
            var index0 = IndexOfBlock(command.sourceAddress[0], this._unprocessedText);
            var index1 = index0 + command.sourceAddress.length;
            // Isolate the deleted text
            var unproccessedAbove = this._unprocessedText.slice(0, index0);
            var changedList = this._unprocessedText.slice(index0, index1);
            var unproccessedBelow = this._unprocessedText.slice(index1);
            // Yield the animation
            var ret = new RemovingAnimation(
                this._getTokens(this._processedText.concat(unproccessedAbove)),
                this._getTokens(changedList),
                this._getTokens(unproccessedBelow)
            );
            if (ChangesAnything(ret)) yield ret;
            // Return to normalized state
            this._unprocessedText = unproccessedAbove.concat(unproccessedBelow);
        }
        else if (command instanceof RenamingCommand) {
            // Clear previous moving up if uncleared          
            this._processedText = this._processedText.concat(this._toProcess);
            this._toProcess = [];
            // Yield the animation
            var ret = new RenamingAnimation(
                this._getTokens(this._processedText),
                this._getTokens(this._unprocessedText),
                [],
                command.origName,
                command.newName
            );
            if (ChangesAnything(ret)) yield ret;
            // Actually apply the rename
            for (var token of command.tokens) {
                token.text = command.newName;
            }
        }
        else if (command instanceof InternalCommandSequence) {
            // Find the changing text
            var index = IndexOfBlock(command.sourceAddress, this._toProcess);
            // Partially clear the 'toProcess' list
            this._processedText = this._processedText.concat(this._toProcess.slice(0,index));
            this._toProcess = this._toProcess.slice(index + 1);       
            // Start the child object
            var childIndex = command.sourceAddress;
            var innerEnumerator = new IntermediateTextEnumerator(
                this._sourceChanges[childIndex].children,
                this._destinationChanges[this._sourceChanges[childIndex].address].children,
                command.animationSequence);
            // Do the inner cycle of yields to perform the child animation
            for(var childAnimation of innerEnumerator.EnumerateStillTexts()) {
                // Finished ?
                if (childAnimation instanceof EndingAnimation) break;
                // Yield result of child animation (flatten it first)
                var ret = MergeAnimationIntoParent(
                    childAnimation,
                    this._getTokens(this._processedText),
                    this._getTokens(this._toProcess.concat(this._unprocessedText)),
                    );
                if (ChangesAnything(ret)) yield ret;
            }
            // Return to normalized state
            this._processedText = this._processedText.concat([[command.sourceAddress,'*']]);
        }
    }

    _getTokens(blockList) {
        var tokens = [];

        for (var block of blockList) {
            if (block[1] == 'o') {
                var tokens1 = FindByAddress(this._sourceChanges,block[0]);
                tokens = tokens.concat(tokens1);
            }
            else if (block[1] == '+') {
                var tokens1 = FindByAddress(this._destinationChanges,block[0]);
                tokens = tokens.concat(tokens1);
            }
            else if (block[1] == 'x') {
                var tokens1 = FindByAddress(this._sourceChanges,block[0]);
                tokens = tokens.concat(tokens1);
            }
            else if (block[1] == '*') {
                var tokens1 = FindByAddress(this._destinationChanges,this._sourceChanges[block[0]].address);
                tokens = tokens.concat(tokens1);
            }
        }

        return tokens;
    }
}

function IndexOfBlock(blockId, blockList) {
    for (var key = 0; key < blockList.length; key++) {
        if (blockList[key][0] == blockId) return key;
    }
    throw Error("Index out of range in 'IndexOfBlock' in 'animationEnumerator.js'.");
}

// Check whether given animation object actually changes something about the code.
//  eg. moving 0 tokens doesn't change anything.
function ChangesAnything(animation) {
    if (animation instanceof MovingUpAnimation && (animation.textMovingDown.length == 0 || animation.textMovingUp.length == 0)) return false;
    if (animation instanceof AddingAnimation && animation.textBeingAdded.length == 0) return false;
    if (animation instanceof RemovingAnimation && animation.textBeingRemoved.length == 0) return false;
    if (animation instanceof ChangingAnimation && checkTokensEqual(animation.textChangingFrom, animation.textChangingTo)) return false;
    if (animation instanceof RenamingAnimation && (animation.renameFrom == undefined || animation.renameTo == undefined || animation.renameFrom == animation.renameTo)) return false;
    return true;
}

// Builds array of blocks of code, representing the initial code,
//  before it was changes
function BuildInitialArray(sourceChanges, unproccessedList) {
    for (var i = 0; i < sourceChanges.length; i++)
    {
        unproccessedList.push([i,'o']);
    }
}

// Edits code blocks and moves them around lists based on performed animation,
//  so that intermediate code after the performed animation is drawn properly
//  by the GIF writer.


// Converts nested representation of code blocks positions to flat representation,
//  to work with the GIF animator.
function MergeAnimationIntoParent(childAnimation, parentTextAbove, parentTextBelow) {  
    if (childAnimation instanceof MovingUpAnimation) {
        return new MovingUpAnimation(
            parentTextAbove.concat(childAnimation.textAbove),
            childAnimation.textMovingDown,
            childAnimation.textMovingUp,
            childAnimation.textBelow.concat(parentTextBelow)
            )
    }
    else if (childAnimation instanceof ChangingAnimation) {
        return new ChangingAnimation(
            parentTextAbove.concat(childAnimation.textAbove),
            childAnimation.textChangingFrom,
            childAnimation.textChangingTo,
            childAnimation.textBelow.concat(parentTextBelow)
        )
    }
    else if (childAnimation instanceof AddingAnimation) {
        return new AddingAnimation(
            parentTextAbove.concat(childAnimation.textAbove),
            childAnimation.textBeingAdded,
            childAnimation.textBelow.concat(parentTextBelow)
        )
    }
    else if (childAnimation instanceof RemovingAnimation) {
        return new RemovingAnimation(
            parentTextAbove.concat(childAnimation.textAbove),
            childAnimation.textBeingRemoved,
            childAnimation.textBelow.concat(parentTextBelow)
        )
    }
    else if (childAnimation instanceof RenamingAnimation) {
        return new RenamingAnimation(
            parentTextAbove.concat(childAnimation.textAbove),
            childAnimation.textChanging,
            childAnimation.textBelow.concat(parentTextBelow),
            childAnimation.renameFrom,
            childAnimation.renameTo
        )
    }
    else if (childAnimation instanceof EndingAnimation) {
        return new EndingAnimation(
            parentTextAbove.concat(childAnimation.text, parentTextBelow)
        )
    }
    else throw Error('Unexpected object type passed into "MergeAnimationIntoParent" in "animationEnumerator.js"');
}

// Given a list of changes and an adress, returns part of one of the original source codes.
function FindByAddress(listOfChanges, address) {
    if ('tokens' in listOfChanges[address]) return listOfChanges[address].tokens;
    else
    {
        return GetAllText(listOfChanges[address]);
    }
}

// Gets all text from a non-leaf block of code.
function GetAllText(change) {
    var text = [];
    for (var index in change.children) {
        if ('tokens' in change.children[index]) {
            text = text.concat(change.children[index].tokens);
        }
        else {
            text = text.concat(GetAllText(change.children[index]));
        }
    }
    return text;
}

export class MovingUpAnimation {
    
    textAbove = [];
    textMovingDown = [];
    textMovingUp = [];
    textBelow = [];
    
    constructor(textAbove, textMovingDown, textMovingUp, textBelow) {
        this.textAbove = textAbove;
        this.textMovingDown = textMovingDown;
        this.textMovingUp = textMovingUp;
        this.textBelow = textBelow;
    }
}

export class ChangingAnimation {
    
    textAbove = [];
    textChangingFrom = [];
    textChangingTo = [];
    textBelow = [];
    
    constructor(textAbove, textChangingFrom, textChangingTo, textBelow) {
        this.textAbove = textAbove;
        this.textChangingFrom = textChangingFrom;
        this.textChangingTo = textChangingTo;
        this.textBelow = textBelow;
    }
}

export class AddingAnimation {
    
    textAbove = [];
    textBeingAdded = [];
    textBelow = [];
    
    constructor(textAbove, textBeingAdded, textBelow) {
        this.textAbove = textAbove;
        this.textBeingAdded = textBeingAdded;
        this.textBelow = textBelow;
    }
}

export class RemovingAnimation {
    
    textAbove = [];
    textBeingRemoved = [];
    textBelow = [];
    
    constructor(textAbove, textBeingRemoved, textBelow) {
        this.textAbove = textAbove;
        this.textBeingRemoved = textBeingRemoved;
        this.textBelow = textBelow;
    }
}

export class RenamingAnimation {
    
    textAbove = [];
    textChanging = [];
    textBelow = [];
    renameFrom = "";
    renameTo = "";
    
    constructor(textAbove, textChanging, textBelow, renameFrom, renameTo) {
        this.textAbove = textAbove;
        this.textChanging = textChanging;
        this.textBelow = textBelow;
        this.renameFrom = renameFrom;
        this.renameTo = renameTo;
    }
}

export class EndingAnimation {
    
    text = [];
    
    constructor(text) {
        this.text = text;
    }
}