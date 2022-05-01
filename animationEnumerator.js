import { DeletingCommand, AddingCommand, MovingUpCommand, ChangingCommand, InternalCommandSequence, RenamingCommand} from './animationSequence.js';
import { CheckTokensEqual, ListOfChanges } from './distance.js';
import { TokenInfo } from './languageInterface.js';

/**
 * Class, which enumerates animations based on the list of changes, that trasforms original source code into the new one.
 */
export class AnimationEnumerator
{
    _processedText = [];
    _toProcess = [];
    _unprocessedText = [];

    _currentChildIndex = -1;

    _sourceChanges = [];
    _destinationChanges = [];
    _animationSequence = [];

    /**
     * Creates an instance of AnimationEnumerator
     * @param {ListOfChanges} sourceChanges List of changes applied to original source code.
     * @param {ListOfChanges} destinationChanges List of changes to get to the destination source code.
     * @param {*[]} animationSequence List of animation commands to process.
     */
    constructor(sourceChanges, destinationChanges, animationSequence)
    {
        this._sourceChanges = sourceChanges;
        this._destinationChanges = destinationChanges;
        this._animationSequence = animationSequence;

        BuildInitialArray(this._sourceChanges, this._unprocessedText);
    }

    /**
     * Enumerates all animations to transform the original source code.
     */
    *EnumerateAnimations()
    {
        // While there are animations to do, do them
        for (var anim of this._animationSequence) {
            yield* this._yieldAndApply(anim);
        }
        // If there is nothing left to do, yield the final state of the code.
        yield new EndingAnimation(this._getTokens(this._processedText));
    }

    /**
     * Given an animation command, translates it into an animation, yields it, and cleans up to state of this AnimationEnumerator.
     * @param {*} command Animation command to execute.
     */
    *_yieldAndApply(command) {
        if (command instanceof MovingUpCommand) {
            // Clear previous moving up if uncleared          
            this._processedText = this._processedText.concat(this._toProcess);
            this._toProcess = [];
            // Get bounds of the moving text
            var index0 = IndexOfBlock(command.sourceAddresses[0], this._unprocessedText);
            var index1 = index0 + command.sourceAddresses.length;
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
            var index = IndexOfBlock(command.sourceAddresses[0], this._toProcess);
            // Partially clear the 'toProcess' list
            this._processedText = this._processedText.concat(this._toProcess.slice(0,index));
            this._toProcess = this._toProcess.slice(index + command.sourceAddresses.length);
            // Build array for animation
            var from = [];
            var to = [];
            for (var a of command.sourceAddresses) from.push([a,'o']);
            for (var a of command.destinationAddresses) to.push([a,'*']);

            // Yield the animation
            var ret = new ChangingAnimation(
                this._getTokens(this._processedText),
                this._getTokens(to),
                this._getTokens(from),
                this._getTokens(this._toProcess.concat(this._unprocessedText))
            );
            if (ChangesAnything(ret)) yield ret;
            // Return to normalized state
            this._processedText = this._processedText.concat(to);
        }
        else if (command instanceof AddingCommand) {
            // Clear previous moving up if uncleared          
            this._processedText = this._processedText.concat(this._toProcess);
            this._toProcess = [];
            // Build up the list of blocks
            var added = [];
            for (var i of command.destinationAddresses) {
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
            var index0 = IndexOfBlock(command.sourceAddresses[0], this._unprocessedText);
            var index1 = index0 + command.sourceAddresses.length;
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
            var innerEnumerator = new AnimationEnumerator(
                this._sourceChanges[childIndex].children,
                this._destinationChanges[this._sourceChanges[childIndex].address].children,
                command.animationSequence);
            // Do the inner cycle of yields to perform the child animation
            for(var childAnimation of innerEnumerator.EnumerateAnimations()) {
                // Finished ?
                if (childAnimation instanceof EndingAnimation) break;
                // Yield result of child animation (flatten it first)
                var ret = FlattenAnimation(
                    childAnimation,
                    this._getTokens(this._processedText),
                    this._getTokens(this._toProcess.concat(this._unprocessedText)),
                    );
                if (ChangesAnything(ret)) yield ret;
            }
            // Return to normalized state
            this._processedText = this._processedText.concat([[this._sourceChanges[command.sourceAddress].address,'*']]);
        }
    }

    /**
     * Gets tokens addressed by the intermediate code state representation.
     * @param {[number, string][]} blockList The intermediate code state representation to get tokens from.
     * @returns {TokenInfo[]} The list of the tokens.
     */
    _getTokens(blockList) {
        var tokens = [];

        for (var block of blockList) {
            if (block[1] == 'o') {
                var tokens1 = TokensByAdress(this._sourceChanges,block[0]);
                tokens = tokens.concat(tokens1);
            }
            else if (block[1] == '+') {
                var tokens1 = TokensByAdress(this._destinationChanges,block[0]);
                tokens = tokens.concat(tokens1);
            }
            else if (block[1] == 'x') {
                var tokens1 = TokensByAdress(this._sourceChanges,block[0]);
                tokens = tokens.concat(tokens1);
            }
            else if (block[1] == '*') {
                var tokens1 = TokensByAdress(this._destinationChanges,block[0]);
                tokens = tokens.concat(tokens1);
            }
        }

        return tokens;
    }
}

/**
 * Given the intermediate code state, finds position of a block in the list.
 * @param {number} blockId The original index of the block to find.
 * @param {[number,string][]} blockList The intermediate code state to search in.
 * @returns {number} Position of the block within the list.
 */
function IndexOfBlock(blockId, blockList) {
    for (var key = 0; key < blockList.length; key++) {
        if (blockList[key][0] == blockId) return key;
    }
    throw Error("Index out of range in 'IndexOfBlock' in 'animationEnumerator.js'.");
}

/**
 * Checks, whether the given animation object visualy changes anything.
 * For example, moving 0 block doesn't visualy change anything.
 * @param {*} animation The animation object to check.
 * @returns {boolean} boolean value indicating if anything is changed.
 */
function ChangesAnything(animation) {
    if (animation instanceof MovingUpAnimation && (animation.textMovingDown.length == 0 || animation.textMovingUp.length == 0)) return false;
    if (animation instanceof AddingAnimation && animation.textBeingAdded.length == 0) return false;
    if (animation instanceof RemovingAnimation && animation.textBeingRemoved.length == 0) return false;
    if (animation instanceof ChangingAnimation && CheckTokensEqual(animation.textChangingFrom, animation.textChangingTo)) return false;
    if (animation instanceof RenamingAnimation && (animation.renameFrom == undefined || animation.renameTo == undefined || animation.renameFrom == animation.renameTo)) return false;
    return true;
}

/**
 * Builds initial intermediate code state, consisting of unchanged blocks in original order.
 * @param {ListOfChanges} sourceChanges The list of changes to follow.
 * @param {[]} unproccessedList Output list to store the intermediate code state.
 */
function BuildInitialArray(sourceChanges, unproccessedList) {
    for (var i = 0; i < sourceChanges.length; i++)
    {
        unproccessedList.push([i,'o']);
    }
}

/**
 * Flattens nested animation into a single animation object for output.
 * @param {*} childAnimation The nested animation.
 * @param {TokenInfo[]} parentTextAbove List of stationary parent tokens to prepend.
 * @param {TokenInfo[]} parentTextBelow List of stationary parent tokens to append.
 * @returns {*} The flattened animation.
 */
function FlattenAnimation(childAnimation, parentTextAbove, parentTextBelow) {  
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

/**
 * Given a list of changes and an address, returns all tokens of the addressed block.
 * @param {ListOfChanges} listOfChanges Either source or destination list, containing the adressed block.
 * @param {number} address Adress of the block.
 * @returns {TokenInfo[]} List of tokens of the addressed block.
 */
function TokensByAdress(listOfChanges, address) {
    if ('tokens' in listOfChanges[address]) return listOfChanges[address].tokens;
    else
    {
        return GetAllText(listOfChanges[address]);
    }
}

/**
 * Gets all tokens of a block of code (possibly non-leaf).
 * @param {ListOfChanges} change The list of changes to get the tokens from.
 * @returns {TokenInfo[]} List of all of the tokens.
 */
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

/**
 * Class representing all required information for animating blocks moving up.
 */
export class MovingUpAnimation {
    
    textAbove = [];
    textMovingDown = [];
    textMovingUp = [];
    textBelow = [];
    
    /**
     * Creates an instace of MovingUpAnimation.
     * @param {TokenInfo[]} textAbove List of stationary tokens above the moving text.
     * @param {TokenInfo[]} textMovingDown List of tokens switching place by moving down.
     * @param {TokenInfo[]} textMovingUp List of tokens switching place by moving up.
     * @param {TokenInfo[]} textBelow List of stationary tokens below the moving text.
     */
    constructor(textAbove, textMovingDown, textMovingUp, textBelow) {
        this.textAbove = textAbove;
        this.textMovingDown = textMovingDown;
        this.textMovingUp = textMovingUp;
        this.textBelow = textBelow;
    }
}
/**
 * Class representing all required information for animating blocks being rewritten.
 */
export class ChangingAnimation {
    
    textAbove = [];
    textChangingFrom = [];
    textChangingTo = [];
    textBelow = [];
    
    /**
     * Creates an instace of ChangingAnimation.
     * @param {TokenInfo[]} textAbove List of stationary tokens above the changing text.
     * @param {TokenInfo[]} textChangingFrom List of tokens being rewritten, before the rewrite.
     * @param {TokenInfo[]} textChangingTo List of tokens being rewritten, after the rewrite.
     * @param {TokenInfo[]} textBelow List of stationary tokens below the changing text.
     */
    constructor(textAbove, textChangingFrom, textChangingTo, textBelow) {
        this.textAbove = textAbove;
        this.textChangingFrom = textChangingFrom;
        this.textChangingTo = textChangingTo;
        this.textBelow = textBelow;
    }
}
/**
 * Class representing all required information for animating blocks being added.
 */
export class AddingAnimation {
    
    textAbove = [];
    textBeingAdded = [];
    textBelow = [];
    
    /**
     * Creates an instace of AddingAnimation.
     * @param {TokenInfo[]} textAbove List of stationary tokens above the added text.
     * @param {TokenInfo[]} textBeingAdded List of tokens being added.
     * @param {TokenInfo[]} textBelow List of stationary tokens below the added text.
     */
    constructor(textAbove, textBeingAdded, textBelow) {
        this.textAbove = textAbove;
        this.textBeingAdded = textBeingAdded;
        this.textBelow = textBelow;
    }
}
/**
 * Class representing all required information for animating blocks being deleted.
 */
export class RemovingAnimation {
    
    textAbove = [];
    textBeingRemoved = [];
    textBelow = [];
    
    /**
     * Creates an instace of RemovingAnimation.
     * @param {TokenInfo[]} textAbove List of stationary tokens above the deleted text.
     * @param {TokenInfo[]} textBeingRemoved List of tokens being deleted.
     * @param {TokenInfo[]} textBelow List of stationary tokens below the deleted text.
     */
    constructor(textAbove, textBeingRemoved, textBelow) {
        this.textAbove = textAbove;
        this.textBeingRemoved = textBeingRemoved;
        this.textBelow = textBelow;
    }
}
/**
 * Class representing all required information for animating identifiers being renamed.
 */
export class RenamingAnimation {
    
    textAbove = [];
    textChanging = [];
    textBelow = [];
    renameFrom = "";
    renameTo = "";
    
    /**
     * Creates an instace of RenamingAnimation.
     * @param {TokenInfo[]} textAbove List of unchanged tokens above the edited text.
     * @param {TokenInfo[]} textChanging List of tokens, where renames are happening.
     * @param {TokenInfo[]} textBelow List of unchanged tokens below the edited text.
     * @param {string} renameFrom Original name of the identifiers.
     * @param {string} renameTo New name of the identifiers.
     */
    constructor(textAbove, textChanging, textBelow, renameFrom, renameTo) {
        this.textAbove = textAbove;
        this.textChanging = textChanging;
        this.textBelow = textBelow;
        this.renameFrom = renameFrom;
        this.renameTo = renameTo;
    }
}
/**
 * Class representing the end of an animation sequence with resulting code.
 */
export class EndingAnimation {
    
    text = [];
    
    /**
     * Creates an instace of EndingAnimation.
     * @param {TokenInfo[]} text List of all tokens in the resulting code.
     */
    constructor(text) {
        this.text = text;
    }
}