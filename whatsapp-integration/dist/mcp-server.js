import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
const pptr = puppeteer;
import { deployToCodeSandbox } from './deploy-codesandbox.js';
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
server.registerTool('codesandbox_deploy', {
    description: 'Deploy the current project to CodeSandbox and return preview/editor URLs',
    inputSchema: {}
}, async (_args) => {
    const root = process.env.CLONED_TEMPLATE_DIR || process.cwd();
    const stat = await fs.stat(root).catch(() => null);
    if (!stat || !stat.isDirectory()) {
        return { content: [{ type: 'text', text: `Invalid deploy directory: ${root}. Set CLONED_TEMPLATE_DIR to the cloned template path or run the tool from that directory.` }] };
    }
    try {
        console.error(`[MCP_CODESANDBOX_DEPLOY] Creating sandbox from directory: ${root}`);
        const result = await deployToCodeSandbox(root);
        console.error(`[MCP_CODESANDBOX_DEPLOY] Sandbox created. editor=${result.editorUrl} preview=${result.previewUrl}`);
        return { content: [{ type: 'text', text: JSON.stringify({ editorUrl: result.editorUrl, previewUrl: result.previewUrl }) }] };
    }
    catch (err) {
        const msg = err?.message || String(err);
        console.error(`[MCP_CODESANDBOX_DEPLOY] Failed: ${msg}`);
        return { content: [{ type: 'text', text: `Instant deployment failed: ${msg}` }] };
    }
});
server.registerTool('puppeteer_search', {
    description: 'Search for various types of content using PUPPETEER',
    inputSchema: {
        searchTerm: z.string().describe('The search term to look for. Use only a single term in english to increase the chances of finding relevant content.'),
        searchType: z.enum(['images', 'videos', 'icons', 'vectors', 'vfx', 'music', 'fonts', 'animations']).default('images').describe('The type of content to search for')
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
    const searchType = args.searchType || 'images';
    logMessage('[MCP_PUPPETEER] Parsed searchTerm: ' + searchTerm);
    logMessage('[MCP_PUPPETEER] Parsed searchType: ' + searchType);
    if (!searchTerm) {
        return { content: [{ type: 'text', text: 'Error: No search term provided' }] };
    }
    let url = '';
    switch (searchType) {
        case 'videos':
            url = `https://www.pexels.com/search/videos/${encodeURIComponent(searchTerm)}`;
            break;
        case 'images':
            url = `https://unsplash.com/s/photos/${encodeURIComponent(searchTerm)}`;
            break;
        case 'animations':
            url = `https://creattie.com/all-items/${encodeURIComponent(searchTerm)}?type=all&orderBy=order&page=1`;
            break;
        case 'icons':
            url = `https://thenounproject.com/search/icons/?q=${encodeURIComponent(searchTerm)}`;
            break;
        case 'vectors':
            url = `https://www.freepik.com/search?format=search&last_filter=query&last_value=${encodeURIComponent(searchTerm)}&query=${encodeURIComponent(searchTerm)}`;
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
                return { content: [{ type: 'text', text: JSON.stringify({
                                searchType,
                                searchTerm,
                                source: 'Pexels API',
                                total_results: data.total_results,
                                results: results
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
            else if (searchType === 'images') {
                logMessage('[MCP_PUPPETEER] Extracting image content...');
                // Wait for image elements to load
                try {
                    await page.waitForSelector('img, a[href*=".jpg"], a[href*=".png"], .photo', { timeout: 20000 });
                }
                catch (e) {
                    logMessage('[MCP_PUPPETEER] Timeout waiting for image selectors, continuing anyway...');
                }
                // Extract image content
                contentData = await page.evaluate(() => {
                    const images = [];
                    console.log('[DEBUG] Current URL:', globalThis.location.href);
                    console.log('[DEBUG] Page title:', globalThis.document.title);
                    // Find all img elements with high-quality sources
                    const imgElements = globalThis.document.querySelectorAll('img[src*="images"], img[src*="photo"], img[data-src]');
                    console.log(`[DEBUG] Found ${imgElements.length} image elements`);
                    Array.from(imgElements).slice(0, 10).forEach((img, index) => {
                        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
                        const alt = img.alt || img.getAttribute('alt');
                        if (src && !src.includes('placeholder') && !src.includes('loading')) {
                            console.log(`[DEBUG] Image ${index + 1}: ${src}`);
                            images.push({
                                title: alt || `Image ${index + 1}`,
                                imageUrl: src,
                                thumbnailUrl: src,
                                source: 'extracted-image',
                                elementIndex: index
                            });
                        }
                    });
                    return images;
                });
            }
            else if (searchType === 'icons') {
                logMessage('[MCP_PUPPETEER] Extracting icon content...');
                // Extract icon/SVG content
                contentData = await page.evaluate(() => {
                    const icons = [];
                    // Look for SVG elements, icon links, or downloadable assets
                    const svgElements = globalThis.document.querySelectorAll('svg, a[href*=".svg"], [data-icon], .icon');
                    const downloadLinks = globalThis.document.querySelectorAll('a[href*="download"], a[download]');
                    console.log(`[DEBUG] Found ${svgElements.length} SVG/icon elements, ${downloadLinks.length} download links`);
                    Array.from(downloadLinks).slice(0, 10).forEach((link, index) => {
                        const href = link.href || link.getAttribute('href');
                        const text = link.textContent || link.innerText;
                        if (href && (href.includes('.svg') || href.includes('icon') || href.includes('download'))) {
                            console.log(`[DEBUG] Icon link ${index + 1}: ${href}`);
                            icons.push({
                                title: text || `Icon ${index + 1}`,
                                iconUrl: href,
                                downloadUrl: href,
                                source: 'extracted-icon',
                                elementIndex: index
                            });
                        }
                    });
                    return icons;
                });
            }
            else if (searchType === 'vectors') {
                logMessage('[MCP_PUPPETEER] Extracting vector content from Freepik...');
                // Extract vector content from Freepik
                contentData = await page.evaluate(() => {
                    const vectors = [];
                    // Look for Freepik-specific vector elements
                    const vectorElements = globalThis.document.querySelectorAll('a[href*="/vector/"], .resource, [data-resource]');
                    const downloadLinks = globalThis.document.querySelectorAll('a[href*="download"], .download-btn');
                    console.log(`[DEBUG] Found ${vectorElements.length} vector elements, ${downloadLinks.length} download links`);
                    Array.from(vectorElements).slice(0, 10).forEach((element, index) => {
                        const href = element.href || element.getAttribute('href');
                        const img = element.querySelector('img');
                        const title = element.getAttribute('title') || element.getAttribute('alt') || img?.alt;
                        if (href) {
                            console.log(`[DEBUG] Vector ${index + 1}: ${href}`);
                            vectors.push({
                                title: title || `Vector ${index + 1}`,
                                vectorUrl: href,
                                thumbnailUrl: img?.src,
                                source: 'freepik-vector',
                                elementIndex: index
                            });
                        }
                    });
                    return vectors;
                });
            }
            else if (searchType === 'vfx') {
                logMessage('[MCP_PUPPETEER] Extracting VFX content from ProductionCrate...');
                // Extract VFX content from ProductionCrate
                contentData = await page.evaluate(() => {
                    const vfxItems = [];
                    // Look for ProductionCrate-specific VFX elements
                    const vfxElements = globalThis.document.querySelectorAll('.product-item, .asset-item, a[href*="/vfx/"], a[href*="/effect/"]');
                    const downloadLinks = globalThis.document.querySelectorAll('a[href*="download"], .download');
                    console.log(`[DEBUG] Found ${vfxElements.length} VFX elements, ${downloadLinks.length} download links`);
                    Array.from(vfxElements).slice(0, 10).forEach((element, index) => {
                        const href = element.href || element.getAttribute('href');
                        const img = element.querySelector('img');
                        const title = element.querySelector('.title')?.textContent || img?.alt;
                        if (href) {
                            console.log(`[DEBUG] VFX ${index + 1}: ${href}`);
                            vfxItems.push({
                                title: title || `VFX ${index + 1}`,
                                vfxUrl: href,
                                thumbnailUrl: img?.src,
                                source: 'productioncrate-vfx',
                                elementIndex: index
                            });
                        }
                    });
                    return vfxItems;
                });
            }
            else if (searchType === 'music') {
                logMessage('[MCP_PUPPETEER] Extracting music content from Bensound...');
                // Extract music content from Bensound
                contentData = await page.evaluate(() => {
                    const musicItems = [];
                    // Look for Bensound-specific music elements
                    const musicElements = globalThis.document.querySelectorAll('.track, .song, a[href*="/music/"], a[href*=".mp3"]');
                    const downloadLinks = globalThis.document.querySelectorAll('a[href*="download"], .download-btn');
                    console.log(`[DEBUG] Found ${musicElements.length} music elements, ${downloadLinks.length} download links`);
                    Array.from(musicElements).slice(0, 10).forEach((element, index) => {
                        const href = element.href || element.getAttribute('href');
                        const title = element.querySelector('.title')?.textContent || element.textContent;
                        const duration = element.querySelector('.duration')?.textContent;
                        if (href) {
                            console.log(`[DEBUG] Music ${index + 1}: ${href}`);
                            musicItems.push({
                                title: title || `Music ${index + 1}`,
                                musicUrl: href,
                                duration: duration,
                                source: 'bensound-music',
                                elementIndex: index
                            });
                        }
                    });
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
            return { content: [{ type: 'text', text: JSON.stringify({
                            searchType,
                            searchTerm,
                            results: contentData.slice(0, 10),
                            totalFound: contentData.length,
                            source: 'puppeteer-extracted'
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
async function main() {
    console.error('[MCP_SERVER] Starting MCP server with tools:');
    console.error('- project_reset');
    console.error('- codesandbox_deploy');
    console.error('- PUPPETEER_search');
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
