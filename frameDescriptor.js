import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';
import {DeletingAnimation, AddingAnimation, MovingUpAnimation, ChangingAnimation, InternalAnimationSequence} from './animationSequence.js';

export class IntermediateTextEnumerator
{
    constructor(sourceChanges, destinationChanges, animationSequence)
    {
        this.unproccessedList = [];
        this.proccessedList = [];
        this.currentAddress = [];
        this.sourceChanges = sourceChanges;
        this.destinationChanges = destinationChanges;
        this.animationSequence = animationSequence;

        BuildInitialArray(this.sourceChanges, [], this.unproccessedList);
    }

    GetNextStillText()
    {
        while (this.animationSequence.length != 0 || 'currentChild' in this) {
            //Recursion
            if ('currentChild' in this) {
                var childText = this.currentChild.GetNextStillText();
                if (childText !== undefined) return GetStillText(this.sourceChanges, this.destinationChanges, this.proccessedList) + childText + GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList);
                else
                {
                    this.proccessedList.push([this.currentChildIndex,'*']);
                    delete this.currentChild;
                    delete this.currentChildIndex;
                }
            }

            //Base
            var anim = this.animationSequence.shift();
            if (anim instanceof InternalAnimationSequence) {
                this.currentChild = new IntermediateTextEnumerator(
                    this.sourceChanges[anim.sourceAddress].children,
                    this.destinationChanges[this.sourceChanges[anim.sourceAddress].address].children,
                    anim.animationSequence);
                this.currentChildIndex = anim.sourceAddress;
                this.proccessedList
            }
            else
            {
                ApplySimpleAnimation(this.proccessedList, this.unproccessedList, anim);
                return GetStillText(this.sourceChanges, this.destinationChanges, this.proccessedList) + GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList);
            }
        }
        return undefined;
    }
}

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

function BuildInitialArray(sourceChanges, addressArray, unproccessedList) {
    for (var index in sourceChanges)
    {
        unproccessedList.push([index,'o']);
    }
}

function ApplySimpleAnimation(proccessedList, unproccessedList, animation) {
    if (animation instanceof DeletingAnimation) {
        for (var key in unproccessedList) {
            if (unproccessedList[key][0] == animation.sourceAddress) {
                unproccessedList.splice(key, 1);
                break;
            }
        }
    }
    else if (animation instanceof AddingAnimation) {
        proccessedList.push([animation.destinationAddress,'+']);
    }
    else if (animation instanceof MovingUpAnimation) {
        for (var key in unproccessedList) {
            if (unproccessedList[key][0] == animation.sourceAddress) {
                unproccessedList.splice(key, 1);
                break;
            }
        }
        proccessedList.push([animation.sourceAddress,'o']);
    }
    else if (animation instanceof ChangingAnimation) {
        for (var key in proccessedList) {
            if (proccessedList[key][0] == animation.sourceAddress) {
                proccessedList[key] = [animation.sourceAddress, '*']
                break;
            }
        }
    }
    else if (animation instanceof InternalAnimationSequence) {
        for (var key in proccessedList) {
            if (proccessedList[key][0] == animation.sourceAddress) {
                proccessedList.splice(key, 1);
                break;
            }
        }
    }
}

function FindByAddress(listOfChanges, address) {

    if ('rawText' in listOfChanges[address]) return listOfChanges.rawText;
    else
    {
        return GetAllText(listOfChanges[address]);
    }
}

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