import { spawn } from 'child_process';

// Test the Crawl4AI fix by running a simple crawl without LLM extraction
console.log('[TEST] Testing Crawl4AI timeout fix...');

const testUrl = 'https://daisyui.com/components/';
const crwlArgs = [
    'crawl',
    testUrl,
    '-o', 'markdown',
    '--deep-crawl', 'bfs',
    '--max-pages', '3', // Small test first
    '--bypass-cache'
    // Note: No -q flag (LLM extraction) removed!
];

console.log(`[TEST] Command: crwl ${crwlArgs.join(' ')}`);
console.log('[TEST] Expected timeout: ~45s (15 + 3*10)');

const startTime = Date.now();
let stdout = '';
let stderr = '';

const crwlProcess = spawn('crwl', crwlArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8'
    }
});

// Timeout after 60 seconds
const killTimer = setTimeout(() => {
    console.log('[TEST] ❌ Process timed out - killing...');
    crwlProcess.kill('SIGTERM');
    setTimeout(() => crwlProcess.kill('SIGKILL'), 2000);
}, 60000);

crwlProcess.stdout.on('data', (data) => {
    stdout += data.toString();
});

crwlProcess.stderr.on('data', (data) => {
    stderr += data.toString();
});

crwlProcess.on('close', (code) => {
    clearTimeout(killTimer);
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n[TEST] Process completed in ${duration}s with code: ${code}`);
    
    if (code === 0) {
        console.log('[TEST] ✅ Success! Crawl4AI completed without timeout');
        console.log(`[TEST] Stdout length: ${stdout.length} chars`);
        if (stdout.length > 0) {
            console.log('[TEST] First 200 chars of output:');
            console.log(stdout.substring(0, 200) + '...');
        }
    } else {
        console.log('[TEST] ❌ Failed with error code:', code);
        if (stderr) {
            console.log('[TEST] Stderr:', stderr.substring(0, 500));
        }
    }
    
    process.exit(code);
});

crwlProcess.on('error', (error) => {
    clearTimeout(killTimer);
    console.error('[TEST] ❌ Process error:', error.message);
    process.exit(1);
});