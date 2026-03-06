import * as vscode from 'vscode';
import { GeminiCliPanel } from './panels/geminiCliPanel';
import { GeminiCliService } from './services/geminiCliService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Gemini CLI extension is now active!');

    const geminiCliService = new GeminiCliService();
    
    // Register the main panel provider
    const panelProvider = new GeminiCliPanel(context.extensionUri, geminiCliService);
    
    // Register the webview view provider
    const webviewView = vscode.window.registerWebviewViewProvider(
        GeminiCliPanel.viewType,
        panelProvider
    );

    // Set context to show the view
    vscode.commands.executeCommand('setContext', 'geminiCli.enabled', true);

    // Register commands
    const openPanelCommand = vscode.commands.registerCommand('geminiCli.openPanel', () => {
        panelProvider.show();
    });

    const newChatCommand = vscode.commands.registerCommand('geminiCli.newChat', () => {
        panelProvider.newChat();
    });

    const clearChatCommand = vscode.commands.registerCommand('geminiCli.clearChat', () => {
        panelProvider.clearChat();
    });

    const stopGenerationCommand = vscode.commands.registerCommand('geminiCli.stopGeneration', () => {
        panelProvider.stopGeneration();
    });

    const openSettingsCommand = vscode.commands.registerCommand('geminiCli.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'geminiCli');
    });

    // Add all disposables to context
    context.subscriptions.push(
        webviewView,
        openPanelCommand,
        newChatCommand,
        clearChatCommand,
        stopGenerationCommand,
        openSettingsCommand,
        geminiCliService
    );
}

export function deactivate() {
    console.log('Gemini CLI extension is now deactivated!');
}
