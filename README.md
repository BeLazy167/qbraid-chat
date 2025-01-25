# qBraid Chat VS Code Extension

A Visual Studio Code extension that integrates with qBraid's Chat API, providing a seamless interface to interact with quantum computing-focused AI models directly within your IDE.

## ✨ Implemented Features

### Core Functionality

-   [x] Secure API key management through VS Code settings
-   [x] Integration with qBraid Chat API
-   [x] Model selection from available qBraid models
-   [x] Real-time chat interface in VS Code sidebar
-   [x] Code context awareness (sends current file language and selected code)
-   [x] Markdown rendering with syntax highlighting
-   [x] Chat history management with clear functionality

### UI/UX

-   [x] Modern VS Code-themed interface
-   [x] Syntax highlighted code blocks
-   [x] Immediate message feedback
-   [x] Loading indicators
-   [x] Error handling and display
-   [x] Responsive textarea with auto-resize
-   [x] Model pricing information display
-   [x] Keyboard shortcuts (Enter to send, Shift+Enter for new line)

## 🚀 Setup Instructions

1. Install the extension:

    ```bash
    code --install-extension qbraid-chat-0.1.0.vsix
    ```

2. Get your qBraid API key:

    - Visit [qBraid's platform](https://account.qbraid.com)
    - Generate or copy your API key

3. Configure the extension:
    - Open VS Code
    - Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
    - Run "qBraid: Set API Key"
    - Enter your API key when prompted

## 🎯 Usage

1. Click the qBraid Chat icon in the activity bar (left sidebar)
2. Select your preferred model from the dropdown
3. Type your message and press Enter to send
4. For code-related questions, select the relevant code before asking

## 🔧 Development Setup

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd qbraid-chat
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Build the extension:

    ```bash
    npm run compile
    ```

4. Run/Debug:
    - Press F5 in VS Code to start debugging
    - A new VS Code window will open with the extension loaded

## 📝 Todo (Level 1 Features)

### Agentic Behavior

-   [ ] Handle real-time server requests to other qBraid API endpoints
-   [ ] Implement platform-specific question handling:
    -   [ ] Query quantum device availability
    -   [ ] Check quantum job status
    -   [ ] Access platform-specific information

### Additional Enhancements

-   [ ] Stream responses from the API
-   [ ] Add support for file attachments
-   [ ] Implement conversation persistence
-   [ ] Add conversation export functionality
-   [ ] Support for custom model parameters

## 📦 Packaging and Submission

1. Package the extension:

    ```bash
    npm install
    npm run vsce:package
    ```

    This will generate `qbraid-chat-0.1.0.vsix` in the root directory.

2. Verify the package:

    ```bash
    code --install-extension qbraid-chat-0.1.0.vsix
    ```

3. Prepare submission:

    - Ensure package.json has:
        - `"name": "qbraid-chat"`
        - `"version": "0.1.0"`
    - Project directory is named `qbraid-chat`

4. Create submission zip:

    ```bash
    zip -r qbraid-chat.zip qbraid-chat -x "*/node_modules/*" "*/dist/*" "*/out/*" "*/.git/*" "*.vsix"
    ```

5. Submit using qBraid-CLI:
    ```bash
    qbraid files upload qbraid-chat.zip --namespace fullstack-challenge
    ```
    To overwrite a previous upload (max 2 overwrites allowed):
    ```bash
    qbraid files upload qbraid-chat.zip --namespace fullstack-challenge --overwrite
    ```

## 🛠️ Technical Details

-   **VS Code API Version**: ^1.85.0
-   **Key Dependencies**:
    -   axios: HTTP client for API requests
    -   marked: Markdown parsing
    -   highlight.js: Code syntax highlighting

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
