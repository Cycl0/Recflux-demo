import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import FormData from 'form-data';
import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { configureAuth, getUserByWhatsApp } from './auth.js';
import { createClient } from '@supabase/supabase-js';
import { deployToCodeSandbox } from './deploy-codesandbox.js';
// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Simple in-memory idempotency cache for WhatsApp message IDs
const processedMessageIds = new Map();
const SEEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
function pruneProcessed() {
    const now = Date.now();
    for (const [id, ts] of processedMessageIds.entries()) {
        if (now - ts > SEEN_TTL_MS)
            processedMessageIds.delete(id);
    }
}
function shouldProcessMessage(uniqueId) {
    pruneProcessed();
    if (processedMessageIds.has(uniqueId))
        return false;
    processedMessageIds.set(uniqueId, Date.now());
    return true;
}
function getSupabaseForIdempotency() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url)
        return null;
    if (serviceKey)
        return createClient(url, serviceKey);
    if (anonKey)
        return createClient(url, anonKey);
    return null;
}
async function ensureFirstProcessDistributed(uniqueId) {
    const supabase = getSupabaseForIdempotency();
    if (!supabase)
        return shouldProcessMessage(uniqueId);
    try {
        const { error } = await supabase
            .from('processed_messages')
            .insert({ id: uniqueId })
            .single();
        if (error) {
            const code = error?.code || '';
            if (code === '23505')
                return false;
            console.warn('[IDEMPOTENCY] Supabase insert failed, using in-memory fallback:', error.message || error);
            return shouldProcessMessage(uniqueId);
        }
        return true;
    }
    catch (e) {
        console.warn('[IDEMPOTENCY] Supabase error, using in-memory fallback:', e?.message || e);
        return shouldProcessMessage(uniqueId);
    }
}
const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, PUBLIC_BASE_URL } = process.env;
const DEFAULT_CLAUDE_BIN = process.platform === 'win32' ? 'claude.ps1' : 'claude';
const CLAUDE_BIN = (process.env.CLAUDE_BIN || process.env.CLAUDE_PATH || DEFAULT_CLAUDE_BIN);
function runClaudeCLIInDir(cwd, userPrompt, systemAppend) {
    return new Promise((resolve, reject) => {
        // Resolve absolute project directory and prepare prompts
        const absProjectDir = path.resolve(cwd);
        const userArg = userPrompt;
        const systemArg = systemAppend.replace(/"/g, '\'');
        // Non-interactive, strict MCP, expanded tools, and explicit directory access
        const mcpConfigPath = path.resolve(__dirname, '../mcp-config.json');
        console.log('[CLAUDE] MCP config path:', mcpConfigPath);
        // Check if MCP config file exists
        try {
            const configExists = fsSync.existsSync(mcpConfigPath);
            console.log('[CLAUDE] MCP config exists:', configExists);
            if (configExists) {
                const configContent = fsSync.readFileSync(mcpConfigPath, 'utf8');
                console.log('[CLAUDE] MCP config content:', configContent);
            }
        }
        catch (e) {
            console.error('[CLAUDE] Error checking MCP config:', e);
        }
        const baseArgs = [
            '--print',
            '--append-system-prompt', systemArg,
            '--permission-mode', 'bypassPermissions',
            '--output-format', 'text',
            '--add-dir', absProjectDir,
            '--mcp-config', mcpConfigPath,
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
                    }
                    catch (e) {
                        console.warn('[CLAUDE] Could not resolve PowerShell script path, using original:', cmd);
                    }
                }
                args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path, ...baseArgs];
                cmd = 'powershell.exe';
            }
            else if (/\.(cmd|bat)$/i.test(cmd) || !/\.[a-z0-9]+$/i.test(cmd)) {
                // For bare commands like 'claude', try to resolve to claude.ps1 first
                if (cmd === 'claude') {
                    try {
                        const result = execSync(`powershell.exe -NoProfile -Command "Get-Command claude.ps1 | Select-Object -ExpandProperty Source"`, { encoding: 'utf8' });
                        const ps1Path = result.trim();
                        args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path, ...baseArgs];
                        cmd = 'powershell.exe';
                        console.log('[CLAUDE] Resolved claude to PowerShell script:', ps1Path);
                    }
                    catch (e) {
                        console.warn('[CLAUDE] Could not resolve claude to PowerShell script, using shell execution');
                        useShell = true;
                    }
                }
                else {
                    useShell = true;
                }
            }
        }
        const defaultKey = (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.CLAUDE_API_KEY);
        console.log('[CLAUDE] starting', { cwd: absProjectDir, cmd });
        console.log('[CLAUDE] Full command args:', args);
        console.log('[CLAUDE] Complete command:', `${cmd} ${args.join(' ')}`);
        console.log('[CLAUDE] System prompt length:', systemArg.length);
        console.log('[CLAUDE] System prompt preview:', systemArg.substring(0, 200) + '...');
        console.log('[CLAUDE] User prompt:', userArg);
        console.log('[CLAUDE] API Key status:', defaultKey ? 'SET' : 'NOT SET');
        const childEnv = {
            ...process.env,
            CI: '1',
            NO_COLOR: '1',
            FORCE_COLOR: '0',
            CLONED_TEMPLATE_DIR: absProjectDir,
            puppeteer_API_KEY: process.env.puppeteer_API_KEY,
            puppeteer_PROJECT_ID: process.env.puppeteer_PROJECT_ID,
            // Ensure Claude CLI sees Anthropic-compatible creds (Moonshot Kimi K2, etc.)
            ANTHROPIC_API_KEY: defaultKey,
            CLAUDE_API_KEY: defaultKey,
            ANTHROPIC_AUTH_TOKEN: defaultKey,
            PEXELS_API_KEY: process.env.PEXELS_API_KEY
        };
        const child = spawn(cmd, args, {
            cwd: absProjectDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: useShell,
            env: childEnv
        });
        // Write the prompt to stdin and close it
        if (child.stdin) {
            console.log('[CLAUDE] Writing user prompt to stdin...');
            child.stdin.write(userArg);
            child.stdin.end();
            console.log('[CLAUDE] Prompt sent, waiting for response...');
        }
        let stderr = '';
        let stdout = '';
        const killTimer = setTimeout(() => {
            console.log('[CLAUDE] Timeout reached after 10 minutes, extracting any deployment info');
            clearTimeout(killTimer);
            // Try to extract deployment URLs from stdout before timing out
            const deploymentMatch = stdout.match(/https:\/\/\w+\.csb\.app/);
            const editorMatch = stdout.match(/https:\/\/codesandbox\.io\/s\/\w+/);
            console.log('[CLAUDE] Timeout - checking stdout for deployment info...');
            console.log('[CLAUDE] Stdout length:', stdout.length);
            console.log('[CLAUDE] Found deployment URL:', deploymentMatch?.[0] || 'none');
            console.log('[CLAUDE] Found editor URL:', editorMatch?.[0] || 'none');
            // Always resolve with what we have - let the caller handle the timeout
            resolve({
                code: 124, // timeout code  
                stderr,
                stdout,
                stdoutLen: stdout.length,
                stderrLen: stderr.length,
                timedOut: true
            });
        }, 600000);
        child.stdout.on('data', (d) => {
            const t = d.toString();
            stdout += t;
            // Show full output in real-time, line by line
            const lines = t.split('\n');
            lines.forEach((line) => {
                if (line.trim().length) {
                    console.log('[CLAUDE][stdout]', line);
                }
            });
        });
        child.stderr.on('data', (d) => {
            const t = d.toString();
            stderr += t;
            // Show full stderr output in real-time, line by line
            const lines = t.split('\n');
            lines.forEach((line) => {
                if (line.trim().length) {
                    console.warn('[CLAUDE][stderr]', line);
                }
            });
        });
        child.on('error', (err) => {
            clearTimeout(killTimer);
            if (err && (err.code === 'ENOENT' || err.errno === -4058)) {
                return reject(new Error(`Claude CLI not found (spawn ${cmd}). On Windows, set CLAUDE_BIN to full path of claude.cmd or ensure its folder is on PATH. Docs: https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-headless`));
            }
            console.error('[CLAUDE] Process error:', err);
            reject(err);
        });
        child.on('close', (code) => {
            clearTimeout(killTimer);
            console.log('[CLAUDE] finished', { code, stdoutLen: stdout.length, stderrLen: stderr.length });
            if (stderr)
                console.log('[CLAUDE] stderr content:', stderr.substring(0, 500));
            if (stdout)
                console.log('[CLAUDE] stdout preview:', stdout.substring(0, 500));
            // Handle null exit code as success (happens when process is terminated gracefully)
            if (code !== null && code !== 0)
                return reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
            // Return detailed result object
            resolve({
                code: code || 0,
                stderr,
                stdout,
                stdoutLen: stdout.length,
                stderrLen: stderr.length
            });
        });
    });
}
async function takeScreenshot(targetUrl) {
    console.log('Taking screenshot...');
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: '/usr/bin/google-chrome-stable',
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    // Navigate to intended URL
    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    }
    catch (networkError) {
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
                const doc = globalThis.document;
                const t = ((doc?.body?.innerText) || '').toLowerCase();
                return t.includes('codesandbox preview') && (t.includes('do you want to continue') || t.includes('proceed to preview'));
            });
            if (hasInterstitialText)
                interstitial = true;
        }
        catch { }
        if (interstitial) {
            console.log('[SCREENSHOT] Detected CodeSandbox interstitial, attempting bypass');
            // First try clicking the "Yes, proceed to preview" button/link
            const clicked = await page.evaluate(() => {
                const doc = globalThis.document;
                const anchors = Array.from(doc.querySelectorAll('a'));
                const yes = anchors.find(a => /proceed to preview/i.test((a.textContent || '')));
                if (yes) {
                    yes.click();
                    return true;
                }
                const buttons = Array.from(doc.querySelectorAll('button'));
                const btn = buttons.find(b => /proceed to preview/i.test((b.textContent || '')));
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
            if (clicked) {
                try {
                    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
                }
                catch { }
            }
            // If still on interstitial, try extracting the preview href and navigating
            const previewHref = await page.$$eval('a[href]', (as) => {
                const found = as.find((a) => /\.csb\.app/i.test(a.href));
                return found ? found.href : '';
            }).catch(() => '');
            if (previewHref) {
                try {
                    await page.goto(previewHref, { waitUntil: 'networkidle0', timeout: 60000 });
                }
                catch {
                    await page.goto(previewHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    }
    catch (e) {
        console.warn('[SCREENSHOT] Interstitial bypass failed:', e?.message || e);
    }
    // If CodeSandbox is still installing dependencies, wait until it's done
    async function waitUntilDependenciesInstalled(maxMs) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const installing = await page.evaluate(() => {
                const doc = globalThis.document;
                if (!doc || !doc.body)
                    return true;
                const text = ((doc.body.innerText || '').toLowerCase());
                const hasLoader = text.includes('installing dependencies');
                const hasOpenSandbox = text.includes('open sandbox');
                return hasLoader || hasOpenSandbox;
            });
            if (!installing)
                return true;
            console.log('[SCREENSHOT] CodeSandbox still installing, waiting 5s…');
            await new Promise(res => setTimeout(res, 5000));
            // Do a light reload every 20s to nudge progress/WS reconnects
            if ((Date.now() - start) % 20000 < 5000) {
                try {
                    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
                }
                catch { }
            }
        }
        return false;
    }
    const depsReady = await waitUntilDependenciesInstalled(180000); // up to 3 minutes
    if (!depsReady) {
        console.warn('[SCREENSHOT] Timed out waiting for dependencies to install; proceeding anyway');
    }
    // Wait for meaningful content to render (avoid blank screenshot)
    async function waitForMeaningfulContent(maxMs) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const hasContent = await page.evaluate(() => {
                const doc = globalThis.document;
                if (!doc || !doc.body)
                    return false;
                // Candidates for app roots
                const roots = ['#root', '#app', 'main', 'body'];
                for (const sel of roots) {
                    const el = doc.querySelector(sel);
                    if (el && el.getBoundingClientRect) {
                        const r = el.getBoundingClientRect();
                        if (r && r.width * r.height > 50000)
                            return true;
                    }
                }
                // Any large visible element
                const nodes = Array.from(doc.querySelectorAll('*'));
                for (const n of nodes) {
                    if (!n || !n.getBoundingClientRect)
                        continue;
                    const s = doc.defaultView.getComputedStyle(n);
                    if (!s || s.visibility === 'hidden' || s.display === 'none')
                        continue;
                    const r = n.getBoundingClientRect();
                    if (r && r.width * r.height > 50000)
                        return true;
                }
                // Any loaded image
                const imgs = Array.from(doc.images || []);
                if (imgs.some(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0))
                    return true;
                // Fallback: sufficient text content
                const textLen = ((doc.body.innerText || '').trim()).length;
                return textLen > 50;
            });
            if (hasContent)
                return true;
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
        }
        catch (e) {
            console.warn('[SCREENSHOT] Reload failed:', e?.message);
        }
    }
    // Final small settle to ensure painting
    await page.evaluate(() => new Promise(r => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(r))));
    // Wait a bit for any animations to settle
    await new Promise(res => setTimeout(res, 1000));
    let screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
    // If image is suspiciously small (possibly blank), retry once after short wait
    if (!screenshotBuffer || screenshotBuffer.length < 1000) {
        await new Promise(res => setTimeout(res, 2000));
        screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
    }
    await browser.close();
    console.log('Screenshot taken successfully.');
    return screenshotBuffer;
}
// deployToCodeSandbox function is now imported from ./deploy-codesandbox.js
async function hashDirectory(root) {
    async function walk(dir, prefix = '') {
        const out = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const ent of entries) {
            if (ent.name === 'node_modules' || ent.name === '.git')
                continue;
            const abs = path.join(dir, ent.name);
            const rel = path.join(prefix, ent.name).replace(/\\/g, '/');
            if (ent.isDirectory())
                out.push(...(await walk(abs, rel)));
            else
                out.push({ rel, abs });
        }
        return out;
    }
    const files = await walk(root);
    const map = new Map();
    for (const f of files) {
        const buf = await fs.readFile(f.abs);
        const sha = crypto.createHash('sha1').update(buf).digest('hex');
        map.set(f.rel, sha);
    }
    return map;
}
function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_VERIFY_TOKEN) {
    throw new Error('Missing WhatsApp env vars');
}
// Removed direct deploy helpers; MCP server handles deployment
async function buildAndDeployFromPrompt(nlPrompt, whatsappFrom) {
    const mappedUser = getUserByWhatsApp(whatsappFrom);
    let userId = 'dev-user';
    if (mappedUser?.email) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { data: user, error } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', mappedUser.email)
                    .single();
                if (!error && user?.id) {
                    userId = user.id;
                }
            }
            catch (e) {
                console.warn('[SUPABASE] resolve uuid failed:', e.message);
            }
        }
    }
    if (!isValidUuid(userId)) {
        const fallback = process.env.DEFAULT_USER_ID;
        if (fallback && isValidUuid(fallback))
            userId = fallback;
    }
    if (!isValidUuid(userId)) {
        return { text: 'Por favor, faça /login para atribuirmos créditos, ou configure DEFAULT_USER_ID (UUID) no servidor.' };
    }
    const dirFromEnv = process.env.CLONED_TEMPLATE_DIR;
    if (!dirFromEnv)
        return { text: '⚠️ Projeto não inicializado. Faça /login para criar o projeto a partir do template.' };
    const dir = dirFromEnv;
    try {
        const st = await fs.stat(dir);
        if (!st.isDirectory())
            throw new Error('not dir');
    }
    catch {
        return { text: '⚠️ Projeto ausente. Use /login ou peça project_reset para recriar a pasta.' };
    }
    const system = `
		Você é um gerador de código focado em React + Tailwind para criar sites profissionais e modernos.
		
		STACK (fixo):
		- React + Tailwind CSS + DaisyUI + Framer Motion + GSAP
		- Use exclusivamente classes utilitárias do Tailwind para layout e estilos.
		- IMPORTANTE: Não importe tailwind no index.css nem daisy, já estao importados com cdn no index.html
		- CRUCIAL: Visite o site https://daisyui.com/components/ para encontrar os componentes (Hero, Navbar, Footer, etc)
		- COMPONENTES DA DAISYUI:
			- Accordion (https://daisyui.com/components/accordion/)
				<div className="collapse collapse-arrow bg-base-100 border border-base-300">
					<input type="radio" name="my-accordion-2" defaultChecked />
						<div className="collapse-title font-semibold">How do I create an account?</div>
						<div className="collapse-content text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</div>
					</div>
					<div className="collapse collapse-arrow bg-base-100 border border-base-300">
						<input type="radio" name="my-accordion-2" />
						<div className="collapse-title font-semibold">I forgot my password. What should I do?</div>
					<div className="collapse-content text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</div>
					</div>
						<div className="collapse collapse-arrow bg-base-100 border border-base-300">
						<input type="radio" name="my-accordion-2" />
						<div className="collapse-title font-semibold">How do I update my profile information?</div>
					<div className="collapse-content text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</div>
				</div>
			- Alert (https://daisyui.com/components/alert/)
				<div role="alert" className="alert alert-info">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span>New software update available.</span>
				</div>
			- Avatar (https://daisyui.com/components/avatar/)
				<div className="avatar">
					<div className="w-24 rounded">
						<img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" />
					</div>
				</div>
			- Badge (https://daisyui.com/components/badge/)
				<span className="badge">Badge</span>
			- Breadcrumb (https://daisyui.com/components/breadcrumb/)
				<div className="breadcrumbs text-sm">
					<ul>
						<li><a>Home</a></li>
						<li><a>Documents</a></li>
						<li>Add Document</li>
					</ul>
				</div>
			- Button (https://daisyui.com/components/button/)
				Button

				<button className="btn">Default</button>

				Button sizes

				<button className="btn btn-xs">Xsmall</button>
				<button className="btn btn-sm">Small</button>
				<button className="btn">Medium</button>
				<button className="btn btn-lg">Large</button>
				<button className="btn btn-xl">Xlarge</button>

				Responsive button
				This button will have different sizes on different browser viewpoints

				<button className="btn btn-xs sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl">Responsive</button>

				Buttons colors

				<button className="btn btn-neutral px-4">Neutral</button>
				<button className="btn btn-primary px-4">Primary</button>
				<button className="btn btn-secondary px-4">Secondary</button>
				<button className="btn btn-accent px-4">Accent</button>
				<button className="btn btn-info px-4">Info</button>
				<button className="btn btn-success px-4">Success</button>
				<button className="btn btn-warning px-4">Warning</button>
				<button className="btn btn-error px-4">Error</button>

				Soft buttons

				<button className="btn btn-soft px-4">Default</button>
				<button className="btn btn-soft btn-primary px-4">Primary</button>
				<button className="btn btn-soft btn-secondary px-4">Secondary</button>
				<button className="btn btn-soft btn-accent px-4">Accent</button>
				<button className="btn btn-soft btn-info px-4">Info</button>
				<button className="btn btn-soft btn-success px-4">Success</button>
				<button className="btn btn-soft btn-warning px-4">Warning</button>
				<button className="btn btn-soft btn-error px-4">Error</button>

				Outline buttons

				<button className="btn btn-outline px-4">Default</button>
				<button className="btn btn-outline btn-primary px-4">Primary</button>
				<button className="btn btn-outline btn-secondary px-4">Secondary</button>
				<button className="btn btn-outline btn-accent px-4">Accent</button>
				<button className="btn btn-outline btn-info px-4">Info</button>
				<button className="btn btn-outline btn-success px-4">Success</button>
				<button className="btn btn-outline btn-warning px-4">Warning</button>
				<button className="btn btn-outline btn-error px-4">Error</button>

				Dash buttons

				<button className="btn btn-dash px-4">Default</button>
				<button className="btn btn-dash btn-primary px-4">Primary</button>
				<button className="btn btn-dash btn-secondary px-4">Secondary</button>
				<button className="btn btn-dash btn-accent px-4">Accent</button>
				<button className="btn btn-dash btn-info px-4">Info</button>
				<button className="btn btn-dash btn-success px-4">Success</button>
				<button className="btn btn-dash btn-warning px-4">Warning</button>
				<button className="btn btn-dash btn-error px-4">Error</button>

				neutral button with outline or dash style
				These buttons use dark text, only use them on light backgrounds

				<div className="bg-white p-6">
				<button className="btn btn-neutral btn-outline px-4">Outline</button>
				<button className="btn btn-neutral btn-dash px-4">Dash</button>
				</div>

				Active buttons

				<button className="btn btn-active px-4">Default</button>
				<button className="btn btn-active btn-primary px-4">Primary</button>
				<button className="btn btn-active btn-secondary px-4">Secondary</button>
				<button className="btn btn-active btn-accent px-4">Accent</button>
				<button className="btn btn-active btn-info px-4">Info</button>
				<button className="btn btn-active btn-success px-4">Success</button>
				<button className="btn btn-active btn-warning px-4">Warning</button>
				<button className="btn btn-active btn-error px-4">Error</button>

				Buttons ghost and button link

				<button className="btn btn-ghost px-4">Ghost</button>
				<button className="btn btn-link px-4">Link</button>

				Wide button

				<button className="btn btn-wide px-4">Wide</button>

				Buttons with any HTML tags

				<a role="button" className="btn">Link</a>
				<button type="submit" className="btn px-4">Button</button>
				<input type="button" value="Input" className="btn" />
				<input type="submit" value="Submit" className="btn" />
				<input type="radio" aria-label="Radio" className="btn" />
				<input type="checkbox" aria-label="Checkbox" className="btn" />
				<input type="reset" value="Reset" className="btn" />

				Disabled buttons

				<button className="btn px-4" disabled="disabled">Disabled using attribute</button>
				<button className="btn btn-disabled px-4" tabIndex="-1" role="button" aria-disabled="true">
				Disabled using class name
				</button>

				Square button and circle button
				square aspect ratio or with rounded corners

				<button className="btn btn-square">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-[1.2em]"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
				</button>
				<button className="btn btn-circle">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-[1.2em]"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
				</button>

				Button with Icon

				<button className="btn">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-[1.2em]"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
				Like
				</button>
				<button className="btn">
				Like
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-[1.2em]"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
				</button>

				Button block

				<button className="btn btn-block">block</button>

				Button with loading spinner

				<button className="btn btn-square">
				<span className="loading loading-spinner"></span>
				</button>

				<button className="btn">
				<span className="loading loading-spinner"></span>
				loading
				</button>

				Login buttons

				{/* Email */}
				<button className="btn bg-white text-black border-[#e5e5e5]">
				<svg aria-label="Email icon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="black"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></g></svg>
				Login with Email
				</button>

				{/* GitHub */}
				<button className="btn bg-black text-white border-black">
				<svg aria-label="GitHub logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"></path></svg>
				Login with GitHub
				</button>

				{/* Google */}
				<button className="btn bg-white text-black border-[#e5e5e5]">
				<svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
				Login with Google
				</button>

				{/* Facebook */}
				<button className="btn bg-[#1A77F2] text-white border-[#005fd8]">
				<svg aria-label="Facebook logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="M8 12h5V8c0-6 4-7 11-6v5c-4 0-5 0-5 3v2h5l-1 6h-4v12h-6V18H8z"></path></svg>
				Login with Facebook
				</button>

				{/* X */}
				<button className="btn bg-black text-white border-black">
				<svg aria-label="X logo" width="16" height="12" viewBox="0 0 300 271" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="m236 0h46l-101 115 118 156h-92.6l-72.5-94.8-83 94.8h-46l107-123-113-148h94.9l65.5 86.6zm-16.1 244h25.5l-165-218h-27.4z"/></svg>
				Login with X
				</button>

				{/* Kakao */}
				<button className="btn bg-[#FEE502] text-[#181600] border-[#f1d800]">
				<svg aria-label="Kakao logo" width="16" height="16" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#181600" d="M255.5 48C299.345 48 339.897 56.5332 377.156 73.5996C414.415 90.666 443.871 113.873 465.522 143.22C487.174 172.566 498 204.577 498 239.252C498 273.926 487.174 305.982 465.522 335.42C443.871 364.857 414.46 388.109 377.291 405.175C340.122 422.241 299.525 430.775 255.5 430.775C241.607 430.775 227.262 429.781 212.467 427.795C148.233 472.402 114.042 494.977 109.892 495.518C107.907 496.241 106.012 496.15 104.208 495.248C103.486 494.706 102.945 493.983 102.584 493.08C102.223 492.177 102.043 491.365 102.043 490.642V489.559C103.126 482.515 111.335 453.169 126.672 401.518C91.8486 384.181 64.1974 361.2 43.7185 332.575C23.2395 303.951 13 272.843 13 239.252C13 204.577 23.8259 172.566 45.4777 143.22C67.1295 113.873 96.5849 90.666 133.844 73.5996C171.103 56.5332 211.655 48 255.5 48Z"></path></svg>
				카카오 로그인
				</button>

				{/* Apple */}
				<button className="btn bg-black text-white border-black">
				<svg aria-label="Apple logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1195 1195"><path fill="white" d="M1006.933 812.8c-32 153.6-115.2 211.2-147.2 249.6-32 25.6-121.6 25.6-153.6 6.4-38.4-25.6-134.4-25.6-166.4 0-44.8 32-115.2 19.2-128 12.8-256-179.2-352-716.8 12.8-774.4 64-12.8 134.4 32 134.4 32 51.2 25.6 70.4 12.8 115.2-6.4 96-44.8 243.2-44.8 313.6 76.8-147.2 96-153.6 294.4 19.2 403.2zM802.133 64c12.8 70.4-64 224-204.8 230.4-12.8-38.4 32-217.6 204.8-230.4z"></path></svg>
				Login with Apple
				</button>

				{/* Amazon */}
				<button className="btn bg-[#FF9900] text-black border-[#e17d00]">
				<svg aria-label="Amazon logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="black"><path d="M14.463 13.831c-1.753 1.294-4.291 1.981-6.478 1.981-3.066 0-5.825-1.131-7.912-3.019-.163-.147-.019-.35.178-.234 2.253 1.313 5.041 2.1 7.919 2.1 1.941 0 4.075-.403 6.041-1.238.294-.125.544.197.253.409z"></path><path d="M15.191 13c-.225-.287-1.481-.137-2.047-.069-.172.019-.197-.128-.044-.238 1.003-.703 2.647-.5 2.838-.266.194.238-.05 1.884-.991 2.672-.144.122-.281.056-.219-.103.216-.528.688-1.709.463-1.997zM11.053 11.838l.003.003c.387-.341 1.084-.95 1.478-1.278.156-.125.128-.334.006-.509-.353-.488-.728-.884-.728-1.784v-3c0-1.272.088-2.438-.847-3.313-.738-.706-1.963-.956-2.9-.956-1.831 0-3.875.684-4.303 2.947-.047.241.131.369.287.403l1.866.203c.175-.009.3-.181.334-.356.159-.778.813-1.156 1.547-1.156.397 0 .847.144 1.081.5.269.397.234.938.234 1.397v.25c-1.116.125-2.575.206-3.619.666-1.206.522-2.053 1.584-2.053 3.147 0 2 1.259 3 2.881 3 1.369 0 2.116-.322 3.172-1.403.35.506.463.753 1.103 1.284a.395.395 0 0 0 .456-.044zm-1.94-4.694c0 .75.019 1.375-.359 2.041-.306.544-.791.875-1.331.875-.737 0-1.169-.563-1.169-1.394 0-1.641 1.472-1.938 2.863-1.938v.416z"></path></g></svg>
				Login with Amazon
				</button>

				{/* Microsoft */}
				<button className="btn bg-[#2F2F2F] text-white border-black">
				<svg aria-label="Microsoft logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M96 96H247V247H96" fill="#f24f23"></path><path d="M265 96V247H416V96" fill="#7eba03"></path><path d="M96 265H247V416H96" fill="#3ca4ef"></path><path d="M265 265H416V416H265" fill="#f9ba00"></path></svg>
				Login with Microsoft
				</button>

				{/* Line */}
				<button className="btn bg-[#03C755] text-white border-[#00b544]">
				<svg aria-label="Line logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fillRule="evenodd" strokeLinejoin="round" fill="white"><path fillRule="nonzero" d="M12.91 6.57c.232 0 .42.19.42.42 0 .23-.188.42-.42.42h-1.17v.75h1.17a.42.42 0 1 1 0 .84h-1.59a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42h1.59a.42.42 0 0 1-.002.84h-1.17v.75h1.17zm-2.57 2.01a.421.421 0 0 1-.757.251l-1.63-2.217V8.58a.42.42 0 0 1-.42.42.42.42 0 0 1-.418-.42V5.4a.418.418 0 0 1 .755-.249L9.5 7.366V5.4c0-.23.188-.42.42-.42.23 0 .42.19.42.42v3.18zm-3.828 0c0 .23-.188.42-.42.42a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42.23 0 .418.19.418.42v3.18zM4.868 9h-1.59c-.23 0-.42-.19-.42-.42V5.4c0-.23.19-.42.42-.42.232 0 .42.19.42.42v2.76h1.17a.42.42 0 1 1 0 .84M16 6.87C16 3.29 12.41.376 8 .376S0 3.29 0 6.87c0 3.208 2.846 5.896 6.69 6.405.26.056.615.172.705.394.08.2.053.518.026.722 0 0-.092.565-.113.685-.035.203-.16.79.693.432.854-.36 4.607-2.714 6.285-4.646C15.445 9.594 16 8.302 16 6.87"></path></g></svg>
				LINEでログイン
				</button>

				{/* Slack */}
				<button className="btn bg-[#622069] text-white border-[#591660]">
				<svg aria-label="Slack logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g strokeLinecap="round" strokeWidth="78"><path stroke="#36c5f0" d="m110 207h97m0-97h.1v-.1"></path><path stroke="#2eb67d" d="m305 110v97m97 0v.1h.1"></path><path stroke="#ecb22e" d="m402 305h-97m0 97h-.1v.1"></path><path stroke="#e01e5a" d="M110 305h.1v.1m97 0v97"></path></g></svg>
				Login with Slack
				</button>

				{/* LinkedIn */}
				<button className="btn bg-[#0967C2] text-white border-[#0059b3]">
				<svg aria-label="LinkedIn logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="M26.111,3H5.889c-1.595,0-2.889,1.293-2.889,2.889V26.111c0,1.595,1.293,2.889,2.889,2.889H26.111c1.595,0,2.889-1.293,2.889-2.889V5.889c0-1.595-1.293-2.889-2.889-2.889ZM10.861,25.389h-3.877V12.87h3.877v12.519Zm-1.957-14.158c-1.267,0-2.293-1.034-2.293-2.31s1.026-2.31,2.293-2.31,2.292,1.034,2.292,2.31-1.026,2.31-2.292,2.31Zm16.485,14.158h-3.858v-6.571c0-1.802-.685-2.809-2.111-2.809-1.551,0-2.362,1.048-2.362,2.809v6.571h-3.718V12.87h3.718v1.686s1.118-2.069,3.775-2.069,4.556,1.621,4.556,4.975v7.926Z" fillRule="evenodd"></path></svg>
				Login with LinkedIn
				</button>

				{/* VK */}
				<button className="btn bg-[#47698F] text-white border-[#35567b]">
				<svg aria-label="VK logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2240 2240"><g fill="white"><path d="M2077 904q23 64-150 294-24 32-65 85-78 100-90 131-17 41 14 81 17 21 81 82h1l1 1 1 1 2 2q141 131 191 221 3 5 6.5 12.5t7 26.5-.5 34-25 27.5-59 12.5l-256 4q-24 5-56-5t-52-22l-20-12q-30-21-70-64t-68.5-77.5-61-58-56.5-15.5q-3 1-8 3.5t-17 14.5-21.5 29.5-17 52-6.5 77.5q0 15-3.5 27.5t-7.5 18.5l-4 5q-18 19-53 22h-115q-71 4-146-16.5t-131.5-53-103-66T648 1722l-25-24q-10-10-27.5-30t-71.5-91-106-151-122.5-211T165 943q-6-16-6-27t3-16l4-6q15-19 57-19l274-2q12 2 23 6.5t16 8.5l5 3q16 11 24 32 20 50 46 103.5t41 81.5l16 29q29 60 56 104t48.5 68.5T814 1348t34 14 27-5q2-1 5-5t12-22 13.5-47 9.5-81 0-125q-2-40-9-73t-14-46l-6-12q-25-34-85-43-13-2 5-24 17-19 38-30 53-26 239-24 82 1 135 13 20 5 33.5 13.5t20.5 24 10.5 32 3.5 45.5-1 55-2.5 70.5-1.5 82.5q0 11-1 42t-.5 48 3.5 40.5 11.5 39 22.5 24.5q8 2 17 4t26-11 38-34.5 52-67 68-107.5q60-104 107-225 4-10 10-17.5t11-10.5l4-3 5-2.5 13-3 20-.5 288-2q39-5 64 2.5t31 16.5z"></path></g></svg>
				Login with VK
				</button>

				{/* WeChat */}
				<button className="btn bg-[#5EBB2B] text-white border-[#4eaa0c]">
				<svg aria-label="WeChat logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="white"><path d="M11.606,3.068C5.031,3.068,0,7.529,0,12.393s4.344,7.681,4.344,7.681l-.706,2.676c-.093,.353,.284,.644,.602,.464l3.173-1.798c1.403,.447,4.381,.59,4.671,.603-.208-.721-.311-1.432-.311-2.095,0-3.754,3.268-9.04,10.532-9.04,.165,0,.331,.004,.496,.011-.965-4.627-5.769-7.827-11.195-7.827Zm-4.327,7.748c-.797,0-1.442-.646-1.442-1.442s.646-1.442,1.442-1.442,1.442,.646,1.442,1.442-.646,1.442-1.442,1.442Zm8.386,0c-.797,0-1.442-.646-1.442-1.442s.646-1.442,1.442-1.442,1.442,.646,1.442,1.442-.646,1.442-1.442,1.442Z"></path><path d="M32,19.336c0-4.26-4.998-7.379-9.694-7.379-6.642,0-9.459,4.797-9.459,7.966s2.818,7.966,9.459,7.966c1.469,0,2.762-.211,3.886-.584l2.498,1.585c.197,.125,.447-.052,.394-.279l-.567-2.46c2.36-1.643,3.483-4.234,3.483-6.815Zm-12.73-.81c-.704,0-1.275-.571-1.275-1.275s.571-1.275,1.275-1.275,1.275,.571,1.275,1.275c0,.705-.571,1.275-1.275,1.275Zm6.373,0c-.704,0-1.275-.571-1.275-1.275s.571-1.275,1.275-1.275,1.275,.571,1.275,1.275-.571,1.275-1.275,1.275Z"></path></g></svg>
				Login with WeChat
				</button>

				{/* Metamask */}
				<button className="btn  bg-white text-black border-[#e5e5e5]">
				<svg aria-label="MetaMask logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.83 470.86"><defs><style>.b,.c,.d,.e,.f,.g,.j{strokeLinecap:round;strokeLinejoin:round}.b{fill:#e4761b;stroke:#e4761b}.c{fill:#d7c1b3;stroke:#d7c1b3}.d{fill:#233447;stroke:#233447}.e{fill:#cd6116;stroke:#cd6116}.f{fill:#e4751f;stroke:#e4751f}.g{fill:#f6851b;stroke:#f6851b}.j{fill:#763d16;stroke:#763d16}</style></defs><path d="M482.09.5 284.32 147.38l36.58-86.66z" style="fill:#e2761b;stroke:#e2761b;strokeLinecap:round;strokeLinejoin:round"/><path d="m25.54.5 196.18 148.27-34.79-88.05zM410.93 340.97l-52.67 80.7 112.7 31 32.4-109.91zM4.67 342.76l32.2 109.91 112.7-31-52.67-80.7z" className="b"/><path d="m143.21 204.62-31.41 47.51 111.9 4.97-3.97-120.25zM364.42 204.62l-77.51-69.16-2.59 121.64 111.71-4.97zM149.57 421.67l67.18-32.8-58.04-45.32zM290.88 388.87l67.38 32.8-9.34-78.12z" className="b"/><path d="m358.26 421.67-67.38-32.8 5.37 43.93-.6 18.48zM149.57 421.67l62.61 29.61-.4-18.48 4.97-43.93z" className="c"/><path d="m213.17 314.54-56.05-16.5 39.55-18.09zM294.46 314.54l16.5-34.59 39.75 18.09z" className="d"/><path d="m149.57 421.67 9.54-80.7-62.21 1.79zM348.72 340.97l9.54 80.7 52.67-78.91zM396.03 252.13l-111.71 4.97 10.34 57.44 16.5-34.59 39.75 18.09zM157.12 298.04l39.75-18.09 16.3 34.59 10.53-57.44-111.9-4.97z" className="e"/><path d="m111.8 252.13 46.91 91.42-1.59-45.51zM350.91 298.04l-1.99 45.51 47.11-91.42zM223.7 257.1l-10.53 57.44 13.12 67.77 2.98-89.24zM284.32 257.1l-5.36 35.77 2.38 89.44 13.32-67.77z" className="f"/><path d="m294.66 314.54-13.32 67.77 9.54 6.56 58.04-45.32 1.99-45.51zM157.12 298.04l1.59 45.51 58.04 45.32 9.54-6.56-13.12-67.77z" className="g"/><path d="m295.65 451.28.6-18.48-4.97-4.38h-74.93l-4.57 4.38.4 18.48-62.61-29.61 21.86 17.88 44.32 30.81h76.13l44.52-30.81 21.86-17.88z" style="strokeLinecap:round;strokeLinejoin:round;fill:#c0ad9e;stroke:#c0ad9e"/><path d="m290.88 388.87-9.54-6.56h-55.05l-9.54 6.56-4.97 43.93 4.57-4.38h74.93l4.97 4.38z" style="strokeLinecap:round;strokeLinejoin:round;fill:#161616;stroke:#161616"/><path d="m490.44 156.92 16.89-81.09L482.09.5 290.88 142.41l73.54 62.21 103.95 30.41 23.06-26.83-9.94-7.15 15.9-14.51-12.32-9.54 15.9-12.13zM.5 75.83l16.89 81.09-10.73 7.95L22.56 177l-12.12 9.54 15.9 14.51-9.94 7.15 22.86 26.83 103.95-30.41 73.54-62.21L25.54.5z" className="j"/><path d="m468.37 235.03-103.95-30.41 31.61 47.51-47.11 91.42 62.01-.79h92.43zM143.21 204.62 39.26 235.03 4.67 342.76H96.9l61.81.79-46.91-91.42zM284.32 257.1l6.56-114.69 30.22-81.69H186.93l29.82 81.69 6.95 114.69 2.39 36.17.2 89.04h55.05l.4-89.04z" className="g"/></svg>
				Login with MetaMask
				</button>
			- Calendar (https://daisyui.com/components/calendar/)
				<calendar-date class="cally bg-base-100 border border-base-300 shadow-lg rounded-box">
					<svg aria-label="Previous" className="fill-current size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
					<svg aria-label="Next" className="fill-current size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
					<calendar-month></calendar-month>
				</calendar-date>
			- Card (https://daisyui.com/components/card/)
				<div className="card w-96 bg-base-100 shadow-xl">
					<div className="card-body">
						<h2 className="card-title">Shoes!</h2>
						<p>If a dog chews shoes whose shoes does he choose?</p>
						<div className="card-actions justify-end">
							<button className="btn btn-primary px-4">Buy Now</button>
						</div>
					</div>
				</div>
			- Carousel (https://daisyui.com/components/carousel/)
				<div className="carousel carousel-center rounded-box">
					<div className="carousel-item">
						<img src="https://daisyui.com/images/stock/photo-1534361960057-19889db9621e.webp" />
					</div> 
					<div className="carousel-item">
						<img src="https://daisyui.com/images/stock/photo-1534361960057-19889db9621e.webp" />
					</div> 
					<div className="carousel-item">
						<img src="https://daisyui.com/images/stock/photo-1534361960057-19889db9621e.webp" />
					</div> 
				</div>
			- Chat bubble (https://daisyui.com/components/chat-bubble/)
				<div className="chat chat-start">
					<div className="chat-header">
						Tom
					</div>
					<div className="chat-bubble">I can also be sent as an SMS!</div>
				</div>
				<div className="chat chat-end">
					<div className="chat-header">
						Jerry
					</div>
					<div className="chat-bubble">I can also be sent as an SMS!</div>
				</div>
			- Checkbox (https://daisyui.com/components/checkbox/)
				<div className="form-control">
					<label className="label cursor-pointer">
						<input type="checkbox" className="checkbox" />
						<span className="label-text">Remember me</span>
					</label>
				</div>
			- Collapse (https://daisyui.com/components/collapse/)
				<div className="collapse collapse-arrow bg-base-100 border border-base-300">
					<input type="radio" name="my-accordion-2" defaultChecked />
					<div className="collapse-title font-semibold">How do I create an account?</div>
					<div className="collapse-content text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</div>
				</div>
				<div className="collapse collapse-arrow bg-base-100 border border-base-300">
					<input type="radio" name="my-accordion-2" />
					<div className="collapse-title font-semibold">I forgot my password. What should I do?</div>
					<div className="collapse-content text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</div>
				</div>
				<div className="collapse collapse-arrow bg-base-100 border border-base-300">
					<input type="radio" name="my-accordion-2" />
					<div className="collapse-title font-semibold">How do I update my profile information?</div>
					<div className="collapse-content text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</div>
				</div>
			- Diff (https://daisyui.com/components/diff/)
				<diff>
					<div className="diff-wrapper">
						<div className="diff-line">
						<span className="diff-insert">This line has been added.</span>
						</div>
						<div className="diff-line">
						<span className="diff-delete">This line has been removed.</span>
						</div>
					</div>
				</diff>
			- Divider (https://daisyui.com/components/divider/)
				<div className="divider">OR</div>
			- Dock (https://daisyui.com/components/dock/)
				<div className="dock">
					<div className="dock-item">
						<a href="#">
							<img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" />
						</a>
					</div>
				</div>
			- Drawer (https://daisyui.com/components/drawer/)
				<div className="drawer">
					<input id="my-drawer" type="checkbox" className="drawer-toggle" />
					<div className="drawer-content">
						<!-- Page content -->
					</div>
					<div className="drawer-side">
						<label htmlFor="my-drawer" className="drawer-overlay"></label>
						<ul className="menu p-4 w-80 bg-base-100">
							<!-- Sidebar content -->
						</ul>
					</div>
				</div>
			- Dropdown (https://daisyui.com/components/dropdown/)
				<div className="dropdown dropdown-hover">
					<label tabIndex={0} className="btn m-1">Click</label>
					<ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box">
						<li><a>Item 1</a></li>
						<li><a>Item 2</a></li>
					</ul>
				</div>
			- Fieldset (https://daisyui.com/components/fieldset/)
				<fieldset className="fieldset">
					<legend className="fieldset-legend">Legend</legend>
					<div className="fieldset-content">
						<input type="checkbox" className="checkbox" />
						<label className="label">Option 1</label>
					</div>
				</fieldset>
			- File Input (https://daisyui.com/components/file-input/)
				<input type="file" className="file-input" />
			- Filter (https://daisyui.com/components/filter/)
				<div className="filter">
					<input type="text" placeholder="Search" className="filter-input" />
				</div>
			- Footer (https://daisyui.com/components/footer/)
				<footer className="footer">
					<div className="footer-content">
						<p>Copyright 2021</p>
					</div>
				</footer>
			- Hero (https://daisyui.com/components/hero/)
				<div className="hero min-h-screen" style={{ backgroundImage: 'url(https://placeimg.com/1000/400/arch)' }}>
					<div className="hero-overlay bg-opacity-60"></div>
					<div className="hero-content text-center text-neutral-content">
						<div className="max-w-md">
							<h1 className="mb-5 text-5xl font-bold">Hello there</h1>
							<p className="mb-5">Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem quasi. In deleniti eaque aut repudiandae et a id nisi.</p>
							<button className="btn btn-primary">Get Started</button>
						</div>
					</div>
				</div>
			- Indicator (https://daisyui.com/components/indicator/)
				<div className="indicator">
					<span className="indicator-item badge badge-primary">New</span>
					<span className="indicator-item badge badge-secondary">Top</span>
					<button className="btn">Notifications</button>
				</div>
			- Text Input (https://daisyui.com/components/text-input/)
				<input type="text" placeholder="Email" className="input input-bordered w-full max-w-xs" />
			- Join (https://daisyui.com/components/join/)
				<div className="join">
					<button className="join-item btn">«</button>
					<button className="join-item btn">Page 2</button>
					<button className="join-item btn">»</button>
				</div>
			- Kbd (https://daisyui.com/components/kbd/)
				<kbd>⌘</kbd> + <kbd>P</kbd>
			- Label (https://daisyui.com/components/label/)
				<label className="label">
					<span className="label-text">Email</span>
				</label>
				<input type="email" placeholder="Email" className="input input-bordered w-full max-w-xs" />
			- Link (https://daisyui.com/components/link/)
				<a href="#" className="link link-primary">Click me</a>
			- List (https://daisyui.com/components/list/)
				<ul className="list-decimal">
					<li>Item 1</li>
					<li>Item 2</li>
					<li>Item 3</li>
				</ul>
			- Loading (https://daisyui.com/components/loading/)
				<div className="loading"></div>
			- Mask (https://daisyui.com/components/mask/)
				<div className="mask">
					<img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" />
				</div>
			- Menu (https://daisyui.com/components/menu/)
				<div className="menu">
					<a href="#">Item 1</a>
					<a href="#">Item 2</a>
					<a href="#">Item 3</a>
				</div>
			- Browser mockup (https://daisyui.com/components/browser-mockup/)
				<div className="browser-mockup">
					<div className="browser-mockup-frame">
						<div className="browser-mockup-browser">
							<div className="browser-mockup-browser-bar">
								<div className="browser-mockup-browser-bar-item"></div>
							</div>
						</div>
					</div>
				</div>
			- Code mockup (https://daisyui.com/components/code-mockup/)
				<div className="code-mockup">
					<div className="code-mockup-frame">
						<div className="code-mockup-browser">
							<div className="code-mockup-browser-bar">
								<div className="code-mockup-browser-bar-item"></div>
							</div>
						</div>
					</div>
				</div>
			- Phone mockup (https://daisyui.com/components/phone-mockup/)
				<div className="phone-mockup">
					<div className="phone-mockup-frame">
						<div className="phone-mockup-browser">
							<div className="phone-mockup-browser-bar">
								<div className="phone-mockup-browser-bar-item"></div>
							</div>
						</div>
					</div>
				</div>
			- Window mockup (https://daisyui.com/components/window-mockup/)
				<div className="window-mockup">
					<div className="window-mockup-frame">
						<div className="window-mockup-browser">
							<div className="window-mockup-browser-bar">
								<div className="window-mockup-browser-bar-item"></div>
							</div>
						</div>
					</div>
				</div>
			- Modal (https://daisyui.com/components/modal/)
				<div className="modal">
					<div className="modal-box">
						<h3 className="font-bold text-lg">Hello!</h3>
						<p className="py-4">Press ESC key or click the button below to close</p>
						<div className="modal-action">
							<button className="btn">Close</button>
						</div>
					</div>
				</div>
			- Navbar (https://daisyui.com/components/navbar/)
				<div className="navbar bg-base-100 shadow-sm">
					<div className="navbar-start">
						<div className="dropdown">
						<div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /> </svg>
						</div>
						<ul
							tabIndex={0}
							className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
							<li><a>Homepage</a></li>
							<li><a>Portfolio</a></li>
							<li><a>About</a></li>
						</ul>
						</div>
					</div>
					<div className="navbar-center">
						<a className="btn btn-ghost text-xl">daisyUI</a>
					</div>
					<div className="navbar-end">
						<button className="btn btn-ghost btn-circle">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> </svg>
						</button>
						<button className="btn btn-ghost btn-circle">
						<div className="indicator">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> </svg>
							<span className="badge badge-xs badge-primary indicator-item"></span>
						</div>
						</button>
					</div>
				</div>
			- Pagination (https://daisyui.com/components/pagination/)
				<div className="pagination">
					<a className="btn">«</a>
					<a className="btn">Page 2</a>
					<a className="btn">»</a>
				</div>
			- Progress (https://daisyui.com/components/progress/)
				<div className="progress progress-primary w-56"></div>
			- Radio progress (https://daisyui.com/components/radio-progress/)
				<div className="radio-progress">
					<input type="radio" name="radio-1" className="radio" />
					<input type="radio" name="radio-1" className="radio" checked />
					<input type="radio" name="radio-1" className="radio" disabled />
				</div>
			- Radio (https://daisyui.com/components/radio/)
				<div className="radio">
					<input type="radio" name="radio-1" className="radio" />
					<label className="label">
						<span className="label-text">Radio</span>
					</label>
				</div>
			- Range slider (https://daisyui.com/components/range-slider/)
				<div className="range-slider">
					<input type="range" min="0" max="100" className="range" />
				</div>
			- Rating (https://daisyui.com/components/rating/)
				<div className="rating">
					<input type="radio" name="rating-1" className="mask mask-heart" />
					<input type="radio" name="rating-1" className="mask mask-heart" checked />
					<input type="radio" name="rating-1" className="mask mask-heart" disabled />
				</div>
			- Select (https://daisyui.com/components/select/)
				<select className="select select-bordered">
					<option disabled selected>Open this select menu</option>
					<option>Option 1</option>
					<option>Option 2</option>
					<option>Option 3</option>
				</select>
			- Skeleton (https://daisyui.com/components/skeleton/)
				<div className="skeleton skeleton-text"></div>
			- Stack (https://daisyui.com/components/stack/)
				<div className="stack">
					<div className="stack-item">Item 1</div>
					<div className="stack-item">Item 2</div>
					<div className="stack-item">Item 3</div>
				</div>
			- Stat (https://daisyui.com/components/stat/)
				<div className="stat">
					<div className="stat-title">Stat Title</div>
					<div className="stat-value">100</div>
					<div className="stat-desc">Stat Description</div>
				</div>
			- Status (https://daisyui.com/components/status/)
				<div className="status">
					<div className="status-title">Status Title</div>
					<div className="status-value">100</div>
					<div className="status-desc">Status Description</div>
				</div>
			- Steps (https://daisyui.com/components/steps/)
				<div className="steps">
					<div className="step">Step 1</div>
					<div className="step">Step 2</div>
					<div className="step">Step 3</div>
				</div>
			- Swap (https://daisyui.com/components/swap/)
				<div className="swap">
					<input type="checkbox" />
					<div className="swap-off">Off</div>
					<div className="swap-on">On</div>
				</div>
			- Tabs (https://daisyui.com/components/tabs/)
				<div className="tabs">
					<a className="tab">Tab 1</a>
					<a className="tab">Tab 2</a>
					<a className="tab">Tab 3</a>
				</div>
			- Table (https://daisyui.com/components/table/)
				<table className="table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Phone</th>
						</tr>
					</thead>
				</table>
			- Textarea (https://daisyui.com/components/textarea/)
				<textarea className="textarea textarea-bordered"></textarea>
			- Theme Controller (https://daisyui.com/components/theme-controller/)
				<div className="theme-controller">
					<input type="checkbox" className="theme-controller" />
				</div>
			- Timeline (https://daisyui.com/components/timeline/)
				<div className="timeline">
					<div className="timeline-item">
						<div className="timeline-item-content">
							<h3>Timeline Item 1</h3>
						</div>
					</div>
				</div>
			- Toast (https://daisyui.com/components/toast/)
				<div className="toast">
					<div className="toast-message">Toast Message</div>
				</div>
			- Toggle (https://daisyui.com/components/toggle/)
				<div className="toggle">
					<input type="checkbox" className="toggle" />
				</div>
			- Tooltip (https://daisyui.com/components/tooltip/)
				<div className="tooltip">
					<div className="tooltip-message">Tooltip Message</div>
				</div>
			- Validator (https://daisyui.com/components/validator/)
				<div className="validator">
					<input type="text" className="validator" />
				</div>


		REGRAS DE FERRAMENTAS:
		1. Use o tool mcp__recflux__color_palette_generator para gerar paletas de cores harmoniosas e profissionais antes de começar o design.
		2. Use o tool mcp__recflux__puppeteer_search para buscar recursos audiovisuais relevantes. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		3. Atualize package.json quando necessário (dependências Tailwind já estão no template).
		
		ARQUIVOS-ALVO PRINCIPAIS:
		- src/App.jsx (componentes/sections e layout com DaisyUI e Tailwind CSS)
		- src/index.css
		- src/components/ (componentes reutilizáveis)
		- src/assets/ (recursos audiovisuais)
		- src/pages/ (páginas)
		- src/utils/ (funções auxiliares)
		- src/styles/ (estilos globais)
		- src/types/ (tipos)
		- src/hooks/ (hooks)
		
		VISUAL E UX:
		- Preste MUITA atenção no contraste de cores e posicionamento de elementos.
		- Não esqueca de aplicar margin no hero para o navbar não sobrepor a seção.
		- CRUCIAL: Não esqueca de colocar o texto com fontes escuras em background claro e fontes claras em background escuro.
		- Use mcp__recflux__color_palette_generator para gerar paletas de cores harmoniosas e profissionais. Configure mode='transformer' para IA inteligente, temperature=1.2 para criatividade equilibrada, e numColors=3 por padrão (ou 4-5 para projetos mais complexos).
		- Layout responsivo com grid/flex, espaçamento consistente, tipografia clara.
		- Gradientes sutis e hovers suaves via Tailwind (transition, shadow, ring).
		- Acessibilidade: semântica, alt de imagens, foco visível.
		- Aplicar cores geradas da paleta em: backgrounds, text colors, accent colors, button styles, borders, e gradients.
		
		RECURSOS (OBRIGATÓRIOS):
		- Animations devem ser buscadas via mcp__recflux__puppeteer_search e colocadas em partes além do hero. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Video deve ser buscado via mcp__recflux__puppeteer_search e colocado no background do hero para um visual mais profissional. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Imagens devem ser buscados via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Fontes devem ser usadas apenas as fontes listadas: Inter, Roboto, Poppins, Montserrat, Fira Sans, Proxima Nova, Raleway, Helvetica, Ubuntu, Lato, Seb Neue, Rust, Arial, Go, Cormorant Garamond, Nunito Sans, Source Serif, Segoe UI, Cascadia Code PL, Chakra Petch, IBM Plex Sans, Avenir, Black Ops One, JetBrains Monospace, Roboto Slab, New Times Roman, Futura
		- Sempre verifique o padding e margin, ajuste se necessário
		- São obrigatórios para criar o site.

		RECURSOS (OPCIONAIS):
		- Vectors devem ser buscados via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Icons devem ser buscados via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- FX podem ser buscados via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Musicas podem ser buscadas via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		
		SEÇÕES MÍNIMAS:
		- Hero com video no background, Features (3+ cards) com imagens, navbar, footer e um CTA.
		
		FLUXO DE TRABALHO:
		1) read_file em src/App.jsx e src/index.css
		2) Gere uma paleta de cores profissional com mcp__recflux__color_palette_generator (mode='transformer', temperature=1.2, numColors=3)
		3) Ajuste a UI no src/App.jsx com DaisyUI, aplicando as cores da paleta gerada
		4) Pesquise na internet e use componentes da DaisyUI como hero, navbar, footer, como em (https://github.com/willpinha/daisy-components) e crie arquivos nas pastas citadas como componentes, hooks e utils
		5) Adicione um video no background do hero para um visual mais profissional
		6) Adicione animações para preenchimento de partes mais vazias
		7) Adicione imagens para ilustrar o conteúdo
		8) Adicione fontes da lista permitida
		9) Implemente a paleta de cores em todos os elementos (backgrounds, texto, botões, bordas, gradients)
		10) Adicione outros recursos se necessário
		11) Verifique novamente o contraste de cores, principalmente se houver temas diferentes e veja o posicionamento dos elementos, ajuste se necessário
		12) Verifique o padding (Adicione padding nos botões) e o contraste de cores do site inteiro, se necessário ajuste
		13) Atualize o package.json com as dependências necessárias

		Se solicitado, publicar com mcp__recflux__codesandbox_deploy
	`;
    try {
        const before = await hashDirectory(dir);
        const result = await runClaudeCLIInDir(dir, nlPrompt, system);
        const stdout = result.stdout;
        console.log('[CLAUDE][NL PROMPT] result:', {
            code: result.code,
            stdoutLen: result.stdoutLen,
            timedOut: result.timedOut
        });
        const after = await hashDirectory(dir);
        let changed = false;
        if (before.size !== after.size)
            changed = true;
        else {
            for (const [k, v] of after.entries()) {
                if (before.get(k) !== v) {
                    changed = true;
                    break;
                }
            }
        }
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
            }
            catch (deployError) {
                console.error('[DEPLOY] Error:', deployError);
                return {
                    text: '❌ Código gerado mas falha no deploy.',
                    claudeOutput: stdout
                };
            }
        }
        else {
            return {
                text: '✅ Nenhuma alteração detectada. Não publicarei.',
                claudeOutput: stdout
            };
        }
    }
    catch (e) {
        console.error('[CLAUDE] Error or timeout:', e);
        // Check if we have a timeout case with partial results
        const claudeResult = e;
        const isTimeout = (e instanceof Error && e.message.includes('timeout')) ||
            claudeResult.timedOut === true;
        if (isTimeout && claudeResult.stdout) {
            const stdout = claudeResult.stdout;
            console.log('[CLAUDE] Timeout case - analyzing stdout for deployment URLs...');
            console.log('[CLAUDE] Stdout length:', stdout.length);
            // Look for deployment URLs in various formats from the logs
            const previewMatch = stdout.match(/\*\*[^*]*Acesse o site:\*\* (https:\/\/\w+\.csb\.app)/i) ||
                stdout.match(/https:\/\/\w+\.csb\.app/);
            const editorMatch = stdout.match(/\*\*[^*]*Editar código:\*\* (https:\/\/codesandbox\.io\/s\/\w+)/i) ||
                stdout.match(/https:\/\/codesandbox\.io\/s\/\w+/);
            console.log('[CLAUDE] Preview match:', previewMatch);
            console.log('[CLAUDE] Editor match:', editorMatch);
            if (previewMatch || editorMatch) {
                const deploymentUrl = previewMatch ? previewMatch[1] || previewMatch[0] : '';
                const editorUrl = editorMatch ? editorMatch[1] || editorMatch[0] : '';
                console.log('[CLAUDE] Found deployment URLs after timeout:', { deploymentUrl, editorUrl });
                return {
                    text: `🚀 Site publicado! (Claude timeout mas deploy funcionou)

📱 *Preview:*
${deploymentUrl}

⚙️ *Code:*
${editorUrl}

⚠️ *Nota:* Claude foi interrompido por timeout mas o deploy foi realizado com sucesso.`,
                    deploymentUrl: deploymentUrl,
                    previewUrl: deploymentUrl,
                    editorUrl: editorUrl,
                    claudeOutput: stdout.substring(0, 1000) + (stdout.length > 1000 ? '...' : '')
                };
            }
        }
        // If Claude times out but we have changes, still try to deploy
        let changed = false;
        // For timeout case, assume there were changes if files exist
        try {
            const appPath = path.join(dir, 'src', 'App.jsx');
            const stats = await fs.stat(appPath);
            changed = stats.isFile();
        }
        catch {
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
            }
            catch (deployError) {
                return { text: '❌ Claude timeout e falha no deploy. Tente novamente.' };
            }
        }
        return { text: '❌ Erro ao gerar código. Tente um prompt mais simples.' };
    }
}
async function sendWhatsappText(to, body) {
    const chunks = [];
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
        }
        catch (err) {
            const status = err?.response?.status;
            const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
            console.error(`[WHATSAPP_API] error status=${status} message=${err?.message}`);
            if (dataPreview)
                console.error(`[WHATSAPP_API] error body=${dataPreview}`);
            throw err;
        }
    }
}
async function sendWhatsappImage(to, base64Image, caption) {
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
    }
    catch (err) {
        const status = err?.response?.status;
        const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
        console.error(`[WHATSAPP_API] Image send error status=${status} message=${err?.message}`);
        if (dataPreview)
            console.error(`[WHATSAPP_API] Image send error body=${dataPreview}`);
        throw err;
    }
}
const app = express();
app.use(bodyParser.json());
// Optional Google auth setup
configureAuth(app);
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});
app.post('/webhook', async (req, res) => {
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
            const text = (msg.text?.body || '').trim();
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
                try {
                    const st = await fs.stat(dir);
                    if (!st.isDirectory())
                        throw new Error('not dir');
                }
                catch {
                    reply = '⚠️ Projeto ausente. Use /login ou peça project_reset para recriar a pasta.';
                    wrapAsCode = false;
                    await sendWhatsappText(from, reply);
                    return res.sendStatus(200);
                }
                const systemDeploy = `Você é um editor de código. Edite o projeto desta pasta conforme o pedido.`;
                try {
                    const before = await hashDirectory(dir);
                    const result = await runClaudeCLIInDir(dir, reactCode, systemDeploy);
                    const stdout = result.stdout;
                    console.log('[CLAUDE][DEPLOY PROMPT] raw output length', stdout?.length || 0);
                    const after = await hashDirectory(dir);
                    let changed = false;
                    if (before.size !== after.size)
                        changed = true;
                    else {
                        for (const [k, v] of after.entries()) {
                            if (before.get(k) !== v) {
                                changed = true;
                                break;
                            }
                        }
                    }
                    let deploymentResult = null;
                    if (changed) {
                        console.log('[DEPLOY] Changes detected, deploying to CodeSandbox...');
                        try {
                            deploymentResult = await deployToCodeSandbox(dir);
                            reply = `🚀 Site publicado!

📱 **Preview:**
${deploymentResult.previewUrl}

⚙️ **Código:**
${deploymentResult.editorUrl}`;
                        }
                        catch (deployError) {
                            console.error('[DEPLOY] Error:', deployError);
                            reply = '❌ Código editado mas falha no deploy.';
                        }
                    }
                    else {
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
                }
                finally {
                    // Do not delete CLONED_TEMPLATE_DIR; it is managed via login/project_reset
                }
            }
            else if (text.toLowerCase().startsWith('/access ')) {
                reply = 'O comando /access não está disponível nesta versão.';
            }
            else if (text.toLowerCase().startsWith('/login')) {
                const base = (PUBLIC_BASE_URL && PUBLIC_BASE_URL.trim()) || `http://localhost:${process.env.PORT || 3000}`;
                const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
                const loginUrl = `${normalizedBase}/auth/google?state=${encodeURIComponent(from)}`;
                reply = `Login com Google: ${loginUrl}`;
                wrapAsCode = false;
            }
            else if (text.toLowerCase().startsWith('/agentic')) {
                // Formats:
                // GERAR:  /agentic GERAR <userId> | <prompt>
                // EDITAR: /agentic EDITAR <userId> | <fileName> | <prompt> || <currentCode>
                const payload = text.startsWith('/agentic ') ? text.slice(9).trim() : '';
                const [left] = payload.split('||');
                const parts = (left || '').split('|').map(s => s.trim()).filter(Boolean);
                const head = (parts[0] || '').split(/\s+/).filter(Boolean);
                const actionType = head[0]?.toUpperCase() || 'GERAR';
                // Try to get logged-in user via WhatsApp sender mapping; fallback to provided id or dev-user
                const mappedUser = getUserByWhatsApp(from);
                let userId = head[1] || 'dev-user';
                if (mappedUser?.email) {
                    // Resolve Supabase user UUID via email
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                    if (supabaseUrl && supabaseKey) {
                        try {
                            const supabase = createClient(supabaseUrl, supabaseKey);
                            const { data: user, error } = await supabase
                                .from('users')
                                .select('id')
                                .eq('email', mappedUser.email)
                                .single();
                            if (!error && user?.id) {
                                userId = user.id;
                            }
                        }
                        catch (e) {
                            console.warn('[SUPABASE] Failed to resolve user id by email:', e.message);
                        }
                    }
                }
                const prompt = parts.length > 1 ? parts[parts.length - 1] : '';
                if (!prompt) {
                    const who = mappedUser ? ` (como ${mappedUser.email || mappedUser.name || mappedUser.id})` : '';
                    reply = `Você está usando /agentic${who}.\nUso:\n/agentic GERAR | <prompt>\n/agentic EDITAR | <fileName> | <prompt> || <currentCode>`;
                }
                else {
                    // Fallback: if userId isn't a UUID, try DEFAULT_USER_ID env, otherwise ask user to /login
                    if (!isValidUuid(userId)) {
                        const fallback = process.env.DEFAULT_USER_ID;
                        if (fallback && isValidUuid(fallback)) {
                            console.warn(`[AGENTIC] Using DEFAULT_USER_ID fallback for non-UUID userId (${userId})`);
                            userId = fallback;
                        }
                        else {
                            reply = 'Por favor, faça /login primeiro ou forneça um UUID de usuário válido. Você também pode definir DEFAULT_USER_ID nas variáveis do servidor.';
                            wrapAsCode = false;
                            await sendWhatsappText(from, reply);
                            return res.sendStatus(200);
                        }
                    }
                    // Independente do actionType, apenas confirmamos a edição
                    reply = 'OK. Vou aplicar as mudanças no projeto ao publicar.';
                }
            }
            else if (text.toLowerCase() === '/help') {
                reply = 'Envie um prompt em linguagem natural (ex.: "Crie um portfólio moderno") e eu vou gerar e publicar. Comandos: /login, /agentic, /access, /deploy';
                wrapAsCode = false;
            }
            else {
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
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});
const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
    console.log(`Webhook listening on :${port}`);
});
