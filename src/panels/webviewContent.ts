import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
    const highlightCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'highlight.css'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; img-src ${webview.cspSource} https:;">
    <title>Gemini CLI</title>
    <link href="${styleUri}" rel="stylesheet">
    <link href="${highlightCssUri}" rel="stylesheet">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <div class="header">
            <div class="header-title">
                <span class="gemini-icon">✦</span>
                <span>Gemini CLI</span>
            </div>
            <div class="header-actions">
                <button id="newChatBtn" class="icon-btn" title="New Chat">
                    <span>+</span>
                </button>
                <button id="settingsBtn" class="icon-btn" title="Settings">
                    <span>⚙</span>
                </button>
            </div>
        </div>

        <!-- CLI Status Warning -->
        <div id="cliStatus" class="cli-status hidden">
            <span class="warning-icon">⚠</span>
            <span>Gemini CLI not found. Please install it or configure the path in settings.</span>
            <button id="openSettingsBtn" class="link-btn">Open Settings</button>
        </div>

        <!-- Chat Container -->
        <div id="chatContainer" class="chat-container">
            <!-- Welcome Message -->
            <div id="welcomeMessage" class="welcome-message">
                <div class="welcome-icon">✦</div>
                <h2>Welcome to Gemini CLI</h2>
                <p>Your AI assistant powered by Google's Gemini models.</p>
                <div class="suggestions">
                    <div class="suggestion-item" data-text="Explain this code">💡 Explain this code</div>
                    <div class="suggestion-item" data-text="Help me debug">🔧 Help me debug</div>
                    <div class="suggestion-item" data-text="Write a function">✍️ Write a function</div>
                    <div class="suggestion-item" data-text="Refactor this">🔄 Refactor this</div>
                </div>
            </div>
            
            <!-- Messages will be inserted here -->
        </div>

        <!-- Input Area -->
        <div class="input-area">
            <div class="input-container">
                <textarea 
                    id="messageInput" 
                    placeholder="Ask Gemini anything..."
                    rows="1"
                ></textarea>
                <button id="sendBtn" class="send-btn" disabled>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                </button>
                <button id="stopBtn" class="stop-btn hidden">
                    <span>⏹</span>
                </button>
            </div>
            <div class="input-footer">
                <span class="model-info">Gemini Pro</span>
                <span class="shortcut-hint">Enter to send, Shift+Enter for new line</span>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <script nonce="${nonce}">
        // Initialize mermaid with specific config
        if (window.mermaid) {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'dark'
            });
        }
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
