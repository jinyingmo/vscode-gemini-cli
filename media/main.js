// Gemini CLI – Embedded xterm.js terminal (optimized)
(function () {
    const vscode = acquireVsCodeApi();
    const container = document.getElementById('terminal-container');

    // --- 1. Initialize xterm.js ---
    const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontFamily: "'Cascadia Code', 'Menlo', 'Monaco', 'Courier New', monospace",
        fontSize: 13,
        lineHeight: 1.2,
        // Smooth scrolling reduces visual jitter
        smoothScrollDuration: 100,
        // Reduce overdraw; only render visible rows
        overviewRulerWidth: 0,
        scrollback: 5000,
        theme: {
            background:   '#0d1117',
            foreground:   '#c9d1d9',
            cursor:       '#3fb950',
            cursorAccent: '#0d1117',
            black:        '#0d1117',
            red:          '#f85149',
            green:        '#3fb950',
            yellow:       '#d29922',
            blue:         '#388bfd',
            magenta:      '#bc8cff',
            cyan:         '#39c5cf',
            white:        '#c9d1d9',
            brightBlack:  '#6e7681',
            brightRed:    '#ff7b72',
            brightGreen:  '#56d364',
            brightYellow: '#e3b341',
            brightBlue:   '#79c0ff',
            brightMagenta:'#d2a8ff',
            brightCyan:   '#56d4dd',
            brightWhite:  '#f0f6fc',
        },
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);

    // Open terminal in container
    term.open(container);
    fitAddon.fit();

    // --- 2. Activate WebGL renderer for GPU-accelerated rendering (up to 900% faster) ---
    // Falls back to canvas renderer if WebGL context is lost
    if (typeof WebglAddon !== 'undefined') {
        try {
            const webgl = new WebglAddon.WebglAddon();
            webgl.onContextLoss(() => {
                // WebGL context lost (e.g. GPU reset) — dispose and fall back to canvas
                webgl.dispose();
            });
            term.loadAddon(webgl);
        } catch (_) {
            // WebGL not supported — canvas renderer is used by default
        }
    }

    // --- 2. Reveal terminal only after it's fully initialized (prevents FOUC) ---
    // Use requestAnimationFrame to wait for first paint
    requestAnimationFrame(() => {
        container.style.visibility = 'visible';
    });

    // --- 3. Notify extension we're ready (triggers data flush + PTY spawn) ---
    vscode.postMessage({ type: 'ready', cols: term.cols, rows: term.rows });

    // --- 4. Forward keypresses to PTY ---
    term.onData((data) => {
        vscode.postMessage({ type: 'input', data });
    });

    // --- 5. Debounced resize handler to prevent resize loop flickering ---
    let resizeTimer = null;
    const resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            fitAddon.fit();
            vscode.postMessage({ type: 'resize', cols: term.cols, rows: term.rows });
            resizeTimer = null;
        }, 150);
    });
    resizeObserver.observe(container);

    // --- 6. Receive PTY output ---
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (msg.type === 'data') {
            term.write(msg.data);
        }
    });
})();
