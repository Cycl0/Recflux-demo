// Test the simple deployment approach
import 'dotenv/config';
import { deployToCodeSandbox } from './deploy-simple.js';

async function main() {
    const projectDir = process.argv[2] || '_template';
    console.log(`[TEST_SIMPLE] Testing simple deployment with: ${projectDir}`);
    
    try {
        const result = await deployToCodeSandbox(projectDir);
        console.log(`[TEST_SIMPLE] SUCCESS!`, result);
    } catch (error) {
        console.error(`[TEST_SIMPLE] FAILED:`, error.message);
        process.exit(1);
    }
}

main();