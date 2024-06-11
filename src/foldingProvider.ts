// src/patchFoldingProvider.ts

import * as vscode from 'vscode';

export class PatchFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] | Thenable<vscode.FoldingRange[]> {
        const foldingRanges: vscode.FoldingRange[] = [];
        const hunkRegex = /^@@/;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (hunkRegex.test(line.text)) {
                // Find the end of the hunk by looking for the next hunk or end of document
                let endLine = i + 1;
                while (endLine < document.lineCount && !hunkRegex.test(document.lineAt(endLine).text)) {
                    endLine++;
                }
                // Create a folding range from the start of the hunk to the end of the hunk
                foldingRanges.push(new vscode.FoldingRange(i, endLine - 1));
            }
        }

        return foldingRanges;
    }
}
