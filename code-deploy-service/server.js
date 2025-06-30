require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for potentially large codebases

// POST /deploy - The main endpoint for deploying React code
app.post('/deploy', async (req, res) => {
  const { reactCode } = req.body;

  if (!reactCode) {
    return res.status(400).json({ error: 'reactCode is required' });
  }

  const tempDir = path.join(__dirname, 'temp-deploy');
  const templateDir = path.join(__dirname, 'template');

  try {
    const { execa } = await import('execa');

    // 1. Clean up and create a temporary directory for the deployment
    await fs.emptyDir(tempDir);
    
    // 2. Copy the React template to the temporary directory
    await fs.copy(templateDir, tempDir);

    // 3. Process the incoming React code
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

    // 4. Overwrite the App.tsx in the template with the processed code
    const appFilePath = path.join(tempDir, 'src', 'App.jsx');
    await fs.writeFile(appFilePath, finalCode);

    // 5. Install dependencies in the temporary directory
    console.log('Installing dependencies in temp directory...');
    await execa('npm', ['install'], { cwd: tempDir });

    // 6. Run the Vercel deployment command
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

    // 7. The stdout of the Vercel CLI command is the deployment URL
    const deploymentUrl = stdout;
    
    console.log(`Deployment successful! URL: ${deploymentUrl}`);

    // 7. Take a screenshot of the deployed site
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
}); 

/*

USAGE EXAMPLE:

curl -X POST http://localhost:3003/deploy \
-H "Content-Type: application/json" \
-d '{
  "reactCode": "const App = () => { const [count, setCount] = React.useState(0); return ( <div> <h1>Hello from Deployed React!</h1> <h2>Count: {count}</h2> <button onClick={() => setCount(count + 1)}>Increment</button> </div> ); }; render(<App />);"
}'

*/