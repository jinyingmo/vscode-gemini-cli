// Gemini CLI WebView Main Script
(function() {
    const vscode = acquireVsCodeApi();
    
    // DOM Elements
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const stopBtn = document.getElementById('stopBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const cliStatus = document.getElementById('cliStatus');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    // State
    let isGenerating = false;
    let messages = [];
    
    // Initialize
    function init() {
        setupEventListeners();
        checkCliStatus();
        messageInput.focus();
    }
    
    // Event Listeners
    function setupEventListeners() {
        // Send message
        sendBtn.addEventListener('click', sendMessage);
        
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', () => {
            updateSendButton();
            autoResizeTextarea();
        });
        
        // Stop generation
        stopBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'stopGeneration' });
        });
        
        // New chat
        newChatBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'newChat' });
        });
        
        // Settings
        settingsBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'openSettings' });
        });
        
        openSettingsBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'openSettings' });
        });
        
        // Suggestion items
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const text = item.getAttribute('data-text');
                messageInput.value = text;
                updateSendButton();
                messageInput.focus();
            });
        });
        
        // Listen for messages from extension
        window.addEventListener('message', handleExtensionMessage);
    }
    
    // Handle messages from extension
    function handleExtensionMessage(event) {
        const message = event.data;
        
        switch (message.type) {
            case 'message':
                addMessage(message.message);
                break;
                
            case 'stream':
                updateStreamingMessage(message.messageId, message.content, message.chunk);
                break;
                
            case 'streamEnd':
                finishStreamingMessage(message.messageId, message.content);
                break;
                
            case 'clear':
                clearChat();
                break;
                
            case 'cliStatus':
                updateCliStatus(message.available);
                break;
        }
    }
    
    // Send message
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || isGenerating) return;
        
        // Hide welcome message
        welcomeMessage.classList.add('hidden');
        
        // Add user message to UI immediately
        addMessage({
            id: 'temp-' + Date.now(),
            role: 'user',
            content: text,
            timestamp: new Date()
        });
        
        // Clear input
        messageInput.value = '';
        updateSendButton();
        autoResizeTextarea();
        
        // Send to extension
        vscode.postMessage({
            type: 'sendMessage',
            text: text
        });
        
        // Show stop button
        setGenerating(true);
    }
    
    // Add message to chat
    function addMessage(message) {
        messages.push(message);
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.role}`;
        messageEl.id = `msg-${message.id}`;
        
        const avatar = message.role === 'user' ? '👤' : '✦';
        const roleName = message.role === 'user' ? 'You' : 'Gemini';
        const time = formatTime(message.timestamp);
        
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-avatar">${avatar}</span>
                <span class="message-role">${roleName}</span>
                <span class="message-timestamp">${time}</span>
            </div>
            <div class="message-content">
                ${formatContent(message.content)}
            </div>
        `;
        
        chatContainer.appendChild(messageEl);
        scrollToBottom();
    }
    
    // Update streaming message
    function updateStreamingMessage(messageId, content, chunk) {
        const messageEl = document.getElementById(`msg-${messageId}`);
        
        if (!messageEl) {
            // Create new streaming message
            const newMessage = {
                id: messageId,
                role: 'assistant',
                content: content,
                timestamp: new Date(),
                isStreaming: true
            };
            addMessage(newMessage);
            
            // Add streaming indicator
            const msgContent = document.querySelector(`#msg-${messageId} .message-content`);
            if (msgContent) {
                const indicator = document.createElement('div');
                indicator.className = 'streaming-indicator';
                indicator.textContent = 'Generating';
                indicator.id = `indicator-${messageId}`;
                msgContent.appendChild(indicator);
            }
        } else {
            // Update existing message
            const contentEl = messageEl.querySelector('.message-content');
            if (contentEl) {
                contentEl.innerHTML = formatContent(content);
                
                // Re-add streaming indicator
                if (!document.getElementById(`indicator-${messageId}`)) {
                    const indicator = document.createElement('div');
                    indicator.className = 'streaming-indicator';
                    indicator.textContent = 'Generating';
                    indicator.id = `indicator-${messageId}`;
                    contentEl.appendChild(indicator);
                }
            }
        }
        
        scrollToBottom();
    }
    
    // Finish streaming message
    function finishStreamingMessage(messageId, content) {
        setGenerating(false);
        
        const messageEl = document.getElementById(`msg-${messageId}`);
        if (messageEl) {
            const contentEl = messageEl.querySelector('.message-content');
            const indicator = document.getElementById(`indicator-${messageId}`);
            
            if (indicator) {
                indicator.remove();
            }
            
            if (contentEl) {
                contentEl.innerHTML = formatContent(content);
                addCodeBlockActions(contentEl);
                
                // Render mermaid diagrams
                if (window.mermaid) {
                    const mermaidBlocks = contentEl.querySelectorAll('.mermaid');
                    if (mermaidBlocks.length > 0) {
                        window.mermaid.run({
                            nodes: Array.from(mermaidBlocks)
                        }).catch(e => console.error('Mermaid render error:', e));
                    }
                }
            }
        }
    }
    
    // Clear chat
    function clearChat() {
        messages = [];
        chatContainer.innerHTML = '';
        chatContainer.appendChild(welcomeMessage);
        welcomeMessage.classList.remove('hidden');
        setGenerating(false);
    }
    
    // Update CLI status
    function updateCliStatus(available) {
        if (available) {
            cliStatus.classList.add('hidden');
        } else {
            cliStatus.classList.remove('hidden');
        }
    }
    
    // Check CLI status
    function checkCliStatus() {
        vscode.postMessage({ type: 'checkCli' });
    }
    
    // Format content (markdown-like)
    function formatContent(content) {
        if (!content) return '';
        
        let formatted = escapeHtml(content);
        
        // Code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            
            if (language.toLowerCase() === 'mermaid') {
                return `<div class="mermaid">${escapeHtml(code)}</div>`;
            }

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span>${language}</span>
                        <div class="code-actions">
                            <button class="code-action-btn" onclick="copyCode(this)" data-code="${escapeHtml(code)}">Copy</button>
                            <button class="code-action-btn" onclick="insertCode(this)" data-code="${escapeHtml(code)}">Insert</button>
                        </div>
                    </div>
                    <pre><code class="language-${language}">${escapeHtml(code)}</code></pre>
                </div>
            `;
        });
        
        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Bold
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Links
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    // Add code block actions
    function addCodeBlockActions(container) {
        // Actions are already added in formatContent
    }
    
    // Copy code
    window.copyCode = function(btn) {
        const code = btn.getAttribute('data-code');
        vscode.postMessage({
            type: 'copyCode',
            code: code
        });
    };
    
    // Insert code
    window.insertCode = function(btn) {
        const code = btn.getAttribute('data-code');
        vscode.postMessage({
            type: 'insertCode',
            code: code
        });
    };
    
    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Format time
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Update send button state
    function updateSendButton() {
        const hasText = messageInput.value.trim().length > 0;
        sendBtn.disabled = !hasText || isGenerating;
    }
    
    // Auto-resize textarea
    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    }
    
    // Set generating state
    function setGenerating(generating) {
        isGenerating = generating;
        
        if (generating) {
            sendBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
        } else {
            sendBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
        }
        
        updateSendButton();
    }
    
    // Scroll to bottom
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Initialize
    init();
})();
