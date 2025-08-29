import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';

export async function deployToCodeSandbox(projectDir) {
    console.log(`[CODESANDBOX_DEPLOY] Starting deployment from ${projectDir}`);
    
    const allFiles = {};
    
    // Read package.json first
    try {
        const pkgPath = path.join(projectDir, 'package.json');
        const pkgContent = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        allFiles['package.json'] = { content: pkgContent };
        console.log(`[CODESANDBOX_DEPLOY] Read package.json`);
    } catch (error) {
        console.warn(`[CODESANDBOX_DEPLOY] Could not read package.json:`, error.message);
    }
    
    // Collect all src files recursively (this will include any components in subdirectories)
    async function collectSrcFiles(dir, prefix = 'src') {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                // Skip test files and config files
                if (entry.name.includes('.test.') || entry.name.includes('.spec.') || 
                    entry.name === 'setupTests.js') {
                    continue;
                }
                
                const fullPath = path.join(dir, entry.name);
                const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
                
                if (entry.isDirectory()) {
                    // Recursively read subdirectories
                    await collectSrcFiles(fullPath, relativePath);
                } else if (entry.isFile()) {
                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        allFiles[relativePath] = { content };
                        console.log(`[CODESANDBOX_DEPLOY] Read ${relativePath}`);
                    } catch (readError) {
                        console.warn(`[CODESANDBOX_DEPLOY] Could not read ${relativePath}:`, readError.message);
                    }
                }
            }
        } catch (dirError) {
            console.warn(`[CODESANDBOX_DEPLOY] Could not read src directory:`, dirError.message);
        }
    }
    
    // Collect src files
    await collectSrcFiles(path.join(projectDir, 'src'));
    
    // Add essential public files
    const essentialPublicFiles = ['public/index.html'];
    for (const file of essentialPublicFiles) {
        try {
            const filePath = path.join(projectDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            allFiles[file] = { content };
            console.log(`[CODESANDBOX_DEPLOY] Read ${file}`);
        } catch (readError) {
            console.warn(`[CODESANDBOX_DEPLOY] Could not read ${file}:`, readError.message);
        }
    }
    
    console.log(`[CODESANDBOX_DEPLOY] Collected ${Object.keys(allFiles).length} files`);
    console.log(`[CODESANDBOX_DEPLOY] Files:`, Object.keys(allFiles).join(', '));
    
    // Create the sandbox using essential project files only
    const sandboxData = {
        files: allFiles
    };
    
    console.log('[CODESANDBOX_DEPLOY] Creating sandbox...');
    
    try {
        console.log('[CODESANDBOX_DEPLOY] Sending sandbox data with', Object.keys(sandboxData.files).length, 'files');
        
        // Use POST with JSON body per CodeSandbox define API
        const response = await axios.post(
            'https://codesandbox.io/api/v1/sandboxes/define?json=1',
            sandboxData,
            {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' },
            }
        );
        
        console.log('[CODESANDBOX_DEPLOY] Response status:', response.status);
        console.log('[CODESANDBOX_DEPLOY] Response data:', response.data);
        
        let sandboxId = '';
        if (response.data && typeof response.data === 'object') {
            sandboxId = response.data.sandbox_id || response.data.id || '';
        }
        
        if (!sandboxId) {
            throw new Error('CodeSandbox API did not return a valid sandbox ID');
        }
        
        const editorUrl = `https://codesandbox.io/s/${sandboxId}`;
        const previewUrl = `https://${sandboxId}.csb.app`;
        
        console.log('[CODESANDBOX_DEPLOY] Sandbox created! ID:', sandboxId);
        console.log('[CODESANDBOX_DEPLOY] Editor URL:', editorUrl);
        console.log('[CODESANDBOX_DEPLOY] Preview URL:', previewUrl);
        
        return { 
            deploymentUrl: editorUrl,
            previewUrl: previewUrl,
            editorUrl: editorUrl 
        };
    } catch (error) {
        const status = error?.response?.status;
        const dataPreview = error?.response?.data ? (typeof error.response.data === 'string' ? error.response.data.slice(0, 400) : JSON.stringify(error.response.data).slice(0, 400)) : '';
        console.error('[CODESANDBOX_DEPLOY] Failed to create sandbox. status=', status, 'message=', error?.message);
        if (dataPreview) console.error('[CODESANDBOX_DEPLOY] error body=', dataPreview);
        throw new Error(`CodeSandbox deployment failed: ${error.message}`);
    }
}