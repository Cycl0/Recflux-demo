// Build then deploy static site to Netlify via API
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { createHash } from 'crypto';

interface NetlifyDeployResponse {
    id: string;
    url: string;
    deploy_url: string;
    admin_url: string;
    required?: string[];
    state?: string;
}

interface NetlifySiteResponse {
    id: string;
    url: string;
    deploy_url: string;
    admin_url: string;
}

export async function deployToNetlify(projectDir: string): Promise<{ deploymentUrl: string; previewUrl: string; adminUrl: string }> {
    console.log('🚀 Building and deploying static site...');
    
    // Step 1: Build the Next.js project locally
    await buildProject(projectDir);
    
    // Step 2: Deploy the built files via Netlify API
    return await deployViaAPI(projectDir);
}

function buildProject(projectDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('🔨 Building Next.js project...');
        
        const buildProcess = spawn('npm', ['run', 'build'], {
            cwd: projectDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        let stdout = '';
        let stderr = '';

        buildProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            console.log(output);
        });

        buildProcess.stderr?.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            console.error(output);
        });

        buildProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Build completed successfully!');
                resolve();
            } else {
                console.error('❌ Build failed with code:', code);
                reject(new Error(`Build failed with exit code ${code}`));
            }
        });

        buildProcess.on('error', (error) => {
            console.error('❌ Failed to start build process:', error);
            reject(error);
        });
    });
}

async function deployViaAPI(projectDir: string): Promise<{ deploymentUrl: string; previewUrl: string; adminUrl: string }> {
    console.log('🌐 Deploying via Netlify API...');
    
    const outDir = path.join(projectDir, 'out');
    const NETLIFY_API_KEY = process.env.NETLIFY_API_KEY;
    const netlifyApiBase = 'https://api.netlify.com/api/v1';
    const headers = {
        'Authorization': `Bearer ${NETLIFY_API_KEY}`,
        'Content-Type': 'application/json'
    };
    
    const allFiles: Record<string, string> = {};
    const fileHashes: Record<string, string> = {};
    
    function generateSHA1(content: string | Buffer): string {
        return createHash('sha1').update(content).digest('hex');
    }
    
    // Recursively collect all files from out directory
    async function collectFiles(dir: string, prefix = ''): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
            
            if (entry.isDirectory()) {
                await collectFiles(fullPath, relativePath);
            } else if (entry.isFile()) {
                try {
                    const content = await fs.readFile(fullPath, 'utf8');
                    allFiles[relativePath] = content;
                    fileHashes[`/${relativePath}`] = generateSHA1(content);
                    console.log(`📄 Read: ${relativePath}`);
                } catch (error) {
                    // For binary files, try reading as buffer
                    try {
                        const buffer = await fs.readFile(fullPath);
                        const content = buffer.toString('base64');
                        allFiles[`${relativePath}::binary`] = content;
                        fileHashes[`/${relativePath}`] = generateSHA1(buffer);
                        console.log(`📁 Read binary: ${relativePath}`);
                    } catch (binaryError: any) {
                        console.warn(`⚠️ Could not read ${relativePath}:`, binaryError.message);
                    }
                }
            }
        }
    }
    
    try {
        // Check if out directory exists
        try {
            await fs.access(outDir);
        } catch {
            throw new Error('Out directory not found. Build may have failed.');
        }
        
        // Collect files from out directory
        console.log(`📂 Collecting files from: ${outDir}`);
        await collectFiles(outDir);
        
        console.log(`✅ Collected ${Object.keys(allFiles).length} files`);
        
        // Show what we collected
        console.log('📋 Files collected:');
        Object.keys(allFiles).forEach(file => {
            if (!file.includes('::binary')) {
                console.log(`   - ${file}`);
            }
        });
        
        // Create site
        console.log('🌐 Creating Netlify site...');
        const siteResponse = await axios.post<NetlifySiteResponse>(
            `${netlifyApiBase}/sites`,
            {},
            { headers, timeout: 30000 }
        );
        
        const siteId = siteResponse.data.id;
        console.log(`✅ Created site: ${siteId}`);
        
        // Create deploy
        console.log('🚀 Creating deployment...');
        const deployResponse = await axios.post<NetlifyDeployResponse>(
            `${netlifyApiBase}/sites/${siteId}/deploys`,
            { files: fileHashes },
            { headers, timeout: 30000 }
        );
        
        const deployId = deployResponse.data.id;
        const requiredFiles = deployResponse.data.required || [];
        console.log(`✅ Deploy created: ${deployId}`);
        console.log(`📤 Need to upload ${requiredFiles.length} files`);
        
        // Upload required files
        for (const sha of requiredFiles) {
            const filePath = Object.entries(fileHashes).find(([, hash]) => hash === sha)?.[0];
            if (filePath && allFiles[filePath.substring(1)]) {
                const fileContent = allFiles[filePath.substring(1)];
                console.log(`📤 Uploading ${filePath}...`);
                
                await axios.put(
                    `${netlifyApiBase}/deploys/${deployId}/files${filePath}`,
                    fileContent.includes('::binary') ? 
                        Buffer.from(allFiles[filePath.substring(1).replace('::binary', '')], 'base64') : 
                        fileContent,
                    {
                        headers: {
                            'Authorization': `Bearer ${NETLIFY_API_KEY}`,
                            'Content-Type': 'application/octet-stream'
                        },
                        timeout: 60000
                    }
                );
            }
        }
        
        // Wait for completion
        console.log('⏳ Waiting for deployment...');
        let attempts = 0;
        while (attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const statusResponse = await axios.get<NetlifyDeployResponse>(
                `${netlifyApiBase}/sites/${siteId}/deploys/${deployId}`,
                { headers, timeout: 10000 }
            );
            
            const state = statusResponse.data.state;
            console.log(`📊 Deploy state: ${state}`);
            
            if (state === 'ready') {
                const siteUrl = statusResponse.data.url || siteResponse.data.url;
                const deployUrl = statusResponse.data.deploy_url;
                const adminUrl = statusResponse.data.admin_url || siteResponse.data.admin_url;
                
                console.log('✅ 🎉 DEPLOYMENT SUCCESSFUL! 🎉');
                console.log(`🌐 Site URL: ${siteUrl}`);
                console.log(`🔗 Deploy URL: ${deployUrl}`);
                console.log(`⚙️ Admin URL: ${adminUrl}`);
                
                return {
                    deploymentUrl: siteUrl,
                    previewUrl: deployUrl || siteUrl,
                    adminUrl: adminUrl
                };
            } else if (state === 'error') {
                throw new Error('Deploy failed with error state');
            }
            
            attempts++;
        }
        
        // Return URL even if timed out
        const siteUrl = siteResponse.data.url;
        const adminUrl = siteResponse.data.admin_url;
        console.log('⚠️ Deploy may have timed out, but returning URL');
        
        return {
            deploymentUrl: siteUrl,
            previewUrl: siteUrl,
            adminUrl: adminUrl
        };
        
    } catch (error: any) {
        console.error('❌ API deployment failed:', error.message);
        throw error;
    }
}