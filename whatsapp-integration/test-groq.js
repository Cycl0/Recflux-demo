import axios from 'axios';

async function testGroqAPI() {
    console.log('[GROQ_TEST] Starting Groq API test...');
    
    // Check for API key
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    console.log('[GROQ_TEST] API Key available:', !!apiKey);
    console.log('[GROQ_TEST] API Key preview:', apiKey ? apiKey.substring(0, 12) + '...' : 'NOT FOUND');
    
    if (!apiKey) {
        console.error('[GROQ_TEST] No API key found. Please set GROQ_API_KEY');
        return;
    }
    
    // Test 1: List available models
    console.log('\n=== TEST 1: List Available Models ===');
    try {
        const modelsResponse = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('[GROQ_TEST] Models endpoint status:', modelsResponse.status);
        console.log('[GROQ_TEST] Available models:');
        modelsResponse.data.data.forEach(model => {
            console.log(`  - ${model.id}`);
        });
    } catch (error) {
        console.error('[GROQ_TEST] Models endpoint failed:', error.response?.status, error.response?.statusText);
        console.error('[GROQ_TEST] Error details:', error.response?.data || error.message);
    }
    
    // Test 2: Simple chat completion with common Groq models
    console.log('\n=== TEST 2: Chat Completion ===');
    const testModels = [
        'moonshotai/kimi-k2-instruct',
        'llama-3.1-70b-versatile', 
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it'
    ];
    
    for (const modelId of testModels) {
        console.log(`\n--- Testing model: ${modelId} ---`);
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: modelId,
                messages: [
                    { role: 'user', content: 'Hello, respond with just "OK" to confirm you are working.' }
                ],
                max_tokens: 10,
                temperature: 0
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            
            console.log(`[GROQ_TEST] ${modelId} - Status:`, response.status);
            console.log(`[GROQ_TEST] ${modelId} - Response:`, response.data.choices[0].message.content);
            console.log(`[GROQ_TEST] ${modelId} - SUCCESS ✅`);
            break; // Stop on first successful model
            
        } catch (error) {
            console.error(`[GROQ_TEST] ${modelId} - FAILED ❌`);
            console.error(`[GROQ_TEST] ${modelId} - Status:`, error.response?.status);
            console.error(`[GROQ_TEST] ${modelId} - Error:`, error.response?.data?.error?.message || error.message);
        }
    }
    
    console.log('\n[GROQ_TEST] Test completed.');
}

// Run the test
testGroqAPI().catch(error => {
    console.error('[GROQ_TEST] Test failed:', error);
    process.exit(1);
});