import * as vscode from 'vscode';
import { TerminalPanel } from './panels/terminalPanel';

export function activate(context: vscode.ExtensionContext) {
    const provider = new TerminalPanel(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TerminalPanel.viewType, provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('geminiCli.openPanel', () => {
            vscode.commands.executeCommand('workbench.view.extension.geminiCli');
        })
    );
}

export function deactivate() {}
