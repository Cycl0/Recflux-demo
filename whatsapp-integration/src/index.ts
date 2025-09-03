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
		- React + Tailwind CSS + Framer Motion + GSAP
		- Use exclusivamente classes utilitárias do Tailwind para layout e estilos.
		- IMPORTANTE: Não importe tailwind no index.css, já está importado com cdn no index.html
		- CRUCIAL: Foque na replicação fiel dos designs de inspiração usando componentes customizados

		REGRAS DE FERRAMENTAS:
		1. Use o tool mcp__recflux__color_palette_generator para gerar paletas de cores harmoniosas e profissionais antes de começar o design.
		2. Use o tool mcp__recflux__puppeteer_search para buscar recursos audiovisuais relevantes. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		3. Atualize package.json quando necessário (dependências Tailwind já estão no template).
		
		ARQUIVOS-ALVO PRINCIPAIS:
		- src/App.jsx (componentes/sections e layout com Tailwind CSS customizado)
		- src/index.css (estilos customizados quando necessário)
		- src/components/ (componentes reutilizáveis inspirados nos designs analisados)
		- src/assets/ (recursos audiovisuais)
		- src/pages/ (páginas)
		- src/utils/ (funções auxiliares)
		- src/styles/ (estilos globais)
		- src/types/ (tipos)
		- src/hooks/ (hooks)

		COMPONENTES PRÉ-CONSTRUÍDOS OBRIGATÓRIOS (NUNCA CRIE DO ZERO):
		❌ PROIBIDO: Criar navbar do zero - USE SEMPRE o componente NavBar existente
		❌ PROIBIDO: Criar botão CTA do zero - USE SEMPRE o componente CTAButton existente
		✅ OBRIGATÓRIO: Use NavBar com defaultNavBarConfig como base e customize conforme o tema:
		  import NavBar, { defaultNavBarConfig } from '../components/NavBar';
		  // Customize navigationItems e rightSideItems baseado no tema do projeto
		✅ OBRIGATÓRIO: Use CTAButton com props corretas no CTA:
		  import CTAButton from '../components/CTAButton';
		  // Props: text="Texto do CTA", href="/acao", className="", glowingColor="#hexcolor"
		✅ OBRIGATÓRIO: Adapte os componentes ao tema mas mantenha sua estrutura base
		
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
		- Hero com video no background, Features (3+ cards) com imagens, navbar (usando NavBar), footer e CTA (usando CTAButton).
		- CTA OBRIGATÓRIO: Use CTAButton com glowingColor derivado da paleta de cores principal do tema.
		
		REGRAS ABSOLUTAS - NUNCA VIOLE ESTAS REGRAS:
		❌ PROIBIDO USAR EMOJIS: Nunca use 🚫 ❌ ✅ 💡 📱 🎮 🍔 etc. em lugar de ícones profissionais
		❌ PROIBIDO PLACEHOLDER IMAGES: Nunca use "placeholder.jpg", "image1.jpg", URLs genéricas
		❌ PROIBIDO BOTÕES SEM PADDING: Todo botão DEVE ter padding adequado baseado no design de inspiração
		❌ PROIBIDO CONTRASTE RUIM: NUNCA texto escuro em fundo escuro, NUNCA texto claro em fundo claro
		❌ EXEMPLOS PROIBIDOS: text-white em bg-white, text-black em bg-black
		❌ PROIBIDO CRIAR NAVBAR DO ZERO: Use SEMPRE o componente NavBar existente
		❌ PROIBIDO CRIAR CTA BUTTON DO ZERO: Use SEMPRE o componente CTAButton existente
		❌ PROIBIDO IGNORAR COMPONENTES PRÉ-CONSTRUÍDOS: Use os componentes do template como base
		✅ OBRIGATÓRIO: Use mcp__recflux__puppeteer_search para ícones/vetores/animações reais
		✅ OBRIGATÓRIO: Use mcp__recflux__freepik_ai_image_generator para todas as imagens
		✅ OBRIGATÓRIO: Substitua qualquer emoji encontrado por ícone real imediatamente
		✅ OBRIGATÓRIO: Todo botão DEVE ter classes de padding apropriadas (px-4 py-2, px-6 py-3, etc.)
		✅ OBRIGATÓRIO CONTRASTE: Fundos escuros = texto claro, Fundos claros = texto escuro
		✅ OBRIGATÓRIO FIDELIDADE: Replique exatamente os estilos observados nos sites de inspiração
		✅ OBRIGATÓRIO COMPONENTES: Use NavBar e CTAButton como base, adapte ao tema mantendo estrutura
		✅ OBRIGATÓRIO CTA GLOW: Configure glowingColor no CTAButton com cor principal do tema

		FLUXO DE TRABALHO:
		0) ANÁLISE COMPLETA DE INSPIRAÇÃO DE DESIGN - UMA ÚNICA CHAMADA PARA TOOL AUTOMATIZADO:
		   
		   OBRIGATÓRIO: Use APENAS mcp__recflux__design_inspiration_analyzer com o tema do projeto
		   - O tool AUTOMATICAMENTE seleciona exatamente 3 sites seguindo a fórmula obrigatória
		   - NUNCA chame múltiplos tools ou tente selecionar sites manualmente
		   - O analisador retorna TUDO: paletas, layouts, screenshots, insights consolidados
		   
		   DETALHAMENTO TÉCNICO (para compreensão do processo automatizado):
		   a) IDENTIFICAÇÃO DE SITES DE INSPIRAÇÃO: Identifique 2-4 sites de referência relevantes ao tema solicitado
		      ESTRATÉGIA DE SELEÇÃO:
		      1. SITES DIRETOS DE REFERÊNCIA (use 1-2 destes baseado no tema):
		         - https://huly.io/ (moderno, minimalista, tech-focused)
		         - https://linear.app/ (clean design, productivity tools)
		         - https://stripe.com/ (financial services, professional)
		         - https://figma.com/ (creative tools, collaborative design)
		         - https://notion.so/ (productivity, workspace tools)
		         - https://vercel.com/ (developer tools, modern tech)
		      
		      2. GALERIAS DE INSPIRAÇÃO VISUAL (escolha 1-2 baseado no tipo de projeto):
		         LANDING PAGES:
		         - https://land-book.com/ (landing page showcase)
		         - https://www.lapa.ninja/ (landing page inspiration)
		         - https://onepagelove.com/ (one page designs)
		         - https://www.landingfolio.com/ (landing page gallery)
		         - https://saaslandingpage.com/ (SaaS-focused)
		         - https://www.landing.love/ (modern landing pages)
		         
		         GENERAL WEB DESIGN:
		         - https://www.awwwards.com/ (award-winning sites)
		         - https://www.siteinspire.com/ (curated web design)
		         - https://httpster.net/ (totally rocking websites)
		         - https://godly.website/ (modern web design)
		         - https://www.cssdesignawards.com/ (CSS design awards)
		         - https://mindsparklemag.com/category/website/ (web design inspiration)
		         
		         UI/UX VISUAL GALLERIES:
		         - https://dribbble.com/ (design community)
		         - https://mobbin.com/ (mobile design patterns)
		         - https://component.gallery/ (design system components)
		         
		         CREATIVE & NICHE:
		         - https://www.behance.net/ (creative portfolios)
		         - https://muz.li/ (design inspiration)
		         - https://www.pinterest.com/ (visual discovery)
		         - https://saaspo.com/ (SaaS design showcase)
		         - https://gameuidatabase.com/ (game UI database)
		         - https://designfuell.com/ (design inspiration)
		         - https://visuelle.co.uk/ (visual design)
		         - https://maxibestof.one/ (best web designs)
		      
		      3. RECURSOS TEÓRICOS DE DESIGN (para princípios e melhores práticas):
		         UX/UI THEORY & BEST PRACTICES:
		         - https://goodux.appcues.com/categories (UX pattern theory and explanations)
		         - https://ui-patterns.com/patterns (UI pattern library with theory)
		         - https://goodui.org/ (evidence-based UI best practices)
		         
		         COMO USAR OS RECURSOS TEÓRICOS:
		         - Crawle estes sites para extrair PRINCÍPIOS e GUIDELINES
		         - Use as teorias para VALIDAR escolhas de design
		         - Aplique os padrões teóricos para OTIMIZAR usabilidade
		         - Combine teoria com inspiração visual para máxima efetividade
		      
		      4. SELEÇÃO INTELIGENTE AUTOMÁTICA: Com base no tema do projeto, escolha automaticamente:
		         FÓRMULA: 1 Site Direto + 1 Galeria Visual + 1 Recurso Teórico + (1-2 adicionais opcionais)
		         
		         TECH/SaaS/STARTUP → 
		         • https://huly.io/ (site direto) 
		         • https://land-book.com/ (galeria visual)
		         • https://goodui.org/ (teoria UX)
		         • https://www.awwwards.com/ (adicional)
		         
		         E-COMMERCE/BUSINESS → 
		         • https://stripe.com/ (site direto)
		         • https://www.landingfolio.com/ (galeria visual)
		         • https://goodux.appcues.com/categories (teoria UX)
		         • https://godly.website/ (adicional)
		         
		         CREATIVE/PORTFOLIO → 
		         • https://www.behance.net/ (galeria visual)
		         • https://dribbble.com/ (galeria visual)
		         • https://ui-patterns.com/patterns (teoria UI)
		         • https://httpster.net/ (adicional)
		         
		         LANDING PAGE/MARKETING → 
		         • https://onepagelove.com/ (galeria visual)
		         • https://www.lapa.ninja/ (galeria visual)
		         • https://goodux.appcues.com/categories (teoria UX)
		         • https://saaslandingpage.com/ (adicional)
		         
		         UI/UX FOCUSED → 
		         • https://mobbin.com/ (galeria visual)
		         • https://component.gallery/ (galeria visual)
		         • https://ui-patterns.com/patterns (teoria UI)
		         • https://goodui.org/ (teoria adicional)
		         
		         GAMING/ENTERTAINMENT → 
		         • https://gameuidatabase.com/ (galeria visual)
		         • https://www.awwwards.com/ (galeria visual)
		         • https://goodui.org/ (teoria UI)
		         • https://designfuell.com/ (adicional)
		         
		         GENERAL/OTHER → 
		         • https://www.siteinspire.com/ (galeria visual)
		         • https://land-book.com/ (galeria visual)
		         • https://goodui.org/ (teoria UI)
		         • Adicional baseado em contexto específico
		   
		   b) ANÁLISE HÍBRIDA: CRAWLING + VISUAL ANALYSIS - Execute ambas as estratégias:
		      
		      ESTRATÉGIA 1 - CRAWLING TEXTUAL ESPECIALIZADO:
		      Para cada tipo de site selecionado, use mcp__recflux__web_crawler com configuração específica:
		      
		      SITES DIRETOS DE REFERÊNCIA (huly.io, stripe.com, figma.com):
		      - maxPages=6, deepCrawl=true, deepCrawlStrategy='bfs'
		      - extractionQuery="Extract layout structures, color schemes, typography choices, component designs, spacing patterns, navigation styles, and visual hierarchy from this specific website"
		      - Foco: Estrutura específica e implementação real
		      
		      GALERIAS VISUAIS (awwwards, dribbble, land-book):
		      - maxPages=8, deepCrawl=true, deepCrawlStrategy='bfs'
		      - extractionQuery="Extract trending design elements, color palettes, typography trends, layout innovations, and visual styles from featured designs"
		      - Foco: Tendências visuais e estilos contemporâneos
		      
		      RECURSOS TEÓRICOS (goodui.org, ui-patterns.com, goodux.appcues.com):
		      - maxPages=10, deepCrawl=true, deepCrawlStrategy='dfs' (mais profundo para teoria)
		      - extractionQuery="Extract UX/UI principles, design guidelines, best practices, usability patterns, evidence-based recommendations, accessibility guidelines, and conversion optimization techniques"
		      - Foco: Princípios, teorias e melhores práticas fundamentais
		      
		      PROCESSAMENTO DIFERENCIADO:
		      - VISUAIS: Extrair exemplos e estilos para replicação
		      - TEÓRICOS: Extrair regras e princípios para validação
		      - DIRETOS: Extrair especificações técnicas para implementação
		      
		      ESTRATÉGIA 2 - ANÁLISE VISUAL DELEGADA COM SCREENSHOT E DOWNLOAD:
		      Para os 2-3 sites principais de inspiração:
		      
		      1. CAPTURA DE SCREENSHOTS E IMAGENS AUTOMATIZADA:
		         a) SITES DIRETOS: Para cada URL de inspiração direta (huly.io, stripe.com), use Puppeteer para capturar:
		            - Screenshot completo (full-page screenshot)
		            - Screenshot da viewport principal (above-the-fold)
		            - Screenshots de seções específicas (header, hero, features, footer)
		         
		         b) GALERIAS VISUAIS: Para galleries (awwwards.com, dribbble.com, land-book.com), execute:
		            PASSO 1 - NAVEGAÇÃO E SCREENSHOT DA GALERIA:
		            - Screenshot da página principal da galeria
		            - Navegue pelas páginas de showcase/featured designs
		            - Capture screenshots de múltiplos designs em destaque
		            
		            PASSO 2 - EXTRAÇÃO DE IMAGENS DOS DESIGNS:
		            - Use web crawler para identificar URLs de imagens dos designs
		            - Download direto das imagens de preview dos projetos
		            - Foco em imagens de alta resolução quando disponível
		            - Organize por tema/categoria quando possível
		            
		            PASSO 3 - SCREENSHOTS DE PROJETOS INDIVIDUAIS:
		            - Acesse 3-5 projetos em destaque relacionados ao tema
		            - Capture screenshots completos de cada projeto individual
		            - Documente URLs dos projetos originais para referência
		         
		         c) Salve screenshots e imagens temporariamente no diretório do projeto
		         d) Organize arquivos por categoria: direct-sites/, gallery-screenshots/, gallery-images/
		         
		      2. DELEGAÇÃO PARA MODELO VISUAL - GEMINI 2.0 FLASH:
		         IMPLEMENTAÇÃO ATUAL (FALLBACK): 
		         - Use análise textual detalhada + CSS inspection via web crawler
		         - Extraia informações de design através de selectors CSS específicos
		         - Analise computed styles e element properties
		         
		         IMPLEMENTAÇÃO PRINCIPAL - GEMINI 2.5 FLASH (OPENROUTER): 
		         - Integração com google/gemini-2.5-flash via OpenRouter API
		         - Custo-benefício otimizado para análise de screenshots em massa
		         - Capacidade nativa de visão para extração precisa de design elements
		         - FERRAMENTA DISPONÍVEL: Use mcp__recflux__gemini_vision_analyzer
		         - Ver especificação completa em src/visual-analysis-tool.ts e src/gemini-vision-integration.ts
		         
		         CONFIGURAÇÃO GEMINI OPENROUTER:
		         a) API Endpoint: https://openrouter.ai/api/v1/chat/completions
		         b) Model: "google/gemini-2.5-flash"
		         c) Headers: Authorization: Bearer OPENROUTER_API_KEY
		         d) Payload: messages com image_url para screenshots base64
		         
		         IMPLEMENTAÇÃO HÍBRIDA ATIVA:
		         a) Use mcp__recflux__design_inspiration_analyzer com o tema do projeto
		         b) O analisador AUTOMATICAMENTE FORÇA a fórmula "1 Site Direto + 1 Galeria Visual + 1 Recurso Teórico":
		            - GARANTE EXATAMENTE 3 sites selecionados (nunca mais, nunca menos)
		            - Seleciona 1 site direto da lista exclusiva (huly.io, stripe.com, figma.com, etc.)
		            - Seleciona 1 galeria visual da lista exclusiva (awwwards, dribbble, land-book, etc.)
		            - Seleciona 1 recurso teórico da lista exclusiva (goodui.org, ui-patterns.com, etc.)
		            - Executa web crawling para dados estruturais (HTML/CSS) nos 3 sites
		            - Captura screenshots dos sites selecionados (sites diretos + galerias)
		            - Download de imagens de design das galerias (awwwards, dribbble, land-book)
		            - Navega em projetos individuais das galerias para captura detalhada
		            - Analisa screenshots usando Gemini 2.5 Flash via OpenRouter
		            - Consolida insights textuais + visuais + imagens de referência
		            - Retorna paletas de cores, padrões de layout e especificações técnicas
		         c) Use os dados consolidados para:
		            - Informar geração de paleta de cores (step 2c)
		            - Criar componentes baseados nos padrões identificados
		            - Aplicar estilos visuais extraídos dos screenshots
		            - Usar imagens baixadas das galerias como referência visual direta
		            - Identificar layouts específicos dos projetos capturados
		            - Replicar elementos de design únicos encontrados nas galerias
		         c) Use o seguinte prompt estruturado:
		            "ANÁLISE VISUAL DE DESIGN - WEBSITE INSPIRATION
		            
		            Analise esta imagem de website e forneça uma análise técnica detalhada para replicação:
		            
		            1. LAYOUT & ESTRUTURA:
		               - Grid system usado (12-col, flexbox, css grid)
		               - Spacing patterns (margins, paddings em rem/px)
		               - Section arrangements (header height, content width, etc.)
		            
		            2. CORES ESPECÍFICAS:
		               - Identifique cores exatas (forneça hex codes aproximados)
		               - Gradients observados (direction, colors, stops)
		               - Color usage patterns (text, backgrounds, accents)
		            
		            3. TIPOGRAFIA TÉCNICA:
		               - Font families aparentes (serif, sans-serif, mono)
		               - Font weights observados (300, 400, 600, 700)
		               - Text sizes (aproxime em Tailwind scale: text-sm, text-lg, etc.)
		               - Line heights e letter spacing
		            
		            4. COMPONENTES REPLICÁVEIS:
		               - Button styles (rounded, shadows, hover states)
		               - Card designs (borders, shadows, spacing)
		               - Navigation patterns (sticky, transparent, etc.)
		               - Form elements styling
		            
		            5. IMPLEMENTAÇÃO TAILWIND CSS:
		               - Classes específicas do Tailwind para replicar o layout
		               - Componentes customizados baseados na inspiração
		               - Custom CSS necessário (se houver)
		               - Responsive breakpoints observados
		            
		            6. ELEMENTOS ÚNICOS:
		               - Animações ou micro-interactions visíveis
		               - Patterns decorativos ou elementos gráficos
		               - Innovative solutions que se destacam
		            
		            Forneça uma descrição técnica precisa que permita replicar este design usando React + Tailwind CSS."
		         
		      3. PROCESSAMENTO DOS RESULTADOS VISUAIS:
		         a) Colete todas as análises visuais dos screenshots
		         b) Extraia dados estruturados (cores, spacing, components)
		         c) Crie uma "style guide" consolidada baseada nas análises
		         d) Identifique padrões comuns entre os sites analisados
		         
		      4. CONSOLIDAÇÃO HÍBRIDA:
		         a) Combine dados textuais do web crawler
		         b) Integre insights visuais do modelo vision-capable
		         c) Crie um "design brief" unificado com:
		            - Paleta de cores extraída (hex codes específicos)
		            - Tipografia recommendations (font families + sizes)
		            - Layout patterns para implementar
		            - Component specifications (buttons, cards, etc.)
		            - Animation/interaction guidelines
		   c) ANÁLISE DETALHADA CATEGORIZADA: Para cada tipo de site crawlado, extraia e documente:
		      
		      SITES VISUAIS (diretos + galerias) - ASPECTOS VISUAIS:
		      - Paletas de cores dominantes (primária, secundária, accent, gradients)
		      - Tipografia (font families, sizes, weights, line-heights, font pairings)
		      - Espaçamento e grid systems (margins, paddings, containers, breakpoints)
		      - Estilo visual geral (minimalista, bold, colorful, monochrome, etc.)
		      - Estrutura de layout (header, hero, sections, footer arrangements)
		      - Padrões de navegação (header styles, menu types, mobile navigation)
		      - Componentes únicos (cards, buttons, forms, modals, testimonials)
		      - Call-to-Action patterns (placement, styling, messaging)
		      - Animações e interações (hover effects, transitions, micro-interactions)
		      
		      RECURSOS TEÓRICOS - PRINCÍPIOS E GUIDELINES:
		      - USABILIDADE: Heurísticas de Nielsen, princípios de acessibilidade
		      - UX PATTERNS: Padrões de navegação, fluxos de usuário otimizados
		      - UI GUIDELINES: Hierarquia visual, contraste, legibilidade
		      - CONVERSÃO: Técnicas para otimizar CTAs e formulários
		      - PSICOLOGIA: Princípios de design persuasivo e behavioral design
		      - RESPONSIVIDADE: Best practices para mobile-first design
		      - PERFORMANCE: Guidelines para loading e feedback visual
		      - ACESSIBILIDADE: WCAG guidelines e inclusive design
		      
		      CONSOLIDAÇÃO TEORIA + VISUAL:
		      - Aplique princípios teóricos para VALIDAR escolhas visuais
		      - Use guidelines para OTIMIZAR layouts observados
		      - Combine estética visual com usabilidade comprovada
		      - Priorize soluções que atendem tanto apelo visual quanto eficácia UX
		   d) SÍNTESE DE INSPIRAÇÃO: Combine os melhores elementos de cada site analisado
		   e) APLICAÇÃO ESTRATÉGICA: Use os insights coletados para influenciar:
		      - Escolha de cores base para a paleta (step 2c)
		      - Criação de componentes customizados que repliquem os padrões identificados
		      - Estrutura e layout do site final baseado nos designs analisados
		      - Prompts para geração de imagens contextuais
		   REGRAS CRÍTICAS:
		   - SEMPRE use mcp__recflux__design_inspiration_analyzer antes de começar o design
		   - NÃO pule esta etapa - é essencial para criar designs únicos e profissionais
		   - Use os dados consolidados para informar TODAS as decisões de design subsequentes
		   - O analisador automaticamente seleciona, captura e analisa sites de inspiração baseado no tema
		1) read_file em src/App.jsx e src/index.css
		2) GERAÇÃO DE PALETA DE CORES TEMÁTICA AVANÇADA COM INSPIRAÇÃO - Execute estes passos:
		   a) ANÁLISE DETALHADA DO TEMA: Identifique o tema específico e subtema (ex: gaming→RPG, business→fintech, food→italian)
		   b) EXTRAÇÃO DE CORES DOS SITES DE INSPIRAÇÃO: Com base na análise híbrida do step 5, identifique:
		      DADOS DO CRAWLING TEXTUAL:
		      - Cores dominantes encontradas nos sites crawlados (text-based analysis)
		      - Combinações de cores mencionadas em descriptions/CSS
		      - Paletas que se destacaram na análise textual
		      
		      DADOS DA ANÁLISE VISUAL (PRIORITÁRIO):
		      - Hex codes específicos extraídos pelo modelo visual das screenshots
		      - Gradientes observados com colors/directions exatos
		      - Patterns de uso de cor (backgrounds, texto, accents) identificados visualmente
		      - Color relationships precisos (complementary, analogous, triadic)
		   c) SELEÇÃO ESTRATÉGICA DE CORES HÍBRIDA: Use dados do design_inspiration_analyzer:
		      - Cores primárias, secundárias e de destaque consolidadas da análise visual
		      - 1 cor complementar baseada na psicologia das cores para o tema
		      - Gradientes específicos identificados nos sites de inspiração (se aplicável)
		      - Paletas de cores extraídas diretamente dos screenshots analisados pelo Gemini
		      
		   TEMAS E CORES OTIMIZADAS (como fallback):
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
		   
		   d) GERAÇÃO INTELIGENTE COM INSPIRAÇÃO VISUAL: Use mcp__recflux__color_palette_generator com:
		      - mode='transformer' (para harmonia inteligente)
		      - temperature=0.8 (reduzido para manter fidelidade às cores extraídas visualmente)
		      - numColors=5 (para mais opções, incluindo gradients)
		      - baseColors=[hex_codes_exatos_dos_screenshots + cor_psicológica_temática]
		      EXEMPLO: baseColors=["#1a1a2e", "#16213e", "#e94560"] (cores de huly.io via análise visual)
		   e) VALIDAÇÃO DA INSPIRAÇÃO VISUAL: 
		      - Compare paleta gerada com hex codes extraídos pelos screenshots
		      - Confirme que as cores principais dos sites de inspiração estão representadas
		      - Ajuste se necessário para manter fidelidade visual à inspiração
		3) Implemente a UI no src/App.jsx com componentes customizados, aplicando as cores da paleta gerada
		   REGRAS CRÍTICAS PARA COMPONENTES CUSTOMIZADOS:
		   - TODO botão deve ter padding adequado (exemplo: "px-6 py-3" ou "px-4 py-2" dependendo do tamanho)
		   - Use classes Tailwind específicas que repliquem exatamente os designs de inspiração
		   - Aplique cores de texto que contrastem adequadamente com os fundos
		   - Implemente hover states e transições suaves baseadas nos padrões observados
		4) ANÁLISE E CRIAÇÃO DE COMPONENTES CUSTOMIZADOS:
		   a) Com base nas análises de inspiração, identifique os padrões de componentes necessários
		   b) Crie componentes customizados que repliquem fielmente os designs analisados
		   c) Organize componentes por categoria: Layout, Navigation, Data Display, Forms, Interactive, etc.
		   d) Implemente componentes responsivos usando Tailwind CSS puro
		   e) Crie arquivos organizados nas pastas components/, hooks/, e utils/ baseado nos padrões identificados
		5) ANÁLISE COMPLETA DE INSPIRAÇÃO DE DESIGN - Execute estes passos OBRIGATORIAMENTE:
		   a) IDENTIFICAÇÃO DE SITES DE INSPIRAÇÃO: Identifique 2-4 sites de referência relevantes ao tema solicitado
		      ESTRATÉGIA DE SELEÇÃO:
		      1. SITES DIRETOS DE REFERÊNCIA (use 1-2 destes baseado no tema):
		         - https://huly.io/ (moderno, minimalista, tech-focused)
		         - https://linear.app/ (clean design, productivity tools)
		         - https://stripe.com/ (financial services, professional)
		         - https://figma.com/ (creative tools, collaborative design)
		         - https://notion.so/ (productivity, workspace tools)
		         - https://vercel.com/ (developer tools, modern tech)
		      
		      2. GALERIAS DE INSPIRAÇÃO VISUAL (escolha 1-2 baseado no tipo de projeto):
		         LANDING PAGES:
		         - https://land-book.com/ (landing page showcase)
		         - https://www.lapa.ninja/ (landing page inspiration)
		         - https://onepagelove.com/ (one page designs)
		         - https://www.landingfolio.com/ (landing page gallery)
		         - https://saaslandingpage.com/ (SaaS-focused)
		         - https://www.landing.love/ (modern landing pages)
		         
		         GENERAL WEB DESIGN:
		         - https://www.awwwards.com/ (award-winning sites)
		         - https://www.siteinspire.com/ (curated web design)
		         - https://httpster.net/ (totally rocking websites)
		         - https://godly.website/ (modern web design)
		         - https://www.cssdesignawards.com/ (CSS design awards)
		         - https://mindsparklemag.com/category/website/ (web design inspiration)
		         
		         UI/UX VISUAL GALLERIES:
		         - https://dribbble.com/ (design community)
		         - https://mobbin.com/ (mobile design patterns)
		         - https://component.gallery/ (design system components)
		         
		         CREATIVE & NICHE:
		         - https://www.behance.net/ (creative portfolios)
		         - https://muz.li/ (design inspiration)
		         - https://www.pinterest.com/ (visual discovery)
		         - https://saaspo.com/ (SaaS design showcase)
		         - https://gameuidatabase.com/ (game UI database)
		         - https://designfuell.com/ (design inspiration)
		         - https://visuelle.co.uk/ (visual design)
		         - https://maxibestof.one/ (best web designs)
		      
		      3. RECURSOS TEÓRICOS DE DESIGN (para princípios e melhores práticas):
		         UX/UI THEORY & BEST PRACTICES:
		         - https://goodux.appcues.com/categories (UX pattern theory and explanations)
		         - https://ui-patterns.com/patterns (UI pattern library with theory)
		         - https://goodui.org/ (evidence-based UI best practices)
		         
		         COMO USAR OS RECURSOS TEÓRICOS:
		         - Crawle estes sites para extrair PRINCÍPIOS e GUIDELINES
		         - Use as teorias para VALIDAR escolhas de design
		         - Aplique os padrões teóricos para OTIMIZAR usabilidade
		         - Combine teoria com inspiração visual para máxima efetividade
		      
		      4. SELEÇÃO INTELIGENTE AUTOMÁTICA: Com base no tema do projeto, escolha automaticamente:
		         FÓRMULA: 1 Site Direto + 1 Galeria Visual + 1 Recurso Teórico + (1-2 adicionais opcionais)
		         
		         TECH/SaaS/STARTUP → 
		         • https://huly.io/ (site direto) 
		         • https://land-book.com/ (galeria visual)
		         • https://goodui.org/ (teoria UX)
		         • https://www.awwwards.com/ (adicional)
		         
		         E-COMMERCE/BUSINESS → 
		         • https://stripe.com/ (site direto)
		         • https://www.landingfolio.com/ (galeria visual)
		         • https://goodux.appcues.com/categories (teoria UX)
		         • https://godly.website/ (adicional)
		         
		         CREATIVE/PORTFOLIO → 
		         • https://www.behance.net/ (galeria visual)
		         • https://dribbble.com/ (galeria visual)
		         • https://ui-patterns.com/patterns (teoria UI)
		         • https://httpster.net/ (adicional)
		         
		         LANDING PAGE/MARKETING → 
		         • https://onepagelove.com/ (galeria visual)
		         • https://www.lapa.ninja/ (galeria visual)
		         • https://goodux.appcues.com/categories (teoria UX)
		         • https://saaslandingpage.com/ (adicional)
		         
		         UI/UX FOCUSED → 
		         • https://mobbin.com/ (galeria visual)
		         • https://component.gallery/ (galeria visual)
		         • https://ui-patterns.com/patterns (teoria UI)
		         • https://goodui.org/ (teoria adicional)
		         
		         GAMING/ENTERTAINMENT → 
		         • https://gameuidatabase.com/ (galeria visual)
		         • https://www.awwwards.com/ (galeria visual)
		         • https://goodui.org/ (teoria UI)
		         • https://designfuell.com/ (adicional)
		         
		         GENERAL/OTHER → 
		         • https://www.siteinspire.com/ (galeria visual)
		         • https://land-book.com/ (galeria visual)
		         • https://goodui.org/ (teoria UI)
		         • Adicional baseado em contexto específico
		   
		   b) ANÁLISE HÍBRIDA: CRAWLING + VISUAL ANALYSIS - Execute ambas as estratégias:
		      
		      ESTRATÉGIA 1 - CRAWLING TEXTUAL ESPECIALIZADO:
		      Para cada tipo de site selecionado, use mcp__recflux__web_crawler com configuração específica:
		      
		      SITES DIRETOS DE REFERÊNCIA (huly.io, stripe.com, figma.com):
		      - maxPages=6, deepCrawl=true, deepCrawlStrategy='bfs'
		      - extractionQuery="Extract layout structures, color schemes, typography choices, component designs, spacing patterns, navigation styles, and visual hierarchy from this specific website"
		      - Foco: Estrutura específica e implementação real
		      
		      GALERIAS VISUAIS (awwwards, dribbble, land-book):
		      - maxPages=8, deepCrawl=true, deepCrawlStrategy='bfs'
		      - extractionQuery="Extract trending design elements, color palettes, typography trends, layout innovations, and visual styles from featured designs"
		      - Foco: Tendências visuais e estilos contemporâneos
		      
		      RECURSOS TEÓRICOS (goodui.org, ui-patterns.com, goodux.appcues.com):
		      - maxPages=10, deepCrawl=true, deepCrawlStrategy='dfs' (mais profundo para teoria)
		      - extractionQuery="Extract UX/UI principles, design guidelines, best practices, usability patterns, evidence-based recommendations, accessibility guidelines, and conversion optimization techniques"
		      - Foco: Princípios, teorias e melhores práticas fundamentais
		      
		      PROCESSAMENTO DIFERENCIADO:
		      - VISUAIS: Extrair exemplos e estilos para replicação
		      - TEÓRICOS: Extrair regras e princípios para validação
		      - DIRETOS: Extrair especificações técnicas para implementação
		      
		      ESTRATÉGIA 2 - ANÁLISE VISUAL DELEGADA COM SCREENSHOT E DOWNLOAD:
		      Para os 2-3 sites principais de inspiração:
		      
		      1. CAPTURA DE SCREENSHOTS E IMAGENS AUTOMATIZADA:
		         a) SITES DIRETOS: Para cada URL de inspiração direta (huly.io, stripe.com), use Puppeteer para capturar:
		            - Screenshot completo (full-page screenshot)
		            - Screenshot da viewport principal (above-the-fold)
		            - Screenshots de seções específicas (header, hero, features, footer)
		         
		         b) GALERIAS VISUAIS: Para galleries (awwwards.com, dribbble.com, land-book.com), execute:
		            PASSO 1 - NAVEGAÇÃO E SCREENSHOT DA GALERIA:
		            - Screenshot da página principal da galeria
		            - Navegue pelas páginas de showcase/featured designs
		            - Capture screenshots de múltiplos designs em destaque
		            
		            PASSO 2 - EXTRAÇÃO DE IMAGENS DOS DESIGNS:
		            - Use web crawler para identificar URLs de imagens dos designs
		            - Download direto das imagens de preview dos projetos
		            - Foco em imagens de alta resolução quando disponível
		            - Organize por tema/categoria quando possível
		            
		            PASSO 3 - SCREENSHOTS DE PROJETOS INDIVIDUAIS:
		            - Acesse 3-5 projetos em destaque relacionados ao tema
		            - Capture screenshots completos de cada projeto individual
		            - Documente URLs dos projetos originais para referência
		         
		         c) Salve screenshots e imagens temporariamente no diretório do projeto
		         d) Organize arquivos por categoria: direct-sites/, gallery-screenshots/, gallery-images/
		         
		      2. DELEGAÇÃO PARA MODELO VISUAL - GEMINI 2.0 FLASH:
		         IMPLEMENTAÇÃO ATUAL (FALLBACK): 
		         - Use análise textual detalhada + CSS inspection via web crawler
		         - Extraia informações de design através de selectors CSS específicos
		         - Analise computed styles e element properties
		         
		         IMPLEMENTAÇÃO PRINCIPAL - GEMINI 2.5 FLASH (OPENROUTER): 
		         - Integração com google/gemini-2.5-flash via OpenRouter API
		         - Custo-benefício otimizado para análise de screenshots em massa
		         - Capacidade nativa de visão para extração precisa de design elements
		         - FERRAMENTA DISPONÍVEL: Use mcp__recflux__gemini_vision_analyzer
		         - Ver especificação completa em src/visual-analysis-tool.ts e src/gemini-vision-integration.ts
		         
		         CONFIGURAÇÃO GEMINI OPENROUTER:
		         a) API Endpoint: https://openrouter.ai/api/v1/chat/completions
		         b) Model: "google/gemini-2.5-flash"
		         c) Headers: Authorization: Bearer OPENROUTER_API_KEY
		         d) Payload: messages com image_url para screenshots base64
		         
		         IMPLEMENTAÇÃO HÍBRIDA ATIVA:
		         a) Use mcp__recflux__design_inspiration_analyzer com o tema do projeto
		         b) O analisador AUTOMATICAMENTE FORÇA a fórmula "1 Site Direto + 1 Galeria Visual + 1 Recurso Teórico":
		            - GARANTE EXATAMENTE 3 sites selecionados (nunca mais, nunca menos)
		            - Seleciona 1 site direto da lista exclusiva (huly.io, stripe.com, figma.com, etc.)
		            - Seleciona 1 galeria visual da lista exclusiva (awwwards, dribbble, land-book, etc.)
		            - Seleciona 1 recurso teórico da lista exclusiva (goodui.org, ui-patterns.com, etc.)
		            - Executa web crawling para dados estruturais (HTML/CSS) nos 3 sites
		            - Captura screenshots dos sites selecionados (sites diretos + galerias)
		            - Download de imagens de design das galerias (awwwards, dribbble, land-book)
		            - Navega em projetos individuais das galerias para captura detalhada
		            - Analisa screenshots usando Gemini 2.5 Flash via OpenRouter
		            - Consolida insights textuais + visuais + imagens de referência
		            - Retorna paletas de cores, padrões de layout e especificações técnicas
		         c) Use os dados consolidados para:
		            - Informar geração de paleta de cores (step 2c)
		            - Criar componentes baseados nos padrões identificados
		            - Aplicar estilos visuais extraídos dos screenshots
		            - Usar imagens baixadas das galerias como referência visual direta
		            - Identificar layouts específicos dos projetos capturados
		            - Replicar elementos de design únicos encontrados nas galerias
		         c) Use o seguinte prompt estruturado:
		            "ANÁLISE VISUAL DE DESIGN - WEBSITE INSPIRATION
		            
		            Analise esta imagem de website e forneça uma análise técnica detalhada para replicação:
		            
		            1. LAYOUT & ESTRUTURA:
		               - Grid system usado (12-col, flexbox, css grid)
		               - Spacing patterns (margins, paddings em rem/px)
		               - Section arrangements (header height, content width, etc.)
		            
		            2. CORES ESPECÍFICAS:
		               - Identifique cores exatas (forneça hex codes aproximados)
		               - Gradients observados (direction, colors, stops)
		               - Color usage patterns (text, backgrounds, accents)
		            
		            3. TIPOGRAFIA TÉCNICA:
		               - Font families aparentes (serif, sans-serif, mono)
		               - Font weights observados (300, 400, 600, 700)
		               - Text sizes (aproxime em Tailwind scale: text-sm, text-lg, etc.)
		               - Line heights e letter spacing
		            
		            4. COMPONENTES REPLICÁVEIS:
		               - Button styles (rounded, shadows, hover states)
		               - Card designs (borders, shadows, spacing)
		               - Navigation patterns (sticky, transparent, etc.)
		               - Form elements styling
		            
		            5. IMPLEMENTAÇÃO TAILWIND CSS:
		               - Classes específicas do Tailwind para replicar o layout
		               - Componentes customizados baseados na inspiração
		               - Custom CSS necessário (se houver)
		               - Responsive breakpoints observados
		            
		            6. ELEMENTOS ÚNICOS:
		               - Animações ou micro-interactions visíveis
		               - Patterns decorativos ou elementos gráficos
		               - Innovative solutions que se destacam
		            
		            Forneça uma descrição técnica precisa que permita replicar este design usando React + Tailwind CSS."
		         
		      3. PROCESSAMENTO DOS RESULTADOS VISUAIS:
		         a) Colete todas as análises visuais dos screenshots
		         b) Extraia dados estruturados (cores, spacing, components)
		         c) Crie uma "style guide" consolidada baseada nas análises
		         d) Identifique padrões comuns entre os sites analisados
		         
		      4. CONSOLIDAÇÃO HÍBRIDA:
		         a) Combine dados textuais do web crawler
		         b) Integre insights visuais do modelo vision-capable
		         c) Crie um "design brief" unificado com:
		            - Paleta de cores extraída (hex codes específicos)
		            - Tipografia recommendations (font families + sizes)
		            - Layout patterns para implementar
		            - Component specifications (buttons, cards, etc.)
		            - Animation/interaction guidelines
		   c) ANÁLISE DETALHADA CATEGORIZADA: Para cada tipo de site crawlado, extraia e documente:
		      
		      SITES VISUAIS (diretos + galerias) - ASPECTOS VISUAIS:
		      - Paletas de cores dominantes (primária, secundária, accent, gradients)
		      - Tipografia (font families, sizes, weights, line-heights, font pairings)
		      - Espaçamento e grid systems (margins, paddings, containers, breakpoints)
		      - Estilo visual geral (minimalista, bold, colorful, monochrome, etc.)
		      - Estrutura de layout (header, hero, sections, footer arrangements)
		      - Padrões de navegação (header styles, menu types, mobile navigation)
		      - Componentes únicos (cards, buttons, forms, modals, testimonials)
		      - Call-to-Action patterns (placement, styling, messaging)
		      - Animações e interações (hover effects, transitions, micro-interactions)
		      
		      RECURSOS TEÓRICOS - PRINCÍPIOS E GUIDELINES:
		      - USABILIDADE: Heurísticas de Nielsen, princípios de acessibilidade
		      - UX PATTERNS: Padrões de navegação, fluxos de usuário otimizados
		      - UI GUIDELINES: Hierarquia visual, contraste, legibilidade
		      - CONVERSÃO: Técnicas para otimizar CTAs e formulários
		      - PSICOLOGIA: Princípios de design persuasivo e behavioral design
		      - RESPONSIVIDADE: Best practices para mobile-first design
		      - PERFORMANCE: Guidelines para loading e feedback visual
		      - ACESSIBILIDADE: WCAG guidelines e inclusive design
		      
		      CONSOLIDAÇÃO TEORIA + VISUAL:
		      - Aplique princípios teóricos para VALIDAR escolhas visuais
		      - Use guidelines para OTIMIZAR layouts observados
		      - Combine estética visual com usabilidade comprovada
		      - Priorize soluções que atendem tanto apelo visual quanto eficácia UX
		   d) SÍNTESE DE INSPIRAÇÃO: Combine os melhores elementos de cada site analisado
		   e) APLICAÇÃO ESTRATÉGICA: Use os insights coletados para influenciar:
		      - Escolha de cores base para a paleta (step 2c)
		      - Criação de componentes customizados que repliquem os padrões identificados
		      - Estrutura e layout do site final baseado nos designs analisados
		      - Prompts para geração de imagens contextuais
		   REGRAS CRÍTICAS:
		   - SEMPRE use mcp__recflux__design_inspiration_analyzer antes de começar o design
		   - NÃO pule esta etapa - é essencial para criar designs únicos e profissionais
		   - Use os dados consolidados para informar TODAS as decisões de design subsequentes
		   - O analisador automaticamente seleciona, captura e analisa sites de inspiração baseado no tema
		   - Documente claramente como cada elemento de inspiração foi aplicado
		6) ADICIONE VÍDEOS PROFISSIONAIS: Use mcp__recflux__puppeteer_search com searchType='videos' para encontrar vídeos de background relevantes ao tema para o hero
		7) ADICIONE CONTEÚDO VISUAL PROFISSIONAL - Execute estes passos:
		   a) ANIMAÇÕES: Use mcp__recflux__puppeteer_search com searchType='animations' para encontrar animações relevantes ao tema
		   b) ÍCONES: Use mcp__recflux__puppeteer_search com searchType='icons' para encontrar ícones profissionais (NUNCA use emojis)
		   c) EFEITOS VISUAIS: Use mcp__recflux__puppeteer_search com searchType='vfx' para efeitos visuais especiais quando apropriado
		   d) INTEGRAÇÃO: Integre estes recursos encontrados no código usando as URLs retornadas
		   REGRAS CRÍTICAS - OBRIGATÓRIO SEGUIR:
		   - SEMPRE use as ferramentas de busca para encontrar conteúdo visual real
		   - PROIBIDO: Usar emojis em qualquer lugar do código (🚫 ❌ ✅ 💡 📱 etc.)
		   - OBRIGATÓRIO: Use URLs reais retornados pelas ferramentas de busca
		   - Se encontrar emoji no código, SUBSTITUA imediatamente por ícone real usando mcp__recflux__puppeteer_search
		8) PROCESSO CRÍTICO DE GERAÇÃO DE IMAGENS COM INSPIRAÇÃO - Execute estes passos em ordem sequencial PARA CADA IMAGEM INDIVIDUAL:
		   a) PLANEJAMENTO: Primeiro identifique EXATAMENTE onde cada imagem será colocada (hero, cards, sections, etc)
		   b) ANÁLISE CONTEXTUAL: Para cada localização de imagem, analise a árvore de componentes (títulos, descrições, stats, atributos) ao redor da posição da imagem
		   c) APLICAÇÃO DE INSPIRAÇÃO VISUAL PRECISA: Com base na análise híbrida do step 5, incorpore:
		      DADOS DA ANÁLISE VISUAL (SCREENSHOTS):
		      - Estilo visual ESPECÍFICO identificado pelo modelo visual (ex: "huly.io minimalist dark theme")
		      - Hex codes EXATOS extraídos das screenshots para usar na geração
		      - Layout compositions específicos observados (grid arrangements, spacing patterns)
		      - Visual elements únicos identificados nas imagens (gradients, shadows, textures)
		      
		      DADOS DO CRAWLING TEXTUAL (SUPORTE):
		      - Context adicional sobre branding/messaging dos sites
		      - Technical specifications mencionadas em text content
		   d) NÃO PARE até encontrar o título específico (ex: "Mystic Mage") E a descrição específica (ex: "Master of ancient spells and arcane knowledge") do elemento
		   e) GERAÇÃO ESPECÍFICA INDIVIDUAL COM INSPIRAÇÃO VISUAL PRECISA: Use mcp__recflux__freepik_ai_image_generator UMA VEZ POR CADA IMAGEM com:
		      FORMATO DE PROMPT ENHANCED:
		      - prompt="[título_específico] + [descrição_específica] + in the style of [site_específico_analisado] + [visual_style_extraído] + using colors [hex_codes_exatos] + [composition_pattern_observado]"
		      
		      EXEMPLOS BASEADOS EM ANÁLISE VISUAL:
		      - "Modern Dashboard Interface, Clean data visualization tool, in the style of huly.io minimalist design, dark theme with precise spacing, using colors #1a1a2e #16213e #e94560, with card-based layout and subtle gradients"
		      - "Professional Team Photo, Collaborative workspace environment, in the style of Linear.app clean aesthetic, bright minimal design, using colors #ffffff #f8fafc #6366f1, with geometric composition and soft shadows"
		   f) VERIFICAÇÃO: Confirme que a imagem gerada corresponde ao contexto específico do componente
		   g) REPETIÇÃO OBRIGATÓRIA: Execute este processo SEPARADAMENTE para CADA UMA das 3-6 imagens necessárias no site
		   REGRAS CRÍTICAS - EXECUÇÃO OBRIGATÓRIA:
		   - FAÇA UMA CHAMADA SEPARADA de mcp__recflux__freepik_ai_image_generator para cada imagem individual
		   - NUNCA tente gerar múltiplas imagens em uma única chamada
		   - SEMPRE inclua o htmlContext específico de onde a imagem será colocada
		   - Se há 6 cards, faça 6 chamadas separadas, uma para cada card
		   - PROIBIDO: Usar placeholder images, stock photos genéricas ou deixar src vazio
		   - OBRIGATÓRIO: Toda tag <img> deve usar imageUrl retornada pela ferramenta de geração
		   - VERIFICAÇÃO: Confirme que todas as imagens no código final são URLs geradas pela IA
		   EXEMPLO: Se encontrar uma card com título "Mystic Mage" e descrição "Master of ancient spells and arcane knowledge", use prompt "Mystic Mage, Master of ancient spells and arcane knowledge" - NUNCA use apenas "mage"
		9) Adicione fontes da lista permitida
		10) Implemente a paleta de cores em todos os elementos (backgrounds, texto, botões, bordas, gradients)
		11) Adicione outros recursos se necessário
		12) Verifique novamente o contraste de cores, principalmente se houver temas diferentes e veja o posicionamento dos elementos, ajuste se necessário
		13) VERIFICAÇÃO CRÍTICA DE CONTRASTE E BOTÕES - Execute OBRIGATORIAMENTE:
		    FASE 1 - CONTRASTE (CRÍTICO):
		    a) INSPEÇÃO TOTAL: Examine CADA combinação texto/fundo no código inteiro
		    b) VERIFICAÇÕES ESPECÍFICAS:
		       - Se bg-white/bg-gray-100/bg-light (claro) → DEVE usar text-gray-900/text-black
		       - Se bg-black/bg-gray-900/bg-dark (escuro) → DEVE usar text-white/text-gray-100
		       - Se bg-custom claro (bg-white, bg-gray-100) → adicione text-gray-900/text-black
		       - Se bg-custom escuro (bg-black, bg-gray-900, bg-blue-600) → adicione text-white
		       - Replique exatamente as cores observadas nos sites de inspiração
		    c) CORREÇÃO IMEDIATA: Substitua TODAS as combinações ruins encontradas
		    d) EXEMPLOS DE CORREÇÃO:
		       - ❌ "bg-white text-white" → ✅ "bg-white text-gray-900"
		       - ❌ "bg-black text-black" → ✅ "bg-black text-white"
		       - ❌ Botão sem contraste adequado → ✅ Replique cores dos sites de inspiração
		       - ❌ "button text-white bg-white" → ✅ "button text-gray-900 bg-white"
		    
		    FASE 2 - COMPONENTES:
		    e) INSPEÇÃO: Encontre TODOS os elementos button, cards, navegação no código
		    f) CORREÇÃO: Cada componente DEVE replicar o estilo dos sites de inspiração
		    g) FIDELIDADE VISUAL: Mantenha cores, spacing e styling conforme observado na análise
		    h) VALIDAÇÃO FINAL: Confirme que todos os componentes seguem os padrões das referências visuais
		14) Atualize o package.json com as dependências necessárias
		15) VALIDAÇÃO FINAL DA INSPIRAÇÃO + TEORIA - Execute para garantir qualidade total:
		    a) VERIFICAÇÃO DE FIDELIDADE VISUAL: Compare o resultado final com sites visuais analisados
		    b) VALIDAÇÃO TEÓRICA UX/UI: Aplique princípios extraídos dos recursos teóricos
		    c) CHECKLIST DUPLO DE INSPIRAÇÃO:
		       ASPECTOS VISUAIS:
		       - ✅ Layout reflete a estrutura dos sites analisados?
		       - ✅ Paleta de cores incorpora elementos dos sites de referência?
		       - ✅ Tipografia segue padrões observados na inspiração?
		       - ✅ Componentes seguem o estilo visual dos sites analisados?
		       - ✅ Hierarquia visual reflete as melhores práticas observadas?
		       
		       VALIDAÇÃO TEÓRICA:
		       - ✅ Design atende heurísticas de usabilidade (Nielsen)?
		       - ✅ Contraste e legibilidade seguem guidelines de acessibilidade?
		       - ✅ CTAs aplicam técnicas de conversão comprovadas?
		       - ✅ Layout responsivo segue mobile-first principles?
		       - ✅ Hierarquia visual otimizada para scanning patterns?
		       - ✅ Componentes seguem padrões estabelecidos (UI patterns)?
		    d) AJUSTES FINAIS INTEGRADOS: 
		       - Se fidelidade visual baixa: ajuste baseado na inspiração visual
		       - Se validação teórica falha: ajuste baseado nos princípios UX/UI
		       - Busque equilíbrio entre estética e usabilidade
		    e) DOCUMENTAÇÃO COMPLETA: 
		       - Como sites visuais influenciaram o design
		       - Quais princípios teóricos foram aplicados
		       - Justificativas para escolhas de design baseadas em evidências

		Se solicitado, publicar com mcp__recflux__codesandbox_deploy
		
		RESUMO DO SISTEMA ENHANCED DE INSPIRAÇÃO + TEORIA + GEMINI VISION:
		Este sistema híbrido combina 3 pilares fundamentais:
		
		PILAR 1 - INSPIRAÇÃO VISUAL COM IA:
		• Web crawling de sites diretos e galerias visuais (estrutural)
		• ★ ANÁLISE VISUAL COM GEMINI 2.5 FLASH via OpenRouter (pixel-perfect)
		• Screenshots + AI vision para extração precisa de cores, layouts, componentes
		• Ferramenta: mcp__recflux__gemini_vision_analyzer
		
		PILAR 2 - FUNDAMENTOS TEÓRICOS:
		• Crawling profundo de recursos teóricos (GoodUI, UI Patterns, GoodUX)
		• Extração de princípios UX/UI e guidelines de usabilidade
		• Validação baseada em evidências e melhores práticas
		
		PILAR 3 - INTEGRAÇÃO INTELIGENTE:
		• Seleção automática de 25+ fontes organizadas por categoria
		• Fórmula balanceada: Visual + Teoria + Implementação
		• Validação dupla: fidelidade visual + compliance teórico
		
		TECNOLOGIAS INTEGRADAS:
		✓ Google Gemini 2.5 Flash (OpenRouter) para análise visual
		✓ Crawl4AI para extração textual e estrutural
		✓ Puppeteer para captura de screenshots
		✓ Color palette generator com dados visuais precisos
		✓ Image generator com inspiração contextual
		
		DIFERENCIAIS ÚNICOS:
		✓ Separação clara: Visual (AI) + Textual (Crawling) + Teórico (Guidelines)
		✓ Análise AI com hex codes exatos e especificações técnicas
		✓ Custo-benefício otimizado (Gemini 2.5 Flash vs Claude/GPT-4V)
		✓ Crawling especializado para cada tipo de recurso
		✓ Validação dupla (estética + usabilidade)
		✓ Documentação completa das influências
		
		RESULTADO: Sites com design visualmente atrativo, teoricamente fundamentado, tecnicamente preciso e contextualmente fiel às inspirações
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


