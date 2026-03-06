import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}

export interface GeminiCliConfig {
    executablePath: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

export class GeminiCliService extends EventEmitter implements vscode.Disposable {
    private currentProcess: ChildProcess | null = null;
    private config: GeminiCliConfig;
    private messageHistory: ChatMessage[] = [];

    constructor() {
        super();
        this.config = this.loadConfig();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('geminiCli')) {
                this.config = this.loadConfig();
            }
        });
    }

    private loadConfig(): GeminiCliConfig {
        const config = vscode.workspace.getConfiguration('geminiCli');
        return {
            executablePath: config.get<string>('executablePath', 'gemini'),
            model: config.get<string>('model', 'gemini-pro'),
            temperature: config.get<number>('temperature', 0.7),
            maxTokens: config.get<number>('maxTokens', 2048)
        };
    }

    public async sendMessage(message: string): Promise<void> {
        const userMessage: ChatMessage = {
            id: this.generateId(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };

        this.messageHistory.push(userMessage);
        this.emit('message', userMessage);

        try {
            await this.streamResponse(message);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: this.generateId(),
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                timestamp: new Date()
            };
            this.messageHistory.push(errorMessage);
            this.emit('message', errorMessage);
        }
    }

    private async streamResponse(message: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const assistantMessageId = this.generateId();
            const assistantMessage: ChatMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true
            };

            this.messageHistory.push(assistantMessage);
            this.emit('message', assistantMessage);

            let modelName = this.config.model;
            if (['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'].includes(modelName)) {
                modelName = 'gemini-2.5-pro';
            }

            const args = [
                '-p', message,
                '-m', modelName
            ];

            this.currentProcess = spawn(this.config.executablePath, args, {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
                shell: process.platform === 'win32' || this.config.executablePath === 'gemini',
                env: {
                    ...process.env,
                    FORCE_COLOR: '0'
                }
            });

            let accumulatedContent = '';

            this.currentProcess.stdout?.on('data', (data: Buffer) => {
                const chunk = data.toString();
                accumulatedContent += chunk;
                
                assistantMessage.content = accumulatedContent;
                this.emit('stream', {
                    messageId: assistantMessageId,
                    content: accumulatedContent,
                    chunk: chunk
                });
            });

            this.currentProcess.stderr?.on('data', (data: Buffer) => {
                const errorChunk = data.toString();
                console.error('Gemini CLI stderr:', errorChunk);
            });

            this.currentProcess.on('close', (code) => {
                assistantMessage.isStreaming = false;
                
                if (code === 0) {
                    this.emit('streamEnd', {
                        messageId: assistantMessageId,
                        content: accumulatedContent
                    });
                    resolve();
                } else {
                    const errorMsg = code !== null 
                        ? `Process exited with code ${code}`
                        : 'Process was terminated';
                    reject(new Error(errorMsg));
                }
                
                this.currentProcess = null;
            });

            this.currentProcess.on('error', (error) => {
                assistantMessage.isStreaming = false;
                this.currentProcess = null;
                reject(error);
            });
        });
    }

    public stopGeneration(): void {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
            
            // Update the last streaming message
            const lastMessage = this.messageHistory[this.messageHistory.length - 1];
            if (lastMessage && lastMessage.isStreaming) {
                lastMessage.isStreaming = false;
                this.emit('streamEnd', {
                    messageId: lastMessage.id,
                    content: lastMessage.content
                });
            }
        }
    }

    public clearHistory(): void {
        this.messageHistory = [];
        this.emit('clear');
    }

    public getMessageHistory(): ChatMessage[] {
        return [...this.messageHistory];
    }

    public async checkCliAvailable(): Promise<boolean> {
        return new Promise((resolve) => {
            const checkProcess = spawn(this.config.executablePath, ['--version'], {
                timeout: 5000,
                shell: process.platform === 'win32' || this.config.executablePath === 'gemini'
            });

            checkProcess.on('close', (code) => {
                resolve(code === 0);
            });

            checkProcess.on('error', () => {
                resolve(false);
            });
        });
    }

    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    dispose() {
        this.stopGeneration();
        this.removeAllListeners();
    }
}
