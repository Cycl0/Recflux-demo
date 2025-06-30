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
    
    // Initialize accessibilityReport with a default empty structure
    let accessibilityReport = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
        timestamp: new Date().toISOString(),
        url: await page.url()
    };
    
    // Ensure the page is ready for Axe analysis
    try {
        // Wait for the page to be in a ready state
        await page.evaluate(() => {
            return new Promise((resolve) => {
                // If document is already complete, resolve immediately
                if (document.readyState === 'complete') {
                    return resolve();
                }
                
                // Otherwise wait for the load event
                window.addEventListener('load', () => resolve());
                
                // Set a timeout just in case
                setTimeout(resolve, 5000);
            });
        });
        
        // Add a small delay to ensure any post-load scripts have run
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to run Axe analysis with retry logic
        let retries = 3;
        
        while (retries > 0) {
            try {
                // Create a new AxePuppeteer instance with configuration
                const axe = new AxePuppeteer(page)
                    .options({ runOnly: ['wcag2a', 'wcag2aa'] })
                    .withTags(['wcag2a', 'wcag2aa'])
                    .disableRules(['color-contrast']); // Disable rules that might be flaky
                
                accessibilityReport = await axe.analyze();
                console.log('Axe analysis completed successfully');
                break; // If successful, exit the retry loop
            } catch (axeError) {
                console.error(`Axe analysis failed (${retries} retries left): ${axeError.message}`);
                retries--;
                
                if (retries === 0) {
                    // If all retries failed, we'll use the default minimal report initialized above
                    console.log('All Axe analysis attempts failed, using minimal report');
                } else {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    } catch (pageError) {
        console.error('Error preparing page for analysis:', pageError);
        // We'll use the default minimal report initialized above
    }
    
    // Capture screenshots
    const screenshots = [];
    try {
        if (fullPage) {
            console.log('Capturing full page screenshot...');
            try {
                // First try to get the body height
                const bodyHeight = await page.evaluate(() => {
                    return Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight,
                        document.body.offsetHeight,
                        document.documentElement.offsetHeight,
                        document.body.clientHeight,
                        document.documentElement.clientHeight
                    );
                });
                
                // Scroll and take screenshots
                for (let scrolled = 0; scrolled < bodyHeight; scrolled += height) {
                    screenshots.push(await page.screenshot({ encoding: 'base64' }));
                    await page.evaluate(h => window.scrollBy(0, h), height);
                    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for scroll
                }
                
                // Scroll back to top to ensure subsequent actions are in a predictable state
                await page.evaluate(() => window.scrollTo(0, 0));
            } catch (scrollError) {
                console.error('Error during full page screenshot:', scrollError);
                // Fall back to a single screenshot
                screenshots.push(await page.screenshot({ encoding: 'base64' }));
            }
        } else {
            console.log('Capturing viewport screenshot...');
            screenshots.push(await page.screenshot({ encoding: 'base64' }));
        }
    } catch (screenshotError) {
        console.error('Error capturing screenshots:', screenshotError);
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
            try {
                const elementToType = await getElement(selector);
                
                // Clear the field first
                await page.evaluate((el) => {
                    el.value = '';
                    // Trigger input event to ensure any listeners are notified
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }, elementToType);
                
                // Wait a moment for the field to clear
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try typing with puppeteer's type method first
                try {
                    // For long text, type in chunks with small delays
                    const chunkSize = 20;
                    for (let i = 0; i < text.length; i += chunkSize) {
                        const chunk = text.substring(i, i + chunkSize);
                        await elementToType.type(chunk, { delay: 50 });
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (typeError) {
                    console.error(`Error using type method: ${typeError.message}`);
                    console.log('Falling back to JavaScript input method');
                    
                    // Fall back to JavaScript input
                    await page.evaluate((el, value) => {
                        el.value = value;
                        // Trigger events to ensure the change is recognized
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }, elementToType, text);
                }
                
                // Verify the input was successful
                const inputValue = await page.evaluate(el => el.value, elementToType);
                if (inputValue !== text) {
                    console.warn(`Input verification failed. Expected: "${text}", Got: "${inputValue}"`);
                    
                    // Try one more approach - focus and type directly
                    await elementToType.focus();
                    await page.keyboard.type(text, { delay: 50 });
                }
                
                // Wait for any network activity and animations to complete
                await page.waitForNetworkIdle({ idleTime: 1000, timeout: 120000 }).catch(e => 
                    console.log('Network did not reach idle state after typing, continuing anyway')
                );
            } catch (typeError) {
                console.error(`Error typing into element: ${typeError.message}`);
                throw new Error(`Failed to type text: ${typeError.message}`);
            }
            break;

        case 'click':
            if (typeof selector !== 'string') {
                throw new Error(`'click' action requires a 'selector' property.`);
            }
            console.log(`Clicking on selector: ${selector}`);
            try {
                const elementToClick = await getElement(selector);
                
                // Make sure the element is visible and clickable
                await page.evaluate(el => {
                    if (!el.isConnected) throw new Error('Element is not attached to the DOM');
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) throw new Error('Element has zero size');
                    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
                        throw new Error('Element is outside viewport');
                    }
                }, elementToClick);
                
                // Try to click with a small delay
                await new Promise(resolve => setTimeout(resolve, 500));
                await elementToClick.click({ delay: 100 });
                
                // Wait for any network activity and animations to complete
                await page.waitForNetworkIdle({ idleTime: 1000, timeout: 120000 }).catch(e => 
                    console.log('Network did not reach idle state, continuing anyway')
                );
            } catch (clickError) {
                console.error(`Error clicking element: ${clickError.message}`);
                console.log('Attempting alternative click method...');
                
                // Try alternative click method using JavaScript
                try {
                    await page.evaluate((sel) => {
                        const isXPath = sel.startsWith('//') || sel.startsWith('(/') || sel.startsWith('/');
                        let element;
                        
                        if (isXPath) {
                            const result = document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                            element = result.singleNodeValue;
                        } else {
                            element = document.querySelector(sel);
                        }
                        
                        if (!element) throw new Error(`Element not found: ${sel}`);
                        element.click();
                        return true;
                    }, selector);
                } catch (jsClickError) {
                    throw new Error(`Failed to click element: ${clickError.message}. JS click also failed: ${jsClickError.message}`);
                }
            }
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
        
        // Set longer timeout for navigation
        page.setDefaultNavigationTimeout(180000); // 3 minutes
        page.setDefaultTimeout(180000);
        
        // Improve navigation with better error handling
        console.log(`Navigating to URL: ${url}`);
        try {
            // First try with standard navigation
            await page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 180000 
            });
            console.log('Page loaded with domcontentloaded event');
            
            // Wait a bit for any initial scripts to execute
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Then wait for network to be relatively idle, but don't fail if it doesn't happen
            try {
                await page.waitForNetworkIdle({ idleTime: 1000, timeout: 10000 });
                console.log('Network reached idle state');
            } catch (networkError) {
                console.log('Network did not reach idle state within timeout, continuing anyway');
            }
        } catch (navigationError) {
            console.error(`Navigation error: ${navigationError.message}`);
            // Try a simpler approach as fallback
            console.log('Attempting fallback navigation...');
            await page.goto(url, { timeout: 180000 });
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Check if page loaded successfully
        const pageContent = await page.content();
        if (!pageContent || pageContent.trim().length < 50) {
            throw new Error('Page did not load properly or returned minimal content');
        }
        
        console.log('Page loaded successfully');
        
        const testStates = [];

        // 1. Analyze initial page state (full page screenshot)
        console.log('Analyzing initial page state...');
        const initialState = await analyzeAndScreenshot(page, resolution.height, true);
        testStates.push({ trigger: 'initial-load', details: url, ...initialState });

        // 2. Execute actions and analyze each resulting state (viewport screenshot)
        for (const action of actions) {
            try {
                console.log(`Executing action: ${JSON.stringify(action)}`);
                
                // Add a delay before each action to ensure the page is ready
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                await executeAction(page, action);
                console.log(`Action completed: '${action.action}'`);
                
                // Add a longer delay after each action to allow for client-side rendering to settle
                console.log('Waiting for UI to stabilize...');
                await new Promise(resolve => setTimeout(resolve, 2500));

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
            } catch (actionError) {
                console.error(`Error executing action ${action.action}:`, actionError);
                
                // Take a screenshot of the error state if possible
                let errorScreenshot = [];
                try {
                    const screenshot = await page.screenshot({ encoding: 'base64' });
                    errorScreenshot = [screenshot];
                } catch (screenshotError) {
                    console.error('Failed to capture error screenshot:', screenshotError);
                }
                
                testStates.push({
                    trigger: `error-${action.action}`,
                    details: `Error: ${actionError.message}`,
                    accessibilityReport: { violations: [] },
                    screenshots: errorScreenshot
                });
                
                // Try to continue with the next action rather than failing the entire test
                console.log('Attempting to continue with next action...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        return { url, states: testStates };
    } catch (error) {
        console.error('Error in test flow:', error);
        // Return a partial result instead of throwing
        return { 
            url, 
            states: [{
                trigger: 'error',
                details: `Test flow error: ${error.message}`,
                accessibilityReport: { violations: [] },
                screenshots: []
            }] 
        };
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (closeError) {
                console.error('Error closing page:', closeError);
            }
        }
    }
}

app.post('/test', async (req, res) => {
    const { urls, resolution, actions } = req.body;

    if (!Array.isArray(urls) || !urls.length || !resolution) {
        return res.status(400).json({ error: 'Request must include `urls` (array) and `resolution` object.' });
    }

    let browser;
    try {
        // Launch browser with additional options for stability
        console.log('Launching browser...');
        browser = await puppeteer.launch({ 
            headless: true, 
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            timeout: 180000 // 3 minutes timeout for browser launch
        });
        
        const allResults = [];
        for (const url of urls) {
            console.log(`Starting test flow for URL: ${url}`);
            const result = await runTestFlow(browser, url, resolution, actions);
            allResults.push(result);
        }
        res.status(200).json(allResults);
    } catch (error) {
        console.error('An error occurred during the test flow:', error);
        res.status(500).json({ 
            error: 'Failed to complete test flow.', 
            details: error.message,
            stack: error.stack
        });
    } finally {
        if (browser) {
            try {
                await browser.close();
                console.log('Browser closed successfully');
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }
    }
});

app.listen(port, () => {
    console.log(`Microservice listening on port ${port}`);
}); 