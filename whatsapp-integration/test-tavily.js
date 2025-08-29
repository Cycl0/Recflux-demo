import 'dotenv/config';
import { tavily } from "@tavily/core";

async function testTavily() {
    console.log('[TAVILY_TEST] Starting test...');
    console.log('[TAVILY_TEST] API Key available:', !!process.env.TAVILY_API_KEY);
    console.log('[TAVILY_TEST] API Key preview:', process.env.TAVILY_API_KEY?.substring(0, 12) + '...');
    
    if (!process.env.TAVILY_API_KEY) {
        console.error('[TAVILY_TEST] No TAVILY_API_KEY found in environment');
        return;
    }

    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    
    try {
        console.log('[TAVILY_TEST] Testing search...');
        const response = await tvly.search('hello world');
        console.log('[TAVILY_TEST] Search response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('[TAVILY_TEST] Search error:', error?.message || error);
    }
    
    try {
        console.log('[TAVILY_TEST] Testing extract...');
        const response = await tvly.extract('https://unsplash.com/s/photos/hello');
        console.log('[TAVILY_TEST] Extract response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('[TAVILY_TEST] Extract error:', error?.message || error);
    }
}

testTavily().catch(console.error);