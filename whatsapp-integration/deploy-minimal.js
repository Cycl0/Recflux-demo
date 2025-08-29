import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';

export async function deployToCodeSandbox(projectDir) {
    console.log(`[MINIMAL_DEPLOY] Starting deployment from ${projectDir}`);
    
    // Simple file collection - only essential files
    const files = {};
    
    try {
        // Read package.json but keep only essential parts
        const pkgPath = path.join(projectDir, 'package.json');
        const pkgContent = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        
        files['package.json'] = {
            content: {
                name: pkgContent.name,
                version: pkgContent.version || "1.0.0",
                dependencies: pkgContent.dependencies || {},
                scripts: pkgContent.scripts || {}
            }
        };
        
        // Read public/index.html
        const indexHtmlPath = path.join(projectDir, 'public/index.html');
        files['public/index.html'] = { content: await fs.readFile(indexHtmlPath, 'utf8') };
        
        // Read src files
        const srcFiles = ['src/index.js', 'src/App.js', 'src/App.css', 'src/index.css'];
        for (const file of srcFiles) {
            try {
                const filePath = path.join(projectDir, file);
                files[file] = { content: await fs.readFile(filePath, 'utf8') };
            } catch (error) {
                console.warn(`[MINIMAL_DEPLOY] Could not read ${file}:`, error.message);
            }
        }
        
        // Try to read logo
        try {
            const logoPath = path.join(projectDir, 'src/logo.svg');
            files['src/logo.svg'] = { content: await fs.readFile(logoPath, 'utf8') };
        } catch (error) {
            console.warn(`[MINIMAL_DEPLOY] Could not read logo.svg`);
        }
        
    } catch (error) {
        throw new Error(`Failed to read project files: ${error.message}`);
    }
    
    console.log(`[MINIMAL_DEPLOY] Collected ${Object.keys(files).length} files:`, Object.keys(files).join(', '));
    
    // Create sandbox
    try {
        const response = await axios.post(
            'https://codesandbox.io/api/v1/sandboxes/define?json=1',
            { files },
            {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' },
            }
        );
        
        const sandboxId = response.data.sandbox_id || response.data.id;
        if (!sandboxId) {
            throw new Error('No sandbox ID returned');
        }
        
        const editorUrl = `https://codesandbox.io/s/${sandboxId}`;
        const previewUrl = `https://${sandboxId}.csb.app`;
        
        console.log('[MINIMAL_DEPLOY] Success! Editor:', editorUrl);
        console.log('[MINIMAL_DEPLOY] Preview:', previewUrl);
        
        return { deploymentUrl: editorUrl, previewUrl, editorUrl };
    } catch (error) {
        const status = error?.response?.status;
        const data = error?.response?.data;
        console.error('[MINIMAL_DEPLOY] Failed:', { status, data, message: error.message });
        throw error;
    }
}