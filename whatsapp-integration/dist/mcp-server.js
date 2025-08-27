import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
// Minimal MCP server exposing ONLY a Vercel deployment tool.
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID;
const VERCEL_TEAM_ID = (process.env.VERCEL_TEAM_ID || VERCEL_ORG_ID);
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_PROJECT_NAME = process.env.VERCEL_PROJECT_NAME;
async function collectFilesFromDir(root) {
    async function walk(dir, prefix = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = [];
        for (const ent of entries) {
            if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.vercel')
                continue;
            const abs = path.join(dir, ent.name);
            const rel = path.join(prefix, ent.name).replace(/\\/g, '/');
            if (ent.isDirectory()) {
                files.push(...(await walk(abs, rel)));
            }
            else {
                const data = await fs.readFile(abs);
                const sha = crypto.createHash('sha1').update(data).digest('hex');
                files.push({ file: rel, data, sha, size: data.length });
            }
        }
        return files;
    }
    return walk(root);
}
async function uploadMissingFilesToVercel(files, teamId) {
    if (!VERCEL_TOKEN)
        throw new Error('VERCEL_TOKEN not set');
    const base = 'https://api.vercel.com';
    for (const f of files) {
        try {
            await axios.head(`${base}/v2/files/${f.sha}`, {
                params: teamId ? { teamId } : undefined,
                headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
            });
        }
        catch {
            await axios.post(`${base}/v2/files`, f.data, {
                params: teamId ? { teamId } : undefined,
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                    'Content-Type': 'application/octet-stream',
                    'x-vercel-digest': f.sha,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 600000
            });
        }
    }
}
async function createVercelDeployment(files, opts) {
    if (!VERCEL_TOKEN)
        throw new Error('VERCEL_TOKEN not set');
    const base = 'https://api.vercel.com';
    const teamId = opts.teamId;
    await uploadMissingFilesToVercel(files, teamId);
    const filesSpec = files.map(f => ({ file: f.file, sha: f.sha, size: f.size }));
    const body = {
        name: opts.projectName || VERCEL_PROJECT_NAME || 'temp-deploy',
        files: filesSpec,
        target: 'production'
    };
    if (opts.projectId || VERCEL_PROJECT_ID)
        body.projectId = opts.projectId || VERCEL_PROJECT_ID;
    const { data } = await axios.post(`${base}/v13/deployments`, body, {
        params: teamId ? { teamId } : undefined,
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        timeout: 600000
    });
    const deploymentId = data?.id;
    if (!deploymentId)
        throw new Error('Failed to create Vercel deployment');
    const started = Date.now();
    while (Date.now() - started < 600000) {
        const { data: d } = await axios.get(`${base}/v13/deployments/${deploymentId}`, {
            params: teamId ? { teamId } : undefined,
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        });
        const state = d?.readyState || d?.state;
        const url = d?.url;
        if (state === 'READY' && url)
            return `https://${url}`;
        if (state === 'ERROR' || state === 'CANCELED')
            throw new Error(`Vercel deployment failed: ${state}`);
        await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error('Timed out waiting for Vercel deployment');
}
const server = new McpServer({ name: 'recflux-deployer', version: '1.0.0' }, { capabilities: { tools: {} }, requestTimeoutMs: 600000 });
server.tool('project_reset', {}, async (_args) => {
    const projectDir = process.env.CLONED_TEMPLATE_DIR || process.cwd();
    // Find the template directory - it could be in different locations depending on context
    let templateDir = path.resolve(process.cwd(), '../code-deploy-service/template');
    // If template not found, try other locations
    if (!await fs.stat(templateDir).catch(() => null)) {
        templateDir = path.resolve(__dirname, '../../code-deploy-service/template');
    }
    if (!await fs.stat(templateDir).catch(() => null)) {
        templateDir = path.resolve(__dirname, '../../../code-deploy-service/template');
    }
    try {
        // Don't delete the entire project dir, just reset key files
        const templateStat = await fs.stat(templateDir);
        if (!templateStat.isDirectory()) {
            throw new Error(`Template directory not found: ${templateDir}`);
        }
        // Copy template files to project directory
        await fs.cp(templateDir, projectDir, { recursive: true, force: true });
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true, projectDir, templateDir }) }] };
    }
    catch (e) {
        return { content: [{ type: 'text', text: `project_reset error: ${e?.message || e}. Template dir: ${templateDir}` }] };
    }
});
server.tool('vercel_deploy', {}, async (_args) => {
    const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
    const stat = await fs.stat(root).catch(() => null);
    if (!stat || !stat.isDirectory()) {
        return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] };
    }
    if (!VERCEL_TOKEN) {
        return { content: [{ type: 'text', text: 'VERCEL_TOKEN not set' }] };
    }
    try {
        console.error(`[VERCEL_DEPLOY] Deploying from directory: ${root}`);
        const files = await collectFilesFromDir(root);
        console.error(`[VERCEL_DEPLOY] Found ${files.length} files to deploy`);
        const url = await createVercelDeployment(files, {
            teamId: VERCEL_TEAM_ID,
            projectId: VERCEL_PROJECT_ID,
            projectName: VERCEL_PROJECT_NAME
        });
        console.error(`[VERCEL_DEPLOY] Deployment successful: ${url}`);
        return { content: [{ type: 'text', text: JSON.stringify({ deploymentUrl: url }) }] };
    }
    catch (err) {
        const msg = err?.message || String(err);
        console.error(`[VERCEL_DEPLOY] Deployment failed: ${msg}`);
        return { content: [{ type: 'text', text: `deploy error: ${msg}` }] };
    }
});
server.tool('mcp__recflux__vercel_deploy', {
    description: 'Deploy the current project to Vercel and return the deployment URL',
    inputSchema: {
        type: 'object',
        properties: {},
        required: []
    }
}, async (_args) => {
    const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
    const stat = await fs.stat(root).catch(() => null);
    if (!stat || !stat.isDirectory()) {
        return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] };
    }
    if (!VERCEL_TOKEN) {
        return { content: [{ type: 'text', text: 'VERCEL_TOKEN not set' }] };
    }
    try {
        console.error(`[MCP_VERCEL_DEPLOY] Deploying from directory: ${root}`);
        const files = await collectFilesFromDir(root);
        console.error(`[MCP_VERCEL_DEPLOY] Found ${files.length} files to deploy`);
        const url = await createVercelDeployment(files, {
            teamId: VERCEL_TEAM_ID,
            projectId: VERCEL_PROJECT_ID,
            projectName: VERCEL_PROJECT_NAME
        });
        console.error(`[MCP_VERCEL_DEPLOY] Deployment successful: ${url}`);
        return { content: [{ type: 'text', text: `Deployment successful! Site published at: ${url}` }] };
    }
    catch (err) {
        const msg = err?.message || String(err);
        console.error(`[MCP_VERCEL_DEPLOY] Deployment failed: ${msg}`);
        return { content: [{ type: 'text', text: `Deployment failed: ${msg}` }] };
    }
});
server.tool('mcp__recflux__codesandbox_deploy', {
    description: 'Deploy the current project to CodeSandbox instantly and return the sandbox URL',
    inputSchema: {
        type: 'object',
        properties: {},
        required: []
    }
}, async (_args) => {
    const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
    const stat = await fs.stat(root).catch(() => null);
    if (!stat || !stat.isDirectory()) {
        return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] };
    }
    try {
        console.error(`[MCP_CODESANDBOX_DEPLOY] Creating instant sandbox from directory: ${root}`);
        // Read the project files
        const srcAppPath = path.join(root, 'src', 'App.jsx');
        const srcCssPath = path.join(root, 'src', 'index.css');
        const packageJsonPath = path.join(root, 'package.json');
        let appCode = '';
        let cssCode = '';
        let packageJson = '';
        try {
            appCode = await fs.readFile(srcAppPath, 'utf8');
        }
        catch (e) {
            appCode = `import React from 'react';
import './index.css';

function App() {
  return (
    <div className="App">
      <h1>Hello World</h1>
    </div>
  );
}

export default App;`;
        }
        try {
            cssCode = await fs.readFile(srcCssPath, 'utf8');
        }
        catch (e) {
            cssCode = `body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }`;
        }
        try {
            packageJson = await fs.readFile(packageJsonPath, 'utf8');
        }
        catch (e) {
            packageJson = {
                "name": "recflux-generated-app",
                "version": "1.0.0",
                "main": "src/index.js",
                "dependencies": {
                    "react": "^18.0.0",
                    "react-dom": "^18.0.0",
                    "react-scripts": "5.0.1"
                },
                "scripts": {
                    "start": "react-scripts start",
                    "build": "react-scripts build"
                }
            };
        }
        // Parse package.json if it's a string
        let pkgContent = packageJson;
        if (typeof packageJson === 'string') {
            try {
                pkgContent = JSON.parse(packageJson);
            }
            catch (e) {
                console.warn('[MCP_CODESANDBOX_DEPLOY] Failed to parse package.json, using as string');
                pkgContent = packageJson;
            }
        }
        // Create the sandbox using CodeSandbox API
        const axios = require('axios');
        const sandboxData = {
            files: {
                "package.json": { content: pkgContent },
                "src/index.js": {
                    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
                },
                "src/App.jsx": { content: appCode },
                "src/index.css": { content: cssCode }
            }
        };
        // Use GET request with encoded parameters - more reliable than POST
        const parametersString = JSON.stringify(sandboxData);
        const encodedParameters = encodeURIComponent(parametersString);
        // Use GET request which returns JSON response with sandbox ID
        const response = await axios.get(`https://codesandbox.io/api/v1/sandboxes/define?parameters=${encodedParameters}&json=1`, {
            timeout: 10000,
            maxRedirects: 0,
            validateStatus: (status) => status < 400 || status === 302
        });
        console.error(`[MCP_CODESANDBOX_DEPLOY] Response status:`, response.status);
        console.error(`[MCP_CODESANDBOX_DEPLOY] Response data:`, response.data);
        // Check if we got JSON response with sandbox ID
        let sandboxId = '';
        if (response.data && typeof response.data === 'object') {
            sandboxId = response.data.sandbox_id || response.data.id;
        }
        if (!sandboxId) {
            console.error('[MCP_CODESANDBOX_DEPLOY] No sandbox ID found in JSON response');
            throw new Error('CodeSandbox API did not return a valid sandbox ID');
        }
        const url = `https://codesandbox.io/s/${sandboxId}`;
        console.error(`[MCP_CODESANDBOX_DEPLOY] Sandbox created instantly! URL: ${url}`);
        return { content: [{ type: 'text', text: `Instant deployment successful! Site published at: ${url}` }] };
    }
    catch (err) {
        const msg = err?.message || String(err);
        console.error(`[MCP_CODESANDBOX_DEPLOY] Deployment failed: ${msg}`);
        return { content: [{ type: 'text', text: `Instant deployment failed: ${msg}` }] };
    }
});
async function main() {
    await server.connect(new StdioServerTransport());
}
void main();
