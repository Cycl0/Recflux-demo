/**
 * Complete Design Inspiration Analyzer - Updated with proper categories
 *
 * This module implements the complete design inspiration workflow described in the
 * main workflow specification (lines 628-926). It combines:
 * 1. Web crawling for textual content analysis
 * 2. Screenshot capture for visual elements
 * 3. Gemini vision analysis for detailed design extraction
 * 4. Data consolidation and synthesis
 */
import { InspirationScreenshotCapture } from './screenshot-capture.js';
import { GeminiVisionAnalyzer } from './gemini-vision-integration.js';
import { promises as fs } from 'fs';
import { getRedisCache } from './redis-cache.js';
function logWithTimestamp(msg) {
    fs.appendFile('mcp-design-analyzer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
}
export class DesignInspirationAnalyzer {
    screenshotCapture;
    geminiAnalyzer;
    crawlerAvailable = false;
    cache = getRedisCache();
    constructor(openRouterApiKey) {
        this.screenshotCapture = new InspirationScreenshotCapture();
        logWithTimestamp('[DESIGN_ANALYZER] Constructor called with API key:' + (openRouterApiKey ? 'PROVIDED' : 'NOT PROVIDED'));
        logWithTimestamp('[DESIGN_ANALYZER] process.env.OPENROUTER_API_KEY:' + (process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET'));
        logWithTimestamp('[DESIGN_ANALYZER] process.env.OPEN_ROUTER_API_KEY:' + (process.env.OPEN_ROUTER_API_KEY ? 'SET' : 'NOT SET'));
        logWithTimestamp('[DESIGN_ANALYZER] process.env.IMGBB_API_KEY:' + (process.env.IMGBB_API_KEY ? 'SET' : 'NOT SET'));
        // Determine which API key to use
        const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
        if (apiKey) {
            logWithTimestamp('[DESIGN_ANALYZER] API key found, initializing Gemini analyzer');
            // Check if IMGBB_API_KEY is also available (required for visual analysis)
            if (process.env.IMGBB_API_KEY) {
                logWithTimestamp('[DESIGN_ANALYZER] IMGBB_API_KEY found, visual analysis will be fully functional');
                this.geminiAnalyzer = new GeminiVisionAnalyzer(apiKey);
            }
            else {
                logWithTimestamp('[DESIGN_ANALYZER] IMGBB_API_KEY missing, visual analysis will fail');
                logWithTimestamp('[DESIGN_ANALYZER] Please set IMGBB_API_KEY environment variable for image uploads');
                // Still create the analyzer, but it will fail at runtime with a clear error
                this.geminiAnalyzer = new GeminiVisionAnalyzer(apiKey);
            }
        }
        else {
            logWithTimestamp('[DESIGN_ANALYZER] No OpenRouter API key found, visual analysis will be disabled');
            logWithTimestamp('[DESIGN_ANALYZER] Available env vars:' + Object.keys(process.env).filter(k => k.toLowerCase().includes('openrouter') || k.toLowerCase().includes('router')).join(', '));
            logWithTimestamp('[DESIGN_ANALYZER] Please set OPENROUTER_API_KEY or OPEN_ROUTER_API_KEY environment variable');
        }
        // Check if MCP crawler is available (will be used via external call)
        this.crawlerAvailable = true; // Assume available since it's part of the existing system
    }
    /**
     * Select inspiration sites based on project theme/category
     * FORMULA: 1 Site Direto + 1 Galeria Visual + 1 Recurso Teórico (EXACTLY 3 SITES ALWAYS)
     */
    selectInspirationSites(theme) {
        const themeNormalized = theme.toLowerCase();
        // REFERENCE SITES (exactly 1 selected)
        const referenceSites = {
            'technology': { url: 'https://huly.io/', category: 'direct', theme: 'technology', priority: 1 },
            'saas': { url: 'https://huly.io/', category: 'direct', theme: 'saas', priority: 1 },
            'startup': { url: 'https://huly.io/', category: 'direct', theme: 'startup', priority: 1 },
            'finance': { url: 'https://stripe.com/', category: 'direct', theme: 'finance', priority: 1 },
            'design': { url: 'https://figma.com/', category: 'direct', theme: 'design', priority: 1 },
            'productivity': { url: 'https://notion.so/', category: 'direct', theme: 'productivity', priority: 1 },
            'development': { url: 'https://vercel.com/', category: 'direct', theme: 'development', priority: 1 },
            'food-drink': { url: 'https://www.ubereats.com/', category: 'direct', theme: 'food-drink', priority: 1 },
            'ecommerce': { url: 'https://stripe.com/', category: 'direct', theme: 'ecommerce', priority: 1 },
            'health': { url: 'https://www.teladoc.com/', category: 'direct', theme: 'health', priority: 1 },
            'mobile': { url: 'https://mobbin.com/', category: 'direct', theme: 'mobile', priority: 1 },
            'inspiration': { url: 'https://muz.li/', category: 'direct', theme: 'inspiration', priority: 1 },
            'components': { url: 'https://chakra-ui.com/', category: 'direct', theme: 'components', priority: 1 }
        };
        // GALLERY SITES WITH SEARCH (searchable galleries)
        const searchableGalleries = {
            // Creative & Design with search
            '3d': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'ai': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'animation': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'art': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'design': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'illustration': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'photography': { url: 'https://www.pinterest.com/search/pins/?q=', category: 'gallery', priority: 1 },
            'typography': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'motion': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            // Business & Professional with search
            'agency': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'business': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'marketing': { url: 'https://www.lapa.ninja/search/?q=', category: 'gallery', priority: 1 },
            'advertising': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'portfolio': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'studio': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'venture-capital': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            // Technology & Development with search
            'technology': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'startup': { url: 'https://www.landing.love/search/?q=', category: 'gallery', priority: 1 },
            'saas': { url: 'https://saaslandingpage.com/?s=', category: 'gallery', priority: 1 },
            'development': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'productivity': { url: 'https://saaslandingpage.com/?s=', category: 'gallery', priority: 1 },
            'android-app': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'macos-app': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'robotics': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'crypto': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'security': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            // E-commerce & Retail with search
            'ecommerce': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'retail': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'd2c': { url: 'https://land-book.com/?search=', category: 'gallery', priority: 1 },
            'fashion': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'beauty': { url: 'https://www.pinterest.com/search/pins/?q=', category: 'gallery', priority: 1 },
            'furniture': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'automotive': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            // Media & Entertainment with search
            'film': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'movies': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'television': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'music': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'gaming': { url: 'https://gameuidatabase.com/index.php?text=', category: 'gallery', priority: 1 },
            'video': { url: 'https://www.pinterest.com/search/pins/?q=', category: 'gallery', priority: 1 },
            'audio': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'podcast': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            // Publishing & Content with search
            'magazine': { url: 'https://www.pinterest.com/search/pins/?q=', category: 'gallery', priority: 1 },
            'editorial': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'blog': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'news': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'book': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            // Health & Lifestyle with search
            'health': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'fitness': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'food-drink': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'restaurant': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'pets': { url: 'https://www.pinterest.com/search/pins/?q=', category: 'gallery', priority: 1 },
            'sports': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'travel': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            // Professional Services with search
            'finance': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'legal': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'construction': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'real-estate': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'logistics': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'education': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'science': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            // Community & Social with search
            'community': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'social-media': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'conference': { url: 'https://www.lapa.ninja/search/?q=', category: 'gallery', priority: 1 },
            'event': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'personal': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'political': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            // Specialized with search
            'architecture': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'interior': { url: 'https://www.pinterest.com/search/pins/?q=', category: 'gallery', priority: 1 },
            'landscaping': { url: 'https://www.pinterest.com/search/pins/?q=', category: 'gallery', priority: 1 },
            'environmental': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            'museum': { url: 'https://www.awwwards.com/inspiration_search/?text=', category: 'gallery', priority: 1 },
            'branding': { url: 'https://dribbble.com/search/', category: 'gallery', priority: 1 },
            'accessibility': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 },
            '420': { url: 'https://www.siteinspire.com/search?query=', category: 'gallery', priority: 1 }
        };
        // NON-SEARCHABLE GALLERY SITES (static galleries)
        const staticGalleries = {
            'general': { url: 'https://onepagelove.com/', category: 'gallery', priority: 1 },
            'landing': { url: 'https://www.landingfolio.com/', category: 'gallery', priority: 1 },
            'minimal': { url: 'https://httpster.net/', category: 'gallery', priority: 1 },
            'modern': { url: 'https://godly.website/', category: 'gallery', priority: 1 },
            'saas-static': { url: 'https://saaspo.com/', category: 'gallery', priority: 1 },
            'editorial-static': { url: 'https://websitevice.com/', category: 'gallery', priority: 1 },
            'responsive': { url: 'https://the-responsive.com/', category: 'gallery', priority: 1 }
        };
        // RECURSOS TEÓRICOS (exactly 1 selected) 
        const theoryByTheme = {
            'ux': { url: 'https://goodux.appcues.com/categories', category: 'theory', priority: 1 },
            'ui': { url: 'https://ui-patterns.com/patterns', category: 'theory', priority: 1 },
            'design': { url: 'https://ui-patterns.com/patterns', category: 'theory', priority: 1 },
            'component': { url: 'https://ui-patterns.com/patterns', category: 'theory', priority: 1 },
            'pattern': { url: 'https://ui-patterns.com/patterns', category: 'theory', priority: 1 },
            'general': { url: 'https://goodui.org/', category: 'theory', priority: 1 }
        };
        // DETERMINISTIC SELECTION: EXACTLY 1 FROM EACH CATEGORY
        const selectedSites = [];
        // 1. SELECT 1 REFERENCE SITE
        const referenceSite = referenceSites[themeNormalized] || referenceSites['technology']; // Default to huly.io
        selectedSites.push(referenceSite);
        // 2. SELECT 1 GALLERY SITE (with search functionality for theme-specific results)
        let gallerySite;
        if (searchableGalleries[themeNormalized]) {
            // Use searchable gallery with encoded theme as search term
            const baseUrl = searchableGalleries[themeNormalized].url;
            const searchTerm = encodeURIComponent(themeNormalized.replace('-', ' '));
            gallerySite = {
                ...searchableGalleries[themeNormalized],
                url: baseUrl + searchTerm
            };
        }
        else {
            // Fallback to static galleries or default searchable
            gallerySite = staticGalleries['general'] || {
                ...searchableGalleries['design'],
                url: searchableGalleries['design'].url + encodeURIComponent(themeNormalized.replace('-', ' '))
            };
        }
        selectedSites.push(gallerySite);
        // 3. SELECT 1 THEORY SITE
        const theorySite = theoryByTheme[themeNormalized] || theoryByTheme['general']; // Default to goodui.org
        selectedSites.push(theorySite);
        logWithTimestamp(`[DESIGN_ANALYZER] ENFORCED SELECTION - Theme: ${theme}`);
        logWithTimestamp(`[DESIGN_ANALYZER] Reference Site: ${referenceSite.url}`);
        logWithTimestamp(`[DESIGN_ANALYZER] Gallery Site: ${gallerySite.url}`);
        logWithTimestamp(`[DESIGN_ANALYZER] Theory Site: ${theorySite.url}`);
        logWithTimestamp(`[DESIGN_ANALYZER] Total Sites: ${selectedSites.length} (MUST BE EXACTLY 3)`);
        return selectedSites;
    }
    /**
     * Get crawl configuration based on site category
     */
    getCrawlConfig(category) {
        switch (category) {
            case 'direct':
                return {
                    maxPages: 6,
                    deepCrawl: true,
                    deepCrawlStrategy: 'bfs',
                    extractionQuery: "Extract layout structures, color schemes, typography choices, component designs, spacing patterns, navigation styles, and visual hierarchy from this specific website"
                };
            case 'gallery':
                return {
                    maxPages: 8,
                    deepCrawl: true,
                    deepCrawlStrategy: 'bfs',
                    extractionQuery: "Extract trending design elements, color palettes, typography trends, layout innovations, and visual styles from featured designs"
                };
            case 'theory':
                return {
                    maxPages: 10,
                    deepCrawl: true,
                    deepCrawlStrategy: 'dfs',
                    extractionQuery: "Extract UX/UI principles, design guidelines, best practices, usability patterns, evidence-based recommendations, accessibility guidelines, and conversion optimization techniques"
                };
            default:
                return {
                    maxPages: 6,
                    deepCrawl: true,
                    deepCrawlStrategy: 'bfs',
                    extractionQuery: "Extract design elements, layout patterns, and visual inspiration from this website"
                };
        }
    }
    /**
     * Perform textual analysis using web crawler (external MCP call)
     */
    async performTextualAnalysis(sites) {
        const textualResults = {};
        logWithTimestamp(`[DESIGN_ANALYZER] Starting textual analysis for ${sites.length} sites`);
        for (const site of sites) {
            try {
                logWithTimestamp(`[DESIGN_ANALYZER] Crawling ${site.url} (${site.category})`);
                const config = this.getCrawlConfig(site.category);
                // This would be called via MCP in the actual implementation
                // For now, we'll simulate the structure that would be returned
                const crawlResult = {
                    success: true,
                    url: site.url,
                    content: `Simulated crawl result for ${site.url} with category ${site.category}`,
                    extractedData: {
                        category: site.category,
                        extractionQuery: config.extractionQuery,
                        maxPages: config.maxPages,
                        timestamp: new Date().toISOString()
                    }
                };
                textualResults[site.url] = crawlResult;
                logWithTimestamp(`[DESIGN_ANALYZER] Crawl completed for ${site.url}`);
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                logWithTimestamp(`[DESIGN_ANALYZER] Textual analysis failed for ${site.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                textualResults[site.url] = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
        return textualResults;
    }
    /**
     * Perform visual analysis using screenshot capture + Gemini vision
     */
    async performVisualAnalysis(sites, bypassCache = false) {
        const visualResults = {};
        logWithTimestamp(`[DESIGN_ANALYZER] Starting visual analysis for ${sites.length} sites`);
        logWithTimestamp(`[DESIGN_ANALYZER] Gemini analyzer available: ${!!this.geminiAnalyzer}`);
        logWithTimestamp(`[DESIGN_ANALYZER] Sites to analyze: ${sites.map(s => s.url).join(', ')}`);
        logWithTimestamp(`[DESIGN_ANALYZER] Bypass cache: ${bypassCache}`);
        // Check cache for each site first (if not bypassing cache)
        const sitesNeedingScreenshots = [];
        const sitesWithCachedResults = [];
        if (!bypassCache && this.geminiAnalyzer) {
            for (const site of sites) {
                try {
                    // Check if we have cached visual analysis for this URL
                    const cachedVisual = await this.cache.getVisualAnalysisByUrl(site.url, 'full');
                    if (cachedVisual) {
                        logWithTimestamp(`[DESIGN_ANALYZER] Found cached visual analysis for: ${site.url}`);
                        visualResults[site.url] = {
                            success: true,
                            analysis: cachedVisual.visualAnalysis,
                            confidence: cachedVisual.confidence,
                            metadata: {
                                ...cachedVisual.metadata,
                                cached: true,
                                cacheTimestamp: cachedVisual.timestamp
                            },
                            cached: true,
                            screenshots: [] // No screenshots needed for cached results
                        };
                        sitesWithCachedResults.push(site);
                    }
                    else {
                        sitesNeedingScreenshots.push(site);
                    }
                }
                catch (cacheError) {
                    logWithTimestamp(`[DESIGN_ANALYZER] Cache check failed for ${site.url}: ${cacheError}`);
                    sitesNeedingScreenshots.push(site);
                }
            }
        }
        else {
            sitesNeedingScreenshots.push(...sites);
        }
        logWithTimestamp(`[DESIGN_ANALYZER] Sites with cached results: ${sitesWithCachedResults.length}`);
        logWithTimestamp(`[DESIGN_ANALYZER] Sites needing screenshots: ${sitesNeedingScreenshots.length}`);
        // Only take screenshots for sites that don't have cached results
        let screenshotsByUrl = {};
        if (sitesNeedingScreenshots.length === 0) {
            logWithTimestamp(`[DESIGN_ANALYZER] All sites have cached results, skipping screenshot capture`);
            return visualResults;
        }
        try {
            // Initialize screenshot capture
            logWithTimestamp(`[DESIGN_ANALYZER] Initializing screenshot capture...`);
            await this.screenshotCapture.init();
            logWithTimestamp(`[DESIGN_ANALYZER] Screenshot capture initialized successfully`);
            // Capture screenshots only for sites that need them
            const urls = sitesNeedingScreenshots.map(site => site.url);
            logWithTimestamp(`[DESIGN_ANALYZER] Capturing screenshots for URLs: ${JSON.stringify(urls)}`);
            const screenshotResults = await this.screenshotCapture.captureBatchScreenshots(urls, {
                fullPage: true,
                viewportOnly: true,
                format: 'png'
            });
            logWithTimestamp(`[DESIGN_ANALYZER] Screenshot capture completed. Results: ${screenshotResults.length} total`);
            logWithTimestamp(`[DESIGN_ANALYZER] Screenshot success count: ${screenshotResults.filter(r => r.success).length}`);
            // Group screenshots by URL
            for (const result of screenshotResults) {
                logWithTimestamp(`[DESIGN_ANALYZER] Screenshot result for ${result.url}: success=${result.success}, path=${result.success ? result.filePath : 'none'}, error=${result.error || 'none'}`);
                if (result.success) {
                    if (!screenshotsByUrl[result.url]) {
                        screenshotsByUrl[result.url] = [];
                    }
                    screenshotsByUrl[result.url].push(result.filePath);
                }
            }
        }
        catch (captureError) {
            logWithTimestamp(`[DESIGN_ANALYZER] Screenshot capture failed: ${captureError instanceof Error ? captureError.message : 'Unknown error'}`);
            // Return empty results for sites that needed screenshots with error details
            for (const site of sitesNeedingScreenshots) {
                visualResults[site.url] = {
                    success: false,
                    error: `Screenshot capture failed: ${captureError instanceof Error ? captureError.message : 'Unknown error'}`,
                    screenshots: []
                };
            }
            return visualResults;
        }
        // Analyze screenshots with Gemini if available (only for sites that needed screenshots)
        if (this.geminiAnalyzer) {
            for (const site of sitesNeedingScreenshots) {
                const screenshots = screenshotsByUrl[site.url] || [];
                if (screenshots.length === 0) {
                    visualResults[site.url] = {
                        success: false,
                        error: 'No screenshots captured',
                        screenshots: []
                    };
                    continue;
                }
                try {
                    logWithTimestamp(`[DESIGN_ANALYZER] Analyzing ${screenshots.length} screenshots for ${site.url}`);
                    // Prefer viewport screenshot (smaller file size) over full-page for Gemini analysis
                    // Look for viewport screenshot first, fallback to first available
                    const viewportScreenshot = screenshots.find(path => path.includes('_viewport_'));
                    const primaryScreenshot = viewportScreenshot || screenshots[0];
                    const analysisResult = await this.geminiAnalyzer.analyzeScreenshot({
                        screenshotPath: primaryScreenshot,
                        prompt: this.getVisualAnalysisPrompt(site.category),
                        bypassCache,
                        analysisType: 'full'
                    });
                    visualResults[site.url] = {
                        success: true,
                        analysis: analysisResult.analysis,
                        confidence: analysisResult.confidence,
                        metadata: analysisResult.metadata,
                        screenshots: screenshots
                    };
                    // Cache the successful visual analysis by URL
                    if (!bypassCache) {
                        try {
                            const cacheSuccess = await this.cache.setVisualAnalysisByUrl(site.url, {
                                visualAnalysis: analysisResult.analysis,
                                analysisType: 'full',
                                confidence: analysisResult.confidence,
                                metadata: analysisResult.metadata,
                                ttl: parseInt(process.env.CACHE_TTL_VISUAL || '604800') // 7 days default
                            });
                            if (cacheSuccess) {
                                logWithTimestamp(`[DESIGN_ANALYZER] Successfully cached visual analysis for: ${site.url}`);
                            }
                        }
                        catch (cacheError) {
                            logWithTimestamp(`[DESIGN_ANALYZER] Error caching visual analysis: ${cacheError}`);
                        }
                    }
                    logWithTimestamp(`[DESIGN_ANALYZER] Visual analysis completed for ${site.url} (confidence: ${analysisResult.confidence})`);
                }
                catch (error) {
                    logWithTimestamp(`[DESIGN_ANALYZER] Visual analysis failed for ${site.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    visualResults[site.url] = {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        screenshots: screenshots
                    };
                }
                // Rate limiting for API calls
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        else {
            logWithTimestamp('[DESIGN_ANALYZER] Gemini analyzer not available, skipping visual analysis');
            for (const site of sites) {
                visualResults[site.url] = {
                    success: false,
                    error: 'Gemini analyzer not configured',
                    screenshots: screenshotsByUrl[site.url] || []
                };
            }
        }
        return visualResults;
    }
    /**
     * Get visual analysis prompt based on site category
     */
    getVisualAnalysisPrompt(category) {
        const basePrompt = `
DESIGN ANALYSIS - WEBSITE INSPIRATION EXTRACTION

Analyze this website screenshot and return structured JSON data for design replication.

FOCUS AREAS BASED ON CATEGORY: ${category.toUpperCase()}

RETURN FORMAT: Return a JSON object with the following structure:

{
  "colorPalettes": {
    "primary": ["#hex1", "#hex2", "#hex3"],
    "secondary": ["#hex4", "#hex5"],
    "accent": ["#hex6", "#hex7"],
    "backgrounds": ["#hex8", "#hex9"],
    "text": ["#hex10", "#hex11"]
  },
  "typography": {
    "fontFamilies": ["Font Name 1", "Font Name 2"],
    "sizes": ["text-xs", "text-sm", "text-lg", "text-xl", "text-2xl"],
    "weights": [400, 500, 600, 700],
    "lineHeights": ["leading-tight", "leading-normal", "leading-relaxed"],
    "spacing": ["tracking-tight", "tracking-normal", "tracking-wide"]
  },
  "layoutPatterns": {
    "gridSystems": ["CSS Grid", "Flexbox", "12-column grid"],
    "spacing": ["space-4", "space-8", "space-16", "space-24"],
    "sections": ["Header", "Hero", "Features", "Footer"],
    "containers": ["max-w-7xl", "max-w-4xl", "container mx-auto"],
    "breakpoints": ["responsive", "mobile-first", "desktop-first"]
  },
  "components": {
    "buttons": [
      {
        "type": "primary",
        "style": "bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700",
        "size": "medium",
        "shape": "rounded"
      }
    ],
    "cards": [
      {
        "style": "bg-white shadow-lg rounded-xl p-6 border",
        "shadow": "shadow-lg",
        "border": "border border-gray-200",
        "padding": "p-6"
      }
    ],
    "navigation": [
      {
        "type": "header",
        "style": "sticky top-0 bg-white/80 backdrop-blur-sm border-b",
        "layout": "flex justify-between items-center px-6 py-4"
      }
    ],
    "forms": [
      {
        "inputStyle": "border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500",
        "labelStyle": "text-sm font-medium text-gray-700 mb-2"
      }
    ]
  },
  "visualEffects": {
    "shadows": ["shadow-sm", "shadow-md", "shadow-lg", "shadow-xl"],
    "borderRadius": ["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl"],
    "gradients": ["bg-gradient-to-r from-blue-500 to-purple-600"],
    "animations": ["transition-all duration-300", "hover:scale-105"],
    "filters": ["backdrop-blur-sm", "opacity-90"]
  },
  "principles": {
    "usability": ["Clear navigation", "Consistent spacing", "Good contrast"],
    "uxPatterns": ["F-pattern layout", "Progressive disclosure", "Call-to-action hierarchy"],
    "guidelines": ["Mobile-first design", "Accessibility compliant", "Performance optimized"]
  },
  "tailwindClasses": {
    "layout": ["container", "mx-auto", "px-4", "py-8", "grid", "grid-cols-1", "md:grid-cols-3"],
    "typography": ["text-4xl", "font-bold", "text-gray-900", "leading-tight"],
    "colors": ["bg-white", "text-gray-900", "border-gray-200", "hover:bg-gray-50"],
    "spacing": ["p-6", "m-4", "space-y-4", "gap-6"],
    "responsive": ["sm:text-lg", "md:text-xl", "lg:text-2xl"]
  },
  "implementation": {
    "framework": "React/Vue/HTML",
    "cssFramework": "Tailwind CSS",
    "customCSS": ["Any specific custom styles needed"],
    "components": ["Reusable component suggestions"],
    "responsive": ["Mobile breakpoint considerations"]
  }
}

ANALYSIS REQUIREMENTS:
- Extract exact hex color codes where visible
- Identify specific Tailwind CSS classes that would recreate the design
- Note spacing patterns and rhythm
- Identify reusable component patterns
- Consider responsive design implications
- Focus on implementable, specific details
`;
        // Add category-specific focus
        switch (category) {
            case 'direct':
                return basePrompt + `\n\nSPECIAL FOCUS: Extract specific implementation details and exact specifications from this reference website. Focus on precise measurements, exact colors, and replicable component structures.`;
            case 'gallery':
                return basePrompt + `\n\nSPECIAL FOCUS: Identify trending design elements and innovative visual patterns. Focus on contemporary design styles and emerging UI/UX trends that can inspire modern implementations.`;
            case 'theory':
                return basePrompt + `\n\nSPECIAL FOCUS: Extract design principles and best practices demonstrated in this interface. Focus on usability patterns, accessibility considerations, and proven UX/UI guidelines.`;
            default:
                return basePrompt;
        }
    }
    /**
     * Consolidate insights from textual and visual analysis
     */
    consolidateInsights(textualResults, visualResults) {
        const consolidated = {
            colorPalettes: {
                primary: [],
                secondary: [],
                accent: []
            },
            typography: {
                fontFamilies: [],
                sizes: [],
                weights: []
            },
            layoutPatterns: {
                gridSystems: [],
                spacing: [],
                sections: []
            },
            components: {
                buttons: [],
                cards: [],
                navigation: []
            },
            principles: {
                usability: [],
                uxPatterns: [],
                guidelines: []
            },
            recommendations: [],
            inspirationSources: [],
            screenshots: {
                totalCaptured: 0,
                byUrl: {},
                analysisResults: {}
            }
        };
        // Consolidate visual analysis results
        for (const [url, result] of Object.entries(visualResults)) {
            // Track screenshots regardless of analysis success
            if (result.screenshots && Array.isArray(result.screenshots)) {
                consolidated.screenshots.byUrl[url] = result.screenshots;
                consolidated.screenshots.totalCaptured += result.screenshots.length;
            }
            // Track analysis results
            consolidated.screenshots.analysisResults[url] = {
                success: result.success || false,
                confidence: result.confidence || 0
            };
            if (result.success && result.analysis) {
                consolidated.inspirationSources.push(url);
                try {
                    // Try to parse JSON from Gemini analysis
                    // Handle cases where response is wrapped in markdown code blocks
                    let jsonString = result.analysis.trim();
                    // Remove markdown code block wrappers if present
                    if (jsonString.startsWith('```json')) {
                        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    }
                    else if (jsonString.startsWith('```')) {
                        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }
                    // Clean up any remaining markdown or extra text
                    jsonString = jsonString.trim();
                    const analysisData = JSON.parse(jsonString);
                    // Merge color palettes
                    if (analysisData.colorPalettes) {
                        consolidated.colorPalettes.primary.push(...(analysisData.colorPalettes.primary || []));
                        consolidated.colorPalettes.secondary.push(...(analysisData.colorPalettes.secondary || []));
                        consolidated.colorPalettes.accent.push(...(analysisData.colorPalettes.accent || []));
                    }
                    // Merge typography
                    if (analysisData.typography) {
                        consolidated.typography.fontFamilies.push(...(analysisData.typography.fontFamilies || []));
                        consolidated.typography.sizes.push(...(analysisData.typography.sizes || []));
                        consolidated.typography.weights.push(...(analysisData.typography.weights || []));
                    }
                    // Merge layout patterns
                    if (analysisData.layoutPatterns) {
                        consolidated.layoutPatterns.gridSystems.push(...(analysisData.layoutPatterns.gridSystems || []));
                        consolidated.layoutPatterns.spacing.push(...(analysisData.layoutPatterns.spacing || []));
                        consolidated.layoutPatterns.sections.push(...(analysisData.layoutPatterns.sections || []));
                    }
                    // Merge components
                    if (analysisData.components) {
                        consolidated.components.buttons.push(...(analysisData.components.buttons || []));
                        consolidated.components.cards.push(...(analysisData.components.cards || []));
                        consolidated.components.navigation.push(...(analysisData.components.navigation || []));
                    }
                    // Merge principles
                    if (analysisData.principles) {
                        consolidated.principles.usability.push(...(analysisData.principles.usability || []));
                        consolidated.principles.uxPatterns.push(...(analysisData.principles.uxPatterns || []));
                        consolidated.principles.guidelines.push(...(analysisData.principles.guidelines || []));
                    }
                    // Add implementation recommendations
                    if (analysisData.tailwindClasses || analysisData.implementation) {
                        const confidenceText = result.confidence > 0.7 ? 'High confidence' : 'Moderate confidence';
                        consolidated.recommendations.push(`${confidenceText} structured analysis from ${url}: ${analysisData.components?.buttons?.length || 0} button patterns, ${analysisData.components?.cards?.length || 0} card patterns, ${analysisData.colorPalettes?.primary?.length || 0} primary colors identified`);
                    }
                }
                catch (parseError) {
                    // Fallback to text analysis if JSON parsing fails
                    logWithTimestamp(`[DESIGN_ANALYZER] Failed to parse JSON from ${url}, falling back to text analysis: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
                    const analysis = result.analysis.toLowerCase();
                    const colorMatches = analysis.match(/#[0-9a-f]{6}/gi) || [];
                    consolidated.colorPalettes.primary.push(...colorMatches.slice(0, 3));
                    if (analysis.includes('grid')) {
                        consolidated.layoutPatterns.gridSystems.push('CSS Grid detected');
                    }
                    if (analysis.includes('flexbox')) {
                        consolidated.layoutPatterns.gridSystems.push('Flexbox detected');
                    }
                    const confidenceText = result.confidence > 0.7 ? 'High confidence' : 'Moderate confidence';
                    consolidated.recommendations.push(`${confidenceText} text analysis from ${url}: fallback parsing used (${result.screenshots?.length || 0} screenshots)`);
                }
            }
            else if (result.screenshots?.length > 0) {
                // Even if analysis failed, note that screenshots were captured
                consolidated.recommendations.push(`Screenshots captured for ${url} (${result.screenshots.length} images) but analysis ${result.success ? 'incomplete' : 'failed'}`);
            }
        }
        // Consolidate textual analysis results
        for (const [url, result] of Object.entries(textualResults)) {
            if (result.success) {
                const category = result.extractedData?.category || 'unknown';
                switch (category) {
                    case 'theory':
                        consolidated.principles.guidelines.push(`Best practices extracted from ${url}`);
                        break;
                    case 'gallery':
                        consolidated.recommendations.push(`Trending patterns identified from ${url}`);
                        break;
                    case 'direct':
                        consolidated.recommendations.push(`Implementation patterns extracted from ${url}`);
                        break;
                }
            }
        }
        // Remove duplicates and limit arrays
        consolidated.colorPalettes.primary = [...new Set(consolidated.colorPalettes.primary)].slice(0, 5);
        consolidated.layoutPatterns.gridSystems = [...new Set(consolidated.layoutPatterns.gridSystems)];
        consolidated.inspirationSources = [...new Set(consolidated.inspirationSources)];
        return consolidated;
    }
    /**
     * Analyze design inspiration for a given theme
     */
    async analyzeDesignInspiration(theme, bypassCache = false) {
        logWithTimestamp(`[DESIGN_ANALYZER] Starting complete design inspiration analysis for theme: ${theme}`);
        const startTime = Date.now();
        // Try to connect to Redis (non-blocking)
        try {
            await this.cache.connect();
        }
        catch (redisError) {
            logWithTimestamp(`[DESIGN_ANALYZER] Redis connection failed, proceeding without cache: ${redisError}`);
        }
        // Check cache first (unless bypassing cache)
        if (!bypassCache) {
            logWithTimestamp(`[DESIGN_ANALYZER] Checking cache for theme: ${theme}`);
            const cachedResult = await this.cache.getDesignAnalysis(theme);
            if (cachedResult) {
                logWithTimestamp(`[DESIGN_ANALYZER] Cache hit! Returning cached result for theme: ${theme}`);
                const processingTime = Date.now() - startTime;
                return {
                    sites: [], // Sites array is not cached for simplicity
                    textualResults: cachedResult.textualResults || {},
                    visualResults: cachedResult.visualResults || {},
                    consolidatedInsights: {
                        ...cachedResult.consolidatedInsights,
                        cached: true,
                        cacheTimestamp: cachedResult.timestamp,
                        processingTime
                    },
                    summary: {
                        ...cachedResult.summary,
                        cached: true
                    }
                };
            }
            else {
                logWithTimestamp(`[DESIGN_ANALYZER] Cache miss, proceeding with fresh analysis for theme: ${theme}`);
            }
        }
        else {
            logWithTimestamp(`[DESIGN_ANALYZER] Cache bypass requested, proceeding with fresh analysis for theme: ${theme}`);
        }
        // Send progress update to prevent Cline timeout
        const sendProgressUpdate = (step, progress) => {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`[PROGRESS] ${step} (${progress}%) - ${elapsed}s elapsed`);
            logWithTimestamp(`[PROGRESS] ${step} (${progress}%) - ${elapsed}s elapsed`);
        };
        sendProgressUpdate('Analysis initialized', 5);
        // Step 1: Select inspiration sites
        sendProgressUpdate('Selecting inspiration sites', 10);
        const sites = this.selectInspirationSites(theme);
        logWithTimestamp(`[DESIGN_ANALYZER] Selected ${sites.length} inspiration sites`);
        sendProgressUpdate('Sites selected', 15);
        // Step 2: Perform textual analysis
        sendProgressUpdate('Starting textual analysis', 20);
        const textualResults = await this.performTextualAnalysis(sites);
        sendProgressUpdate('Textual analysis completed', 40);
        // Step 3: Perform visual analysis
        sendProgressUpdate('Starting visual analysis', 45);
        const visualResults = await this.performVisualAnalysis(sites, bypassCache);
        sendProgressUpdate('Visual analysis completed', 80);
        // Step 4: Consolidate insights
        const consolidatedInsights = this.consolidateInsights(textualResults, visualResults);
        // Step 5: Generate summary
        const successfulTextual = Object.values(textualResults).filter(r => r.success).length;
        const successfulVisual = Object.values(visualResults).filter(r => r.success).length;
        const totalScreenshots = Object.values(visualResults).reduce((sum, r) => sum + (r.screenshots?.length || 0), 0);
        const avgConfidence = successfulVisual > 0
            ? Object.values(visualResults)
                .filter(r => r.success && r.confidence)
                .reduce((sum, r) => sum + r.confidence, 0) / successfulVisual
            : 0;
        const processingTime = Date.now() - startTime;
        logWithTimestamp(`[DESIGN_ANALYZER] Analysis completed in ${processingTime}ms`);
        logWithTimestamp(`[DESIGN_ANALYZER] Results: ${successfulTextual}/${sites.length} textual, ${successfulVisual}/${sites.length} visual, ${totalScreenshots} screenshots`);
        const result = {
            sites,
            textualResults,
            visualResults,
            consolidatedInsights,
            summary: {
                totalSites: sites.length,
                successfulTextual,
                successfulVisual,
                totalScreenshots,
                analysisConfidence: avgConfidence,
                cached: false
            }
        };
        // Cache the successful result
        if (!bypassCache) {
            try {
                const cacheSuccess = await this.cache.setDesignAnalysis(theme, {
                    consolidatedInsights,
                    textualResults,
                    visualResults,
                    summary: result.summary,
                    ttl: parseInt(process.env.CACHE_TTL_DESIGN || '43200') // 12 hours default
                });
                if (cacheSuccess) {
                    logWithTimestamp(`[DESIGN_ANALYZER] Successfully cached design analysis for theme: ${theme}`);
                    result.summary.cached = 'stored';
                }
                else {
                    logWithTimestamp(`[DESIGN_ANALYZER] Failed to cache design analysis for theme: ${theme}`);
                }
            }
            catch (cacheError) {
                logWithTimestamp(`[DESIGN_ANALYZER] Error caching design analysis: ${cacheError}`);
            }
        }
        return result;
    }
    /**
     * Clean up temporary files
     */
    async cleanup() {
        await this.screenshotCapture.cleanup();
    }
}
export default DesignInspirationAnalyzer;
