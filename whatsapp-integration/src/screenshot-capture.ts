/**
 * Screenshot Capture for Design Inspiration Websites
 * 
 * This module provides screenshot capture functionality specifically optimized
 * for capturing design inspiration from various websites. Based on the existing
 * takeScreenshot function but adapted for design analysis workflows.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
import * as path from 'path';

const pptr: any = puppeteer;

export interface ScreenshotOptions {
  fullPage?: boolean;
  viewportOnly?: boolean;
  sections?: string[]; // CSS selectors for specific sections
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export interface ScreenshotResult {
  url: string;
  filePath: string;
  type: 'full' | 'viewport' | 'section';
  sectionName?: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export class InspirationScreenshotCapture {
  private screenshotDir: string;

  constructor(screenshotDir: string = './temp/screenshots') {
    this.screenshotDir = screenshotDir;
  }

  /**
   * Initialize screenshot directory
   */
  async init(): Promise<void> {
    await fs.mkdir(this.screenshotDir, { recursive: true });
  }

  /**
   * Capture screenshots from a single inspiration website
   */
  async captureWebsiteScreenshots(
    url: string, 
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult[]> {
    const results: ScreenshotResult[] = [];
    const timestamp = new Date().toISOString();
    
    console.log(`[INSPIRATION_SCREENSHOT] Capturing screenshots for: ${url}`);
    
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
    console.log(`[INSPIRATION_SCREENSHOT] Proxy selected: ${proxy.server || 'none'} (raw=${proxy.raw ? 'yes' : 'no'})`);
    
    const launchArgs: string[] = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ];
    if (proxy.server) launchArgs.push(`--proxy-server=${proxy.server}`);

    let browser;
    try {
      browser = await pptr.launch({
        headless: true,
        args: launchArgs,
        executablePath: '/usr/bin/google-chrome-stable'
      });

      const page = await browser.newPage();
      
      if (proxy.username) {
        try { 
          await page.authenticate({ username: proxy.username, password: proxy.password || '' }); 
        } catch {}
      }
      
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
      await page.setUserAgent(userAgent);
      await page.setViewport({
        width: Math.floor(1024 + Math.random() * 120),
        height: Math.floor(768 + Math.random() * 120)
      });

      // Capture console output from page.evaluate
      page.on('console', (msg: any) => {
        console.log('[INSPIRATION_SCREENSHOT] Browser console: ' + msg.text());
      });

      // Navigate with extended timeout for inspiration sites
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (e) {
        console.log('[INSPIRATION_SCREENSHOT] Initial navigation failed, retrying with networkidle2');
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        } catch { }
      }

      // Wait for Cloudflare and page content to load
      console.log('[INSPIRATION_SCREENSHOT] Waiting for page challenge to be solved...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      let title = await page.title();
      console.log(`[INSPIRATION_SCREENSHOT] Current page title after wait: ${title}`);
      
      // Keep waiting until we get past protection pages
      let attempts = 0;
      while ((title.includes('Just a moment') || title.includes('Cloudflare') || title.includes('Please wait')) && attempts < 6) {
        attempts++;
        console.log(`[INSPIRATION_SCREENSHOT] Still on protection page, attempt ${attempts}/6. Waiting 8 more seconds...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
        title = await page.title();
        console.log(`[INSPIRATION_SCREENSHOT] Page title after wait ${attempts}: ${title}`);
      }
      
      // Additional wait for page content to fully render
      console.log('[INSPIRATION_SCREENSHOT] Waiting for page content to fully render...');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Wait for content to load
      await this.waitForMeaningfulContent(page, 10000);

      // Handle cookie consent and popups
      await this.handleCommonPopups(page);

      // Wait for any animations to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      const urlSafe = this.sanitizeUrlForFilename(url);
      
      // Capture full page screenshot
      if (options.fullPage !== false) {
        try {
          const fullPagePath = path.join(this.screenshotDir, `${urlSafe}_full_${Date.now()}.png`);
          await page.screenshot({ 
            path: fullPagePath,
            fullPage: true,
            type: options.format || 'png'
          });
          
          results.push({
            url,
            filePath: fullPagePath,
            type: 'full',
            success: true,
            timestamp
          });
          
          console.log(`[INSPIRATION_SCREENSHOT] Full page captured: ${fullPagePath}`);
        } catch (error) {
          results.push({
            url,
            filePath: '',
            type: 'full',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp
          });
        }
      }

      // Capture viewport screenshot
      if (options.viewportOnly !== false) {
        try {
          const viewportPath = path.join(this.screenshotDir, `${urlSafe}_viewport_${Date.now()}.png`);
          await page.screenshot({ 
            path: viewportPath,
            fullPage: false,
            type: options.format || 'png'
          });
          
          results.push({
            url,
            filePath: viewportPath,
            type: 'viewport',
            success: true,
            timestamp
          });
          
          console.log(`[INSPIRATION_SCREENSHOT] Viewport captured: ${viewportPath}`);
        } catch (error) {
          results.push({
            url,
            filePath: '',
            type: 'viewport',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp
          });
        }
      }

      // Capture specific sections if requested
      if (options.sections && options.sections.length > 0) {
        for (const selector of options.sections) {
          try {
            const element = await page.$(selector);
            if (element) {
              const sectionName = selector.replace(/[^a-zA-Z0-9]/g, '_');
              const sectionPath = path.join(this.screenshotDir, `${urlSafe}_${sectionName}_${Date.now()}.png`);
              
              await element.screenshot({ 
                path: sectionPath,
                type: options.format || 'png'
              });
              
              results.push({
                url,
                filePath: sectionPath,
                type: 'section',
                sectionName: selector,
                success: true,
                timestamp
              });
              
              console.log(`[INSPIRATION_SCREENSHOT] Section captured: ${sectionPath}`);
            }
          } catch (error) {
            results.push({
              url,
              filePath: '',
              type: 'section',
              sectionName: selector,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp
            });
          }
        }
      }

    } catch (error) {
      console.error(`[INSPIRATION_SCREENSHOT] Failed to capture screenshots for ${url}:`, error);
      results.push({
        url,
        filePath: '',
        type: 'full',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return results;
  }

  /**
   * Capture screenshots from multiple inspiration websites
   */
  async captureBatchScreenshots(
    urls: string[], 
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult[]> {
    const allResults: ScreenshotResult[] = [];
    
    console.log(`[INSPIRATION_SCREENSHOT] Starting batch capture for ${urls.length} URLs`);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[INSPIRATION_SCREENSHOT] Processing ${i + 1}/${urls.length}: ${url}`);
      
      try {
        const results = await this.captureWebsiteScreenshots(url, options);
        allResults.push(...results);
        
        // Rate limiting: wait between captures to be respectful
        if (i < urls.length - 1) {
          console.log(`[INSPIRATION_SCREENSHOT] Waiting 3s before next capture...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`[INSPIRATION_SCREENSHOT] Batch capture failed for ${url}:`, error);
        allResults.push({
          url,
          filePath: '',
          type: 'full',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const successCount = allResults.filter(r => r.success).length;
    console.log(`[INSPIRATION_SCREENSHOT] Batch complete: ${successCount}/${allResults.length} screenshots captured`);
    
    return allResults;
  }

  /**
   * Wait for meaningful content to load (based on existing takeScreenshot function)
   */
  private async waitForMeaningfulContent(page: any, maxMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const hasContent = await page.evaluate(() => {
        const doc = (globalThis as any).document as any;
        if (!doc || !doc.body) return false;
        
        // Check for common content containers
        const roots = ['#root', '#app', 'main', 'body', '.container', '.content'];
        for (const sel of roots) {
          const el = doc.querySelector(sel) as any;
          if (el && el.getBoundingClientRect) {
            const r = el.getBoundingClientRect();
            if (r.height > 100 && r.width > 200) {
              // Check if there's actual text content or images
              const hasText = el.innerText && el.innerText.trim().length > 50;
              const hasImages = el.querySelectorAll('img').length > 0;
              const hasButtons = el.querySelectorAll('button, .btn, a[href]').length > 0;
              
              if (hasText || hasImages || hasButtons) return true;
            }
          }
        }
        return false;
      });
      
      if (hasContent) return true;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  /**
   * Handle common popups and cookie consent dialogs
   */
  private async handleCommonPopups(page: any): Promise<void> {
    try {
      // Common cookie consent button selectors
      const cookieSelectors = [
        'button[data-testid*="accept"]',
        'button[class*="accept"]',
        'button[class*="cookie"]',
        '[data-cy="accept-all"]',
        '.accept-cookies',
        '#accept-cookies',
        'button:contains("Accept")',
        'button:contains("Got it")',
        'button:contains("OK")',
        'button:contains("Agree")'
      ];

      for (const selector of cookieSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Handle newsletter popups and overlays
      const overlaySelectors = [
        '.modal-backdrop',
        '.overlay',
        '[role="dialog"] button',
        '.close, .dismiss',
        'button[aria-label="Close"]'
      ];

      for (const selector of overlaySelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (e) {
          // Continue to next selector
        }
      }

    } catch (error) {
      // Popup handling is best-effort, don't fail the screenshot
      console.log(`[INSPIRATION_SCREENSHOT] Popup handling failed (non-critical):`, error);
    }
  }

  /**
   * Sanitize URL for use in filename
   */
  private sanitizeUrlForFilename(url: string): string {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }

  /**
   * Clean up old screenshot files
   */
  async cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    let deletedCount = 0;
    
    try {
      const files = await fs.readdir(this.screenshotDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.screenshotDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (e) {
          // Continue with other files
        }
      }
      
      console.log(`[INSPIRATION_SCREENSHOT] Cleanup completed: ${deletedCount} old screenshots deleted`);
    } catch (error) {
      console.error('[INSPIRATION_SCREENSHOT] Cleanup failed:', error);
    }
    
    return deletedCount;
  }

  /**
   * Get successful screenshot file paths from results
   */
  getSuccessfulScreenshots(results: ScreenshotResult[]): string[] {
    return results
      .filter(result => result.success && result.filePath)
      .map(result => result.filePath);
  }
}

/**
 * Convenience function for quick screenshot capture
 */
export async function captureInspirationScreenshots(
  urls: string[], 
  options: ScreenshotOptions = {}
): Promise<string[]> {
  const capturer = new InspirationScreenshotCapture();
  await capturer.init();
  
  const results = await capturer.captureBatchScreenshots(urls, {
    fullPage: true,
    viewportOnly: true,
    ...options
  });
  
  return capturer.getSuccessfulScreenshots(results);
}

export default InspirationScreenshotCapture;