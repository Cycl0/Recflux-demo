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
import { deployToNetlify } from './deploy-netlify.js';
import { getRedisCache } from './redis-cache.js';
import { VisionAnalyzer, VisionDesignPrompts } from './vision-analyzer.js';
import VideoAnalyzer from './video-analyzer.js';
import { validateProject, generateErrorReport, type ValidationResult } from './validation.js';
// @ts-ignore - Package has type issues with ES modules
import { AIHorde } from '@zeldafan0225/ai_horde';

// Minimal MCP server exposing project_reset and CodeSandbox deployment only.

// Helper function to get API key with standardized fallback order
function getApiKey(): { key: string | null; source: string } {
	const keys = [
		{ key: process.env.OPENROUTER_API_KEY, name: 'OPENROUTER_API_KEY' },
		{ key: process.env.OPENAI_API_KEY, name: 'OPENAI_API_KEY' },
		{ key: process.env.OPEN_ROUTER_API_KEY, name: 'OPEN_ROUTER_API_KEY' }
	];
	
	for (const { key, name } of keys) {
		if (key) return { key, source: name };
	}
	
	return { key: null, source: 'none' };
}

// Helper function to generate multiple search queries for better video variety
function generateVideoSearchQueries(originalTerm: string, theme: string): string[] {
	const queries = [originalTerm]; // Always include the original term
	
	// Enhanced theme-based query variations with color and style awareness
	const themeVariations: Record<string, { keywords: string[], colors: string[], styles: string[] }> = {
		'business': { 
			keywords: ['professional', 'corporate', 'office', 'meeting', 'team', 'success'],
			colors: ['blue', 'gray', 'white', 'silver'],
			styles: ['clean', 'minimal', 'corporate', 'elegant']
		},
		'technology': { 
			keywords: ['digital', 'innovation', 'coding', 'data', 'network', 'future'],
			colors: ['blue', 'cyan', 'dark', 'neon'],
			styles: ['modern', 'sleek', 'futuristic', 'geometric']
		},
		'healthcare': { 
			keywords: ['medical', 'health', 'wellness', 'care', 'healing', 'treatment'],
			colors: ['blue', 'green', 'white', 'soft'],
			styles: ['calm', 'clean', 'peaceful', 'gentle']
		},
		'finance': { 
			keywords: ['money', 'investment', 'banking', 'growth', 'economy', 'financial'],
			colors: ['blue', 'gold', 'green', 'dark'],
			styles: ['premium', 'stable', 'secure', 'professional']
		},
		'food-drink': { 
			keywords: ['cooking', 'dining', 'restaurant', 'cuisine', 'recipe', 'kitchen'],
			colors: ['warm', 'brown', 'orange', 'natural'],
			styles: ['appetizing', 'cozy', 'rustic', 'fresh']
		},
		'travel': { 
			keywords: ['adventure', 'journey', 'destination', 'vacation', 'explore', 'tourism'],
			colors: ['blue', 'earth', 'vibrant', 'sunset'],
			styles: ['scenic', 'epic', 'breathtaking', 'wanderlust']
		},
		'fitness': { 
			keywords: ['workout', 'exercise', 'training', 'gym', 'health', 'active'],
			colors: ['orange', 'green', 'energetic', 'bright'],
			styles: ['dynamic', 'powerful', 'motivating', 'intense']
		},
		'real-estate': { 
			keywords: ['property', 'home', 'house', 'building', 'architecture', 'interior'],
			colors: ['warm', 'neutral', 'earth', 'white'],
			styles: ['luxurious', 'spacious', 'elegant', 'welcoming']
		},
		'fashion': { 
			keywords: ['style', 'clothing', 'design', 'trendy', 'outfit', 'apparel'],
			colors: ['black', 'white', 'pastel', 'metallic'],
			styles: ['chic', 'artistic', 'sophisticated', 'glamorous']
		}
	};
	
	// Get theme-specific data or defaults
	const themeData = themeVariations[theme] || {
		keywords: ['background', 'professional', 'modern', 'clean'],
		colors: ['neutral', 'white', 'soft'],
		styles: ['minimal', 'elegant', 'contemporary']
	};
	
	// Add theme-specific keyword variations
	themeData.keywords.slice(0, 2).forEach(keyword => {
		queries.push(`${originalTerm} ${keyword}`);
		queries.push(keyword);
	});
	
	// Add color-aware search terms
	themeData.colors.slice(0, 2).forEach(color => {
		queries.push(`${color} ${originalTerm}`);
		queries.push(`${color} background`);
	});
	
	// Add style-aware search terms
	themeData.styles.slice(0, 2).forEach(style => {
		queries.push(`${style} ${originalTerm}`);
		queries.push(`${style} background`);
	});
	
	// Add high-quality cinematic terms for better production values
	const cinematicTerms = ['cinematic', 'slow motion', 'abstract', 'minimal', 'smooth', 'flowing'];
	cinematicTerms.slice(0, 2).forEach(term => {
		queries.push(term);
	});
	
	// Remove duplicates and limit to 8 queries for comprehensive coverage
	return [...new Set(queries)].slice(0, 8);
}

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
			const templateStat = await fs.stat(templateDir);
			if (!templateStat.isDirectory()) {
				throw new Error(`Template directory not found: ${templateDir}`);
			}
			
			// Ensure project directory exists
			await fs.mkdir(projectDir, { recursive: true });
			
			// Copy clean template files to project directory
			await fs.cp(templateDir, projectDir, { recursive: true, force: true });
			
			return { content: [{ type: 'text', text: JSON.stringify({ ok: true, projectDir, templateDir }) }] } as const;
		} catch (e: any) {
			return { content: [{ type: 'text', text: `project_reset error: ${e?.message || e}. Template dir: ${templateDir}` }] } as const;
		}
	}
);

server.registerTool(
	'netlify_deploy',
	{
		description: 'Deploy the current project to Netlify and return preview/admin URLs',
		inputSchema: {}
	},
	async (_args: any) => {
		const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
		const stat = await fs.stat(root).catch(() => null);
		if (!stat || !stat.isDirectory()) {
			return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] } as const;
		}
		try {
			console.error(`[MCP_NETLIFY_DEPLOY] Creating Netlify site from directory: ${root}`);
			
			const result = await deployToNetlify(root);
			console.error(`[MCP_NETLIFY_DEPLOY] Netlify site created. dashboard=${result.adminUrl} preview=${result.previewUrl}`);
			return { content: [{ type: 'text', text: JSON.stringify({ adminUrl: result.adminUrl, previewUrl: result.previewUrl }) }] } as const;
		} catch (err: any) {
			const msg = err?.message || String(err);
			console.error(`[MCP_NETLIFY_DEPLOY] Failed: ${msg}`);
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
		
		const mode = args.mode || 'transformer';
		const numColors = Math.min(12, Math.max(2, args.numColors || 3));
		const temperature = Math.min(2.4, Math.max(0, args.temperature || 1.2));
		const baseColors = args.baseColors || [];
		
		logMessage(`[MCP_COLOR_PALETTE] Generating palette: mode=${mode} | colors=${numColors} | temp=${temperature} | base_colors=${baseColors.length}`);
		
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
			searchType: z.enum(['videos', 'icons', 'vectors', 'vfx', 'music', 'animations']).default('videos').describe('The type of content to search for'),
			theme: z.string().describe('Project theme for caching results (e.g., ecommerce, portfolio, saas)'),
			bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh search')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-puppeteer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};
		
		logMessage(`[MCP_PUPPETEER] Search request: ${args.searchType || 'videos'} | term="${args.searchTerm || ''}" | theme=${args.theme || 'N/A'}`);
		
		const searchTerm = args.searchTerm || '';
		const searchType = args.searchType || 'videos';
		const theme = args.theme;
		const bypassCache = args.bypassCache || false;
		
		if (!searchTerm) {
			return { content: [{ type: 'text', text: 'Error: No search term provided' }] } as const;
		}
		
		if (!theme) {
			return { content: [{ type: 'text', text: 'Error: No theme provided' }] } as const;
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
		
		// Initialize Redis cache
		const cache = getRedisCache();
		
		// Check cache first if not bypassing cache
		if (!bypassCache) {
			try {
				await cache.connect();
				logMessage(`[MCP_PUPPETEER] Checking cache for theme: ${theme}, searchTerm: ${searchTerm}, searchType: ${searchType}`);
				
				const cachedResults = await cache.getPuppeteerResults(theme, `${searchType}:${searchTerm}`);
				
				if (cachedResults) {
					logMessage(`[MCP_PUPPETEER] Cache hit! Using cached results for: ${searchType}:${searchTerm}`);
					
					// Convert cached scrapedData back to expected format
					let results: any[] = [];
					if (searchType === 'videos' && cachedResults.scrapedData.videos) {
						results = cachedResults.scrapedData.videos.map(v => ({
							title: `Video from cache`,
							videoUrl: v.src,
							thumbnailUrl: v.thumbnail,
							type: v.type
						}));
					} else if (searchType === 'images' && cachedResults.scrapedData.images) {
						results = cachedResults.scrapedData.images.map(img => ({
							title: img.alt || 'Image from cache',
							src: img.src,
							type: img.type
						}));
					} else if (searchType === 'icons' && cachedResults.scrapedData.icons) {
						results = cachedResults.scrapedData.icons.map(icon => ({
							title: 'Icon from cache',
							src: icon.src,
							type: icon.type,
							size: icon.size
						}));
					} else if (searchType === 'vectors' && cachedResults.scrapedData.vectors) {
						results = cachedResults.scrapedData.vectors.map(vector => ({
							title: 'Vector from cache',
							src: vector.src,
							format: vector.format,
							usage: vector.usage
						}));
					}
					
					return { content: [{ type: 'text', text: JSON.stringify({
						searchType,
						searchTerm,
						theme,
						source: 'Redis Cache',
						cached: true,
						timestamp: cachedResults.timestamp,
						results: results,
						totalFound: results.length
					}, null, 2) }] } as const;
				} else {
					logMessage(`[MCP_PUPPETEER] Cache miss, proceeding with fresh search for: ${searchType}:${searchTerm}`);
				}
			} catch (cacheError) {
				logMessage(`[MCP_PUPPETEER] Cache check failed: ${cacheError}. Proceeding with fresh search.`);
			}
		} else {
			logMessage(`[MCP_PUPPETEER] Cache bypass requested for: ${searchType}:${searchTerm}`);
		}
		
		try {
			// Enhanced video search with multiple queries and AI analysis
			if (searchType === 'videos') {
				logMessage(`[MCP_PUPPETEER] 🎥 ENTERING ENHANCED VIDEO SEARCH FLOW`);
				
				const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
				logMessage(`[MCP_PUPPETEER] 🔑 PEXELS_API_KEY check: ${PEXELS_API_KEY ? 'FOUND' : 'MISSING'}`);
				
				if (PEXELS_API_KEY) {
					// Generate multiple search queries for better variety
					const searchQueries = generateVideoSearchQueries(searchTerm, theme);
					logMessage(`[MCP_PUPPETEER] Generated ${searchQueries.length} search queries: ${searchQueries.join(', ')}`);
					
					let allVideoResults: any[] = [];
					const seenVideoIds = new Set();
					let totalResultsFromAllQueries = 0;
					
					// Search with each query to get diverse results
					for (let i = 0; i < searchQueries.length; i++) {
						const query = searchQueries[i];
						const perPage = Math.max(3, Math.floor(20 / searchQueries.length)); // Distribute API quota
						const apiUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
						
						logMessage(`[MCP_PUPPETEER] Query ${i + 1}/${searchQueries.length}: "${query}" (${perPage} videos)`);
						
						try {
							const headers: Record<string, string> = { 'Authorization': PEXELS_API_KEY };
							const response = await fetch(apiUrl, { headers });
							
							if (!response.ok) {
								logMessage(`[MCP_PUPPETEER] Query "${query}" failed: ${response.status} ${response.statusText}`);
								continue;
							}
							
							const data = (await response.json()) as { total_results: number; videos?: any[] };
							totalResultsFromAllQueries += data.total_results;
							const queryResults = data.videos?.map((video: any) => ({
								id: video.id,
								title: video.user?.name ? `Video by ${video.user.name}` : 'Untitled Video',
								url: video.url,
								preview_url: video.video_files?.[0]?.link || video.url,
								thumbnail: video.image,
								width: video.width,
								height: video.height,
								duration: video.duration,
								user: video.user,
								type: 'video',
								searchQuery: query // Track which query found this video
							})) || [];
							
							// Add unique videos only
							queryResults.forEach(video => {
								if (!seenVideoIds.has(video.id)) {
									seenVideoIds.add(video.id);
									allVideoResults.push(video);
								}
							});
							
							logMessage(`[MCP_PUPPETEER] Query "${query}": ${queryResults.length} videos (${allVideoResults.length} total unique)`);
							
							// Small delay between API calls to be respectful
							if (i < searchQueries.length - 1) {
								await new Promise(resolve => setTimeout(resolve, 500));
							}
						} catch (queryError) {
							logMessage(`[MCP_PUPPETEER] Error with query "${query}": ${queryError}`);
						}
					}
					
					logMessage(`[MCP_PUPPETEER] Collected ${allVideoResults.length} unique videos from ${searchQueries.length} queries`);
					
					// Always use video analyzer if we have videos and API key
					let selectedVideo = allVideoResults[0]; // fallback
					let analysisResult = null;
					const { key: apiKey, source: keySource } = getApiKey();
					
					if (allVideoResults.length >= 1 && apiKey) {
						logMessage(`[MCP_PUPPETEER] Video analysis enabled - Using API key from: ${keySource} (${allVideoResults.length} videos to analyze)`);
						try {
							const videoAnalyzer = new VideoAnalyzer(apiKey);
							analysisResult = await videoAnalyzer.analyzeAndSelectBestVideo({
								videos: allVideoResults,
								theme: theme || 'general',
								websiteContext: `Website background video for ${searchTerm} related content`,
								bypassCache: args.bypassCache
							});
							selectedVideo = analysisResult.selectedVideo;
							logMessage(`[MCP_PUPPETEER] Video analysis complete. Selected: "${selectedVideo.title}" from query "${selectedVideo.searchQuery}" (confidence: ${analysisResult.confidence})`);
						} catch (analysisError) {
							logMessage(`[MCP_PUPPETEER] Video analysis failed, using first video as fallback: ${analysisError}`);
						}
					} else if (!apiKey) {
						logMessage(`[MCP_PUPPETEER] Skipping video analysis - no API key available`);
					} else {
						logMessage(`[MCP_PUPPETEER] Skipping video analysis - no videos found`);
					}

					// Return the selected video with analysis metadata
					const results = [selectedVideo];
					
					// Cache the results with analysis metadata
					try {
						logMessage(`[MCP_PUPPETEER] Caching Pexels API results with OpenRouter analysis for theme: ${theme}`);
						await cache.setPuppeteerResults(theme, `${searchType}:${searchTerm}`, {
							scrapedData: {
								videos: results.map(r => ({ 
									src: r.preview_url, 
									type: r.type, 
									thumbnail: r.thumbnail,
									videoId: r.id,
									title: r.title,
									analysisConfidence: analysisResult?.confidence
								})),
								images: [],
								icons: [],
								vectors: [],
								colors: [],
								fonts: [],
								socialMedia: [],
								backgroundImages: []
							},
							metadata: {
								scrapedAt: new Date().toISOString(),
								userAgent: 'Pexels API + OpenRouter Video Analysis',
								viewport: { width: 0, height: 0 },
								loadTime: 0,
								elementsFound: results.length
							},
							ttl: 259200 // 3 days
						});
					} catch (cacheError) {
						logMessage(`[MCP_PUPPETEER] Failed to cache Pexels results: ${cacheError}`);
					}
					
					return { content: [{ type: 'text', text: JSON.stringify({
						searchType,
						searchTerm,
						theme,
						source: 'Pexels API + OpenRouter AI Video Analysis',
						total_results: totalResultsFromAllQueries,
						results: results,
						cached: false,
						videoAnalysis: analysisResult ? {
							selectedVideoId: analysisResult.selectedVideo.id,
							selectedVideoTitle: analysisResult.selectedVideo.title,
							selectedFromQuery: analysisResult.selectedVideo.searchQuery,
							confidence: analysisResult.confidence,
							reasoning: analysisResult.reasoning,
							colorAnalysis: analysisResult.colorAnalysis,
							totalVideosAnalyzed: analysisResult.metadata.totalAnalyzed,
							totalQueriesUsed: searchQueries.length,
							processingTime: analysisResult.metadata.processingTime,
							alternativesAvailable: analysisResult.alternatives.length,
							analysisType: analysisResult.metadata.analysisType
						} : null
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
					
					const puppeteerResults = {
						searchType,
						searchTerm,
						results: contentData.slice(0, 10),
						totalFound: contentData.length,
						source: 'puppeteer-extracted'
					};
					
					// Cache the results in proper PuppeteerCacheEntry format
					try {
						logMessage(`[MCP_PUPPETEER] Caching Puppeteer results for theme: ${theme}`);
						
						// Convert extracted content to PuppeteerCacheEntry format
						const scrapedData = {
							videos: searchType === 'videos' ? contentData.slice(0, 10).map((item: any) => ({
								src: item.videoUrl || item.src || '',
								type: item.type || 'video',
								thumbnail: item.thumbnailUrl || item.thumbnail
							})) : [],
							images: searchType === 'images' ? contentData.slice(0, 10).map((item: any) => ({
								src: item.src || '',
								alt: item.title || '',
								type: item.type || 'image'
							})) : [],
							icons: searchType === 'icons' ? contentData.slice(0, 10).map((item: any) => ({
								src: item.src || '',
								type: item.type || 'icon',
								size: item.size
							})) : [],
							vectors: searchType === 'vectors' ? contentData.slice(0, 10).map((item: any) => ({
								src: item.src || '',
								format: item.format || 'svg',
								usage: item.usage
							})) : [],
							colors: [],
							fonts: [],
							socialMedia: [],
							backgroundImages: []
						};
						
						await cache.setPuppeteerResults(theme, `${searchType}:${searchTerm}`, {
							scrapedData,
							metadata: {
								scrapedAt: new Date().toISOString(),
								userAgent: 'Puppeteer Chrome',
								viewport: { width: 1024, height: 768 },
								loadTime: 0,
								elementsFound: contentData.length
							},
							ttl: 259200 // 3 days
						});
					} catch (cacheError) {
						logMessage(`[MCP_PUPPETEER] Failed to cache Puppeteer results: ${cacheError}`);
					}
					
					return { content: [{ type: 'text', text: JSON.stringify({
						...puppeteerResults,
						cached: false
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

// AI Horde Image Generation Tool
server.registerTool(
	'ai_horde_image_generator',
	{
		description: 'Generate images using AI Horde text-to-image models',
		inputSchema: {
			prompt: z.string().describe('The text prompt to generate an image from'),
			htmlContext: z.string().describe('REQUIRED: The HTML/component structure where this image will be placed (for contextual analysis). Must include titles, descriptions, and surrounding context.'),
			componentContext: z.string().optional().describe('Description of the component/use case where this image will be used (e.g., "hero section for a travel website", "card image for a restaurant app")'),
			imageRole: z.string().optional().describe('Specific role of the image (e.g., "background", "icon", "illustration", "photo", "avatar")'),
			aspect_ratio: z.enum(['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '2:1', '1:2', '5:4', '4:5']).default('1:1').optional().describe('Aspect ratio of the generated image'),
			num_images: z.number().min(1).max(20).default(1).optional().describe('Number of images to generate (1-20, AI Horde supports up to 20)'),
			seed: z.number().min(1).max(4294967295).optional().describe('Seed for reproducible generation'),
			steps: z.number().min(1).max(500).default(30).optional().describe('Number of generation steps (1-500, higher = better quality but slower)'),
			cfg_scale: z.number().min(0).max(100).default(7.5).optional().describe('Classifier-free guidance scale (0-100, higher = more prompt adherence)'),
			sampler_name: z.enum(['k_euler_a', 'k_euler', 'k_lms', 'k_heun', 'k_dpm_2', 'k_dpm_2_a', 'DDIM', 'PLMS']).default('k_euler_a').optional().describe('Sampling method for generation'),
			trusted_workers: z.boolean().default(true).optional().describe('Use only trusted workers for generation'),
			bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh image generation')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-ai-horde-image-generator.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};
		try {
			// AI Horde doesn't require API key for anonymous usage
			const aiHordeApiKey = process.env.AI_HORDE_API_KEY || '0000000000'; // Anonymous key

			const prompt = args.prompt || '';
			const htmlContext = args.htmlContext || '';
			const componentContext = args.componentContext || '';
			const imageRole = args.imageRole || '';
			const aspectRatio = args.aspect_ratio || '1:1';
			const numImages = args.num_images || 1;
			const seed = args.seed || Math.floor(Math.random() * 4294967295);
			const steps = args.steps || 30;
			const cfgScale = args.cfg_scale || 7.5;
			const samplerName = args.sampler_name || 'k_euler_a';
			const trustedWorkers = args.trusted_workers !== undefined ? args.trusted_workers : true;
			const bypassCache = args.bypassCache || false;
			
			logMessage(`[AI_HORDE] Image generation request: "${prompt}" | aspect=${aspectRatio} | num_images=${numImages} | steps=${steps} | cfg_scale=${cfgScale} | sampler=${samplerName} | trusted=${trustedWorkers} | bypass_cache=${bypassCache}`);
			
			if (!prompt) {
				return { content: [{ type: 'text', text: 'Error: No prompt provided' }] } as const;
			}
			
			if (!htmlContext) {
				return { content: [{ type: 'text', text: 'Error: HTML context is required for contextual image generation. Please provide the HTML/component structure where this image will be placed.' }] } as const;
			}

			// Initialize Redis cache and check for cached results
			const cache = getRedisCache();
			
			if (!bypassCache) {
				try {
					await cache.connect();
					logMessage(`[AI_HORDE] Checking cache for prompt: ${prompt.substring(0, 50)}...`);
					
					const cachedResults = await cache.getImageGenerationResults(prompt);
					
					if (cachedResults) {
						logMessage(`[AI_HORDE] Cache hit! Using cached image for prompt: ${prompt.substring(0, 50)}...`);
						
						return { 
							content: [{ 
								type: 'text', 
								text: JSON.stringify({
									success: true,
									imageUrl: cachedResults.imageUrl,
									allImages: cachedResults.allImages,
									totalImages: cachedResults.allImages.length,
									filename: `cached_${Date.now()}.jpg`,
									format: 'jpeg',
									model: 'ai-horde',
									hosting: 'AI Horde CDN',
									aspectRatio: cachedResults.metadata.aspectRatio,
									seed: cachedResults.metadata.seed,
									taskId: cachedResults.metadata.taskId,
									cached: true,
									timestamp: cachedResults.timestamp
								}, null, 2)
							}] 
						} as const;
					} else {
						logMessage(`[AI_HORDE] Cache miss, proceeding with fresh generation for: ${prompt.substring(0, 50)}...`);
					}
				} catch (cacheError) {
					logMessage(`[AI_HORDE] Cache check failed: ${cacheError}. Proceeding with fresh generation.`);
				}
			} else {
				logMessage(`[AI_HORDE] Cache bypass requested for prompt: ${prompt.substring(0, 50)}...`);
			}

			// Simple prompt - let the system prompt handle the contextual analysis
			const contextualPrompt = prompt;
			
			logMessage(`[AI_HORDE] Original prompt: "${prompt}"`);
			logMessage(`[AI_HORDE] HTML context provided: ${!!htmlContext}`);
			logMessage(`[AI_HORDE] HTML context length: ${htmlContext.length}`);
			logMessage(`[AI_HORDE] HTML context preview: ${htmlContext.substring(0, 300)}...`);
			logMessage(`[AI_HORDE] Component context: "${componentContext}"`);
			logMessage(`[AI_HORDE] Image role: "${imageRole}"`);
			logMessage(`[AI_HORDE] Aspect ratio: "${aspectRatio}"`);

			console.error(`[AI_HORDE] Generating image with contextual prompt: "${contextualPrompt}"`);

			// Initialize AI Horde client
			const ai_horde = new AIHorde({
				cache_interval: 1000 * 10,
				cache: {
					generations_check: 1000 * 30
				},
				client_agent: "WhatsApp-Integration:v1.0.0:recflux@contact",
				default_token: aiHordeApiKey
			});

			// Convert aspect ratio to width/height (AI Horde requires multiples of 64)
			let width = 512, height = 512;
			switch (aspectRatio) {
				case '1:1': width = 512; height = 512; break;
				case '4:3': width = 512; height = 384; break;
				case '3:4': width = 384; height = 512; break;
				case '16:9': width = 576; height = 320; break;
				case '9:16': width = 320; height = 576; break;
				case '3:2': width = 512; height = 320; break;
				case '2:3': width = 320; height = 512; break;
				case '2:1': width = 512; height = 256; break;
				case '1:2': width = 256; height = 512; break;
				case '5:4': width = 512; height = 384; break;
				case '4:5': width = 384; height = 512; break;
				default: width = 512; height = 512; break;
			}

			logMessage(`[AI_HORDE] Dimensions: ${width}x${height}`);

			// Start image generation using proper Stable Horde API parameters
			const generation = await ai_horde.postAsyncImageGenerate({
				prompt: contextualPrompt,
				params: {
					width: width,
					height: height,
					n: numImages,
					seed: seed.toString(),
					steps: steps,
					cfg_scale: cfgScale,
					sampler_name: samplerName
				},
				nsfw: false,
				trusted_workers: trustedWorkers
			});

			logMessage(`[AI_HORDE] Generation started with ID: ${generation.id}`);
			logMessage(`[AI_HORDE] Response data: ${JSON.stringify(generation)}`);

			if (!generation.id) {
				return { content: [{ type: 'text', text: 'Error: No generation ID returned from AI Horde API' }] } as const;
			}

			// Poll for job completion
			let attempts = 0;
			const maxAttempts = 60; // 60 attempts with 5 second intervals = 5 minutes max wait
			let imageUrl = null;
			let allGeneratedImages = [];

			while (attempts < maxAttempts && !imageUrl) {
				attempts++;
				logMessage(`[AI_HORDE] Polling attempt ${attempts}/${maxAttempts}`);

				await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

				try {
					const check = await ai_horde.getImageGenerationCheck(generation.id);
					logMessage(`[AI_HORDE] Status check ${attempts}: ${check.done ? 'COMPLETED' : 'PROCESSING'}`);
					logMessage(`[AI_HORDE] Full status response: ${JSON.stringify(check)}`);

					if (check.done && check.generations && check.generations.length > 0) {
						allGeneratedImages = check.generations.map((gen: any) => gen.img);
						imageUrl = allGeneratedImages[0];
						logMessage(`[AI_HORDE] Generated ${allGeneratedImages.length} images`);
						logMessage(`[AI_HORDE] All image URLs: ${JSON.stringify(allGeneratedImages)}`);
						logMessage(`[AI_HORDE] First image URL: ${imageUrl}`);
						break;
					} else if (check.faulted) {
						logMessage(`[AI_HORDE] Image generation failed: ${check.message || 'Unknown error'}`);
						return { content: [{ type: 'text', text: `Image generation failed: ${check.message || 'Unknown error'}` }] } as const;
					} else if (check.done && (!check.generations || check.generations.length === 0)) {
						logMessage('[AI_HORDE] Generation marked as done but no images found - trying alternative status method');

						// Try to get the status via different method
						try {
							const statusResp = await ai_horde.getImageGenerationStatus(generation.id);
							logMessage(`[AI_HORDE] Alternative status check: ${JSON.stringify(statusResp)}`);

							if (statusResp.generations && statusResp.generations.length > 0) {
								allGeneratedImages = statusResp.generations.map((gen: any) => gen.img);
								imageUrl = allGeneratedImages[0];
								logMessage(`[AI_HORDE] SUCCESS via alternative method! Generated ${allGeneratedImages.length} images`);
								logMessage(`[AI_HORDE] Image URL: ${imageUrl}`);
								break;
							}
						} catch (altError: any) {
							logMessage(`[AI_HORDE] Alternative status check failed: ${altError?.message || altError}`);
						}
					} else {
						// Also try alternative method for processing status after some attempts
						if (attempts >= 10 && attempts % 5 === 0) {
							logMessage(`[AI_HORDE] Still processing after ${attempts} attempts - trying alternative status method`);
							try {
								const statusResp = await ai_horde.getImageGenerationStatus(generation.id);
								logMessage(`[AI_HORDE] Alternative status check (processing): ${JSON.stringify(statusResp)}`);

								if (statusResp.generations && statusResp.generations.length > 0) {
									allGeneratedImages = statusResp.generations.map((gen: any) => gen.img);
									imageUrl = allGeneratedImages[0];
									logMessage(`[AI_HORDE] SUCCESS via alternative method (processing)! Generated ${allGeneratedImages.length} images`);
									logMessage(`[AI_HORDE] Image URL: ${imageUrl}`);
									break;
								}
							} catch (altError: any) {
								logMessage(`[AI_HORDE] Alternative status check (processing) failed: ${altError?.message || altError}`);
							}
						}
					}
				} catch (statusError: any) {
					logMessage(`[AI_HORDE] Status check error: ${statusError?.message || statusError}`);
				}
			}

			if (!imageUrl) {
				return { content: [{ type: 'text', text: 'Error: Image generation timed out or failed' }] } as const;
			}
				
			// Return the direct AI Horde URL - no need for additional upload
			const timestamp = Date.now();
			const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
			const filename = `ai_horde_${sanitizedPrompt}_${timestamp}.jpg`;

			logMessage(`[AI_HORDE] Image generation completed successfully!`);
			logMessage(`[AI_HORDE] Direct image URL: ${imageUrl}`);

			// Cache the results for future use
			try {
				logMessage(`[AI_HORDE] Caching image generation results for prompt: ${prompt.substring(0, 50)}...`);
				await cache.setImageGenerationResults(prompt, {
					imageUrl: imageUrl,
					allImages: allGeneratedImages,
					metadata: {
						aspectRatio: aspectRatio,
						seed: seed,
						taskId: generation.id,
						model: 'ai-horde',
						generatedAt: new Date().toISOString()
					},
					ttl: 2592000 // 30 days
				});
			} catch (cacheError) {
				logMessage(`[AI_HORDE] Failed to cache image generation results: ${cacheError}`);
			}

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
						model: 'ai-horde',
						hosting: 'AI Horde CDN',
						aspectRatio: aspectRatio,
						seed: seed,
						taskId: generation.id,
						cached: false
					}, null, 2)
				}] 
			} as const;

		} catch (error: any) {
			console.error('[AI_HORDE] Error generating image:', error?.message || error);
			logMessage(`[AI_HORDE] Full error details: ${JSON.stringify({
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
			timeout: z.number().min(10).max(120).default(30).optional().describe('Timeout in seconds'),
			bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh crawl')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-crawl4ai-cli.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};

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
				timeout = 30,
				bypassCache = false
			} = args;
			
			logMessage(`[CRAWL4AI_CLI] Crawl request: ${url} | format=${outputFormat} | deep=${deepCrawl} | bypass_cache=${bypassCache}`);

			// Initialize Redis cache
			const cache = getRedisCache();
			
			// Try to connect to Redis (non-blocking)
			try {
				await cache.connect();
			} catch (redisError) {
				logMessage(`[CRAWL4AI_CLI] Redis connection failed, proceeding without cache: ${redisError}`);
			}

			// Check cache first (unless bypassing cache)
			if (!bypassCache) {
				logMessage(`[CRAWL4AI_CLI] Checking cache for: ${url}`);
				const cachedResult = await cache.getCrawlAnalysis(url, outputFormat);
				
				if (cachedResult) {
					logMessage(`[CRAWL4AI_CLI] Cache hit! Returning cached result for: ${url}`);
					const result = {
						success: true,
						url: cachedResult.url,
						outputFormat: cachedResult.outputFormat,
						deepCrawl: deepCrawl,
						timestamp: cachedResult.timestamp,
						crawler: 'crawl4ai-cli-cached',
						content: cachedResult.textualAnalysis,
						cached: true,
						cacheTimestamp: cachedResult.timestamp,
						...(deepCrawl && { 
							crawlStrategy: deepCrawlStrategy, 
							maxPages: maxPages 
						}),
						...(extractionQuery && { extractionQuery }),
						...(cssSelector && { cssSelector })
					};
					
					return {
						content: [{
							type: 'text',
							text: JSON.stringify(result, null, 2)
						}]
					} as const;
				} else {
					logMessage(`[CRAWL4AI_CLI] Cache miss, proceeding with fresh crawl for: ${url}`);
				}
			} else {
				logMessage(`[CRAWL4AI_CLI] Cache bypass requested, proceeding with fresh crawl for: ${url}`);
			}

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

				crwlProcess.on('close', async (code, signal) => {
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
							cached: false,
							...(deepCrawl && { 
								crawlStrategy: deepCrawlStrategy, 
								maxPages: maxPages 
							}),
							...(extractionQuery && { extractionQuery }),
							...(cssSelector && { cssSelector })
						};

						// Cache the successful result
						if (!bypassCache) {
							try {
								const cacheSuccess = await cache.setCrawlAnalysis(url, {
									textualAnalysis: stdout.trim(),
									crawledContent: {
										outputFormat,
										deepCrawl,
										...(deepCrawl && { crawlStrategy: deepCrawlStrategy, maxPages }),
										...(extractionQuery && { extractionQuery }),
										...(cssSelector && { cssSelector })
									},
									outputFormat,
									ttl: parseInt(process.env.CACHE_TTL_CRAWL || '86400') // 24 hours default
								}, outputFormat);
								
								if (cacheSuccess) {
									logMessage(`[CRAWL4AI_CLI] Successfully cached result for: ${url}`);
									result.cached = 'stored';
								} else {
									logMessage(`[CRAWL4AI_CLI] Failed to cache result for: ${url}`);
								}
							} catch (cacheError) {
								logMessage(`[CRAWL4AI_CLI] Error caching result: ${cacheError}`);
							}
						}
						
						resolve({
							content: [{
								type: 'text',
								text: JSON.stringify(result, null, 2)
							}]
						} as const);
					} else {
						const reason = killedByTimeout ? `timeout after ${computedTimeoutSec}s` : `code ${code}${signal ? `, signal ${signal}` : ''}`;
						let errorAnalysis = 'Crawl operation failed';
						let suggestions: string[] = [];
						
						// Analyze common error patterns
						if (stderr.includes('Executable doesn\'t exist')) {
							errorAnalysis = 'Playwright browser executable not found';
							suggestions = [
								'Run: /opt/crawl4ai-venv/bin/playwright install chromium',
								'Check if the browser cache directory has proper permissions',
								'Restart the container to ensure fresh browser installation'
							];
						} else if (stderr.includes('BrowserType.launch')) {
							errorAnalysis = 'Browser launch failure - typically indicates missing dependencies or permissions';
							suggestions = [
								'Verify system dependencies are installed',
								'Check if running with sufficient privileges',
								'Ensure Chrome/Chromium browsers are properly installed'
							];
						} else if (killedByTimeout) {
							errorAnalysis = 'Operation timed out - website may be slow or blocking requests';
							suggestions = [
								'Try with a simpler URL to test connectivity',
								'Increase timeout if dealing with slow websites',
								'Check if the website blocks automated requests'
							];
						}
						
						const errorResult = {
							success: false,
							error: `crwl command failed (${reason})`,
							errorAnalysis,
							suggestions,
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
						suggestion: 'Crawler initialization failed. This usually indicates missing dependencies or incorrect installation.',
						troubleshooting: [
							'Check if Crawl4AI is properly installed: /opt/crawl4ai-venv/bin/crwl --version',
							'Verify Playwright browsers are installed: /opt/crawl4ai-venv/bin/playwright install chromium',
							'Ensure proper permissions for the appuser account',
							'Check Docker container logs for dependency installation errors'
						]
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
	'vision_analyzer',
	{
		description: 'Analyze website screenshots using multimodal llm for design inspiration extraction',
		inputSchema: {
			screenshotPath: z.string().describe('Path to the screenshot file to analyze'),
			analysisType: z.enum(['full', 'color', 'layout', 'component']).default('full').describe('Type of analysis to perform'),
			customPrompt: z.string().optional().describe('Optional custom prompt for specific analysis needs'),
			bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh analysis')
		}
	},
	async (args: any) => {
		const logMessage = (msg: string) => {
			console.error(msg);
			fs.appendFile('mcp-vision-analyzer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		};

		const { screenshotPath, analysisType = 'full', customPrompt, bypassCache = false } = args;
		
		logMessage(`[VISION_ANALYZER] Analyzing screenshot: ${screenshotPath} | type=${analysisType} | bypass_cache=${bypassCache}`);

		if (!screenshotPath) {
			return { content: [{ type: 'text', text: 'Error: No screenshot path provided' }] } as const;
		}

		// Get API key using standardized helper
		const { key: apiKey, source: keySource } = getApiKey();
		
		if (!apiKey) {
			const errorMsg = `Vision analysis failed - No API key found. Please set one of: OPENROUTER_API_KEY, OPENAI_API_KEY, or OPEN_ROUTER_API_KEY`;
			logMessage(`[VISION_ANALYZER] ${errorMsg}`);
			return { content: [{ type: 'text', text: JSON.stringify({
				success: false,
				error: errorMsg,
				screenshotPath: screenshotPath,
				timestamp: new Date().toISOString(),
				availableKeys: {
					OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
					OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
					OPEN_ROUTER_API_KEY: !!process.env.OPEN_ROUTER_API_KEY
				}
			}, null, 2) }] } as const;
		}

		logMessage(`[VISION_ANALYZER] Using API key from: ${keySource}`);

		try {
			// Initialize Vision Analyzer
			const { VisionAnalyzer } = await import('./vision-analyzer.js');
			const analyzer = new VisionAnalyzer(apiKey);
			
			// Select appropriate prompt
			let prompt = customPrompt;
			if (!prompt) {
				switch (analysisType) {
					case 'full': prompt = VisionDesignPrompts.fullAnalysis; break;
					case 'color': prompt = VisionDesignPrompts.colorAnalysis; break;
					case 'layout': prompt = VisionDesignPrompts.layoutAnalysis; break;
					case 'component': prompt = VisionDesignPrompts.componentAnalysis; break;
					default: prompt = VisionDesignPrompts.fullAnalysis;
				}
			}

			logMessage(`[VISION_ANALYZER] Using analysis type: ${analysisType}`);
			logMessage(`[VISION_ANALYZER] Screenshot path: ${screenshotPath}`);
			logMessage(`[VISION_ANALYZER] Bypass cache: ${bypassCache}`);

			// Analyze screenshot using the VisionAnalyzer with caching
			const result = await analyzer.analyzeScreenshot({
				screenshotPath,
				prompt,
				bypassCache,
				analysisType
			});

			logMessage(`[VISION_ANALYZER] Analysis completed successfully`);
			logMessage(`[VISION_ANALYZER] Confidence: ${result.confidence}`);
			logMessage(`[VISION_ANALYZER] Tokens used: ${result.metadata.tokens_used}`);
			logMessage(`[VISION_ANALYZER] Cached: ${result.metadata.cached || false}`);

			const response = {
				success: true,
				analysis: result.analysis,
				confidence: result.confidence,
				analysisType: analysisType,
				metadata: {
					...result.metadata,
					screenshotPath: screenshotPath,
					timestamp: new Date().toISOString()
				}
			};

			return {
				content: [{
					type: 'text',
					text: JSON.stringify(response, null, 2)
				}]
			} as const;

		} catch (error: any) {
			logMessage(`[VISION_ANALYZER] Error: ${error?.message || error}`);
			console.error('[VISION_ANALYZER] Full error:', error);

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
			theme: z.enum([
				'3d', '420', 'ai', 'accessibility', 'advertising', 'agency', 'android-app', 'animation', 
				'architecture', 'art', 'audio', 'automotive', 'beauty', 'blog', 'book', 'branding', 
				'business', 'community', 'conference', 'construction', 'crypto', 'd2c', 'design', 
				'development', 'ecommerce', 'editorial', 'education', 'environmental', 'event', 
				'fashion', 'film', 'finance', 'fitness', 'food-drink', 'furniture', 'gaming', 
				'health', 'illustration', 'interior', 'landscaping', 'legal', 'logistics', 
				'macos-app', 'magazine', 'marketing', 'motion', 'movies', 'museum', 'music', 
				'news', 'personal', 'pets', 'photography', 'podcast', 'political', 'portfolio', 
				'productivity', 'real-estate', 'restaurant', 'retail', 'robotics', 'saas', 
				'science', 'security', 'social-media', 'sports', 'startup', 'studio', 
				'technology', 'television', 'travel', 'typography', 'venture-capital', 'video'
			]).describe('Project theme/category'),
			includeVisualAnalysis: z.boolean().default(true).describe('Whether to include screenshot capture and vision analysis'),
			includeTextualAnalysis: z.boolean().default(true).describe('Whether to include web crawling for textual content analysis'),
			customSites: z.array(z.string()).optional().describe('Optional custom inspiration sites to analyze in addition to auto-selected ones'),
			bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh analysis')
		}
	},
	async ({ theme, includeVisualAnalysis = true, includeTextualAnalysis = true, customSites = [], bypassCache = false }) => {
		const startTime = Date.now();
		
		function logWithTimestamp(msg: string): void {
			fs.appendFile('mcp-design-analyzer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => {});
		}
		
		logWithTimestamp(`[DESIGN_ANALYZER] Starting analysis for theme: ${theme}`);
		
		try {
			// Dynamic import to handle the new module
			const { DesignInspirationAnalyzer } = await import('./design-inspiration-analyzer.js');
			const { key: apiKey, source: keySource } = getApiKey();
			
			if (!apiKey) {
				throw new Error('No API key found. Please set OPENROUTER_API_KEY, OPENAI_API_KEY, or OPEN_ROUTER_API_KEY');
			}
			
			logWithTimestamp(`[DESIGN_ANALYZER] Using API key from: ${keySource}`);
			const analyzer = new DesignInspirationAnalyzer(apiKey);
			
			// Perform the complete analysis
			const result = await analyzer.analyzeDesignInspiration(theme, bypassCache);
			
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
							],
							screenshotDetails: {
								totalCaptured: result.consolidatedInsights.screenshots.totalCaptured,
								screenshotsByUrl: result.consolidatedInsights.screenshots.byUrl,
								analysisResults: result.consolidatedInsights.screenshots.analysisResults,
								availableForGeminiAnalysis: Object.keys(result.consolidatedInsights.screenshots.byUrl).length
							}
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

// Real-time validation tool for fix tasks - provides current error context
server.registerTool(
	'current_validation_status',
	{
		description: 'Get current validation errors for fix task context - use this to check what errors still need fixing',
		inputSchema: {
			syntaxOnly: z.boolean()
				.optional()
				.default(true)
				.describe('Whether to run syntax-only validation (faster)')
		}
	},
	async (args: any) => {
		try {
			const projectDir = process.env.CLONED_TEMPLATE_DIR || process.cwd();
			const syntaxOnly = args.syntaxOnly ?? true;
			
			console.error('[MCP_SERVER] Running current validation status check...');
			
			// Run validation on current project state
			const validation = await validateProject(projectDir, syntaxOnly);
			
			// Generate focused error report for immediate context
			const errorReport = generateErrorReport(validation, true); // isFixTask = true for focused format
			
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							isValid: validation.isValid,
							errorCount: validation.errors.length,
							warningCount: validation.warnings.length,
							fixableErrorCount: validation.fixableErrors.length,
							focusedErrorReport: errorReport,
							timestamp: new Date().toISOString()
						}, null, 2)
					}
				]
			} as const;
		} catch (error: any) {
			console.error('[MCP_SERVER] Validation status check failed:', error);
			
			return {
				content: [
					{
						type: 'text',
						text: `Validation status check failed: ${error?.message || error}`
					}
				]
			} as const;
		}
	}
);


async function main(): Promise<void> {
	console.error('[MCP_SERVER] Starting MCP server with tools:');
	console.error('- project_reset');
	console.error('- netlify_deploy');
	console.error('- color_palette_generator');
	console.error('- puppeteer_search');
	console.error('- ai_horde_image_generator');
	console.error('- web_crawler');
	console.error('- vision_analyzer');
	console.error('- design_inspiration_analyzer');
	console.error('- current_validation_status');
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
