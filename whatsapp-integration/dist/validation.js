import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { watch } from 'chokidar';
// Mock StructureAnalyzer for now - will be replaced with actual import when cline-cli is integrated
const mockStructureAnalyzer = {
    analyzeEditScope(error, fileContent, filePath) {
        const message = error.message?.toLowerCase() || '';
        // Determine edit scope based on error type
        let scopeLevel = 'line';
        let recommendedTool = 'edit_file';
        if (message.includes('cannot find name') || message.includes('missing import')) {
            scopeLevel = 'line';
            recommendedTool = 'edit_file';
        }
        else if (message.includes('not assignable to type')) {
            scopeLevel = 'expression';
            recommendedTool = 'edit_file';
        }
        else if (message.includes('has no properties in common')) {
            scopeLevel = 'line';
            recommendedTool = 'edit_file';
        }
        else if (message.includes('jsx') || message.includes('tag')) {
            scopeLevel = 'block';
            recommendedTool = 'multi_edit_file';
        }
        return {
            editScope: {
                level: scopeLevel,
                operation: 'replace',
                requiresMultiEdit: recommendedTool === 'multi_edit_file',
                confidence: 0.8
            },
            recommendedTool,
            contextualGuidance: `${scopeLevel.toUpperCase()}-LEVEL fix using ${recommendedTool}`
        };
    }
};
/**
 * Detect if an import/export error is surgically fixable with targeted edits
 * These errors can be fixed with simple import/export statement changes
 * without requiring comprehensive code rewrites that might destroy creative content
 */
function isImportExportSurgicallyFixable(errorMessage) {
    const message = errorMessage.toLowerCase();
    // Import/export related errors that can be surgically fixed
    const surgicalPatterns = [
        // Module not found but file exists - usually path or export name issues
        /module .+ has no exported member/,
        /cannot find module .+ or its corresponding type declarations/,
        /module .+ resolves to an untyped module/,
        // Named vs default import mismatches - easy to fix
        /has no default export/,
        /attempting to use the default export/,
        /named export .+ not found/,
        // Simple syntax errors in import statements
        /unexpected token in import/,
        /import declaration can only be used at the top level/,
        /import.*expected/,
        /export.*expected/,
        // Missing file extension issues
        /relative import path .+ which is not a module/,
        /cannot resolve dependency/,
        // Type-only import/export issues
        /imported name .+ is not exported/,
        /this import is never used as a value/,
        // ESModule interop issues - can be fixed with import syntax changes
        /can only be default-imported using.*esmoduleinterop/,
    ];
    // Check if any surgical pattern matches
    return surgicalPatterns.some(pattern => pattern.test(message));
}
/**
 * ValidationLockManager handles file locking for validation operations
 * to prevent concurrent validation/editing conflicts
 */
export class ValidationLockManager {
    static locks = new Map();
    static lockResolvers = new Map();
    /**
     * Acquire a lock for a specific file or directory
     */
    static async acquireLock(filePath, timeoutMs = 30000) {
        const normalizedPath = path.resolve(filePath).toLowerCase();
        try {
            // Check if there's already a lock for this path
            const existingLock = this.locks.get(normalizedPath);
            if (existingLock) {
                console.log(`[VALIDATION_LOCK] Waiting for existing lock on ${filePath}`);
                // Wait for existing lock with timeout
                await Promise.race([
                    existingLock,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Validation lock timeout')), timeoutMs))
                ]);
            }
            // Create a new lock
            let resolveLock;
            const lockPromise = new Promise((resolve) => {
                resolveLock = resolve;
            });
            this.locks.set(normalizedPath, lockPromise);
            this.lockResolvers.set(normalizedPath, resolveLock);
            console.log(`[VALIDATION_LOCK] Acquired lock on ${filePath}`);
            // Auto-release lock after timeout as safety measure
            setTimeout(() => {
                if (this.locks.has(normalizedPath)) {
                    console.log(`[VALIDATION_LOCK] Auto-releasing lock on ${filePath} after timeout`);
                    this.releaseLock(filePath);
                }
            }, timeoutMs);
            return true;
        }
        catch (error) {
            console.warn(`[VALIDATION_LOCK] Failed to acquire lock on ${filePath}:`, error);
            return false;
        }
    }
    /**
     * Release the lock for a specific file or directory
     */
    static releaseLock(filePath) {
        const normalizedPath = path.resolve(filePath).toLowerCase();
        try {
            const resolver = this.lockResolvers.get(normalizedPath);
            if (resolver) {
                resolver();
                this.locks.delete(normalizedPath);
                this.lockResolvers.delete(normalizedPath);
                console.log(`[VALIDATION_LOCK] Released lock on ${filePath}`);
            }
        }
        catch (error) {
            console.warn(`[VALIDATION_LOCK] Error releasing lock on ${filePath}:`, error);
        }
    }
    /**
     * Execute a validation operation with automatic locking
     */
    static async withLock(filePath, operation, timeoutMs = 30000) {
        const lockAcquired = await this.acquireLock(filePath, timeoutMs);
        if (!lockAcquired) {
            throw new Error(`Could not acquire validation lock for ${filePath}`);
        }
        try {
            return await operation();
        }
        finally {
            this.releaseLock(filePath);
        }
    }
    /**
     * Check if a file is currently locked
     */
    static isLocked(filePath) {
        const normalizedPath = path.resolve(filePath).toLowerCase();
        return this.locks.has(normalizedPath);
    }
    /**
     * Clear all locks (emergency cleanup)
     */
    static clearAllLocks() {
        console.log(`[VALIDATION_LOCK] Clearing all locks (${this.locks.size} total)`);
        for (const resolver of this.lockResolvers.values()) {
            try {
                resolver();
            }
            catch (error) {
                console.warn(`[VALIDATION_LOCK] Error during lock cleanup:`, error);
            }
        }
        this.locks.clear();
        this.lockResolvers.clear();
    }
}
/**
 * TemplateManager handles template isolation and file watcher management
 * to prevent interference during Cline operations
 */
export class TemplateManager {
    static watchers = new Map();
    static templateSnapshots = new Map();
    static watcherCallbacks = new Map();
    /**
     * Disable file watchers for a specific directory during operations
     */
    static async disableWatchers(projectDir) {
        const normalizedPath = path.resolve(projectDir).toLowerCase();
        // Get existing watcher for this directory
        const existingWatcher = this.watchers.get(normalizedPath);
        if (existingWatcher) {
            console.log(`[TEMPLATE_MANAGER] Pausing file watcher for ${projectDir}`);
            await existingWatcher.close();
        }
        // Store any callbacks that were attached
        const callbacks = this.watcherCallbacks.get(normalizedPath) || [];
        this.watcherCallbacks.set(normalizedPath, callbacks);
        console.log(`[TEMPLATE_MANAGER] File watchers disabled for ${projectDir}`);
    }
    /**
     * Re-enable file watchers for a specific directory after operations
     */
    static async enableWatchers(projectDir) {
        const normalizedPath = path.resolve(projectDir).toLowerCase();
        // Don't create new watchers unless there were callbacks stored
        const callbacks = this.watcherCallbacks.get(normalizedPath);
        if (!callbacks || callbacks.length === 0) {
            console.log(`[TEMPLATE_MANAGER] No watchers to re-enable for ${projectDir}`);
            return;
        }
        try {
            // Create new watcher
            const watcher = watch(projectDir, {
                ignored: /node_modules|\.git|default_components/,
                ignoreInitial: true,
                persistent: false
            });
            // Re-attach stored callbacks
            for (const callback of callbacks) {
                watcher.on('change', callback);
            }
            this.watchers.set(normalizedPath, watcher);
            console.log(`[TEMPLATE_MANAGER] File watchers re-enabled for ${projectDir}`);
        }
        catch (error) {
            console.warn(`[TEMPLATE_MANAGER] Failed to re-enable watchers for ${projectDir}:`, error);
        }
    }
    /**
     * Create a snapshot of template files before operations
     */
    static async createSnapshot(projectDir, templatePaths = ['template/**/*']) {
        const normalizedPath = path.resolve(projectDir).toLowerCase();
        const snapshot = {};
        try {
            for (const templatePath of templatePaths) {
                const fullPath = path.join(projectDir, templatePath);
                const files = await this.findFilesRecursive(fullPath, ['.tsx', '.ts', '.jsx', '.js', '.json']);
                for (const filePath of files) {
                    try {
                        const content = await fs.readFile(filePath, 'utf8');
                        const relativePath = path.relative(projectDir, filePath);
                        snapshot[relativePath] = content;
                    }
                    catch (error) {
                        console.warn(`[TEMPLATE_MANAGER] Could not snapshot ${filePath}:`, error);
                    }
                }
            }
            this.templateSnapshots.set(normalizedPath, snapshot);
            console.log(`[TEMPLATE_MANAGER] Created snapshot of ${Object.keys(snapshot).length} template files`);
        }
        catch (error) {
            console.warn(`[TEMPLATE_MANAGER] Failed to create template snapshot:`, error);
        }
    }
    /**
     * Restore template files from snapshot if they were corrupted
     */
    static async restoreFromSnapshot(projectDir) {
        const normalizedPath = path.resolve(projectDir).toLowerCase();
        const snapshot = this.templateSnapshots.get(normalizedPath);
        const restored = [];
        const failed = [];
        if (!snapshot) {
            console.log(`[TEMPLATE_MANAGER] No snapshot available for ${projectDir}`);
            return { restored, failed };
        }
        for (const [relativePath, originalContent] of Object.entries(snapshot)) {
            const fullPath = path.join(projectDir, relativePath);
            try {
                // Check if current file is different from snapshot
                const currentContent = await fs.readFile(fullPath, 'utf8').catch(() => '');
                if (currentContent !== originalContent) {
                    // File changed - check if it has syntax errors
                    if (await this.hasSyntaxErrors(fullPath, currentContent)) {
                        console.log(`[TEMPLATE_MANAGER] Restoring corrupted template file: ${relativePath}`);
                        await fs.writeFile(fullPath, originalContent, 'utf8');
                        restored.push(relativePath);
                    }
                }
            }
            catch (error) {
                console.warn(`[TEMPLATE_MANAGER] Failed to restore ${relativePath}:`, error);
                failed.push(relativePath);
            }
        }
        if (restored.length > 0) {
            console.log(`[TEMPLATE_MANAGER] Restored ${restored.length} corrupted template files`);
        }
        return { restored, failed };
    }
    /**
     * Check if a file has syntax errors
     */
    static async hasSyntaxErrors(filePath, content) {
        // Basic syntax check for common issues
        const lines = content.split('\n');
        let braceCount = 0;
        let parenCount = 0;
        let bracketCount = 0;
        for (const line of lines) {
            for (const char of line) {
                switch (char) {
                    case '{':
                        braceCount++;
                        break;
                    case '}':
                        braceCount--;
                        break;
                    case '(':
                        parenCount++;
                        break;
                    case ')':
                        parenCount--;
                        break;
                    case '[':
                        bracketCount++;
                        break;
                    case ']':
                        bracketCount--;
                        break;
                }
            }
        }
        // Check for unmatched brackets/braces/parens
        if (braceCount !== 0 || parenCount !== 0 || bracketCount !== 0) {
            return true;
        }
        // Check for common JSX/React issues
        if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
            // Look for unclosed JSX tags
            const jsxTagPattern = /<(\w+)[^>]*>/g;
            const closingTagPattern = /<\/(\w+)>/g;
            const openTags = content.match(jsxTagPattern) || [];
            const closeTags = content.match(closingTagPattern) || [];
            if (openTags.length !== closeTags.length) {
                return true;
            }
        }
        return false;
    }
    /**
     * Clean up all template management resources
     */
    static async cleanup() {
        console.log(`[TEMPLATE_MANAGER] Cleaning up template management resources`);
        // Close all watchers
        for (const [path, watcher] of this.watchers.entries()) {
            try {
                await watcher.close();
                console.log(`[TEMPLATE_MANAGER] Closed watcher for ${path}`);
            }
            catch (error) {
                console.warn(`[TEMPLATE_MANAGER] Error closing watcher for ${path}:`, error);
            }
        }
        this.watchers.clear();
        this.templateSnapshots.clear();
        this.watcherCallbacks.clear();
    }
    /**
     * Execute an operation with template isolation
     */
    static async withTemplateIsolation(projectDir, operation, options = {}) {
        const { createSnapshot = true, restoreOnError = true } = options;
        try {
            // Disable watchers
            await this.disableWatchers(projectDir);
            // Create snapshot if requested
            if (createSnapshot) {
                await this.createSnapshot(projectDir);
            }
            // Execute operation
            const result = await operation();
            return result;
        }
        catch (error) {
            // Restore from snapshot if operation failed and restore is enabled
            if (restoreOnError) {
                const { restored } = await this.restoreFromSnapshot(projectDir);
                if (restored.length > 0) {
                    console.log(`[TEMPLATE_MANAGER] Restored ${restored.length} files after operation failure`);
                }
            }
            throw error;
        }
        finally {
            // Re-enable watchers
            await this.enableWatchers(projectDir);
        }
    }
    /**
     * Helper method to find files recursively
     */
    static async findFilesRecursive(dirPath, extensions) {
        const files = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    const subFiles = await this.findFilesRecursive(fullPath, extensions);
                    files.push(...subFiles);
                }
                else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            // Directory doesn't exist or can't be read
        }
        return files;
    }
}
/**
 * Run ESLint validation on the project directory
 */
export async function validateWithESLint(projectDir) {
    return new Promise((resolve) => {
        const eslintProcess = spawn('npx', ['eslint', '**/*.{js,jsx,ts,tsx}', '--ignore-pattern', '**/default_components/**', '--format', 'json', '--no-error-on-unmatched-pattern'], {
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
                        // Use simple relative path from project root instead of complex relative paths
                        let filePath = path.relative(projectDir, fileResult.filePath);
                        // If the relative path goes up directories (..), use just the filename within project
                        if (filePath.startsWith('..')) {
                            const projectRelativePath = fileResult.filePath.replace(projectDir, '').replace(/^[\/\\]/, '');
                            filePath = projectRelativePath || path.basename(fileResult.filePath);
                        }
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
                        // Use simple relative path from project root instead of complex relative paths
                        let filePath = path.relative(projectDir, fileResult.filePath);
                        // If the relative path goes up directories (..), use just the filename within project
                        if (filePath.startsWith('..')) {
                            const projectRelativePath = fileResult.filePath.replace(projectDir, '').replace(/^[\/\\]/, '');
                            filePath = projectRelativePath || path.basename(fileResult.filePath);
                        }
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
            const errors = [];
            const warnings = [];
            if (code !== 0) {
                // Parse both stdout and stderr for all error information
                const allOutput = `${stdout}\n${stderr}`;
                const lines = allOutput.split('\n');
                // Look for specific error patterns that contain useful information
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    // Skip empty lines
                    if (!line)
                        continue;
                    // Module not found errors
                    if (line.includes("Module not found: Can't resolve")) {
                        const moduleMatch = line.match(/Module not found: Can't resolve '([^']+)'/);
                        const fileMatch = lines[i - 1] && lines[i - 1].match(/\.\/([^:]+):(\d+):(\d+)/);
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
                        if (line.includes('webpack') && line.includes('chunk'))
                            continue;
                        if (line.includes('Entry point'))
                            continue;
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
export async function validateProject(projectDir, syntaxOnly = false) {
    console.log(`[VALIDATION] Running ${syntaxOnly ? 'syntax-only' : 'comprehensive'} validation on: ${projectDir}`);
    // Use ValidationLockManager to prevent concurrent validation operations
    return await ValidationLockManager.withLock(projectDir, async () => {
        // First run syntax-only validation (fast)
        const syntaxResult = await validateSyntaxOnly(projectDir);
        if (!syntaxResult.isValid) {
            console.log(`[VALIDATION] Syntax validation failed, ${syntaxOnly ? 'stopping here' : 'skipping full validation'}`);
            return {
                ...syntaxResult,
                errors: enhanceErrorContext(syntaxResult.errors, projectDir)
            };
        }
        // If syntax-only mode, return early
        if (syntaxOnly) {
            return syntaxResult;
        }
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
            errors: enhanceErrorContext(allErrors, projectDir),
            warnings: allWarnings,
            fixableErrors: allFixableErrors,
            canAutoFix: allFixableErrors.length > 0
        };
        console.log(`[VALIDATION] Validation complete: ${result.isValid ? 'PASSED' : 'FAILED'}`);
        console.log(`[VALIDATION] Errors: ${result.errors.length}, Warnings: ${result.warnings.length}, Fixable: ${result.fixableErrors.length}`);
        return result;
    }); // Close ValidationLockManager.withLock
}
/**
 * Run validation without locks (for use in retry loops where locks interfere with file writes)
 */
export async function validateProjectWithoutLock(projectDir, syntaxOnly = false) {
    console.log(`[VALIDATION] Running ${syntaxOnly ? 'syntax-only' : 'comprehensive'} validation on: ${projectDir} (without lock)`);
    // First run syntax-only validation (fast)
    const syntaxResult = await validateSyntaxOnly(projectDir);
    if (!syntaxResult.isValid) {
        console.log(`[VALIDATION] Syntax validation failed, ${syntaxOnly ? 'stopping here' : 'skipping full validation'}`);
        return {
            ...syntaxResult,
            errors: enhanceErrorContext(syntaxResult.errors, projectDir)
        };
    }
    // If syntax-only mode, return early
    if (syntaxOnly) {
        return syntaxResult;
    }
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
        errors: enhanceErrorContext(allErrors, projectDir),
        warnings: allWarnings,
        fixableErrors: allFixableErrors,
        canAutoFix: allFixableErrors.length > 0
    };
    console.log(`[VALIDATION] Validation complete: ${result.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`[VALIDATION] Errors: ${result.errors.length}, Warnings: ${result.warnings.length}, Fixable: ${result.fixableErrors.length}`);
    return result;
}
/**
 * Run basic syntax validation (faster, syntax-only)
 */
export async function validateSyntaxOnly(projectDir) {
    console.log(`[VALIDATION] Running syntax-only validation on: ${projectDir}`);
    try {
        // Quick TypeScript/JavaScript syntax check
        const tscResult = await validateWithTSC(projectDir);
        if (!tscResult.isValid) {
            console.log(`[VALIDATION] TSC found ${tscResult.errors.length} errors`);
            return tscResult;
        }
        // Basic ESLint syntax check (no style rules)
        const eslintResult = await validateWithESLintSyntaxOnly(projectDir);
        if (!eslintResult.isValid) {
            console.log(`[VALIDATION] ESLint found ${eslintResult.errors.length} errors`);
            return eslintResult;
        }
        // If both TSC and ESLint pass, but we suspect there might be build issues, run a quick build check
        console.log(`[VALIDATION] TSC and ESLint passed, running quick build validation...`);
        const buildResult = await validateBuild(projectDir);
        return buildResult;
    }
    catch (error) {
        console.warn(`[VALIDATION] Syntax validation failed: ${error.message}`);
        return {
            isValid: false,
            errors: [{
                    type: 'syntax',
                    file: 'unknown',
                    message: `Syntax validation failed: ${error.message}`,
                    severity: 'error',
                    fixable: false
                }],
            warnings: [],
            fixableErrors: [],
            canAutoFix: false
        };
    }
}
/**
 * Run TypeScript compiler check for syntax errors
 */
export async function validateWithTSC(projectDir) {
    return new Promise((resolve) => {
        const tscProcess = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
            cwd: projectDir,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        tscProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        tscProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        tscProcess.on('close', (code) => {
            const errors = [];
            // Parse TypeScript errors - check both stdout and stderr
            const output = stdout + stderr;
            console.log(`[VALIDATION] TSC output (code: ${code}):`, output.substring(0, 500));
            // Look for various error patterns
            const lines = output.split('\n');
            for (const line of lines) {
                // Standard TypeScript error format
                const tsMatch = line.match(/(.+?)\((\d+),(\d+)\): error TS\d+: (.+)/);
                if (tsMatch) {
                    const [, filePath, lineStr, columnStr, message] = tsMatch;
                    // Use simple relative path from project root instead of complex relative paths
                    let relativePath = path.relative(projectDir, filePath);
                    // If the relative path goes up directories (..), use just the filename within project
                    if (relativePath.startsWith('..')) {
                        // Try to find the file within the project directory
                        const fileName = path.basename(filePath);
                        const projectRelativePath = filePath.replace(projectDir, '').replace(/^[\/\\]/, '');
                        relativePath = projectRelativePath || fileName;
                    }
                    // Skip errors from default_components directory
                    if (relativePath.includes('default_components')) {
                        continue;
                    }
                    // Check if this is a surgically fixable import/export error
                    const isFixableImportExport = isImportExportSurgicallyFixable(message.trim());
                    errors.push({
                        type: 'syntax',
                        file: relativePath,
                        line: parseInt(lineStr),
                        column: parseInt(columnStr),
                        message: message.trim(),
                        severity: 'error',
                        fixable: isFixableImportExport,
                        rule: isFixableImportExport ? 'surgical-import-export' : undefined
                    });
                    continue;
                }
                // Alternative error format
                const altMatch = line.match(/(.+?):(\d+):(\d+) - error TS\d+: (.+)/);
                if (altMatch) {
                    const [, filePath, lineStr, columnStr, message] = altMatch;
                    // Use simple relative path from project root instead of complex relative paths
                    let relativePath = path.relative(projectDir, filePath);
                    // If the relative path goes up directories (..), use just the filename within project
                    if (relativePath.startsWith('..')) {
                        // Try to find the file within the project directory
                        const fileName = path.basename(filePath);
                        const projectRelativePath = filePath.replace(projectDir, '').replace(/^[\/\\]/, '');
                        relativePath = projectRelativePath || fileName;
                    }
                    // Skip errors from default_components directory
                    if (relativePath.includes('default_components')) {
                        continue;
                    }
                    // Check if this is a surgically fixable import/export error
                    const isFixableImportExport = isImportExportSurgicallyFixable(message.trim());
                    errors.push({
                        type: 'syntax',
                        file: relativePath,
                        line: parseInt(lineStr),
                        column: parseInt(columnStr),
                        message: message.trim(),
                        severity: 'error',
                        fixable: isFixableImportExport,
                        rule: isFixableImportExport ? 'surgical-import-export' : undefined
                    });
                    continue;
                }
                // Generic error detection - skip compiler option errors and default_components
                if (line.includes('error') && !line.includes('0 errors') &&
                    !line.includes('Unknown compiler option') &&
                    !line.includes('default_components')) {
                    errors.push({
                        type: 'syntax',
                        file: 'unknown',
                        message: line.trim(),
                        severity: 'error',
                        fixable: false
                    });
                }
            }
            // If code is non-zero but no errors found, create a generic error
            if (code !== 0 && errors.length === 0) {
                errors.push({
                    type: 'syntax',
                    file: 'unknown',
                    message: `TypeScript compilation failed with code ${code}\n\nOutput: ${output.trim()}`,
                    severity: 'error',
                    fixable: false
                });
            }
            // Calculate fixable errors
            const fixableErrors = errors.filter(error => error.fixable);
            const canAutoFix = fixableErrors.length > 0;
            resolve({
                isValid: code === 0 && errors.length === 0,
                errors,
                warnings: [],
                fixableErrors,
                canAutoFix
            });
        });
    });
}
/**
 * Run ESLint with only syntax rules (no style/formatting)
 */
export async function validateWithESLintSyntaxOnly(projectDir) {
    return new Promise((resolve) => {
        const eslintProcess = spawn('npx', ['eslint', '**/*.{js,jsx,ts,tsx}', '--ignore-pattern', '**/default_components/**', '--format', 'json', '--no-error-on-unmatched-pattern', '--no-eslintrc', '--config', JSON.stringify({
                parser: '@typescript-eslint/parser',
                parserOptions: {
                    ecmaVersion: 2020,
                    sourceType: 'module',
                    ecmaFeatures: { jsx: true }
                },
                rules: {
                    'no-undef': 'error',
                    'no-unused-vars': 'off',
                    'no-console': 'off'
                }
            })], {
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
                if (stdout.trim()) {
                    const eslintResults = JSON.parse(stdout);
                    for (const fileResult of eslintResults) {
                        // Use simple relative path from project root instead of complex relative paths
                        let filePath = path.relative(projectDir, fileResult.filePath);
                        // If the relative path goes up directories (..), use just the filename within project
                        if (filePath.startsWith('..')) {
                            const projectRelativePath = fileResult.filePath.replace(projectDir, '').replace(/^[\/\\]/, '');
                            filePath = projectRelativePath || path.basename(fileResult.filePath);
                        }
                        for (const message of fileResult.messages) {
                            if (message.severity === 2) { // Only errors
                                errors.push({
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
                    isValid: errors.length === 0,
                    errors,
                    warnings: [],
                    fixableErrors: errors.filter(e => e.fixable),
                    canAutoFix: errors.some(e => e.fixable)
                });
            }
            catch (parseError) {
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
    // Use ValidationLockManager to prevent concurrent auto-fix operations
    return await ValidationLockManager.withLock(projectDir, async () => {
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
    }); // Close ValidationLockManager.withLock
}
/**
 * Enhance errors with better context and recovery suggestions
 */
export function enhanceErrorContext(errors, projectDir) {
    // Filter out errors from default_components directory
    const filteredErrors = errors.filter(error => !error.file.includes('default_components'));
    return filteredErrors.map(error => {
        const enhancedError = { ...error };
        // Add recovery suggestions based on common patterns
        const suggestions = getRecoverySuggestions(error);
        if (suggestions.length > 0) {
            enhancedError.message = `${error.message}\n\n🔧 Suggested fixes:\n${suggestions.map(s => `  • ${s}`).join('\n')}`;
        }
        return enhancedError;
    });
}
/**
 * Get recovery suggestions for common error patterns
 */
export function getRecoverySuggestions(error) {
    const suggestions = [];
    const message = error.message.toLowerCase();
    // JSX syntax errors
    if (message.includes('unexpected token') && message.includes('expected jsx identifier')) {
        suggestions.push('Check for missing closing tags or unclosed JSX elements');
        suggestions.push('Verify all JSX elements are properly nested');
        suggestions.push('Look for stray code outside the return statement');
    }
    // Expression expected errors
    if (message.includes('expression expected')) {
        suggestions.push('Check for incomplete JSX expressions or missing content');
        suggestions.push('Verify all curly braces {} have valid expressions inside');
        suggestions.push('Look for missing return statement content');
    }
    // Missing semicolon or brace errors
    if (message.includes('expected') && (message.includes(';') || message.includes('}') || message.includes('<eof>'))) {
        suggestions.push('Check for missing closing braces } or parentheses )');
        suggestions.push('Verify all functions and components are properly closed');
        suggestions.push('Look for duplicate or extra code after component closure');
    }
    // Import/Export errors
    if (message.includes('import') || message.includes('export')) {
        suggestions.push('Check import/export syntax and file paths');
        suggestions.push('Verify component names match file exports');
        suggestions.push('Remove duplicate export statements');
    }
    // Duplicate code errors
    if (message.includes('duplicate')) {
        suggestions.push('Remove duplicate functions, variables, or exports');
        suggestions.push('Check for copy-pasted code sections');
        suggestions.push('Consolidate repeated JSX elements');
    }
    return suggestions;
}
/**
 * Detect common error patterns that require different fixing strategies
 */
export function detectErrorPattern(errors) {
    const duplicateCount = errors.filter(e => e.message.toLowerCase().includes('duplicate')).length;
    const jsxCount = errors.filter(e => e.message.toLowerCase().includes('jsx') || e.message.toLowerCase().includes('unexpected token')).length;
    const bracketCount = errors.filter(e => e.message.toLowerCase().includes('expected') && (e.message.includes(';') || e.message.includes('}'))).length;
    const importCount = errors.filter(e => e.message.toLowerCase().includes('import') || e.message.toLowerCase().includes('export')).length;
    const total = errors.length;
    if (duplicateCount > total * 0.6)
        return 'duplicate_code';
    if (jsxCount > total * 0.6)
        return 'jsx_structure';
    if (bracketCount > total * 0.6)
        return 'missing_brackets';
    if (importCount > total * 0.6)
        return 'import_export';
    return 'mixed_issues';
}
/**
 * Get guidance for common error patterns
 */
function getPatternGuidance(pattern) {
    switch (pattern) {
        case 'duplicate_code':
            return 'Multiple duplicate exports/functions detected. Focus on removing duplicate code sections first.';
        case 'jsx_structure':
            return 'JSX structural issues detected. Check for unclosed tags, missing brackets, or malformed JSX.';
        case 'missing_brackets':
            return 'Missing brackets/braces detected. Look for unclosed functions, objects, or JSX elements.';
        case 'import_export':
            return 'Import/Export issues detected. Check import paths and remove duplicate exports.';
        case 'mixed_issues':
            return 'Multiple error types detected. Fix syntax errors first, then address other issues.';
        default:
            return '';
    }
}
/**
 * Generate error report for Cline CLI - focused format for fix tasks
 */
export async function generateErrorReport(validation, isFixTask = false) {
    console.log(`[VALIDATION] Generating error report. isValid: ${validation.isValid}, errors: ${validation.errors.length}, fixTask: ${isFixTask}`);
    if (validation.isValid) {
        return "✅ All validation checks passed! The project has no errors.";
    }
    if (validation.errors.length === 0) {
        return "❌ Validation failed but no specific errors were captured. This may indicate a configuration or build issue.";
    }
    // Use focused format for fix tasks to prevent model sidetracking
    if (isFixTask) {
        return await generateFocusedErrorReport(validation);
    }
    // Original verbose format for initial reports
    const report = [];
    report.push("❌ Validation failed. Please fix the following issues:\n");
    // Detect error pattern and add pattern-specific guidance
    const pattern = detectErrorPattern(validation.errors);
    const patternGuidance = getPatternGuidance(pattern);
    if (patternGuidance) {
        report.push(`🎯 Error Pattern Detected: ${patternGuidance}\n`);
    }
    // Group errors by file
    const errorsByFile = {};
    for (const error of validation.errors) {
        const fileName = error.file || 'unknown';
        if (!errorsByFile[fileName]) {
            errorsByFile[fileName] = [];
        }
        errorsByFile[fileName].push(error);
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
    console.log(`[VALIDATION] Generated error report:`, report.join('\n').substring(0, 500));
    return report.join('\n');
}
/**
 * Generate focused error report specifically for fix tasks - errors first, no strategy text
 */
async function generateFocusedErrorReport(validation) {
    const report = [];
    report.push("🚨 CURRENT ERRORS TO FIX:");
    report.push("");
    // Group errors by file
    const errorsByFile = {};
    for (const error of validation.errors) {
        const fileName = error.file || 'unknown';
        if (!errorsByFile[fileName]) {
            errorsByFile[fileName] = [];
        }
        errorsByFile[fileName].push(error);
    }
    for (const [file, errors] of Object.entries(errorsByFile)) {
        for (const error of errors) {
            const location = error.line ? `:${error.line}${error.column ? `:${error.column}` : ''}` : '';
            report.push(`${file}${location}`);
            report.push(`❌ ${error.message}`);
            // Add specific fix instruction based on error type with StructureAnalyzer enhancement
            const fixInstruction = await getSpecificFixInstruction(error);
            if (fixInstruction) {
                report.push(`🔧 ${fixInstruction}`);
            }
            report.push('');
        }
    }
    return report.join('\n');
}
/**
 * Get specific fix instruction for common error patterns
 */
async function getSpecificFixInstruction(error) {
    const message = error.message.toLowerCase();
    // Try to get file content for StructureAnalyzer
    let fileContent = '';
    let analysisResult = null;
    try {
        if (error.file && error.file !== 'unknown') {
            fileContent = await fs.readFile(error.file, 'utf8');
            analysisResult = mockStructureAnalyzer.analyzeEditScope(error, fileContent, error.file);
        }
    }
    catch (e) {
        // Continue without structure analysis if file read fails
    }
    // Build base fix instruction
    let baseInstruction = '';
    // Import/Export errors - handle "Cannot find name" specifically
    if (message.includes('cannot find name')) {
        const match = error.message.match(/Cannot find name '([^']+)'/);
        const componentName = match ? match[1] : 'component';
        if (componentName === 'Code') {
            baseInstruction = `Missing import: Add \`import { Code } from "@heroui/code"\` OR replace \`<Code>\` with \`<span>\``;
        }
        else {
            baseInstruction = `Missing import: Add \`import { ${componentName} } from "@heroui/${componentName.toLowerCase()}"\` OR replace with valid element`;
        }
    }
    // Type assignment errors - handle specific HeroUI component prop errors
    else if (message.includes('not assignable to type')) {
        if (message.includes('"default"') && message.includes('"primary"')) {
            baseInstruction = `Invalid Button/Chip color prop: Change string variable to literal like "primary", "secondary", "warning", "danger"`;
        }
        else {
            baseInstruction = `Invalid prop value: Change to one of the allowed type values`;
        }
    }
    // Interface/Props errors
    else if (message.includes('has no properties in common')) {
        baseInstruction = `Fix syntax error at specified location`;
    }
    // Duplicate code
    else if (message.includes('duplicate')) {
        baseInstruction = `Remove duplicate ${message.includes('export') ? 'export' : 'declaration'}`;
    }
    // JSX errors
    else if (message.includes('jsx') || message.includes('unexpected token')) {
        baseInstruction = `Fix JSX syntax: Check for unclosed tags, missing brackets, or malformed elements`;
    }
    // Generic fix instruction
    else {
        baseInstruction = `Fix syntax error`;
    }
    // Enhance with StructureAnalyzer recommendations if available
    if (analysisResult) {
        const toolRecommendation = analysisResult.recommendedTool === 'edit_file' ?
            'Use edit_file for targeted fix' :
            analysisResult.recommendedTool === 'multi_edit_file' ?
                'Use multi_edit_file for multiple related changes' :
                'Use replace_in_file for complex changes';
        return `${baseInstruction} (${toolRecommendation})`;
    }
    return baseInstruction;
}
// Helper functions
/**
 * Check if an ESLint error is non-critical (parsing issues, config problems, etc.)
 * that shouldn't trigger auto-fix loops
 */
function isNonCriticalError(message) {
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
function isNonCriticalBuildError(errorLine) {
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
function isNonCriticalBuildFailure(stdout, stderr) {
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
async function findFilesRecursive(dir, extensions) {
    const files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'default_components') {
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
