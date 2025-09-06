import { createClient } from 'redis';
import crypto from 'crypto';
import { promises as fs } from 'fs';
class RedisCache {
    client;
    isConnected = false;
    connectionPromise = null;
    hitCount = 0;
    missCount = 0;
    startTime = Date.now();
    constructor() {
        // Create Redis client with configuration from environment variables
        const redisUrl = process.env.REDIS_URL;
        const redisPassword = process.env.REDIS_PASSWORD;
        const redisUser = process.env.REDIS_USER;
        if (redisUrl && redisPassword && redisUser) {
            // Cloud Redis with authentication - parse host and port from REDIS_URL
            const [host, port] = redisUrl.split(':');
            this.client = createClient({
                username: redisUser,
                password: redisPassword,
                socket: {
                    host: host,
                    port: parseInt(port || '6379')
                }
            });
        }
        else if (redisUrl) {
            // Fallback to URL-based connection
            this.client = createClient({ url: redisUrl });
        }
        else {
            // Default local Redis
            this.client = createClient({
                socket: {
                    host: 'localhost',
                    port: 6379
                }
            });
        }
        // Handle Redis errors
        this.client.on('error', (err) => {
            console.error('[REDIS_CACHE] Redis Client Error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            console.log('[REDIS_CACHE] Connected to Redis');
            this.isConnected = true;
        });
        this.client.on('disconnect', () => {
            console.log('[REDIS_CACHE] Disconnected from Redis');
            this.isConnected = false;
        });
    }
    logMessage(msg) {
        const logEntry = `${new Date().toISOString()}: ${msg}\n`;
        fs.appendFile('redis-cache.log', logEntry).catch(() => { });
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connectionPromise = (async () => {
            try {
                await this.client.connect();
                this.isConnected = true;
                this.logMessage('[REDIS_CACHE] Successfully connected to Redis');
            }
            catch (error) {
                this.logMessage(`[REDIS_CACHE] Failed to connect to Redis: ${error}`);
                this.isConnected = false;
                throw error;
            }
            finally {
                this.connectionPromise = null;
            }
        })();
        return this.connectionPromise;
    }
    async disconnect() {
        if (this.isConnected && this.client) {
            await this.client.disconnect();
            this.isConnected = false;
            this.logMessage('[REDIS_CACHE] Disconnected from Redis');
        }
    }
    createHash(input) {
        return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
    }
    getCrawlKey(url, outputFormat) {
        const key = outputFormat ? `${url}:${outputFormat}` : url;
        return `web_scraping:crawl:${this.createHash(key)}`;
    }
    getVisualKey(contentHash, analysisType) {
        const key = analysisType ? `${contentHash}:${analysisType}` : contentHash;
        return `web_scraping:visual:${this.createHash(key)}`;
    }
    getDesignKey(theme) {
        return `web_scraping:design:${this.createHash(theme)}`;
    }
    getPuppeteerKey(theme, url) {
        return `web_scraping:puppeteer:theme:${this.createHash(theme)}:url:${this.createHash(url)}`;
    }
    getImageGenerationKey(prompt) {
        return `web_scraping:image_generation:prompt:${this.createHash(prompt)}`;
    }
    getFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = require('fs').createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex').substring(0, 16)));
            stream.on('error', reject);
        });
    }
    // Web crawling cache methods
    async getCrawlAnalysis(url, outputFormat) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache check for crawl analysis');
            return null;
        }
        try {
            const key = this.getCrawlKey(url, outputFormat);
            const cached = await this.client.get(key);
            if (cached) {
                this.hitCount++;
                this.logMessage(`[REDIS_CACHE] Cache hit for crawl: ${url}`);
                return JSON.parse(cached);
            }
            else {
                this.missCount++;
                this.logMessage(`[REDIS_CACHE] Cache miss for crawl: ${url}`);
                return null;
            }
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error getting crawl cache: ${error}`);
            return null;
        }
    }
    async setCrawlAnalysis(url, data, outputFormat) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache set for crawl analysis');
            return false;
        }
        try {
            const key = this.getCrawlKey(url, outputFormat);
            const cacheEntry = {
                ...data,
                url,
                timestamp: new Date().toISOString(),
            };
            const ttl = data.ttl || parseInt(process.env.CACHE_TTL_CRAWL || '86400'); // 24 hours default
            await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
            this.logMessage(`[REDIS_CACHE] Cached crawl analysis for: ${url} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error setting crawl cache: ${error}`);
            return false;
        }
    }
    // Visual analysis cache methods
    async getVisualAnalysisByUrl(url, analysisType) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache check for visual analysis');
            return null;
        }
        try {
            const key = this.getVisualKey(`url:${url}`, analysisType);
            const cached = await this.client.get(key);
            if (cached) {
                this.hitCount++;
                this.logMessage(`[REDIS_CACHE] Cache hit for visual analysis: ${url}`);
                return JSON.parse(cached);
            }
            else {
                this.missCount++;
                this.logMessage(`[REDIS_CACHE] Cache miss for visual analysis: ${url}`);
                return null;
            }
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error getting visual cache: ${error}`);
            return null;
        }
    }
    async getVisualAnalysis(screenshotPath, analysisType) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache check for visual analysis');
            return null;
        }
        try {
            const contentHash = await this.getFileHash(screenshotPath);
            const key = this.getVisualKey(contentHash, analysisType);
            const cached = await this.client.get(key);
            if (cached) {
                this.hitCount++;
                this.logMessage(`[REDIS_CACHE] Cache hit for visual: ${screenshotPath}`);
                return JSON.parse(cached);
            }
            else {
                this.missCount++;
                this.logMessage(`[REDIS_CACHE] Cache miss for visual: ${screenshotPath}`);
                return null;
            }
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error getting visual cache: ${error}`);
            return null;
        }
    }
    async setVisualAnalysisByUrl(url, data) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache set for visual analysis');
            return false;
        }
        try {
            const key = this.getVisualKey(`url:${url}`, data.analysisType);
            const cacheEntry = {
                ...data,
                screenshotPath: `cached:${url}`, // Placeholder since we're caching by URL
                timestamp: new Date().toISOString(),
            };
            const ttl = data.ttl || parseInt(process.env.CACHE_TTL_VISUAL || '604800'); // 7 days default
            await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
            this.logMessage(`[REDIS_CACHE] Cached visual analysis for URL: ${url} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error setting visual cache: ${error}`);
            return false;
        }
    }
    async setVisualAnalysis(screenshotPath, data) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache set for visual analysis');
            return false;
        }
        try {
            const contentHash = await this.getFileHash(screenshotPath);
            const key = this.getVisualKey(contentHash, data.analysisType);
            const cacheEntry = {
                ...data,
                screenshotPath,
                timestamp: new Date().toISOString(),
            };
            const ttl = data.ttl || parseInt(process.env.CACHE_TTL_VISUAL || '604800'); // 7 days default
            await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
            this.logMessage(`[REDIS_CACHE] Cached visual analysis for: ${screenshotPath} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error setting visual cache: ${error}`);
            return false;
        }
    }
    // Design inspiration cache methods
    async getDesignAnalysis(theme) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache check for design analysis');
            return null;
        }
        try {
            const key = this.getDesignKey(theme);
            const cached = await this.client.get(key);
            if (cached) {
                this.hitCount++;
                this.logMessage(`[REDIS_CACHE] Cache hit for design theme: ${theme}`);
                return JSON.parse(cached);
            }
            else {
                this.missCount++;
                this.logMessage(`[REDIS_CACHE] Cache miss for design theme: ${theme}`);
                return null;
            }
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error getting design cache: ${error}`);
            return null;
        }
    }
    async setDesignAnalysis(theme, data) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache set for design analysis');
            return false;
        }
        try {
            const key = this.getDesignKey(theme);
            const cacheEntry = {
                ...data,
                theme,
                timestamp: new Date().toISOString(),
            };
            const ttl = data.ttl || parseInt(process.env.CACHE_TTL_DESIGN || '43200'); // 12 hours default
            await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
            this.logMessage(`[REDIS_CACHE] Cached design analysis for theme: ${theme} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error setting design cache: ${error}`);
            return false;
        }
    }
    // Puppeteer results cache methods
    async getPuppeteerResults(theme, url) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache check for Puppeteer results');
            return null;
        }
        try {
            const key = this.getPuppeteerKey(theme, url);
            const cached = await this.client.get(key);
            if (cached) {
                this.hitCount++;
                this.logMessage(`[REDIS_CACHE] Cache hit for Puppeteer results: ${theme}:${url}`);
                return JSON.parse(cached);
            }
            else {
                this.missCount++;
                this.logMessage(`[REDIS_CACHE] Cache miss for Puppeteer results: ${theme}:${url}`);
                return null;
            }
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error getting Puppeteer cache: ${error}`);
            return null;
        }
    }
    async setPuppeteerResults(theme, url, data) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache set for Puppeteer results');
            return false;
        }
        try {
            const key = this.getPuppeteerKey(theme, url);
            const cacheEntry = {
                ...data,
                theme,
                url,
                timestamp: new Date().toISOString(),
            };
            const ttl = data.ttl || parseInt(process.env.CACHE_TTL_PUPPETEER || '259200'); // 3 days default
            await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
            this.logMessage(`[REDIS_CACHE] Cached Puppeteer results for: ${theme}:${url} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error setting Puppeteer cache: ${error}`);
            return false;
        }
    }
    // Image Generation Cache Methods
    async getImageGenerationResults(prompt) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache check for image generation');
            return null;
        }
        try {
            const key = this.getImageGenerationKey(prompt);
            const cached = await this.client.get(key);
            if (cached) {
                this.hitCount++;
                this.logMessage(`[REDIS_CACHE] Cache hit for image generation: ${prompt.substring(0, 50)}...`);
                return JSON.parse(cached);
            }
            else {
                this.missCount++;
                this.logMessage(`[REDIS_CACHE] Cache miss for image generation: ${prompt.substring(0, 50)}...`);
                return null;
            }
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error getting image generation cache: ${error}`);
            return null;
        }
    }
    async setImageGenerationResults(prompt, data) {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, skipping cache set for image generation');
            return false;
        }
        try {
            const key = this.getImageGenerationKey(prompt);
            const cacheEntry = {
                ...data,
                prompt,
                timestamp: new Date().toISOString(),
            };
            const ttl = data.ttl || parseInt(process.env.CACHE_TTL_IMAGE_GENERATION || '2592000'); // 30 days default
            await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
            this.logMessage(`[REDIS_CACHE] Cached image generation for: ${prompt.substring(0, 50)}... (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error setting image generation cache: ${error}`);
            return false;
        }
    }
    // Cache management methods
    async getCacheStats() {
        const stats = {
            totalKeys: 0,
            crawlCacheKeys: 0,
            visualCacheKeys: 0,
            designCacheKeys: 0,
            puppeteerCacheKeys: 0,
            imageGenerationCacheKeys: 0,
            memoryUsage: 'N/A',
            uptime: Math.round((Date.now() - this.startTime) / 1000),
        };
        if (!this.isConnected) {
            return stats;
        }
        try {
            const keys = await this.client.keys('web_scraping:*');
            stats.totalKeys = keys.length;
            stats.crawlCacheKeys = keys.filter(key => key.includes(':crawl:')).length;
            stats.visualCacheKeys = keys.filter(key => key.includes(':visual:')).length;
            stats.designCacheKeys = keys.filter(key => key.includes(':design:')).length;
            stats.puppeteerCacheKeys = keys.filter(key => key.includes(':puppeteer:')).length;
            stats.imageGenerationCacheKeys = keys.filter(key => key.includes(':image_generation:')).length;
            // Calculate hit rate
            const totalRequests = this.hitCount + this.missCount;
            if (totalRequests > 0) {
                stats.hitRate = Math.round((this.hitCount / totalRequests) * 100) / 100;
            }
            // Get memory info if available
            try {
                const info = await this.client.info('memory');
                const memMatch = info.match(/used_memory_human:([^\r\n]+)/);
                if (memMatch) {
                    stats.memoryUsage = memMatch[1].trim();
                }
            }
            catch (memError) {
                // Memory info not available
            }
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error getting cache stats: ${error}`);
        }
        return stats;
    }
    async clearCache(pattern = 'web_scraping:*') {
        if (!this.isConnected) {
            this.logMessage('[REDIS_CACHE] Not connected, cannot clear cache');
            return 0;
        }
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }
            const deleted = await this.client.del(keys);
            this.logMessage(`[REDIS_CACHE] Cleared ${deleted} cache entries matching pattern: ${pattern}`);
            return deleted;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error clearing cache: ${error}`);
            return 0;
        }
    }
    async clearExpiredKeys() {
        // Redis automatically handles TTL expiration, but we can force cleanup
        if (!this.isConnected) {
            return 0;
        }
        try {
            // Get all our cache keys and check their TTL
            const keys = await this.client.keys('web_scraping:*');
            let expiredCount = 0;
            for (const key of keys) {
                const ttl = await this.client.ttl(key);
                if (ttl === -2) { // Key doesn't exist (expired)
                    expiredCount++;
                }
            }
            this.logMessage(`[REDIS_CACHE] Found ${expiredCount} expired keys (auto-cleaned by Redis)`);
            return expiredCount;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Error checking expired keys: ${error}`);
            return 0;
        }
    }
    // Health check method
    async isHealthy() {
        if (!this.isConnected) {
            return false;
        }
        try {
            await this.client.ping();
            return true;
        }
        catch (error) {
            this.logMessage(`[REDIS_CACHE] Health check failed: ${error}`);
            return false;
        }
    }
}
// Singleton instance
let redisCache = null;
export function getRedisCache() {
    if (!redisCache) {
        redisCache = new RedisCache();
    }
    return redisCache;
}
export { RedisCache };
