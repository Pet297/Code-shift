import {SemanticDefinition, SemanticAction, SemanticDecision, NonsemanticText} from './ruleTranslator.js';

export default function RenmameVariable(codeBlocks, originalName, newName) {
    for (var block of codeBlocks) {

        // TODO: listy krome rawtextu udrzuji seznam identifikatoru a jejich pozic.


        if (block instanceof SemanticDefinition) {
        }
        else if (block instanceof SemanticAction) {

        }
        else if (block instanceof SemanticDecision) {

        }
    }
}