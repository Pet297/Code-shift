import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';
import {DeletingAnimation, AddingAnimation, MovingUpAnimation, ChangingAnimation, InternalAnimationSequence} from './animationSequence.js';

export class IntermediateTextEnumerator
{
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

    GetNextStillText()
    {
        while (this.animationSequence.length != 0 || 'currentChild' in this) {
            //Recursion
            CollapseAnimation(this);
            if ('currentChild' in this) {
                var childText = this.currentChild.GetNextStillText();
                if (childText !== undefined)
                {
                    return [
                        'I',
                        GetStillText(this.sourceChanges, this.destinationChanges, this.proccessedList),
                        childText,
                        GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList),
                        ""
                    ];
                }
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
                ApplySimpleAnimation(this, anim);
            }
            else
            {
                ApplySimpleAnimation(this, anim);

                return [
                    this.changedType.type,
                    GetStillText(this.sourceChanges, this.destinationChanges, this.proccessedList),
                    GetStillText(this.sourceChanges, this.destinationChanges, this.changedList),
                    GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList),
                    GetStillText(this.sourceChanges, this.destinationChanges, this.unproccessedList2)
                ];
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
                //TODO: change
                enumerator.proccessedList[key] = [animation.sourceAddress, '*'];
                enumerator.changedType.type = '*';
                break;
            }
        }
    }
    else if (animation instanceof InternalAnimationSequence) {
        for (var key in enumerator.proccessedList) {
            if (enumerator.proccessedList[key][0] == animation.sourceAddress) {
                //TODO: change
                enumerator.proccessedList.splice(key, 1);
                break;
            }
        }
    }
}

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

export function CollapseIntermediateText(intermediateText) {
    while (intermediateText[0] == 'I') {
        intermediateText[0] = intermediateText[2][0];

        intermediateText[1] += intermediateText[2][1];

        intermediateText[3] = intermediateText[2][3];

        intermediateText[4] = intermediateText[2][4] + intermediateText[4];

        intermediateText[2] = intermediateText[2][2];
    }
    return intermediateText;
}

function FindByAddress(listOfChanges, address) {

    if ('rawText' in listOfChanges[address]) return listOfChanges[address].rawText;
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