import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';
import { GeminiCliService, ChatMessage } from '../services/geminiCliService';

export class GeminiCliPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'geminiCliPanel';
    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _geminiService: GeminiCliService
    ) {
        // Listen for messages from the service
        this._geminiService.on('message', (message: ChatMessage) => {
            this._view?.webview.postMessage({
                type: 'message',
                message
            });
        });

        this._geminiService.on('stream', (data: { messageId: string; content: string; chunk: string }) => {
            this._view?.webview.postMessage({
                type: 'stream',
                ...data
            });
        });

        this._geminiService.on('streamEnd', (data: { messageId: string; content: string }) => {
            this._view?.webview.postMessage({
                type: 'streamEnd',
                ...data
            });
        });

        this._geminiService.on('clear', () => {
            this._view?.webview.postMessage({
                type: 'clear'
            });
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionUri);

        // Handle messages from the webview
        this._disposables.push(
            webviewView.webview.onDidReceiveMessage(async (message) => {
                switch (message.type) {
                    case 'sendMessage':
                        await this._geminiService.sendMessage(message.text);
                        break;
                    case 'stopGeneration':
                        this._geminiService.stopGeneration();
                        break;
                    case 'newChat':
                        this.newChat();
                        break;
                    case 'clearChat':
                        this.clearChat();
                        break;
                    case 'copyCode':
                        await vscode.env.clipboard.writeText(message.code);
                        vscode.window.showInformationMessage('Code copied to clipboard');
                        break;
                    case 'insertCode':
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            editor.edit(editBuilder => {
                                editBuilder.insert(editor.selection.active, message.code);
                            });
                        }
                        break;
                    case 'openSettings':
                        vscode.commands.executeCommand('workbench.action.openSettings', 'geminiCli');
                        break;
                    case 'checkCli':
                        const isAvailable = await this._geminiService.checkCliAvailable();
                        this._view?.webview.postMessage({
                            type: 'cliStatus',
                            available: isAvailable
                        });
                        break;
                }
            })
        );

        // Check CLI availability when view loads
        this._geminiService.checkCliAvailable().then(isAvailable => {
            this._view?.webview.postMessage({
                type: 'cliStatus',
                available: isAvailable
            });
        });

        webviewView.onDidDispose(() => {
            this.dispose();
        });
    }

    public show() {
        this._view?.show();
    }

    public newChat() {
        this._geminiService.clearHistory();
    }

    public clearChat() {
        this._geminiService.clearHistory();
    }

    public stopGeneration() {
        this._geminiService.stopGeneration();
    }

    dispose() {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
