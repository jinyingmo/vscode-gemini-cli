import * as vscode from 'vscode';
import * as pty from 'node-pty';
import { spawn } from 'child_process';
import { getWebviewContent } from './webviewContent';

interface SessionState {
    id: string;
    name: string;
    pty: pty.IPty | null;
    exitCode?: number;
    startedAt: Date;
}

export class TerminalPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'geminiCliPanel';
    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];

    private _sessions = new Map<string, SessionState>();
    private _activeId: string | null = null;
    private _webviewReady = false;
    private _pendingMessages: object[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        this._webviewReady = false;
        this._pendingMessages = [];

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionUri);

        this._disposables.push(
            webviewView.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.type) {
                    case 'ready':
                        this._webviewReady = true;
                        for (const m of this._pendingMessages) {
                            this._view?.webview.postMessage(m);
                        }
                        this._pendingMessages = [];

                        if (this._sessions.size === 0) {
                            this._newSession({ cols: msg.cols, rows: msg.rows });
                        } else {
                            // If webview gets recreated, we lose state, this shouldn't happen usually due to retainContextWhenHidden
                            this._sendTabList();
                        }
                        break;

                    case 'input':
                        if (msg.id) {
                            this._sessions.get(msg.id)?.pty?.write(msg.data);
                        }
                        break;

                    case 'resize':
                        if (msg.id) {
                            const s = this._sessions.get(msg.id);
                            if (s?.pty) {
                                try { s.pty.resize(Math.max(1, msg.cols), Math.max(1, msg.rows)); } catch (_) {}
                            }
                        }
                        break;

                    case 'newSession':
                        this._newSession({ cols: msg.cols, rows: msg.rows });
                        break;

                    case 'switchSession':
                        this._switchSession(msg.id);
                        break;

                    case 'closeSession':
                        this._closeSession(msg.id);
                        break;

                    case 'listHistorySessions':
                        await this._listHistorySessions();
                        break;

                    case 'resumeSession':
                        this._newSession({ cols: msg.cols, rows: msg.rows, resume: msg.index });
                        break;
                }
            })
        );

        webviewView.onDidDispose(() => this.dispose());
    }

    private _send(msg: object) {
        if (!this._webviewReady) {
            this._pendingMessages.push(msg);
        } else {
            this._view?.webview.postMessage(msg);
        }
    }

    private _newSession(opts: { cols?: number; rows?: number; resume?: string } = {}) {
        const id = `session_${Date.now()}`;
        const sessionNum = this._sessions.size + 1;
        const name = opts.resume ? `Resumed #${opts.resume}` : `Session ${sessionNum}`;

        const session: SessionState = {
            id,
            name,
            pty: null,
            startedAt: new Date()
        };

        this._sessions.set(id, session);
        this._activeId = id;

        // Tell webview to create a new terminal instance
        this._send({ type: 'tabCreated', id, name, isActive: true });
        this._sendTabList();

        this._spawnPty(session, opts.cols || 80, opts.rows || 24, opts.resume);
    }

    private _switchSession(id: string) {
        if (!this._sessions.has(id)) return;
        this._activeId = id;
        this._sendTabList();
        this._send({ type: 'tabSwitched', id }); // Tells frontend to show this tab
    }

    private _closeSession(id: string) {
        const session = this._sessions.get(id);
        if (!session) return;
        try { session.pty?.kill(); } catch (_) {}
        this._sessions.delete(id);

        let nextId = null;
        if (this._activeId === id) {
            const remaining = [...this._sessions.keys()];
            nextId = remaining[remaining.length - 1] ?? null;
            this._activeId = nextId;
        }

        this._send({ type: 'tabClosed', id, nextId });
        this._sendTabList();
    }

    private _sendTabList() {
        const tabs = [...this._sessions.values()].map(s => ({
            id: s.id,
            name: s.name,
            isActive: s.id === this._activeId,
            exited: s.exitCode !== undefined
        }));
        this._send({ type: 'tabList', tabs });
    }

    private async _listHistorySessions() {
        const config = vscode.workspace.getConfiguration('geminiCli');
        const executablePath = config.get<string>('executablePath', 'gemini');

        return new Promise<void>((resolve) => {
            const proc = spawn(executablePath, ['--list-sessions'], {
                shell: true,
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
            });
            let out = '';
            proc.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
            proc.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
            proc.on('close', () => {
                const sessions: Array<{ index: string; label: string }> = [];
                const lines = out.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    const m = line.match(/^\s*\[?(\d+)\]?\s+(.+)/);
                    if (m) {
                        sessions.push({ index: m[1], label: line.trim() });
                    }
                }
                this._send({ type: 'sessionList', sessions, raw: out });
                resolve();
            });
        });
    }

    private _spawnPty(session: SessionState, cols: number, rows: number, resume?: string) {
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

            session.pty = instance;

            instance.onData((data) => {
                this._send({ type: 'data', id: session.id, data });
                this._checkQuota(data);
            });

            instance.onExit(({ exitCode }) => {
                session.pty = null;
                session.exitCode = exitCode ?? 0;
                const msg = `\r\n\x1b[33m[Session exited with code ${exitCode}]\x1b[0m\r\n`;
                this._send({ type: 'data', id: session.id, data: msg });
                this._sendTabList();
            });

            const cmd = resume
                ? `${executablePath} --resume ${resume}\r`
                : `${executablePath}\r`;

            setTimeout(() => instance.write(cmd), 300);

        } catch (err: any) {
            const msg = `\r\n\x1b[31m[Failed to start terminal: ${err.message}]\x1b[0m\r\n`;
            this._send({ type: 'data', id: session.id, data: msg });
        }
    }

    private readonly _quotaPatterns = [
        /(\d+)\s+(?:requests?|tokens?)\s+remaining/i,
        /quota\s+exceeded/i,
        /rate\s+limit/i,
        /(\d+)\/(\d+)\s+(?:requests?|tokens?)/i,
    ];

    private _checkQuota(data: string) {
        const stripped = data.replace(/\x1b\[[0-9;]*[mA-Za-z]/g, '');
        for (const pat of this._quotaPatterns) {
            const m = stripped.match(pat);
            if (m) {
                this._send({ type: 'quotaUpdate', text: m[0] });
                break;
            }
        }
    }

    public dispose() {
        for (const session of this._sessions.values()) {
            try { session.pty?.kill(); } catch (_) {}
        }
        this._sessions.clear();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
