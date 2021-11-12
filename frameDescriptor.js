import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';

export class StructuredText {

    constructor(parts) {
        this.parts = parts;
    }

    getText() {
        result = '';
        for (var part of parts) {
            if (part instanceof StructuredText) {
                result2 = part.getText();
                result += result2;
            }
            // If it isn't Structured text, then it is a raw string.
            else result2 += part;
        }
        return result;
    }
}

function TextFromStatementList(rawText, statementList, sl, sc, pl, pc)
{
    //TODO: Line break type?
    lines = rawText.split('\r\n');
    parts = [];

    currentLine = sl;
    currentColumn = sc;

    for (statement of statementList)
    {
        if (statement.startLine != currentLine || statement.startColumn != currentColumn) 
        {
            // There is a raw text.
            // TODO: Calculate raw text based on current column and line
            parts.push(' ');
        }
        
        // TODO: Semantic decision
        if (statement instanceof SemanticDefinition) {
            parts.push(TextFromStatementList(' ', statement.statementList, statement.startLine, statement.startColumn, statement.stopLine, statement.stopColumn));
        }
        else if (statement instanceof SemanticAction) {

        }
        else if (statement instanceof NonsemanticText) {

        }
    }
}