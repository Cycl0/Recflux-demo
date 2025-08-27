import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import FormData from 'form-data';
import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { configureAuth, getUserByWhatsApp } from './auth.js';
import { createClient } from '@supabase/supabase-js';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory idempotency cache for WhatsApp message IDs
const processedMessageIds: Map<string, number> = new Map();
const SEEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function pruneProcessed(): void {
    const now = Date.now();
    for (const [id, ts] of processedMessageIds.entries()) {
        if (now - ts > SEEN_TTL_MS) processedMessageIds.delete(id);
    }
}

function shouldProcessMessage(uniqueId: string): boolean {
    pruneProcessed();
    if (processedMessageIds.has(uniqueId)) return false;
    processedMessageIds.set(uniqueId, Date.now());
    return true;
}

function getSupabaseForIdempotency() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    if (!url) return null;
    if (serviceKey) return createClient(url, serviceKey);
    if (anonKey) return createClient(url, anonKey);
    return null;
}

async function ensureFirstProcessDistributed(uniqueId: string): Promise<boolean> {
    const supabase = getSupabaseForIdempotency();
    if (!supabase) return shouldProcessMessage(uniqueId);
    try {
        const { error } = await supabase
            .from('processed_messages')
            .insert({ id: uniqueId })
            .single();
        if (error) {
            const code = (error as any)?.code || '';
            if (code === '23505') return false;
            console.warn('[IDEMPOTENCY] Supabase insert failed, using in-memory fallback:', error.message || error);
            return shouldProcessMessage(uniqueId);
        }
        return true;
    } catch (e: any) {
        console.warn('[IDEMPOTENCY] Supabase error, using in-memory fallback:', e?.message || e);
        return shouldProcessMessage(uniqueId);
    }
}

const {
	WHATSAPP_TOKEN,
	WHATSAPP_PHONE_NUMBER_ID,
	WHATSAPP_VERIFY_TOKEN,
	PUBLIC_BASE_URL
} = process.env as Record<string, string | undefined>;

const VERCEL_TOKEN = process.env.VERCEL_TOKEN as string | undefined;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID as string | undefined;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID as string | undefined;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID as string | undefined;
const VERCEL_PROJECT_NAME = process.env.VERCEL_PROJECT_NAME as string | undefined;
const DEFAULT_CLAUDE_BIN = process.platform === 'win32' ? 'claude.ps1' : 'claude';
const CLAUDE_BIN = (process.env.CLAUDE_BIN || process.env.CLAUDE_PATH || DEFAULT_CLAUDE_BIN) as string;

function runClaudeCLIInDir(cwd: string, userPrompt: string, systemAppend: string): Promise<string> {
	return new Promise((resolve, reject) => {
		// Create temporary MCP config file
		const timestamp = Date.now();
		const mcpConfigPath = path.join(os.tmpdir(), `servers.recflux.${timestamp}.json`);
		
		// Resolve absolute project directory and prepare prompts
		const absProjectDir = path.resolve(cwd);
		const userArg = userPrompt;
		const systemArg = systemAppend.replace(/"/g, '\'');
		
		// Build MCP config with absolute path to the MCP server
		// When running from compiled JS in dist/, __dirname is dist/, so we need './mcp-server.js'
		// When running from source, __dirname is src/, so we need 'dist/mcp-server.js'
		const mcpServerPath = path.resolve(__dirname, __dirname.endsWith('dist') ? './mcp-server.js' : 'dist/mcp-server.js').replace(/\\/g, '/');
		const mcpConfig = {
			mcpServers: {
				recflux: {
					command: process.execPath,
					args: [mcpServerPath],
					env: {
						VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
						VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || '',
						VERCEL_ORG_ID: process.env.VERCEL_ORG_ID || '',
						VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || '',
						VERCEL_PROJECT_NAME: process.env.VERCEL_PROJECT_NAME || '',
						CLONED_TEMPLATE_DIR: absProjectDir
					}
				}
			}
		};
		try { fsSync.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf8'); } catch (e: any) {
			return reject(new Error(`Failed to write MCP config: ${e.message}`));
		}
		
		// Non-interactive, strict MCP, expanded tools, and explicit directory access
		const baseArgs = [
			'--print',
			'--append-system-prompt', systemArg,
			'--permission-mode', 'acceptEdits',
			'--dangerously-skip-permissions',
			'--strict-mcp-config',
			'--output-format', 'text',
			'--add-dir', absProjectDir,
			'--mcp-config', mcpConfigPath,
			'--allowedTools', 'Read,Write,Edit,MultiEdit,Glob,LS,Grep,mcp__recflux__project_reset,mcp__recflux__codesandbox_deploy'
			// User prompt will be provided via stdin instead of as argument
		];
		let cmd = CLAUDE_BIN;
		let args = baseArgs.slice();
		let useShell = false;
		
		if (process.platform === 'win32') {
			if (/\.ps1$/i.test(cmd)) {
				// Resolve the full path for PowerShell scripts
				let ps1Path = cmd;
				if (!path.isAbsolute(cmd)) {
					try {
						const result = execSync(`powershell.exe -NoProfile -Command "Get-Command ${cmd} | Select-Object -ExpandProperty Source"`, { encoding: 'utf8' });
						ps1Path = result.trim();
						console.log('[CLAUDE] Resolved PowerShell path:', ps1Path);
					} catch (e) {
						console.warn('[CLAUDE] Could not resolve PowerShell script path, using original:', cmd);
					}
				}
				args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path, ...baseArgs];
				cmd = 'powershell.exe';
			} else if (/\.(cmd|bat)$/i.test(cmd) || !/\.[a-z0-9]+$/i.test(cmd)) {
				// For bare commands like 'claude', try to resolve to claude.ps1 first
				if (cmd === 'claude') {
					try {
						const result = execSync(`powershell.exe -NoProfile -Command "Get-Command claude.ps1 | Select-Object -ExpandProperty Source"`, { encoding: 'utf8' });
						const ps1Path = result.trim();
						args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path, ...baseArgs];
						cmd = 'powershell.exe';
						console.log('[CLAUDE] Resolved claude to PowerShell script:', ps1Path);
					} catch (e) {
						console.warn('[CLAUDE] Could not resolve claude to PowerShell script, using shell execution');
						useShell = true;
					}
				} else {
					useShell = true;
				}
			}
		}
		
		console.log('[CLAUDE] starting', { cwd: absProjectDir, cmd, mcpConfigPath, mcpServerPath });
		console.log('[CLAUDE] Full command args:', args.slice(0, 16), '...(truncated)');
		console.log('[CLAUDE] Environment check:', {
			VERCEL_TOKEN: !!process.env.VERCEL_TOKEN,
			CLONED_TEMPLATE_DIR: absProjectDir,
			mcpServerExists: fsSync.existsSync(mcpServerPath)
		});
		console.log('[CLAUDE] MCP config file contents preview:');
		try {
			const configContent = fsSync.readFileSync(mcpConfigPath, 'utf8');
			console.log(configContent.substring(0, 300) + '...');
		} catch (e) {
			console.log('[CLAUDE] Could not read MCP config file');
		}
		
		const child = spawn(cmd, args, { 
			cwd: absProjectDir, 
			stdio: ['pipe', 'pipe', 'pipe'], 
			shell: useShell, 
			env: { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0', CLONED_TEMPLATE_DIR: absProjectDir } 
		});
		
		// Write the prompt to stdin and close it
		if (child.stdin) {
			child.stdin.write(userArg);
			child.stdin.end();
		}
		
		let stderr = '';
		let stdout = '';
		const killTimer = setTimeout(() => {
			console.log('[CLAUDE] Timeout reached after 5 minutes, letting process continue');
			cleanup();
			reject(new Error('Claude CLI timed out after 5 minutes'));
		}, 300000);
		
		// Add a shorter timeout for debugging
		const debugTimer = setTimeout(() => {
			console.log('[CLAUDE] No output after 60 seconds, process may still be working');
			console.log('[CLAUDE] Process PID:', child.pid);
			console.log('[CLAUDE] Process killed:', child.killed);
		}, 60000);
		
		const cleanup = () => {
			clearTimeout(debugTimer);
			try { fsSync.unlinkSync(mcpConfigPath); } catch {}
		};
		
		child.stdout.on('data', (d) => {
			const t = d.toString(); 
			stdout += t;
			const snip = t.length > 400 ? t.slice(0, 400) + '…' : t;
			if (snip.trim().length) console.log('[CLAUDE][stdout]', snip);
		});
		
		child.stderr.on('data', (d) => {
			const t = d.toString(); 
			stderr += t;
			const snip = t.length > 400 ? t.slice(0, 400) + '…' : t;
			if (snip.trim().length) console.warn('[CLAUDE][stderr]', snip);
		});
		
		child.on('error', (err: any) => {
			clearTimeout(killTimer);
			cleanup();
			if (err && (err.code === 'ENOENT' || err.errno === -4058)) {
				return reject(new Error(`Claude CLI not found (spawn ${cmd}). On Windows, set CLAUDE_BIN to full path of claude.cmd or ensure its folder is on PATH. Docs: https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-headless`));
			}
			console.error('[CLAUDE] Process error:', err);
			reject(err);
		});
		
		child.on('close', (code) => {
			clearTimeout(killTimer);
			clearTimeout(debugTimer);
			cleanup();
			console.log('[CLAUDE] finished', { code, stdoutLen: stdout.length, stderrLen: stderr.length });
			if (stderr) console.log('[CLAUDE] stderr content:', stderr.substring(0, 500));
			if (stdout) console.log('[CLAUDE] stdout preview:', stdout.substring(0, 500));
			// Handle null exit code as success (happens when process is terminated gracefully)
			if (code !== null && code !== 0) return reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
			resolve(stdout);
		});
	});
}

async function takeScreenshot(targetUrl: string): Promise<string> {
	console.log('Taking screenshot...');
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
	
	// Navigate to intended URL
	try {
		await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });
	} catch (networkError) {
		console.warn('networkidle0 failed, trying domcontentloaded:', networkError);
		await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await new Promise(resolve => setTimeout(resolve, 2000));
	}
	
	// If a CodeSandbox interstitial is detected, jump to preview domain
	try {
		const current = page.url();
		let interstitial = /codesandbox\.io/i.test(current) || /preview/i.test(current);
		// Detect by page text as well (covers interstitial served from csb.app)
		try {
			const hasInterstitialText = await page.evaluate(() => {
				const doc = (globalThis as any).document as any;
				const t = ((doc?.body?.innerText) || '').toLowerCase();
				return t.includes('codesandbox preview') && (t.includes('do you want to continue') || t.includes('proceed to preview'));
			});
			if (hasInterstitialText) interstitial = true;
		} catch {}

		if (interstitial) {
			console.log('[SCREENSHOT] Detected CodeSandbox interstitial, attempting bypass');
			// First try clicking the "Yes, proceed to preview" button/link
			const clicked = await page.evaluate(() => {
				const doc = (globalThis as any).document as any;
				const anchors = Array.from(doc.querySelectorAll('a')) as any[];
				const yes = anchors.find(a => /proceed to preview/i.test(((a as any).textContent || '')));
				if (yes) { (yes as any).click(); return true; }
				const buttons = Array.from(doc.querySelectorAll('button')) as any[];
				const btn = buttons.find(b => /proceed to preview/i.test(((b as any).textContent || '')));
				if (btn) { (btn as any).click(); return true; }
				return false;
			});
			if (clicked) {
				try {
					await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
				} catch {}
			}

			// If still on interstitial, try extracting the preview href and navigating
			const previewHref = await page.$$eval('a[href]', (as: any[]) => {
				const found = (as as any[]).find((a: any) => /\.csb\.app/i.test((a as any).href));
				return found ? (found as any).href : '';
			}).catch(() => '');
			if (previewHref) {
				try {
					await page.goto(previewHref, { waitUntil: 'networkidle0', timeout: 60000 });
				} catch {
					await page.goto(previewHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			}
		}
	} catch (e: any) {
		console.warn('[SCREENSHOT] Interstitial bypass failed:', e?.message || e);
	}

	// If CodeSandbox is still installing dependencies, wait until it's done
	async function waitUntilDependenciesInstalled(maxMs: number): Promise<boolean> {
		const start = Date.now();
		while (Date.now() - start < maxMs) {
			const installing = await page.evaluate(() => {
				const doc = (globalThis as any).document as any;
				if (!doc || !doc.body) return true;
				const text = ((doc.body.innerText || '').toLowerCase());
				const hasLoader = text.includes('installing dependencies');
				const hasOpenSandbox = text.includes('open sandbox');
				return hasLoader || hasOpenSandbox;
			});
			if (!installing) return true;
			console.log('[SCREENSHOT] CodeSandbox still installing, waiting 5s…');
			await new Promise(res => setTimeout(res, 5000));
			// Do a light reload every 20s to nudge progress/WS reconnects
			if ((Date.now() - start) % 20000 < 5000) {
				try { await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch {}
			}
		}
		return false;
	}

	const depsReady = await waitUntilDependenciesInstalled(180000); // up to 3 minutes
	if (!depsReady) {
		console.warn('[SCREENSHOT] Timed out waiting for dependencies to install; proceeding anyway');
	}

	// Wait for meaningful content to render (avoid blank screenshot)
	async function waitForMeaningfulContent(maxMs: number): Promise<boolean> {
		const start = Date.now();
		while (Date.now() - start < maxMs) {
			const hasContent = await page.evaluate(() => {
				const doc = (globalThis as any).document as any;
				if (!doc || !doc.body) return false;
				// Candidates for app roots
				const roots = ['#root', '#app', 'main', 'body'];
				for (const sel of roots) {
					const el = doc.querySelector(sel) as any;
					if (el && el.getBoundingClientRect) {
						const r = el.getBoundingClientRect();
						if (r && r.width * r.height > 50000) return true;
					}
				}
				// Any large visible element
				const nodes = Array.from(doc.querySelectorAll('*')) as any[];
				for (const n of nodes) {
					if (!n || !n.getBoundingClientRect) continue;
					const s = (doc.defaultView as any).getComputedStyle(n);
					if (!s || s.visibility === 'hidden' || s.display === 'none') continue;
					const r = n.getBoundingClientRect();
					if (r && r.width * r.height > 50000) return true;
				}
				// Any loaded image
				const imgs = Array.from((doc as any).images || []) as any[];
				if (imgs.some(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)) return true;
				// Fallback: sufficient text content
				const textLen = ((doc.body.innerText || '').trim()).length;
				return textLen > 50;
			});
			if (hasContent) return true;
			await new Promise(res => setTimeout(res, 1000));
		}
		return false;
	}

	let contentReady = await waitForMeaningfulContent(20000);
	if (!contentReady) {
		console.warn('[SCREENSHOT] No meaningful content detected, reloading once...');
		try {
			await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
			await new Promise(res => setTimeout(res, 2000));
			contentReady = await waitForMeaningfulContent(20000);
		} catch (e) {
			console.warn('[SCREENSHOT] Reload failed:', (e as Error)?.message);
		}
	}

	// Final small settle to ensure painting
	await page.evaluate(() => new Promise(r => (globalThis as any).requestAnimationFrame(() => (globalThis as any).requestAnimationFrame(r))));

	let screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: true });
	// If image is suspiciously small (possibly blank), retry once after short wait
	if (!screenshotBuffer || (screenshotBuffer as any as string).length < 1000) {
		await new Promise(res => setTimeout(res, 2000));
		screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: true });
	}
	await browser.close();
	console.log('Screenshot taken successfully.');
	return screenshotBuffer as string;
}

async function deployToCodeSandbox(projectDir: string): Promise<{ deploymentUrl: string; previewUrl: string; editorUrl: string }> {
	console.log(`[CODESANDBOX_DEPLOY] Starting deployment from ${projectDir}`);
	
	// Read all files from the project directory
	async function collectAllFiles(dir: string, prefix = ''): Promise<Record<string, { content: string | object }>> {
		const files: Record<string, { content: string | object }> = {};
		
		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });
			
			for (const entry of entries) {
				// Skip certain directories and files
				if (['node_modules', '.git', '.vercel', 'dist', 'build', '.next'].includes(entry.name)) {
					continue;
				}
				
				const fullPath = path.join(dir, entry.name);
				const relativePath = prefix ? path.join(prefix, entry.name).replace(/\\/g, '/') : entry.name;
				
				if (entry.isDirectory()) {
					// Recursively read subdirectory
					const subFiles = await collectAllFiles(fullPath, relativePath);
					Object.assign(files, subFiles);
				} else if (entry.isFile()) {
					try {
						// Handle different file types
						if (entry.name === 'package.json') {
							const content = await fs.readFile(fullPath, 'utf8');
							files[relativePath] = { content: JSON.parse(content) };
						} else {
							// Read as text file
							const content = await fs.readFile(fullPath, 'utf8');
							files[relativePath] = { content };
						}
						console.log(`[CODESANDBOX_DEPLOY] Read ${relativePath}`);
					} catch (readError) {
						console.warn(`[CODESANDBOX_DEPLOY] Could not read ${relativePath}:`, readError);
					}
				}
			}
		} catch (dirError) {
			console.warn(`[CODESANDBOX_DEPLOY] Could not read directory ${dir}:`, dirError);
		}
		
		return files;
	}
	
	// Collect all project files
	const allFiles = await collectAllFiles(projectDir);
	
	// Add timestamp to ensure unique sandbox creation
	const timestamp = Date.now();
	const uniqueComment = `/* Generated at ${new Date().toISOString()} - ${timestamp} */\n`;
	
	// Add unique identifier to package.json name if it exists
	if (allFiles['package.json'] && typeof allFiles['package.json'].content === 'object') {
		const pkgContent = allFiles['package.json'].content as any;
		allFiles['package.json'].content = { ...pkgContent, name: `recflux-app-${timestamp}` };
	}
	
	// Add timestamp comments to certain file types to ensure uniqueness
	const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.less'];
	for (const [filePath, fileData] of Object.entries(allFiles)) {
		const ext = path.extname(filePath).toLowerCase();
		if (codeExtensions.includes(ext) && typeof fileData.content === 'string') {
			fileData.content = `${uniqueComment}${fileData.content}`;
		}
	}
	
	// Ensure we have essential files and proper configuration
	if (!allFiles['src/index.js'] && !allFiles['src/index.jsx']) {
		allFiles['src/index.js'] = {
			content: `${uniqueComment}import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
		};
	}
	
	// Ensure package.json has the correct structure for CodeSandbox
	if (!allFiles['package.json']) {
		allFiles['package.json'] = {
			content: {
				"name": `recflux-app-${timestamp}`,
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
				},
				"browserslist": {
					"production": [">0.2%", "not dead", "not op_mini all"],
					"development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
				}
			}
		};
	}
	
	// Add CodeSandbox configuration to help with dependency resolution
	if (!allFiles['sandbox.config.json']) {
		allFiles['sandbox.config.json'] = {
			content: {
				"infiniteLoopProtection": true,
				"hardReloadOnChange": false,
				"view": "browser",
				"template": "create-react-app"
			}
		};
	}
	
	console.log(`[CODESANDBOX_DEPLOY] Collected ${Object.keys(allFiles).length} files`);
	console.log(`[CODESANDBOX_DEPLOY] Files:`, Object.keys(allFiles).join(', '));
	
	// Create the sandbox using all project files
	const sandboxData = {
		files: allFiles
	};
	
	console.log('[CODESANDBOX_DEPLOY] Creating sandbox...');
	
	try {
		console.log('[CODESANDBOX_DEPLOY] Sending sandbox data with', Object.keys(sandboxData.files).length, 'files');
		console.log('[CODESANDBOX_DEPLOY] Package.json dependencies:', 
			typeof sandboxData.files['package.json']?.content === 'object' 
				? JSON.stringify((sandboxData.files['package.json'].content as any)?.dependencies, null, 2)
				: 'N/A'
		);
		
		// Use POST with JSON body per CodeSandbox define API
		const response = await axios.post(
			'https://codesandbox.io/api/v1/sandboxes/define?json=1',
			sandboxData,
			{
				timeout: 30000, // Increased timeout
				headers: { 'Content-Type': 'application/json' },
			}
		);
		
		console.log('[CODESANDBOX_DEPLOY] Response status:', response.status);
		console.log('[CODESANDBOX_DEPLOY] Response data:', response.data);
		
		let sandboxId = '';
		if (response.data && typeof response.data === 'object') {
			sandboxId = (response.data as any).sandbox_id || (response.data as any).id || '';
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
	} catch (error: any) {
		const status = error?.response?.status;
		const dataPreview = error?.response?.data ? (typeof error.response.data === 'string' ? error.response.data.slice(0, 400) : JSON.stringify(error.response.data).slice(0, 400)) : '';
		console.error('[CODESANDBOX_DEPLOY] Failed to create sandbox. status=', status, 'message=', error?.message);
		if (dataPreview) console.error('[CODESANDBOX_DEPLOY] error body=', dataPreview);
		throw new Error(`CodeSandbox deployment failed: ${error.message}`);
	}
}

async function deployToVercel(projectDir: string): Promise<{ deploymentUrl: string }> {
	if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN not set');
	
	console.log(`[VERCEL_DEPLOY] Starting deployment from ${projectDir}`);
	
	const { execa } = await import('execa');
	
	// Verify template integrity (copied from code-deploy-service)
	const pkgPath = path.join(projectDir, 'package.json');
	const lockPath = path.join(projectDir, 'package-lock.json');
	const srcAppPath = path.join(projectDir, 'src', 'App.jsx');
	
	console.log('[DEBUG] Checking for package.json at:', pkgPath);
	if (!(await fsExtra.pathExists(pkgPath))) {
		throw new Error(`Template package.json missing at ${pkgPath}. Ensure project was initialized.`);
	}
	
	console.log('[DEBUG] Checking for App.jsx at:', srcAppPath);
	if (!(await fsExtra.pathExists(srcAppPath))) {
		throw new Error(`Template src/App.jsx missing at ${srcAppPath}.`);
	}
	
	// Link temp dir to a fixed Vercel project if envs are provided (exact copy from code-deploy-service)
	try {
		const vercelProjectId = VERCEL_PROJECT_ID;
		const vercelOrgId = VERCEL_ORG_ID;
		if (vercelProjectId && vercelOrgId) {
			const vercelDir = path.join(projectDir, '.vercel');
			await fsExtra.ensureDir(vercelDir);
			await fsExtra.writeJson(
				path.join(vercelDir, 'project.json'),
				{ projectId: vercelProjectId, orgId: vercelOrgId },
				{ spaces: 2 }
			);
			// Some CLI versions also read org.json; write defensively
			await fsExtra.writeJson(
				path.join(vercelDir, 'org.json'),
				{ orgId: vercelOrgId },
				{ spaces: 2 }
			);
			console.log(`[VERCEL_DEPLOY] Linked temp directory to Vercel project ${vercelProjectId} (org ${vercelOrgId}).`);
		} else {
			console.log(`[VERCEL_DEPLOY] VERCEL_PROJECT_ID/VERCEL_ORG_ID not set; CLI will create/select project automatically.`);
		}
	} catch (linkErr: any) {
		console.warn(`[VERCEL_DEPLOY] Failed to write .vercel linking files:`, linkErr?.message || linkErr);
	}

	// Runtime toolchain diagnostics (copied from code-deploy-service)
	try {
		const npmVer = execSync('npm -v').toString().trim();
		console.log('[DIAG] Node:', process.version, 'npm:', npmVer);
	} catch {}

	// Install dependencies in the directory (exact copy from code-deploy-service logic)
	console.log('Installing dependencies...');
	console.log('[DEBUG] Installing dependencies in:', projectDir);
	
	// Double-check that package.json exists before running npm
	if (!(await fsExtra.pathExists(pkgPath))) {
		throw new Error(`Cannot install dependencies: package.json not found at ${pkgPath}`);
	}
	
	// Use npm from PATH instead of hardcoded path for Windows compatibility
	const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	const baseEnv = {
		...process.env,
		NPM_CONFIG_CACHE: path.join(projectDir, '.npm-cache'),
		NPM_CONFIG_ENGINE_STRICT: 'false'
	};
	
	console.log('[DEBUG] npm command:', npmCmd);
	console.log('[DEBUG] working directory:', projectDir);
	console.log('[DEBUG] package.json exists:', await fsExtra.pathExists(pkgPath));
	
	try {
		if (await fsExtra.pathExists(lockPath)) {
			console.log('Using npm ci');
			await execa(npmCmd, ['ci', '--no-audit', '--no-fund'], { cwd: projectDir, env: baseEnv });
		} else {
			console.log('Lockfile not found; using npm install');
			await execa(npmCmd, ['install', '--no-audit', '--no-fund'], { cwd: projectDir, env: baseEnv });
		}
	} catch (e: any) {
		console.error('Primary install failed with error:', e);
		console.warn('Primary install failed, retrying with legacy peer deps...', e?.message || e);
		try {
			await execa(npmCmd, ['install', '--no-audit', '--no-fund', '--legacy-peer-deps'], { cwd: projectDir, env: baseEnv });
		} catch (retryError: any) {
			console.error('Retry install also failed:', retryError);
			throw new Error(`npm install failed: ${retryError.message}. Working directory: ${projectDir}, package.json exists: ${await fsExtra.pathExists(pkgPath)}`);
		}
	}
	
	// Run the Vercel deployment command (exact copy from code-deploy-service)
	console.log('Starting Vercel deployment...');
	const vercelArgs = ['--prod', '--yes', '--archive', 'tgz', '--token', VERCEL_TOKEN];
	if (process.env.VERCEL_SCOPE) {
		vercelArgs.push('--scope', process.env.VERCEL_SCOPE);
	}
	if (VERCEL_PROJECT_NAME) {
		vercelArgs.push('--name', VERCEL_PROJECT_NAME);
	}
	
	const { stdout, stderr } = await execa('vercel', vercelArgs, {
		cwd: projectDir,
		// Pass parent environment variables to the child process
		env: { ...process.env },
	});
	
	console.log('Vercel deployment command output (raw):', stdout || '(empty)');

	// Extract the first URL-looking token from combined stdio (exact copy)
	const combined = `${stdout || ''}\n${stderr || ''}`;
	const urlMatch = combined.match(/https?:\/\/\S+/);
	const deploymentUrl = urlMatch ? urlMatch[0] : '';

	if (!deploymentUrl) {
		throw new Error('Vercel did not return a deployment URL. Check CLI output and credentials.');
	}
	
	console.log(`Deployment successful! URL: ${deploymentUrl}`);

	return {
		deploymentUrl
	};
}


async function hashDirectory(root: string): Promise<Map<string, string>> {
	async function walk(dir: string, prefix = ''): Promise<Array<{ rel: string; abs: string }>> {
		const out: Array<{ rel: string; abs: string }> = [];
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const ent of entries) {
			if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.vercel') continue;
			const abs = path.join(dir, ent.name);
			const rel = path.join(prefix, ent.name).replace(/\\/g, '/');
			if (ent.isDirectory()) out.push(...(await walk(abs, rel)));
			else out.push({ rel, abs });
		}
		return out;
	}
	const files = await walk(root);
	const map = new Map<string, string>();
	for (const f of files) {
		const buf = await fs.readFile(f.abs);
		const sha = crypto.createHash('sha1').update(buf).digest('hex');
		map.set(f.rel, sha);
	}
	return map;
}

function isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_VERIFY_TOKEN) {
	throw new Error('Missing WhatsApp env vars');
}
// Removed direct deploy helpers; MCP server handles deployment

async function buildAndDeployFromPrompt(nlPrompt: string, whatsappFrom: string): Promise<{ text: string; shouldSendImage?: boolean; imageData?: string; imageCaption?: string; claudeOutput?: string; deploymentUrl?: string; previewUrl?: string; editorUrl?: string }> {
    const mappedUser = getUserByWhatsApp(whatsappFrom);
    let userId = 'dev-user';
    if (mappedUser?.email) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { data: user, error } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', mappedUser.email)
                    .single();
                if (!error && user?.id) {
                    userId = user.id as string;
                }
            } catch (e) {
                console.warn('[SUPABASE] resolve uuid failed:', (e as Error).message);
            }
        }
    }
    if (!isValidUuid(userId)) {
        const fallback = process.env.DEFAULT_USER_ID;
        if (fallback && isValidUuid(fallback)) userId = fallback;
    }
    if (!isValidUuid(userId)) {
        return { text: 'Por favor, faça /login para atribuirmos créditos, ou configure DEFAULT_USER_ID (UUID) no servidor.' };
    }

    const dirFromEnv = process.env.CLONED_TEMPLATE_DIR;
    if (!dirFromEnv) return { text: '⚠️ Projeto não inicializado. Faça /login para criar o projeto a partir do template.' };
    const dir = dirFromEnv;
    try { const st = await fs.stat(dir); if (!st.isDirectory()) throw new Error('not dir'); } catch { return { text: '⚠️ Projeto ausente. Use /login ou peça project_reset para recriar a pasta.' }; }
	const system = `
        Você é um gerador de código React especializado em criar sites profissionais e modernos.
        
        INSTRUÇÕES IMPORTANTES:
        1. SEMPRE examine os arquivos existentes primeiro usando Read tool
        2. MODIFIQUE os arquivos src/App.jsx e src/index.css conforme necessário
        3. Crie um site completo e funcional baseado na solicitação do usuário
        4. SEMPRE use Write ou Edit tools para salvar suas alterações nos arquivos
        
        VISUAL E UX:
        - Gradientes modernos, sombras elegantes, tipografia profissional
        - Layout responsivo com flex/grid, espaçamento bem distribuído
        - Animações e hovers suaves (transition: "all 0.3s ease-in-out")
        
        IMAGENS (OBRIGATÓRIO):
        - Inclua 2-3 imagens válidas:
        https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=600&fit=crop
        https://images.unsplash.com/photo-1486312338219-ce68e2c6b33d?w=800&h=400&fit=crop
        https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop
        https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face
        https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop
        https://picsum.photos/400/300?random=1
        - Sempre use alt significativo e style inline (width/height/objectFit)
        
        PADRÕES PROFISSIONAIS:
        - Estrutura semântica, acessibilidade básica, estado bem gerenciado
        - Performance e organização do código
        
        FLUXO DE TRABALHO:
        1. Use Read para examinar src/App.jsx e src/index.css
        2. Modifique os arquivos conforme a solicitação
        3. Use Write/Edit para salvar as alterações
		Caso necessário, use a tool mcp__recflux__project_reset para resetar o projeto.
		Caso necessário, use a tool mcp__recflux__vercel_deploy para publicar o projeto se o usuário pedir.
    `;
    try {
        const before = await hashDirectory(dir);
        const stdout = await runClaudeCLIInDir(dir, nlPrompt, system);
        console.log('[CLAUDE][NL PROMPT] raw output length', stdout?.length || 0);
        const after = await hashDirectory(dir);
        let changed = false;
        if (before.size !== after.size) changed = true; else { for (const [k,v] of after.entries()) { if (before.get(k) !== v) { changed = true; break; } } }
        
        if (changed) {
            console.log('[DEPLOY] Changes detected, deploying to CodeSandbox...');
            try {
                const deployment = await deployToCodeSandbox(dir);
                
                const messageText = `🚀 Site publicado!

📱 *Preview:*
${deployment.previewUrl}

⚙️ *Code:*
${deployment.editorUrl}`;
                
                return { 
                    text: messageText,
                    claudeOutput: stdout,
                    deploymentUrl: deployment.previewUrl,
                    previewUrl: deployment.previewUrl,
                    editorUrl: deployment.editorUrl,
                    shouldSendImage: true, // Always try to send screenshot separately
                    imageData: '', // Will be populated later
                    imageCaption: '📸 Preview do seu site'
                };
            } catch (deployError) {
                console.error('[DEPLOY] Error:', deployError);
                return { 
                    text: '❌ Código gerado mas falha no deploy.',
                    claudeOutput: stdout
                };
            }
        } else {
            return { 
                text: '✅ Nenhuma alteração detectada. Não publicarei.',
                claudeOutput: stdout
            };
        }
    } catch (e) {
        console.error('[CLAUDE] Error or timeout:', e);
        // If Claude times out but we have changes, still try to deploy
        const before = await hashDirectory(dir);
        const after = await hashDirectory(dir);
        let changed = false;
        // For timeout case, assume there were changes if files exist
        try {
            const appPath = path.join(dir, 'src', 'App.jsx');
            const stats = await fs.stat(appPath);
            changed = stats.isFile();
        } catch {
            changed = false;
        }
        
        if (changed) {
            console.log('[DEPLOY] Claude timed out but changes detected, attempting deploy anyway...');
            try {
                const deployment = await deployToCodeSandbox(dir);
                return { 
                    text: `🚀 Site publicado! (Claude timeout mas deploy funcionou)

📱 *Preview:*
${deployment.previewUrl}

⚙️ *Code:*
${deployment.editorUrl}`,
                    deploymentUrl: deployment.previewUrl,
                    previewUrl: deployment.previewUrl,
                    editorUrl: deployment.editorUrl
                };
            } catch (deployError) {
                return { text: '❌ Claude timeout e falha no deploy. Tente novamente.' };
            }
        }
        return { text: '❌ Erro ao gerar código. Tente um prompt mais simples.' };
    }
}

async function sendWhatsappText(to: string, body: string) {
	const chunks: string[] = [];
	const maxLen = 3500;
	for (let i = 0; i < body.length; i += maxLen) {
		chunks.push(body.slice(i, i + maxLen));
	}

	console.log(`[WHATSAPP_API] Sending ${chunks.length} chunk(s) to ${to}`);
	for (const [idx, chunk] of chunks.entries()) {
		const url = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
		const payload = {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: { body: chunk }
		};
		try {
			console.log(`[WHATSAPP_API] POST ${url} (chunk ${idx + 1}/${chunks.length})`);
			const resp = await axios.post(url, payload, {
				headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
			});
			const preview = typeof resp.data === 'string' ? resp.data.slice(0, 500) : JSON.stringify(resp.data).slice(0, 500);
			console.log(`[WHATSAPP_API] status=${resp.status} body=${preview}`);
		} catch (err: any) {
			const status = err?.response?.status;
			const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
			console.error(`[WHATSAPP_API] error status=${status} message=${err?.message}`);
			if (dataPreview) console.error(`[WHATSAPP_API] error body=${dataPreview}`);
			throw err;
		}
	}
}

async function sendWhatsappImage(to: string, base64Image: string, caption?: string) {
	try {
		console.log(`[WHATSAPP_API] Sending image to ${to} (${Math.round(base64Image.length / 1024)}KB)`);
		
		// Convert base64 to buffer
		const imageBuffer = Buffer.from(base64Image, 'base64');
		
		// First, upload the media
		const uploadUrl = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/media`;
		const formData = new FormData();
		formData.append('messaging_product', 'whatsapp');
		formData.append('file', imageBuffer, {
			filename: 'screenshot.png',
			contentType: 'image/png'
		});
		formData.append('type', 'image/png');
		
		const uploadResp = await axios.post(uploadUrl, formData, {
			headers: { 
				Authorization: `Bearer ${WHATSAPP_TOKEN}`,
				...formData.getHeaders()
			}
		});
		
		const mediaId = uploadResp.data.id;
		console.log(`[WHATSAPP_API] Media uploaded successfully, ID: ${mediaId}`);
		
		// Then send the image message
		const messageUrl = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
		const payload = {
			messaging_product: 'whatsapp',
			to,
			type: 'image',
			image: {
				id: mediaId,
				caption: caption || ''
			}
		};
		
		const resp = await axios.post(messageUrl, payload, {
			headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
		});
		
		console.log(`[WHATSAPP_API] Image sent successfully, status=${resp.status}`);
		return resp.data;
	} catch (err: any) {
		const status = err?.response?.status;
		const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
		console.error(`[WHATSAPP_API] Image send error status=${status} message=${err?.message}`);
		if (dataPreview) console.error(`[WHATSAPP_API] Image send error body=${dataPreview}`);
		throw err;
	}
}

const app = express();
app.use(bodyParser.json());

// Optional Google auth setup
configureAuth(app);

app.get('/webhook', (req: Request, res: Response) => {
	const mode = req.query['hub.mode'];
	const token = req.query['hub.verify_token'];
	const challenge = req.query['hub.challenge'];

	if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
		return res.status(200).send(challenge as any);
	}
	return res.sendStatus(403);
});

app.post('/webhook', async (req: Request, res: Response) => {
	try {
		// Debug: print the incoming request
		console.log('[WEBHOOK] method=POST path=/webhook');
		console.log('[WEBHOOK] headers=', JSON.stringify(req.headers));
		console.log('[WEBHOOK] body=', JSON.stringify(req.body));
		const entry = req.body?.entry?.[0];
		const changes = entry?.changes?.[0];
		const value = changes?.value;
		const messages = value?.messages;
		// Ignore status callbacks (delivery/read, outbound acks)
		if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
			return res.sendStatus(200);
		}

		if (messages && messages[0] && messages[0].type === 'text') {
			const msg = messages[0];
			const from = msg.from;
			const text: string = (msg.text?.body || '').trim();
			const uniqueId = msg.id || `${from}:${msg.timestamp || Date.now()}`;
			if (!(await ensureFirstProcessDistributed(uniqueId))) {
				console.log(`[WEBHOOK] duplicate message detected, id=${uniqueId}, skipping`);
				return res.sendStatus(200);
			}

			let reply = '';
			let wrapAsCode = true;
			if (text.toLowerCase().startsWith('/deploy ')) {
				const reactCode = text.slice(8);
				// Immediate feedback to user about expected duration
				await sendWhatsappText(from, '⚡ Iniciando deploy… Aguarde alguns minutos!');
				const dirFromEnv = process.env.CLONED_TEMPLATE_DIR;
				if (!dirFromEnv) {
					reply = '⚠️ Projeto não inicializado. Faça /login para criar o projeto a partir do template.';
					wrapAsCode = false;
					await sendWhatsappText(from, reply);
					return res.sendStatus(200);
				}
				const dir = dirFromEnv;
				try { const st = await fs.stat(dir); if (!st.isDirectory()) throw new Error('not dir'); } catch {
					reply = '⚠️ Projeto ausente. Use /login ou peça project_reset para recriar a pasta.';
					wrapAsCode = false;
					await sendWhatsappText(from, reply);
					return res.sendStatus(200);
				}
				const systemDeploy = `Você é um editor de código. Edite o projeto desta pasta conforme o pedido.`;
				try {
					const before = await hashDirectory(dir);
					const stdout = await runClaudeCLIInDir(dir, reactCode, systemDeploy);
					console.log('[CLAUDE][DEPLOY PROMPT] raw output length', stdout?.length || 0);
					const after = await hashDirectory(dir);
					let changed = false;
					if (before.size !== after.size) changed = true;
					else {
						for (const [k, v] of after.entries()) { if (before.get(k) !== v) { changed = true; break; } }
					}
					
					let deploymentResult: { deploymentUrl?: string; previewUrl?: string; editorUrl?: string } | null = null;
					
					if (changed) {
						console.log('[DEPLOY] Changes detected, deploying to CodeSandbox...');
						try {
							deploymentResult = await deployToCodeSandbox(dir);
							reply = `🚀 Site publicado!

📱 **Preview:**
${deploymentResult.previewUrl}

⚙️ **Code:**
${deploymentResult.editorUrl}`;
						} catch (deployError) {
							console.error('[DEPLOY] Error:', deployError);
							reply = '❌ Código editado mas falha no deploy.';
						}
					} else {
						reply = '✅ Nenhuma alteração detectada. Não publicarei.';
					}
					
					// Send messages in order: comment → link → screenshot
					
					// 1. Send Claude's commentary first if available
					if (stdout && stdout.trim().length > 0) {
						console.log(`[WEBHOOK] Sending Claude commentary to ${from} for /deploy command`);
						await sendWhatsappText(from, stdout.trim());
					}
					
					// 2. Send the deployment result
					wrapAsCode = false;
					await sendWhatsappText(from, reply);
					
					
					return res.sendStatus(200);
				} finally {
					// Do not delete CLONED_TEMPLATE_DIR; it is managed via login/project_reset
				}
			} else if (text.toLowerCase().startsWith('/access ')) {
				reply = 'O comando /access não está disponível nesta versão.';
			} else if (text.toLowerCase().startsWith('/login')) {
				const base = (PUBLIC_BASE_URL && PUBLIC_BASE_URL.trim()) || `http://localhost:${process.env.PORT || 3000}`;
				const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
				const loginUrl = `${normalizedBase}/auth/google?state=${encodeURIComponent(from)}`;
				reply = `Login com Google: ${loginUrl}`;
				wrapAsCode = false;
			} else if (text.toLowerCase().startsWith('/agentic')) {
				// Formats:
				// GERAR:  /agentic GERAR <userId> | <prompt>
				// EDITAR: /agentic EDITAR <userId> | <fileName> | <prompt> || <currentCode>
				const payload = text.startsWith('/agentic ') ? text.slice(9).trim() : '';
				const [left] = payload.split('||');
				const parts = (left || '').split('|').map(s => s.trim()).filter(Boolean);
				const head = (parts[0] || '').split(/\s+/).filter(Boolean);
				const actionType = (head[0]?.toUpperCase() as 'EDITAR' | 'FOCAR' | 'GERAR') || 'GERAR';
				// Try to get logged-in user via WhatsApp sender mapping; fallback to provided id or dev-user
				const mappedUser = getUserByWhatsApp(from);
				let userId = head[1] || 'dev-user';
				if (mappedUser?.email) {
					// Resolve Supabase user UUID via email
					const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
					const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
					if (supabaseUrl && supabaseKey) {
						try {
							const supabase = createClient(supabaseUrl, supabaseKey);
							const { data: user, error } = await supabase
								.from('users')
								.select('id')
								.eq('email', mappedUser.email)
								.single();
							if (!error && user?.id) {
								userId = user.id as string;
							}
						} catch (e) {
							console.warn('[SUPABASE] Failed to resolve user id by email:', (e as Error).message);
						}
					}
				}
				const prompt = parts.length > 1 ? parts[parts.length - 1] : '';

				if (!prompt) {
					const who = mappedUser ? ` (como ${mappedUser.email || mappedUser.name || mappedUser.id})` : '';
					reply = `Você está usando /agentic${who}.\nUso:\n/agentic GERAR | <prompt>\n/agentic EDITAR | <fileName> | <prompt> || <currentCode>`;
				} else {
					// Fallback: if userId isn't a UUID, try DEFAULT_USER_ID env, otherwise ask user to /login
					if (!isValidUuid(userId)) {
						const fallback = process.env.DEFAULT_USER_ID;
						if (fallback && isValidUuid(fallback)) {
							console.warn(`[AGENTIC] Using DEFAULT_USER_ID fallback for non-UUID userId (${userId})`);
							userId = fallback;
						} else {
							reply = 'Por favor, faça /login primeiro ou forneça um UUID de usuário válido. Você também pode definir DEFAULT_USER_ID nas variáveis do servidor.';
							wrapAsCode = false;
							await sendWhatsappText(from, reply);
							return res.sendStatus(200);
						}
					}
					// Independente do actionType, apenas confirmamos a edição
					reply = 'OK. Vou aplicar as mudanças no projeto ao publicar.';
				}
			} else if (text.toLowerCase() === '/help') {
				reply = 'Envie um prompt em linguagem natural (ex.: "Crie um portfólio moderno") e eu vou gerar e publicar. Comandos: /login, /agentic, /access, /deploy';
				wrapAsCode = false;
			} else {
				console.log(`[WEBHOOK] Processing deployment request from ${from}: "${text.substring(0, 100)}..."`);
				// Immediate feedback to user about expected duration
				await sendWhatsappText(from, '⚡ Gerando e publicando… Aguarde alguns minutos!');
				const result = await buildAndDeployFromPrompt(text, from);
				console.log('[WEBHOOK] Deployment result:', {
					textLength: result.text.length,
					hasDeploymentUrl: !!result.deploymentUrl,
					hasClaudeOutput: !!result.claudeOutput
				});
				
				// Send messages in order: comment → link → screenshot
				
				// 1. Send Claude's commentary first if available
				if (result.claudeOutput && result.claudeOutput.trim().length > 0) {
					console.log(`[WEBHOOK] Sending Claude commentary to ${from}`);
					await sendWhatsappText(from, result.claudeOutput.trim());
				}
				
				// 2. Send the link immediately when ready
				console.log(`[WEBHOOK] Sending deployment result to ${from}`);
				await sendWhatsappText(from, result.text);
				
				// 3. Take and send screenshot asynchronously (don't wait)
				if (result.shouldSendImage && result.previewUrl) {
					console.log(`[WEBHOOK] Taking screenshot asynchronously for ${from}`);
					// Don't await - run in background
					takeScreenshot(result.previewUrl)
						.then(async (screenshotData) => {
							console.log(`[WEBHOOK] Screenshot ready, sending to ${from}`);
							await sendWhatsappImage(from, screenshotData, result.imageCaption || '📸 Preview do seu site');
						})
						.catch((screenshotError) => {
							console.warn(`[WEBHOOK] Screenshot failed for ${from}:`, screenshotError);
						});
				}
				
				// Return early since we already sent the message(s)
				return res.sendStatus(200);
			}

			if (wrapAsCode && !reply.startsWith('```')) {
				reply = '```' + reply + '```';
			}

			await sendWhatsappText(from, reply);
		}

		res.sendStatus(200);
	} catch (err) {
		console.error(err);
		res.sendStatus(500);
	}
});

const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
	console.log(`Webhook listening on :${port}`);
});


