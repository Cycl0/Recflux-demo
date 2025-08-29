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
        console.log('[CLAUDE] starting', { cwd: absProjectDir, cmd });
        console.log('[CLAUDE] Full command args:', args);
        console.log('[CLAUDE] System prompt length:', systemArg.length);
        console.log('[CLAUDE] System prompt preview:', systemArg.substring(0, 200) + '...');
        console.log('[CLAUDE] User prompt:', userArg);
        const defaultKey = (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.CLAUDE_API_KEY);
        const childEnv = {
            ...process.env,
            CI: '1',
            NO_COLOR: '1',
            FORCE_COLOR: '0',
            CLONED_TEMPLATE_DIR: absProjectDir,
            BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY,
            BROWSERBASE_PROJECT_ID: process.env.BROWSERBASE_PROJECT_ID,
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
            child.stdin.write(userArg);
            child.stdin.end();
        }
        let stderr = '';
        let stdout = '';
        const killTimer = setTimeout(() => {
            console.log('[CLAUDE] Timeout reached after 5 minutes, letting process continue');
            reject(new Error('Claude CLI timed out after 5 minutes'));
        }, 300000);
        child.stdout.on('data', (d) => {
            const t = d.toString();
            stdout += t;
            const snip = t.length > 400 ? t.slice(0, 400) + '…' : t;
            if (snip.trim().length)
                console.log('[CLAUDE][stdout]', snip);
        });
        child.stderr.on('data', (d) => {
            const t = d.toString();
            stderr += t;
            const snip = t.length > 400 ? t.slice(0, 400) + '…' : t;
            if (snip.trim().length)
                console.warn('[CLAUDE][stderr]', snip);
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
            resolve(stdout);
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
    let screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: true });
    // If image is suspiciously small (possibly blank), retry once after short wait
    if (!screenshotBuffer || screenshotBuffer.length < 1000) {
        await new Promise(res => setTimeout(res, 2000));
        screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: true });
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
		- React + Tailwind CSS (https://tailwindcss.com/) + Shadcn UI (https://ui.shadcn.com/) + Framer Motion (https://www.framer.com/motion/) + GSAP (https://greensock.com/gsap/)
		- Use exclusivamente classes utilitárias do Tailwind para layout e estilos.
		
		REGRAS DE FERRAMENTAS:
		1. Use o tool mcp__recflux__browserbase_search para buscar recursos audiovisuais relevantes. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		2. Atualize package.json quando necessário (dependências Tailwind já estão no template).
		
		ARQUIVOS-ALVO PRINCIPAIS:
		- src/App.jsx (componentes/sections e layout com Tailwind)
		- src/index.css (diretivas @tailwind já presentes; adicione utilitários @layer se preciso)
		- src/components/ (componentes reutilizáveis)
		- src/assets/ (recursos audiovisuais)
		- src/pages/ (páginas)
		- src/utils/ (funções auxiliares)
		- src/styles/ (estilos globais)
		- src/types/ (tipos)
		- src/hooks/ (hooks)
		
		VISUAL E UX:
		- Layout responsivo com grid/flex, espaçamento consistente, tipografia clara.
		- Gradientes sutis e hovers suaves via Tailwind (transition, shadow, ring).
		- Acessibilidade: semântica, alt de imagens, foco visível.
		
		RECURSOS (OBRIGATÓRIOS):
		- Videos devem ser buscados via mcp__recflux__browserbase_search e colocados no background do hero para um visual mais profissional. . UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		- Imagens/ícones devem ser buscados via mcp__recflux__browserbase_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		- Fontes devem ser buscadas via mcp__recflux__browserbase_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		- Vectors devem ser buscados via mcp__recflux__browserbase_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		- Icons devem ser buscados via mcp__recflux__browserbase_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		- São obrigatórios para criar o site.

		RECURSOS (OPCIONAIS):
		- FX podem ser buscados via mcp__recflux__browserbase_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		- Musicas podem ser buscadas via mcp__recflux__browserbase_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA.
		
		SEÇÕES MÍNIMAS:
		- Hero, Features (3+ cards), e um CTA.
		
		FLUXO DE TRABALHO:
		1) read_file em src/App.jsx e src/index.css
		2) Ajuste a UI no src/App.jsx com Tailwind
		3) Crie componentes reutilizáveis no src/components/ e arquivos nas pastas citadas
		4) Adicione um video no background do hero para um visual mais profissional
		5) Adicione imagens
        6) Adicione fontes
		7) Adicione icons
		8) Atualize o package.json com as dependências necessárias

		Se solicitado, publicar com mcp__recflux__codesandbox_deploy
	`;
    try {
        const before = await hashDirectory(dir);
        const stdout = await runClaudeCLIInDir(dir, nlPrompt, system);
        console.log('[CLAUDE][NL PROMPT] raw output length', stdout?.length || 0);
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
        // If Claude times out but we have changes, still try to deploy
        const before = await hashDirectory(dir);
        const after = await hashDirectory(dir);
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
                    const stdout = await runClaudeCLIInDir(dir, reactCode, systemDeploy);
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
