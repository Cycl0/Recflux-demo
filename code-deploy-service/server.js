require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

const app = express();
const port = process.env.PORT || 3003;

// In-memory store for tracking active deployments (prevent duplicates)
const activeDeployments = new Map();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Code Deploy Service API',
      version: '1.0.0',
      description: 'API for deploying React code to temporary environments using Vercel',
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

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for potentially large codebases

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('[CODE-DEPLOY-SERVICE] Health check at /health');
  res.status(200).json({ status: 'healthy', service: 'code-deploy-service', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /deploy:
 *   post:
 *     summary: Deploy React code
 *     description: Deploy React code to a temporary environment using Vercel and capture a screenshot
 *     tags: [Deployment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reactCode
 *             properties:
 *               reactCode:
 *                 type: string
 *                 description: The React code to deploy (can include render() call or export statement)
 *                 example: "const App = () => { const [count, setCount] = React.useState(0); return ( <div> <h1>Hello from Deployed React!</h1> <h2>Count: {count}</h2> <button onClick={() => setCount(count + 1)}>Increment</button> </div> ); }; render(<App />);"
 *     responses:
 *       200:
 *         description: Deployment successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: "Deployment successful!"
 *                 deploymentUrl:
 *                   type: string
 *                   description: URL of the deployed application
 *                   example: "https://your-app.vercel.app"
 *                 screenshot:
 *                   type: string
 *                   description: Base64 encoded screenshot of the deployed site
 *                   format: base64
 *       400:
 *         description: Bad request - reactCode is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "reactCode is required"
 *       500:
 *         description: Internal server error during deployment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                 details:
 *                   type: string
 *                   description: Detailed error information
 */
app.post('/deploy', async (req, res) => {
  // Support both legacy { reactCode } and generic { code, language, platform }
  const { reactCode: reactCodeLegacy, code, language, platform, options } = req.body || {};
  const reactCode = reactCodeLegacy || code;

  if (!reactCode) {
    return res.status(400).json({ error: 'reactCode (or code) is required' });
  }
  if (code && !reactCodeLegacy) {
    console.log('[DEPLOY] Received generic payload:', { language, platform, hasOptions: !!options });
  }

  // Create a hash of the code to detect duplicate requests
  const crypto = require('crypto');
  const codeHash = crypto.createHash('sha256').update(reactCode).digest('hex').substring(0, 16);
  
  // Check if this exact code is already being deployed
  if (activeDeployments.has(codeHash)) {
    const existingDeployment = activeDeployments.get(codeHash);
    console.log(`[DUPLICATE] Rejecting duplicate deployment request for code hash: ${codeHash}`);
    return res.status(429).json({ 
      error: 'Deployment already in progress', 
      details: `This code is already being deployed (started ${new Date(existingDeployment.startTime).toISOString()})`,
      deploymentId: existingDeployment.deploymentId
    });
  }

  // Create unique temp directory for this deployment to avoid race conditions
  const deploymentId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const tempDir = path.join(__dirname, `temp-deploy-${deploymentId}`);
  const templateDir = path.join(__dirname, 'template');
  
  // Track this deployment to prevent duplicates
  activeDeployments.set(codeHash, {
    deploymentId,
    startTime: Date.now(),
    tempDir
  });
  
  console.log(`[DEPLOY-${deploymentId}] Starting deployment with unique temp directory (code hash: ${codeHash})`);

  try {
    const { execa } = await import('execa');

    // Debug path information
    console.log(`[DEPLOY-${deploymentId}] __dirname:`, __dirname);
    console.log(`[DEPLOY-${deploymentId}] tempDir:`, tempDir);
    console.log(`[DEPLOY-${deploymentId}] templateDir:`, templateDir);
    
    // Verify template directory exists before copying
    if (!(await fs.pathExists(templateDir))) {
      throw new Error(`Template directory does not exist: ${templateDir}`);
    }
    
    // Check template directory contents
    const templateContents = await fs.readdir(templateDir);
    console.log('[DEBUG] Template directory contents:', templateContents);

    // Clean up and create a temporary directory for the deployment
    await fs.emptyDir(tempDir);
    
    // Ensure temp directory exists
    await fs.ensureDir(tempDir);
    
    // Copy the React template to the temporary directory
    console.log('[DEBUG] Copying template from:', templateDir, 'to:', tempDir);
    await fs.copy(templateDir, tempDir);
    
    // Verify copy was successful
    const tempContents = await fs.readdir(tempDir);
    console.log('[DEBUG] Temp directory contents after copy:', tempContents);

    // Runtime toolchain diagnostics
    try {
      const npmVer = execSync('npm -v').toString().trim();
      console.log('[DIAG] Node:', process.version, 'npm:', npmVer);
    } catch {}

    // Verify template integrity
    const pkgPath = path.join(tempDir, 'package.json');
    const lockPath = path.join(tempDir, 'package-lock.json');
    const srcAppPath = path.join(tempDir, 'src', 'App.jsx');
    
    console.log('[DEBUG] Checking for package.json at:', pkgPath);
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error(`Template package.json missing in temp-deploy at ${pkgPath}. Ensure template/ was copied.`);
    }
    
    console.log('[DEBUG] Checking for App.jsx at:', srcAppPath);
    if (!(await fs.pathExists(srcAppPath))) {
      throw new Error(`Template src/App.jsx missing in temp-deploy at ${srcAppPath}.`);
    }

    // Process the incoming React code
    // Ensure React is imported for CSSProperties assertion
    const imports = "import React, { useState, useEffect, useReducer, useRef, useCallback, useMemo, useContext, Component } from 'react';\n\n";
    let processedCode = reactCode;

    // This regex finds style props with object literals and adds the type assertion.
    // It looks for style={{ and finds the matching }}
    processedCode = processedCode.replace(/style={({[^}]*})}/g, 'style={$1 as React.CSSProperties}');

    let exportStatement = '';
    
    const renderRegex = /render\s*\(\s*<([A-Z][A-Za-z0-9_]+)\s*\/>\s*\);?/;
    const match = reactCode.match(renderRegex);

    if (match && match[1]) {
      const componentName = match[1];
      console.log(`Found component "${componentName}" to export.`);
      
      // Remove the render() call and prepare the export statement
      processedCode = reactCode.replace(renderRegex, '').trim();
      exportStatement = `\n\nexport default ${componentName};\n`;
    } else {
      console.warn("Warning: render() call not found. Using code as-is without adding export.");
    }

    const finalCode = imports + processedCode + exportStatement;

    // Overwrite the App.tsx in the template with the processed code
    const appFilePath = path.join(tempDir, 'src', 'App.jsx');
    await fs.writeFile(appFilePath, finalCode);

    // Install dependencies in the temporary directory
    console.log('Installing dependencies in temp directory...');
    console.log('[DEBUG] Installing dependencies in:', tempDir);
    
    // Double-check that package.json exists before running npm
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error(`Cannot install dependencies: package.json not found at ${pkgPath}`);
    }
    
    const npmPath = '/usr/bin/npm'; // prefer Node 22 installed via NodeSource
    const baseEnv = {
      ...process.env,
      PATH: `/usr/bin:/usr/local/bin:${process.env.PATH || ''}`,
      NPM_CONFIG_CACHE: path.join(tempDir, '.npm-cache'),
      NPM_CONFIG_ENGINE_STRICT: 'false'
    };
    
    console.log('[DEBUG] npm path:', npmPath);
    console.log('[DEBUG] working directory:', tempDir);
    console.log('[DEBUG] package.json exists:', await fs.pathExists(pkgPath));
    
    try {
      if (await fs.pathExists(lockPath)) {
        console.log('Using npm ci');
        await execa(npmPath, ['ci', '--no-audit', '--no-fund'], { cwd: tempDir, env: baseEnv });
      } else {
        console.log('Lockfile not found; using npm install');
        await execa(npmPath, ['install', '--no-audit', '--no-fund'], { cwd: tempDir, env: baseEnv });
      }
    } catch (e) {
      console.error('Primary install failed with error:', e);
      console.warn('Primary install failed, retrying with legacy peer deps...', e?.message || e);
      try {
        await execa(npmPath, ['install', '--no-audit', '--no-fund', '--legacy-peer-deps'], { cwd: tempDir, env: baseEnv });
      } catch (retryError) {
        console.error('Retry install also failed:', retryError);
        throw new Error(`npm install failed: ${retryError.message}. Working directory: ${tempDir}, package.json exists: ${await fs.pathExists(pkgPath)}`);
      }
    }

    // Run the Vercel deployment command
    console.log('Starting Vercel deployment (public)...');
    const { stdout } = await execa(
      'vercel',
      ['--prod', '--public', '--yes', '--token', process.env.VERCEL_TOKEN],
      {
        cwd: tempDir,
        // Pass parent environment variables to the child process
        env: { ...process.env },
      }
    );

    console.log('Vercel deployment command output:', stdout);

    // The stdout of the Vercel CLI command is the deployment URL
    const deploymentUrl = stdout;
    
    console.log(`Deployment successful! URL: ${deploymentUrl}`);

    // Take a screenshot of the deployed site
    console.log('Taking screenshot...');
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(deploymentUrl, { waitUntil: 'networkidle0' });
    const screenshotBuffer = await page.screenshot({ encoding: 'base64' });
    await browser.close();
    console.log('Screenshot taken successfully.');

    res.status(200).json({
      message: 'Deployment successful!',
      deploymentUrl: deploymentUrl,
      screenshot: screenshotBuffer,
    });

  } catch (error) {
    console.error('Deployment failed:', error);
    res.status(500).json({ error: 'Deployment failed', details: error.message });
  } finally {
    // Remove from active deployments tracking
    activeDeployments.delete(codeHash);
    
    // Clean up the unique temp directory
    try {
      await fs.remove(tempDir);
      console.log(`[DEPLOY-${deploymentId}] Cleanup: Removed temp directory and cleared active deployment: ${tempDir}`);
    } catch (cleanupError) {
      console.warn(`[DEPLOY-${deploymentId}] Cleanup: Failed to remove temp directory ${tempDir}:`, cleanupError.message);
    }
  }
});

app.listen(port, () => {
  console.log(`code-deploy-service listening at http://localhost:${port}`);
  console.log(`API documentation available at http://localhost:${port}/api-docs`);
}); 

/*

USAGE EXAMPLE:

curl -X POST http://localhost:3003/deploy \
-H "Content-Type: application/json" \
-d '{
  "reactCode": "const App = () => { const [count, setCount] = React.useState(0); return ( <div> <h1>Hello from Deployed React!</h1> <h2>Count: {count}</h2> <button onClick={() => setCount(count + 1)}>Increment</button> </div> ); }; render(<App />);"
}'

*/