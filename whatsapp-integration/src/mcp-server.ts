import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
const pptr: any = puppeteer;
import { deployToCodeSandbox } from './deploy-codesandbox.js';

// Minimal MCP server exposing project_reset and CodeSandbox deployment only.

const server = new McpServer(
	{ name: 'recflux-deployer', version: '1.0.0' },
	{ capabilities: { tools: {} } }
);

server.registerTool(
	'project_reset',
	{
		description: 'Reset the project directory',
		inputSchema: {}
	},
	async (_args: any) => {
		const projectDir = process.env.CLONED_TEMPLATE_DIR || process.cwd();
		// Find the template directory - it could be in different locations depending on context
		let templateDir = '/_template';
		
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

server.registerTool(
	'codesandbox_deploy',
	{
		description: 'Deploy the current project to CodeSandbox and return preview/editor URLs',
		inputSchema: {}
	},
	async (_args: any) => {
		const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
		const stat = await fs.stat(root).catch(() => null);
		if (!stat || !stat.isDirectory()) {
			return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] } as const;
		}
		try {
			console.error(`[MCP_CODESANDBOX_DEPLOY] Creating sandbox from directory: ${root}`);
			
			const result = await deployToCodeSandbox(root);
			console.error(`[MCP_CODESANDBOX_DEPLOY] Sandbox created. editor=${result.editorUrl} preview=${result.previewUrl}`);
			return { content: [{ type: 'text', text: JSON.stringify({ editorUrl: result.editorUrl, previewUrl: result.previewUrl }) }] } as const;
		} catch (err: any) {
			const msg = err?.message || String(err);
			console.error(`[MCP_CODESANDBOX_DEPLOY] Failed: ${msg}`);
			return { content: [{ type: 'text', text: `Instant deployment failed: ${msg}` }] } as const;
		}
	}
);

server.registerTool(
	'color_palette_generator',
	{
		description: 'Generate color palettes using Huemint AI API for design projects',
		inputSchema: {
			mode: z.enum(['transformer', 'diffusion', 'random']).default('transformer').describe('Generation mode - transformer (smart AI), diffusion (artistic), or random'),
			numColors: z.number().min(2).max(12).default(3).describe('Number of colors in palette (2-12)'),
			temperature: z.number().min(0).max(2.4).default(1.2).describe('Creativity level (0-2.4, higher = more creative)'),
			baseColors: z.array(z.string()).optional().describe('Optional base colors as hex codes (e.g. ["#FF0000", "#00FF00"])')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-color-palette.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};
		
		logMessage('[MCP_COLOR_PALETTE] *** TOOL CALLED! ***');
		logMessage('[MCP_COLOR_PALETTE] Called with args: ' + JSON.stringify(args));
		
		const mode = args.mode || 'transformer';
		const numColors = Math.min(12, Math.max(2, args.numColors || 3));
		const temperature = Math.min(2.4, Math.max(0, args.temperature || 1.2));
		const baseColors = args.baseColors || [];
		
		// Create adjacency matrix (colors that work well together)
		// Higher values mean better compatibility
		const adjacencyMatrix = [];
		for (let i = 0; i < numColors; i++) {
			for (let j = 0; j < numColors; j++) {
				if (i === j) {
					adjacencyMatrix.push("0");
				} else {
					// Default medium compatibility
					adjacencyMatrix.push("65");
				}
			}
		}
		
		// Build palette array with locked colors or blanks
		const palette = [];
		for (let i = 0; i < numColors; i++) {
			if (i < baseColors.length) {
				palette.push(baseColors[i]);
			} else {
				palette.push("-");
			}
		}
		
		const requestData = {
			mode: mode,
			num_colors: numColors,
			temperature: temperature.toString(),
			num_results: 1,
			adjacency: adjacencyMatrix,
			palette: palette
		};
		
		logMessage(`[MCP_COLOR_PALETTE] Requesting palette: ${JSON.stringify(requestData)}`);
		
		try {
			const response = await fetch('https://api.huemint.com/color', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=utf-8'
				},
				body: JSON.stringify(requestData)
			});
			
			if (!response.ok) {
				throw new Error(`Huemint API error: ${response.status} ${response.statusText}`);
			}
			
			const data = await response.json() as { results?: Array<{ palette: string[]; score: number }> };
			logMessage(`[MCP_COLOR_PALETTE] API response received: ${data.results?.length || 0} palettes`);
			
			// Return single palette result
			const bestResult = data.results?.[0];
			if (!bestResult) {
				throw new Error('No palette generated');
			}
			
			const formattedResult = {
				mode,
				numColors,
				temperature,
				baseColors: baseColors.length > 0 ? baseColors : null,
				colors: bestResult.palette || [],
				score: bestResult.score,
				preview: `https://www.color-hex.com/palettes/${bestResult.palette?.map(c => c.replace('#', '')).join('-') || 'default'}`,
				source: 'huemint-ai'
			};
			
			return { content: [{ type: 'text', text: JSON.stringify(formattedResult, null, 2) }] } as const;
			
		} catch (error: any) {
			logMessage('[MCP_COLOR_PALETTE] Error: ' + (error?.message || error));
			return { content: [{ type: 'text', text: `Color palette generation failed: ${error?.message || error}` }] } as const;
		}
	}
);

server.registerTool(
	'puppeteer_search',
	{
		description: 'Search for various types of content using PUPPETEER',
		inputSchema: {
			searchTerm: z.string().describe('The search term to look for. Use only a single term in english to increase the chances of finding relevant content.'),
			searchType: z.enum(['videos', 'icons', 'vectors', 'vfx', 'music', 'animations']).default('videos').describe('The type of content to search for')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-puppeteer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};
		
		console.error('[MCP_PUPPETEER] *** TOOL CALLED! ***');
		logMessage('[MCP_PUPPETEER] *** TOOL CALLED! ***');
		logMessage('[MCP_PUPPETEER] Called with args: ' + JSON.stringify(args));
		logMessage('[MCP_PUPPETEER] Args keys: ' + JSON.stringify(Object.keys(args || {})));
		
		// Using Puppeteer (with stealth + proxy rotation) for all content extraction
		
		const searchTerm = args.searchTerm || '';
		const searchType = args.searchType || 'videos';
		
		logMessage('[MCP_PUPPETEER] Parsed searchTerm: ' + searchTerm);
		logMessage('[MCP_PUPPETEER] Parsed searchType: ' + searchType);
		
		if (!searchTerm) {
			return { content: [{ type: 'text', text: 'Error: No search term provided' }] } as const;
		}
		
		let url = '';
		switch (searchType) {
			case 'videos':
				url = `https://www.pexels.com/search/videos/${encodeURIComponent(searchTerm)}`;
				break;
			case 'animations':
				url = `https://creattie.com/all-items/${encodeURIComponent(searchTerm)}?type=all&orderBy=order&page=1`;
				break;
			case 'icons':
				url = `https://thenounproject.com/search/icons/?q=${encodeURIComponent(searchTerm)}`;
				break;
			case 'vectors':
				url = `https://www.freepik.com/search?format=search&last_filter=type&last_value=vector&query=${encodeURIComponent(searchTerm)}&type=vector`;
				break;
			case 'vfx':
				url = `https://www.productioncrate.com/search/${encodeURIComponent(searchTerm)}?main_category=vfx`;
				break;
			case 'music':
				url = `https://www.bensound.com/royalty-free-music?tag[]=${encodeURIComponent(searchTerm)}&sort=relevance`;
				break;
			default:
				break;
		}
		
		logMessage(`[MCP_PUPPETEER] Searching ${searchType} for "${searchTerm}"`);
		
		try {
			// Use Pexels API for videos only, PUPPETEER for all other content types including images
			if (searchType === 'videos') {
				logMessage(`[MCP_PUPPETEER] Using Pexels API for ${searchType}`);
				
				const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
				if (PEXELS_API_KEY) {
					const apiUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchTerm)}&per_page=3`;
					
					logMessage(`[MCP_PUPPETEER] Calling Pexels API: ${apiUrl}`);
					
					const headers: Record<string, string> = { 'Authorization': PEXELS_API_KEY };
					const response = await fetch(apiUrl, { headers });
					
					if (!response.ok) {
						throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
					}
					
					const data = (await response.json()) as { total_results: number; videos?: any[] };
					logMessage(`[MCP_PUPPETEER] Pexels API returned ${data.total_results} results`);
					
					const results = data.videos?.map((video: any) => ({
						title: video.user?.name ? `Video by ${video.user.name}` : 'Untitled Video',
						url: video.url,
						preview_url: video.video_files?.[0]?.link || video.url,
						thumbnail: video.image,
						width: video.width,
						height: video.height,
						duration: video.duration,
						type: 'video'
					})) || [];
					
					return { content: [{ type: 'text', text: JSON.stringify({
						searchType,
						searchTerm,
						source: 'Pexels API',
						total_results: data.total_results,
						results: results
					}, null, 2) }] } as const;
				} else {
					logMessage('[MCP_PUPPETEER] No Pexels API key found; falling back to PUPPETEER scraping');
				}
			}
			
			// Use Puppeteer to scrape other content types
			logMessage(`[MCP_PUPPETEER] Using Puppeteer to scrape ${searchType} from: ${url}`);
			
			// Configure stealth and proxy
			pptr.use(StealthPlugin());
			
			const collectProxies = (): string[] => {
				const proxies: string[] = [];
				for (let i = 1; i <= 50; i++) {
					const v = process.env[`PROXY_${i}` as keyof NodeJS.ProcessEnv] as string | undefined;
					if (v && v.trim()) proxies.push(v.trim());
				}
				return proxies;
			};
			
			const pickProxy = (): { server?: string; username?: string; password?: string; raw?: string } => {
				const list = collectProxies();
				if (!list.length) return {};
				const raw = list[Math.floor(Math.random() * list.length)];
				try {
					const u = new URL(raw);
					const server = `${u.protocol}//${u.hostname}:${u.port}`;
					return { server, username: decodeURIComponent(u.username || ''), password: decodeURIComponent(u.password || ''), raw };
				} catch {
					return { raw } as any;
				}
			};
			
			const proxy = pickProxy();
			logMessage(`[MCP_PUPPETEER] Proxy selected: ${proxy.server || 'none'} (raw=${proxy.raw ? 'yes' : 'no'})`);
			
			const launchArgs: string[] = [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-blink-features=AutomationControlled'
			];
			if (proxy.server) launchArgs.push(`--proxy-server=${proxy.server}`);
			
			const browser = await pptr.launch({
				headless: true,
				args: launchArgs,
				executablePath: '/usr/bin/google-chrome-stable'
			});
			
			try {
				const page = await browser.newPage();
				
				if (proxy.username) {
					try { await page.authenticate({ username: proxy.username, password: proxy.password || '' }); } catch {}
				}
				
				const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
				await page.setUserAgent(userAgent);
				await page.setViewport({
					width: Math.floor(1024 + Math.random() * 120),
					height: Math.floor(768 + Math.random() * 120)
				});
				
				// Capture console output from page.evaluate
				page.on('console', (msg: any) => {
					logMessage('[MCP_PUPPETEER] Browser console: ' + msg.text());
				});
				
				try {
					await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
				} catch (e) {
					logMessage('[MCP_PUPPETEER] Initial navigation failed, retrying with networkidle2');
					try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }); } catch {}
				}
				
				// Wait for Cloudflare and page content to load
				logMessage('[MCP_PUPPETEER] Waiting for page challenge to be solved...');
				await new Promise(resolve => setTimeout(resolve, 10000));
				
				let title = await page.title();
				logMessage(`[MCP_PUPPETEER] Current page title after wait: ${title}`);
				
				// Keep waiting until we get past protection pages
				let attempts = 0;
				while ((title.includes('Just a moment') || title.includes('Cloudflare') || title.includes('Please wait')) && attempts < 6) {
					attempts++;
					logMessage(`[MCP_PUPPETEER] Still on protection page, attempt ${attempts}/6. Waiting 8 more seconds...`);
					await new Promise(resolve => setTimeout(resolve, 8000));
					title = await page.title();
					logMessage(`[MCP_PUPPETEER] Page title after wait ${attempts}: ${title}`);
				}
				
				// Additional wait for page content to fully render
				logMessage('[MCP_PUPPETEER] Waiting for page content to fully render...');
				await new Promise(resolve => setTimeout(resolve, 6000));
				
				// Extract content based on type
				let contentData = [] as any[];
					if (searchType === 'videos') {
						logMessage('[MCP_PUPPETEER] Extracting video content...');
						
						// Wait for video elements to load
						try {
							await page.waitForSelector('video, a[href*="/video/"], .video', { timeout: 30000 });
						} catch (e) {
							logMessage('[MCP_PUPPETEER] Timeout waiting for video selectors, continuing anyway...');
						}
						
						// Extract video content
						contentData = await page.evaluate(() => {
							const videos: any[] = [];
							
							// Log current page info for debugging
							const currentUrl = (globalThis as any).location.href;
							const title = (globalThis as any).document.title;
							console.log('[DEBUG] Current URL:', currentUrl);
							console.log('[DEBUG] Page title:', title);
							
							// Log page statistics
							const allLinks = (globalThis as any).document.querySelectorAll('a');
							const allImages = (globalThis as any).document.querySelectorAll('img');
							const allDivs = (globalThis as any).document.querySelectorAll('div');
							console.log(`[DEBUG] Page stats: ${allLinks.length} links, ${allImages.length} images, ${allDivs.length} divs`);
							
							// Look for Pexels-specific video links and elements
							const pexelsVideoLinks = (globalThis as any).document.querySelectorAll('a[href*="/video/"]');
							const videoCards = (globalThis as any).document.querySelectorAll('[data-testid*="video"], .video-card, [class*="video"]');
							console.log(`[DEBUG] Pexels video links: ${pexelsVideoLinks.length}, video cards: ${videoCards.length}`);
							
							// Find all <video> elements on the page
							const videoElements = (globalThis as any).document.querySelectorAll('video');
							console.log(`[DEBUG] Found ${videoElements.length} actual video elements`);
							
							Array.from(videoElements).forEach((video: any, index: number) => {
								const src = video.src || video.getAttribute('src');
								const poster = video.poster || video.getAttribute('poster');
								const controls = video.controls;
								const autoplay = video.autoplay;
								
								// Also check for source elements inside video
								const sources = video.querySelectorAll('source');
								const sourceSrcs: string[] = [];
								Array.from(sources).forEach((source: any) => {
									const sourceSrc = source.src || source.getAttribute('src');
									if (sourceSrc) {
										sourceSrcs.push(sourceSrc);
										console.log('[DEBUG] Found source element:', sourceSrc);
									}
								});
								
								if (src || sourceSrcs.length > 0) {
									console.log(`[DEBUG] Video ${index + 1}: src=${src}, sources=${sourceSrcs.length}, poster=${poster}`);
									videos.push({
										title: `Video ${index + 1}`,
										videoUrl: src || sourceSrcs[0],
										allSources: sourceSrcs,
										thumbnailUrl: poster,
										hasControls: controls,
										autoplay: autoplay,
										source: 'direct-video-element',
										elementIndex: index
									});
								}
							});
							
							// Also look for video URLs in data attributes or other attributes
							const elementsWithVideoData = (globalThis as any).document.querySelectorAll('[data-video-src], [data-src*="mp4"], [data-src*="webm"], [data-src*="video"]');
							console.log(`[DEBUG] Found ${elementsWithVideoData.length} elements with video data attributes`);
							
							Array.from(elementsWithVideoData).forEach((element: any, index: number) => {
								const dataSrc = element.getAttribute('data-video-src') || element.getAttribute('data-src');
								if (dataSrc && (dataSrc.includes('mp4') || dataSrc.includes('webm') || dataSrc.includes('video'))) {
									console.log(`[DEBUG] Data video ${index + 1}: ${dataSrc}`);
									videos.push({
										title: `Data Video ${index + 1}`,
										videoUrl: dataSrc,
										source: 'data-attribute',
										elementIndex: index
									});
								}
							});
							
							// Also extract Pexels video page links and try to construct direct video URLs
							Array.from(pexelsVideoLinks).slice(0, 10).forEach((link: any, index: number) => {
								const href = link.getAttribute('href');
								const img = link.querySelector('img');
								console.log(`[DEBUG] Pexels link ${index + 1}: ${href}`);
								
								if (href && href.includes('/video/')) {
									// Try to extract video ID from Pexels URL pattern
									const videoIdMatch = href.match(/\/video\/(\d+)/);
									const videoId = videoIdMatch ? videoIdMatch[1] : null;
									
									if (videoId) {
										console.log(`[DEBUG] Extracted video ID: ${videoId}`);
										// Construct potential direct video URLs (Pexels pattern)
										const possibleUrls = [
											`https://vod-progressive.akamaized.net/exp=${Math.floor(Date.now()/1000)+3600}~acl=%2F*~hmac=placeholder/vimeo-prod-skyfire-std-us/01/${videoId}/0/file.mp4`,
											`https://videos.pexels.com/video-files/${videoId}/${videoId}-hd_1920_1080_30fps.mp4`,
											`https://videos.pexels.com/video-files/${videoId}/${videoId}-uhd_2560_1440_30fps.mp4`
										];
										
										videos.push({
											title: img?.alt || `Pexels Video ${videoId}`,
											videoUrl: possibleUrls[1], // Use the most likely working URL
											allPossibleUrls: possibleUrls,
											videoId: videoId,
											thumbnailUrl: img?.src,
											pageUrl: href.startsWith('http') ? href : 'https://www.pexels.com' + href,
											source: 'pexels-extracted',
											elementIndex: index
										});
									}
								}
							});
							
							return videos;
						});
						
					} else if (searchType === 'animations') {
						logMessage('[MCP_PUPPETEER] Extracting animation content...');
						
						// Extract animation content
						contentData = await page.evaluate(() => {
							const animations: any[] = [];
							
							// Look for animation elements
							const animationElements = (globalThis as any).document.querySelectorAll('video');
							console.log(`[DEBUG] Found ${animationElements.length} animation elements`);
							
							Array.from(animationElements).forEach((element: any, index: number) => {
								
								const src = element.querySelector('source').getAttribute('src');
								const alt = element.parentElement.querySelector('span').textContent;
								
								if (src && !src.includes('placeholder') && !src.includes('loading')) {
									console.log(`[DEBUG] Animation ${index + 1}: ${src}`);
									animations.push({
										title: alt || `Animation ${index + 1}`,
										animationUrl: src,
										source: 'extracted-animation',
										elementIndex: index
									});
								}
							});
							
							return animations;
						});
						
					} else if (searchType === 'icons') {
						logMessage('[MCP_PUPPETEER] Extracting icon content...');
						
						// Extract icon/SVG content
						contentData = await page.evaluate(() => {
							const icons: any[] = [];
							
							// Look for various icon selectors on Noun Project
							const iconElements = (globalThis as any).document.querySelectorAll('img[src*="icon"], img[src*="svg"], .icon img, [data-testid*="icon"] img, .search-result img');
							console.log(`[DEBUG] Found ${iconElements.length} potential icon elements`);
							
							Array.from(iconElements).slice(0, 15).forEach((element: any, index: number) => {
								const src = element.src || element.getAttribute('src');
								const alt = element.alt || element.getAttribute('alt');
								const title = alt || `Icon ${index + 1}`;
								
								if (src && !src.includes('placeholder') && !src.includes('loading')) {
									console.log(`[DEBUG] Icon ${index + 1}: ${title} - ${src}`);
									icons.push({
										title: title,
										imageUrl: src,
										iconUrl: src,
										description: `Icon: ${title}`,
										source: 'noun-project-extracted',
										elementIndex: index
									});
								}
							});
							
							console.log(`[DEBUG] Extracted ${icons.length} icon elements`);
							return icons;
						}, searchTerm);
						
					} else if (searchType === 'vectors') {
						logMessage('[MCP_PUPPETEER] Extracting vector content from Freepik...');
						
						// Extract vector content from Freepik
						contentData = await page.evaluate(() => {
							const vectors: any[] = [];
							
							// Look for Freepik-specific vector elements
							const vectorElements = (globalThis as any).document.querySelectorAll('img[src*="freepik"], img[src*="vector"], .resource img, [data-testid*="resource"] img, .figure img');
							console.log(`[DEBUG] Found ${vectorElements.length} potential vector elements`);
							
							Array.from(vectorElements).slice(0, 15).forEach((element: any, index: number) => {
								const src = element.src || element.getAttribute('src');
								const alt = element.alt || element.getAttribute('alt');
								const title = alt || `Vector ${index + 1}`;
								
								// Get parent link if available
								const parentLink = element.closest('a');
								const linkUrl = parentLink ? parentLink.href : null;
								
								if (src && !src.includes('placeholder') && !src.includes('loading')) {
									console.log(`[DEBUG] Vector ${index + 1}: ${title} - ${src}`);
									vectors.push({
										title: title,
										imageUrl: src,
										vectorUrl: src,
										pageUrl: linkUrl,
										description: `Vector: ${title}`,
										source: 'freepik-extracted',
										elementIndex: index
									});
								}
							});
							
							console.log(`[DEBUG] Extracted ${vectors.length} vector elements`);
							return vectors;
						});
						
					} else if (searchType === 'vfx') {
						logMessage('[MCP_PUPPETEER] Extracting VFX content from ProductionCrate...');
						
						// Extract VFX content from ProductionCrate
						contentData = await page.evaluate(() => {
							const vfxItems: any[] = [];
							
							// Look for ProductionCrate-specific VFX elements
							const vfxElements = (globalThis as any).document.querySelectorAll('video, .vfx-item video, .product video, [data-video-src], img[src*="vfx"], img[src*="effect"]');
							console.log(`[DEBUG] Found ${vfxElements.length} potential VFX elements`);
							
							Array.from(vfxElements).slice(0, 15).forEach((element: any, index: number) => {
								let videoSrc = null;
								let title = `VFX ${index + 1}`;
								let thumbnailSrc = null;
								
								if (element.tagName === 'VIDEO') {
									videoSrc = element.src || element.getAttribute('src');
									// Check for source elements
									if (!videoSrc) {
										const source = element.querySelector('source');
										videoSrc = source ? source.src : null;
									}
									thumbnailSrc = element.poster;
								} else if (element.tagName === 'IMG') {
									thumbnailSrc = element.src;
									// Try to find associated video
									const videoElement = element.closest('.product, .vfx-item')?.querySelector('video');
									videoSrc = videoElement ? (videoElement.src || videoElement.querySelector('source')?.src) : null;
								} else {
									// Element with data-video-src
									videoSrc = element.getAttribute('data-video-src');
								}
								
								// Try to get title from alt, data attributes, or parent elements
								title = element.alt || element.getAttribute('data-title') || 
								       element.closest('.product, .vfx-item')?.querySelector('.title, h3, h4')?.textContent?.trim() || title;
								
								if (videoSrc || thumbnailSrc) {
									console.log(`[DEBUG] VFX ${index + 1}: ${title} - Video: ${videoSrc}, Thumbnail: ${thumbnailSrc}`);
									vfxItems.push({
										title: title,
										videoUrl: videoSrc,
										thumbnailUrl: thumbnailSrc,
										description: `VFX: ${title}`,
										source: 'productioncrate-extracted',
										elementIndex: index
									});
								}
							});
							
							console.log(`[DEBUG] Extracted ${vfxItems.length} VFX elements`);
							return vfxItems;
						});
						
					} else if (searchType === 'music') {
						logMessage('[MCP_PUPPETEER] Extracting music content from Bensound...');
						
						// Extract music content from Bensound using the correct selectors
						contentData = await page.evaluate(() => {
							const musicItems: any[] = [];
							
							// Find all music blocks (bloc_produit or bloc_produit1)
							const musicBlocks = (globalThis as any).document.querySelectorAll('.bloc_produit, .bloc_produit1');
							console.log(`[DEBUG] Found ${musicBlocks.length} music blocks on Bensound`);
							
							Array.from(musicBlocks).forEach((block: any, index: number) => {
								try {
									// Extract title from .titre p
									const titleElement = block.querySelector('.titre p');
									const title = titleElement ? titleElement.textContent.trim() : `Music ${index + 1}`;
									
									// Extract audio URL from audio src attribute
									const audioElement = block.querySelector('audio');
									const audioSrc = audioElement ? audioElement.getAttribute('src') : null;
									
									// Extract duration from .totime
									const durationElement = block.querySelector('.totime');
									const duration = durationElement ? durationElement.textContent.trim() : '';
									
									// Extract description from .description
									const descriptionElement = block.querySelector('.description');
									const description = descriptionElement ? descriptionElement.textContent.trim() : '';
									
									// Extract image URL from .img_mini img
									const imageElement = block.querySelector('.img_mini img');
									const imageSrc = imageElement ? imageElement.getAttribute('src') : null;
									
									// Check if available for download
									const downloadButton = block.querySelector('.bouton_download');
									const forDownload = !!downloadButton;
									
									// Check if available for purchase
									const purchaseButton = block.querySelector('.bouton_purchase');
									const forPurchase = !!purchaseButton;
									
									if (audioSrc && title) {
										// Construct full URLs (Bensound uses relative paths)
										const fullAudioUrl = audioSrc.startsWith('http') ? audioSrc : 'https://www.bensound.com/' + audioSrc;
										const fullImageUrl = imageSrc ? (imageSrc.startsWith('http') ? imageSrc : 'https://www.bensound.com/' + imageSrc) : null;
										
										console.log(`[DEBUG] Music ${index + 1}: ${title}, Duration: ${duration}, Audio: ${fullAudioUrl}`);
										
										musicItems.push({
											title: title,
											audioUrl: fullAudioUrl,
											duration: duration,
											description: description,
											imageUrl: fullImageUrl,
											forDownload: forDownload,
											forPurchase: forPurchase,
											source: 'bensound-extracted',
											elementIndex: index
										});
									}
								} catch (e) {
									console.log(`[DEBUG] Error processing music block ${index}: ${e}`);
								}
							});
							
							console.log(`[DEBUG] Extracted ${musicItems.length} music items from Bensound`);
							return musicItems;
						});
						
					} else {
						logMessage(`[MCP_PUPPETEER] Extracting general content for ${searchType}...`);
						
						// General content extraction
						contentData = await page.evaluate((searchType: string) => {
							const content: any[] = [];
							
							// Look for download links, media files, or relevant content
							const mediaLinks = (globalThis as any).document.querySelectorAll(
								'a[href*=".mp4"], a[href*=".mp3"], a[href*=".zip"], a[href*="download"], a[download]'
							);
							
							console.log(`[DEBUG] Found ${mediaLinks.length} media/download links for ${searchType}`);
							
							Array.from(mediaLinks).slice(0, 8).forEach((link: any, index: number) => {
								const href = link.href || link.getAttribute('href');
								const text = link.textContent || link.innerText;
								
								if (href) {
									console.log(`[DEBUG] ${searchType} link ${index + 1}: ${href}`);
									content.push({
										title: text || `${searchType} ${index + 1}`,
										url: href,
										downloadUrl: href,
										source: `extracted-${searchType}`,
										elementIndex: index
									});
								}
							});
							
							return content;
						}, searchType);
					}
					
					logMessage(`[MCP_PUPPETEER] Extracted ${contentData.length} items via Puppeteer`);
					
					return { content: [{ type: 'text', text: JSON.stringify({
						searchType,
						searchTerm,
						results: contentData.slice(0, 10),
						totalFound: contentData.length,
						source: 'puppeteer-extracted'
					}, null, 2) }] } as const;
					
				} finally {
					// Always close the browser to free up the session
					await browser.close();
				}
			
		} catch (error: any) {
			logMessage('[MCP_PUPPETEER] General error: ' + (error?.message || error));
			return { content: [{ type: 'text', text: `Content extraction failed: ${error?.message || error}` }] } as const;
		}
	}
);

// Freepik AI Image Generation Tool
server.registerTool(
	'freepik_ai_image_generator',
	{
		description: 'Generate images using Freepik AI text-to-image with flux-dev model',
		inputSchema: {
			prompt: z.string().describe('The text prompt to generate an image from'),
			htmlContext: z.string().describe('REQUIRED: The HTML/component structure where this image will be placed (for contextual analysis). Must include titles, descriptions, and surrounding context.'),
			componentContext: z.string().optional().describe('Description of the component/use case where this image will be used (e.g., "hero section for a travel website", "card image for a restaurant app")'),
			imageRole: z.string().optional().describe('Specific role of the image (e.g., "background", "icon", "illustration", "photo", "avatar")'),
			aspect_ratio: z.enum(['square_1_1', 'classic_4_3', 'traditional_3_4', 'widescreen_16_9', 'social_story_9_16', 'standard_3_2', 'portrait_2_3', 'horizontal_2_1', 'vertical_1_2']).default('square_1_1').optional().describe('Aspect ratio of the generated image'),
			num_images: z.number().min(1).max(4).default(1).optional().describe('Number of images to generate (1-4)'),
			seed: z.number().min(1).max(4294967295).optional().describe('Seed for reproducible generation')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-freepik-ai-image-generator.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};
		logMessage('[FREEPIK_AI] *** TOOL CALLED! ***');
		logMessage('[FREEPIK_AI] Called with args: ' + JSON.stringify(args));
		logMessage('[FREEPIK_AI] Args keys: ' + JSON.stringify(Object.keys(args || {})));
		try {
			const freepikApiKey = process.env.FREEPIK_API_KEY;

			if (!freepikApiKey) {
				return { content: [{ type: 'text', text: 'Error: Freepik API key not configured' }] } as const;
			}

			const prompt = args.prompt || '';
			const htmlContext = args.htmlContext || '';
			const componentContext = args.componentContext || '';
			const imageRole = args.imageRole || '';
			const aspectRatio = args.aspect_ratio || 'square_1_1';
			const numImages = args.num_images || 1;
			const seed = args.seed || Math.floor(Math.random() * 4294967295);
			
			if (!prompt) {
				return { content: [{ type: 'text', text: 'Error: No prompt provided' }] } as const;
			}
			
			if (!htmlContext) {
				return { content: [{ type: 'text', text: 'Error: HTML context is required for contextual image generation. Please provide the HTML/component structure where this image will be placed.' }] } as const;
			}

			// Simple prompt - let the system prompt handle the contextual analysis
			const contextualPrompt = prompt;
			
			logMessage(`[FREEPIK_AI] Original prompt: "${prompt}"`);
			logMessage(`[FREEPIK_AI] HTML context provided: ${!!htmlContext}`);
			logMessage(`[FREEPIK_AI] HTML context length: ${htmlContext.length}`);
			logMessage(`[FREEPIK_AI] HTML context preview: ${htmlContext.substring(0, 300)}...`);
			logMessage(`[FREEPIK_AI] Component context: "${componentContext}"`);
			logMessage(`[FREEPIK_AI] Image role: "${imageRole}"`);
			logMessage(`[FREEPIK_AI] Aspect ratio: "${aspectRatio}"`);

			console.error(`[FREEPIK_AI] Generating image with contextual prompt: "${contextualPrompt}"`);

			const requestBody = {
				prompt: contextualPrompt,
				aspect_ratio: aspectRatio,
				seed: seed
			};

			logMessage(`[FREEPIK_AI] Request body: ${JSON.stringify(requestBody)}`);

			const response = await axios.post(
				'https://api.freepik.com/v1/ai/text-to-image/flux-dev',
				requestBody,
				{
					headers: {
						'x-freepik-api-key': freepikApiKey,
						'Content-Type': 'application/json'
					}
				}
			);

			logMessage('[FREEPIK_AI] API returned status: ' + response.status);
			if (response.status === 200 || response.status === 202) {
				logMessage('[FREEPIK_AI] Image generation request submitted successfully');
				logMessage(`[FREEPIK_AI] Response data: ${JSON.stringify(response.data)}`);
				
				// Freepik returns a task_id for async processing
				const taskId = response.data?.data?.task_id;
				if (!taskId) {
					return { content: [{ type: 'text', text: 'Error: No task ID returned from Freepik API' }] } as const;
				}
				
				logMessage(`[FREEPIK_AI] Task ID: ${taskId}`);
				
				// Poll for job completion (simplified approach - in production you'd use webhooks)
				let attempts = 0;
				const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute max wait
				let imageUrl = null;
				let allGeneratedImages = [];
				
				while (attempts < maxAttempts && !imageUrl) {
					attempts++;
					logMessage(`[FREEPIK_AI] Polling attempt ${attempts}/${maxAttempts}`);
					
					await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
					
					try {
						const statusResponse = await axios.get(
							`https://api.freepik.com/v1/ai/text-to-image/flux-dev/${taskId}`,
							{
								headers: {
									'x-freepik-api-key': freepikApiKey
								}
							}
						);
						
						logMessage(`[FREEPIK_AI] Status check ${attempts}: ${statusResponse.data?.data?.status}`);
						logMessage(`[FREEPIK_AI] Full status response: ${JSON.stringify(statusResponse.data)}`);
						
						if (statusResponse.data?.data?.status === 'COMPLETED' && statusResponse.data?.data?.generated?.length > 0) {
							allGeneratedImages = statusResponse.data.data.generated;
							imageUrl = allGeneratedImages[0];
							logMessage(`[FREEPIK_AI] Generated ${allGeneratedImages.length} images`);
							logMessage(`[FREEPIK_AI] All image URLs: ${JSON.stringify(allGeneratedImages)}`);
							logMessage(`[FREEPIK_AI] First image URL: ${imageUrl}`);
							break;
						} else if (statusResponse.data?.data?.status === 'FAILED') {
							logMessage(`[FREEPIK_AI] Image generation failed: ${statusResponse.data?.data?.error || 'Unknown error'}`);
							return { content: [{ type: 'text', text: `Image generation failed: ${statusResponse.data?.data?.error || 'Unknown error'}` }] } as const;
						}
					} catch (statusError: any) {
						logMessage(`[FREEPIK_AI] Status check error: ${statusError?.message || statusError}`);
					}
				}
				
				if (!imageUrl) {
					return { content: [{ type: 'text', text: 'Error: Image generation timed out or failed' }] } as const;
				}
				
				// Return the direct Freepik URL - no need for additional upload
				const timestamp = Date.now();
				const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
				const filename = `freepik_${sanitizedPrompt}_${timestamp}.jpg`;
				
				logMessage(`[FREEPIK_AI] Image generation completed successfully!`);
				logMessage(`[FREEPIK_AI] Direct image URL: ${imageUrl}`);
				
				return { 
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							imageUrl: imageUrl,
							allImages: allGeneratedImages,
							totalImages: allGeneratedImages.length,
							filename: filename,
							format: 'jpeg',
							model: 'freepik-flux-dev',
							hosting: 'Freepik CDN',
							aspectRatio: aspectRatio,
							seed: seed,
							taskId: taskId
						}, null, 2)
					}] 
				} as const;
			} else {
				console.error('[FREEPIK_AI] API returned error:', response.status, response.statusText);
				return { content: [{ type: 'text', text: `Error: Freepik API returned ${response.status}` }] } as const;
			}

		} catch (error: any) {
			console.error('[FREEPIK_AI] Error generating image:', error?.message || error);
			logMessage(`[FREEPIK_AI] Full error details: ${JSON.stringify({
				message: error?.message,
				status: error?.response?.status,
				statusText: error?.response?.statusText,
				data: error?.response?.data
			})}`);
			return { content: [{ type: 'text', text: `Image generation failed: ${error?.message || error}` }] } as const;
		}
	}
);

// Web Crawler Tool using native Crawl4AI CLI
server.registerTool(
	'web_crawler',
	{
		description: 'Crawl and extract content from web pages using native Crawl4AI CLI for advanced text, markdown, links, images, and structured data extraction with deep crawling support',
		inputSchema: {
			url: z.string().url().describe('The URL to crawl'),
			outputFormat: z.enum(['markdown', 'cleaned_html', 'raw_html', 'json']).default('markdown').optional().describe('Output format for extracted content'),
			deepCrawl: z.boolean().default(false).optional().describe('Enable deep crawling to follow links'),
			deepCrawlStrategy: z.enum(['bfs', 'dfs']).default('bfs').optional().describe('Deep crawl strategy: breadth-first or depth-first'),
			maxPages: z.number().min(1).max(50).default(5).optional().describe('Maximum pages to crawl in deep crawl mode'),
			cssSelector: z.string().optional().describe('CSS selector to extract specific elements'),
			extractionQuery: z.string().optional().describe('Specific question/query for LLM-based extraction (e.g., "Extract all product prices")'),
			userAgent: z.string().optional().describe('Custom user agent string'),
			timeout: z.number().min(10).max(120).default(30).optional().describe('Timeout in seconds')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-crawl4ai-cli.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};

		logMessage('[CRAWL4AI_CLI] *** TOOL CALLED! ***');
		logMessage('[CRAWL4AI_CLI] Called with args: ' + JSON.stringify(args));

		try {
			const {
				url,
				outputFormat = 'markdown',
				deepCrawl = false,
				deepCrawlStrategy = 'bfs',
				maxPages = 5,
				cssSelector,
				extractionQuery,
				userAgent,
				timeout = 30
			} = args;

			logMessage(`[CRAWL4AI_CLI] Starting Crawl4AI CLI crawl for: ${url}`);

			// Build crwl command arguments - note: crwl requires 'crawl' subcommand
			const crwlArgs = ['crawl', url];
			
			// Output format
			crwlArgs.push('-o', outputFormat);
			
			// Deep crawl options
			if (deepCrawl) {
				crwlArgs.push('--deep-crawl', deepCrawlStrategy);
				crwlArgs.push('--max-pages', maxPages.toString());
			}
			
			// Skip LLM extraction to avoid external API calls and timeouts
			// if (extractionQuery) {
			//	crwlArgs.push('-q', extractionQuery);
			// }
			
			// CSS selector would need to be handled via crawler config, skip for now
			// Browser user agent can be set via browser config if needed
			
			// Bypass cache for fresh results
			crwlArgs.push('--bypass-cache');

			logMessage(`[CRAWL4AI_CLI] Command: crwl ${crwlArgs.join(' ')}`);

			// Compute a generous timeout for deep crawls
			const baseTimeoutSec = typeof timeout === 'number' ? timeout : 300;
			const pagesForTimeout = typeof maxPages === 'number' ? maxPages : 5;
			let computedTimeoutSec = baseTimeoutSec;
			if (deepCrawl) {
				// ~10s per page plus a small base, capped at 5 minutes for better reliability
				computedTimeoutSec = Math.max(baseTimeoutSec, Math.min(300, 15 + pagesForTimeout * 10));
			}
			logMessage(`[CRAWL4AI_CLI] Using timeout ${computedTimeoutSec}s for crwl process`);

			// Execute crwl command with manual timeout/kill guard
			const { spawn } = await import('child_process');
			
			return new Promise((resolve) => {
				const crwlProcess = spawn('crwl', crwlArgs, {
					stdio: ['pipe', 'pipe', 'pipe'],
					env: { 
						...process.env, 
						PYTHONIOENCODING: 'utf-8',
						LANG: 'en_US.UTF-8',
						LC_ALL: 'en_US.UTF-8'
					}
				});

				let stdout = '';
				let stderr = '';
				let killedByTimeout = false;

				const killTimer = setTimeout(() => {
					killedByTimeout = true;
					logMessage('[CRAWL4AI_CLI] Killing crwl process due to timeout');
					try { crwlProcess.kill('SIGTERM'); } catch {}
					setTimeout(() => { try { crwlProcess.kill('SIGKILL'); } catch {} }, 5000);
				}, computedTimeoutSec * 1000);

				crwlProcess.stdout.on('data', (data) => {
					stdout += data.toString();
				});

				crwlProcess.stderr.on('data', (data) => {
					stderr += data.toString();
				});

				crwlProcess.on('close', (code, signal) => {
					clearTimeout(killTimer);
					logMessage(`[CRAWL4AI_CLI] crwl process exited with code: ${code}${signal ? `, signal: ${signal}` : ''}`);
					
					if (stderr) {
						logMessage(`[CRAWL4AI_CLI] stderr: ${stderr}`);
					}

					if (!killedByTimeout && code === 0 && stdout.trim()) {
						logMessage(`[CRAWL4AI_CLI] Crawl completed successfully`);
						logMessage(`[CRAWL4AI_CLI] Output size: ${stdout.length} characters`);
						
						const result = {
							success: true,
							url: url,
							outputFormat: outputFormat,
							deepCrawl: deepCrawl,
							timestamp: new Date().toISOString(),
							crawler: 'crawl4ai-cli',
							content: stdout.trim(),
							...(deepCrawl && { 
								crawlStrategy: deepCrawlStrategy, 
								maxPages: maxPages 
							}),
							...(extractionQuery && { extractionQuery }),
							...(cssSelector && { cssSelector })
						};
						
						resolve({
							content: [{
								type: 'text',
								text: JSON.stringify(result, null, 2)
							}]
						} as const);
					} else {
						const reason = killedByTimeout ? `timeout after ${computedTimeoutSec}s` : `code ${code}${signal ? `, signal ${signal}` : ''}`;
						const errorResult = {
							success: false,
							error: `crwl command failed (${reason})`,
							stderr: stderr,
							url: url,
							timestamp: new Date().toISOString(),
							crawler: 'crawl4ai-cli',
							command: `crwl ${crwlArgs.join(' ')}`
						};
						
						logMessage(`[CRAWL4AI_CLI] Error: ${JSON.stringify(errorResult)}`);
						
						resolve({
							content: [{
								type: 'text',
								text: JSON.stringify(errorResult, null, 2)
							}]
						} as const);
					}
				});

				crwlProcess.on('error', (error) => {
					clearTimeout(killTimer);
					const errorResult = {
						success: false,
						error: `Failed to spawn crwl command: ${error.message}`,
						url: url,
						timestamp: new Date().toISOString(),
						crawler: 'crawl4ai-cli',
						suggestion: 'Make sure Crawl4AI CLI is installed: pip install crawl4ai'
					};
					
					logMessage(`[CRAWL4AI_CLI] Spawn error: ${JSON.stringify(errorResult)}`);
					
					resolve({
						content: [{
							type: 'text',
							text: JSON.stringify(errorResult, null, 2)
						}]
					} as const);
				});
			});

		} catch (error: any) {
			logMessage(`[CRAWL4AI_CLI] Error during setup: ${error?.message || error}`);
			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						success: false,
						error: error?.message || 'Unknown error occurred',
						url: args.url,
						timestamp: new Date().toISOString(),
						crawler: 'crawl4ai-cli'
					}, null, 2)
				}]
			} as const;
		}
	}
);

// Gemini 2.0 Flash Vision Tool for Website Design Analysis
server.registerTool(
	'gemini_vision_analyzer',
	{
		description: 'Analyze website screenshots using Gemini 2.5 Flash for design inspiration extraction',
		inputSchema: {
			screenshotPath: z.string().describe('Path to the screenshot file to analyze'),
			analysisType: z.enum(['full', 'color', 'layout', 'component']).default('full').describe('Type of analysis to perform'),
			customPrompt: z.string().optional().describe('Optional custom prompt for specific analysis needs')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-gemini-vision.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};

		logMessage('[GEMINI_VISION] *** TOOL CALLED! ***');
		logMessage('[GEMINI_VISION] Called with args: ' + JSON.stringify(args));

		const { screenshotPath, analysisType = 'full', customPrompt } = args;

		if (!screenshotPath) {
			return { content: [{ type: 'text', text: 'Error: No screenshot path provided' }] } as const;
		}

		const openRouterApiKey = process.env.OPENROUTER_API_KEY;
		logMessage(`[GEMINI_VISION] API Key found: ${openRouterApiKey ? 'YES' : 'NO'}`);
		logMessage(`[GEMINI_VISION] API Key length: ${openRouterApiKey?.length || 0}`);
		logMessage(`[GEMINI_VISION] API Key starts with: ${openRouterApiKey?.substring(0, 20) || 'N/A'}...`);
		if (!openRouterApiKey) {
			return { content: [{ type: 'text', text: 'Error: OPENROUTER_API_KEY environment variable is required' }] } as const;
		}

		try {
			// Read and encode screenshot
			const imageBuffer = await fs.readFile(screenshotPath);
			const base64Image = imageBuffer.toString('base64');
			const mimeType = screenshotPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

			// Design analysis prompts
			const prompts = {
				full: `DESIGN ANALYSIS TASK - WEBSITE SCREENSHOT

Analyze this website screenshot and provide detailed technical specifications for replication using modern web technologies.

REQUIRED ANALYSIS SECTIONS:

1. COLOR PALETTE EXTRACTION:
   - Primary colors (provide exact hex codes where possible)
   - Secondary colors and accents
   - Background colors and gradients
   - Text colors and contrast ratios

2. LAYOUT & STRUCTURE:
   - Grid system (12-column, flexbox, CSS grid)
   - Container widths and section spacing
   - Content organization and hierarchy
   - Responsive design patterns

3. TYPOGRAPHY ANALYSIS:
   - Font families (serif, sans-serif, monospace)
   - Font weights and sizes observed
   - Text hierarchy patterns

4. COMPONENT SPECIFICATIONS:
   - Button styles (shapes, colors, hover states)
   - Card designs (borders, shadows, spacing)
   - Navigation patterns

5. TAILWIND CSS IMPLEMENTATION:
   - Specific Tailwind classes for replication
   - Custom CSS requirements

Provide specific, actionable technical details for accurate replication.`,
				
				color: `COLOR EXTRACTION TASK - WEBSITE SCREENSHOT

Analyze this screenshot and extract detailed color information:
1. Extract exact hex codes for all visible colors
2. Identify color usage patterns (backgrounds, text, accents)
3. Note any gradients with their properties
4. Provide recommendations for implementation`,

				layout: `LAYOUT ANALYSIS TASK - WEBSITE SCREENSHOT

Analyze this screenshot for layout specifications:
1. Grid system identification
2. Section spacing and arrangements
3. Content hierarchy and organization
4. Responsive design patterns
5. Element positioning and alignment`,

				component: `COMPONENT ANALYSIS TASK - WEBSITE SCREENSHOT

Identify and analyze UI components in this screenshot:
1. Button variations and states
2. Card components structure
3. Navigation elements
4. Form elements and styling
5. Typography components`
			};

			const prompt = customPrompt || prompts[analysisType as keyof typeof prompts] || prompts.full;

			logMessage(`[GEMINI_VISION] Using analysis type: ${analysisType}`);
			logMessage(`[GEMINI_VISION] Screenshot path: ${screenshotPath}`);
			logMessage(`[GEMINI_VISION] Image size: ${Math.round(imageBuffer.length / 1024)}KB`);

			// Prepare OpenRouter API request for Gemini 2.5 Flash
			const openRouterRequest = {
				model: 'google/gemini-2.5-flash-image-preview',
				max_tokens: 4000,
				temperature: 0.1,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: prompt
							},
							{
								type: 'image_url',
								image_url: {
									url: `data:${mimeType};base64,${base64Image}`
								}
							}
						]
					}
				]
			};

			logMessage('[GEMINI_VISION] Calling OpenRouter API...');

			// Make API call to OpenRouter
			const response = await axios.post(
				'https://openrouter.ai/api/v1/chat/completions',
				openRouterRequest,
				{
					headers: {
						'Authorization': `Bearer ${openRouterApiKey}`,
						'Content-Type': 'application/json',
						'HTTP-Referer': 'https://recflux-demo.com',
						'X-Title': 'Website Design Analysis Tool'
					}
				}
			);

			logMessage(`[GEMINI_VISION] API response status: ${response.status}`);

			if (response.status === 200) {
				const analysis = response.data.choices[0].message.content;
				const tokensUsed = response.data.usage?.total_tokens || 0;

				logMessage(`[GEMINI_VISION] Analysis completed successfully`);
				logMessage(`[GEMINI_VISION] Tokens used: ${tokensUsed}`);
				logMessage(`[GEMINI_VISION] Analysis length: ${analysis.length} characters`);

				// Calculate confidence score
				const keywords = ['color', 'layout', 'typography', 'component', 'spacing', 'design'];
				const foundKeywords = keywords.filter(keyword => 
					analysis.toLowerCase().includes(keyword)
				).length;
				const confidence = Math.round((foundKeywords / keywords.length + Math.min(analysis.length / 1000, 1)) / 2 * 100) / 100;

				const result = {
					success: true,
					analysis: analysis,
					confidence: confidence,
					analysisType: analysisType,
					metadata: {
						model: 'google/gemini-2.5-flash-image-preview',
						tokensUsed: tokensUsed,
						screenshotPath: screenshotPath,
						timestamp: new Date().toISOString()
					}
				};

				return {
					content: [{
						type: 'text',
						text: JSON.stringify(result, null, 2)
					}]
				} as const;

			} else {
				logMessage(`[GEMINI_VISION] API error: ${response.status} ${response.statusText}`);
				return { content: [{ type: 'text', text: `OpenRouter API error: ${response.status} ${response.statusText}` }] } as const;
			}

		} catch (error: any) {
			logMessage(`[GEMINI_VISION] Error: ${error?.message || error}`);
			console.error('[GEMINI_VISION] Full error:', error);

			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						success: false,
						error: error?.message || 'Unknown error occurred',
						screenshotPath: screenshotPath,
						timestamp: new Date().toISOString()
					}, null, 2)
				}]
			} as const;
		}
	}
);

// Design Inspiration Analyzer - Complete Workflow Tool
server.registerTool(
	'design_inspiration_analyzer',
	{
		description: 'Complete design inspiration analysis combining web crawling, screenshot capture, and AI vision analysis',
		inputSchema: {
			theme: z.string().describe('Project theme/category (e.g., "tech", "saas", "finance", "creative", "landing", etc.)'),
			includeVisualAnalysis: z.boolean().default(true).describe('Whether to include screenshot capture and Gemini vision analysis'),
			includeTextualAnalysis: z.boolean().default(true).describe('Whether to include web crawling for textual content analysis'),
			customSites: z.array(z.string()).optional().describe('Optional custom inspiration sites to analyze in addition to auto-selected ones')
		}
	},
	async ({ theme, includeVisualAnalysis = true, includeTextualAnalysis = true, customSites = [] }) => {
		const startTime = Date.now();
		
		function logWithTimestamp(msg: string): void {
			fs.appendFile('mcp-design-analyzer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		}
		
		logWithTimestamp(`[DESIGN_ANALYZER] Starting analysis for theme: ${theme}`);
		
		try {
			// Dynamic import to handle the new module
			const { DesignInspirationAnalyzer } = await import('./design-inspiration-analyzer.js');
			const analyzer = new DesignInspirationAnalyzer();
			
			// Perform the complete analysis
			const result = await analyzer.analyzeDesignInspiration(theme);
			
			// Clean up temporary files
			await analyzer.cleanup();
			
			const processingTime = Date.now() - startTime;
			logWithTimestamp(`[DESIGN_ANALYZER] Analysis completed in ${processingTime}ms`);
			logWithTimestamp(`[DESIGN_ANALYZER] Results: ${result.summary.successfulTextual}/${result.summary.totalSites} textual, ${result.summary.successfulVisual}/${result.summary.totalSites} visual`);
			
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: true,
							theme,
							analysis: {
								selectedSites: result.sites.map((site: any) => ({
									url: site.url,
									category: site.category,
									theme: site.theme,
									priority: site.priority
								})),
								consolidatedInsights: result.consolidatedInsights,
								summary: result.summary,
								processingTime,
								timestamp: new Date().toISOString()
							},
							textualResults: includeTextualAnalysis ? result.textualResults : undefined,
							visualResults: includeVisualAnalysis ? result.visualResults : undefined,
							recommendations: [
								...result.consolidatedInsights.recommendations,
								`Analysis completed with ${result.summary.analysisConfidence.toFixed(2)} average confidence`,
								`${result.summary.totalScreenshots} screenshots captured for visual analysis`,
								`${result.consolidatedInsights.inspirationSources.length} successful inspiration sources analyzed`
							]
						}, null, 2)
					}
				]
			} as const;
			
		} catch (error: any) {
			const errorMsg = `Design inspiration analysis failed: ${error?.message || error}`;
			logWithTimestamp(`[DESIGN_ANALYZER] ERROR: ${errorMsg}`);
			
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: errorMsg,
							theme,
							timestamp: new Date().toISOString(),
							processingTime: Date.now() - startTime
						}, null, 2)
					}
				]
			} as const;
		}
	}
);

async function main(): Promise<void> {
	console.error('[MCP_SERVER] Starting MCP server with tools:');
	console.error('- project_reset');
	console.error('- codesandbox_deploy'); 
	console.error('- color_palette_generator');
	console.error('- puppeteer_search');
	console.error('- freepik_ai_image_generator');
	console.error('- web_crawler');
	console.error('- gemini_vision_analyzer');
	console.error('- design_inspiration_analyzer');
	console.error('[MCP_SERVER] Process starting...');
	console.error('[MCP_SERVER] Working directory:', process.cwd());
	console.error('[MCP_SERVER] Environment CLONED_TEMPLATE_DIR:', process.env.CLONED_TEMPLATE_DIR);
	console.error('[MCP_SERVER] Environment PUPPETEER_API_KEY present:', !!process.env.PUPPETEER_API_KEY);
	
	try {
		await server.connect(new StdioServerTransport());
		console.error('[MCP_SERVER] Connected successfully!');
		console.error('[MCP_SERVER] MCP server is now listening for tool calls...');
	} catch (error) {
		console.error('[MCP_SERVER] Connection failed:', error);
		throw error;
	}
}

void main();