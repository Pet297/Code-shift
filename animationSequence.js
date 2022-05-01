import { ListOfChanges } from './distance.js';
import { TokenInfo } from './languageInterface.js';
import VariableRename from './identifierFinder.js';

/**
 * Given lists of changes and possibly renames, returns list of animation commands that visualises the given lists of changes.
 * @param {ListOfChanges} sourceChanges List of source changes within the current block.
 * @param {ListOfChanges} destinationChanges List of destination changes within the current block.
 * @param {object} renames List of renames for the current block.
 * @param {object} parentRenames List of renames for the parent block of the current block.
 * @returns 
 */
export function GetAnimationSequence(sourceChanges, destinationChanges, renames = {}, parentRenames = {})
{
    var animationList = [];

    // A) List removals
    for (var index = 0; index < sourceChanges.length; ) {

        var deletionsList = [];

        while (sourceChanges[index]?.address == 'x') {
            deletionsList.push(index);
            index++;
        }

        if (deletionsList.length == 0) index++;
        else animationList.push(new DeletingCommand(deletionsList));
    }

    // B) Add renames
        for (var origName in renames) {
            if (!(origName in parentRenames)) {
            var affectedTokens = [];
            VariableRename(sourceChanges, origName, affectedTokens);

            var anim = new RenamingCommand(origName, renames[origName], affectedTokens);
            animationList.push(anim);
        }
    }

    // C) From top to bottom move things up and edit.
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
            var toSkip = 0;
            var srcaddress = destinationChanges[index].address;
            var multiN = false;
            var multiM = false;

            if (typeof srcaddress === "string" && srcaddress.startsWith('M')) multiN = true;

            // List of what will move up
            var toMoveUp = srcaddress;
            if (multiN) toMoveUp = parseInt(toMoveUp.substring(1));
            if (!Array.isArray(toMoveUp)) toMoveUp = [toMoveUp];
            else multiM = true;

            // Look ahead for grouped removes (only if not M-to-1 rewrite)
            if (!multiM && !multiN) {
                var expected = index + 1;
                toSkip = 0;
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
            }

            // Push Moving Animation
            animationList.push(new MovingUpCommand(toMoveUp));

            // Apply changes to everything that was moved up (or do its internal animation)
            for (var i = 0; i <= toSkip; i++) {
                // M-to-1 nonsemantic
                if (multiM) animationList.push(new ChangingCommand(toMoveUp, [index]));
                // 1-to-N nonsemantic
                else if (multiN) animationList.push(new ChangingCommand(toMoveUp, sourceChanges[toMoveUp[0]].address));
                // 1-to-1 semantic
                else if (sourceChanges[toMoveUp[i]].children.length != 0 && destinationChanges[index].children != 0) animationList.push(new InternalCommandSequence(toMoveUp[i], GetAnimationSequence(sourceChanges[toMoveUp[i]].children, destinationChanges[index].children, sourceChanges[toMoveUp[i]].renames, renames)));
                // 1-to-1 nonsemantic
                else if (!CheckTokensSame(sourceChanges[toMoveUp[i]].tokens, destinationChanges[index].tokens)) {
                    animationList.push(new ChangingCommand([toMoveUp[i]], [sourceChanges[toMoveUp[i]].address]));
                }
                if (i != toSkip) index++;
            }

            if (multiN) index += sourceChanges[toMoveUp[0]].address.length - 1;
        }
    }
    return animationList;
}

/**
 * Checks whether two lists of tokens are the same.
 * @param {TokenInfo[]} tokens1 First list of tokens.
 * @param {TokenInfo[]} tokens2 Second list of tokens.
 * @returns {boolean} boolean value indicating whether the tokens are the same.
 */
function CheckTokensSame(tokens1, tokens2) {
    if (tokens1.length != tokens2.length) return false;
    for (var i = 0; i < tokens1.length; i++) {
        if (tokens1[i].text != tokens2[i].text) return false;
    }
    return true;
}

/**
 * Class that represents removal of one or more blocks withing the current code.
 */
export class DeletingCommand {
    /**
     * Creates an instance of DeletingCommand.
     * @param {number[]} sourceAddresses List of adresses of blocks to be removed.
     */
    constructor (sourceAddresses)
    {
        this.sourceAddresses = sourceAddresses;
    }
}

/**
 * Class that represents moving a group of blocks up to the begining of the unprocessed area.
 */
export class MovingUpCommand {
    /**
     * Creates an instance of MovingUpCommand.
     * @param {number[]} sourceAddresses List of adresses of blocks to be moved.
     */
    constructor (sourceAddresses)
    {
        this.sourceAddresses = sourceAddresses;
    }
}

/**
 * Class that represents rewriting a group of blocks into a different group of blocks.
 */
export class ChangingCommand {
    /**
     * Creates an instance of ChangingCommand.
     * @param {number[]} sourceAddresses List of adresses of source blocks to be rewritten.
     * @param {number[]} destinationAddresses List of adresses of destination blocks to do the rewrite into.
     */
    constructor (sourceAddresses, destinationAddresses)
    {
        this.sourceAddresses = sourceAddresses;
        this.destinationAddresses = destinationAddresses;
    }
}

/**
 * Class that represents doing a sequnce of animations on child blocks of the given parent block. 
 */
export class InternalCommandSequence {
    /**
     * Creates an instance of InternalCommandSequence.
     * @param {number} sourceAddress The adress of the parent block to animate.
     * @param {*[]} animationSequence List of animation commands to apply to children of the parent block.
     */
    constructor (sourceAddress, animationSequence)
    {
        this.sourceAddress = sourceAddress;
        this.animationSequence = animationSequence;
    }
}

/**
 * Class that represents adding a new block of code. 
 */
export class AddingCommand {
    /**
     * Creates an instance of AddingCommand.
     * @param {number[]} destinationAddresses List of adresses of destination blocks to be added.
     */
    constructor (destinationAddresses)
    {
        this.destinationAddresses = destinationAddresses;
    }
}

/**
 * Class that represents renaming an identifier within the given scope.
 */
export class RenamingCommand {
    /**
     * Creates an instance of RenamingCommand.
     * @param {string} origName Original name of the identifier.
     * @param {string} newName New name of the identifier.
     * @param {TokenInfo[]} tokensToRename List of tokens to be rewritten.
     */
    constructor (origName, newName, tokensToRename)
    {
        this.origName = origName;
        this.newName = newName;
        this.tokens = tokensToRename;
    }
}