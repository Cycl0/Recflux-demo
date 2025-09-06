import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import { promises as fs } from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
const pptr = puppeteer;
import { deployToNetlify } from './deploy-netlify.js';
import { getRedisCache } from './redis-cache.js';
import { GeminiVisionAnalyzer, GeminiDesignPrompts } from './gemini-vision-integration.js';
// Minimal MCP server exposing project_reset and CodeSandbox deployment only.
const server = new McpServer({ name: 'recflux-deployer', version: '1.0.0' }, { capabilities: { tools: {} } });
server.registerTool('project_reset', {
    description: 'Reset the project directory',
    inputSchema: {}
}, async (_args) => {
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
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true, projectDir, templateDir }) }] };
    }
    catch (e) {
        return { content: [{ type: 'text', text: `project_reset error: ${e?.message || e}. Template dir: ${templateDir}` }] };
    }
});
server.registerTool('netlify_deploy', {
    description: 'Deploy the current project to Netlify and return preview/admin URLs',
    inputSchema: {}
}, async (_args) => {
    const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
    const stat = await fs.stat(root).catch(() => null);
    if (!stat || !stat.isDirectory()) {
        return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] };
    }
    try {
        console.error(`[MCP_NETLIFY_DEPLOY] Creating Netlify site from directory: ${root}`);
        const result = await deployToNetlify(root);
        console.error(`[MCP_NETLIFY_DEPLOY] Netlify site created. dashboard=${result.adminUrl} preview=${result.previewUrl}`);
        return { content: [{ type: 'text', text: JSON.stringify({ adminUrl: result.adminUrl, previewUrl: result.previewUrl }) }] };
    }
    catch (err) {
        const msg = err?.message || String(err);
        console.error(`[MCP_NETLIFY_DEPLOY] Failed: ${msg}`);
        return { content: [{ type: 'text', text: `Instant deployment failed: ${msg}` }] };
    }
});
server.registerTool('color_palette_generator', {
    description: 'Generate color palettes using Huemint AI API for design projects',
    inputSchema: {
        mode: z.enum(['transformer', 'diffusion', 'random']).default('transformer').describe('Generation mode - transformer (smart AI), diffusion (artistic), or random'),
        numColors: z.number().min(2).max(12).default(3).describe('Number of colors in palette (2-12)'),
        temperature: z.number().min(0).max(2.4).default(1.2).describe('Creativity level (0-2.4, higher = more creative)'),
        baseColors: z.array(z.string()).optional().describe('Optional base colors as hex codes (e.g. ["#FF0000", "#00FF00"])')
    }
}, async (args) => {
    const logMessage = (msg) => {
        console.error(msg);
        fs.appendFile('mcp-color-palette.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
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
            }
            else {
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
        }
        else {
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
        const data = await response.json();
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
        return { content: [{ type: 'text', text: JSON.stringify(formattedResult, null, 2) }] };
    }
    catch (error) {
        logMessage('[MCP_COLOR_PALETTE] Error: ' + (error?.message || error));
        return { content: [{ type: 'text', text: `Color palette generation failed: ${error?.message || error}` }] };
    }
});
server.registerTool('puppeteer_search', {
    description: 'Search for various types of content using PUPPETEER',
    inputSchema: {
        searchTerm: z.string().describe('The search term to look for. Use only a single term in english to increase the chances of finding relevant content.'),
        searchType: z.enum(['videos', 'icons', 'vectors', 'vfx', 'music', 'animations']).default('videos').describe('The type of content to search for'),
        theme: z.string().describe('Project theme for caching results (e.g., ecommerce, portfolio, saas)'),
        bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh search')
    }
}, async (args) => {
    const logMessage = (msg) => {
        console.error(msg);
        fs.appendFile('mcp-puppeteer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
    };
    console.error('[MCP_PUPPETEER] *** TOOL CALLED! ***');
    logMessage('[MCP_PUPPETEER] *** TOOL CALLED! ***');
    logMessage('[MCP_PUPPETEER] Called with args: ' + JSON.stringify(args));
    logMessage('[MCP_PUPPETEER] Args keys: ' + JSON.stringify(Object.keys(args || {})));
    // Using Puppeteer (with stealth + proxy rotation) for all content extraction
    const searchTerm = args.searchTerm || '';
    const searchType = args.searchType || 'videos';
    const theme = args.theme;
    const bypassCache = args.bypassCache || false;
    logMessage('[MCP_PUPPETEER] Parsed searchTerm: ' + searchTerm);
    logMessage('[MCP_PUPPETEER] Parsed searchType: ' + searchType);
    logMessage('[MCP_PUPPETEER] Parsed theme: ' + theme);
    logMessage('[MCP_PUPPETEER] Parsed bypassCache: ' + bypassCache);
    if (!searchTerm) {
        return { content: [{ type: 'text', text: 'Error: No search term provided' }] };
    }
    if (!theme) {
        return { content: [{ type: 'text', text: 'Error: No theme provided' }] };
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
                let results = [];
                if (searchType === 'videos' && cachedResults.scrapedData.videos) {
                    results = cachedResults.scrapedData.videos.map(v => ({
                        title: `Video from cache`,
                        videoUrl: v.src,
                        thumbnailUrl: v.thumbnail,
                        type: v.type
                    }));
                }
                else if (searchType === 'images' && cachedResults.scrapedData.images) {
                    results = cachedResults.scrapedData.images.map(img => ({
                        title: img.alt || 'Image from cache',
                        src: img.src,
                        type: img.type
                    }));
                }
                else if (searchType === 'icons' && cachedResults.scrapedData.icons) {
                    results = cachedResults.scrapedData.icons.map(icon => ({
                        title: 'Icon from cache',
                        src: icon.src,
                        type: icon.type,
                        size: icon.size
                    }));
                }
                else if (searchType === 'vectors' && cachedResults.scrapedData.vectors) {
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
                            }, null, 2) }] };
            }
            else {
                logMessage(`[MCP_PUPPETEER] Cache miss, proceeding with fresh search for: ${searchType}:${searchTerm}`);
            }
        }
        catch (cacheError) {
            logMessage(`[MCP_PUPPETEER] Cache check failed: ${cacheError}. Proceeding with fresh search.`);
        }
    }
    else {
        logMessage(`[MCP_PUPPETEER] Cache bypass requested for: ${searchType}:${searchTerm}`);
    }
    try {
        // Use Pexels API for videos only, PUPPETEER for all other content types including images
        if (searchType === 'videos') {
            logMessage(`[MCP_PUPPETEER] Using Pexels API for ${searchType}`);
            const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
            if (PEXELS_API_KEY) {
                const apiUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchTerm)}&per_page=3`;
                logMessage(`[MCP_PUPPETEER] Calling Pexels API: ${apiUrl}`);
                const headers = { 'Authorization': PEXELS_API_KEY };
                const response = await fetch(apiUrl, { headers });
                if (!response.ok) {
                    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
                }
                const data = (await response.json());
                logMessage(`[MCP_PUPPETEER] Pexels API returned ${data.total_results} results`);
                const results = data.videos?.map((video) => ({
                    title: video.user?.name ? `Video by ${video.user.name}` : 'Untitled Video',
                    url: video.url,
                    preview_url: video.video_files?.[0]?.link || video.url,
                    thumbnail: video.image,
                    width: video.width,
                    height: video.height,
                    duration: video.duration,
                    type: 'video'
                })) || [];
                // Cache the results
                try {
                    logMessage(`[MCP_PUPPETEER] Caching Pexels API results for theme: ${theme}`);
                    await cache.setPuppeteerResults(theme, `${searchType}:${searchTerm}`, {
                        scrapedData: {
                            videos: results.map(r => ({ src: r.preview_url, type: r.type, thumbnail: r.thumbnail })),
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
                            userAgent: 'Pexels API',
                            viewport: { width: 0, height: 0 },
                            loadTime: 0,
                            elementsFound: results.length
                        },
                        ttl: 259200 // 3 days
                    });
                }
                catch (cacheError) {
                    logMessage(`[MCP_PUPPETEER] Failed to cache Pexels results: ${cacheError}`);
                }
                return { content: [{ type: 'text', text: JSON.stringify({
                                searchType,
                                searchTerm,
                                source: 'Pexels API',
                                total_results: data.total_results,
                                results: results,
                                cached: false
                            }, null, 2) }] };
            }
            else {
                logMessage('[MCP_PUPPETEER] No Pexels API key found; falling back to PUPPETEER scraping');
            }
        }
        // Use Puppeteer to scrape other content types
        logMessage(`[MCP_PUPPETEER] Using Puppeteer to scrape ${searchType} from: ${url}`);
        // Configure stealth and proxy
        pptr.use(StealthPlugin());
        const collectProxies = () => {
            const proxies = [];
            for (let i = 1; i <= 50; i++) {
                const v = process.env[`PROXY_${i}`];
                if (v && v.trim())
                    proxies.push(v.trim());
            }
            return proxies;
        };
        const pickProxy = () => {
            const list = collectProxies();
            if (!list.length)
                return {};
            const raw = list[Math.floor(Math.random() * list.length)];
            try {
                const u = new URL(raw);
                const server = `${u.protocol}//${u.hostname}:${u.port}`;
                return { server, username: decodeURIComponent(u.username || ''), password: decodeURIComponent(u.password || ''), raw };
            }
            catch {
                return { raw };
            }
        };
        const proxy = pickProxy();
        logMessage(`[MCP_PUPPETEER] Proxy selected: ${proxy.server || 'none'} (raw=${proxy.raw ? 'yes' : 'no'})`);
        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ];
        if (proxy.server)
            launchArgs.push(`--proxy-server=${proxy.server}`);
        const browser = await pptr.launch({
            headless: true,
            args: launchArgs,
            executablePath: '/usr/bin/google-chrome-stable'
        });
        try {
            const page = await browser.newPage();
            if (proxy.username) {
                try {
                    await page.authenticate({ username: proxy.username, password: proxy.password || '' });
                }
                catch { }
            }
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
            await page.setUserAgent(userAgent);
            await page.setViewport({
                width: Math.floor(1024 + Math.random() * 120),
                height: Math.floor(768 + Math.random() * 120)
            });
            // Capture console output from page.evaluate
            page.on('console', (msg) => {
                logMessage('[MCP_PUPPETEER] Browser console: ' + msg.text());
            });
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            }
            catch (e) {
                logMessage('[MCP_PUPPETEER] Initial navigation failed, retrying with networkidle2');
                try {
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
                }
                catch { }
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
            let contentData = [];
            if (searchType === 'videos') {
                logMessage('[MCP_PUPPETEER] Extracting video content...');
                // Wait for video elements to load
                try {
                    await page.waitForSelector('video, a[href*="/video/"], .video', { timeout: 30000 });
                }
                catch (e) {
                    logMessage('[MCP_PUPPETEER] Timeout waiting for video selectors, continuing anyway...');
                }
                // Extract video content
                contentData = await page.evaluate(() => {
                    const videos = [];
                    // Log current page info for debugging
                    const currentUrl = globalThis.location.href;
                    const title = globalThis.document.title;
                    console.log('[DEBUG] Current URL:', currentUrl);
                    console.log('[DEBUG] Page title:', title);
                    // Log page statistics
                    const allLinks = globalThis.document.querySelectorAll('a');
                    const allImages = globalThis.document.querySelectorAll('img');
                    const allDivs = globalThis.document.querySelectorAll('div');
                    console.log(`[DEBUG] Page stats: ${allLinks.length} links, ${allImages.length} images, ${allDivs.length} divs`);
                    // Look for Pexels-specific video links and elements
                    const pexelsVideoLinks = globalThis.document.querySelectorAll('a[href*="/video/"]');
                    const videoCards = globalThis.document.querySelectorAll('[data-testid*="video"], .video-card, [class*="video"]');
                    console.log(`[DEBUG] Pexels video links: ${pexelsVideoLinks.length}, video cards: ${videoCards.length}`);
                    // Find all <video> elements on the page
                    const videoElements = globalThis.document.querySelectorAll('video');
                    console.log(`[DEBUG] Found ${videoElements.length} actual video elements`);
                    Array.from(videoElements).forEach((video, index) => {
                        const src = video.src || video.getAttribute('src');
                        const poster = video.poster || video.getAttribute('poster');
                        const controls = video.controls;
                        const autoplay = video.autoplay;
                        // Also check for source elements inside video
                        const sources = video.querySelectorAll('source');
                        const sourceSrcs = [];
                        Array.from(sources).forEach((source) => {
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
                    const elementsWithVideoData = globalThis.document.querySelectorAll('[data-video-src], [data-src*="mp4"], [data-src*="webm"], [data-src*="video"]');
                    console.log(`[DEBUG] Found ${elementsWithVideoData.length} elements with video data attributes`);
                    Array.from(elementsWithVideoData).forEach((element, index) => {
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
                    Array.from(pexelsVideoLinks).slice(0, 10).forEach((link, index) => {
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
                                    `https://vod-progressive.akamaized.net/exp=${Math.floor(Date.now() / 1000) + 3600}~acl=%2F*~hmac=placeholder/vimeo-prod-skyfire-std-us/01/${videoId}/0/file.mp4`,
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
            }
            else if (searchType === 'animations') {
                logMessage('[MCP_PUPPETEER] Extracting animation content...');
                // Extract animation content
                contentData = await page.evaluate(() => {
                    const animations = [];
                    // Look for animation elements
                    const animationElements = globalThis.document.querySelectorAll('video');
                    console.log(`[DEBUG] Found ${animationElements.length} animation elements`);
                    Array.from(animationElements).forEach((element, index) => {
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
            }
            else if (searchType === 'icons') {
                logMessage('[MCP_PUPPETEER] Extracting icon content...');
                // Extract icon/SVG content
                contentData = await page.evaluate(() => {
                    const icons = [];
                    // Look for various icon selectors on Noun Project
                    const iconElements = globalThis.document.querySelectorAll('img[src*="icon"], img[src*="svg"], .icon img, [data-testid*="icon"] img, .search-result img');
                    console.log(`[DEBUG] Found ${iconElements.length} potential icon elements`);
                    Array.from(iconElements).slice(0, 15).forEach((element, index) => {
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
            }
            else if (searchType === 'vectors') {
                logMessage('[MCP_PUPPETEER] Extracting vector content from Freepik...');
                // Extract vector content from Freepik
                contentData = await page.evaluate(() => {
                    const vectors = [];
                    // Look for Freepik-specific vector elements
                    const vectorElements = globalThis.document.querySelectorAll('img[src*="freepik"], img[src*="vector"], .resource img, [data-testid*="resource"] img, .figure img');
                    console.log(`[DEBUG] Found ${vectorElements.length} potential vector elements`);
                    Array.from(vectorElements).slice(0, 15).forEach((element, index) => {
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
            }
            else if (searchType === 'vfx') {
                logMessage('[MCP_PUPPETEER] Extracting VFX content from ProductionCrate...');
                // Extract VFX content from ProductionCrate
                contentData = await page.evaluate(() => {
                    const vfxItems = [];
                    // Look for ProductionCrate-specific VFX elements
                    const vfxElements = globalThis.document.querySelectorAll('video, .vfx-item video, .product video, [data-video-src], img[src*="vfx"], img[src*="effect"]');
                    console.log(`[DEBUG] Found ${vfxElements.length} potential VFX elements`);
                    Array.from(vfxElements).slice(0, 15).forEach((element, index) => {
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
                        }
                        else if (element.tagName === 'IMG') {
                            thumbnailSrc = element.src;
                            // Try to find associated video
                            const videoElement = element.closest('.product, .vfx-item')?.querySelector('video');
                            videoSrc = videoElement ? (videoElement.src || videoElement.querySelector('source')?.src) : null;
                        }
                        else {
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
            }
            else if (searchType === 'music') {
                logMessage('[MCP_PUPPETEER] Extracting music content from Bensound...');
                // Extract music content from Bensound using the correct selectors
                contentData = await page.evaluate(() => {
                    const musicItems = [];
                    // Find all music blocks (bloc_produit or bloc_produit1)
                    const musicBlocks = globalThis.document.querySelectorAll('.bloc_produit, .bloc_produit1');
                    console.log(`[DEBUG] Found ${musicBlocks.length} music blocks on Bensound`);
                    Array.from(musicBlocks).forEach((block, index) => {
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
                        }
                        catch (e) {
                            console.log(`[DEBUG] Error processing music block ${index}: ${e}`);
                        }
                    });
                    console.log(`[DEBUG] Extracted ${musicItems.length} music items from Bensound`);
                    return musicItems;
                });
            }
            else {
                logMessage(`[MCP_PUPPETEER] Extracting general content for ${searchType}...`);
                // General content extraction
                contentData = await page.evaluate((searchType) => {
                    const content = [];
                    // Look for download links, media files, or relevant content
                    const mediaLinks = globalThis.document.querySelectorAll('a[href*=".mp4"], a[href*=".mp3"], a[href*=".zip"], a[href*="download"], a[download]');
                    console.log(`[DEBUG] Found ${mediaLinks.length} media/download links for ${searchType}`);
                    Array.from(mediaLinks).slice(0, 8).forEach((link, index) => {
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
                    videos: searchType === 'videos' ? contentData.slice(0, 10).map((item) => ({
                        src: item.videoUrl || item.src || '',
                        type: item.type || 'video',
                        thumbnail: item.thumbnailUrl || item.thumbnail
                    })) : [],
                    images: searchType === 'images' ? contentData.slice(0, 10).map((item) => ({
                        src: item.src || '',
                        alt: item.title || '',
                        type: item.type || 'image'
                    })) : [],
                    icons: searchType === 'icons' ? contentData.slice(0, 10).map((item) => ({
                        src: item.src || '',
                        type: item.type || 'icon',
                        size: item.size
                    })) : [],
                    vectors: searchType === 'vectors' ? contentData.slice(0, 10).map((item) => ({
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
            }
            catch (cacheError) {
                logMessage(`[MCP_PUPPETEER] Failed to cache Puppeteer results: ${cacheError}`);
            }
            return { content: [{ type: 'text', text: JSON.stringify({
                            ...puppeteerResults,
                            cached: false
                        }, null, 2) }] };
        }
        finally {
            // Always close the browser to free up the session
            await browser.close();
        }
    }
    catch (error) {
        logMessage('[MCP_PUPPETEER] General error: ' + (error?.message || error));
        return { content: [{ type: 'text', text: `Content extraction failed: ${error?.message || error}` }] };
    }
});
// Freepik AI Image Generation Tool
server.registerTool('freepik_ai_image_generator', {
    description: 'Generate images using Freepik AI text-to-image with flux-dev model',
    inputSchema: {
        prompt: z.string().describe('The text prompt to generate an image from'),
        htmlContext: z.string().describe('REQUIRED: The HTML/component structure where this image will be placed (for contextual analysis). Must include titles, descriptions, and surrounding context.'),
        componentContext: z.string().optional().describe('Description of the component/use case where this image will be used (e.g., "hero section for a travel website", "card image for a restaurant app")'),
        imageRole: z.string().optional().describe('Specific role of the image (e.g., "background", "icon", "illustration", "photo", "avatar")'),
        aspect_ratio: z.enum(['square_1_1', 'classic_4_3', 'traditional_3_4', 'widescreen_16_9', 'social_story_9_16', 'standard_3_2', 'portrait_2_3', 'horizontal_2_1', 'vertical_1_2']).default('square_1_1').optional().describe('Aspect ratio of the generated image'),
        num_images: z.number().min(1).max(4).default(1).optional().describe('Number of images to generate (1-4)'),
        seed: z.number().min(1).max(4294967295).optional().describe('Seed for reproducible generation'),
        bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh image generation')
    }
}, async (args) => {
    const logMessage = (msg) => {
        console.error(msg);
        fs.appendFile('mcp-freepik-ai-image-generator.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
    };
    logMessage('[FREEPIK_AI] *** TOOL CALLED! ***');
    logMessage('[FREEPIK_AI] Called with args: ' + JSON.stringify(args));
    logMessage('[FREEPIK_AI] Args keys: ' + JSON.stringify(Object.keys(args || {})));
    try {
        const freepikApiKey = process.env.FREEPIK_API_KEY;
        if (!freepikApiKey) {
            return { content: [{ type: 'text', text: 'Error: Freepik API key not configured' }] };
        }
        const prompt = args.prompt || '';
        const htmlContext = args.htmlContext || '';
        const componentContext = args.componentContext || '';
        const imageRole = args.imageRole || '';
        const aspectRatio = args.aspect_ratio || 'square_1_1';
        const numImages = args.num_images || 1;
        const seed = args.seed || Math.floor(Math.random() * 4294967295);
        const bypassCache = args.bypassCache || false;
        if (!prompt) {
            return { content: [{ type: 'text', text: 'Error: No prompt provided' }] };
        }
        if (!htmlContext) {
            return { content: [{ type: 'text', text: 'Error: HTML context is required for contextual image generation. Please provide the HTML/component structure where this image will be placed.' }] };
        }
        // Initialize Redis cache and check for cached results
        const cache = getRedisCache();
        if (!bypassCache) {
            try {
                await cache.connect();
                logMessage(`[FREEPIK_AI] Checking cache for prompt: ${prompt.substring(0, 50)}...`);
                const cachedResults = await cache.getImageGenerationResults(prompt);
                if (cachedResults) {
                    logMessage(`[FREEPIK_AI] Cache hit! Using cached image for prompt: ${prompt.substring(0, 50)}...`);
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
                                    model: 'freepik-flux-dev',
                                    hosting: 'Freepik CDN',
                                    aspectRatio: cachedResults.metadata.aspectRatio,
                                    seed: cachedResults.metadata.seed,
                                    taskId: cachedResults.metadata.taskId,
                                    cached: true,
                                    timestamp: cachedResults.timestamp
                                }, null, 2)
                            }]
                    };
                }
                else {
                    logMessage(`[FREEPIK_AI] Cache miss, proceeding with fresh generation for: ${prompt.substring(0, 50)}...`);
                }
            }
            catch (cacheError) {
                logMessage(`[FREEPIK_AI] Cache check failed: ${cacheError}. Proceeding with fresh generation.`);
            }
        }
        else {
            logMessage(`[FREEPIK_AI] Cache bypass requested for prompt: ${prompt.substring(0, 50)}...`);
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
        const response = await axios.post('https://api.freepik.com/v1/ai/text-to-image/flux-dev', requestBody, {
            headers: {
                'x-freepik-api-key': freepikApiKey,
                'Content-Type': 'application/json'
            }
        });
        logMessage('[FREEPIK_AI] API returned status: ' + response.status);
        if (response.status === 200 || response.status === 202) {
            logMessage('[FREEPIK_AI] Image generation request submitted successfully');
            logMessage(`[FREEPIK_AI] Response data: ${JSON.stringify(response.data)}`);
            // Freepik returns a task_id for async processing
            const taskId = response.data?.data?.task_id;
            if (!taskId) {
                return { content: [{ type: 'text', text: 'Error: No task ID returned from Freepik API' }] };
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
                    const statusResponse = await axios.get(`https://api.freepik.com/v1/ai/text-to-image/flux-dev/${taskId}`, {
                        headers: {
                            'x-freepik-api-key': freepikApiKey
                        }
                    });
                    logMessage(`[FREEPIK_AI] Status check ${attempts}: ${statusResponse.data?.data?.status}`);
                    logMessage(`[FREEPIK_AI] Full status response: ${JSON.stringify(statusResponse.data)}`);
                    if (statusResponse.data?.data?.status === 'COMPLETED' && statusResponse.data?.data?.generated?.length > 0) {
                        allGeneratedImages = statusResponse.data.data.generated;
                        imageUrl = allGeneratedImages[0];
                        logMessage(`[FREEPIK_AI] Generated ${allGeneratedImages.length} images`);
                        logMessage(`[FREEPIK_AI] All image URLs: ${JSON.stringify(allGeneratedImages)}`);
                        logMessage(`[FREEPIK_AI] First image URL: ${imageUrl}`);
                        break;
                    }
                    else if (statusResponse.data?.data?.status === 'FAILED') {
                        logMessage(`[FREEPIK_AI] Image generation failed: ${statusResponse.data?.data?.error || 'Unknown error'}`);
                        return { content: [{ type: 'text', text: `Image generation failed: ${statusResponse.data?.data?.error || 'Unknown error'}` }] };
                    }
                }
                catch (statusError) {
                    logMessage(`[FREEPIK_AI] Status check error: ${statusError?.message || statusError}`);
                }
            }
            if (!imageUrl) {
                return { content: [{ type: 'text', text: 'Error: Image generation timed out or failed' }] };
            }
            // Return the direct Freepik URL - no need for additional upload
            const timestamp = Date.now();
            const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
            const filename = `freepik_${sanitizedPrompt}_${timestamp}.jpg`;
            logMessage(`[FREEPIK_AI] Image generation completed successfully!`);
            logMessage(`[FREEPIK_AI] Direct image URL: ${imageUrl}`);
            // Cache the results for future use
            try {
                logMessage(`[FREEPIK_AI] Caching image generation results for prompt: ${prompt.substring(0, 50)}...`);
                await cache.setImageGenerationResults(prompt, {
                    imageUrl: imageUrl,
                    allImages: allGeneratedImages,
                    metadata: {
                        aspectRatio: aspectRatio,
                        seed: seed,
                        taskId: taskId,
                        model: 'freepik-flux-dev',
                        generatedAt: new Date().toISOString()
                    },
                    ttl: 2592000 // 30 days
                });
            }
            catch (cacheError) {
                logMessage(`[FREEPIK_AI] Failed to cache image generation results: ${cacheError}`);
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
                            model: 'freepik-flux-dev',
                            hosting: 'Freepik CDN',
                            aspectRatio: aspectRatio,
                            seed: seed,
                            taskId: taskId,
                            cached: false
                        }, null, 2)
                    }]
            };
        }
        else {
            console.error('[FREEPIK_AI] API returned error:', response.status, response.statusText);
            return { content: [{ type: 'text', text: `Error: Freepik API returned ${response.status}` }] };
        }
    }
    catch (error) {
        console.error('[FREEPIK_AI] Error generating image:', error?.message || error);
        logMessage(`[FREEPIK_AI] Full error details: ${JSON.stringify({
            message: error?.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data
        })}`);
        return { content: [{ type: 'text', text: `Image generation failed: ${error?.message || error}` }] };
    }
});
// Web Crawler Tool using native Crawl4AI CLI
server.registerTool('web_crawler', {
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
}, async (args) => {
    const logMessage = (msg) => {
        console.error(msg);
        fs.appendFile('mcp-crawl4ai-cli.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
    };
    logMessage('[CRAWL4AI_CLI] *** TOOL CALLED! ***');
    logMessage('[CRAWL4AI_CLI] Called with args: ' + JSON.stringify(args));
    try {
        const { url, outputFormat = 'markdown', deepCrawl = false, deepCrawlStrategy = 'bfs', maxPages = 5, cssSelector, extractionQuery, userAgent, timeout = 30, bypassCache = false } = args;
        // Initialize Redis cache
        const cache = getRedisCache();
        // Try to connect to Redis (non-blocking)
        try {
            await cache.connect();
        }
        catch (redisError) {
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
                };
            }
            else {
                logMessage(`[CRAWL4AI_CLI] Cache miss, proceeding with fresh crawl for: ${url}`);
            }
        }
        else {
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
                try {
                    crwlProcess.kill('SIGTERM');
                }
                catch { }
                setTimeout(() => { try {
                    crwlProcess.kill('SIGKILL');
                }
                catch { } }, 5000);
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
                            }
                            else {
                                logMessage(`[CRAWL4AI_CLI] Failed to cache result for: ${url}`);
                            }
                        }
                        catch (cacheError) {
                            logMessage(`[CRAWL4AI_CLI] Error caching result: ${cacheError}`);
                        }
                    }
                    resolve({
                        content: [{
                                type: 'text',
                                text: JSON.stringify(result, null, 2)
                            }]
                    });
                }
                else {
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
                    });
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
                });
            });
        });
    }
    catch (error) {
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
        };
    }
});
// Gemini 2.0 Flash Vision Tool for Website Design Analysis
server.registerTool('gemini_vision_analyzer', {
    description: 'Analyze website screenshots using Gemini 2.5 Flash for design inspiration extraction',
    inputSchema: {
        screenshotPath: z.string().describe('Path to the screenshot file to analyze'),
        analysisType: z.enum(['full', 'color', 'layout', 'component']).default('full').describe('Type of analysis to perform'),
        customPrompt: z.string().optional().describe('Optional custom prompt for specific analysis needs'),
        bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh analysis')
    }
}, async (args) => {
    const logMessage = (msg) => {
        console.error(msg);
        fs.appendFile('mcp-gemini-vision.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
    };
    logMessage('[GEMINI_VISION] *** TOOL CALLED! ***');
    logMessage('[GEMINI_VISION] Called with args: ' + JSON.stringify(args));
    const { screenshotPath, analysisType = 'full', customPrompt, bypassCache = false } = args;
    if (!screenshotPath) {
        return { content: [{ type: 'text', text: 'Error: No screenshot path provided' }] };
    }
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    logMessage(`[GEMINI_VISION] API Key found: ${openRouterApiKey ? 'YES' : 'NO'}`);
    logMessage(`[GEMINI_VISION] API Key length: ${openRouterApiKey?.length || 0}`);
    logMessage(`[GEMINI_VISION] API Key starts with: ${openRouterApiKey?.substring(0, 20) || 'N/A'}...`);
    if (!openRouterApiKey) {
        return { content: [{ type: 'text', text: 'Error: OPENROUTER_API_KEY environment variable is required' }] };
    }
    try {
        // Initialize Gemini Vision Analyzer
        const analyzer = new GeminiVisionAnalyzer(openRouterApiKey);
        // Select appropriate prompt
        let prompt = customPrompt;
        if (!prompt) {
            switch (analysisType) {
                case 'full':
                    prompt = GeminiDesignPrompts.fullAnalysis;
                    break;
                case 'color':
                    prompt = GeminiDesignPrompts.colorAnalysis;
                    break;
                case 'layout':
                    prompt = GeminiDesignPrompts.layoutAnalysis;
                    break;
                case 'component':
                    prompt = GeminiDesignPrompts.componentAnalysis;
                    break;
                default: prompt = GeminiDesignPrompts.fullAnalysis;
            }
        }
        logMessage(`[GEMINI_VISION] Using analysis type: ${analysisType}`);
        logMessage(`[GEMINI_VISION] Screenshot path: ${screenshotPath}`);
        logMessage(`[GEMINI_VISION] Bypass cache: ${bypassCache}`);
        // Analyze screenshot using the GeminiVisionAnalyzer with caching
        const result = await analyzer.analyzeScreenshot({
            screenshotPath,
            prompt,
            bypassCache,
            analysisType
        });
        logMessage(`[GEMINI_VISION] Analysis completed successfully`);
        logMessage(`[GEMINI_VISION] Confidence: ${result.confidence}`);
        logMessage(`[GEMINI_VISION] Tokens used: ${result.metadata.tokens_used}`);
        logMessage(`[GEMINI_VISION] Cached: ${result.metadata.cached || false}`);
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
        };
    }
    catch (error) {
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
        };
    }
});
// Design Inspiration Analyzer - Complete Workflow Tool
server.registerTool('design_inspiration_analyzer', {
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
        includeVisualAnalysis: z.boolean().default(true).describe('Whether to include screenshot capture and Gemini vision analysis'),
        includeTextualAnalysis: z.boolean().default(true).describe('Whether to include web crawling for textual content analysis'),
        customSites: z.array(z.string()).optional().describe('Optional custom inspiration sites to analyze in addition to auto-selected ones'),
        bypassCache: z.boolean().default(false).optional().describe('Bypass Redis cache and force fresh analysis')
    }
}, async ({ theme, includeVisualAnalysis = true, includeTextualAnalysis = true, customSites = [], bypassCache = false }) => {
    const startTime = Date.now();
    function logWithTimestamp(msg) {
        fs.appendFile('mcp-design-analyzer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
    }
    logWithTimestamp(`[DESIGN_ANALYZER] Starting analysis for theme: ${theme}`);
    logWithTimestamp(`[DESIGN_ANALYZER] Environment check - OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET'}`);
    logWithTimestamp(`[DESIGN_ANALYZER] Environment check - OPEN_ROUTER_API_KEY: ${process.env.OPEN_ROUTER_API_KEY ? 'SET' : 'NOT SET'}`);
    try {
        logWithTimestamp(`[DESIGN_ANALYZER] About to import DesignInspirationAnalyzer...`);
        // Dynamic import to handle the new module
        const { DesignInspirationAnalyzer } = await import('./design-inspiration-analyzer.js');
        logWithTimestamp(`[DESIGN_ANALYZER] Import successful, creating analyzer instance...`);
        const analyzer = new DesignInspirationAnalyzer(process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY);
        logWithTimestamp(`[DESIGN_ANALYZER] Analyzer instance created successfully`);
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
                            selectedSites: result.sites.map((site) => ({
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
        };
    }
    catch (error) {
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
        };
    }
});
async function main() {
    console.error('[MCP_SERVER] Starting MCP server with tools:');
    console.error('- project_reset');
    console.error('- netlify_deploy');
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
    }
    catch (error) {
        console.error('[MCP_SERVER] Connection failed:', error);
        throw error;
    }
}
void main();
