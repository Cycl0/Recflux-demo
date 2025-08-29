#!/usr/bin/env node

// Test script to verify Claude API functionality within Docker container

async function testClaudeAPI() {
    console.log('🧪 Testing Claude API within Docker container...');
    console.log('===============================================');
    
    const CLAUDE_AUTH_TOKEN = process.env.CLAUDE_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
    
    if (!CLAUDE_AUTH_TOKEN) {
        console.error('❌ CLAUDE_AUTH_TOKEN/ANTHROPIC_API_KEY environment variable not set');
        process.exit(1);
    }
    
    console.log('✅ Claude API key found:', CLAUDE_AUTH_TOKEN.substring(0, 10) + '...');
    
    // Test 1: Simple completion
    try {
        console.log('\n🤖 Testing Claude Completion...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_AUTH_TOKEN,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: 'Hello! This is a test from Docker container. Please respond with "Hello from Claude!"'
                }]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Claude completion successful!');
        console.log(`   Model: ${data.model || 'unknown'}`);
        console.log(`   Usage: ${data.usage?.input_tokens || 0} input, ${data.usage?.output_tokens || 0} output tokens`);
        console.log(`   Response: ${data.content?.[0]?.text || 'No response content'}`);
        
    } catch (error) {
        console.error('❌ Claude completion failed:', error.message);
    }
    
    // Test 2: Code generation
    try {
        console.log('\n💻 Testing Code Generation...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_AUTH_TOKEN,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: 'Write a simple JavaScript function that adds two numbers. Just return the function code.'
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`Code generation error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Code generation successful!');
        console.log(`   Generated code length: ${data.content?.[0]?.text?.length || 0} characters`);
        console.log('   Sample of generated code:', (data.content?.[0]?.text || '').substring(0, 100) + '...');
        
    } catch (error) {
        console.error('❌ Code generation failed:', error.message);
    }
    
    // Test 3: Rate limiting check
    console.log('\n⏱️  Testing API Rate Limits...');
    const startTime = Date.now();
    
    try {
        const promises = Array.from({ length: 2 }, (_, i) => 
            fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_AUTH_TOKEN,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 20,
                    messages: [{
                        role: 'user',
                        content: `Test ${i + 1}`
                    }]
                })
            })
        );
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        
        console.log(`✅ Made 2 concurrent requests in ${endTime - startTime}ms`);
        console.log(`   Response statuses: ${responses.map(r => r.status).join(', ')}`);
        
    } catch (error) {
        console.error('❌ Rate limit test failed:', error.message);
    }
    
    console.log('\n🏁 Claude API test completed!');
}

// Run the test
testClaudeAPI().catch(console.error);