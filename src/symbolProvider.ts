// src/symbolProvider.ts

import * as vscode from 'vscode';

export class PatchDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[]> {
        const symbols: vscode.SymbolInformation[] = [];
        const hunkRegex = /^@@/;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (hunkRegex.test(line.text)) {

                // Create a symbol for each hunk
                const symbol = new vscode.SymbolInformation(
                    line.text,
                    vscode.SymbolKind.Method, 
                    '', 
                    new vscode.Location(document.uri, new vscode.Range(i, 0, i, line.text.length))
                );
                symbols.push(symbol);
            }
        }

        return symbols;
    }
}