import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { validateProject, generateErrorReport } from './validation.js';
export async function deployToCodeSandbox(projectDir) {
    console.log(`[CODESANDBOX_DEPLOY] Starting deployment from ${projectDir}`);
    // Pre-deployment validation
    console.log(`[CODESANDBOX_DEPLOY] Running pre-deployment validation...`);
    try {
        const validation = await validateProject(projectDir);
        if (!validation.isValid) {
            const errorReport = generateErrorReport(validation);
            console.error(`[CODESANDBOX_DEPLOY] ❌ Pre-deployment validation failed:`);
            console.error(errorReport);
            // For now, we'll warn but still allow deployment
            // In a stricter environment, you could throw an error here
            console.warn(`[CODESANDBOX_DEPLOY] ⚠️ Deploying despite validation errors. Fix these issues for better reliability:`);
            console.warn(`[CODESANDBOX_DEPLOY] ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
        }
        else {
            console.log(`[CODESANDBOX_DEPLOY] ✅ Pre-deployment validation passed`);
        }
    }
    catch (validationError) {
        console.warn(`[CODESANDBOX_DEPLOY] ⚠️ Pre-deployment validation failed to run: ${validationError}`);
        console.warn(`[CODESANDBOX_DEPLOY] Continuing with deployment...`);
    }
    const allFiles = {};
    // Read package.json first
    let pkgContent = {};
    try {
        const pkgPath = path.join(projectDir, 'package.json');
        pkgContent = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        console.log(`[CODESANDBOX_DEPLOY] Read package.json`);
    }
    catch (error) {
        console.warn(`[CODESANDBOX_DEPLOY] Could not read package.json:`, error.message);
    }
    // Collect all src files recursively (this will include any components in subdirectories)
    async function collectSrcFiles(dir, prefix = 'src') {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                // Skip test files and config files
                if (entry.name.includes('.test.') || entry.name.includes('.spec.') ||
                    entry.name === 'setupTests.js') {
                    continue;
                }
                const fullPath = path.join(dir, entry.name);
                const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    // Recursively read subdirectories
                    await collectSrcFiles(fullPath, relativePath);
                }
                else if (entry.isFile()) {
                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        allFiles[relativePath] = { content };
                        console.log(`[CODESANDBOX_DEPLOY] Read ${relativePath}`);
                    }
                    catch (readError) {
                        console.warn(`[CODESANDBOX_DEPLOY] Could not read ${relativePath}:`, readError.message);
                    }
                }
            }
        }
        catch (dirError) {
            console.warn(`[CODESANDBOX_DEPLOY] Could not read src directory:`, dirError.message);
        }
    }
    // Collect src files
    await collectSrcFiles(path.join(projectDir, 'src'));
    // Add essential public files
    const essentialPublicFiles = ['public/index.html'];
    for (const file of essentialPublicFiles) {
        try {
            const filePath = path.join(projectDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            allFiles[file] = { content };
            console.log(`[CODESANDBOX_DEPLOY] Read ${file}`);
        }
        catch (readError) {
            console.warn(`[CODESANDBOX_DEPLOY] Could not read ${file}:`, readError.message);
        }
    }
    // Note: Images are now hosted on 0x0.st, so no need to include assets directory
    // Debug: Log all collected files
    console.log(`[CODESANDBOX_DEPLOY] === DEBUG: All collected files ===`);
    for (const [filePath, fileData] of Object.entries(allFiles)) {
        console.log(`[CODESANDBOX_DEPLOY] ${filePath}: ${typeof fileData.content} (${typeof fileData.content === 'string' ? fileData.content.length + ' chars' : 'object'})`);
        if (typeof fileData.content === 'string' && fileData.content.includes('className')) {
            console.log(`[CODESANDBOX_DEPLOY] ${filePath} contains className!`);
        }
    }
    // Detect if Tailwind CSS is being used and add it if needed
    let hasTailwindClasses = false;
    for (const [filePath, fileData] of Object.entries(allFiles)) {
        if (typeof fileData.content === 'string' && fileData.content.includes('className=')) {
            console.log(`[CODESANDBOX_DEPLOY] Checking ${filePath} for Tailwind classes`);
            console.log(`[CODESANDBOX_DEPLOY] Content preview: ${fileData.content.substring(0, 200)}...`);
            // Look for common Tailwind patterns
            if (/className=["'][^"']*(?:bg-|text-|p-|m-|w-|h-|flex|grid|rounded|shadow)/.test(fileData.content)) {
                hasTailwindClasses = true;
                console.log(`[CODESANDBOX_DEPLOY] Detected Tailwind classes in ${filePath}`);
                break;
            }
            else {
                console.log(`[CODESANDBOX_DEPLOY] No Tailwind patterns found in ${filePath}`);
            }
        }
    }
    if (hasTailwindClasses) {
        console.log(`[CODESANDBOX_DEPLOY] Adding Tailwind CSS via CDN for CodeSandbox compatibility`);
        // For CodeSandbox, use Tailwind CDN instead of build process
        // Update public/index.html to include Tailwind CDN
        if (allFiles['public/index.html']) {
            let htmlContent = allFiles['public/index.html'].content;
            // Add Tailwind CDN to head if not already present
            if (!htmlContent.includes('tailwindcss')) {
                htmlContent = htmlContent.replace('</head>', `  <script src="https://cdn.tailwindcss.com"></script>
</head>`);
                allFiles['public/index.html'].content = htmlContent;
                console.log(`[CODESANDBOX_DEPLOY] Added Tailwind CDN to index.html`);
            }
        }
        // Keep index.css simple for CodeSandbox
        if (allFiles['src/index.css']) {
            const currentCSS = allFiles['src/index.css'].content;
            // Don't add @tailwind directives for CDN approach, keep original CSS
            console.log(`[CODESANDBOX_DEPLOY] Keeping original CSS for CDN approach`);
        }
        else {
            // Create simple index.css
            allFiles['src/index.css'] = {
                content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`
            };
            console.log(`[CODESANDBOX_DEPLOY] Created simple index.css for CDN approach`);
        }
    }
    // Set the final package.json
    allFiles['package.json'] = { content: pkgContent };
    console.log(`[CODESANDBOX_DEPLOY] Collected ${Object.keys(allFiles).length} files`);
    console.log(`[CODESANDBOX_DEPLOY] Files:`, Object.keys(allFiles).join(', '));
    // Create the sandbox using essential project files only
    const sandboxData = {
        files: allFiles
    };
    console.log('[CODESANDBOX_DEPLOY] Creating sandbox...');
    try {
        console.log('[CODESANDBOX_DEPLOY] Sending sandbox data with', Object.keys(sandboxData.files).length, 'files');
        // Use POST with JSON body per CodeSandbox define API
        const response = await axios.post('https://codesandbox.io/api/v1/sandboxes/define?json=1', sandboxData, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
        });
        console.log('[CODESANDBOX_DEPLOY] Response status:', response.status);
        console.log('[CODESANDBOX_DEPLOY] Response data:', response.data);
        let sandboxId = '';
        if (response.data && typeof response.data === 'object') {
            sandboxId = response.data.sandbox_id || response.data.id || '';
        }
        if (!sandboxId) {
            throw new Error('CodeSandbox API did not return a valid sandbox ID');
        }
        const editorUrl = `https://codesandbox.io/s/${sandboxId}`;
        const previewUrl = `https://${sandboxId}.csb.app`;
        console.log('[CODESANDBOX_DEPLOY] Sandbox created! ID:', sandboxId);
        console.log('[CODESANDBOX_DEPLOY] Editor URL:', editorUrl);
        console.log('[CODESANDBOX_DEPLOY] Preview URL:', previewUrl);
        return {
            deploymentUrl: editorUrl,
            previewUrl: previewUrl,
            editorUrl: editorUrl
        };
    }
    catch (error) {
        const status = error?.response?.status;
        const dataPreview = error?.response?.data ? (typeof error.response.data === 'string' ? error.response.data.slice(0, 400) : JSON.stringify(error.response.data).slice(0, 400)) : '';
        console.error('[CODESANDBOX_DEPLOY] Failed to create sandbox. status=', status, 'message=', error?.message);
        if (dataPreview)
            console.error('[CODESANDBOX_DEPLOY] error body=', dataPreview);
        throw new Error(`CodeSandbox deployment failed: ${error.message}`);
    }
}
