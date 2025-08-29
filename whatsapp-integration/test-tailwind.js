import { deployToCodeSandbox } from './dist/deploy-codesandbox.js';
import { promises as fs } from 'fs';
import path from 'path';

// Create a test project with Tailwind classes
async function createTestProject() {
    const testDir = 'test-tailwind-project';
    
    // Create directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'public'), { recursive: true });
    
    // Create package.json
    await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify({
        "name": "test-tailwind-app",
        "version": "1.0.0",
        "dependencies": {
            "react": "^18.0.0",
            "react-dom": "^18.0.0",
            "react-scripts": "5.0.1"
        },
        "scripts": {
            "start": "react-scripts start",
            "build": "react-scripts build"
        }
    }, null, 2));
    
    // Create App.js with Tailwind classes
    await fs.writeFile(path.join(testDir, 'src/App.js'), `import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Tailwind CSS Test
        </h1>
        <p className="text-gray-600 text-center mb-6">
          This should have proper Tailwind styling!
        </p>
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
          Click Me
        </button>
      </div>
    </div>
  );
}

export default App;`);
    
    // Create index.js
    await fs.writeFile(path.join(testDir, 'src/index.js'), `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`);
    
    // Create index.css (basic, no Tailwind directives - should be auto-added)
    await fs.writeFile(path.join(testDir, 'src/index.css'), `body {
  margin: 0;
  font-family: sans-serif;
}`);
    
    // Create public/index.html
    await fs.writeFile(path.join(testDir, 'public/index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tailwind Test App</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`);
    
    return testDir;
}

async function main() {
    try {
        console.log('[TEST] Creating test project with Tailwind classes...');
        const testDir = await createTestProject();
        
        console.log('[TEST] Testing deployment...');
        const result = await deployToCodeSandbox(testDir);
        console.log('[TEST] SUCCESS:', result);
        
        // Cleanup
        await fs.rm(testDir, { recursive: true });
        console.log('[TEST] Cleaned up test project');
    } catch (error) {
        console.error('[TEST] FAILED:', error.message);
    }
}

main();