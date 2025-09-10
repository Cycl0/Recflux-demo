#!/usr/bin/env node

/**
 * Environment Variables Diagnostic Tool
 * 
 * This script helps diagnose missing environment variables
 * for WhatsApp integration features.
 */

console.log('🔍 WhatsApp Integration - Environment Diagnostic');
console.log('='.repeat(60));

// API Keys for Vision/Video Analysis
const apiKeys = [
    'OPENROUTER_API_KEY',
    'OPENAI_API_KEY', 
    'OPEN_ROUTER_API_KEY'
];

console.log('\n🔑 API Keys (for Vision/Video Analysis):');
let hasApiKey = false;
apiKeys.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅ SET' : '❌ NOT SET';
    const preview = value ? `(${value.substring(0, 10)}...)` : '';
    console.log(`   ${key}: ${status} ${preview}`);
    if (value) hasApiKey = true;
});

if (!hasApiKey) {
    console.log('\n⚠️  WARNING: No API keys found for vision/video analysis!');
    console.log('   Set one of: OPENROUTER_API_KEY, OPENAI_API_KEY, or OPEN_ROUTER_API_KEY');
}

// Other critical keys
console.log('\n🎥 Media APIs:');
const mediaKeys = [
    'PEXELS_API_KEY',
    'IMGBB_API_KEY'
];

mediaKeys.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅ SET' : '❌ NOT SET';
    const preview = value ? `(${value.substring(0, 10)}...)` : '';
    console.log(`   ${key}: ${status} ${preview}`);
});

// WhatsApp Configuration
console.log('\n📱 WhatsApp Configuration:');
const whatsappKeys = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_VERIFY_TOKEN'
];

whatsappKeys.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅ SET' : '❌ NOT SET';
    const preview = value ? `(${value.substring(0, 10)}...)` : '';
    console.log(`   ${key}: ${status} ${preview}`);
});

// Redis Configuration
console.log('\n🔄 Cache Configuration:');
const redisKeys = [
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PASSWORD',
    'REDIS_USER'
];

redisKeys.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅ SET' : '❌ NOT SET';
    const preview = value && !key.includes('PASSWORD') ? `(${value.substring(0, 20)}...)` : '';
    console.log(`   ${key}: ${status} ${preview}`);
});

// Feature Analysis
console.log('\n🚀 Feature Status:');
console.log(`   Video Analysis: ${hasApiKey ? '✅ Available' : '❌ Disabled (no API key)'}`);
console.log(`   Vision Analysis: ${hasApiKey ? '✅ Available' : '❌ Disabled (no API key)'}`);
console.log(`   Video Search: ${process.env.PEXELS_API_KEY ? '✅ Available' : '❌ Disabled (no PEXELS_API_KEY)'}`);
console.log(`   Image Upload: ${process.env.IMGBB_API_KEY ? '✅ Available' : '❌ Disabled (no IMGBB_API_KEY)'}`);

// Recommendations
console.log('\n💡 Recommendations:');
if (!hasApiKey) {
    console.log('   • Add OPENROUTER_API_KEY for video/vision analysis features');
}
if (!process.env.PEXELS_API_KEY) {
    console.log('   • Add PEXELS_API_KEY for video search functionality');
}
if (!process.env.IMGBB_API_KEY) {
    console.log('   • Add IMGBB_API_KEY for image upload functionality');
}

console.log('\n✅ Diagnostic complete!');
console.log('\n📁 Log files to check:');
console.log('   • mcp-puppeteer.log - Video search logs');
console.log('   • mcp-video-analyzer.log - Video analysis logs');
console.log('   • mcp-design-analyzer.log - Vision analysis logs');
console.log('   • redis-cache.log - Cache operation logs');