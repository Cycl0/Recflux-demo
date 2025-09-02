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
import { deployToCodeSandbox } from './deploy-codesandbox.js';
import { 
    validateProject, 
    autoFixProject, 
    generateErrorReport, 
    type ValidationResult 
} from './validation.js';

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

const DEFAULT_CLINE_BIN = 'cline-cli';
const CLINE_BIN = (process.env.CLINE_BIN || process.env.CLINE_PATH || DEFAULT_CLINE_BIN) as string;

interface ClineResult {
	code: number;
	stderr: string;
	stdout: string;
	stdoutLen: number;
	stderrLen: number;
	timedOut?: boolean;
}

/**
 * Enhanced version of runClineCLIInDir with automated validation and error fixing
 */
async function runClineCLIInDirWithValidation(cwd: string, userPrompt: string, systemAppend: string, maxRetries = 3): Promise<ClineResult & { validationResult?: ValidationResult }> {
    let attempt = 0;
    let lastValidation: ValidationResult | null = null;

    while (attempt < maxRetries) {
        attempt++;
        console.log(`[ENHANCED_CLINE] Attempt ${attempt}/${maxRetries}`);
        
        // Run the original Cline CLI
        const clineResult = await runClineCLIInDir(cwd, userPrompt, systemAppend);
        
        // If Cline CLI failed, return immediately
        if (clineResult.code !== 0) {
            console.log(`[ENHANCED_CLINE] Cline CLI failed with code ${clineResult.code}, skipping validation`);
            return { ...clineResult, validationResult: lastValidation || undefined };
        }
        
        console.log(`[ENHANCED_CLINE] Cline CLI completed, running validation...`);
        
        // Validate the generated code
        const validation = await validateProject(cwd);
        lastValidation = validation;
        
        if (validation.isValid) {
            console.log(`[ENHANCED_CLINE] ✅ Validation passed on attempt ${attempt}`);
            return { ...clineResult, validationResult: validation };
        }
        
        console.log(`[ENHANCED_CLINE] ❌ Validation failed on attempt ${attempt}: ${validation.errors.length} errors found`);
        
        // Try auto-fixing
        if (validation.canAutoFix) {
            console.log(`[ENHANCED_CLINE] 🔧 Attempting auto-fix...`);
            const fixResult = await autoFixProject(cwd);
            
            if (fixResult.success && fixResult.changedFiles.length > 0) {
                console.log(`[ENHANCED_CLINE] ✅ Auto-fixed ${fixResult.changedFiles.length} files`);
                
                // Re-validate after auto-fix
                const postFixValidation = await validateProject(cwd);
                if (postFixValidation.isValid) {
                    console.log(`[ENHANCED_CLINE] ✅ Validation passed after auto-fix`);
                    return { ...clineResult, validationResult: postFixValidation };
                } else if (postFixValidation.errors.length < validation.errors.length) {
                    console.log(`[ENHANCED_CLINE] 🔧 Auto-fix reduced errors from ${validation.errors.length} to ${postFixValidation.errors.length}`);
                    lastValidation = postFixValidation;
                }
            }
        }
        
        // If we have remaining errors and attempts left, ask Cline to fix them
        if (attempt < maxRetries) {
            const errorReport = generateErrorReport(lastValidation || validation);
            const fixPrompt = `The previous code generation resulted in errors. Please fix the following issues and ensure the code is valid:\n\n${errorReport}\n\nOriginal request: ${userPrompt}`;
            
            console.log(`[ENHANCED_CLINE] 🔄 Asking Cline to fix errors on attempt ${attempt + 1}...`);
            userPrompt = fixPrompt; // Update prompt for next iteration
        }
    }
    
    // All attempts exhausted
    console.log(`[ENHANCED_CLINE] ❌ All ${maxRetries} attempts exhausted. Final validation result:`);
    console.log(generateErrorReport(lastValidation!));
    
    return { 
        code: lastValidation?.isValid ? 0 : 1, 
        stderr: generateErrorReport(lastValidation!), 
        stdout: `Validation failed after ${maxRetries} attempts`, 
        stdoutLen: 0, 
        stderrLen: generateErrorReport(lastValidation!).length,
        validationResult: lastValidation || undefined
    };
}

function runClineCLIInDir(cwd: string, userPrompt: string, systemAppend: string): Promise<ClineResult> {
	return new Promise((resolve, reject) => {
		// Resolve absolute project directory and prepare prompts
		const absProjectDir = path.resolve(cwd);
		const userArg = userPrompt;
		
		// Create cline config path
		const clineConfigPath = path.resolve(__dirname, '../cline-config.json');
		console.log('[CLINE] Config path:', clineConfigPath);
		
		// Check if cline config file exists
		try {
			const configExists = fsSync.existsSync(clineConfigPath);
			console.log('[CLINE] Config exists:', configExists);
			if (configExists) {
				const configContent = fsSync.readFileSync(clineConfigPath, 'utf8');
				console.log('[CLINE] Config content:', configContent);
			}
		} catch (e) {
			console.error('[CLINE] Error checking config:', e);
		}
		
		// cline-cli uses 'task' command with automation flags
		const baseArgs = [
			'task',
			'--full-auto',
			'--auto-approve-mcp',
			'--settings', '/home/appuser/.cline_cli/cline_cli_settings.json',
			'--workspace', absProjectDir,
			'--custom-instructions', systemAppend,
			userArg
		];
		let cmd = CLINE_BIN;
		let args = baseArgs.slice();
		let useShell = false;
		
		const defaultKey = (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY) as string | undefined;
		
		console.log('[CLINE] starting', { cwd: absProjectDir, cmd });
		console.log('[CLINE] Full command args:', args);
		console.log('[CLINE] Complete command:', `${cmd} ${args.join(' ')}`);
		console.log('[CLINE] User prompt:', userArg);
		console.log('[CLINE] API Key status:', defaultKey ? 'SET' : 'NOT SET');

		const childEnv = { 
			...process.env, 
			CI: '1', 
			NO_COLOR: '1', 
			FORCE_COLOR: '0', 
			CLONED_TEMPLATE_DIR: absProjectDir, 
			puppeteer_API_KEY: process.env.puppeteer_API_KEY,
			puppeteer_PROJECT_ID: process.env.puppeteer_PROJECT_ID,
			// Ensure cline CLI sees API keys for different providers
			ANTHROPIC_API_KEY: defaultKey,
			CLAUDE_API_KEY: defaultKey,
			ANTHROPIC_AUTH_TOKEN: defaultKey,
			OPENAI_API_KEY: defaultKey,
			PEXELS_API_KEY: process.env.PEXELS_API_KEY
		};



		const child = spawn(cmd, args, { 
			cwd: absProjectDir, 
			stdio: ['pipe', 'pipe', 'pipe'], 
			shell: useShell, 
			env: childEnv 
		});
		
		// cline-cli doesn't need stdin input like Claude Code
		console.log('[CLINE] Task started, waiting for response...');
		
		let stderr = '';
		let stdout = '';
		const killTimer = setTimeout(() => {
			console.log('[CLINE] Timeout reached after 20 minutes, extracting any deployment info');
			clearTimeout(killTimer);
			
			// Try to extract deployment URLs from stdout before timing out
			const deploymentMatch = stdout.match(/https:\/\/\w+\.csb\.app/);
			const editorMatch = stdout.match(/https:\/\/codesandbox\.io\/s\/\w+/);
			
			console.log('[CLINE] Timeout - checking stdout for deployment info...');
			console.log('[CLINE] Stdout length:', stdout.length);
			console.log('[CLINE] Found deployment URL:', deploymentMatch?.[0] || 'none');
			console.log('[CLINE] Found editor URL:', editorMatch?.[0] || 'none');
			
			// Always resolve with what we have - let the caller handle the timeout
			resolve({
				code: 124, // timeout code  
				stderr,
				stdout,
				stdoutLen: stdout.length,
				stderrLen: stderr.length,
				timedOut: true
			});
		}, 1200000);
		
		
		
		child.stdout.on('data', (d) => {
			const t = d.toString(); 
			stdout += t;
			// Show full output in real-time, line by line
			const lines = t.split('\n');
			lines.forEach((line: string) => {
				if (line.trim().length) {
					console.log('[CLINE][stdout]', line);
				}
			});
		});
		
		child.stderr.on('data', (d) => {
			const t = d.toString(); 
			stderr += t;
			// Show full stderr output in real-time, line by line
			const lines = t.split('\n');
			lines.forEach((line: string) => {
				if (line.trim().length) {
					console.warn('[CLINE][stderr]', line);
				}
			});
		});
		
		child.on('error', (err: any) => {
			clearTimeout(killTimer);
			if (err && (err.code === 'ENOENT' || err.errno === -4058)) {
				return reject(new Error(`cline CLI not found (spawn ${cmd}). Make sure cline-cli is installed: npm install -g @yaegaki/cline-cli`));
			}
			console.error('[CLINE] Process error:', err);
			reject(err);
		});
		
		child.on('close', (code) => {
			clearTimeout(killTimer);
			console.log('[CLINE] finished', { code, stdoutLen: stdout.length, stderrLen: stderr.length });
			if (stderr) console.log('[CLINE] stderr content:', stderr.substring(0, 500));
			if (stdout) console.log('[CLINE] stdout preview:', stdout.substring(0, 500));
			// Handle null exit code as success (happens when process is terminated gracefully)
			if (code !== null && code !== 0) return reject(new Error(`cline CLI exited with code ${code}: ${stderr}`));
			
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

async function takeScreenshot(targetUrl: string): Promise<string> {
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

	// Wait a bit for any animations to settle
	await new Promise(res => setTimeout(res, 1000));
	
	let screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
	// If image is suspiciously small (possibly blank), retry once after short wait
	if (!screenshotBuffer || (screenshotBuffer as any as string).length < 1000) {
		await new Promise(res => setTimeout(res, 2000));
		screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
	}
	await browser.close();
	console.log('Screenshot taken successfully.');
	return screenshotBuffer as string;
}

// deployToCodeSandbox function is now imported from ./deploy-codesandbox.js



async function hashDirectory(root: string): Promise<Map<string, string>> {
	async function walk(dir: string, prefix = ''): Promise<Array<{ rel: string; abs: string }>> {
		const out: Array<{ rel: string; abs: string }> = [];
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const ent of entries) {
			if (ent.name === 'node_modules' || ent.name === '.git') continue;
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

async function buildAndDeployFromPrompt(nlPrompt: string, whatsappFrom: string): Promise<{ text: string; shouldSendImage?: boolean; imageData?: string; imageCaption?: string; clineOutput?: string; deploymentUrl?: string; previewUrl?: string; editorUrl?: string }> {
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
		Você é um gerador de código focado em React + Tailwind para criar sites profissionais e modernos.
		
		STACK (fixo):
		- React + Tailwind CSS + DaisyUI + Framer Motion + GSAP
		- Use exclusivamente classes utilitárias do Tailwind para layout e estilos.
		- IMPORTANTE: Não importe tailwind no index.css nem daisy, já estao importados com cdn no index.html
		- CRUCIAL: Use mcp__recflux__web_crawler com deepCrawl=true, deepCrawlStrategy='bfs', maxPages=8 para explorar https://daisyui.com/components/ e descobrir todos os ~100 componentes DaisyUI disponíveis

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
		- Não use emojis, use icons no lugar.
		
		RECURSOS (OBRIGATÓRIOS):
		- Animations devem ser buscadas via mcp__recflux__puppeteer_search e colocadas em partes além do hero. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Video deve ser buscado via mcp__recflux__puppeteer_search e colocado no background do hero para um visual mais profissional. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Imagens devem ser geradas via mcp__recflux__freepik_ai_image_generator.
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
		
		REGRAS ABSOLUTAS - NUNCA VIOLE ESTAS REGRAS:
		❌ PROIBIDO USAR EMOJIS: Nunca use 🚫 ❌ ✅ 💡 📱 🎮 🍔 etc. em lugar de ícones profissionais
		❌ PROIBIDO PLACEHOLDER IMAGES: Nunca use "placeholder.jpg", "image1.jpg", URLs genéricas
		❌ PROIBIDO BOTÕES SEM PADDING: Todo botão DEVE ter px-4 py-2 obrigatoriamente
		❌ PROIBIDO CONTRASTE RUIM: NUNCA texto escuro em fundo escuro, NUNCA texto claro em fundo claro
		❌ EXEMPLOS PROIBIDOS: text-white em bg-white, text-black em bg-black, text-white em btn-primary
		✅ OBRIGATÓRIO: Use mcp__recflux__puppeteer_search para ícones/vetores/animações reais
		✅ OBRIGATÓRIO: Use mcp__recflux__freepik_ai_image_generator para todas as imagens
		✅ OBRIGATÓRIO: Substitua qualquer emoji encontrado por ícone real imediatamente
		✅ OBRIGATÓRIO: Todo elemento button ou .btn DEVE incluir classes px-4 py-2
		✅ OBRIGATÓRIO CONTRASTE: Fundos personalizados escuros = texto claro, Fundos claros = texto escuro
		✅ OBRIGATÓRIO BOTÕES DAISYUI: Deixe btn-primary/btn-secondary sem cores de texto explícitas

		FLUXO DE TRABALHO:
		1) read_file em src/App.jsx e src/index.css
		2) GERAÇÃO DE PALETA DE CORES TEMÁTICA AVANÇADA - Execute estes passos:
		   a) ANÁLISE DETALHADA DO TEMA: Identifique o tema específico e subtema (ex: gaming→RPG, business→fintech, food→italian)
		   b) SELEÇÃO ESTRATÉGICA DE CORES: Escolha 2-3 cores base complementares baseadas na psicologia das cores:
		   
		   TEMAS E CORES OTIMIZADAS:
		   - Gaming/Esports: Base=#8b5cf6 (roxo vibrante) + #06d6a0 (verde neon) para energia e competição
		   - Tech/SaaS: Base=#3b82f6 (azul confiança) + #1e293b (cinza profissional) para credibilidade
		   - Finance/Banking: Base=#1e40af (azul escuro) + #065f46 (verde escuro) para segurança e crescimento
		   - Food/Restaurant: Base=#dc2626 (vermelho apetite) + #f59e0b (dourado) para calor e apetite  
		   - Health/Medical: Base=#059669 (verde saúde) + #0ea5e9 (azul confiança) para bem-estar
		   - Fashion/Beauty: Base=#ec4899 (rosa elegante) + #581c87 (roxo luxo) para sofisticação
		   - Travel/Tourism: Base=#0ea5e9 (azul céu) + #f59e0b (dourado sol) para aventura
		   - Education: Base=#3b82f6 (azul conhecimento) + #059669 (verde crescimento) para aprendizado
		   - Real Estate: Base=#1e40af (azul confiança) + #92400e (marrom terra) para solidez
		   - Creative/Agency: Base=#8b5cf6 (roxo criativo) + #ec4899 (rosa inovação) para originalidade
		   - E-commerce: Base=#dc2626 (vermelho urgência) + #1e40af (azul confiança) para conversão
		   
		   c) GERAÇÃO INTELIGENTE: Use mcp__recflux__color_palette_generator com:
		      - mode='transformer' (para harmonia inteligente)
		      - temperature=1.0 (para equilíbrio entre criatividade e consistência)  
		      - numColors=4 (para mais opções de combinação)
		      - baseColors=[suas_2_cores_escolhidas] (cores complementares estratégicas)
		3) Ajuste a UI no src/App.jsx com DaisyUI, aplicando as cores da paleta gerada
		   REGRAS CRÍTICAS:
		   - TODO botão DaisyUI deve incluir px-4 py-2 (exemplo: "btn btn-primary px-4 py-2")
		   - DEIXE O DAISYUI CONTROLAR AS CORES DOS BOTÕES: NÃO adicione text-white em botões DaisyUI
		   - SÓ use cores de texto explícitas quando tiver fundo explícito (exemplo: bg-blue-600 text-white)
		   - NUNCA use text-white em btn-primary, btn-secondary, btn-accent - DaisyUI já cuida das cores
		4) EXPLORAÇÃO COMPLETA DE COMPONENTES DaisyUI:
		   a) Use mcp__recflux__web_crawler com url="https://daisyui.com/components/", deepCrawl=true, deepCrawlStrategy='bfs', maxPages=8
		   b) Analise TODOS os componentes descobertos (Actions, Data Display, Data Input, Feedback, Layout, Navigation, etc.)
		   c) Escolha os componentes mais apropriados para o tema do site solicitado
		   d) Crie arquivos organizados nas pastas components/, hooks/, e utils/ baseado nos componentes encontrados
		5) TOME INSPIRAC
		5) ADICIONE VÍDEOS PROFISSIONAIS: Use mcp__recflux__puppeteer_search com searchType='videos' para encontrar vídeos de background relevantes ao tema para o hero
		6) ADICIONE CONTEÚDO VISUAL PROFISSIONAL - Execute estes passos:
		   a) ANIMAÇÕES: Use mcp__recflux__puppeteer_search com searchType='animations' para encontrar animações relevantes ao tema
		   b) ÍCONES: Use mcp__recflux__puppeteer_search com searchType='icons' para encontrar ícones profissionais (NUNCA use emojis)
		   c) EFEITOS VISUAIS: Use mcp__recflux__puppeteer_search com searchType='vfx' para efeitos visuais especiais quando apropriado
		   d) INTEGRAÇÃO: Integre estes recursos encontrados no código usando as URLs retornadas
		   REGRAS CRÍTICAS - OBRIGATÓRIO SEGUIR:
		   - SEMPRE use as ferramentas de busca para encontrar conteúdo visual real
		   - PROIBIDO: Usar emojis em qualquer lugar do código (🚫 ❌ ✅ 💡 📱 etc.)
		   - OBRIGATÓRIO: Use URLs reais retornados pelas ferramentas de busca
		   - Se encontrar emoji no código, SUBSTITUA imediatamente por ícone real usando mcp__recflux__puppeteer_search
		7) PROCESSO CRÍTICO DE GERAÇÃO DE IMAGENS - Execute estes passos em ordem sequencial PARA CADA IMAGEM INDIVIDUAL:
		   a) PLANEJAMENTO: Primeiro identifique EXATAMENTE onde cada imagem será colocada (hero, cards, sections, etc)
		   b) ANÁLISE CONTEXTUAL: Para cada localização de imagem, analise a árvore de componentes (títulos, descrições, stats, atributos) ao redor da posição da imagem
		   c) NÃO PARE até encontrar o título específico (ex: "Mystic Mage") E a descrição específica (ex: "Master of ancient spells and arcane knowledge") do elemento
		   d) GERAÇÃO ESPECÍFICA INDIVIDUAL: Use mcp__recflux__freepik_ai_image_generator UMA VEZ POR CADA IMAGEM com prompt baseado no título + descrição exatos encontrados + htmlContext específico da localização
		   e) VERIFICAÇÃO: Confirme que a imagem gerada corresponde ao contexto específico do componente
		   f) REPETIÇÃO OBRIGATÓRIA: Execute este processo SEPARADAMENTE para CADA UMA das 3-6 imagens necessárias no site
		   REGRAS CRÍTICAS - EXECUÇÃO OBRIGATÓRIA:
		   - FAÇA UMA CHAMADA SEPARADA de mcp__recflux__freepik_ai_image_generator para cada imagem individual
		   - NUNCA tente gerar múltiplas imagens em uma única chamada
		   - SEMPRE inclua o htmlContext específico de onde a imagem será colocada
		   - Se há 6 cards, faça 6 chamadas separadas, uma para cada card
		   - PROIBIDO: Usar placeholder images, stock photos genéricas ou deixar src vazio
		   - OBRIGATÓRIO: Toda tag <img> deve usar imageUrl retornada pela ferramenta de geração
		   - VERIFICAÇÃO: Confirme que todas as imagens no código final são URLs geradas pela IA
		   EXEMPLO: Se encontrar uma card com título "Mystic Mage" e descrição "Master of ancient spells and arcane knowledge", use prompt "Mystic Mage, Master of ancient spells and arcane knowledge" - NUNCA use apenas "mage"
		8) Adicione fontes da lista permitida
		9) Implemente a paleta de cores em todos os elementos (backgrounds, texto, botões, bordas, gradients)
		10) Adicione outros recursos se necessário
		11) Verifique novamente o contraste de cores, principalmente se houver temas diferentes e veja o posicionamento dos elementos, ajuste se necessário
		12) VERIFICAÇÃO CRÍTICA DE CONTRASTE E BOTÕES - Execute OBRIGATORIAMENTE:
		    FASE 1 - CONTRASTE (CRÍTICO):
		    a) INSPEÇÃO TOTAL: Examine CADA combinação texto/fundo no código inteiro
		    b) VERIFICAÇÕES ESPECÍFICAS:
		       - Se bg-white/bg-gray-100/bg-base-100 → DEVE usar text-gray-900/text-black
		       - Se bg-black/bg-gray-900/bg-primary (escuro) → DEVE usar text-white/text-gray-100
		       - Se bg-custom claro (bg-white, bg-gray-100) → adicione text-gray-900/text-black
		       - Se bg-custom escuro (bg-black, bg-gray-900, bg-blue-600) → adicione text-white
		       - Se btn-daisyui (btn-primary, btn-secondary) → NÃO adicione cores de texto
		    c) CORREÇÃO IMEDIATA: Substitua TODAS as combinações ruins encontradas
		    d) EXEMPLOS DE CORREÇÃO:
		       - ❌ "bg-white text-white" → ✅ "bg-white text-gray-900"
		       - ❌ "bg-black text-black" → ✅ "bg-black text-white"
		       - ❌ "btn-primary text-white" → ✅ "btn-primary" (remover text-white)
		       - ❌ "btn btn-primary text-gray-900" → ✅ "btn btn-primary" (remover cor de texto)
		    
		    FASE 2 - BOTÕES:
		    e) INSPEÇÃO: Encontre TODOS os elementos button, .btn, .btn-primary, .btn-secondary no código
		    f) CORREÇÃO: Cada botão encontrado DEVE ter px-4 py-2 (exemplo: "btn btn-primary px-4 py-2")
		    g) REMOVER CORES DE TEXTO: Se encontrar btn-primary/btn-secondary com text-white/text-*, REMOVA a cor de texto
		    h) VALIDAÇÃO FINAL: Confirme que não há botão sem padding e que botões DaisyUI não têm cores de texto explícitas
		13) Atualize o package.json com as dependências necessárias

		Se solicitado, publicar com mcp__recflux__codesandbox_deploy
	`;
    try {
        const before = await hashDirectory(dir);
        const result = await runClineCLIInDirWithValidation(dir, nlPrompt, system);
        const stdout = result.stdout;
        console.log('[CLINE][NL PROMPT] result:', { 
            code: result.code, 
            stdoutLen: result.stdoutLen, 
            timedOut: (result as any).timedOut 
        });
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
                    clineOutput: stdout,
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
                    clineOutput: stdout
                };
            }
        } else {
            return { 
                text: '✅ Nenhuma alteração detectada. Não publicarei.',
                clineOutput: stdout
            };
        }
    } catch (e) {
        console.error('[CLINE] Error or timeout:', e);
        
        // Check if we have a timeout case with partial results
        const clineResult = e as ClineResult;
        const isTimeout = (e instanceof Error && e.message.includes('timeout')) || 
                         clineResult.timedOut === true;
        
        if (isTimeout && clineResult.stdout) {
            const stdout = clineResult.stdout;
            console.log('[CLINE] Timeout case - analyzing stdout for deployment URLs...');
            console.log('[CLINE] Stdout length:', stdout.length);
            
            // Look for deployment URLs in various formats from the logs
            const previewMatch = stdout.match(/\*\*[^*]*Acesse o site:\*\* (https:\/\/\w+\.csb\.app)/i) ||
                                stdout.match(/https:\/\/\w+\.csb\.app/);
            const editorMatch = stdout.match(/\*\*[^*]*Editar código:\*\* (https:\/\/codesandbox\.io\/s\/\w+)/i) ||
                               stdout.match(/https:\/\/codesandbox\.io\/s\/\w+/);
            
            console.log('[CLINE] Preview match:', previewMatch);
            console.log('[CLINE] Editor match:', editorMatch);
            
            if (previewMatch || editorMatch) {
                const deploymentUrl = previewMatch ? previewMatch[1] || previewMatch[0] : '';
                const editorUrl = editorMatch ? editorMatch[1] || editorMatch[0] : '';
                
                console.log('[CLINE] Found deployment URLs after timeout:', { deploymentUrl, editorUrl });
                return {
                    text: `🚀 Site publicado! (Cline timeout mas deploy funcionou)

📱 *Preview:*
${deploymentUrl}

⚙️ *Code:*
${editorUrl}

⚠️ *Nota:* Cline foi interrompido por timeout mas o deploy foi realizado com sucesso.`,
                    deploymentUrl: deploymentUrl,
                    previewUrl: deploymentUrl,
                    editorUrl: editorUrl,
                    clineOutput: stdout.substring(0, 1000) + (stdout.length > 1000 ? '...' : '')
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
        } catch {
            changed = false;
        }
        
        if (changed) {
            console.log('[DEPLOY] Cline timed out but changes detected, attempting deploy anyway...');
            try {
                const deployment = await deployToCodeSandbox(dir);
                return { 
                    text: `🚀 Site publicado! (Cline timeout mas deploy funcionou)

📱 *Preview:*
${deployment.previewUrl}

⚙️ *Code:*
${deployment.editorUrl}`,
                    deploymentUrl: deployment.previewUrl,
                    previewUrl: deployment.previewUrl,
                    editorUrl: deployment.editorUrl
                };
            } catch (deployError) {
                return { text: '❌ Cline timeout e falha no deploy. Tente novamente.' };
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
					const result = await runClineCLIInDirWithValidation(dir, reactCode, systemDeploy);
					const stdout = result.stdout;
					console.log('[CLINE][DEPLOY PROMPT] raw output length', stdout?.length || 0);
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

⚙️ **Código:**
${deploymentResult.editorUrl}`;
						} catch (deployError) {
							console.error('[DEPLOY] Error:', deployError);
							reply = '❌ Código editado mas falha no deploy.';
						}
					} else {
						reply = '✅ Nenhuma alteração detectada. Não publicarei.';
					}
					
					// Send messages in order: comment → link → screenshot
					
					// 1. Send Cline's commentary first if available
					if (stdout && stdout.trim().length > 0) {
						console.log(`[WEBHOOK] Sending Cline commentary to ${from} for /deploy command`);
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
					hasClineOutput: !!result.clineOutput
				});
				
				// Send messages in order: comment → link → screenshot
				
				// 1. Send Cline's commentary first if available
				if (result.clineOutput && result.clineOutput.trim().length > 0) {
					console.log(`[WEBHOOK] Sending Cline commentary to ${from}`);
					await sendWhatsappText(from, result.clineOutput.trim());
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


