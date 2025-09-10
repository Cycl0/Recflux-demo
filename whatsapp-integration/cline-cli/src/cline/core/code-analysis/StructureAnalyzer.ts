/**
 * Code structure analyzer for context-aware editing
 * Uses Node.js built-in parsing capabilities to analyze code structure
 */

import { EditScope, StructuralContext, EditScopeLevel, EnhancedValidationError } from '../../shared/EditScope.js';

interface CodePosition {
    line: number;
    column: number;
}

interface ASTNode {
    type: string;
    start: CodePosition;
    end: CodePosition;
    name?: string;
    children?: ASTNode[];
}

export class StructureAnalyzer {
    
    /**
     * Analyze the edit scope required for a validation error
     */
    public static analyzeEditScope(
        error: any, 
        fileContent: string, 
        filePath: string
    ): EnhancedValidationError {
        
        const enhancedError: EnhancedValidationError = {
            ...error,
            editScope: this.determineEditScope(error, fileContent),
            structuralContext: this.analyzeStructuralContext(error, fileContent),
        };
        
        // Add tool recommendation and guidance
        enhancedError.recommendedTool = this.recommendTool(enhancedError.editScope!);
        enhancedError.contextualGuidance = this.generateContextualGuidance(enhancedError);
        
        return enhancedError;
    }
    
    /**
     * Determine the minimal edit scope required for an error
     */
    private static determineEditScope(error: any, fileContent: string): EditScope {
        const lines = fileContent.split('\n');
        const errorLine = error.line ? error.line - 1 : 0; // Convert to 0-based
        const errorColumn = error.column || 0;
        
        // Analyze error type to determine scope
        const scopeLevel = this.determineScopeLevel(error, lines, errorLine, errorColumn);
        const operation = this.determineOperation(error);
        const range = this.calculateEditRange(scopeLevel, error, lines, errorLine, errorColumn);
        const safeBoundaries = this.calculateSafeBoundaries(range, lines, scopeLevel);
        const dependencies = this.findDependencies(error, lines, errorLine);
        
        return {
            level: scopeLevel,
            operation,
            range,
            safeBoundaries,
            dependencies,
            requiresMultiEdit: dependencies.length > 2 || scopeLevel === 'function',
            confidence: this.calculateConfidence(scopeLevel, error)
        };
    }
    
    /**
     * Determine the scope level needed based on error type and context
     */
    private static determineScopeLevel(
        error: any, 
        lines: string[], 
        errorLine: number, 
        errorColumn: number
    ): EditScopeLevel {
        
        const message = error.message.toLowerCase();
        const currentLine = lines[errorLine] || '';
        
        // Character-level fixes
        if (this.isCharacterLevelError(message)) {
            return 'character';
        }
        
        // Line-level fixes
        if (this.isLineLevelError(message)) {
            return 'line';
        }
        
        // Expression-level fixes
        if (this.isExpressionLevelError(message, currentLine)) {
            return 'expression';
        }
        
        // Block-level fixes (JSX elements, objects, etc.)
        if (this.isBlockLevelError(message, currentLine)) {
            return 'block';
        }
        
        // Function-level fixes
        if (this.isFunctionLevelError(message, lines, errorLine)) {
            return 'function';
        }
        
        // Default to line-level
        return 'line';
    }
    
    /**
     * Check if error requires only character-level fixes
     */
    private static isCharacterLevelError(message: string): boolean {
        const characterPatterns = [
            'missing closing',
            'unterminated string',
            'expected }',
            'expected )',
            'expected ]',
            'expected ;',
            'unexpected }',
            'unexpected )',
            'unexpected ]'
        ];
        
        return characterPatterns.some(pattern => message.includes(pattern));
    }
    
    /**
     * Check if error requires line-level fixes
     */
    private static isLineLevelError(message: string): boolean {
        const linePatterns = [
            'cannot find name',
            'is not defined',
            'import',
            'export',
            'module not found',
            'duplicate identifier'
        ];
        
        return linePatterns.some(pattern => message.includes(pattern));
    }
    
    /**
     * Check if error requires expression-level fixes
     */
    private static isExpressionLevelError(message: string, currentLine: string): boolean {
        const expressionPatterns = [
            'type mismatch',
            'not assignable to type',
            'property does not exist',
            'argument of type'
        ];
        
        return expressionPatterns.some(pattern => message.includes(pattern)) ||
               currentLine.includes('{') && currentLine.includes('}');
    }
    
    /**
     * Check if error requires block-level fixes
     */
    private static isBlockLevelError(message: string, currentLine: string): boolean {
        const blockPatterns = [
            'jsx element',
            'corresponding closing tag',
            'tsx element',
            'react component'
        ];
        
        return blockPatterns.some(pattern => message.includes(pattern)) ||
               currentLine.trim().startsWith('<') ||
               currentLine.includes('return (');
    }
    
    /**
     * Check if error requires function-level fixes
     */
    private static isFunctionLevelError(message: string, lines: string[], errorLine: number): boolean {
        const functionPatterns = [
            'function declaration',
            'function expression',
            'arrow function',
            'async function'
        ];
        
        if (functionPatterns.some(pattern => message.includes(pattern))) {
            return true;
        }
        
        // Check if we're inside a malformed function
        return this.isInsideMalformedFunction(lines, errorLine);
    }
    
    /**
     * Check if the error is inside a malformed function
     */
    private static isInsideMalformedFunction(lines: string[], errorLine: number): boolean {
        let functionStart = -1;
        let braceCount = 0;
        
        // Look backwards for function declaration
        for (let i = errorLine; i >= 0; i--) {
            const line = lines[i];
            
            if (line.includes('function') || line.includes('=>') || line.includes('const') && line.includes('=')) {
                functionStart = i;
                break;
            }
        }
        
        if (functionStart === -1) return false;
        
        // Count braces to see if function is malformed
        for (let i = functionStart; i <= errorLine; i++) {
            const line = lines[i];
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
        }
        
        return braceCount > 0; // Unclosed braces indicate malformed function
    }
    
    /**
     * Determine the operation needed (insert, replace, delete, complete)
     */
    private static determineOperation(error: any): 'insert' | 'replace' | 'delete' | 'complete' {
        const message = error.message.toLowerCase();
        
        if (message.includes('missing') || message.includes('expected')) {
            return 'insert';
        }
        
        if (message.includes('unexpected') || message.includes('duplicate')) {
            return 'delete';
        }
        
        if (message.includes('unterminated') || message.includes('incomplete')) {
            return 'complete';
        }
        
        return 'replace';
    }
    
    /**
     * Calculate the exact range for the edit
     */
    private static calculateEditRange(
        scopeLevel: EditScopeLevel,
        error: any,
        lines: string[],
        errorLine: number,
        errorColumn: number
    ) {
        switch (scopeLevel) {
            case 'character':
                return {
                    start: { line: errorLine + 1, column: errorColumn },
                    end: { line: errorLine + 1, column: errorColumn + 1 }
                };
                
            case 'line':
                return {
                    start: { line: errorLine + 1, column: 0 },
                    end: { line: errorLine + 1, column: lines[errorLine]?.length || 0 }
                };
                
            case 'expression':
                return this.findExpressionBounds(lines, errorLine, errorColumn);
                
            case 'block':
                return this.findBlockBounds(lines, errorLine);
                
            case 'function':
                return this.findFunctionBounds(lines, errorLine);
                
            default:
                return {
                    start: { line: errorLine + 1, column: 0 },
                    end: { line: errorLine + 1, column: lines[errorLine]?.length || 0 }
                };
        }
    }
    
    /**
     * Find the bounds of an expression
     */
    private static findExpressionBounds(lines: string[], errorLine: number, errorColumn: number) {
        const line = lines[errorLine] || '';
        
        // Simple heuristic: find the nearest complete expression
        let start = 0;
        let end = line.length;
        
        // Look for common expression delimiters
        const delimiters = [';', ',', ')', '}', '>'];
        
        for (let i = errorColumn; i >= 0; i--) {
            if (delimiters.includes(line[i]) || line[i] === '=' || line[i] === '{') {
                start = i + 1;
                break;
            }
        }
        
        for (let i = errorColumn; i < line.length; i++) {
            if (delimiters.includes(line[i])) {
                end = i;
                break;
            }
        }
        
        return {
            start: { line: errorLine + 1, column: start },
            end: { line: errorLine + 1, column: end }
        };
    }
    
    /**
     * Find the bounds of a block (JSX element, object, etc.)
     */
    private static findBlockBounds(lines: string[], errorLine: number) {
        let startLine = errorLine;
        let endLine = errorLine;
        
        // Look for JSX or object opening
        for (let i = errorLine; i >= 0; i--) {
            const line = lines[i];
            if (line.includes('<') || line.includes('{') || line.includes('return (')) {
                startLine = i;
                break;
            }
        }
        
        // Look for corresponding closing
        let braceCount = 0;
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            braceCount += (line.match(/[{<(]/g) || []).length;
            braceCount -= (line.match(/[}>)]/g) || []).length;
            
            if (braceCount === 0 && i > startLine) {
                endLine = i;
                break;
            }
        }
        
        return {
            start: { line: startLine + 1, column: 0 },
            end: { line: endLine + 1, column: lines[endLine]?.length || 0 }
        };
    }
    
    /**
     * Find the bounds of a function
     */
    private static findFunctionBounds(lines: string[], errorLine: number) {
        let startLine = errorLine;
        let endLine = errorLine;
        
        // Look backwards for function start
        for (let i = errorLine; i >= 0; i--) {
            const line = lines[i];
            if (line.includes('function') || line.includes('=>') || 
                (line.includes('const') && line.includes('='))) {
                startLine = i;
                break;
            }
        }
        
        // Look forward for function end
        let braceCount = 0;
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
            
            if (braceCount === 0 && i > startLine) {
                endLine = i;
                break;
            }
        }
        
        return {
            start: { line: startLine + 1, column: 0 },
            end: { line: endLine + 1, column: lines[endLine]?.length || 0 }
        };
    }
    
    /**
     * Calculate safe boundaries to prevent breaking unrelated code
     */
    private static calculateSafeBoundaries(range: any, lines: string[], scopeLevel: EditScopeLevel) {
        // For now, safe boundaries are the same as the edit range
        // In a more sophisticated version, this would analyze the broader context
        return {
            start: range.start,
            end: range.end
        };
    }
    
    /**
     * Find dependencies that might be affected by the edit
     */
    private static findDependencies(error: any, lines: string[], errorLine: number): string[] {
        const dependencies: string[] = [];
        const currentLine = lines[errorLine] || '';
        
        // Extract variable names, function names, etc.
        const identifiers = currentLine.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
        
        // Add unique identifiers as dependencies
        identifiers.forEach(identifier => {
            if (!dependencies.includes(identifier) && 
                !['const', 'let', 'var', 'function', 'return', 'if', 'else'].includes(identifier)) {
                dependencies.push(identifier);
            }
        });
        
        return dependencies;
    }
    
    /**
     * Calculate confidence level in the scope analysis
     */
    private static calculateConfidence(scopeLevel: EditScopeLevel, error: any): number {
        // Simple confidence calculation based on error clarity
        const message = error.message.toLowerCase();
        
        if (scopeLevel === 'character' && 
            (message.includes('missing') || message.includes('expected'))) {
            return 0.9;
        }
        
        if (scopeLevel === 'line' && message.includes('cannot find name')) {
            return 0.8;
        }
        
        return 0.7; // Default confidence
    }
    
    /**
     * Analyze the structural context around an error
     */
    private static analyzeStructuralContext(error: any, fileContent: string): StructuralContext {
        const lines = fileContent.split('\n');
        const errorLine = error.line ? error.line - 1 : 0;
        
        return {
            containerType: this.detectContainerType(lines, errorLine),
            containerName: this.detectContainerName(lines, errorLine),
            containerBounds: this.findContainerBounds(lines, errorLine),
            relatedElements: this.findRelatedElements(lines, errorLine),
            affectsStructuralIntegrity: this.assessStructuralImpact(error),
            nestingLevel: this.calculateNestingLevel(lines, errorLine)
        };
    }
    
    /**
     * Detect the type of code structure containing the error
     */
    private static detectContainerType(lines: string[], errorLine: number): StructuralContext['containerType'] {
        // Look backwards to find the containing structure
        for (let i = errorLine; i >= 0; i--) {
            const line = lines[i].trim();
            
            if (line.includes('function') || line.includes('=>')) {
                return 'function';
            }
            if (line.includes('class ')) {
                return 'class';
            }
            if (line.includes('import')) {
                return 'import';
            }
            if (line.includes('export')) {
                return 'export';
            }
            if (line.startsWith('<') && line.includes('>')) {
                return 'jsx_element';
            }
            if (line.includes('{') && !line.includes('function')) {
                return 'object';
            }
        }
        
        return 'statement';
    }
    
    /**
     * Detect the name of the containing structure
     */
    private static detectContainerName(lines: string[], errorLine: number): string | undefined {
        for (let i = errorLine; i >= 0; i--) {
            const line = lines[i];
            
            // Function name
            const functionMatch = line.match(/(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/);
            if (functionMatch) {
                return functionMatch[1];
            }
            
            // Class name
            const classMatch = line.match(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
            if (classMatch) {
                return classMatch[1];
            }
            
            // JSX component
            const jsxMatch = line.match(/<([A-Z][a-zA-Z0-9]*)/);
            if (jsxMatch) {
                return jsxMatch[1];
            }
        }
        
        return undefined;
    }
    
    /**
     * Find the bounds of the containing structure
     */
    private static findContainerBounds(lines: string[], errorLine: number) {
        // Simple implementation - can be enhanced with proper AST parsing
        return {
            start: Math.max(0, errorLine - 5),
            end: Math.min(lines.length - 1, errorLine + 5)
        };
    }
    
    /**
     * Find related elements in the current scope
     */
    private static findRelatedElements(lines: string[], errorLine: number): string[] {
        const elements: string[] = [];
        const contextLines = lines.slice(Math.max(0, errorLine - 3), errorLine + 4);
        
        contextLines.forEach(line => {
            const identifiers = line.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
            identifiers.forEach(id => {
                if (!elements.includes(id) && 
                    !['const', 'let', 'var', 'function', 'return'].includes(id)) {
                    elements.push(id);
                }
            });
        });
        
        return elements;
    }
    
    /**
     * Assess whether the error affects structural integrity
     */
    private static assessStructuralImpact(error: any): boolean {
        const message = error.message.toLowerCase();
        
        const structuralKeywords = [
            'missing closing',
            'expected }',
            'expected )',
            'jsx element',
            'function declaration',
            'unterminated'
        ];
        
        return structuralKeywords.some(keyword => message.includes(keyword));
    }
    
    /**
     * Calculate nesting level
     */
    private static calculateNestingLevel(lines: string[], errorLine: number): number {
        let level = 0;
        const line = lines[errorLine] || '';
        
        for (let char of line) {
            if (char === '{' || char === '(' || char === '[') {
                level++;
            }
        }
        
        return level;
    }
    
    /**
     * Recommend the best tool for the fix
     */
    private static recommendTool(editScope: EditScope): 'Edit' | 'MultiEdit' | 'Write' {
        if (editScope.level === 'character' || editScope.level === 'line') {
            return 'Edit';
        }
        
        if (editScope.requiresMultiEdit || editScope.dependencies.length > 2) {
            return 'MultiEdit';
        }
        
        if (editScope.level === 'function' || editScope.level === 'file') {
            return 'Write';
        }
        
        return 'Edit';
    }
    
    /**
     * Generate contextual guidance for the fix
     */
    private static generateContextualGuidance(error: EnhancedValidationError): string {
        const scope = error.editScope!;
        const context = error.structuralContext!;
        
        let guidance = `${scope.level.toUpperCase()}-LEVEL ${scope.operation.toUpperCase()}`;
        
        if (scope.level === 'character') {
            guidance += ' - Precise single character fix, do not modify surrounding code';
        } else if (scope.level === 'function') {
            guidance += ` - Replace entire ${context.containerName || 'function'}, maintain functionality`;
        } else if (scope.level === 'block') {
            guidance += ` - Fix complete ${context.containerType} block, ensure proper nesting`;
        }
        
        if (scope.dependencies.length > 0) {
            guidance += ` - Related: ${scope.dependencies.join(', ')}`;
        }
        
        return guidance;
    }
}