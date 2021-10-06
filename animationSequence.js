export function GetAnimationSequence(sourceChanges, destinationChanges)
{
    // Step 1 - List removals
    var removals = FilterRemovals(sourceChanges);

    // Step 2 - Movement and stationary code
    // TODO: Based on order in destination, keep track of the sorted part. One at a time,
    //       move a piece of original source code to its destination, so that the sorted
    //       part expands from top to bottom

    // Step 3 - List what was re-written
    // TODO: Take note of all pieces of related code, that were changed between the versions.

    // Step 4 - List what was added
    var additions = FilterAddtions(destinationChanges);

    // TODO: Remove irrelevant animations related to "adding" whitespace or similar.

    return [removals, additions];
}

export class ListOfAnimations
{
    constructor(stationaryCode, initialPositions, operations)
    {
        this.stationaryCode = stationaryCode;
        this.initialPositions = initialPositions;
        this.operations = operations;
    }
}

function FilterAddtions(destinationChanges)
{
    var listA = [];

    for (var index in destinationChanges)
    {
        if (destinationChanges[index].address == '+') listA.push([index]);

        var listAR = FilterAddtions(destinationChanges[index].children);
        for (var array of listAR)
        {
            array.push(index);
            listA.push(array);
        }
    }

    return listA;
}

function FilterRemovals(sourceChanges)
{
    var listR = [];

    for (var index in sourceChanges)
    {
        if (sourceChanges[index].address == 'x') listR.push([index]);

        var listRR = FilterRemovals(sourceChanges[index].children);
        for (var array of listRR)
        {
            array.push(index);
            listR.push(array);
        }
    }

    return listR;
}

function FilterPairedCode(sourceChanges)
{

}