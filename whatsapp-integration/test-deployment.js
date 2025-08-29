// Test script to isolate the deployment function and debug the issue
import 'dotenv/config';
import { deployToCodeSandbox } from './deploy-codesandbox.js';


// Test with the _template directory
async function main() {
	const projectDir = process.argv[2] || '_template';
	console.log(`[TEST_DEPLOY] Testing deployment with project dir: ${projectDir}`);
	
	try {
		const result = await deployToCodeSandbox(projectDir);
		console.log(`[TEST_DEPLOY] SUCCESS! Result:`, result);
	} catch (error) {
		console.error(`[TEST_DEPLOY] FAILED:`, error.message);
		process.exit(1);
	}
}

main();