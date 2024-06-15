// src/symbolProvider.ts

import * as vscode from 'vscode';

export class PatchDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const diffRegex = /^diff /;
        const hunkRegex = /^@@/;
        let diffSymbol: vscode.DocumentSymbol | null = null;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (diffRegex.test(line.text)) {
                // Create a new diff symbol
                diffSymbol = new vscode.DocumentSymbol(
                    line.text,
                    '',
                    vscode.SymbolKind.File,
                    new vscode.Range(i, 0, i, line.text.length),
                    new vscode.Range(i, 0, i, line.text.length)
                );
                symbols.push(diffSymbol);
            } else if (hunkRegex.test(line.text) && diffSymbol) {
                // Create a hunk symbol as a child of the current diff symbol
                const hunkSymbol = new vscode.DocumentSymbol(
                    line.text,
                    '',
                    vscode.SymbolKind.Method,
                    new vscode.Range(i, 0, i, line.text.length),
                    new vscode.Range(i, 0, i, line.text.length)
                );
                diffSymbol.children.push(hunkSymbol);
            }
        }

        return symbols;
    }
}