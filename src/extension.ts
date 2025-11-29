// src/extension.ts

import * as path from 'path';
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { PatchDocumentSymbolProvider } from './symbolProvider';
import { PatchFoldingProvider } from './foldingProvider';

export function activate(context: vscode.ExtensionContext) {
    const patchSelector = { language: 'diff', scheme: 'file' };

    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider(patchSelector, new PatchFoldingProvider())
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(patchSelector, new PatchDocumentSymbolProvider())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('betterpatch.previewDiff', async () => {
            const document = vscode.window.activeTextEditor?.document;
            if (!document || document.languageId !== 'diff') {
                vscode.window.showInformationMessage('Open a .diff or .patch file to preview.');
                return;
            }

            try {
                const sections = parseDiffSections(document);
                if (sections.length === 0) {
                    vscode.window.showInformationMessage('No diff content found to preview.');
                    return;
                }

                const baseName = getDiffLabel(document);
                const previewDir = vscode.Uri.joinPath(context.globalStorageUri, 'preview');
                await clearPreviewDir(previewDir);
                await vscode.workspace.fs.createDirectory(previewDir);
                let targetColumn = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.Active;

                for (const section of sections) {
                    const { original, modified } = buildPreviewContent(section.lines);
                    const sectionId = sanitizeFileName(section.title) || `section-${section.index + 1}`;
                    const { originalUri, modifiedUri } = await writePreviewFiles(
                        previewDir,
                        baseName,
                        sectionId,
                        original,
                        modified
                    );

                    const title = `${baseName}: ${section.title}`;
                    await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, title, {
                        preview: false,
                        viewColumn: targetColumn
                    });
                    targetColumn = targetColumn ?? vscode.ViewColumn.Active;
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`BetterPatch could not open preview: ${message}`);
            }
        })
    );
}

export function deactivate() {}

type DiffSection = {
    title: string;
    lines: string[];
    index: number;
};

function parseDiffSections(document: vscode.TextDocument): DiffSection[] {
    const sections: DiffSection[] = [];
    const lines = document.getText().split(/\r?\n/);
    let current: DiffSection | null = null;

    for (const line of lines) {
        if (line.startsWith('diff --git ')) {
            if (current) {
                sections.push(current);
            }
            const title = formatDiffHeader(line) ?? `File ${sections.length + 1}`;
            current = { title, lines: [line], index: sections.length };
            continue;
        }

        if (current) {
            current.lines.push(line);
        }
    }

    if (current) {
        sections.push(current);
    }

    return sections;
}

function buildPreviewContent(lines: string[]): { original: string; modified: string } {
    const original: string[] = [];
    const modified: string[] = [];
    let started = false;

    const pushBoth = (value: string) => {
        original.push(value);
        modified.push(value);
    };

    for (const line of lines) {
        if (!started) {
            if (line.startsWith('@@')) {
                started = true;
            }
            continue;
        }

        if (line.startsWith('@@')) {
            // Skip hunk headers for a cleaner preview
            continue;
        }

        if (line.startsWith('+')) {
            original.push('');
            modified.push(line.slice(1));
            continue;
        }

        if (line.startsWith('-')) {
            original.push(line.slice(1));
            modified.push('');
            continue;
        }

        if (line.startsWith(' ')) {
            const text = line.slice(1);
            pushBoth(text);
            continue;
        }

        pushBoth(line);
    }

    return { original: original.join('\n'), modified: modified.join('\n') };
}

function getDiffLabel(document: vscode.TextDocument): string {
    const candidatePath = document.uri.scheme === 'file' ? document.uri.fsPath : document.uri.path;
    const baseName = path.basename(candidatePath || document.fileName);
    return baseName || 'diff-preview';
}

async function writePreviewFiles(
    previewDir: vscode.Uri,
    baseName: string,
    sectionId: string,
    original: string,
    modified: string
): Promise<{ originalUri: vscode.Uri; modifiedUri: vscode.Uri }> {
    const safeName = sanitizeFileName(baseName);
    const originalUri = vscode.Uri.joinPath(previewDir, `${safeName}-${sectionId}-original.txt`);
    const modifiedUri = vscode.Uri.joinPath(previewDir, `${safeName}-${sectionId}-modified.txt`);
    const encoder = new TextEncoder();

    await vscode.workspace.fs.writeFile(originalUri, encoder.encode(original));
    await vscode.workspace.fs.writeFile(modifiedUri, encoder.encode(modified));

    return { originalUri, modifiedUri };
}

function sanitizeFileName(name: string): string {
    const cleaned = name.replace(/[\\/:*?"<>|]/g, '_');
    return cleaned || 'diff-preview';
}

function formatDiffHeader(diffLine: string): string | undefined {
    const parts = diffLine.trim().split(/\s+/);
    const aPath = parts[2];
    const bPath = parts[3];
    const fileName = extractFileName(bPath) ?? extractFileName(aPath);
    return fileName ? `=== ${fileName} ===` : undefined;
}

function extractFileName(filePath?: string): string | undefined {
    if (!filePath) {
        return undefined;
    }
    return filePath.replace(/^a\//, '').replace(/^b\//, '').replace(/^"|"$/g, '');
}

async function clearPreviewDir(previewDir: vscode.Uri): Promise<void> {
    try {
        await vscode.workspace.fs.delete(previewDir, { recursive: true, useTrash: false });
    } catch {
        console.error('Could not clear preview directory; it may not exist yet.');
    }
}
