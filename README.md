# Gemini CLI for VSCode

A VSCode extension that integrates Google's Gemini CLI directly into your editor, providing an AI-powered coding assistant similar to Claude Code.

![Gemini CLI Extension](https://via.placeholder.com/800x400?text=Gemini+CLI+Extension)

## Features

- 🤖 **AI-Powered Chat**: Interact with Google's Gemini models directly in VSCode
- 💻 **Code Generation**: Generate, explain, and refactor code with natural language
- 🎨 **Syntax Highlighting**: Beautiful code blocks with language-specific highlighting
- ⚡ **Real-time Streaming**: See responses as they're generated
- 📋 **Code Actions**: Copy or insert code directly into your editor
- 🎯 **Multiple Models**: Support for Gemini Pro, Pro Vision, and Ultra
- ⌨️ **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+G` / `Cmd+Shift+G`

## Requirements

- VSCode 1.74.0 or higher
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed locally
- Node.js 16.x or higher (for development)

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/your-username/vscode-gemini-cli.git
cd vscode-gemini-cli
```

2. Install dependencies:
```bash
npm install
```

3. Compile the extension:
```bash
npm run compile
```

4. Press `F5` to open a new Extension Development Host window

### From VSIX

1. Package the extension:
```bash
npm run package
```

2. Install the generated `.vsix` file in VSCode:
   - Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Click on `...` menu
   - Select "Install from VSIX"
   - Choose the generated file

## Configuration

Open VSCode settings (`Ctrl+,` / `Cmd+,`) and search for "Gemini CLI" to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| `geminiCli.executablePath` | Path to Gemini CLI executable | `gemini` |
| `geminiCli.model` | Gemini model to use | `gemini-pro` |
| `geminiCli.temperature` | Temperature for generation (0-1) | `0.7` |
| `geminiCli.maxTokens` | Maximum tokens per response | `2048` |
| `geminiCli.enableCodeHighlighting` | Enable syntax highlighting | `true` |
| `geminiCli.autoScroll` | Auto-scroll to latest message | `true` |
| `geminiCli.showTimestamps` | Show timestamps in chat | `false` |

## Usage

### Opening the Panel

- **Command Palette**: Press `Ctrl+Shift+P` / `Cmd+Shift+P` and type "Open Gemini CLI"
- **Keyboard Shortcut**: Press `Ctrl+Shift+G` / `Cmd+Shift+G`
- **Sidebar**: Click on the Gemini CLI icon in the Activity Bar

### Chat Commands

- **New Chat**: Start a fresh conversation
- **Clear Chat**: Clear all messages
- **Stop Generation**: Stop the current AI response

### Working with Code

When Gemini generates code:

1. **Copy Code**: Click the "Copy" button on any code block
2. **Insert Code**: Click "Insert" to add code at your cursor position
3. **Syntax Highlighting**: Code blocks are automatically highlighted based on language

### Example Prompts

- "Explain this code" - Get detailed explanations of selected code
- "Help me debug" - Debug errors and issues
- "Write a function" - Generate functions based on requirements
- "Refactor this" - Improve code quality and structure

## Development

### Project Structure

```
vscode-gemini-cli/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── panels/
│   │   ├── geminiCliPanel.ts # Main panel logic
│   │   └── webviewContent.ts # WebView HTML generator
│   └── services/
│       └── geminiCliService.ts # CLI integration
├── media/
│   ├── styles.css            # UI styles
│   ├── main.js               # WebView scripts
│   └── highlight.css         # Code highlighting
├── package.json              # Extension manifest
└── tsconfig.json             # TypeScript config
```

### Building

```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run linting
npm run lint

# Package extension
npm run package
```

### Debugging

1. Open the project in VSCode
2. Press `F5` to start debugging
3. A new Extension Development Host window will open
4. Test your changes in the new window

## Troubleshooting

### Gemini CLI Not Found

If you see a warning that Gemini CLI is not found:

1. Ensure Gemini CLI is installed: `gemini --version`
2. Update the executable path in settings:
   - Open Settings (`Ctrl+,` / `Cmd+,`)
   - Search for "Gemini CLI"
   - Update "Executable Path" to the full path of your gemini binary

### Connection Issues

If responses are not streaming:

1. Check your internet connection
2. Verify Gemini CLI is working: `gemini chat "Hello"`
3. Check the VSCode Developer Console for errors (`Ctrl+Shift+I` / `Cmd+Shift+I`)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) for the AI models
- [VSCode API](https://code.visualstudio.com/api) for the extension framework
- [Highlight.js](https://highlightjs.org/) for syntax highlighting

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/vscode-gemini-cli/issues) page
2. Create a new issue with detailed information
3. Join our [Discussions](https://github.com/your-username/vscode-gemini-cli/discussions)

---

**Enjoy coding with Gemini CLI! ✦**
