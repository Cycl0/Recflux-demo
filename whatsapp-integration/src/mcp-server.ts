import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

// Minimal MCP server exposing project_reset and CodeSandbox deployment only.

const server = new McpServer(
	{ name: 'recflux-deployer', version: '1.0.0' },
	{ capabilities: { tools: {} }, requestTimeoutMs: 600000 } as any
);

server.tool(
	'project_reset',
	{},
	async (_args: {}) => {
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
			return { content: [{ type: 'text', text: JSON.stringify({ ok: true, projectDir, templateDir }) }] } as const;
		} catch (e: any) {
			return { content: [{ type: 'text', text: `project_reset error: ${e?.message || e}. Template dir: ${templateDir}` }] } as const;
		}
	}
);

server.tool(
	'mcp__recflux__codesandbox_deploy',
	{
		description: 'Deploy the current project to CodeSandbox and return preview/editor URLs',
		inputSchema: {
			type: 'object',
			properties: {},
			required: []
		}
	},
	async (_args: {}) => {
		const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
		const stat = await fs.stat(root).catch(() => null);
		if (!stat || !stat.isDirectory()) {
			return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] } as const;
		}
		try {
			console.error(`[MCP_CODESANDBOX_DEPLOY] Creating sandbox from directory: ${root}`);

			// Collect files recursively (package.json as JSON, others as text)
			async function collect(dir: string, prefix = ''): Promise<Record<string, { content: any }>> {
				const out: Record<string, { content: any }> = {};
				const entries = await fs.readdir(dir, { withFileTypes: true });
				for (const ent of entries) {
					if (['node_modules', '.git', '.vercel', 'dist', 'build', '.next'].includes(ent.name)) continue;
					const abs = path.join(dir, ent.name);
					const rel = (prefix ? path.join(prefix, ent.name) : ent.name).replace(/\\/g, '/');
					if (ent.isDirectory()) {
						Object.assign(out, await collect(abs, rel));
					} else if (ent.isFile()) {
						try {
							if (ent.name === 'package.json') {
								const json = JSON.parse(await fs.readFile(abs, 'utf8'));
								out[rel] = { content: json };
							} else {
								out[rel] = { content: await fs.readFile(abs, 'utf8') };
							}
						} catch {}
					}
				}
				return out;
			}

			const files = await collect(root);
			if (!files['src/index.js'] && !files['src/index.jsx']) {
				files['src/index.js'] = { content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<App />);` };
			}
			if (!files['package.json']) {
				files['package.json'] = { content: { name: 'recflux-app', version: '1.0.0', main: 'src/index.js', scripts: { start: 'react-scripts start', build: 'react-scripts build' }, dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0', 'react-scripts': '5.0.1' } } };
			}

			const sandboxData = { files };
			const { data } = await axios.post('https://codesandbox.io/api/v1/sandboxes/define?json=1', sandboxData, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
			const sandboxId = (data && (data.sandbox_id || data.id)) as string;
			if (!sandboxId) throw new Error('CodeSandbox API did not return a sandbox id');
			const editorUrl = `https://codesandbox.io/s/${sandboxId}`;
			const previewUrl = `https://${sandboxId}.csb.app`;
			console.error(`[MCP_CODESANDBOX_DEPLOY] Sandbox created. editor=${editorUrl} preview=${previewUrl}`);
			return { content: [{ type: 'text', text: JSON.stringify({ editorUrl, previewUrl }) }] } as const;
		} catch (err: any) {
			const msg = err?.message || String(err);
			const status = err?.response?.status;
			const body = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
			console.error(`[MCP_CODESANDBOX_DEPLOY] Failed: status=${status} msg=${msg} body=${body}`);
			return { content: [{ type: 'text', text: `Instant deployment failed: ${msg}` }] } as const;
		}
	}
);

async function main(): Promise<void> {
	await server.connect(new StdioServerTransport());
}

void main();


