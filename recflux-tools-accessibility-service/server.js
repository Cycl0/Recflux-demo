const express = require('express');
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3002;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

/**
 * Analyzes the current page state with Axe and captures screenshots.
 * Can capture the full page by scrolling or just the current viewport.
 */
async function analyzeAndScreenshot(page, height, fullPage = false) {
    console.log('Running analysis...');
    const accessibilityReport = await new AxePuppeteer(page).analyze();
    
    const screenshots = [];
    if (fullPage) {
        console.log('Capturing full page screenshot...');
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        for (let scrolled = 0; scrolled < bodyHeight; scrolled += height) {
            screenshots.push(await page.screenshot({ encoding: 'base64' }));
            await page.evaluate(h => window.scrollBy(0, h), height);
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait for scroll
        }
        // Scroll back to top to ensure subsequent actions are in a predictable state
        await page.evaluate(() => window.scrollTo(0, 0));
    } else {
        console.log('Capturing viewport screenshot...');
        screenshots.push(await page.screenshot({ encoding: 'base64' }));
    }

    return { accessibilityReport, screenshots };
}

/**
 * Executes a single action from the user-defined list.
 */
async function executeAction(page, { action, selector, duration, text, scrollType, x, y }) {
    console.log(`Executing action: '${action}'`);

    const getElement = async (rawSel) => {
        const sel = rawSel.trim();
        // Simple XPath detection, now including absolute paths starting with '/'.
        const isXPath = sel.startsWith('//') || sel.startsWith('(/') || sel.startsWith('/');
        const pptrSelector = isXPath ? `xpath/${sel}` : sel;
        const elementType = isXPath ? 'XPath' : 'CSS';

        console.log(`Searching for ${elementType} selector in all frames: ${sel}`);

        const frames = page.frames();
        const findPromises = frames.map(frame =>
            frame.waitForSelector(pptrSelector, { timeout: 120000, visible: true })
            .then(element => {
                if (!element) return Promise.reject(new Error('Element not found'));
                console.log(`Element found in frame: ${frame.url()}`);
                return element;
            })
        );

        try {
            const element = await Promise.any(findPromises);
            await element.evaluate(el => el.scrollIntoView({ block: 'center' }));
            return element;
        } catch (error) {
            console.error('Element not found in any frame after waiting.', error);
            throw new Error(`Could not find a visible element with ${elementType} selector: ${sel} in any frame.`);
        }
    };

    switch (action) {
        case 'wait':
            if (typeof duration === 'number') {
                console.log(`Waiting for ${duration}ms`);
                await new Promise(resolve => setTimeout(resolve, duration));
            } else if (typeof selector === 'string') {
                console.log(`Waiting for selector: ${selector}`);
                await getElement(selector);
            } else {
                throw new Error(`'wait' action requires either a 'duration' or a 'selector' property.`);
            }
            break;

        case 'type':
            if (typeof selector !== 'string' || typeof text !== 'string') {
                throw new Error(`'type' action requires 'selector' and 'text' properties.`);
            }
            console.log(`Typing "${text}" into selector: ${selector}`);
            const elementToType = await getElement(selector);
            await elementToType.type(text);
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 120000 });
            break;

        case 'click':
            if (typeof selector !== 'string') {
                throw new Error(`'click' action requires a 'selector' property.`);
            }
            console.log(`Clicking on selector: ${selector}`);
            const elementToClick = await getElement(selector);
            await elementToClick.click();
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 120000 });
            break;

        case 'scroll':
            if (!scrollType) {
                throw new Error(`'scroll' action requires a 'scrollType' property ('element', 'by', or 'to').`);
            }
            console.log(`Scrolling (type: ${scrollType})`);
            switch (scrollType) {
                case 'element':
                    if (typeof selector !== 'string') {
                        throw new Error(`'scroll' of type 'element' requires a 'selector' property.`);
                    }
                    await getElement(selector); // getElement already scrolls to center
                    break;
                case 'by':
                    if (typeof x !== 'number' && typeof y !== 'number') {
                        throw new Error(`'scroll' of type 'by' requires an 'x' or 'y' numeric property.`);
                    }
                    console.log(`Scrolling by x: ${x}, y: ${y}`);
                    await page.evaluate(({ x, y }) => {
                        console.log(`Browser: Scrolling by x: ${x}, y: ${y}`);
                        window.scrollBy(x || 0, y || 0);
                        return { 
                            scrollX: window.scrollX, 
                            scrollY: window.scrollY 
                        };
                    }, { x: Number(x) || 0, y: Number(y) || 0 });
                    break;
                case 'to':
                    if (typeof x !== 'number' && typeof y !== 'number') {
                        throw new Error(`'scroll' of type 'to' requires an 'x' or 'y' numeric property.`);
                    }
                    console.log(`Scrolling to x: ${x}, y: ${y}`);
                    await page.evaluate(({ x, y }) => {
                        console.log(`Browser: Scrolling to x: ${x}, y: ${y}`);
                        window.scrollTo(x || 0, y || 0);
                        return { 
                            scrollX: window.scrollX, 
                            scrollY: window.scrollY 
                        };
                    }, { x: Number(x) || 0, y: Number(y) || 0 });
                    break;
                default:
                    throw new Error(`Unknown scrollType: ${scrollType}`);
            }
            // Wait a bit after scrolling to ensure the page has settled
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 120000 });
            break;

        default:
            console.warn(`Unknown action type: ${action}`);
    }
}

/**
 * Runs a full test sequence on a single URL.
 */
async function runTestFlow(browser, url, resolution, actions = []) {
    let page;
    try {
        page = await browser.newPage();
        await page.setViewport(resolution);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 120000 });

        const testStates = [];

        // 1. Analyze initial page state (full page screenshot)
        console.log('Analyzing initial page state...');
        const initialState = await analyzeAndScreenshot(page, resolution.height, true);
        testStates.push({ trigger: 'initial-load', details: url, ...initialState });

        // 2. Execute actions and analyze each resulting state (viewport screenshot)
        for (const action of actions) {
            await executeAction(page, action);
            console.log(`Analyzing state after action: '${action.action}'`);
            
            // Add a fixed delay to allow for client-side rendering to settle
            console.log('Waiting for 1 second for UI to stabilize...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const postActionState = await analyzeAndScreenshot(page, resolution.height, false);
            
            let details;
            switch (action.action) {
                case 'wait':
                    details = action.duration ? `wait-${action.duration}ms` : `wait-for:${action.selector}`;
                    break;
                case 'type':
                    details = `type-${action.text}-in:${action.selector}`;
                    break;
                case 'click':
                    details = `click:${action.selector}`;
                    break;
                case 'scroll':
                    switch(action.scrollType) {
                        case 'element':
                            details = `scroll-to-element:${action.selector}`;
                            break;
                        case 'by':
                            details = `scroll-by:x=${action.x || 0},y=${action.y || 0}`;
                            break;
                        case 'to':
                            details = `scroll-to:x=${action.x || 0},y=${action.y || 0}`;
                            break;
                        default:
                            details = `scroll`;
                    }
                    break;
                default:
                    details = action.selector || 'N/A';
            }

            testStates.push({ 
                trigger: `after-${action.action}`, 
                details: details, 
                ...postActionState 
            });
        }
        return { url, states: testStates };
    } finally {
        if (page) await page.close();
    }
}

app.post('/test', async (req, res) => {
    const { urls, resolution, actions } = req.body;

    if (!Array.isArray(urls) || !urls.length || !resolution) {
        return res.status(400).json({ error: 'Request must include `urls` (array) and `resolution` object.' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu' ] });
        
        const allResults = [];
        for (const url of urls) {
            const result = await runTestFlow(browser, url, resolution, actions);
            allResults.push(result);
        }
        res.status(200).json(allResults);
    } catch (error) {
        console.error('An error occurred during the test flow:', error);
        res.status(500).json({ error: 'Failed to complete test flow.', details: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(port, () => {
    console.log(`Microservice listening on port ${port}`);
}); 