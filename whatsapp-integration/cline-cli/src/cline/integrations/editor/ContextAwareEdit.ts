/**
 * Context-aware edit tools that understand code structure and prevent stray code
 */

import { StructureAnalyzer } from '../../core/code-analysis/StructureAnalyzer.js';
import { EnhancedValidationError, EditScope } from '../../shared/EditScope.js';

export interface ContextAwareEditResult {
    success: boolean;
    editApplied: boolean;
    cleanupPerformed: boolean;
    straysDetected: string[];
    recommendation: string;
}

export class ContextAwareEdit {
    
    /**
     * Perform a context-aware edit based on validation error analysis
     */
    public static async performContextAwareEdit(
        filePath: string,
        fileContent: string,
        validationError: any
    ): Promise<ContextAwareEditResult> {
        
        // Analyze the error context and determine edit scope
        const enhancedError = StructureAnalyzer.analyzeEditScope(
            validationError, 
            fileContent, 
            filePath
        );
        
        // Pre-edit validation
        const preEditAnalysis = this.preEditAnalysis(enhancedError, fileContent);
        if (!preEditAnalysis.safe) {
            return {
                success: false,
                editApplied: false,
                cleanupPerformed: false,
                straysDetected: [],
                recommendation: preEditAnalysis.recommendation
            };
        }
        
        // Apply the appropriate edit strategy
        const editResult = await this.applyEdit(enhancedError, fileContent);
        
        // Post-edit cleanup and validation
        const cleanupResult = this.postEditCleanup(editResult.content, enhancedError);
        
        return {
            success: editResult.success && cleanupResult.success,
            editApplied: editResult.success,
            cleanupPerformed: cleanupResult.cleanupApplied,
            straysDetected: cleanupResult.straysDetected,
            recommendation: this.generateRecommendation(enhancedError)
        };
    }
    
    /**
     * Analyze if the edit is safe to perform
     */
    private static preEditAnalysis(
        error: EnhancedValidationError, 
        fileContent: string
    ): { safe: boolean; recommendation: string } {
        
        const scope = error.editScope!;
        
        // Check confidence level
        if (scope.confidence < 0.6) {
            return {
                safe: false,
                recommendation: `Low confidence (${Math.round(scope.confidence * 100)}%) in edit scope analysis. Manual review recommended.`
            };
        }
        
        // Check for overlapping issues
        if (scope.dependencies.length > 5) {
            return {
                safe: false,
                recommendation: `Too many dependencies (${scope.dependencies.length}). Consider breaking into smaller edits.`
            };
        }
        
        // Check edit range safety
        const lines = fileContent.split('\n');
        const editLines = scope.range.end.line - scope.range.start.line;
        
        if (editLines > 50 && scope.level !== 'file') {
            return {
                safe: false,
                recommendation: `Edit range too large (${editLines} lines) for ${scope.level}-level edit. Consider file-level rewrite.`
            };
        }
        
        return {
            safe: true,
            recommendation: 'Edit appears safe to proceed.'
        };
    }
    
    /**
     * Apply the edit based on the determined scope and strategy
     */
    private static async applyEdit(
        error: EnhancedValidationError, 
        fileContent: string
    ): Promise<{ success: boolean; content: string; strategy: string }> {
        
        const scope = error.editScope!;
        const lines = fileContent.split('\n');
        
        try {
            switch (scope.level) {
                case 'character':
                    return this.applyCharacterEdit(error, lines);
                    
                case 'line':
                    return this.applyLineEdit(error, lines);
                    
                case 'expression':
                    return this.applyExpressionEdit(error, lines);
                    
                case 'block':
                    return this.applyBlockEdit(error, lines);
                    
                case 'function':
                    return this.applyFunctionEdit(error, lines);
                    
                case 'file':
                    return this.applyFileEdit(error, lines);
                    
                default:
                    return {
                        success: false,
                        content: fileContent,
                        strategy: 'unknown_scope'
                    };
            }
        } catch (editError) {
            return {
                success: false,
                content: fileContent,
                strategy: `edit_failed: ${editError}`
            };
        }
    }
    
    /**
     * Apply character-level edit (single character insertion/deletion)
     */
    private static applyCharacterEdit(
        error: EnhancedValidationError, 
        lines: string[]
    ): { success: boolean; content: string; strategy: string } {
        
        const scope = error.editScope!;
        const targetLine = scope.range.start.line - 1; // Convert to 0-based
        const targetColumn = scope.range.start.column;
        
        if (targetLine < 0 || targetLine >= lines.length) {
            return { success: false, content: lines.join('\n'), strategy: 'invalid_line' };
        }
        
        const line = lines[targetLine];
        let newLine = line;
        
        // Determine what character to insert based on error message
        const character = this.determineCharacterToInsert(error);
        
        switch (scope.operation) {
            case 'insert':
                newLine = line.slice(0, targetColumn) + character + line.slice(targetColumn);
                break;
                
            case 'delete':
                newLine = line.slice(0, targetColumn) + line.slice(targetColumn + 1);
                break;
                
            case 'replace':
                newLine = line.slice(0, targetColumn) + character + line.slice(targetColumn + 1);
                break;
        }
        
        lines[targetLine] = newLine;
        
        return {
            success: true,
            content: lines.join('\n'),
            strategy: `character_${scope.operation}_${character}`
        };
    }
    
    /**
     * Determine what character to insert based on error message
     */
    private static determineCharacterToInsert(error: EnhancedValidationError): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('expected }')) return '}';
        if (message.includes('expected )')) return ')';
        if (message.includes('expected ]')) return ']';
        if (message.includes('expected ;')) return ';';
        if (message.includes('expected >')) return '>';
        if (message.includes('missing closing')) {
            if (message.includes('brace')) return '}';
            if (message.includes('paren')) return ')';
            if (message.includes('bracket')) return ']';
        }
        
        return ''; // Default to empty string for deletions
    }
    
    /**
     * Apply line-level edit (import, export, variable declaration)
     */
    private static applyLineEdit(
        error: EnhancedValidationError, 
        lines: string[]
    ): { success: boolean; content: string; strategy: string } {
        
        const scope = error.editScope!;
        const targetLine = scope.range.start.line - 1;
        
        if (targetLine < 0 || targetLine >= lines.length) {
            return { success: false, content: lines.join('\n'), strategy: 'invalid_line' };
        }
        
        // Generate the corrected line based on error type
        const correctedLine = this.generateCorrectedLine(error, lines[targetLine]);
        
        if (correctedLine === null) {
            return { success: false, content: lines.join('\n'), strategy: 'cannot_generate_correction' };
        }
        
        lines[targetLine] = correctedLine;
        
        return {
            success: true,
            content: lines.join('\n'),
            strategy: `line_${scope.operation}`
        };
    }
    
    /**
     * Generate a corrected line based on the error
     */
    private static generateCorrectedLine(error: EnhancedValidationError, originalLine: string): string | null {
        const message = error.message.toLowerCase();
        
        // Handle missing imports
        if (message.includes('cannot find name')) {
            const match = error.message.match(/Cannot find name '([^']+)'/);
            if (match) {
                const componentName = match[1];
                return `import { ${componentName} } from '@heroui/${componentName.toLowerCase()}';`;
            }
        }
        
        // Handle missing semicolons
        if (message.includes('expected ;') && !originalLine.trim().endsWith(';')) {
            return originalLine + ';';
        }
        
        // Handle missing parentheses in function calls
        if (message.includes('expected )') && originalLine.includes('(')) {
            const openParens = (originalLine.match(/\(/g) || []).length;
            const closeParens = (originalLine.match(/\)/g) || []).length;
            const missing = openParens - closeParens;
            return originalLine + ')'.repeat(missing);
        }
        
        return null; // Cannot generate automatic correction
    }
    
    /**
     * Apply expression-level edit
     */
    private static applyExpressionEdit(
        error: EnhancedValidationError, 
        lines: string[]
    ): { success: boolean; content: string; strategy: string } {
        
        const scope = error.editScope!;
        const targetLine = scope.range.start.line - 1;
        
        // For now, delegate to line edit for expressions
        // In a more sophisticated version, this would parse and fix expressions
        return this.applyLineEdit(error, lines);
    }
    
    /**
     * Apply block-level edit (JSX elements, object literals)
     */
    private static applyBlockEdit(
        error: EnhancedValidationError, 
        lines: string[]
    ): { success: boolean; content: string; strategy: string } {
        
        const scope = error.editScope!;
        const startLine = scope.range.start.line - 1;
        const endLine = scope.range.end.line - 1;
        
        // For JSX blocks, try to fix the structure
        if (error.structuralContext?.containerType === 'jsx_element') {
            return this.fixJSXBlock(error, lines, startLine, endLine);
        }
        
        // For other blocks, use a generic approach
        return this.fixGenericBlock(error, lines, startLine, endLine);
    }
    
    /**
     * Fix JSX block structure
     */
    private static fixJSXBlock(
        error: EnhancedValidationError, 
        lines: string[], 
        startLine: number, 
        endLine: number
    ): { success: boolean; content: string; strategy: string } {
        
        // Simple JSX fix: ensure proper tag closure
        for (let i = startLine; i <= endLine && i < lines.length; i++) {
            const line = lines[i];
            
            // Fix unclosed JSX tags
            if (line.includes('<') && !line.includes('</') && !line.includes('/>')) {
                const tagMatch = line.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
                if (tagMatch) {
                    const tagName = tagMatch[1];
                    // Look for existing closing tag
                    let hasClosingTag = false;
                    for (let j = i + 1; j <= endLine && j < lines.length; j++) {
                        if (lines[j].includes(`</${tagName}>`)) {
                            hasClosingTag = true;
                            break;
                        }
                    }
                    
                    // Add closing tag if missing
                    if (!hasClosingTag && endLine < lines.length) {
                        lines[endLine] = lines[endLine] + `</${tagName}>`;
                    }
                }
            }
        }
        
        return {
            success: true,
            content: lines.join('\n'),
            strategy: 'jsx_block_fix'
        };
    }
    
    /**
     * Fix generic block structure
     */
    private static fixGenericBlock(
        error: EnhancedValidationError, 
        lines: string[], 
        startLine: number, 
        endLine: number
    ): { success: boolean; content: string; strategy: string } {
        
        // Count and balance braces within the block
        let braceCount = 0;
        
        for (let i = startLine; i <= endLine && i < lines.length; i++) {
            const line = lines[i];
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
        }
        
        // Add missing closing braces
        if (braceCount > 0 && endLine < lines.length) {
            lines[endLine] = lines[endLine] + '}'.repeat(braceCount);
        }
        
        return {
            success: true,
            content: lines.join('\n'),
            strategy: `block_fix_added_${braceCount}_braces`
        };
    }
    
    /**
     * Apply function-level edit (complete function replacement)
     */
    private static applyFunctionEdit(
        error: EnhancedValidationError, 
        lines: string[]
    ): { success: boolean; content: string; strategy: string } {
        
        const scope = error.editScope!;
        const startLine = scope.range.start.line - 1;
        const endLine = scope.range.end.line - 1;
        
        // For function-level edits, recommend MultiEdit or Write tool
        return {
            success: false,
            content: lines.join('\n'),
            strategy: 'function_edit_requires_multiedit_or_write'
        };
    }
    
    /**
     * Apply file-level edit (complete file rewrite)
     */
    private static applyFileEdit(
        error: EnhancedValidationError, 
        lines: string[]
    ): { success: boolean; content: string; strategy: string } {
        
        // File-level edits should use the Write tool
        return {
            success: false,
            content: lines.join('\n'),
            strategy: 'file_edit_requires_write_tool'
        };
    }
    
    /**
     * Post-edit cleanup to detect and remove stray code
     */
    private static postEditCleanup(
        editedContent: string, 
        error: EnhancedValidationError
    ): { success: boolean; cleanupApplied: boolean; straysDetected: string[] } {
        
        const straysDetected = this.detectStrayCode(editedContent);
        
        if (straysDetected.length === 0) {
            return {
                success: true,
                cleanupApplied: false,
                straysDetected: []
            };
        }
        
        // For now, just detect strays without automatically removing them
        // In a more sophisticated version, this would safely remove stray code
        return {
            success: true,
            cleanupApplied: false,
            straysDetected
        };
    }
    
    /**
     * Detect stray code that might have been left behind
     */
    private static detectStrayCode(content: string): string[] {
        const lines = content.split('\n');
        const strays: string[] = [];
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Detect orphaned closing tags
            if (trimmed.startsWith('</') && !trimmed.includes('<')) {
                strays.push(`Line ${index + 1}: Orphaned closing tag: ${trimmed}`);
            }
            
            // Detect unmatched closing braces
            if (trimmed === '}' || trimmed === '})' || trimmed === '};') {
                // Check if this might be an orphaned closing brace
                let braceCount = 0;
                for (let i = 0; i <= index; i++) {
                    const checkLine = lines[i];
                    braceCount += (checkLine.match(/{/g) || []).length;
                    braceCount -= (checkLine.match(/}/g) || []).length;
                }
                
                if (braceCount < 0) {
                    strays.push(`Line ${index + 1}: Possible orphaned closing brace: ${trimmed}`);
                }
            }
            
            // Detect incomplete expressions
            if (trimmed.endsWith(',') && index === lines.length - 1) {
                strays.push(`Line ${index + 1}: Trailing comma at end of file: ${trimmed}`);
            }
        });
        
        return strays;
    }
    
    /**
     * Generate recommendation for the edit
     */
    private static generateRecommendation(error: EnhancedValidationError): string {
        const scope = error.editScope!;
        
        let recommendation = `Recommended approach: ${error.recommendedTool} tool for ${scope.level}-level ${scope.operation}. `;
        
        if (error.contextualGuidance) {
            recommendation += error.contextualGuidance + '. ';
        }
        
        if (scope.confidence < 0.8) {
            recommendation += `Confidence: ${Math.round(scope.confidence * 100)}% - manual review recommended. `;
        }
        
        if (scope.dependencies.length > 0) {
            recommendation += `Dependencies: ${scope.dependencies.join(', ')}. `;
        }
        
        return recommendation.trim();
    }
}