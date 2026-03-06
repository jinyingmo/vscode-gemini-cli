import * as vscode from 'vscode';
import * as pty from 'node-pty';
import { getWebviewContent } from './webviewContent';

export class TerminalPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'geminiCliPanel';
    private _view?: vscode.WebviewView;
    private _pty: pty.IPty | null = null;
    private _disposables: vscode.Disposable[] = [];

    // Buffer data that arrives before the webview sends 'ready'
    private _pendingData: string[] = [];
    private _webviewReady = false;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        this._webviewReady = false;
        this._pendingData = [];

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionUri);

        // Handle input from xterm.js
        this._disposables.push(
            webviewView.webview.onDidReceiveMessage((msg) => {
                switch (msg.type) {
                    case 'ready': {
                        this._webviewReady = true;
                        // Flush buffered data
                        if (this._pendingData.length > 0) {
                            const flushed = this._pendingData.join('');
                            this._pendingData = [];
                            this._sendData(flushed);
                        }
                        // Spawn PTY if not yet running
                        if (!this._pty) {
                            this._spawnPty(msg.cols || 80, msg.rows || 24);
                        }
                        break;
                    }
                    case 'input': {
                        if (this._pty) {
                            this._pty.write(msg.data);
                        }
                        break;
                    }
                    case 'resize': {
                        if (this._pty) {
                            try {
                                this._pty.resize(
                                    Math.max(1, msg.cols),
                                    Math.max(1, msg.rows)
                                );
                            } catch (_) {}
                        }
                        break;
                    }
                }
            })
        );

        webviewView.onDidDispose(() => this.dispose());
    }

    private _sendData(data: string) {
        if (!this._webviewReady) {
            this._pendingData.push(data);
        } else {
            this._view?.webview.postMessage({ type: 'data', data });
        }
    }

    private _spawnPty(cols: number, rows: number) {
        try { this._pty?.kill(); } catch (_) {}
        this._pty = null;

        const config = vscode.workspace.getConfiguration('geminiCli');
        const executablePath = config.get<string>('executablePath', 'gemini');
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

        try {
            const instance = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols,
                rows,
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.env.HOME || '/',
                env: { ...process.env } as { [key: string]: string },
            });

            this._pty = instance;

            instance.onData((data) => {
                this._sendData(data);
            });

            instance.onExit(({ exitCode }) => {
                this._pty = null;
                this._sendData(
                    `\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n`
                );
            });

            // Run gemini after shell is ready
            setTimeout(() => {
                instance.write(executablePath + '\r');
            }, 300);

        } catch (err: any) {
            this._sendData(
                `\r\n\x1b[31m[Failed to start terminal: ${err.message}]\x1b[0m\r\n`
            );
        }
    }

    public dispose() {
        try { this._pty?.kill(); } catch (_) {}
        this._pty = null;
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
