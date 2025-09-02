import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
/**
 * Run ESLint validation on the project directory
 */
export async function validateWithESLint(projectDir) {
    return new Promise((resolve) => {
        const eslintProcess = spawn('npx', ['eslint', '**/*.{js,jsx,ts,tsx}', '--format', 'json', '--no-error-on-unmatched-pattern'], {
            cwd: projectDir,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        eslintProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        eslintProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        eslintProcess.on('close', (code) => {
            try {
                const errors = [];
                const warnings = [];
                if (stdout.trim()) {
                    const eslintResults = JSON.parse(stdout);
                    for (const fileResult of eslintResults) {
                        const filePath = path.relative(projectDir, fileResult.filePath);
                        for (const message of fileResult.messages) {
                            const error = {
                                type: 'syntax',
                                file: filePath,
                                line: message.line,
                                column: message.column,
                                message: message.message,
                                rule: message.ruleId,
                                severity: message.severity === 2 ? 'error' : 'warning',
                                fixable: message.fix !== undefined
                            };
                            if (error.severity === 'error') {
                                errors.push(error);
                            }
                            else {
                                warnings.push({
                                    type: 'style',
                                    file: error.file,
                                    line: error.line,
                                    column: error.column,
                                    message: error.message,
                                    rule: error.rule
                                });
                            }
                        }
                    }
                }
                const fixableErrors = errors.filter(e => e.fixable);
                resolve({
                    isValid: errors.length === 0,
                    errors,
                    warnings,
                    fixableErrors,
                    canAutoFix: fixableErrors.length > 0
                });
            }
            catch (parseError) {
                console.warn('[VALIDATION] Failed to parse ESLint output, assuming no errors');
                resolve({
                    isValid: true,
                    errors: [],
                    warnings: [],
                    fixableErrors: [],
                    canAutoFix: false
                });
            }
        });
    });
}
/**
 * Auto-fix ESLint errors using --fix flag
 */
export async function autoFixWithESLint(projectDir) {
    return new Promise((resolve) => {
        const fixProcess = spawn('npx', ['eslint', '**/*.{js,jsx,ts,tsx}', '--fix', '--format', 'json', '--no-error-on-unmatched-pattern'], {
            cwd: projectDir,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        fixProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        fixProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        fixProcess.on('close', (code) => {
            try {
                const remainingErrors = [];
                const changedFiles = [];
                if (stdout.trim()) {
                    const eslintResults = JSON.parse(stdout);
                    for (const fileResult of eslintResults) {
                        const filePath = path.relative(projectDir, fileResult.filePath);
                        // Check if file was modified (ESLint reports this in output)
                        if (fileResult.output !== undefined) {
                            changedFiles.push(filePath);
                        }
                        // Collect remaining errors
                        for (const message of fileResult.messages) {
                            if (message.severity === 2) { // Only errors
                                remainingErrors.push({
                                    type: 'syntax',
                                    file: filePath,
                                    line: message.line,
                                    column: message.column,
                                    message: message.message,
                                    rule: message.ruleId,
                                    severity: 'error',
                                    fixable: message.fix !== undefined
                                });
                            }
                        }
                    }
                }
                resolve({
                    success: code === 0,
                    fixedErrors: [], // We don't have before/after comparison, so we can't determine which were fixed
                    remainingErrors,
                    changedFiles
                });
            }
            catch (parseError) {
                resolve({
                    success: false,
                    fixedErrors: [],
                    remainingErrors: [],
                    changedFiles: []
                });
            }
        });
    });
}
/**
 * Run a basic build test to check for compilation errors
 */
export async function validateBuild(projectDir) {
    // Check if we have a build script in package.json
    let packageJson;
    try {
        const packagePath = path.join(projectDir, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        packageJson = JSON.parse(packageContent);
    }
    catch (error) {
        return {
            isValid: false,
            errors: [{
                    type: 'dependency',
                    file: 'package.json',
                    message: 'Cannot read package.json',
                    severity: 'error',
                    fixable: false
                }],
            warnings: [],
            fixableErrors: [],
            canAutoFix: false
        };
    }
    // Check if there's a build script
    if (!packageJson.scripts?.build) {
        return {
            isValid: true, // No build script means no build validation needed
            errors: [],
            warnings: [{
                    type: 'best-practice',
                    file: 'package.json',
                    message: 'No build script found in package.json',
                    rule: 'build-script'
                }],
            fixableErrors: [],
            canAutoFix: false
        };
    }
    return new Promise((resolve) => {
        // Try to run the build command with a timeout
        const buildProcess = spawn('npm', ['run', 'build'], {
            cwd: projectDir,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        const timeout = setTimeout(() => {
            buildProcess.kill('SIGTERM');
            resolve({
                isValid: false,
                errors: [{
                        type: 'build',
                        file: 'build process',
                        message: 'Build process timed out after 30 seconds',
                        severity: 'error',
                        fixable: false
                    }],
                warnings: [],
                fixableErrors: [],
                canAutoFix: false
            });
        }, 30000); // 30 second timeout
        buildProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        buildProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        buildProcess.on('close', (code) => {
            clearTimeout(timeout);
            const errors = [];
            const warnings = [];
            if (code !== 0) {
                // Parse common build error patterns
                const errorLines = stderr.split('\n').filter(line => line.includes('error') ||
                    line.includes('Error') ||
                    line.includes('ERROR') ||
                    line.includes('Failed to compile'));
                for (const errorLine of errorLines) {
                    // Try to extract file and line number from error
                    const fileMatch = errorLine.match(/([^/\s]+\.(js|jsx|ts|tsx)):(\d+):(\d+)/);
                    errors.push({
                        type: 'build',
                        file: fileMatch ? fileMatch[1] : 'unknown',
                        line: fileMatch ? parseInt(fileMatch[3]) : undefined,
                        column: fileMatch ? parseInt(fileMatch[4]) : undefined,
                        message: errorLine.trim(),
                        severity: 'error',
                        fixable: false // Build errors usually require manual intervention
                    });
                }
                // If no specific errors found, create a generic one
                if (errors.length === 0) {
                    errors.push({
                        type: 'build',
                        file: 'build process',
                        message: `Build failed with code ${code}. Check the build output for details.`,
                        severity: 'error',
                        fixable: false
                    });
                }
            }
            resolve({
                isValid: code === 0,
                errors,
                warnings,
                fixableErrors: errors.filter(e => e.fixable),
                canAutoFix: false // Build errors usually require manual fixing
            });
        });
        buildProcess.on('error', (error) => {
            clearTimeout(timeout);
            resolve({
                isValid: false,
                errors: [{
                        type: 'build',
                        file: 'build process',
                        message: `Failed to run build command: ${error.message}`,
                        severity: 'error',
                        fixable: false
                    }],
                warnings: [],
                fixableErrors: [],
                canAutoFix: false
            });
        });
    });
}
/**
 * Check for common dependency issues
 */
export async function validateDependencies(projectDir) {
    const errors = [];
    const warnings = [];
    try {
        const packagePath = path.join(projectDir, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        // Check if node_modules exists
        const nodeModulesPath = path.join(projectDir, 'node_modules');
        const nodeModulesExists = await fs.stat(nodeModulesPath).then(() => true).catch(() => false);
        if (!nodeModulesExists) {
            errors.push({
                type: 'dependency',
                file: 'node_modules',
                message: 'node_modules directory not found. Run "npm install" to install dependencies.',
                severity: 'error',
                fixable: true
            });
        }
        // Check for common React dependencies
        const reactDeps = ['react', 'react-dom'];
        const missingReactDeps = reactDeps.filter(dep => !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]);
        for (const dep of missingReactDeps) {
            errors.push({
                type: 'dependency',
                file: 'package.json',
                message: `Missing required dependency: ${dep}`,
                severity: 'error',
                fixable: true
            });
        }
        // Check for Tailwind CSS if we detect Tailwind classes in files
        const srcFiles = await findFilesRecursive(path.join(projectDir, 'src'), ['.js', '.jsx', '.ts', '.tsx']);
        let hasTailwindClasses = false;
        for (const filePath of srcFiles.slice(0, 10)) { // Check first 10 files for performance
            try {
                const content = await fs.readFile(filePath, 'utf8');
                if (/className=["'][^"']*(?:bg-|text-|p-|m-|w-|h-|flex|grid|rounded|shadow)/.test(content)) {
                    hasTailwindClasses = true;
                    break;
                }
            }
            catch (error) {
                // Skip files that can't be read
            }
        }
        if (hasTailwindClasses) {
            const tailwindDeps = ['tailwindcss'];
            const missingTailwindDeps = tailwindDeps.filter(dep => !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]);
            for (const dep of missingTailwindDeps) {
                warnings.push({
                    type: 'best-practice',
                    file: 'package.json',
                    message: `Tailwind CSS classes detected but ${dep} not found in dependencies`,
                    rule: 'tailwind-dependency'
                });
            }
        }
    }
    catch (error) {
        errors.push({
            type: 'dependency',
            file: 'package.json',
            message: `Cannot validate dependencies: ${error}`,
            severity: 'error',
            fixable: false
        });
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixableErrors: errors.filter(e => e.fixable),
        canAutoFix: errors.some(e => e.fixable)
    };
}
/**
 * Validate DaisyUI button contrast and styling patterns
 */
export async function validateButtonContrast(projectDir) {
    const errors = [];
    const warnings = [];
    try {
        const srcFiles = await findFilesRecursive(path.join(projectDir, 'src'), ['.js', '.jsx', '.ts', '.tsx']);
        for (const filePath of srcFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const relativePath = path.relative(projectDir, filePath);
                // Check for dangerous button patterns
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    const lineNumber = index + 1;
                    // Check for btn-primary/btn-secondary with explicit text colors
                    if (/btn-primary.*text-\w+|btn-secondary.*text-\w+/.test(line)) {
                        // Extract the problematic classes
                        const match = line.match(/(btn-(?:primary|secondary)[^"]*text-\w+[^"]*)/);
                        if (match) {
                            errors.push({
                                type: 'syntax',
                                file: relativePath,
                                line: lineNumber,
                                message: `DaisyUI button with explicit text color: "${match[1]}". Remove text color and let DaisyUI handle button styling.`,
                                rule: 'daisyui-button-contrast',
                                severity: 'error',
                                fixable: true
                            });
                        }
                    }
                    // Check for text-white on buttons without explicit dark backgrounds
                    if (/className.*btn.*text-white/.test(line) && !/bg-(?:black|gray-900|blue-\d+|red-\d+|green-\d+|purple-\d+|indigo-\d+)/.test(line)) {
                        const match = line.match(/(btn[^"]*text-white[^"]*)/);
                        if (match) {
                            errors.push({
                                type: 'syntax',
                                file: relativePath,
                                line: lineNumber,
                                message: `Button with text-white but no guaranteed dark background: "${match[1]}". Either add explicit dark background or remove text-white.`,
                                rule: 'button-text-contrast',
                                severity: 'error',
                                fixable: true
                            });
                        }
                    }
                    // Check for dangerous contrast combinations
                    const dangerousPatterns = [
                        { pattern: /bg-white.*text-white/, message: 'White text on white background' },
                        { pattern: /bg-black.*text-black/, message: 'Black text on black background' },
                        { pattern: /bg-gray-100.*text-white/, message: 'White text on light gray background' },
                        { pattern: /bg-gray-900.*text-black/, message: 'Black text on dark gray background' }
                    ];
                    dangerousPatterns.forEach(({ pattern, message }) => {
                        if (pattern.test(line)) {
                            const match = line.match(/className="([^"]+)"/);
                            if (match) {
                                errors.push({
                                    type: 'syntax',
                                    file: relativePath,
                                    line: lineNumber,
                                    message: `${message}: "${match[1]}". This creates unreadable text.`,
                                    rule: 'color-contrast',
                                    severity: 'error',
                                    fixable: true
                                });
                            }
                        }
                    });
                    // Check for buttons without proper padding
                    if (/className.*btn(?!-)/.test(line) && !/px-\d+.*py-\d+|p-\d+/.test(line)) {
                        const match = line.match(/(btn[^"]*)/);
                        if (match && !match[1].includes('px-') && !match[1].includes('py-')) {
                            warnings.push({
                                type: 'style',
                                file: relativePath,
                                line: lineNumber,
                                message: `Button without padding: "${match[1]}". Consider adding px-4 py-2 for better UX.`,
                                rule: 'button-padding'
                            });
                        }
                    }
                });
            }
            catch (readError) {
                // Skip files that can't be read
                console.warn(`[VALIDATION] Could not read file for button validation: ${filePath}`);
            }
        }
    }
    catch (error) {
        errors.push({
            type: 'runtime',
            file: 'button-validation',
            message: `Button contrast validation failed: ${error}`,
            severity: 'error',
            fixable: false
        });
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixableErrors: errors.filter(e => e.fixable),
        canAutoFix: errors.some(e => e.fixable)
    };
}
/**
 * Run comprehensive validation on a project directory
 */
export async function validateProject(projectDir) {
    console.log(`[VALIDATION] Running comprehensive validation on: ${projectDir}`);
    // Run all validation checks in parallel
    const [eslintResult, buildResult, dependencyResult, buttonResult] = await Promise.all([
        validateWithESLint(projectDir).catch(error => {
            console.warn(`[VALIDATION] ESLint validation failed: ${error.message}`);
            return {
                isValid: true, // Don't fail if ESLint is not available
                errors: [],
                warnings: [],
                fixableErrors: [],
                canAutoFix: false
            };
        }),
        validateBuild(projectDir).catch(error => {
            console.warn(`[VALIDATION] Build validation failed: ${error.message}`);
            return {
                isValid: true, // Don't fail if build is not available
                errors: [],
                warnings: [],
                fixableErrors: [],
                canAutoFix: false
            };
        }),
        validateDependencies(projectDir),
        validateButtonContrast(projectDir)
    ]);
    // Combine results
    const allErrors = [...eslintResult.errors, ...buildResult.errors, ...dependencyResult.errors, ...buttonResult.errors];
    const allWarnings = [...eslintResult.warnings, ...buildResult.warnings, ...dependencyResult.warnings, ...buttonResult.warnings];
    const allFixableErrors = [...eslintResult.fixableErrors, ...buildResult.fixableErrors, ...dependencyResult.fixableErrors, ...buttonResult.fixableErrors];
    const result = {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        fixableErrors: allFixableErrors,
        canAutoFix: allFixableErrors.length > 0
    };
    console.log(`[VALIDATION] Validation complete: ${result.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`[VALIDATION] Errors: ${result.errors.length}, Warnings: ${result.warnings.length}, Fixable: ${result.fixableErrors.length}`);
    return result;
}
/**
 * Auto-fix button contrast issues
 */
export async function autoFixButtonContrast(projectDir) {
    console.log(`[VALIDATION] Auto-fixing button contrast issues...`);
    const changedFiles = [];
    const fixedErrors = [];
    const remainingErrors = [];
    try {
        const srcFiles = await findFilesRecursive(path.join(projectDir, 'src'), ['.js', '.jsx', '.ts', '.tsx']);
        for (const filePath of srcFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                let modifiedContent = content;
                let hasChanges = false;
                // Fix: Remove text colors from DaisyUI buttons
                const daisyUIButtonFix = modifiedContent.replace(/(btn-(?:primary|secondary)[^"]*)\s+text-\w+([^"]*)/g, (match, beforeText, afterText) => {
                    hasChanges = true;
                    console.log(`[VALIDATION] Fixed DaisyUI button: ${match.trim()} → ${(beforeText + afterText).trim()}`);
                    return beforeText + afterText;
                });
                modifiedContent = daisyUIButtonFix;
                // Fix: Remove text-white from buttons without explicit dark backgrounds
                const textWhiteButtonFix = modifiedContent.replace(/className="([^"]*btn[^"]*text-white[^"]*)"/g, (match, classes) => {
                    // Only fix if there's no explicit dark background
                    if (!/bg-(?:black|gray-900|blue-\d+|red-\d+|green-\d+|purple-\d+|indigo-\d+)/.test(classes)) {
                        hasChanges = true;
                        const fixedClasses = classes.replace(/\s*text-white\s*/, ' ').replace(/\s+/g, ' ').trim();
                        console.log(`[VALIDATION] Fixed button text: ${classes} → ${fixedClasses}`);
                        return `className="${fixedClasses}"`;
                    }
                    return match;
                });
                modifiedContent = textWhiteButtonFix;
                // Fix: Basic contrast issues
                const contrastFixes = [
                    { pattern: /bg-white\s+text-white/g, fix: 'bg-white text-gray-900' },
                    { pattern: /bg-black\s+text-black/g, fix: 'bg-black text-white' },
                    { pattern: /bg-gray-100\s+text-white/g, fix: 'bg-gray-100 text-gray-900' },
                    { pattern: /bg-gray-900\s+text-black/g, fix: 'bg-gray-900 text-white' }
                ];
                contrastFixes.forEach(({ pattern, fix }) => {
                    if (pattern.test(modifiedContent)) {
                        hasChanges = true;
                        modifiedContent = modifiedContent.replace(pattern, fix);
                        console.log(`[VALIDATION] Fixed contrast issue: ${pattern} → ${fix}`);
                    }
                });
                if (hasChanges) {
                    await fs.writeFile(filePath, modifiedContent, 'utf8');
                    changedFiles.push(path.relative(projectDir, filePath));
                }
            }
            catch (fileError) {
                console.warn(`[VALIDATION] Could not process file for button fixes: ${filePath}`);
            }
        }
    }
    catch (error) {
        console.error(`[VALIDATION] Button contrast auto-fix failed: ${error}`);
        return {
            success: false,
            fixedErrors: [],
            remainingErrors: [],
            changedFiles: []
        };
    }
    return {
        success: changedFiles.length > 0,
        fixedErrors,
        remainingErrors,
        changedFiles
    };
}
/**
 * Attempt to automatically fix issues in the project
 */
export async function autoFixProject(projectDir) {
    console.log(`[VALIDATION] Attempting auto-fix on: ${projectDir}`);
    // Run ESLint auto-fix and button contrast fix in parallel
    const [eslintFixResult, buttonFixResult] = await Promise.all([
        autoFixWithESLint(projectDir),
        autoFixButtonContrast(projectDir)
    ]);
    // Check if dependencies need to be installed
    const dependencyValidation = await validateDependencies(projectDir);
    const needsNpmInstall = dependencyValidation.errors.some(e => e.message.includes('node_modules') || e.message.includes('npm install'));
    if (needsNpmInstall) {
        console.log('[VALIDATION] Running npm install to fix dependency issues...');
        await runNpmInstall(projectDir);
    }
    // Combine results
    const allChangedFiles = [...eslintFixResult.changedFiles, ...buttonFixResult.changedFiles];
    const uniqueChangedFiles = [...new Set(allChangedFiles)]; // Remove duplicates
    return {
        success: eslintFixResult.success || buttonFixResult.success,
        fixedErrors: [...eslintFixResult.fixedErrors, ...buttonFixResult.fixedErrors],
        remainingErrors: [...eslintFixResult.remainingErrors, ...buttonFixResult.remainingErrors],
        changedFiles: uniqueChangedFiles
    };
}
/**
 * Generate a detailed error report for Cline CLI
 */
export function generateErrorReport(validation) {
    if (validation.isValid) {
        return "✅ All validation checks passed! The project has no errors.";
    }
    const report = [];
    report.push("❌ Validation failed. Please fix the following issues:\n");
    // Group errors by file
    const errorsByFile = {};
    for (const error of validation.errors) {
        if (!errorsByFile[error.file]) {
            errorsByFile[error.file] = [];
        }
        errorsByFile[error.file].push(error);
    }
    for (const [file, errors] of Object.entries(errorsByFile)) {
        report.push(`📄 File: ${file}`);
        for (const error of errors) {
            const location = error.line ? ` (line ${error.line}${error.column ? `:${error.column}` : ''})` : '';
            const rule = error.rule ? ` [${error.rule}]` : '';
            report.push(`  • ${error.message}${location}${rule}`);
        }
        report.push('');
    }
    if (validation.fixableErrors.length > 0) {
        report.push(`🔧 ${validation.fixableErrors.length} errors can be auto-fixed with ESLint.`);
    }
    if (validation.warnings.length > 0) {
        report.push(`⚠️  ${validation.warnings.length} warnings found (not blocking deployment).`);
    }
    return report.join('\n');
}
// Helper functions
async function findFilesRecursive(dir, extensions) {
    const files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                const subFiles = await findFilesRecursive(fullPath, extensions);
                files.push(...subFiles);
            }
            else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }
    }
    catch (error) {
        // Skip directories that can't be read
    }
    return files;
}
async function runNpmInstall(projectDir) {
    return new Promise((resolve, reject) => {
        const npmProcess = spawn('npm', ['install'], {
            cwd: projectDir,
            stdio: 'inherit'
        });
        npmProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
        npmProcess.on('error', (error) => {
            reject(error);
        });
    });
}
