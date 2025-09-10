/**
 * Edit scope and context information for context-aware editing
 */

export type EditScopeLevel = 'character' | 'line' | 'expression' | 'block' | 'function' | 'file';

export type EditOperation = 'insert' | 'replace' | 'delete' | 'complete';

export interface EditScope {
    /** The scope level required for this edit */
    level: EditScopeLevel;
    
    /** The specific operation needed */
    operation: EditOperation;
    
    /** Start and end positions for the edit */
    range: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
    
    /** Safe boundaries - maximum range that can be edited without breaking unrelated code */
    safeBoundaries: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
    
    /** Dependencies - other code elements that might be affected */
    dependencies: string[];
    
    /** Whether this edit requires multiple coordinated changes */
    requiresMultiEdit: boolean;
    
    /** Confidence level in the scope analysis (0-1) */
    confidence: number;
}

export interface StructuralContext {
    /** Type of code structure containing the error */
    containerType: 'function' | 'class' | 'jsx_element' | 'object' | 'array' | 'statement' | 'expression' | 'import' | 'export';
    
    /** Name of the containing structure (function name, component name, etc.) */
    containerName?: string;
    
    /** Start and end lines of the containing structure */
    containerBounds: {
        start: number;
        end: number;
    };
    
    /** Related variables, functions, or imports in scope */
    relatedElements: string[];
    
    /** Whether the error affects the structure's integrity */
    affectsStructuralIntegrity: boolean;
    
    /** Nesting level (how deeply nested the error location is) */
    nestingLevel: number;
}

export interface EnhancedValidationError {
    // Original validation error fields
    type: 'syntax' | 'build' | 'runtime' | 'dependency';
    file: string;
    line?: number;
    column?: number;
    message: string;
    rule?: string;
    severity: 'error' | 'warning';
    fixable: boolean;
    
    // Enhanced context-aware fields
    editScope?: EditScope;
    structuralContext?: StructuralContext;
    
    /** Related errors that should be fixed together */
    relatedErrors?: string[];
    
    /** Recommended tool for fixing this error */
    recommendedTool?: 'Edit' | 'MultiEdit' | 'Write';
    
    /** Specific guidance for the fix */
    contextualGuidance?: string;
}