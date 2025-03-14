import * as vscode from "vscode";
import axios from "axios";

/**
 * Interface representing a chat message
 * @role 'user' for human messages, 'assistant' for AI responses
 * @content The text content of the message
 * @timestamp UNIX timestamp for message ordering
 */
interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

const API_BASE_URL = "https://api.qbraid.com/api";

// Extension activation function
export async function activate(context: vscode.ExtensionContext) {
    console.log("qBraid Chat Extension activated");
    console.log("Registering commands with context subscriptions");

    // Register the setApiKey command first
    const setApiKeyCommand = vscode.commands.registerCommand(
        "qbraid-chat.setApiKey",
        async () => {
            console.log("setApiKey command executed");

            const apiKey = await vscode.window.showInputBox({
                prompt: "Enter your qBraid API Key",
                password: true,
                placeHolder: "Paste your API key here",
                ignoreFocusOut: true, // Keep the input box open when focus is lost
            });

            console.log(
                "API key input result:",
                apiKey ? "Key provided" : "No key provided"
            );

            if (apiKey) {
                await vscode.workspace
                    .getConfiguration()
                    .update("qbraid-chat.apiKey", apiKey, true);
                vscode.window.showInformationMessage(
                    "API Key saved successfully"
                );
                console.log("API key saved successfully");

                // Refresh the webview if it exists
                if (provider._view) {
                    console.log("Refreshing webview with new API key");
                    await provider.initializeWebview();
                }
            }
        }
    );

    // Register the removeApiKey command
    const removeApiKeyCommand = vscode.commands.registerCommand(
        "qbraid-chat.removeApiKey",
        async () => {
            await vscode.workspace
                .getConfiguration()
                .update("qbraid-chat.apiKey", "", true);
            vscode.window.showInformationMessage(
                "API Key removed successfully"
            );

            // Refresh the webview if it exists
            if (provider._view) {
                await provider.initializeWebview();
            }
        }
    );

    // Create chat view provider
    const provider = new ChatViewProvider(context.extensionUri);

    context.subscriptions.push(
        // Register the webview view provider
        vscode.window.registerWebviewViewProvider("qbraid-chat-view", provider),
        // Add the commands to subscriptions
        setApiKeyCommand,
        removeApiKeyCommand
    );
}

/**
 * Webview View Provider class implementing chat interface
 * Handles webview creation, message processing, and API communication
 */
class ChatViewProvider implements vscode.WebviewViewProvider {
    public _view?: vscode.WebviewView; // Reference to webview instance
    private _chatHistory: ChatMessage[] = []; // Stores conversation history

    constructor(private readonly _extensionUri: vscode.Uri) {}

    // Webview initialization callback
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true, // Enable JavaScript in webview
            localResourceRoots: [this._extensionUri], // Allow local resources
        };

        this.initializeWebview();
    }

    // Initialize webview content based on API key status
    public async initializeWebview() {
        if (!this._view) {
            return;
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            // Show API key setup UI if not configured
            this._view.webview.html = this.getNoApiKeyContent();
            // Set up basic message handlers even without an API key
            this.setupBasicMessageHandlers();
            return;
        }

        try {
            // Fetch available models and initialize chat UI
            const models = await fetchModels(apiKey);
            this._view.webview.html = getWebviewContent(models);
            this.setupMessageHandlers(apiKey);
        } catch (error: any) {
            console.error("Error initializing chat:", error);

            // Check for authentication error (401)
            if (error.response && error.response.status === 401) {
                const updateKey = "Update API Key";
                vscode.window
                    .showErrorMessage(
                        "Authentication failed: Your qBraid API key appears to be invalid or expired.",
                        updateKey
                    )
                    .then((selection) => {
                        if (selection === updateKey) {
                            vscode.commands.executeCommand(
                                "qbraid-chat.setApiKey"
                            );
                        }
                    });

                // Show API key setup UI
                this._view.webview.html = this.getNoApiKeyContent();
                // Set up basic message handlers for the API key setup UI
                this.setupBasicMessageHandlers();
            } else {
                vscode.window.showErrorMessage(
                    `Failed to initialize chat: ${error.message || error}`
                );
            }
        }
    }

    // HTML content for missing API key state
    private getNoApiKeyContent() {
        return `<!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        height: 100vh;
                        margin: 0;
                    }
                    .welcome-container {
                        max-width: 400px;
                        padding: 20px;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 6px;
                    }
                    h2 {
                        margin-top: 0;
                        color: var(--vscode-textLink-foreground);
                    }
                    p {
                        margin: 16px 0;
                        line-height: 1.4;
                    }
                    .steps {
                        text-align: left;
                        margin: 16px 0;
                    }
                    .steps li {
                        margin: 8px 0;
                    }
                    button {
                        margin-top: 16px;
                        padding: 8px 16px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .api-link {
                        color: var(--vscode-textLink-foreground);
                        text-decoration: none;
                    }
                    .api-link:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="welcome-container">
                    <h2>Welcome to qBraid Chat!</h2>
                    <p>To get started, you'll need to set up your qBraid API key.</p>
                    <div class="steps">
                        <ol>
                            <li>Visit <a class="api-link" href="https://account.qbraid.com">qBraid's platform</a></li>
                            <li>Generate or copy your API key</li>
                            <li>Click the button below to set it up</li>
                        </ol>
                    </div>
                    <button onclick="setApiKey()">Set API Key</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    function setApiKey() {
                        vscode.postMessage({ type: 'setApiKey' });
                    }
                </script>
            </body>
        </html>`;
    }

    // Setup message handlers for webview communication
    private setupMessageHandlers(apiKey: string) {
        if (!this._view) return;

        this._view.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case "setApiKey":
                    vscode.commands.executeCommand("qbraid-chat.setApiKey");
                    break;
                case "sendMessage":
                    await this.handleUserMessage(message, apiKey);
                    break;
                case "clearHistory":
                    this._chatHistory = [];
                    this._view?.webview.postMessage({ type: "historyCleared" });
                    break;
            }
        });
    }

    // Handle user messages and generate AI responses
    private async handleUserMessage(message: any, apiKey: string) {
        if (!this._view) return;

        try {
            // Get current editor context for enhanced prompting
            const editor = vscode.window.activeTextEditor;
            const language = editor?.document.languageId || "plaintext";
            const selectedText =
                editor?.document.getText(editor.selection) || "";

            // Construct enhanced prompt with code context
            const enhancedPrompt = `
[Context]
Language: ${language}
Selected code: ${selectedText.slice(0, 200)}${
                selectedText.length > 200 ? "..." : ""
            }

[Instructions]
Please format your response in markdown. Use code blocks with language specifiers for any code examples.

[Question]
${message.text}
`;

            // Add user message to history
            const userMessage: ChatMessage = {
                role: "user",
                content: message.text,
                timestamp: Date.now(),
            };
            this._chatHistory.push(userMessage);

            // Show user message immediately
            this._view.webview.postMessage({
                type: "updateMessages",
                messages: [userMessage],
            });

            // Show typing indicator
            this._view.webview.postMessage({ type: "showTyping" });

            // Make API request to qBraid chat endpoint
            const response = await axios.post(
                `${API_BASE_URL}/chat`,
                {
                    prompt: enhancedPrompt,
                    model: message.model,
                    stream: false,
                },
                {
                    headers: {
                        "api-key": apiKey,
                        "Content-Type": "application/json",
                    },
                }
            );

            // Add assistant response to history
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: response.data.content,
                timestamp: Date.now(),
            };
            this._chatHistory.push(assistantMessage);

            // Update webview with just the assistant message
            this._view.webview.postMessage({
                type: "updateMessages",
                messages: [assistantMessage],
            });
        } catch (error) {
            console.error("API Error:", error);
            this._view.webview.postMessage({
                type: "error",
                message: "Failed to get response. Please try again.",
            });
        }
    }

    // Set up basic message handlers for the API key setup UI
    private setupBasicMessageHandlers() {
        if (!this._view) return;

        console.log("Setting up basic message handlers for API key setup UI");

        this._view.webview.onDidReceiveMessage(async (message) => {
            console.log("Received message from webview:", message);

            switch (message.type) {
                case "setApiKey":
                    console.log("Executing setApiKey command");
                    vscode.commands.executeCommand("qbraid-chat.setApiKey");
                    break;
            }
        });
    }
}

// Fetch available models from qBraid API
async function fetchModels(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
        throw new Error("API key is empty or invalid");
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/chat/models`, {
            headers: { "api-key": apiKey },
        });
        return response.data;
    } catch (error: any) {
        // Add more context to the error
        if (error.response && error.response.status === 401) {
            throw new Error(
                "Authentication failed: Invalid or expired API key"
            );
        }
        throw error;
    }
}

// Retrieve stored API key from VS Code configuration
function getApiKey(): string | undefined {
    const apiKey = vscode.workspace
        .getConfiguration()
        .get<string>("qbraid-chat.apiKey");

    // Basic validation - ensure it's not empty or just whitespace
    if (!apiKey || apiKey.trim() === "") {
        return undefined;
    }

    return apiKey.trim();
}

// Generate complete webview HTML content
function getWebviewContent(models: any[]) {
    return `<!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    line-height: 1.4;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .header {
                    padding: 8px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .header-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .api-key-button {
                    padding: 4px 8px;
                    background: transparent;
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-secondaryForeground);
                    border-radius: 2px;
                    font-size: 11px;
                    cursor: pointer;
                }
                .api-key-button:hover {
                    background: var(--vscode-button-secondaryBackground);
                }
                .model-info {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
                select {
                    flex: 1;
                    width: 100%;
                    padding: 4px;
                    background: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border: 1px solid var(--vscode-dropdown-border);
                    border-radius: 2px;
                }
                .chat-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }
                .message {
                    margin-bottom: 8px;
                    padding: 8px;
                    border-radius: 4px;
                }
                .message-content {
                    white-space: pre-wrap;
                }
                .message-content p {
                    margin: 0 0 1em 0;
                }
                .message-content p:last-child {
                    margin-bottom: 0;
                }
                .message pre {
                    margin: 8px 0;
                    padding: 12px;
                    border-radius: 4px;
                    background: var(--vscode-textCodeBlock-background);
                    overflow-x: auto;
                }
                .message code {
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                }
                .message code:not(pre code) {
                    background: var(--vscode-textCodeBlock-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                }
                .message h1, .message h2, .message h3 {
                    margin-top: 0;
                    margin-bottom: 16px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                .message h1 {
                    font-size: 1.5em;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 0.3em;
                }
                .message h2 {
                    font-size: 1.3em;
                }
                .message h3 {
                    font-size: 1.1em;
                }
                .message ul, .message ol {
                    margin: 0 0 1em 0;
                    padding-left: 2em;
                }
                .message li {
                    margin: 0.2em 0;
                }
                .user-message {
                    background: var(--vscode-textBlockQuote-background);
                }
                .assistant-message {
                    background: var(--vscode-editor-inactiveSelectionBackground);
                }
                .message-header {
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: var(--vscode-textLink-foreground);
                }
                .bottom-container {
                    padding: 8px;
                    border-top: 1px solid var(--vscode-panel-border);
                    background: var(--vscode-sideBar-background);
                }
                .input-container {
                    display: flex;
                    gap: 8px;
                }
                textarea {
                    flex: 1;
                    min-height: 36px;
                    max-height: 120px;
                    padding: 8px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                    resize: none;
                    font-family: inherit;
                    font-size: inherit;
                }
                button {
                    padding: 4px 8px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .typing-indicator {
                    display: none;
                    padding: 8px;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }
                .error-message {
                    margin: 8px;
                    padding: 8px;
                    background: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    color: var(--vscode-inputValidation-errorForeground);
                    border-radius: 4px;
                }
                .toolbar {
                    display: flex;
                    justify-content: flex-end;
                    padding: 4px 8px;
                }
                .toolbar button {
                    background: transparent;
                    color: var(--vscode-button-secondaryForeground);
                    padding: 2px 4px;
                    font-size: 12px;
                }
                .toolbar button:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-row">
                    <select id="model-select">
                        ${models
                            .map(
                                (m) =>
                                    `<option value="${m.model}">${m.model}</option>`
                            )
                            .join("")}
                    </select>
                    <button class="api-key-button" onclick="setApiKey()">Change API Key</button>
                </div>
                <div id="model-pricing" class="model-info"></div>
            </div>
            <div class="chat-container" id="chat-container"></div>
            <div class="typing-indicator" id="typing-indicator">Assistant is typing...</div>
            <div class="bottom-container">
                <div class="toolbar">
                    <button onclick="clearHistory()">Clear Chat</button>
                </div>
                <div class="input-container">
                    <textarea id="message-input" placeholder="Type a message..." rows="1" 
                        oninput="autoResize(this)" onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }">
                    </textarea>
                    <button id="send-button" onclick="sendMessage()">Send</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const chatContainer = document.getElementById('chat-container');
                const messageInput = document.getElementById('message-input');
                const sendButton = document.getElementById('send-button');
                const modelSelect = document.getElementById('model-select');
                const modelPricing = document.getElementById('model-pricing');
                const typingIndicator = document.getElementById('typing-indicator');
                let isProcessing = false;

                const models = ${JSON.stringify(models)};
                modelSelect.addEventListener('change', updateModelInfo);
                updateModelInfo();

                // Configure marked.js options
                marked.setOptions({
                    highlight: function(code, lang) {
                        if (lang && hljs.getLanguage(lang)) {
                            return hljs.highlight(code, { language: lang }).value;
                        }
                        return hljs.highlightAuto(code).value;
                    },
                    breaks: true,
                    gfm: true
                });

                function updateModelInfo() {
                    const selectedModel = models.find(m => m.model === modelSelect.value);
                    if (selectedModel) {
                        modelPricing.textContent = \`\${selectedModel.pricing.input} \${selectedModel.pricing.units} (input) / \${selectedModel.pricing.output} \${selectedModel.pricing.units} (output)\`;
                    }
                }

                function autoResize(textarea) {
                    textarea.style.height = 'auto';
                    const newHeight = Math.min(textarea.scrollHeight, 120);
                    textarea.style.height = newHeight + 'px';
                }

                function addMessage(msg) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${msg.role}-message\`;

                    const header = document.createElement('div');
                    header.className = 'message-header';
                    header.textContent = msg.role === 'user' ? 'You' : 'Assistant';
                    messageDiv.appendChild(header);

                    const content = document.createElement('div');
                    content.className = 'message-content';
                    content.innerHTML = marked.parse(msg.content);
                    messageDiv.appendChild(content);

                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;

                    // Highlight any new code blocks
                    messageDiv.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }

                function setProcessing(processing) {
                    isProcessing = processing;
                    sendButton.disabled = processing;
                    messageInput.disabled = processing;
                    modelSelect.disabled = processing;
                    typingIndicator.style.display = processing ? 'block' : 'none';
                    if (!processing) {
                        messageInput.focus();
                    }
                }

                function sendMessage() {
                    const text = messageInput.value.trim();
                    if (!text || isProcessing) return;

                    setProcessing(true);
                    vscode.postMessage({
                        type: 'sendMessage',
                        text: text,
                        model: modelSelect.value
                    });
                    messageInput.value = '';
                    messageInput.style.height = '36px';
                }

                function clearHistory() {
                    if (confirm('Clear chat history?')) {
                        vscode.postMessage({ type: 'clearHistory' });
                        chatContainer.innerHTML = '';
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateMessages':
                            message.messages.forEach(addMessage);
                            setProcessing(false);
                            break;
                        case 'showTyping':
                            setProcessing(true);
                            break;
                        case 'error':
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'error-message';
                            errorDiv.textContent = message.message;
                            chatContainer.appendChild(errorDiv);
                            setProcessing(false);
                            break;
                        case 'historyCleared':
                            chatContainer.innerHTML = '';
                            break;
                    }
                });

                function setApiKey() {
                    vscode.postMessage({ type: 'setApiKey' });
                }

                messageInput.focus();
            </script>
        </body>
    </html>`;
}

// Extension deactivation hook
export function deactivate() {}
