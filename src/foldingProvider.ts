// src/patchFoldingProvider.ts

import * as vscode from 'vscode';

export class PatchFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] | Thenable<vscode.FoldingRange[]> {
        const foldingRanges: vscode.FoldingRange[] = [];
        const diffRegex = /^diff /;
        const hunkRegex = /^@@/;
        let diffStartLine: number | null = null;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (diffRegex.test(line.text)) {
                // If there was a previous diff, create a folding range for it
                if (diffStartLine !== null) {
                    foldingRanges.push(new vscode.FoldingRange(diffStartLine, i - 1));
                }
                // Start a new diff
                diffStartLine = i;
            } else if (hunkRegex.test(line.text)) {
                // Find the end of the hunk by looking for the next hunk or end of document
                let endLine = i + 1;
                while (endLine < document.lineCount && !hunkRegex.test(document.lineAt(endLine).text) && !diffRegex.test(document.lineAt(endLine).text)) {
                    endLine++;
                }
                // Create a folding range from the start of the hunk to the end of the hunk
                foldingRanges.push(new vscode.FoldingRange(i, endLine - 1));
            }
        }

        // If there was a diff at the end of the document, create a folding range for it
        if (diffStartLine !== null) {
            foldingRanges.push(new vscode.FoldingRange(diffStartLine, document.lineCount - 1));
        }

        return foldingRanges;
    }
}