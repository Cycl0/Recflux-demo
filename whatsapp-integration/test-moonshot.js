import axios from 'axios';

async function testMoonshotAPI() {
    console.log('[MOONSHOT_TEST] Starting Moonshot API test...');
    
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY || process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
    console.log('[MOONSHOT_TEST] API Key available:', !!apiKey);
    console.log('[MOONSHOT_TEST] API Key preview:', apiKey ? apiKey.substring(0, 12) + '...' : 'NOT FOUND');
    
    if (!apiKey) {
        console.error('[MOONSHOT_TEST] No API key found. Please set OPENAI_API_KEY or MOONSHOT_API_KEY');
        return;
    }
    
    // Test 1: List available models
    console.log('\n=== TEST 1: List Available Models ===');
    try {
        const modelsResponse = await axios.get('https://api.moonshot.ai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('[MOONSHOT_TEST] Models endpoint status:', modelsResponse.status);
        console.log('[MOONSHOT_TEST] Available models:');
        modelsResponse.data.data.forEach(model => {
            console.log(`  - ${model.id}`);
        });
    } catch (error) {
        console.error('[MOONSHOT_TEST] Models endpoint failed:', error.response?.status, error.response?.statusText);
        console.error('[MOONSHOT_TEST] Error details:', error.response?.data || error.message);
    }
    
    // Test 2: Simple chat completion
    console.log('\n=== TEST 2: Chat Completion ===');
    const testModels = ['kimi-k2-0711-preview', 'moonshot-v1-32k', 'kimi-k2'];
    
    for (const modelId of testModels) {
        console.log(`\n--- Testing model: ${modelId} ---`);
        try {
            const response = await axios.post('https://api.moonshot.ai/v1/chat/completions', {
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
            
            console.log(`[MOONSHOT_TEST] ${modelId} - Status:`, response.status);
            console.log(`[MOONSHOT_TEST] ${modelId} - Response:`, response.data.choices[0].message.content);
            console.log(`[MOONSHOT_TEST] ${modelId} - SUCCESS ✅`);
            break; // Stop on first successful model
            
        } catch (error) {
            console.error(`[MOONSHOT_TEST] ${modelId} - FAILED ❌`);
            console.error(`[MOONSHOT_TEST] ${modelId} - Status:`, error.response?.status);
            console.error(`[MOONSHOT_TEST] ${modelId} - Error:`, error.response?.data || error.message);
        }
    }
    
    console.log('\n[MOONSHOT_TEST] Test completed.');
}

// Run the test
testMoonshotAPI().catch(error => {
    console.error('[MOONSHOT_TEST] Test failed:', error);
    process.exit(1);
});