export class StatementPositionManager {

    constructor(rawText) {
        //TODO: Line break type?
        this.lines = rawText.split('\r\n');
        this.unoccupiedChars = [];
        this.unoccupiedChars.length = this.lines.length;

        for (var i = 0; i < this.lines.length; i++)
        {
            this.unoccupiedChars[i] = [];
            this.unoccupiedChars[i].length = this.lines[i].length;
            for (var j = 0; j < this.lines[i].length; j++)
            {
                this.unoccupiedChars[i][j] = j;
            }
        }
    }

    addStatement(startLine, startColumn, stopLine, stopColumn)
    {

    }
}