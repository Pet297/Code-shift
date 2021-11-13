import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';

class StatementPositionManager {

    constructor(rawText, sl, sc, pl, pc) {
        //TODO: Line break type?
        this.lines = rawText.split('\r\n');
        this.unoccupiedChars = [];
        this.unoccupiedChars.length = this.lines.length;

        this.startLine = sl;
        this.startColumn = sc;
        this.stopLine = pl;
        this.stopColumn = pc;

        for (var i = 0; i < this.lines.length; i++)
        {
            this.unoccupiedChars[i] = [];
            this.unoccupiedChars[i].length = this.lines[i].length;
            for (var j = 0; j < this.lines[i].length; j++)
            {
                this.unoccupiedChars[i][j] = false;
            }
        }
    }

    addStatement(startLine, startColumn, stopLine, stopColumn)
    {
        if (startLine == stopLine) {
            for (var i = startColumn; i <= stopColumn; i++) {
                this.unoccupiedChars[startLine][i] = true;
            }
        }
        else {
            for (var i = startColumn; i < this.unoccupiedChars[startLine].length; i++) {
                this.unoccupiedChars[startLine][i] = true;
            }

            for (var i = startLine + 1; i <= stopLine - 1; i++) {
                for (var j = 0; j < this.unoccupiedChars[i].length; j++) {
                    this.unoccupiedChars[i][j] = true;
                }
            }

            for (var i = 0; i <= stopColumn; i++) {
                this.unoccupiedChars[stopLine][i] = true;
            }
        }
    }

    getComments()
    {
        var commentList = [];

        var inComment = false;
        var cmtStartLine = -1;
        var cmtStartColumn = -1;

        for (var i = this.startLine; i <= this.stopLine; i++) {
            for (var j = (i == this.startLine ? this.startColumn : 0); j <= (i == this.stopLine ? this.stopColumn : this.unoccupiedChars[i].length - 1); j++) {
                if (!this.unoccupiedChars[i][j] && !inComment) {
                    inComment = true;
                    cmtStartLine = i;
                    cmtStartColumn = j;
                }
                else if (this.unoccupiedChars[i][j] && inComment) {
                    var text = new NonsemanticText();

                    text.startLine = cmtStartLine;
                    text.startColumn = cmtStartColumn
                    text.stopLine = i;
                    text.stopColumn = j - 1;

                    commentList.push(text);

                    inComment = false;
                }
            }
        }

        if (inComment) {
            var text = new NonsemanticText();

            text.startLine = cmtStartLine;
            text.startColumn = cmtStartColumn
            text.stopLine = this.stopLine;
            text.stopColumn = this.stopColumn;

            commentList.push(text);
        }

        return commentList;
    }

    getRawText(startLine, startColumn, stopLine, stopColumn) {
        var rawText = "";
        for (var i = startLine; i <= stopLine; i++) {
            var start = 0;
            var stop = this.lines[i].length - 1;
            if (i == startLine) start = startColumn - 1;
            if (i == stopLine) stop = stopColumn + 1;
            rawText += this.lines[i].substring(start, stop);

            if (stopLine == this.lines[i].length - 1) rawText += '\r\n';
        }
        return rawText;
    }
}

export function AddText(rootDefinition, sourceCode) {
   
    var defStartLine = rootDefinition.startLine;
    var defStartColumn = rootDefinition.startColumn;
    var defStopLine = rootDefinition.stopLine;
    var defStopColumn = rootDefinition.stopColumn;

    var manager = new StatementPositionManager(sourceCode, defStartLine, defStartColumn, defStopLine, defStopColumn);

    for (var lc of rootDefinition.localCode) {
        manager.addStatement(lc.startLine, lc.startColumn, lc.stopLine, lc.stopColumn);
    }

    var comments = manager.getComments();

    for (var cmt of comments) {
        rootDefinition.localCode.push(cmt);
    }

    // Do recursively at all levels:
    for (var lc of rootDefinition.localCode) {
        if (lc instanceof SemanticDefinition) {
            AddText(lc, sourceCode);
        }
        else if (lc instanceof SemanticDecision) {
            //TODO: sd
        }
    }

    // Sort comments
    rootDefinition.localCode = rootDefinition.localCode.sort((c1,c2) => (c1.startLine == c2.startLine) ? c1.startColumn - c2.startColumn : c1.startLine - c2.startLine);

    // Add rawtext to all leaf code
    AddText0(rootDefinition, sourceCode, manager);
}

function AddText0(rootDefinition, sourceCode, manager) {

    // Do recursively at all levels:
    for (var lc of rootDefinition.localCode) {
        if (lc instanceof SemanticDefinition) {
        }
        else if (lc instanceof SemanticDecision) {
            //TODO: sd
        }
        else if (lc instanceof SemanticAction) {
            //TODO: FINISH
            lc.rawText = manager.getRawText(lc.startLine, lc.startColumn, lc.stopLine, lc.stopColumn);
        }
        else {
            lc.rawText = manager.getRawText(lc.startLine, lc.startColumn, lc.stopLine, lc.stopColumn);
        }
    }
}