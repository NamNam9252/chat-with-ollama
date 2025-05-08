const fetch = require('node-fetch');

async function testOllamaConnection() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            console.log('Successfully connected to Ollama!');
            console.log('Available models:', data.models.map(m => m.name).join(', '));
        } else {
            console.error('Ollama responded with status:', response.status);
        }
    } catch (error) {
        console.error('Failed to connect to Ollama. Error:', error.message);
        console.log('\nTroubleshooting steps:');
        console.log('1. Make sure Ollama is installed correctly');
        console.log('2. Verify Ollama is running by opening a terminal and typing: ollama serve');
        console.log('3. Check if you can access http://localhost:11434 in your browser');
    }
}

testOllamaConnection(); 