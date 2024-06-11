// src/extension.ts

import * as vscode from 'vscode';
import { PatchFoldingProvider } from './foldingProvider';
import { PatchDocumentSymbolProvider } from './symbolProvider';

export function activate(context: vscode.ExtensionContext) {
    const patchSelector = { language: 'diff', scheme: 'file' };

    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider(patchSelector, new PatchFoldingProvider())
    );

	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(patchSelector, new PatchDocumentSymbolProvider())
	);
}

export function deactivate() {}
