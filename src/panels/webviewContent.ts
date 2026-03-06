import * as vscode from 'vscode';
import * as crypto from 'crypto';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri    = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
    const xtermJsUri   = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'xterm.js'));
    const xtermCssUri  = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'xterm.css'));
    const fitAddonUri  = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'addon-fit.js'));
    const webglAddonUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'addon-webgl.js'));
    const nonce = crypto.randomBytes(16).toString('base64');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource} data:;">
    <title>Gemini CLI</title>
    <!-- Pre-style before any CSS loads to prevent white flash -->
    <style>
        html, body {
            margin: 0; padding: 0;
            background: #0d1117;
            width: 100%; height: 100vh;
            overflow: hidden;
        }
        #terminal-container {
            width: 100%; height: 100vh;
            padding: 4px;
            /* Hide until xterm.js is fully initialized to prevent FOUC */
            visibility: hidden;
        }
        /* Ensure xterm fills container */
        .xterm { height: 100%; }
        .xterm-viewport { overflow-y: hidden !important; }
        .xterm-screen { height: 100% !important; }
    </style>
    <link href="${xtermCssUri}" rel="stylesheet">
</head>
<body>
    <div id="terminal-container"></div>
    <script nonce="${nonce}" src="${xtermJsUri}"></script>
    <script nonce="${nonce}" src="${fitAddonUri}"></script>
    <script nonce="${nonce}" src="${webglAddonUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
