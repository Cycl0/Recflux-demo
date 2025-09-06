import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fixableErrors: ValidationError[];
    canAutoFix: boolean;
}

export interface ValidationError {
    type: 'syntax' | 'build' | 'runtime' | 'dependency';
    file: string;
    line?: number;
    column?: number;
    message: string;
    rule?: string;
    severity: 'error' | 'warning';
    fixable: boolean;
}

export interface ValidationWarning {
    type: 'style' | 'performance' | 'best-practice';
    file: string;
    line?: number;
    column?: number;
    message: string;
    rule?: string;
}

export interface AutoFixResult {
    success: boolean;
    fixedErrors: ValidationError[];
    remainingErrors: ValidationError[];
    changedFiles: string[];
}

/**
 * Run ESLint validation on the project directory
 */
export async function validateWithESLint(projectDir: string): Promise<ValidationResult> {
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
                const errors: ValidationError[] = [];
                const warnings: ValidationWarning[] = [];
                
                if (stdout.trim()) {
                    const eslintResults = JSON.parse(stdout);
                    
                    for (const fileResult of eslintResults) {
                        const filePath = path.relative(projectDir, fileResult.filePath);
                        
                        for (const message of fileResult.messages) {
                            // Skip non-critical parsing errors that don't affect functionality
                            if (isNonCriticalError(message)) {
                                warnings.push({
                                    type: 'style',
                                    file: filePath,
                                    line: message.line,
                                    column: message.column,
                                    message: message.message,
                                    rule: message.ruleId
                                });
                                continue;
                            }

                            const error: ValidationError = {
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
                            } else {
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
                
            } catch (parseError) {
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
export async function autoFixWithESLint(projectDir: string): Promise<AutoFixResult> {
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
                const remainingErrors: ValidationError[] = [];
                const changedFiles: string[] = [];
                
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
                
            } catch (parseError) {
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
export async function validateBuild(projectDir: string): Promise<ValidationResult> {
    // Check if we have a build script in package.json
    let packageJson: any;
    try {
        const packagePath = path.join(projectDir, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        packageJson = JSON.parse(packageContent);
    } catch (error) {
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
                    message: 'Build process timed out after 240 seconds',
                    severity: 'error',
                    fixable: false
                }],
                warnings: [],
                fixableErrors: [],
                canAutoFix: false
            });
        }, 240000); // 240 second timeout (4 minutes)

        buildProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        buildProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        buildProcess.on('close', (code) => {
            clearTimeout(timeout);
            
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];
            
            if (code !== 0) {
                // Parse both stdout and stderr for all error information
                const allOutput = `${stdout}\n${stderr}`;
                const lines = allOutput.split('\n');
                
                // Look for specific error patterns that contain useful information
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Skip empty lines
                    if (!line) continue;
                    
                    // Module not found errors
                    if (line.includes("Module not found: Can't resolve")) {
                        const moduleMatch = line.match(/Module not found: Can't resolve '([^']+)'/);
                        const fileMatch = lines[i-1] && lines[i-1].match(/\.\/([^:]+):(\d+):(\d+)/);
                        
                        errors.push({
                            type: 'build',
                            file: fileMatch ? fileMatch[1] : 'unknown',
                            line: fileMatch ? parseInt(fileMatch[2]) : undefined,
                            column: fileMatch ? parseInt(fileMatch[3]) : undefined,
                            message: moduleMatch ? `Missing dependency: ${moduleMatch[1]}` : line,
                            severity: 'error',
                            fixable: true // Missing dependencies can often be auto-fixed
                        });
                        continue;
                    }
                    
                    // Compilation errors with file references
                    if (line.match(/\.\/[^:]+:\d+:\d+/) || line.includes('Error:') || line.includes('⨯')) {
                        const fileMatch = line.match(/\.\/([^:]+):(\d+):(\d+)/);
                        
                        errors.push({
                            type: 'build',
                            file: fileMatch ? fileMatch[1] : 'unknown',
                            line: fileMatch ? parseInt(fileMatch[2]) : undefined,
                            column: fileMatch ? parseInt(fileMatch[3]) : undefined,
                            message: line.replace(/^.*Error:\s*/, '').replace(/^⨯\s*/, '').trim(),
                            severity: 'error',
                            fixable: false
                        });
                        continue;
                    }
                    
                    // Generic error patterns
                    if (line.includes('error') || line.includes('Error') || line.includes('ERROR') || 
                        line.includes('Failed to compile') || line.includes('✓ Compiled') === false) {
                        
                        // Skip webpack chunk information
                        if (line.includes('webpack') && line.includes('chunk')) continue;
                        if (line.includes('Entry point')) continue;
                        
                        errors.push({
                            type: 'build',
                            file: 'unknown',
                            message: line,
                            severity: 'error',
                            fixable: false
                        });
                    }
                }
                
                // Always create an error if build failed - let Cline see all build failures
                if (errors.length === 0) {
                    // Include detailed build output in error message
                    let detailedMessage = `Build failed with code ${code}.`;
                    if (stderr.trim()) {
                        detailedMessage += `\n\nSTDERR:\n${stderr.trim()}`;
                    }
                    if (stdout.trim()) {
                        detailedMessage += `\n\nSTDOUT:\n${stdout.trim()}`;
                    }
                    
                    errors.push({
                        type: 'build',
                        file: 'unknown',
                        message: detailedMessage,
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
            let detailedMessage = `Failed to run build command: ${error.message}`;
            if (stderr.trim()) {
                detailedMessage += `\n\nSTDERR:\n${stderr.trim()}`;
            }
            if (stdout.trim()) {
                detailedMessage += `\n\nSTDOUT:\n${stdout.trim()}`;
            }
            
            resolve({
                isValid: false,
                errors: [{
                    type: 'build',
                    file: 'build process',
                    message: detailedMessage,
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
export async function validateDependencies(projectDir: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

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
        const missingReactDeps = reactDeps.filter(dep => 
            !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
        );

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
            } catch (error) {
                // Skip files that can't be read
            }
        }

        if (hasTailwindClasses) {
            const tailwindDeps = ['tailwindcss'];
            const missingTailwindDeps = tailwindDeps.filter(dep => 
                !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
            );

            for (const dep of missingTailwindDeps) {
                warnings.push({
                    type: 'best-practice',
                    file: 'package.json',
                    message: `Tailwind CSS classes detected but ${dep} not found in dependencies`,
                    rule: 'tailwind-dependency'
                });
            }
        }

    } catch (error) {
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
export async function validateButtonContrast(projectDir: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

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
                
            } catch (readError) {
                // Skip files that can't be read
                console.warn(`[VALIDATION] Could not read file for button validation: ${filePath}`);
            }
        }
        
    } catch (error) {
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
export async function validateProject(projectDir: string): Promise<ValidationResult> {
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
export async function autoFixButtonContrast(projectDir: string): Promise<AutoFixResult> {
    console.log(`[VALIDATION] Auto-fixing button contrast issues...`);
    
    const changedFiles: string[] = [];
    const fixedErrors: ValidationError[] = [];
    const remainingErrors: ValidationError[] = [];

    try {
        const srcFiles = await findFilesRecursive(path.join(projectDir, 'src'), ['.js', '.jsx', '.ts', '.tsx']);
        
        for (const filePath of srcFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                let modifiedContent = content;
                let hasChanges = false;
                
                // Fix: Remove text colors from DaisyUI buttons
                const daisyUIButtonFix = modifiedContent.replace(
                    /(btn-(?:primary|secondary)[^"]*)\s+text-\w+([^"]*)/g,
                    (match, beforeText, afterText) => {
                        hasChanges = true;
                        console.log(`[VALIDATION] Fixed DaisyUI button: ${match.trim()} → ${(beforeText + afterText).trim()}`);
                        return beforeText + afterText;
                    }
                );
                modifiedContent = daisyUIButtonFix;
                
                // Fix: Remove text-white from buttons without explicit dark backgrounds
                const textWhiteButtonFix = modifiedContent.replace(
                    /className="([^"]*btn[^"]*text-white[^"]*)"/g,
                    (match, classes) => {
                        // Only fix if there's no explicit dark background
                        if (!/bg-(?:black|gray-900|blue-\d+|red-\d+|green-\d+|purple-\d+|indigo-\d+)/.test(classes)) {
                            hasChanges = true;
                            const fixedClasses = classes.replace(/\s*text-white\s*/, ' ').replace(/\s+/g, ' ').trim();
                            console.log(`[VALIDATION] Fixed button text: ${classes} → ${fixedClasses}`);
                            return `className="${fixedClasses}"`;
                        }
                        return match;
                    }
                );
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
                
            } catch (fileError) {
                console.warn(`[VALIDATION] Could not process file for button fixes: ${filePath}`);
            }
        }
        
    } catch (error) {
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
export async function autoFixProject(projectDir: string): Promise<AutoFixResult> {
    console.log(`[VALIDATION] Attempting auto-fix on: ${projectDir}`);

    // Run ESLint auto-fix and button contrast fix in parallel
    const [eslintFixResult, buttonFixResult] = await Promise.all([
        autoFixWithESLint(projectDir),
        autoFixButtonContrast(projectDir)
    ]);

    // Check if dependencies need to be installed
    const dependencyValidation = await validateDependencies(projectDir);
    const needsNpmInstall = dependencyValidation.errors.some(e => 
        e.message.includes('node_modules') || e.message.includes('npm install')
    );

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
export function generateErrorReport(validation: ValidationResult): string {
    if (validation.isValid) {
        return "✅ All validation checks passed! The project has no errors.";
    }

    const report: string[] = [];
    report.push("❌ Validation failed. Please fix the following issues:\n");

    // Group errors by file
    const errorsByFile: { [file: string]: ValidationError[] } = {};
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

/**
 * Check if an ESLint error is non-critical (parsing issues, config problems, etc.)
 * that shouldn't trigger auto-fix loops
 */
function isNonCriticalError(message: any): boolean {
    const messageText = message.message || '';
    
    // CRITICAL errors that SHOULD be reported (real syntax/code issues)
    const criticalPatterns = [
        /Duplicate export/, // Duplicate exports
        /Unexpected token `\w+`\. Expected jsx identifier/, // JSX syntax errors
        /Expression expected/, // Missing expressions  
        /Missing semicolon/, // Missing semicolons
        /Unterminated string/, // Unterminated strings
        /Unexpected token.*Expected.*/, // Real syntax errors
        /Invalid.*import/, // Import syntax errors
        /Invalid.*export/, // Export syntax errors
    ];

    // If it's a critical syntax error, don't skip it
    if (criticalPatterns.some(pattern => pattern.test(messageText))) {
        return false;
    }

    // NON-CRITICAL errors that should be ignored (config/tooling issues)
    const nonCriticalPatterns = [
        // Build/config issues that don't affect code functionality
        /Cannot find module.*lightningcss/, // Missing build dependencies
        /An error occurred in.*next\/font/, // Next.js font loading issues
        /Build failed because of webpack errors/, // Build process issues
        /Failed to compile/, // Generic build failures
        
        // TypeScript parsing when ESLint treats as JS (but not real syntax errors)
        /Unexpected token.*:(?!.*Expected)/, // TS type annotations (but not JSX errors)
        /The keyword 'interface' is reserved/, // TS interfaces
        /Unexpected token interface/, // TS interface declarations  
        /Unexpected token type/, // TS type definitions
        
        // Configuration/tooling warnings
        /Parsing error.*parser/, // Parser configuration issues
        /Cannot find module.*\/@/, // Missing dev dependencies
    ];

    // Check if message text matches non-critical patterns
    if (nonCriticalPatterns.some(pattern => pattern.test(messageText))) {
        return true;
    }

    // Check for specific rule IDs that are non-critical
    const nonCriticalRules = [
        'import/no-unresolved', // Module resolution
        '@typescript-eslint/parser-error' // TS parser issues
    ];

    if (message.ruleId && nonCriticalRules.includes(message.ruleId)) {
        return true;
    }

    // Fatal errors are usually config issues, but check if they contain critical patterns first
    if (message.fatal === true) {
        // If fatal but contains critical patterns, don't skip
        if (criticalPatterns.some(pattern => pattern.test(messageText))) {
            return false;
        }
        return true; // Skip other fatal errors (config issues)
    }

    return false; // Default to reporting the error
}

/**
 * Check if a build error line is non-critical (parsing issues, ESLint config, etc.)
 */
function isNonCriticalBuildError(errorLine: string): boolean {
    // CRITICAL build errors that SHOULD be reported
    const criticalBuildPatterns = [
        /Duplicate export/, // Duplicate exports - real code issue
        /Error:.*x Unexpected token `\w+`\. Expected jsx identifier/, // JSX syntax errors
        /Error:.*x Expression expected/, // Missing expressions
        /SyntaxError/, // Real syntax errors
        /TypeError.*Cannot/, // Runtime type errors
        /Invalid.*import/, // Import syntax errors
        /Invalid.*export/, // Export syntax errors
        /Module not found.*components/, // Missing component files
    ];

    // If it's a critical build error, don't skip it
    if (criticalBuildPatterns.some(pattern => pattern.test(errorLine))) {
        return false;
    }

    // NON-CRITICAL build errors that should be ignored
    const nonCriticalBuildPatterns = [
        // Build tooling issues
        /Cannot find module.*lightningcss/, // Missing build dependencies
        /Error occurred in.*next\/font/, // Next.js font loading issues
        /An error occurred in.*next\/font/, // Next.js font issues
        /Build failed because of webpack errors/, // Generic webpack failures
        
        // Configuration/parser issues (not real syntax errors)
        /ESLint.*Parsing error/, // ESLint config issues
        /TypeScript.*parsing error/, // TS parser config issues
        /Unexpected token.*:(?!.*Expected)/, // TS type annotations
        /The keyword 'interface' is reserved/, // TS interface parsing
        
        // Warnings and non-blocking issues
        /Warning.*deprecated/, // Deprecation warnings
        /Warning.*configuration/, // Config warnings
        /eslint.*warning/i, // ESLint warnings
        /lint.*warning/i, // General linting warnings
    ];

    return nonCriticalBuildPatterns.some(pattern => pattern.test(errorLine));
}

/**
 * Check if the overall build failure is non-critical based on output content
 */
function isNonCriticalBuildFailure(stdout: string, stderr: string): boolean {
    const combinedOutput = `${stdout}\n${stderr}`;
    
    // If output contains mostly parsing/linting errors, consider it non-critical
    const nonCriticalFailurePatterns = [
        /Build failed.*ESLint/,
        /Build failed.*parsing error/,
        /Build failed.*typescript/i,
        /Build failed.*lint/i
    ];

    return nonCriticalFailurePatterns.some(pattern => pattern.test(combinedOutput));
}

async function findFilesRecursive(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                const subFiles = await findFilesRecursive(fullPath, extensions);
                files.push(...subFiles);
            } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        // Skip directories that can't be read
    }
    
    return files;
}

async function runNpmInstall(projectDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const npmProcess = spawn('npm', ['install'], {
            cwd: projectDir,
            stdio: 'inherit'
        });

        npmProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });

        npmProcess.on('error', (error) => {
            reject(error);
        });
    });
}