import { deployToCodeSandbox } from './deploy-minimal.js';

async function main() {
    try {
        const result = await deployToCodeSandbox('template');
        console.log('SUCCESS:', result);
    } catch (error) {
        console.error('FAILED:', error.message);
    }
}

main();