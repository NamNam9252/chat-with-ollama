document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const modelSelector = document.getElementById('model');

    // Function to add a message to the chat
    function addMessage(content, isUser = false, isThinking = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : isThinking ? 'thinking-message' : 'bot-message'}`;
        
        if (isThinking) {
            messageDiv.innerHTML = `<i>${content}</i>`;
        } else {
            messageDiv.textContent = content;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    // Function to type message with animation
    async function typeMessage(element, text, speed = 20) {
        for (let i = 0; i < text.length; i++) {
            element.textContent = text.substring(0, i + 1);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, speed));
        }
    }

    // Function to process streaming response
    async function processStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        let botMessage = addMessage('', false);
        let inThinkingBlock = false;
        let thinkingContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        // Handle thinking blocks
                        if (data.response.includes('<think>') || inThinkingBlock) {
                            if (!inThinkingBlock && data.response.includes('<think>')) {
                                inThinkingBlock = true;
                                thinkingContent = data.response.split('<think>')[1] || '';
                            } else if (inThinkingBlock && data.response.includes('</think>')) {
                                inThinkingBlock = false;
                                thinkingContent += data.response.split('</think>')[0] || '';
                                addMessage(thinkingContent, false, true);
                                thinkingContent = '';
                            } else if (inThinkingBlock) {
                                thinkingContent += data.response;
                            }
                        } else {
                            // Normal response
                            result += data.response;
                            await typeMessage(botMessage, result);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }
        return result;
    }

    // Function to check Ollama connection
    async function checkOllamaConnection() {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (!response.ok) {
                throw new Error(`Ollama responded with status: ${response.status}`);
            }
            const data = await response.json();
            const hasModel = data.models.some(m => m.name === 'deepseek-r1:14b');
            return {
                connected: true,
                hasModel: hasModel
            };
        } catch (error) {
            console.error('Ollama connection error:', error);
            return {
                connected: false,
                error: error.message
            };
        }
    }

    // Function to send message to Ollama
    async function sendToOllama(message) {
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'deepseek-r1:14b',
                    prompt: message,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama responded with status: ${response.status}`);
            }

            return await processStream(response);
        } catch (error) {
            console.error('Error:', error);
            return `Error: ${error.message}`;
        }
    }

    // Function to handle sending messages
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Disable input while processing
        userInput.disabled = true;
        sendButton.disabled = true;

        // Add user message to chat
        addMessage(message, true);
        userInput.value = '';

        // Get and add bot response
        const response = await sendToOllama(message);
        addMessage(response);

        // Re-enable input
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }

    // Event listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Check connection and initialize
    async function initialize() {
        const connection = await checkOllamaConnection();
        if (connection.connected) {
            if (connection.hasModel) {
                addMessage('Hello! I am your DeepSeek-powered chatbot. How can I help you today?');
            } else {
                addMessage('Error: The deepseek-r1:14b model is not installed. Please run: ollama pull deepseek-r1:14b');
                userInput.disabled = true;
                sendButton.disabled = true;
            }
        } else {
            addMessage(`Error: Unable to connect to Ollama. ${connection.error}\n\nPlease make sure:\n1. Ollama is installed\n2. Ollama is running (ollama serve)\n3. The deepseek-r1:14b model is installed (ollama pull deepseek-r1:14b)`);
            userInput.disabled = true;
            sendButton.disabled = true;
        }
    }

    // Initialize the chat
    initialize();
}); 