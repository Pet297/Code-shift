import {DeletingAnimation, AddingAnimation, MovingUpAnimation, ChangingAnimation, InternalAnimationSequence} from './animationSequence.js';

//TODO: Renaming Animation

export class IntermediateTextEnumerator
{
    // Prepares everething to enumerate intermediate code states between the versions.
    constructor(sourceChanges, destinationChanges, animationSequence)
    {
        this.unproccessedList2 = [];
        this.unproccessedList = [];
        this.proccessedList = [];
        this.changedList = [];
        this.changedType = {};

        this.currentAddress = [];
        this.sourceChanges = sourceChanges;
        this.destinationChanges = destinationChanges;
        this.animationSequence = animationSequence;

        BuildInitialArray(this.sourceChanges, [], this.unproccessedList);
    }

    // Returns a quintuple of form [c, p, m, u1, u2], where
    //  -c is the performed animation.
    //  -p is stationary processed text.
    //  -m is the text which is moving, or changing.
    //  -u1 and u2 are unprocessed parts of the text.
    //  In case of swapping 'm' is moving up and 'u1' is moving down.
    GetNextStillText()
    {
        // If there is anything to do, do it. (Either do local animation if there is no nested animation, or do the nested animation)
        while (this.animationSequence.length != 0 || 'currentChild' in this) {

            // A) Clear state after the previous animation
            CollapseAnimation(this);

            // B) If there is a nested animation to do, do it.
            if ('currentChild' in this) {

                var childText = this.currentChild.GetNextStillText();

                // B1) The child animation was performed, so return it.
                if (childText !== undefined)
                {
                    return [
                        'I',
                        GetStillText(this.sourceChanges, this.destinationChanges, this.proccessedList),
                        childText,
                        GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList),
                        "",
                        true
                    ];
                }

                // B2) The child animation has ended, time to step out and continue to C.
                else
                {
                    this.proccessedList.push([this.currentChildIndex,'*']);
                    delete this.currentChild;
                    delete this.currentChildIndex;
                }
            }

            // C) There is no nested animation, so do next animation on the list.
            var anim = this.animationSequence.shift();

            // D) The next animation is nested, start it in a child object.
            if (anim instanceof InternalAnimationSequence) {

                // D1) Start the child object
                this.currentChild = new IntermediateTextEnumerator(
                    this.sourceChanges[anim.sourceAddress].children,
                    this.destinationChanges[this.sourceChanges[anim.sourceAddress].address].children,
                    anim.animationSequence);
                this.currentChildIndex = anim.sourceAddress;

                // D2) Update state to reflect D1
                ApplySimpleAnimation(this, anim);

                // D3) Start the while cycle again to perform the child animation
            }

            // E) There is no nested animation and next animation isn't nested either
            else
            {
                // E1) Update state
                ApplySimpleAnimation(this, anim);

                // E2) Based on the updated state, return the text.
                return [
                    this.changedType.type,
                    GetStillText(this.sourceChanges, this.destinationChanges, this.proccessedList),
                    GetStillText(this.sourceChanges, this.destinationChanges, this.changedList),
                    GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList),
                    GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList2)
                ];
            }
        }

        // F) The animation ended, we've reached the final state of the code.
        return undefined;
    }
}

// Based on code block type (of form [adress, tye])\
//  returns coresponding text from original or new source code.
function GetStillText(sourceChanges, destinationChanges, currentBlocks)
{
    var stillText = "";

    for (var block of currentBlocks)
    {
        if (block[1] == 'o') {
            stillText += FindByAddress(sourceChanges,block[0]);
        }
        else if (block[1] == '+') {
            stillText += FindByAddress(destinationChanges,block[0]);
        }
        else if (block[1] == 'x') {
            stillText += FindByAddress(sourceChanges,block[0]);
        }
        else if (block[1] == '*') {
            stillText += FindByAddress(destinationChanges,sourceChanges[block[0]].address);
        }
    }

    return stillText;
}

// Builds array of blocks of code, representing the initial code,
//  before it was changes
function BuildInitialArray(sourceChanges, addressArray, unproccessedList) {
    for (var index in sourceChanges)
    {
        unproccessedList.push([index,'o']);
    }
}

// Edits code blocks and moves them around lists based on performed animation,
//  so that intermediate code after the performed animation is drawn properly
//  by the GIF writer.
function ApplySimpleAnimation(enumerator, animation) {
    if (animation instanceof DeletingAnimation) {
        for (var key in enumerator.unproccessedList) {
            if (enumerator.unproccessedList[key][0] == animation.sourceAddress) {
                enumerator.changedList = enumerator.unproccessedList.slice(Number(key), Number(key) + 1);
                enumerator.changedType.type = 'x';
                enumerator.unproccessedList2 = enumerator.unproccessedList.slice(Number(key) + 1, enumerator.unproccessedList.length);
                enumerator.unproccessedList = enumerator.unproccessedList.slice(0, Number(key));
                break;
            }
        }
    }
    else if (animation instanceof AddingAnimation) {
        enumerator.changedList = [[animation.destinationAddress,'+']];
        enumerator.changedType.type = '+';
    }
    else if (animation instanceof MovingUpAnimation) {
        for (var key in enumerator.unproccessedList) {
            if (enumerator.unproccessedList[key][0] == animation.sourceAddress) {
                enumerator.changedList = [[animation.sourceAddress,'o']];
                enumerator.changedType.type = '^';
                enumerator.unproccessedList2 = enumerator.unproccessedList.slice(Number(key) + 1, enumerator.unproccessedList.length);
                enumerator.unproccessedList = enumerator.unproccessedList.slice(0, Number(key));
                break;
            }
        }
    }
    else if (animation instanceof ChangingAnimation) {
        for (var key in enumerator.proccessedList) {
            if (enumerator.proccessedList[key][0] == animation.sourceAddress) {
                //TODO changing anim
                enumerator.changedList = [[animation.sourceAddress,'*']];
                enumerator.changedType.type = '*';
                break;
            }
        }
    }
    else if (animation instanceof InternalAnimationSequence) {
        for (var key in enumerator.proccessedList) {
            if (enumerator.proccessedList[key][0] == animation.sourceAddress) {
                enumerator.proccessedList.splice(key, 1);
                break;
            }
        }
    }
}

// Moves code blocks between list to prepare them for the next animation.
function CollapseAnimation(enumerator) {
    if (enumerator.changedType.type == 'x')
    {
        enumerator.unproccessedList = enumerator.unproccessedList.concat(enumerator.unproccessedList2);
        enumerator.unproccessedList2 = [];
        enumerator.changedList = [];
    }
    else if (enumerator.changedType.type == '+')
    {
        enumerator.proccessedList = enumerator.proccessedList.concat(enumerator.changedList);
        enumerator.changedList = [];
    }
    else if (enumerator.changedType.type == '^')
    {
        enumerator.proccessedList = enumerator.proccessedList.concat(enumerator.changedList);
        enumerator.unproccessedList = enumerator.unproccessedList.concat(enumerator.unproccessedList2);
        enumerator.unproccessedList2 = [];
        enumerator.changedList = [];
    }
    else if (enumerator.changedType.type == '*')
    {
        enumerator.proccessedList = enumerator.proccessedList.concat(enumerator.changedList);
        enumerator.changedList = [];
    }
    else if (enumerator.changedType.type == 'I')
    {
        //TODO: change
    }
}

// TODO: Do this here, not export.

// Converts nested representation of code blocks positions to flat representation,
//  to work with the GIF animator.
export function CollapseIntermediateText(intermediateText) {
    while (intermediateText[0] == 'I') {
        /*
        1   |2    |3     |4
        Proc|Chang|Unproc|Unproc2

        I = Interior, E = Exterior
        1            |2     |3      |4
        ProcE + ProcI|ChangI|UnprocI|Unproc2I + UnprocE + Unproc2I
        */

        //0: Change Type
        intermediateText[0] = intermediateText[2][0];

        //1: ProcE + ProcI
        intermediateText[1] = intermediateText[1] + intermediateText[2][1];

        //4: Unproc2I + UnprocE + Unproc2I
        intermediateText[4] = intermediateText[2][4] + intermediateText[3] + intermediateText[4];

        //3: UnprocI
        intermediateText[3] = intermediateText[2][3];

        //2: ChangI
        intermediateText[2] = intermediateText[2][2];

        //5: Visauly execute?
        intermediateText[5] = intermediateText[2][5];
    }
    return intermediateText;
}

// Given a list of changes and an adress, returns part of one of the original source codes.
function FindByAddress(listOfChanges, address) {
    if ('rawText' in listOfChanges[address]) return listOfChanges[address].rawText;
    else
    {
        return GetAllText(listOfChanges[address]);
    }
}

// Gets all text from a non-leaf block of code.
function GetAllText(change) {
    var text = '';
    for (var index in change.children) {
        if ('rawText' in change.children[index]) {
            text += change.children[index].rawText;
        }
        else {
            text += GetAllText(change.children[index]);
        }
    }
    return text;
}