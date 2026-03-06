# Gemini CLI for VSCode

A high-performance VSCode extension that integrates Google's Gemini CLI directly into your editor as a powerful, interactive terminal. Built with `xterm.js` and `node-pty`, it provides a seamless AI-powered command-line experience.

![Gemini CLI Terminal](https://via.placeholder.com/800x400?text=Gemini+CLI+Terminal+Interface)

## Features

- 🖥️ **Full Terminal Emulation**: Integrated `xterm.js` terminal for a native CLI feel.
- 📑 **Multi-Session Support**: Create and manage multiple Gemini chat sessions in a tabbed interface.
- 🔄 **Session Resumption**: List and resume previous Gemini CLI sessions directly from the UI.
- 📊 **Quota Monitoring**: Automatic detection and display of remaining API requests/tokens.
- 🎨 **Theme Integration**: Fully respects your VSCode color theme for a consistent look.
- ⚡ **Native Performance**: Uses `node-pty` for low-latency terminal interactions.
- ⌨️ **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+G` / `Cmd+Shift+G`.

## Requirements

- VSCode 1.74.0 or higher
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed and available in your PATH.
- `node-pty` dependencies (Python and C++ build tools) for local development.

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/jinyingmo/vscode-gemini-cli.git
cd vscode-gemini-cli
```

2. Install dependencies (requires build tools for `node-pty`):
```bash
npm install
```

3. Compile the extension:
```bash
npm run compile
```

4. Press `F5` to open a new Extension Development Host window.

### From VSIX

1. Download the latest `.vsix` from the [Releases](https://github.com/jinyingmo/vscode-gemini-cli/releases) page.
2. In VSCode, go to Extensions view (`Ctrl+Shift+X`).
3. Click the `...` menu and select "Install from VSIX...".

## Configuration

Open VSCode settings (`Ctrl+,`) and search for "Gemini CLI":

| Setting | Description | Default |
|---------|-------------|---------|
| `geminiCli.executablePath` | Path to the `gemini` executable | `gemini` |

## Usage

### Opening the Terminal

- **Activity Bar**: Click the Gemini icon (Terminal symbol) in the sidebar.
- **Command Palette**: Search for "Open Gemini CLI".
- **Shortcut**: `Ctrl+Shift+G` (or `Cmd+Shift+G` on macOS).

### Managing Sessions

- **New Tab (+)**: Start a new Gemini CLI process.
- **Switching Tabs**: Click on session tabs to toggle between active conversations.
- **Closing Tabs**: Click the "x" on a tab to terminate the process.
- **History (Clock Icon)**: View and resume previously saved Gemini sessions.

## Development

### Project Structure

```
vscode-gemini-cli/
├── src/
│   ├── extension.ts          # Extension entry point
│   └── panels/
│       ├── terminalPanel.ts  # Main logic: PTY management & Webview bridge
│       └── webviewContent.ts # HTML/JS for xterm.js UI
├── media/
│   ├── styles.css            # UI layout & styling
│   └── terminal-icon.svg     # Extension icons
├── package.json              # Extension manifest
└── tsconfig.json             # TypeScript config
```

### Build Commands

```bash
npm run compile # One-time build
npm run watch   # Incremental build on file changes
npm run lint    # Run ESLint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Google Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [xterm.js](https://xtermjs.org/) for the terminal interface
- [node-pty](https://github.com/microsoft/node-pty) for shell integration

---

**Happy chatting with Gemini! ✦**

