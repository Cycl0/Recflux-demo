const express = require('express');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const cors = require('cors');
const axios = require('axios');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = process.env.PORT || 3002;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Accessibility Testing Service API',
      version: '1.0.0',
      description: 'API for automated accessibility testing with Playwright and Axe-core',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./server.js'], // Path to the API docs
};

const specs = swaggerJsdoc(swaggerOptions);

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * Analyzes the current page state with Axe and captures screenshots.
 * Can capture the full page by scrolling or just the current viewport.
 */
async function analyzeAndScreenshot(page, fullPage = false) {
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
                // Create a new AxeBuilder instance and attach it to the page
                const axe = new AxeBuilder({ page })
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
            console.log('Capturing multiple viewport screenshots...');
            
            // Get viewport size and page dimensions
            const viewportSize = page.viewportSize();
            const pageHeight = await page.evaluate(() => {
                return Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.offsetHeight,
                    document.body.clientHeight,
                    document.documentElement.clientHeight
                );
            });
            
            const viewportHeight = viewportSize.height;
            console.log(`Page height: ${pageHeight}px, Viewport height: ${viewportHeight}px`);
            
            // Use a smaller step size to ensure some overlap between screenshots
            // This helps with content that might be cut off at viewport boundaries
            const scrollStep = Math.floor(viewportHeight * 0.8); // 80% of viewport height for overlap
            
            // Calculate number of screenshots needed with overlap
            const screenshotsNeeded = Math.ceil(pageHeight / scrollStep);
            console.log(`Taking ${screenshotsNeeded} viewport screenshots with overlap`);
            
            // Save original scroll position to restore later
            const originalScrollY = await page.evaluate(() => window.scrollY);
            
            // First take a screenshot of the top of the page
            console.log('Taking screenshot at top of page');
            await page.evaluate(() => window.scrollTo(0, 0));
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                await page.waitForLoadState('networkidle', { timeout: 5000 });
            } catch (e) {
                console.log('Network did not reach idle state, continuing anyway');
            }
            
            let topScreenshotData = await page.screenshot();
            if (Buffer.isBuffer(topScreenshotData)) {
                screenshots.push(topScreenshotData.toString('base64'));
            } else if (typeof topScreenshotData === 'string') {
                screenshots.push(topScreenshotData);
            }
            
            // Then take screenshots at intervals down the page
            for (let i = 1; i < screenshotsNeeded - 1; i++) {
                // Scroll to position with overlap
                const scrollTo = i * scrollStep;
                console.log(`Scrolling to position ${scrollTo}px`);
                
                // Use smooth scrolling to help trigger lazy loading
                await page.evaluate(async (scrollY) => {
                    // Scroll in smaller steps to trigger lazy loading
                    const currentY = window.scrollY;
                    const distance = scrollY - currentY;
                    const steps = 10;
                    const stepSize = distance / steps;
                    
                    for (let step = 1; step <= steps; step++) {
                        window.scrollTo(0, currentY + stepSize * step);
                        // Small delay between scroll steps
                        await new Promise(r => setTimeout(r, 50));
                    }
                    
                    // Final scroll to exact position
                    window.scrollTo(0, scrollY);
                    return window.scrollY;
                }, scrollTo);
                
                // Wait longer for content to render and lazy-loaded elements to appear
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Ensure all network requests have completed
                try {
                    await page.waitForLoadState('networkidle', { timeout: 5000 });
                } catch (e) {
                    console.log('Network did not reach idle state after scrolling, continuing anyway');
                }
                
                // Force a repaint to ensure content is properly rendered
                await page.evaluate(() => {
                    // This forces a layout recalculation
                    document.body.getBoundingClientRect();
                    
                    // Check if there are any lazy-loaded images in the viewport
                    const viewportHeight = window.innerHeight;
                    const images = Array.from(document.querySelectorAll('img'));
                    const imagesInViewport = images.filter(img => {
                        const rect = img.getBoundingClientRect();
                        return rect.top >= 0 && rect.bottom <= viewportHeight;
                    });
                    
                    console.log(`Found ${imagesInViewport.length} images in viewport`);
                    
                    // Return information about the viewport for debugging
                    return {
                        scrollY: window.scrollY,
                        viewportHeight,
                        imagesCount: imagesInViewport.length
                    };
                });
                
                // Take screenshot
                console.log(`Taking screenshot at scroll position ${scrollTo}px`);
                const screenshotData = await page.screenshot();
                
                // Convert Buffer to base64 string
                if (Buffer.isBuffer(screenshotData)) {
                    const base64String = screenshotData.toString('base64');
                    screenshots.push(base64String);
                } else if (typeof screenshotData === 'string') {
                    screenshots.push(screenshotData);
                }
            }
            
            // Finally, take a screenshot at the bottom of the page
            if (screenshotsNeeded > 1) {
                console.log('Taking screenshot at bottom of page');
                await page.evaluate((pageHeight) => {
                    window.scrollTo(0, pageHeight);
                }, pageHeight);
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                try {
                    await page.waitForLoadState('networkidle', { timeout: 5000 });
                } catch (e) {
                    console.log('Network did not reach idle state, continuing anyway');
                }
                
                let bottomScreenshotData = await page.screenshot();
                if (Buffer.isBuffer(bottomScreenshotData)) {
                    screenshots.push(bottomScreenshotData.toString('base64'));
                } else if (typeof bottomScreenshotData === 'string') {
                    screenshots.push(bottomScreenshotData);
                }
            }
            
            // Scroll back to original position
            await page.evaluate((scrollY) => window.scrollTo(0, scrollY), originalScrollY);
            
        } else {
            // Just take a single viewport screenshot
            console.log('Capturing viewport screenshot...');
            const screenshotData = await page.screenshot();
            
            // Convert Buffer to base64 string
            if (Buffer.isBuffer(screenshotData)) {
                const base64String = screenshotData.toString('base64');
                screenshots.push(base64String);
            } else if (typeof screenshotData === 'string') {
                screenshots.push(screenshotData);
            }
        }
        
        console.log(`Captured ${screenshots.length} screenshots`);
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
        const isXPath = sel.startsWith('//') || sel.startsWith('(/') || sel.startsWith('/');
        const playwrightSelector = isXPath ? `xpath=${sel}` : sel;
        const elementType = isXPath ? 'XPath' : 'CSS';

        console.log(`Searching for ${elementType} selector in all frames: ${sel}`);
        const frames = page.frames();
        const findPromises = frames.map(frame =>
            frame.waitForSelector(playwrightSelector, { timeout: 120000, visible: true })
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
                await elementToType.fill(text); // Use Playwright's robust fill method
                await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(e => 
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
                await elementToClick.click({ force: true, timeout: 60000 });
                await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(e =>
                    console.log('Network did not reach idle state after clicking, continuing anyway')
                );
            } catch (clickError) {
                console.error(`Error clicking element: ${clickError.message}`);
                throw new Error(`Failed to click element: ${clickError.message}`);
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
                    await getElement(selector);
                    break;
                case 'by':
                    if (typeof x !== 'number' && typeof y !== 'number') {
                        throw new Error(`'scroll' of type 'by' requires an 'x' or 'y' numeric property.`);
                    }
                    console.log(`Scrolling by x: ${x}, y: ${y}`);
                    await page.evaluate(({ x, y }) => window.scrollBy(x || 0, y || 0), { x: Number(x) || 0, y: Number(y) || 0 });
                    break;
                case 'to':
                    if (typeof x !== 'number' && typeof y !== 'number') {
                        throw new Error(`'scroll' of type 'to' requires an 'x' or 'y' numeric property.`);
                    }
                    console.log(`Scrolling to x: ${x}, y: ${y}`);
                    await page.evaluate(({ x, y }) => window.scrollTo(x || 0, y || 0), { x: Number(x) || 0, y: Number(y) || 0 });
                    break;
                default:
                    throw new Error(`Unknown scrollType: ${scrollType}`);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(e =>
                console.log('Network did not reach idle state after scrolling, continuing anyway')
            );
            break;

        default:
            console.warn(`Unknown action type: ${action}`);
    }
}

/**
 * Runs a full test sequence on a single URL.
 */
async function runTestFlow(browser, url, resolution, actions = []) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setViewportSize(resolution);
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' }).catch(e => {
        console.warn(`Navigation to ${url} failed, but continuing. Error: ${e.message}`);
    });

    const results = [];

    // Initial analysis - use full page for the initial state
    console.log('Running initial analysis...');
    const initialResult = await analyzeAndScreenshot(page, true);
    console.log(`Initial screenshots count: ${initialResult.screenshots?.length || 0}`);
    
    results.push({
        action: 'initial',
        ...initialResult
    });

    // Execute actions
    for (const action of actions) {
        await executeAction(page, action);
        // Take only a viewport screenshot after actions (not full page)
        const resultAfterAction = await analyzeAndScreenshot(page, false);
        console.log(`Action ${action.action} screenshots count: ${resultAfterAction.screenshots?.length || 0}`);
        
        results.push({
            action: action.action,
            selector: action.selector,
            text: action.text, // Include text for type actions
            scrollType: action.scrollType, // Include scroll type for scroll actions
            x: action.x, // Include x for scroll actions
            y: action.y, // Include y for scroll actions
            duration: action.duration, // Include duration for wait actions
            ...resultAfterAction
        });
    }

    try {
        // Create a version of the results without the large screenshot data for Kafka
        const resultsForKafka = {
            url,
            resolution,
            actions, // Send actions for context
            states: results.map(state => {
                // Omit the 'screenshots' key
                const { screenshots, ...stateWithoutScreenshots } = state;
                return stateWithoutScreenshots;
            })
        };

        await axios.post('http://kafka-producer-service:3004/publish', resultsForKafka);
        console.log('Successfully published test results to Kafka service.');
    } catch (error) {
        console.error('Failed to publish test results to Kafka service:', error.message);
    }

    // Log final results structure before returning
    console.log(`Final results count: ${results.length}`);
    for (let i = 0; i < results.length; i++) {
        console.log(`Result ${i} action: ${results[i].action}`);
        console.log(`Result ${i} has screenshots: ${results[i].screenshots !== undefined}`);
        if (results[i].screenshots) {
            console.log(`Result ${i} screenshots count: ${results[i].screenshots.length}`);
        }
    }

    await context.close();
    return results;
}

/**
 * @swagger
 * /test-accessibility:
 *   post:
 *     summary: Test accessibility of websites
 *     description: Perform automated accessibility testing on multiple URLs with screenshots and Axe-core analysis
 *     tags: [Accessibility Testing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *               - resolution
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of URLs to test
 *                 example: ["https://example.com", "https://test.com"]
 *               resolution:
 *                 type: object
 *                 required:
 *                   - width
 *                   - height
 *                 properties:
 *                   width:
 *                     type: number
 *                     description: Viewport width
 *                     example: 1920
 *                   height:
 *                     type: number
 *                     description: Viewport height
 *                     example: 1080
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       enum: [wait, type, click, scroll]
 *                       description: Type of action to perform
 *                     selector:
 *                       type: string
 *                       description: CSS selector or XPath for the element
 *                     text:
 *                       type: string
 *                       description: Text to type (for type action)
 *                     duration:
 *                       type: number
 *                       description: Duration to wait in milliseconds (for wait action)
 *                     scrollType:
 *                       type: string
 *                       enum: [element, by, to]
 *                       description: Type of scroll (for scroll action)
 *                     x:
 *                       type: number
 *                       description: X coordinate for scroll
 *                     y:
 *                       type: number
 *                       description: Y coordinate for scroll
 *                 description: Array of actions to perform on each page
 *                 example: [{ action: "click", selector: "button" }, { action: "wait", duration: 2000 }]
 *     responses:
 *       200:
 *         description: Accessibility test results with screenshots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                     description: The URL that was tested
 *                   states:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         action:
 *                           type: string
 *                           description: Action performed or 'initial' for initial state
 *                         accessibilityReport:
 *                           type: object
 *                           properties:
 *                             violations:
 *                               type: array
 *                               description: Accessibility violations found
 *                             passes:
 *                               type: array
 *                               description: Accessibility checks that passed
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                         screenshots:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: base64
 *                           description: Base64 encoded screenshots
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Request must include `urls` (array) and `resolution` object."
 *       500:
 *         description: Internal server error during testing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to complete test flow."
 *                 details:
 *                   type: string
 *                   description: Detailed error information
 *                 stack:
 *                   type: string
 *                   description: Error stack trace
 */
app.post('/test-accessibility', async (req, res) => {
    const { urls, resolution, actions } = req.body;

    if (!Array.isArray(urls) || !urls.length || !resolution) {
        return res.status(400).json({ error: 'Request must include `urls` (array) and `resolution` object.' });
    }

    let browser;
    try {
        // Launch browser with additional options for stability
        console.log('Launching browser...');
        browser = await chromium.launch({ 
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
            const states = await runTestFlow(browser, url, resolution, actions);
            allResults.push({ url, states });
        }
        
        // Log final response structure
        console.log(`All results count: ${allResults.length}`);
        if (allResults.length > 0) {
            console.log(`First result URL: ${allResults[0].url}`);
            console.log(`First result states count: ${allResults[0].states.length}`);
            
            if (allResults[0].states.length > 0) {
                const firstState = allResults[0].states[0];
                console.log(`First state action: ${firstState.action}`);
                console.log(`First state has screenshots: ${firstState.screenshots !== undefined}`);
                
                if (firstState.screenshots) {
                    console.log(`First state screenshots count: ${firstState.screenshots.length}`);
                    
                    if (firstState.screenshots.length > 0) {
                        const firstScreenshot = firstState.screenshots[0];
                        console.log(`First screenshot type: ${typeof firstScreenshot}`);
                        console.log(`First screenshot is string: ${typeof firstScreenshot === 'string'}`);
                        
                        if (typeof firstScreenshot === 'string') {
                            console.log(`First screenshot length: ${firstScreenshot.length}`);
                            console.log(`First screenshot starts with: ${firstScreenshot.substring(0, 50)}...`);
                        }
                    }
                }
            }
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
    console.log(`API documentation available at http://localhost:${port}/api-docs`);
}); 