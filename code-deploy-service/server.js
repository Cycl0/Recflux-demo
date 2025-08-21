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
  const { reactCode } = req.body;

  if (!reactCode) {
    return res.status(400).json({ error: 'reactCode is required' });
  }

  const tempDir = path.join(__dirname, 'temp-deploy');
  const templateDir = path.join(__dirname, 'template');

  try {
    const { execa } = await import('execa');

    // Clean up and create a temporary directory for the deployment
    await fs.emptyDir(tempDir);
    
    // Copy the React template to the temporary directory
    await fs.copy(templateDir, tempDir);

    // Runtime toolchain diagnostics
    try {
      const npmVer = execSync('npm -v').toString().trim();
      console.log('[DIAG] Node:', process.version, 'npm:', npmVer);
    } catch {}

    // Verify template integrity
    const pkgPath = path.join(tempDir, 'package.json');
    const lockPath = path.join(tempDir, 'package-lock.json');
    const srcAppPath = path.join(tempDir, 'src', 'App.jsx');
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error('Template package.json missing in temp-deploy. Ensure template/ was copied.');
    }
    if (!(await fs.pathExists(srcAppPath))) {
      throw new Error('Template src/App.jsx missing in temp-deploy.');
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
    const npmPath = '/usr/bin/npm'; // prefer Node 22 installed via NodeSource
    const baseEnv = {
      ...process.env,
      PATH: `/usr/bin:/usr/local/bin:${process.env.PATH || ''}`,
      NPM_CONFIG_CACHE: path.join(tempDir, '.npm-cache'),
      NPM_CONFIG_ENGINE_STRICT: 'false'
    };
    try {
      if (await fs.pathExists(lockPath)) {
        console.log('Using npm ci');
        await execa(npmPath, ['ci', '--no-audit', '--no-fund'], { cwd: tempDir, env: baseEnv });
      } else {
        console.log('Lockfile not found; using npm install');
        await execa(npmPath, ['install', '--no-audit', '--no-fund'], { cwd: tempDir, env: baseEnv });
      }
    } catch (e) {
      console.warn('Primary install failed, retrying with legacy peer deps...', e?.message || e);
      await execa(npmPath, ['install', '--no-audit', '--no-fund', '--legacy-peer-deps'], { cwd: tempDir, env: baseEnv });
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