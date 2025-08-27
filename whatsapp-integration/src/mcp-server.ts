import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Minimal MCP server exposing ONLY a Vercel deployment tool.

const VERCEL_TOKEN = process.env.VERCEL_TOKEN as string | undefined;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID as string | undefined;
const VERCEL_TEAM_ID = (process.env.VERCEL_TEAM_ID || VERCEL_ORG_ID) as string | undefined;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID as string | undefined;
const VERCEL_PROJECT_NAME = process.env.VERCEL_PROJECT_NAME as string | undefined;

type LocalFile = { file: string; data: Buffer; sha: string; size: number };

async function collectFilesFromDir(root: string): Promise<LocalFile[]> {
	async function walk(dir: string, prefix = ''): Promise<LocalFile[]> {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		const files: LocalFile[] = [];
		for (const ent of entries) {
			if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.vercel') continue;
			const abs = path.join(dir, ent.name);
			const rel = path.join(prefix, ent.name).replace(/\\/g, '/');
			if (ent.isDirectory()) {
				files.push(...(await walk(abs, rel)));
			} else {
				const data = await fs.readFile(abs);
				const sha = crypto.createHash('sha1').update(data).digest('hex');
				files.push({ file: rel, data, sha, size: data.length });
			}
		}
		return files;
	}
	return walk(root);
}

async function uploadMissingFilesToVercel(files: LocalFile[], teamId?: string): Promise<void> {
	if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN not set');
	const base = 'https://api.vercel.com';
	for (const f of files) {
		try {
			await axios.head(`${base}/v2/files/${f.sha}`, {
				params: teamId ? { teamId } : undefined,
				headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
			});
		} catch {
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

async function createVercelDeployment(files: LocalFile[], opts: { teamId?: string; projectId?: string; projectName?: string }): Promise<string> {
	if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN not set');
	const base = 'https://api.vercel.com';
	const teamId = opts.teamId;
	await uploadMissingFilesToVercel(files, teamId);
	const filesSpec = files.map(f => ({ file: f.file, sha: f.sha, size: f.size }));
	const body: any = {
		name: opts.projectName || VERCEL_PROJECT_NAME || 'temp-deploy',
		files: filesSpec,
		target: 'production'
	};
	if (opts.projectId || VERCEL_PROJECT_ID) body.projectId = opts.projectId || VERCEL_PROJECT_ID;
	const { data } = await axios.post(`${base}/v13/deployments`, body, {
		params: teamId ? { teamId } : undefined,
		headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
		timeout: 600000
	});
	const deploymentId = data?.id as string;
	if (!deploymentId) throw new Error('Failed to create Vercel deployment');
	const started = Date.now();
	while (Date.now() - started < 600000) {
		const { data: d } = await axios.get(`${base}/v13/deployments/${deploymentId}`, {
			params: teamId ? { teamId } : undefined,
			headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
		});
		const state = d?.readyState || d?.state;
		const url = d?.url;
		if (state === 'READY' && url) return `https://${url}`;
		if (state === 'ERROR' || state === 'CANCELED') throw new Error(`Vercel deployment failed: ${state}`);
		await new Promise(r => setTimeout(r, 3000));
	}
	throw new Error('Timed out waiting for Vercel deployment');
}

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
	'vercel_deploy',
	{},
	async (_args: {}) => {
		const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
		const stat = await fs.stat(root).catch(() => null);
		if (!stat || !stat.isDirectory()) {
			return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] } as const;
		}
		if (!VERCEL_TOKEN) {
			return { content: [{ type: 'text', text: 'VERCEL_TOKEN not set' }] } as const;
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
			return { content: [{ type: 'text', text: JSON.stringify({ deploymentUrl: url }) }] } as const;
		} catch (err: any) {
			const msg = err?.message || String(err);
			console.error(`[VERCEL_DEPLOY] Deployment failed: ${msg}`);
			return { content: [{ type: 'text', text: `deploy error: ${msg}` }] } as const;
		}
	}
);

server.tool(
	'mcp__recflux__vercel_deploy',
	{
		description: 'Deploy the current project to Vercel and return the deployment URL',
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
		if (!VERCEL_TOKEN) {
			return { content: [{ type: 'text', text: 'VERCEL_TOKEN not set' }] } as const;
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
			return { content: [{ type: 'text', text: `Deployment successful! Site published at: ${url}` }] } as const;
		} catch (err: any) {
			const msg = err?.message || String(err);
			console.error(`[MCP_VERCEL_DEPLOY] Deployment failed: ${msg}`);
			return { content: [{ type: 'text', text: `Deployment failed: ${msg}` }] } as const;
		}
	}
);

async function main(): Promise<void> {
	await server.connect(new StdioServerTransport());
}

void main();


