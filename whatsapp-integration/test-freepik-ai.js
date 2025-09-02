import axios from 'axios';

async function testFreepikAI() {
    console.log('[FREEPIK_AI_TEST] Starting Freepik AI image generation test...');
    
    // Check for API key
    const apiKey = process.env.FREEPIK_API_KEY;
    console.log('[FREEPIK_AI_TEST] API Key available:', !!apiKey);
    console.log('[FREEPIK_AI_TEST] API Key preview:', apiKey ? apiKey.substring(0, 12) + '...' : 'NOT FOUND');
    
    if (!apiKey) {
        console.error('[FREEPIK_AI_TEST] No API key found. Please set FREEPIK_API_KEY');
        return;
    }
    
    // Test image generation
    const testPrompt = "Mystic Mage, Master of ancient spells and arcane knowledge, epic fantasy character";
    console.log(`\n=== Testing Image Generation ===`);
    console.log(`Prompt: "${testPrompt}"`);
    
    try {
        const requestBody = {
            prompt: testPrompt,
            aspect_ratio: 'square_1_1',
            styling: {
                effects: {
                    color: 'vibrant',
                    framing: 'portrait',
                    lightning: 'dramatic'
                }
            },
            seed: Math.floor(Math.random() * 2147483648)
        };

        console.log('[FREEPIK_AI_TEST] Request body:', JSON.stringify(requestBody, null, 2));

        const response = await axios.post(
            'https://api.freepik.com/v1/ai/text-to-image/flux-dev',
            requestBody,
            {
                headers: {
                    'x-freepik-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log('[FREEPIK_AI_TEST] Response status:', response.status);
        console.log('[FREEPIK_AI_TEST] Response data:', JSON.stringify(response.data, null, 2));

        if (response.status === 200 || response.status === 202) {
            const jobId = response.data?.job_id || response.data?.data?.task_id;
            if (jobId) {
                console.log(`[FREEPIK_AI_TEST] Job created successfully! Job ID: ${jobId}`);
                console.log('[FREEPIK_AI_TEST] Polling for completion...');

                // Poll for completion
                let attempts = 0;
                const maxAttempts = 20;
                let imageUrl = null;

                while (attempts < maxAttempts && !imageUrl) {
                    attempts++;
                    console.log(`[FREEPIK_AI_TEST] Polling attempt ${attempts}/${maxAttempts}`);
                    
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                    
                    try {
                        const statusResponse = await axios.get(
                            `https://api.freepik.com/v1/ai/text-to-image/flux-dev/${jobId}`,
                            {
                                headers: {
                                    'x-freepik-api-key': apiKey
                                },
                                timeout: 10000
                            }
                        );
                        
                        console.log(`[FREEPIK_AI_TEST] Status check ${attempts}:`, statusResponse.data?.data?.status);
                        
                        if (statusResponse.data?.data?.status === 'COMPLETED' && statusResponse.data?.data?.generated?.length > 0) {
                            imageUrl = statusResponse.data.data.generated[0];
                            console.log(`[FREEPIK_AI_TEST] ✅ Image generation completed!`);
                            console.log(`[FREEPIK_AI_TEST] Image URL: ${imageUrl}`);
                            break;
                        } else if (statusResponse.data?.data?.status === 'FAILED') {
                            console.error(`[FREEPIK_AI_TEST] ❌ Image generation failed:`, statusResponse.data?.data?.error || 'Unknown error');
                            break;
                        } else {
                            console.log(`[FREEPIK_AI_TEST] Status: ${statusResponse.data?.data?.status || 'unknown'} - continuing to wait...`);
                        }
                    } catch (statusError) {
                        console.error(`[FREEPIK_AI_TEST] Status check error:`, statusError.response?.data || statusError.message);
                    }
                }

                if (!imageUrl) {
                    console.error('[FREEPIK_AI_TEST] ❌ Image generation timed out or failed after', maxAttempts, 'attempts');
                }
            } else {
                console.error('[FREEPIK_AI_TEST] ❌ No job ID returned from API');
            }
        } else {
            console.error(`[FREEPIK_AI_TEST] ❌ Unexpected response status: ${response.status}`);
        }

    } catch (error) {
        console.error('[FREEPIK_AI_TEST] ❌ Request failed:', error.response?.status, error.response?.statusText);
        console.error('[FREEPIK_AI_TEST] Error details:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.error('[FREEPIK_AI_TEST] 🔑 Authentication failed - check your FREEPIK_API_KEY');
        } else if (error.response?.status === 429) {
            console.error('[FREEPIK_AI_TEST] 🚫 Rate limit exceeded - please wait and try again');
        } else if (error.response?.status === 402) {
            console.error('[FREEPIK_AI_TEST] 💳 Payment required - check your Freepik subscription');
        }
    }
    
    console.log('\n[FREEPIK_AI_TEST] Test completed.');
}

// Run the test
testFreepikAI().catch(error => {
    console.error('[FREEPIK_AI_TEST] Test failed:', error);
    process.exit(1);
});