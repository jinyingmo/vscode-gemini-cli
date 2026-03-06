// Gemini CLI – Multi-Session Terminal
(function () {
    const vscode = acquireVsCodeApi();

    // ── DOM refs ──
    const tabsEl       = document.getElementById('tabs');
    const termContainer= document.getElementById('terminal-container');
    const btnNew       = document.getElementById('btn-new');
    const btnHistory   = document.getElementById('btn-history');
    const quotaBadge   = document.getElementById('quota-badge');
    const historyPanel = document.getElementById('history-panel');
    const historyList  = document.getElementById('history-list');
    const btnCloseHist = document.getElementById('btn-close-history');

    // ── State ──
    let activeId = null;
    const terminals = new Map(); // id -> { term, fitAddon, el }
    let globalCols = 80;
    let globalRows = 24;

    // ── Init Resize Observer ──
    let resizeTimer = null;
    new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (activeId && terminals.has(activeId)) {
                const session = terminals.get(activeId);
                session.fitAddon.fit();
                globalCols = session.term.cols;
                globalRows = session.term.rows;
                vscode.postMessage({ type: 'resize', id: activeId, cols: globalCols, rows: globalRows });
            }
        }, 150);
    }).observe(termContainer);

    // Reveal after paint
    requestAnimationFrame(() => { termContainer.style.visibility = 'visible'; });

    // Tell extension we are ready
    vscode.postMessage({ type: 'ready', cols: globalCols, rows: globalRows });

    // ── Terminal lifecycle ──
    function createTerminal(id) {
        if (terminals.has(id)) return;

        const el = document.createElement('div');
        el.className = 'term-wrapper';
        el.style.display = 'none';
        el.style.width = '100%';
        el.style.height = '100%';
        termContainer.appendChild(el);

        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'bar',
            fontFamily: "'Cascadia Code', 'Menlo', 'Monaco', 'Courier New', monospace",
            fontSize: 13,
            lineHeight: 1.2,
            smoothScrollDuration: 100,
            overviewRulerWidth: 0,
            scrollback: 5000,
            theme: {
                background:'#0d1117', foreground:'#c9d1d9', cursor:'#3fb950', cursorAccent:'#0d1117',
                black:'#0d1117', red:'#f85149', green:'#3fb950', yellow:'#d29922',
                blue:'#388bfd', magenta:'#bc8cff', cyan:'#39c5cf', white:'#c9d1d9',
                brightBlack:'#6e7681', brightRed:'#ff7b72', brightGreen:'#56d364',
                brightYellow:'#e3b341', brightBlue:'#79c0ff', brightMagenta:'#d2a8ff',
                brightCyan:'#56d4dd', brightWhite:'#f0f6fc',
            },
        });

        const fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        term.open(el);

        if (typeof WebglAddon !== 'undefined') {
            try {
                const webgl = new WebglAddon.WebglAddon();
                webgl.onContextLoss(() => webgl.dispose());
                term.loadAddon(webgl);
            } catch (_) {}
        }

        term.onData(data => vscode.postMessage({ type: 'input', id, data }));
        terminals.set(id, { term, fitAddon, el });
    }

    function switchTerminal(id) {
        if (activeId === id && terminals.has(id) && terminals.get(id).el.style.display === 'block') return;

        // Hide all
        for (const session of terminals.values()) {
            session.el.style.display = 'none';
        }

        activeId = id;

        // Show selected
        if (terminals.has(id)) {
            const session = terminals.get(id);
            session.el.style.display = 'block';
            
            // Give DOM time to update display:block before fitting
            requestAnimationFrame(() => {
                session.fitAddon.fit();
                session.term.focus();
                globalCols = session.term.cols;
                globalRows = session.term.rows;
                vscode.postMessage({ type: 'resize', id, cols: globalCols, rows: globalRows });
            });
        }
    }

    function destroyTerminal(id) {
        if (terminals.has(id)) {
            const session = terminals.get(id);
            session.term.dispose();
            if (session.el.parentNode) {
                session.el.parentNode.removeChild(session.el);
            }
            terminals.delete(id);
        }
    }

    // ── Extension messages ──
    window.addEventListener('message', ({ data: msg }) => {
        switch (msg.type) {
            case 'tabCreated':
                createTerminal(msg.id);
                if (msg.isActive) switchTerminal(msg.id);
                break;

            case 'data':
                if (terminals.has(msg.id)) {
                    terminals.get(msg.id).term.write(msg.data);
                }
                break;

            case 'tabSwitched':
                switchTerminal(msg.id);
                break;

            case 'tabList':
                renderTabs(msg.tabs);
                // Ensure correct terminal is visible if activeId changed remotely
                const activeTab = msg.tabs.find(t => t.isActive);
                if (activeTab && activeTab.id !== activeId) {
                    switchTerminal(activeTab.id);
                }
                break;

            case 'tabClosed':
                destroyTerminal(msg.id);
                if (msg.nextId) switchTerminal(msg.nextId);
                break;

            case 'sessionList':
                renderHistory(msg.sessions);
                break;

            case 'quotaUpdate':
                updateQuota(msg.text);
                break;
        }
    });

    // ── Toolbar buttons ──
    btnNew.addEventListener('click', () => {
        vscode.postMessage({ type: 'newSession', cols: globalCols, rows: globalRows });
    });

    btnHistory.addEventListener('click', () => {
        historyPanel.classList.toggle('hidden');
        if (!historyPanel.classList.contains('hidden')) {
            vscode.postMessage({ type: 'listHistorySessions' });
        }
    });

    btnCloseHist.addEventListener('click', () => historyPanel.classList.add('hidden'));

    // ── Render Tabs ──
    function renderTabs(tabs) {
        tabsEl.innerHTML = '';
        for (const tab of tabs) {
            const el = document.createElement('div');
            el.className = 'tab' + (tab.isActive ? ' active' : '') + (tab.exited ? ' exited' : '');
            
            const nameEl = document.createElement('span');
            nameEl.className = 'tab-name';
            nameEl.textContent = tab.name;

            const closeEl = document.createElement('button');
            closeEl.className = 'tab-close';
            closeEl.textContent = '✕';
            closeEl.title = 'Close session';
            closeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                vscode.postMessage({ type: 'closeSession', id: tab.id });
            });

            el.appendChild(nameEl);
            el.appendChild(closeEl);
            el.addEventListener('click', () => {
                if (!tab.isActive) {
                    vscode.postMessage({ type: 'switchSession', id: tab.id });
                }
            });

            tabsEl.appendChild(el);

            if (tab.isActive) {
                el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        }
    }

    // ── Render History ──
    function renderHistory(sessions) {
        historyList.innerHTML = '';
        if (!sessions || sessions.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No saved sessions found</div>';
            return;
        }
        for (const s of sessions) {
            const item = document.createElement('div');
            item.className = 'history-item';

            const label = document.createElement('span');
            label.className = 'history-label';
            label.textContent = s.label;

            const btn = document.createElement('button');
            btn.className = 'history-resume';
            btn.textContent = 'Resume';
            btn.addEventListener('click', () => {
                historyPanel.classList.add('hidden');
                vscode.postMessage({ type: 'resumeSession', index: s.index, cols: globalCols, rows: globalRows });
            });

            item.appendChild(label);
            item.appendChild(btn);
            historyList.appendChild(item);
        }
    }

    // ── Quota badge ──
    function updateQuota(text) {
        if (!text) return;
        quotaBadge.textContent = text;
        quotaBadge.classList.remove('hidden', 'warning', 'danger');

        const lower = text.toLowerCase();
        if (/exceeded|limit/.test(lower)) {
            quotaBadge.classList.add('danger');
        } else {
            const nums = text.match(/\d+/g);
            if (nums && parseInt(nums[0]) < 10) {
                quotaBadge.classList.add('warning');
            }
        }
    }
})();
