import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import FormData from 'form-data';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { configureAuth, getUserByWhatsApp } from './auth.js';
import { createClient } from '@supabase/supabase-js';
import { deployToNetlify } from './deploy-netlify.js';
import { 
 validateProject, 
 validateProjectWithoutLock,
 autoFixProject, 
 generateErrorReport, 
 detectErrorPattern,
 ValidationLockManager,
 TemplateManager,
 type ValidationResult,
 type ValidationError
} from './validation.js';
import { getFocusedSystemPrompt } from './syntax-fix-prompt.js';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory idempotency cache for WhatsApp message IDs
const processedMessageIds: Map<string, number> = new Map();
const SEEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function pruneProcessed(): void {
 const now = Date.now();
 for (const [id, ts] of processedMessageIds.entries()) {
 if (now - ts > SEEN_TTL_MS) processedMessageIds.delete(id);
 }
}

function shouldProcessMessage(uniqueId: string): boolean {
 pruneProcessed();
 if (processedMessageIds.has(uniqueId)) return false;
 processedMessageIds.set(uniqueId, Date.now());
 return true;
}

// Simple cache for tracking recent task attempts
const recentTaskAttempts: Map<string, { count: number, lastAttempt: number }> = new Map();
const TASK_ATTEMPT_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function shouldAttemptTaskResumption(userPrompt: string, projectDir: string): Promise<boolean> {
 try {
  // Normalize the prompt for consistent tracking
  const normalizedPrompt = userPrompt.toLowerCase().trim();
  
  // Check if we've seen this task recently
  const now = Date.now();
  const attemptRecord = recentTaskAttempts.get(normalizedPrompt);
  
  if (attemptRecord) {
   // Clean up old attempts
   if (now - attemptRecord.lastAttempt > TASK_ATTEMPT_TTL_MS) {
    recentTaskAttempts.delete(normalizedPrompt);
    return false;
   }
   
   // If this is the second or third attempt within the TTL window, 
   // it's likely a resumption scenario
   if (attemptRecord.count >= 2) {
    console.log(`[CLINE] Task "${normalizedPrompt}" attempted ${attemptRecord.count} times recently - likely incomplete task`);
    attemptRecord.count++;
    attemptRecord.lastAttempt = now;
    return true;
   }
   
   attemptRecord.count++;
   attemptRecord.lastAttempt = now;
  } else {
   // First time seeing this task
   recentTaskAttempts.set(normalizedPrompt, { count: 1, lastAttempt: now });
  }
  
  return false;
 } catch (error) {
  console.error('[CLINE] Error checking task resumption:', error);
  return false;
 }
}

function getSupabaseForIdempotency() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
 const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
 const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
 if (!url) return null;
 if (serviceKey) return createClient(url, serviceKey);
 if (anonKey) return createClient(url, anonKey);
 return null;
}

async function ensureFirstProcessDistributed(uniqueId: string): Promise<boolean> {
 const supabase = getSupabaseForIdempotency();
 if (!supabase) return shouldProcessMessage(uniqueId);
 try {
 const { error } = await supabase
 .from('processed_messages')
 .insert({ id: uniqueId })
 .single();
 if (error) {
 const code = (error as any)?.code || '';
 if (code === '23505') return false;
 console.warn('[IDEMPOTENCY] Supabase insert failed, using in-memory fallback:', error.message || error);
 return shouldProcessMessage(uniqueId);
 }
 return true;
 } catch (e: any) {
 console.warn('[IDEMPOTENCY] Supabase error, using in-memory fallback:', e?.message || e);
 return shouldProcessMessage(uniqueId);
 }
}

const {
	WHATSAPP_TOKEN,
	WHATSAPP_PHONE_NUMBER_ID,
	WHATSAPP_VERIFY_TOKEN,
	PUBLIC_BASE_URL
} = process.env as Record<string, string | undefined>;

const DEFAULT_CLINE_BIN = 'cline-cli';
const CLINE_BIN = (process.env.CLINE_BIN || process.env.CLINE_PATH || DEFAULT_CLINE_BIN) as string;

interface ClineResult {
	code: number;
	stderr: string;
	stdout: string;
	stdoutLen: number;
	stderrLen: number;
	timedOut?: boolean;
}

/**
 * CircuitBreaker to prevent infinite loops and apply exponential backoff
 * Enhanced to track strategies and content hashes for better self-healing
 */
class CircuitBreaker {
	private static fileFailures = new Map<string, { count: number; lastFailure: number; backoffUntil: number; strategy: string }>()
	private static strategyAttempts = new Map<string, Map<string, { count: number; lastAttempt: number; contentHash?: string }>>()
	private static fileContentHashes = new Map<string, string>()
	
	/**
	 * Generate a simple hash for content comparison
	 */
	static hashContent(content: string): string {
		let hash = 0
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i)
			hash = ((hash << 5) - hash) + char
			hash = hash & hash // Convert to 32-bit integer
		}
		return hash.toString(36)
	}

	/**
	 * Check if a file should be skipped due to circuit breaker
	 * Enhanced with strategy and content hash tracking
	 */
	static shouldSkipFile(filePath: string, strategy: string, currentContentHash?: string): boolean {
		const normalizedPath = filePath.toLowerCase()
		const now = Date.now()
		
		// Get strategy attempts for this file
		const fileStrategyAttempts = this.strategyAttempts.get(normalizedPath) || new Map()
		const strategyData = fileStrategyAttempts.get(strategy)
		
		// If no previous attempts with this strategy, allow it
		if (!strategyData) {
			console.log(`[CIRCUIT_BREAKER] Allowing new strategy '${strategy}' for ${filePath}`)
			return false
		}
		
		// Check if content has changed since last attempt with this strategy
		if (currentContentHash && strategyData.contentHash && currentContentHash !== strategyData.contentHash) {
			console.log(`[CIRCUIT_BREAKER] Content changed since last '${strategy}' attempt, allowing retry for ${filePath}`)
			return false
		}
		
		// Apply progressive backoff based on strategy attempts
		const timeSinceLastAttempt = now - strategyData.lastAttempt
		const requiredCooldown = this.getStrategyCooldown(strategy, strategyData.count)
		
		if (timeSinceLastAttempt < requiredCooldown) {
			const remainingMs = requiredCooldown - timeSinceLastAttempt
			console.log(`[CIRCUIT_BREAKER] Strategy '${strategy}' cooling down for ${filePath} - ${Math.ceil(remainingMs / 1000)}s remaining`)
			return true
		}
		
		// Check if we've exceeded max attempts for this strategy
		if (strategyData.count >= this.getMaxAttemptsForStrategy(strategy)) {
			console.log(`[CIRCUIT_BREAKER] Strategy '${strategy}' exhausted (${strategyData.count} attempts) for ${filePath}`)
			return true
		}
		
		return false
	}
	
	/**
	 * Get cooldown time for a strategy based on attempt count
	 */
	private static getStrategyCooldown(strategy: string, attemptCount: number): number {
		// Clean rewrite strategies get minimal cooldown (last resort)
		if (strategy.includes('clean_rewrite') || strategy.includes('comprehensive_cleanup')) {
			return 1000 // 1 second
		}
		
		// Edit-based strategies get moderate cooldown
		if (strategy.includes('edit') || strategy.includes('targeted')) {
			return Math.min(5000 * Math.pow(2, attemptCount - 1), 30000) // 5s → 10s → 20s → 30s max
		}
		
		// Other strategies get standard cooldown
		return Math.min(3000 * Math.pow(2, attemptCount - 1), 15000) // 3s → 6s → 12s → 15s max
	}
	
	/**
	 * Get maximum attempts allowed for a strategy
	 */
	private static getMaxAttemptsForStrategy(strategy: string): number {
		// Clean rewrite strategies get more attempts (they're more likely to work)
		if (strategy.includes('clean_rewrite') || strategy.includes('comprehensive_cleanup')) {
			return 3
		}
		
		// Other strategies get fewer attempts before escalation
		return 2
	}
	
	/**
	 * Record a failure for a file with strategy tracking
	 */
	static recordFailure(filePath: string, strategy: string, currentContentHash?: string): void {
		const normalizedPath = filePath.toLowerCase()
		const now = Date.now()
		
		// Update strategy attempts
		if (!this.strategyAttempts.has(normalizedPath)) {
			this.strategyAttempts.set(normalizedPath, new Map())
		}
		
		const fileStrategyAttempts = this.strategyAttempts.get(normalizedPath)!
		const currentData = fileStrategyAttempts.get(strategy) || { count: 0, lastAttempt: 0 }
		
		fileStrategyAttempts.set(strategy, {
			count: currentData.count + 1,
			lastAttempt: now,
			contentHash: currentContentHash
		})
		
		// Update file content hash if provided
		if (currentContentHash) {
			this.fileContentHashes.set(normalizedPath, currentContentHash)
		}
		
		console.log(`[CIRCUIT_BREAKER] Recorded failure for ${filePath} with strategy '${strategy}' (attempt ${currentData.count + 1})`)
	}
	
	/**
	 * Get next recommended strategy based on what's been tried and failed
	 * With content-aware strategy selection to prevent destructive fixes for surgically fixable errors
	 */
	static getNextStrategy(filePath: string, errors?: ValidationError[]): string | null {
		const normalizedPath = filePath.toLowerCase()
		const fileStrategyAttempts = this.strategyAttempts.get(normalizedPath)
		
		if (!fileStrategyAttempts) {
			return 'targeted_edit' // Start with least disruptive
		}
		
		// Check if we have surgically fixable import/export errors
		const hasSurgicallyFixableErrors = errors && errors.some(error => 
			error.rule === 'surgical-import-export' && error.fixable
		);
		
		// For surgically fixable errors, prevent escalation to destructive strategies
		// to avoid destroying creative content for simple import/export fixes
		let availableStrategies = [
			'targeted_edit',
			'comprehensive_edit', 
			'clean_rewrite',
			'comprehensive_cleanup'
		];
		
		if (hasSurgicallyFixableErrors) {
			console.log(`[CIRCUIT_BREAKER] Detected surgically fixable import/export errors for ${filePath} - restricting to safe strategies`);
			// Limit to non-destructive strategies for import/export errors
			availableStrategies = [
				'targeted_edit',
				'comprehensive_edit'
			];
		}
		
		// Progressive strategy escalation within available strategies
		const strategies = availableStrategies;
		
		// Find first strategy that hasn't been exhausted
		for (const strategy of strategies) {
			const strategyData = fileStrategyAttempts.get(strategy)
			if (!strategyData || strategyData.count < this.getMaxAttemptsForStrategy(strategy)) {
				// Check if strategy is in cooldown
				if (strategyData) {
					const timeSinceLastAttempt = Date.now() - strategyData.lastAttempt
					const requiredCooldown = this.getStrategyCooldown(strategy, strategyData.count)
					if (timeSinceLastAttempt < requiredCooldown) {
						continue // Skip strategies in cooldown
					}
				}
				return strategy
			}
		}
		
		// All strategies exhausted
		console.log(`[CIRCUIT_BREAKER] All strategies exhausted for ${filePath}`)
		return null
	}
	
	/**
	 * Reset circuit breaker state for a file (for testing or manual override)
	 */
	static reset(filePath: string): void {
		const normalizedPath = filePath.toLowerCase()
		this.fileFailures.delete(normalizedPath)
		this.strategyAttempts.delete(normalizedPath) 
		this.fileContentHashes.delete(normalizedPath)
		console.log(`[CIRCUIT_BREAKER] Reset state for ${filePath}`)
	}
	
	/**
	 * Clear all circuit breaker state (for cleanup or testing)
	 */
	static clear(): void {
		this.fileFailures.clear()
		this.strategyAttempts.clear()
		this.fileContentHashes.clear()
		console.log(`[CIRCUIT_BREAKER] Cleared all state`)
	}
	
	/**
	 * Record a success for a file (resets failure count)
	 */
	static recordSuccess(filePath: string): void {
		const normalizedPath = filePath.toLowerCase()
		
		this.fileFailures.delete(normalizedPath)
		this.strategyAttempts.delete(normalizedPath)
		this.fileContentHashes.delete(normalizedPath)
		
		console.log(`[CIRCUIT_BREAKER] Success recorded for ${filePath} - reset all tracking`)
	}
	
	/**
	 * Get current failure count for a file
	 */
	static getFailureCount(filePath: string): number {
		const normalizedPath = filePath.toLowerCase()
		return this.fileFailures.get(normalizedPath)?.count || 0
	}
	
	/**
	 * Check if force clean write should be used based on failed strategies
	 */
	static shouldUseForceCleanWrite(filePath: string): boolean {
		const normalizedPath = filePath.toLowerCase()
		const fileStrategyAttempts = this.strategyAttempts.get(normalizedPath)
		
		if (!fileStrategyAttempts) return false
		
		// Check if multiple different strategies have failed
		const failedStrategies = Array.from(fileStrategyAttempts.entries()).filter(([_, data]) => data.count >= 1)
		
		// Use force clean write if:
		// 1. 3+ different strategies have been tried (comprehensive approach needed)
		// 2. ANY strategy has failed 3+ times (stuck in loop)
		// 3. 2+ strategies have failed 2+ times each (persistent issues)
		if (failedStrategies.length >= 3) {
			return true // Too many strategies tried
		}
		
		const highFailureStrategies = failedStrategies.filter(([_, data]) => data.count >= 3)
		if (highFailureStrategies.length >= 1) {
			return true // Any strategy stuck in loop
		}
		
		const moderateFailureStrategies = failedStrategies.filter(([_, data]) => data.count >= 2)
		if (moderateFailureStrategies.length >= 2) {
			return true // Multiple strategies struggling
		}
		
		return false
	}
	
	/**
	 * Get the best next strategy based on what hasn't been tried or exhausted
	 */
	static getNextBestStrategy(filePath: string, currentStrategy: string, availableStrategies: string[]): string {
		const normalizedPath = filePath.toLowerCase()
		const fileStrategyAttempts = this.strategyAttempts.get(normalizedPath) || new Map()
		
		// Find strategies that haven't been exhausted
		const viableStrategies = availableStrategies.filter(strategy => {
			const attempts = fileStrategyAttempts.get(strategy)
			return !attempts || attempts.count < this.getMaxAttemptsForStrategy(strategy)
		})
		
		// If no viable strategies, suggest clean rewrite
		if (viableStrategies.length === 0) {
			return 'comprehensive_cleanup'
		}
		
		// Prefer clean rewrite strategies if other approaches have failed
		const cleanRewriteStrategies = viableStrategies.filter(s => s.includes('clean_rewrite') || s.includes('comprehensive_cleanup'))
		if (cleanRewriteStrategies.length > 0 && this.getFailureCount(filePath) >= 3) {
			return cleanRewriteStrategies[0]
		}
		
		// Otherwise, pick first viable strategy that's different from current
		return viableStrategies.find(s => s !== currentStrategy) || viableStrategies[0] || currentStrategy
	}
	
	/**
	 * Get content hash for a file path if available
	 */
	static getContentHash(filePath: string): string | undefined {
		const normalizedPath = filePath.toLowerCase()
		return this.fileContentHashes.get(normalizedPath)
	}
	
	/**
	 * Generate content hash for comparison
	 */
	static generateContentHash(content: string): string {
		return this.hashContent(content)
	}
	
	/**
	 * Clear all circuit breaker state (emergency reset)
	 */
}

/**
 * Get progressive fixing strategy based on attempt number and error pattern
 */
function getFixingStrategy(attempt: number, pattern: string, errors: any[]): { instruction: string; guidance: string } {
    const strategies = {
        duplicate_code: {
            0: {
                instruction: "FOCUS: Remove all duplicate code sections and exports. Use Write tool to create clean, single version.",
                guidance: "🎯 Strategy: Identify duplicate functions/components and consolidate them into a single implementation."
            },
            1: {
                instruction: "ALTERNATIVE APPROACH: Use MultiEdit tool to remove duplicate sections in multiple steps.",
                guidance: "🔧 Try: Break down the duplicate removal into smaller, targeted edits."
            },
            default: {
                instruction: "COMPREHENSIVE CLEANUP: Start fresh - read entire file and rewrite with proper structure.",
                guidance: "⚠️ Last resort: Complete file restructure may be needed."
            }
        },
        jsx_structure: {
            0: {
                instruction: "FOCUS: Fix JSX structure issues. Check for unclosed tags, missing brackets, and malformed JSX.",
                guidance: "🎯 Strategy: Validate JSX syntax - every opening tag needs a closing tag, every { needs a }."
            },
            1: {
                instruction: "ALTERNATIVE APPROACH: Use bracket matching - find where JSX structure breaks down.",
                guidance: "🔧 Try: Count opening/closing braces and tags to find mismatches."
            },
            default: {
                instruction: "STEP-BY-STEP: Fix JSX section by section, validating each component separately.",
                guidance: "⚠️ Progressive fix: Isolate each JSX component and fix individually."
            }
        },
        missing_brackets: {
            0: {
                instruction: "FOCUS: Find and fix missing closing brackets, braces, and parentheses.",
                guidance: "🎯 Strategy: Look for functions/objects/arrays that aren't properly closed."
            },
            1: {
                instruction: "ALTERNATIVE APPROACH: Add missing brackets systematically from inside out.",
                guidance: "🔧 Try: Start with innermost expressions and work outward."
            },
            default: {
                instruction: "BRACKET AUDIT: Review entire file structure for proper nesting and closure.",
                guidance: "⚠️ Complete review: Ensure every opening bracket has its match."
            }
        },
        mixed_issues: {
            0: {
                instruction: "PRIORITY: Fix syntax errors first (brackets, semicolons), then structural issues.",
                guidance: "🎯 Strategy: Address errors in order of severity - syntax → structure → style."
            },
            1: {
                instruction: "FOCUSED REPAIR: Target the most common error type first, then address others.",
                guidance: "🔧 Try: Group similar errors and fix them in batches."
            },
            default: {
                instruction: "SYSTEMATIC APPROACH: Fix one file at a time, ensuring each is valid before moving on.",
                guidance: "⚠️ Methodical fix: Complete one area fully before tackling the next."
            }
        },
        default: {
            0: {
                instruction: "The previous code generation resulted in errors. Please fix the following issues and ensure the code is valid:",
                guidance: "🎯 Read the entire file first, then make targeted fixes."
            },
            1: {
                instruction: "ALTERNATIVE STRATEGY: Try a different approach to fixing these persistent errors:",
                guidance: "🔧 Consider using different tools (Write vs Edit vs MultiEdit)."
            },
            default: {
                instruction: "COMPREHENSIVE FIX: These errors require careful attention. Read files thoroughly before editing:",
                guidance: "⚠️ Take time to understand the full context before making changes."
            }
        }
    };

    const patternStrategies = strategies[pattern as keyof typeof strategies] || strategies.default;
    const strategy = patternStrategies[attempt as keyof typeof patternStrategies] || patternStrategies.default;

    return strategy;
}

/**
 * Progressive fixing strategy that incorporates circuit breaker recommendations
 */
function getProgressiveFixingStrategy(
    attempt: number, 
    pattern: string, 
    errors: any[], 
    fileStrategies: Map<string, string>
): { instruction: string; guidance: string } {
    // If we have specific file strategies from circuit breaker, use them
    if (fileStrategies.size > 0) {
        const strategies = Array.from(fileStrategies.values())
        const dominantStrategy = strategies[0] // Use first strategy as base
        
        const strategyInstructions = {
            'targeted_edit': {
                instruction: "TARGETED EDIT: Make minimal, precise changes to fix specific errors. Use Edit tool for small fixes.",
                guidance: "🎯 Strategy: Focus on exact error locations with minimal disruption to working code."
            },
            'comprehensive_edit': {
                instruction: "COMPREHENSIVE EDIT: Use MultiEdit to make coordinated changes across multiple sections.",
                guidance: "🔧 Strategy: Address related issues together while preserving overall structure."
            },
            'clean_rewrite': {
                instruction: "CLEAN REWRITE: Use Write tool to create a fresh version focusing on fixing core issues.",
                guidance: "✨ Strategy: Start with a clean slate while maintaining functionality."
            },
            'comprehensive_cleanup': {
                instruction: "COMPREHENSIVE CLEANUP: Complete file restructure with proper organization and syntax.",
                guidance: "🔄 Strategy: Last resort - rebuild file with correct structure and clean code."
            }
        }
        
        const strategyInfo = strategyInstructions[dominantStrategy as keyof typeof strategyInstructions] || 
                            strategyInstructions['comprehensive_cleanup']
        
        return {
            instruction: strategyInfo.instruction + `\n\nFiles requiring attention: ${Array.from(fileStrategies.keys()).join(', ')}`,
            guidance: strategyInfo.guidance + `\n\nStrategy per file: ${Array.from(fileStrategies.entries()).map(([f, s]) => `${f}: ${s}`).join(', ')}`
        }
    }
    
    // Fallback to original strategy if no specific file strategies
    return getFixingStrategy(attempt, pattern, errors)
}

/**
 * Enhanced version of runClineCLIInDir with automated validation and error fixing
 */
async function runClineCLIInDirWithValidation(cwd: string, userPrompt: string, systemAppend: string, maxRetries = 6): Promise<ClineResult & { validationResult?: ValidationResult }> {
 // Use template isolation to prevent file watcher interference
 return await TemplateManager.withTemplateIsolation(cwd, async () => {
 let attempt = 0;
 let lastValidation: ValidationResult | null = null;

 while (attempt < maxRetries) {
 attempt++;
 console.log(`[ENHANCED_CLINE] Attempt ${attempt}/${maxRetries}`);
 
 // Run the original Cline CLI
 // Detect if we're doing syntax fixes and use better model
const isSyntaxFixAttempt = attempt > 1; // First attempt is initial request, subsequent are fixes
const hasSyntaxErrors = lastValidation && lastValidation.errors.some(e => 
	e.type === 'syntax' || e.message.toLowerCase().includes('syntax') ||
	e.message.toLowerCase().includes('bracket') || e.message.toLowerCase().includes('duplicate')
);
// Check if circuit breaker indicates we should use better model
const hasCircuitBreakerIssues = lastValidation && lastValidation.errors.some(e => {
	const file = e.file;
	return file && CircuitBreaker.getFailureCount(file) >= 2;
});

const useBetterModel: boolean = isSyntaxFixAttempt && (
	!!hasSyntaxErrors || 
	attempt >= 3 || 
	!!hasCircuitBreakerIssues
); // Use better model for syntax errors, after 3 attempts, or when circuit breaker detects repeated failures

if (useBetterModel) {
const reasons = [];
if (hasSyntaxErrors) reasons.push('syntax errors detected');
if (attempt >= 3) reasons.push(`attempt ${attempt} (fallback)`);
if (hasCircuitBreakerIssues) reasons.push('circuit breaker failures');
console.log(`[ENHANCED_CLINE] 🚀 Using better model (grok-code-fast-1) for syntax fix - reason: ${reasons.join(', ')}`);
}

console.log(`[DEBUG] About to call runClineCLIInDir - attempt: ${attempt}, useBetterModel: ${useBetterModel}`);
const clineResult = await runClineCLIInDir(cwd, userPrompt, systemAppend, useBetterModel);
 
 // If Cline CLI failed, return immediately
 if (clineResult.code !== 0) {
 console.log(`[ENHANCED_CLINE] Cline CLI failed with code ${clineResult.code}, skipping validation`);
 return { ...clineResult, validationResult: lastValidation || undefined };
 }
 
 console.log(`[ENHANCED_CLINE] Cline CLI completed, running validation...`);
 
 // Run validation (syntax-first for early attempts, comprehensive for later)
 const syntaxOnly = attempt < maxRetries - 2; // Use syntax-only for first 4 attempts
 console.log(`[ENHANCED_CLINE] Using ${syntaxOnly ? 'syntax-only' : 'comprehensive'} validation for attempt ${attempt + 1}`);
 // Use validation without locks in retry loop to prevent interference with Cline file writes
 const validation = await validateProjectWithoutLock(cwd, syntaxOnly);
 lastValidation = validation;
 
 if (validation.isValid) {
 console.log(`[ENHANCED_CLINE] ✅ Validation passed on attempt ${attempt}`);
 
 // Record success for all previously problematic files
 const allFiles = validation.errors.concat(lastValidation?.errors || []).map(e => e.file).filter(f => f && f !== 'unknown')
 const uniqueFiles = [...new Set(allFiles)]
 for (const file of uniqueFiles) {
 CircuitBreaker.recordSuccess(file)
 }
 
 return { ...clineResult, validationResult: validation };
 }
 
 console.log(`[ENHANCED_CLINE] ❌ Validation failed on attempt ${attempt}: ${validation.errors.length} errors found`);
 
 // Try auto-fixing
 if (validation.canAutoFix) {
 console.log(`[ENHANCED_CLINE] 🔧 Attempting auto-fix...`);
 const fixResult = await autoFixProject(cwd);
 
 if (fixResult.success && fixResult.changedFiles.length > 0) {
 console.log(`[ENHANCED_CLINE] ✅ Auto-fixed ${fixResult.changedFiles.length} files`);
 
 // Re-validate after auto-fix
 const postFixValidation = await validateProjectWithoutLock(cwd);
 if (postFixValidation.isValid) {
 console.log(`[ENHANCED_CLINE] ✅ Validation passed after auto-fix`);
 
 // Record success for all fixed files
 for (const file of fixResult.changedFiles) {
 CircuitBreaker.recordSuccess(file)
 }
 
 return { ...clineResult, validationResult: postFixValidation };
 } else if (postFixValidation.errors.length < validation.errors.length) {
 console.log(`[ENHANCED_CLINE] 🔧 Auto-fix reduced errors from ${validation.errors.length} to ${postFixValidation.errors.length}`);
 lastValidation = postFixValidation;
 }
 }
 }
 
 // If we have remaining errors and attempts left, ask Cline to fix them
 if (attempt < maxRetries) {
 const errorReport = generateErrorReport(lastValidation || validation);
 const pattern = detectErrorPattern(validation.errors);
 
 // Apply enhanced circuit breaker logic for problematic files
 const problemFiles = validation.errors.map(e => e.file).filter(f => f && f !== 'unknown')
 const skippedFiles: string[] = []
const fileStrategies = new Map<string, string>()
 
 // Determine strategy for each problematic file  
 for (const file of problemFiles) {
 // Get recommended strategy from circuit breaker, passing errors for content-aware selection
 const fileErrors = validation.errors.filter(error => error.file === file);
 const recommendedStrategy = CircuitBreaker.getNextStrategy(file, fileErrors) || 'comprehensive_cleanup'

 // Generate content hash for change detection
 let contentHash: string | undefined
 try {
 const content = await fs.readFile(path.join(cwd, file), 'utf-8')
 contentHash = CircuitBreaker.hashContent(content)
 } catch (error) {
 console.warn(`[ENHANCED_CLINE] Could not read ${file} for content hashing:`, error)
 }

 if (CircuitBreaker.shouldSkipFile(file, recommendedStrategy, contentHash)) {
 skippedFiles.push(file)
 } else {
 fileStrategies.set(file, recommendedStrategy)
 }
 }
 
 // If all problematic files are being skipped, break the loop
 if (skippedFiles.length === problemFiles.length && problemFiles.length > 0) {
 console.log(`[ENHANCED_CLINE] 🚫 Circuit breaker activated - all problematic files are in backoff period`)
 console.log(`[ENHANCED_CLINE] Skipped files: ${skippedFiles.join(', ')}`)
 break
 }
 
 // Create progressive strategy based on attempt number and error pattern
 // Record failures for files that will be worked on based on strategies
for (const [file, strategyName] of fileStrategies) {
	// Generate content hash for failure tracking
	let contentHash: string | undefined
	try {
		const content = await fs.readFile(path.join(cwd, file), 'utf-8')
		contentHash = CircuitBreaker.hashContent(content)
	} catch (error) {
		console.warn(`[ENHANCED_CLINE] Could not read ${file} for failure recording:`, error)
	}
	
	CircuitBreaker.recordFailure(file, strategyName, contentHash)
}

const strategy = getProgressiveFixingStrategy(attempt, pattern, validation.errors, fileStrategies);
 
 // Check if any files need force clean write
 const forceCleanWriteFiles = problemFiles.filter(file => CircuitBreaker.shouldUseForceCleanWrite(file))
 let forceCleanWriteGuidance = ''
 
 if (forceCleanWriteFiles.length > 0) {
 forceCleanWriteGuidance = `

🚨 FORCE CLEAN WRITE STRATEGY:
The following files have persistent errors and may need complete rewriting:
${forceCleanWriteFiles.map(f => `  • ${f}`).join('\n')}

For these files, consider:
1. Read the entire file first to understand structure and errors
2. Try Edit tool for single changes (safest approach)
3. If Edit works, use multiple Edit operations systematically
4. Only use MultiEdit if Edit tool is also failing
5. Work from END of file backward to remove stray code first
6. Focus on syntax fixes only - brackets, semicolons, closing tags
7. AVOID Write, execute_command, and write_to_file tools if they're failing`
 }
 
 const fixPrompt = `${strategy.instruction}

${errorReport}

${strategy.guidance}${forceCleanWriteGuidance}

Original request: ${userPrompt}`;
 
 console.log(`[ENHANCED_CLINE] 🔄 Asking Cline to fix errors (attempt ${attempt + 1}, strategy: ${pattern})...`);
 userPrompt = fixPrompt; // Update prompt for next iteration
 
 // Use focused system prompt for error fixing
 systemAppend = getFocusedSystemPrompt(pattern);
 }
 }
 
 // All attempts exhausted
 console.log(`[ENHANCED_CLINE] ❌ All ${maxRetries} attempts exhausted. Final validation result:`);
 console.log(generateErrorReport(lastValidation!));
 
 return { 
 code: lastValidation?.isValid ? 0 : 1, 
 stderr: generateErrorReport(lastValidation!), 
 stdout: `Validation failed after ${maxRetries} attempts`, 
 stdoutLen: 0, 
 stderrLen: generateErrorReport(lastValidation!).length,
 validationResult: lastValidation || undefined
 };
 }); // Close TemplateManager.withTemplateIsolation
}

async function runClineCLIInDir(cwd: string, userPrompt: string, systemAppend: string, useBetterModelForSyntax?: boolean): Promise<ClineResult> {
	// Resolve absolute project directory and prepare prompts
	const absProjectDir = path.resolve(cwd);
	const userArg = userPrompt;
	
	// Create cline config path - use better model config for syntax fixes
	const clineConfigPath = useBetterModelForSyntax === true
		? '/home/appuser/.cline_cli/cline_cli_settings_fix.json'
		: '/home/appuser/.cline_cli/cline_cli_settings.json';
	console.log('[CLINE] Config path:', clineConfigPath, useBetterModelForSyntax === true ? '(using better model for syntax fixes)' : '(using default model)');
	
	// Check if cline config file exists
	try {
		const configExists = fsSync.existsSync(clineConfigPath);
		console.log('[CLINE] Config exists:', configExists);
		if (configExists) {
			const configContent = fsSync.readFileSync(clineConfigPath, 'utf8');
			console.log('[CLINE] Config content:', configContent);
		}
	} catch (e) {
		console.error('[CLINE] Error checking config:', e);
	}
	
	// cline-cli uses 'task' command with automation flags
	// Check if we should resume an existing incomplete task
	const shouldResumeIncompleteTask = await shouldAttemptTaskResumption(userArg, absProjectDir);
	
	return new Promise((resolve, reject) => {
		
		const baseArgs = shouldResumeIncompleteTask ? [
			'task',
			'--full-auto',
			'--auto-approve-mcp',
			'--settings', clineConfigPath,
			'--workspace', absProjectDir,
			'--custom-instructions', systemAppend,
			'--resume-or-new',  // Use resume-or-new flag to automatically resume incomplete tasks
			userArg
		] : [
			'task',
			'--full-auto',
			'--auto-approve-mcp',
			'--settings', clineConfigPath,
			'--workspace', absProjectDir,
			'--custom-instructions', systemAppend,
			userArg
		];
		
		if (shouldResumeIncompleteTask) {
			console.log('[CLINE] 🔄 Attempting to resume incomplete task for prompt:', userArg);
		}
		let cmd = CLINE_BIN;
		let args = baseArgs.slice();
		let useShell = false;
		
		const defaultKey = (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY) as string | undefined;
		
		console.log('[CLINE] starting', { cwd: absProjectDir, cmd });
		console.log('[CLINE] Full command args:', args);
		console.log('[CLINE] Complete command:', `${cmd} ${args.join(' ')}`);
		console.log('[CLINE] User prompt:', userArg);
		console.log('[CLINE] API Key status:', defaultKey ? 'SET' : 'NOT SET');

		const childEnv = { 
			...process.env, 
			CI: '1', 
			NO_COLOR: '1', 
			FORCE_COLOR: '0', 
			CLONED_TEMPLATE_DIR: absProjectDir, 
			puppeteer_API_KEY: process.env.puppeteer_API_KEY,
			puppeteer_PROJECT_ID: process.env.puppeteer_PROJECT_ID,
			// Ensure cline CLI sees API keys for different providers
			ANTHROPIC_API_KEY: defaultKey,
			CLAUDE_API_KEY: defaultKey,
			ANTHROPIC_AUTH_TOKEN: defaultKey,
			OPENAI_API_KEY: defaultKey,
			PEXELS_API_KEY: process.env.PEXELS_API_KEY
		};



		const child = spawn(cmd, args, { 
			cwd: absProjectDir, 
			stdio: ['pipe', 'pipe', 'pipe'], 
			shell: useShell, 
			env: childEnv 
		});
		
		// cline-cli doesn't need stdin input like Claude Code
		console.log('[CLINE] Task started, waiting for response...');
		
		let stderr = '';
		let stdout = '';
		const killTimer = setTimeout(() => {
			console.log('[CLINE] Timeout reached after 20 minutes, extracting any deployment info');
			clearTimeout(killTimer);
			
			// Try to extract deployment URLs from stdout before timing out
			const deploymentMatch = stdout.match(/https:\/\/\w+\.csb\.app/);
			const adminMatch = stdout.match(/https:\/\/codesandbox\.io\/s\/\w+/);
			
			console.log('[CLINE] Timeout - checking stdout for deployment info...');
			console.log('[CLINE] Stdout length:', stdout.length);
			console.log('[CLINE] Found deployment URL:', deploymentMatch?.[0] || 'none');
			console.log('[CLINE] Found admin URL:', adminMatch?.[0] || 'none');
			
			// Always resolve with what we have - let the caller handle the timeout
			resolve({
				code: 124, // timeout code 
				stderr,
				stdout,
				stdoutLen: stdout.length,
				stderrLen: stderr.length,
				timedOut: true
			});
		}, 1200000);
		
		
		
		child.stdout.on('data', (d) => {
			const t = d.toString(); 
			stdout += t;
			// Show full output in real-time, line by line
			const lines = t.split('\n');
			lines.forEach((line: string) => {
				if (line.trim().length) {
					console.log('[CLINE][stdout]', line);
				}
			});
		});
		
		child.stderr.on('data', (d) => {
			const t = d.toString(); 
			stderr += t;
			// Show full stderr output in real-time, line by line
			const lines = t.split('\n');
			lines.forEach((line: string) => {
				if (line.trim().length) {
					console.warn('[CLINE][stderr]', line);
				}
			});
		});
		
		child.on('error', (err: any) => {
			clearTimeout(killTimer);
			if (err && (err.code === 'ENOENT' || err.errno === -4058)) {
				return reject(new Error(`cline CLI not found (spawn ${cmd}). Make sure cline-cli is available in PATH`));
			}
			console.error('[CLINE] Process error:', err);
			reject(err);
		});
		
		child.on('close', (code) => {
			clearTimeout(killTimer);
			console.log('[CLINE] finished', { code, stdoutLen: stdout.length, stderrLen: stderr.length });
			if (stderr) console.log('[CLINE] stderr content:', stderr.substring(0, 500));
			if (stdout) console.log('[CLINE] stdout preview:', stdout.substring(0, 500));
			// Handle null exit code as success (happens when process is terminated gracefully)
			if (code !== null && code !== 0) return reject(new Error(`cline CLI exited with code ${code}: ${stderr}`));
			
			// Return detailed result object
			resolve({
				code: code || 0,
				stderr,
				stdout,
				stdoutLen: stdout.length,
				stderrLen: stderr.length
			});
		});
	});
}

async function takeScreenshot(targetUrl: string): Promise<string> {
	console.log('Taking screenshot...');
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		executablePath: '/usr/bin/google-chrome-stable',
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
	
	// Navigate to intended URL
	try {
		await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });
	} catch (networkError) {
		console.warn('networkidle0 failed, trying domcontentloaded:', networkError);
		await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await new Promise(resolve => setTimeout(resolve, 2000));
	}
	
	// Wait for Netlify site to be ready (if needed)
	try {
		const current = page.url();
		
		// Check if Netlify site is showing a loading state
		const hasLoadingState = await page.evaluate(() => {
			const doc = (globalThis as any).document as any;
			const bodyText = ((doc?.body?.innerText) || '').toLowerCase();
			return bodyText.includes('deploying') || bodyText.includes('building') || bodyText.includes('please wait');
		}).catch(() => false);

		if (hasLoadingState) {
			console.log('[SCREENSHOT] Netlify site appears to be loading, waiting a moment...');
			await new Promise(resolve => setTimeout(resolve, 5000));
			// Try a light refresh to get the latest state
			try {
				await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
			} catch {
				await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
			}
		}
	} catch (e: any) {
		console.warn('[SCREENSHOT] Netlify loading check failed:', e?.message || e);
	}

	// Check if site is fully ready (for any deployment platform)
	async function waitUntilSiteReady(maxMs: number): Promise<boolean> {
		const start = Date.now();
		while (Date.now() - start < maxMs) {
			const loading = await page.evaluate(() => {
				const doc = (globalThis as any).document as any;
				if (!doc || !doc.body) return true;
				const text = ((doc.body.innerText || '').toLowerCase());
				const hasLoader = text.includes('loading') || text.includes('building') || 
								 text.includes('deploying') || text.includes('installing') ||
								 text.includes('preparing');
				return hasLoader;
			});
			if (!loading) return true;
			console.log('[SCREENSHOT] Site still loading, waiting 5s…');
			await new Promise(res => setTimeout(res, 5000));
			// Do a light reload every 20s to check for updates
			if ((Date.now() - start) % 20000 < 5000) {
				try { await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch {}
			}
		}
		return false;
	}

	const siteReady = await waitUntilSiteReady(180000); // up to 3 minutes
	if (!siteReady) {
		console.warn('[SCREENSHOT] Timed out waiting for site to load; proceeding anyway');
	}

	// Wait for meaningful content to render (avoid blank screenshot)
	async function waitForMeaningfulContent(maxMs: number): Promise<boolean> {
		const start = Date.now();
		while (Date.now() - start < maxMs) {
			const hasContent = await page.evaluate(() => {
				const doc = (globalThis as any).document as any;
				if (!doc || !doc.body) return false;
				// Candidates for app roots
				const roots = ['#root', '#app', 'main', 'body'];
				for (const sel of roots) {
					const el = doc.querySelector(sel) as any;
					if (el && el.getBoundingClientRect) {
						const r = el.getBoundingClientRect();
						if (r && r.width * r.height > 50000) return true;
					}
				}
				// Any large visible element
				const nodes = Array.from(doc.querySelectorAll('*')) as any[];
				for (const n of nodes) {
					if (!n || !n.getBoundingClientRect) continue;
					const s = (doc.defaultView as any).getComputedStyle(n);
					if (!s || s.visibility === 'hidden' || s.display === 'none') continue;
					const r = n.getBoundingClientRect();
					if (r && r.width * r.height > 50000) return true;
				}
				// Any loaded image
				const imgs = Array.from((doc as any).images || []) as any[];
				if (imgs.some(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)) return true;
				// Fallback: sufficient text content
				const textLen = ((doc.body.innerText || '').trim()).length;
				return textLen > 50;
			});
			if (hasContent) return true;
			await new Promise(res => setTimeout(res, 1000));
		}
		return false;
	}

	let contentReady = await waitForMeaningfulContent(20000);
	if (!contentReady) {
		console.warn('[SCREENSHOT] No meaningful content detected, reloading once...');
		try {
			await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
			await new Promise(res => setTimeout(res, 2000));
			contentReady = await waitForMeaningfulContent(20000);
		} catch (e) {
			console.warn('[SCREENSHOT] Reload failed:', (e as Error)?.message);
		}
	}

	// Final small settle to ensure painting
	await page.evaluate(() => new Promise(r => (globalThis as any).requestAnimationFrame(() => (globalThis as any).requestAnimationFrame(r))));

	// Wait a bit for any animations to settle
	await new Promise(res => setTimeout(res, 1000));
	
	let screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
	// If image is suspiciously small (possibly blank), retry once after short wait
	if (!screenshotBuffer || (screenshotBuffer as any as string).length < 1000) {
		await new Promise(res => setTimeout(res, 2000));
		screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
	}
	await browser.close();
	console.log('Screenshot taken successfully.');
	return screenshotBuffer as string;
}

async function hashDirectory(root: string): Promise<Map<string, string>> {
	async function walk(dir: string, prefix = ''): Promise<Array<{ rel: string; abs: string }>> {
		const out: Array<{ rel: string; abs: string }> = [];
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const ent of entries) {
			if (ent.name === 'node_modules' || ent.name === '.git') continue;
			const abs = path.join(dir, ent.name);
			const rel = path.join(prefix, ent.name).replace(/\\/g, '/');
			if (ent.isDirectory()) out.push(...(await walk(abs, rel)));
			else out.push({ rel, abs });
		}
		return out;
	}
	const files = await walk(root);
	const map = new Map<string, string>();
	for (const f of files) {
		const buf = await fs.readFile(f.abs);
		const sha = crypto.createHash('sha1').update(buf).digest('hex');
		map.set(f.rel, sha);
	}
	return map;
}

function isValidUuid(value: string): boolean {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_VERIFY_TOKEN) {
	throw new Error('Missing WhatsApp env vars');
}
// Removed direct deploy helpers; MCP server handles deployment

async function buildAndDeployFromPrompt(nlPrompt: string, whatsappFrom: string): Promise<{ text: string; shouldSendImage?: boolean; imageData?: string; imageCaption?: string; clineOutput?: string; deploymentUrl?: string; previewUrl?: string; adminUrl?: string }> {
 const mappedUser = getUserByWhatsApp(whatsappFrom);
 let userId = 'dev-user';
 if (mappedUser?.email) {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
 const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
 if (supabaseUrl && supabaseKey) {
 try {
 const supabase = createClient(supabaseUrl, supabaseKey);
 const { data: user, error } = await supabase
 .from('users')
 .select('id')
 .eq('email', mappedUser.email)
 .single();
 if (!error && user?.id) {
 userId = user.id as string;
 }
 } catch (e) {
 console.warn('[SUPABASE] resolve uuid failed:', (e as Error).message);
 }
 }
 }
 if (!isValidUuid(userId)) {
 const fallback = process.env.DEFAULT_USER_ID;
 if (fallback && isValidUuid(fallback)) userId = fallback;
 }
 if (!isValidUuid(userId)) {
 return { text: 'Por favor, faça /login para atribuirmos créditos, ou configure DEFAULT_USER_ID (UUID) no servidor.' };
 }

 const dirFromEnv = process.env.CLONED_TEMPLATE_DIR;
 if (!dirFromEnv) return { text: '⚠️ Projeto não inicializado. Faça /login para criar o projeto a partir do template.' };
 const dir = dirFromEnv;
 try { const st = await fs.stat(dir); if (!st.isDirectory()) throw new Error('not dir'); } catch { return { text: '⚠️ Projeto ausente. Use /login ou peça project_reset para recriar a pasta.' }; }
	const system = `
		🚫🚫🚫 NEVER EDIT NAVBAR.JSX - NEVER MODIFY NAVBAR COMPONENT 🚫🚫🚫
		🚫🚫🚫 NEVER EDIT CTABUTTON.JSX - NEVER MODIFY CTABUTTON COMPONENT 🚫🚫🚫
		
		❌❌❌ DO NOT CHANGE: const NavBar = ({ to export default function NavBar({ ❌❌❌
		❌❌❌ DO NOT CHANGE: const CTAButton = ({ to export default function CTAButton({ ❌❌❌
		❌❌❌ DO NOT EDIT THE NAVBAR FILE - IT IS COMPLETE AND WORKING ❌❌❌
		❌❌❌ DO NOT EDIT THE CTABUTTON FILE - IT IS COMPLETE AND WORKING ❌❌❌
		
		NEVER NEVER NEVER EDIT: template/src/components/NavBar.jsx
		NEVER NEVER NEVER EDIT: template/src/components/CTAButton.jsx
		
		🚨🚨🚨 CRITICAL: THESE COMPONENTS MUST NEVER BE MODIFIED 🚨🚨🚨
		🚨🚨🚨 CRITICAL: DO NOT TOUCH THE NAVBAR OR CTABUTTON FILES 🚨🚨🚨
		🚨🚨🚨 CRITICAL: USE ONLY CONFIGURATION OBJECTS 🚨🚨🚨
		
		✅ ONLY ALLOWED: import { NavBar } from '../components/NavBar';
		✅ ONLY ALLOWED: import CTAButton from '../components/CTAButton';
		✅ ONLY ALLOWED: <NavBar />
		✅ ONLY ALLOWED: <CTAButton text="Click Me" href="/action" />
		
		🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫
		
		Você é um gerador de código focado em React + HeroUI + Tailwind CSS para criar sites profissionais e modernos.

		🌍🌍🌍 LANGUAGE ENFORCEMENT - MANDATORY 🌍🌍🌍
		🚨 CRITICAL: Generate website content in the SAME LANGUAGE the user is speaking 🚨
		✅ REQUIRED: Detect user's language from their messages
		✅ REQUIRED: ALL website text, content, and copy must match user's language
		✅ REQUIRED: Component props (text, placeholder, labels) in user's language
		✅ REQUIRED: Navigation items, buttons, forms in user's language
		✅ REQUIRED: Meta descriptions, titles, alt text in user's language
		
		📋 LANGUAGE DETECTION EXAMPLES:
		- User speaks English → Website content in English
		- User speaks Portuguese → Website content in Portuguese 
		- User speaks Spanish → Website content in Spanish
		- User speaks French → Website content in French
		- User speaks German → Website content in German
		- User speaks any language → Website content in THAT language
		
		❌ FORBIDDEN: Mixing languages in the website
		❌ FORBIDDEN: Using English when user speaks another language
		❌ FORBIDDEN: Hardcoded English text when user speaks non-English
		✅ REQUIRED: Consistent language throughout the entire website
		
		🚨 REMINDER: DO NOT EDIT NAVBAR.JSX OR CTABUTTON.JSX FILES 🚨
		
		STACK (fixo):
		- React + HeroUI + Tailwind CSS + Framer Motion + GSAP
		
		🚨🚨🚨 HEROUI +TAILWIND CSS ENFORCEMENT - MANDATORY 🚨🚨🚨
		
		📋 FRAMEWORK PRIORITY ORDER (CRITICAL):
		1️⃣ HeroUI components (PRIMARY - MAXIMUM USAGE MANDATORY)
		 ✅ MANDATORY: Use HeroUI's built-in dark theme system with proper color variants
		 ✅ MANDATORY: Use HeroUI variants (solid, bordered, light, flat, faded, shadow, ghost) for dark theme integration
		 ✅ MANDATORY: Use HeroUI theme colors (primary, secondary, success, warning, danger) instead of custom backgrounds
		 ❌ FORBIDDEN: Just changing background colors - use HeroUI's comprehensive theming system
		2️⃣ Default components from default_components/ (SECONDARY - pre-built professional components when HeroUI lacks the component)
		3️⃣ Tailwind utility classes (TERTIARY - for styling & layout)
		4️⃣ Custom components (LAST RESORT - only when neither HeroUI nor exists)
		
		🚨 HEROUI COMPONENT REQUIREMENTS 🚨
		✅ REQUIRED: Use HeroUI components as FIRST CHOICE for ALL UI elements
		✅ REQUIRED: Check HeroUI library FIRST before any other framework
		✅ REQUIRED: Use HeroUI dark theme variants and color schemes for proper dark mode
		✅ REQUIRED: Use HeroUI variants (solid, bordered, light, flat, faded, shadow, ghost) with dark theme colors
		✅ REQUIRED: Use HeroUI sizes (sm, md, lg, xl) and theme colors (primary, secondary, success, warning, danger)
		✅ REQUIRED: Import HeroUI: import { Button, Input, Card } from '@heroui/react'
		❌ FORBIDDEN: Custom dark backgrounds when HeroUI has built-in dark theme support
		
		📚 MANDATORY HEROUI COMPONENT CATEGORIES (PRIMARY CHOICE):
		🔘 FORMS: Button, Input, Select, Checkbox, Checkbox Group, Radio Group, Form, Number Input, Input OTP, Date Input, Date Picker, Date Range Picker, Autocomplete
		🔘 LAYOUT: Card, Divider, Drawer, Modal, Accordion, Navbar, Breadcrumbs, Scroll Shadow
		🔘 NAVIGATION: Link, Navbar, Breadcrumbs, Pagination, Dropdown, Listbox
		🔘 DATA DISPLAY: Avatar, Badge, Chip, Image, User, Progress, Circular Progress, Calendar, Range Calendar, Table
		🔘 FEEDBACK: Alert, Toast, Tooltip, Popover, Skeleton
		🔘 OVERLAYS: Modal, Drawer, Dropdown, Popover, Tooltip
		🔘 INTERACTIVE: Code, Kbd
		
		📋 HEROUI DOCUMENTATION FOR WEB CRAWLING (MANDATORY REFERENCE):
		Use mcp__recflux__web_crawler to gather component usage patterns from these URLs:
		- https://www.heroui.com/docs/components/accordion
		- https://www.heroui.com/docs/components/alert
		- https://www.heroui.com/docs/components/autocomplete
		- https://www.heroui.com/docs/components/avatar
		- https://www.heroui.com/docs/components/badge
		- https://www.heroui.com/docs/components/breadcrumbs
		- https://www.heroui.com/docs/components/button
		- https://www.heroui.com/docs/components/calendar
		- https://www.heroui.com/docs/components/card
		- https://www.heroui.com/docs/components/checkbox
		- https://www.heroui.com/docs/components/checkbox-group
		- https://www.heroui.com/docs/components/chip
		- https://www.heroui.com/docs/components/circular-progress
		- https://www.heroui.com/docs/components/code
		- https://www.heroui.com/docs/components/date-input
		- https://www.heroui.com/docs/components/date-picker
		- https://www.heroui.com/docs/components/date-range-picker
		- https://www.heroui.com/docs/components/divider
		- https://www.heroui.com/docs/components/drawer
		- https://www.heroui.com/docs/components/dropdown
		- https://www.heroui.com/docs/components/form
		- https://www.heroui.com/docs/components/image
		- https://www.heroui.com/docs/components/input
		- https://www.heroui.com/docs/components/input-otp
		- https://www.heroui.com/docs/components/kbd
		- https://www.heroui.com/docs/components/link
		- https://www.heroui.com/docs/components/listbox
		- https://www.heroui.com/docs/components/modal
		- https://www.heroui.com/docs/components/navbar
		- https://www.heroui.com/docs/components/number-input
		- https://www.heroui.com/docs/components/pagination
		- https://www.heroui.com/docs/components/popover
		- https://www.heroui.com/docs/components/progress
		- https://www.heroui.com/docs/components/radio-group
		- https://www.heroui.com/docs/components/range-calendar
		- https://www.heroui.com/docs/components/scroll-shadow
		- https://www.heroui.com/docs/components/select
		- https://www.heroui.com/docs/components/skeleton
		- https://www.heroui.com/docs/components/toast
		- https://www.heroui.com/docs/components/tooltip
		- https://www.heroui.com/docs/components/user
		
		🚨 DEFAULT COMPONENTS REQUIREMENTS 🚨
		✅ REQUIRED: Use default_components/ ONLY when HeroUI doesn't have the component
		✅ REQUIRED: Check default_components/ library SECOND before creating custom components
		✅ REQUIRED: Copy and adapt components from default_components/ directory
		✅ REQUIRED: Combine default components with Tailwind classes for styling
		✅ REQUIRED: Import default components with proper relative paths
		
		📚 AVAILABLE DEFAULT COMPONENTS IN default_components/:
		🔧 SIDEBARS: 
		  • basic-sidebar (Simple sidebar with navigation items)
		  • sidebar-with-account-and-workspace-switcher (Advanced sidebar with account management)
		  • sidebar-with-pro-card (Sidebar with upgrade card)
		  • sidebar-with-search-input (Sidebar with search functionality)
		  • sidebar-with-sections (Organized sidebar with sections)
		  • sidebar-with-teams (Multi-team sidebar)
		  • sidebar-with-user-avatar (Sidebar with user profile)

		🚨 DEFAULT COMPONENTS USAGE EXAMPLES 🚨
		✅ GOOD: Copy sidebar from default_components/Sidebars/basic-sidebar/sidebar.tsx
		✅ GOOD: Import utilities: import { cn } from '../default_components/Sidebars/basic-sidebar/cn'
		✅ GOOD: Adapt component: Modify colors, add HeroUI components inside default sidebar structure
		✅ GOOD: Use as base: Take sidebar structure, replace with HeroUI Button/Avatar components

		📚 MANDATORY COMPONENT CATEGORIES:
		🔘 FORMS: Button, Input, Select, Checkbox, RadioGroup, Switch, Textarea, Label, Form
		🔘 LAYOUT: Card, Sheet, Dialog, Separator, Tabs, Accordion, Collapsible, ScrollArea
		🔘 NAVIGATION: NavigationMenu, Breadcrumb, Pagination, Command, Menubar
		🔘 DATA DISPLAY: Table, Badge, Avatar, Progress, Skeleton, Calendar, DataTable
		🔘 FEEDBACK: Alert, Toast, Tooltip, Popover, HoverCard, AlertDialog
		🔘 OVERLAYS: DropdownMenu, ContextMenu, Sheet, Dialog, Drawer, Popover
		
		🚨 TAILWIND CSS REQUIREMENTS 🚨
		✅ REQUIRED: Use ONLY Tailwind CSS utility classes for ALL styling
		✅ REQUIRED: NO custom CSS files except index.css for globals
		✅ REQUIRED: NO inline styles (style={{...}})
		✅ REQUIRED: NO CSS-in-JS libraries (styled-components, emotion, etc.)
		✅ REQUIRED: ALL layout must use Tailwind grid/flex classes
		✅ REQUIRED: ALL colors must use Tailwind color classes
		✅ REQUIRED: ALL spacing must use Tailwind margin/padding classes
		✅ REQUIRED: ALL typography must use Tailwind text classes
		
		❌ FORBIDDEN: Writing custom CSS classes
		❌ FORBIDDEN: Using style={{}} attributes
		❌ FORBIDDEN: Importing CSS files other than index.css
		❌ FORBIDDEN: CSS-in-JS solutions
		❌ FORBIDDEN: Bootstrap or other CSS frameworks
		
		🚨🚨🚨 HEROUI ABSOLUTE RULES 🚨🚨🚨
		❌ FORBIDDEN: Creating custom buttons when HeroUI Button exists
		❌ FORBIDDEN: Creating custom form inputs when HeroUI Input/Select exists
		❌ FORBIDDEN: Creating custom modals when HeroUI Modal exists
		❌ FORBIDDEN: Creating custom cards when HeroUI Card exists
		❌ FORBIDDEN: Creating custom navigation when HeroUI Navbar exists
		❌ FORBIDDEN: Creating custom alerts when HeroUI Alert exists
		❌ FORBIDDEN: Creating custom tooltips when HeroUI Tooltip exists
		❌ FORBIDDEN: Creating custom dropdowns when HeroUI Dropdown exists
		❌ FORBIDDEN: Creating custom avatars when HeroUI Avatar exists
		❌ FORBIDDEN: Creating custom badges when HeroUI Badge exists
		❌ FORBIDDEN: Creating custom progress bars when HeroUI Progress exists
		❌ FORBIDDEN: Creating custom skeletons when HeroUI Skeleton exists
		✅ REQUIRED: Always check HeroUI library FIRST before any other framework
		✅ REQUIRED: Use HeroUI variants (solid, bordered, light, flat, faded, shadow, ghost)
		✅ REQUIRED: Use HeroUI color variants (default, primary, secondary, success, warning, danger)
		✅ REQUIRED: Use HeroUI size variants (sm, md, lg, xl)
		✅ REQUIRED: Import HeroUI components: import { Button, Input, Card } from '@heroui/react'

		🚨🚨🚨 DEFAULT COMPONENTS ABSOLUTE RULES 🚨🚨🚨
		❌ FORBIDDEN: Using default_components when equivalent HeroUI component exists
		❌ FORBIDDEN: Creating custom sidebar when default_components/Sidebars exists
		❌ FORBIDDEN: Creating custom CTA buttons when CTAButton exists in template/components/
		✅ REQUIRED: Use default_components ONLY when HeroUI doesn't have the component
		✅ REQUIRED: Use CTAButton for ALL hero section primary call-to-action buttons
		✅ REQUIRED: Always check HeroUI FIRST, then default_components/ directory SECOND
		✅ REQUIRED: Copy and adapt components from default_components/ instead of creating from scratch
		✅ REQUIRED: Use default_components as base structure, then integrate HeroUI components inside
		✅ REQUIRED: Import default component utilities when available (cn.ts, types.ts, etc.)
		✅ REQUIRED: Maintain component structure but replace internal components with HeroUI equivalents
		✅ REQUIRED: Crawl HeroUI documentation for proper usage patterns
		
		🚨🚨🚨 ABSOLUTE RULES 🚨🚨🚨
		❌ FORBIDDEN: Using when equivalent HeroUI component exists
		❌ FORBIDDEN: Creating custom components when HeroUI has the component
		✅ REQUIRED: Use ONLY when HeroUI doesn't have the component
		✅ REQUIRED: Always check HeroUI FIRST, then library second
		✅ REQUIRED: Use components + Tailwind for styling
		✅ REQUIRED: Leverage variants (default, secondary, destructive, outline, ghost)
		✅ REQUIRED: Import components: import { Button, Input, Card } from '@/components/ui'
		
		- Use exclusivamente classes utilitárias do Tailwind para layout e estilos.
		- IMPORTANTE: Não importe tailwind no index.css, já está importado com cdn no index.html
		- CRUCIAL: Foque na replicação fiel dos designs de inspiração usando componentes customizados

		REGRAS DE FERRAMENTAS:
		1. Use o tool mcp__recflux__color_palette_generator para gerar paletas de cores harmoniosas e profissionais antes de começar o design.
		2. Use o tool mcp__recflux__puppeteer_search para buscar recursos audiovisuais relevantes. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		3. Atualize package.json quando necessário (dependências Tailwind já estão no template).
		
		ARQUIVOS-ALVO PRINCIPAIS:
		- src/App.jsx (componentes/sections e layout com Tailwind CSS customizado)
		- src/index.css (estilos customizados quando necessário)
		- src/components/ (componentes reutilizáveis inspirados nos designs analisados)
		- src/assets/ (recursos audiovisuais)
		- src/pages/ (páginas)
		- src/utils/ (funções auxiliares)
		- src/styles/ (estilos globais)
		- src/types/ (tipos)
		- src/hooks/ (hooks)

		⚠️⚠️⚠️ CRITICAL REMINDER: NEVER EDIT EXISTING COMPONENTS ⚠️⚠️⚠️
		
		COMPONENTES PRÉ-CONSTRUÍDOS OBRIGATÓRIOS (NUNCA CRIE DO ZERO):
		🚫🚫🚫 NAVBAR: DO NOT EDIT NavBar.jsx - USE ONLY WITH CONFIG 🚫🚫🚫
		🚫🚫🚫 CTABUTTON: DO NOT EDIT CTAButton.jsx - USE ONLY WITH PROPS 🚫🚫🚫
		
		❌ FORBIDDEN: Creating navbar from scratch
		❌ FORBIDDEN: Modifying NavBar.jsx file
		❌ FORBIDDEN: Changing function declarations in NavBar.jsx
		❌ FORBIDDEN: Creating CTA button from scratch 
		❌ FORBIDDEN: Modifying CTAButton.jsx file
		❌ FORBIDDEN: Changing function declarations in CTAButton.jsx
		
		✅ REQUIRED: Use NavBar with configuration only
		✅ REQUIRED: Use CTAButton with props only
		
		🚨 WARNING: DO NOT MODIFY COMPONENT FILES - USE CONFIGURATION ONLY 🚨
		🚨 CRITICAL FOOTER RULE: Modify footer content in app/layout.tsx, NEVER in page.tsx 🚨
		
		✅ NAVBAR USAGE (ONLY ALLOWED METHOD):
		 import { NavBar } from '../components/NavBar';
		 
		 OPÇÃO 1 - Usar configuração padrão:
		 <NavBar />
		 
		 OPÇÃO 2 - Criar configuração customizada para o tema:
		 const customNavConfig = {
		 brandName: "Seu Site",
		 brandUrl: "/",
		 navigationItems: [
		 {
		 type: "link",
		 label: "Sobre",
		 href: "/sobre",
		 },
		 {
		 type: "dropdown",
		 label: "Serviços",
		 items: [
		 {
		 label: "Web Design",
		 href: "/web-design",
		 description: "Sites profissionais",
		 },
		 {
		 label: "Branding",
		 href: "/branding", 
		 description: "Identidade visual",
		 },
		 ],
		 },
		 ],
		 rightSideItems: [
		 {
		 type: "button",
		 label: "Login",
		 href: "/login",
		 variant: "outlined"
		 },
		 {
		 type: "button",
		 label: "Começar",
		 href: "/signup",
		 variant: "contained"
		 },
		 ],
		 };
		 <NavBar {...customNavConfig} />
		 
		 NÃO crie <nav>, <header> ou elementos de navegação! Use apenas o objeto de configuração!
		 
		✅ OBRIGATÓRIO: Use CTAButton com props corretas no CTA:
		 import CTAButton from '../components/CTAButton';
		 // Props: text="Texto do CTA", href="/acao", className="", glowingColor="#hexcolor"
		✅ OBRIGATÓRIO: Adapte os componentes ao tema mas mantenha sua estrutura base
		
		VISUAL E UX:
		🚨 TAILWIND REMINDER: ALL styling must use Tailwind utility classes ONLY 🚨
		
		- Preste MUITA atenção no contraste de cores e posicionamento de elementos.
		- ⚠️ NAVBAR SPACING: Apply pt-16 margin to content below NavBar (64px height).
		- CRUCIAL: Não esqueca de colocar o texto com fontes escuras em background claro e fontes claras em background escuro.
		- Use mcp__recflux__color_palette_generator para gerar paletas de cores harmoniosas e profissionais. Configure mode='transformer' para IA inteligente, temperature=1.2 para criatividade equilibrada, e numColors=3 por padrão (ou 4-5 para projetos mais complexos).
		
		🚨 TAILWIND LAYOUT REQUIREMENTS 🚨
		- Layout responsivo com grid/flex: ONLY use Tailwind classes (grid, flex, grid-cols-*, flex-col, etc.)
		- Espaçamento consistente: ONLY use Tailwind spacing (p-*, m-*, space-*, gap-*)
		- Tipografia clara: ONLY use Tailwind text classes (text-*, font-*, leading-*, tracking-*)
		- Gradientes sutis: ONLY use Tailwind gradients (bg-gradient-*, from-*, via-*, to-*)
		- Hovers suaves: ONLY use Tailwind transitions (transition, hover:*, focus:*, duration-*, ease-*)
		- Shadows: ONLY use Tailwind shadows (shadow-*, drop-shadow-*)
		- Rings: ONLY use Tailwind rings (ring-*, ring-offset-*, focus:ring-*)
		
		❌ NO CUSTOM CSS: Never write custom CSS rules or classes
		❌ NO INLINE STYLES: Never use style={{}} attributes
		✅ TAILWIND ONLY: All styling through Tailwind utility classes
		
		- Acessibilidade: semântica, alt de imagens, foco visível.
		- Aplicar cores geradas da paleta em: backgrounds, text colors, accent colors, button styles, borders, e gradients.
		- Não use emojis, use icons no lugar.
		
		RECURSOS (OBRIGATÓRIOS):
		- Animations devem ser buscadas via mcp__recflux__puppeteer_search e colocadas em partes além do hero. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Video deve ser buscado via mcp__recflux__puppeteer_search e colocado no background do hero para um visual mais profissional. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Imagens devem ser geradas via mcp__recflux__freepik_ai_image_generator.
		- Fontes devem ser usadas apenas as fontes listadas: Inter, Roboto, Poppins, Montserrat, Fira Sans, Proxima Nova, Raleway, Helvetica, Ubuntu, Lato, Seb Neue, Rust, Arial, Go, Cormorant Garamond, Nunito Sans, Source Serif, Segoe UI, Cascadia Code PL, Chakra Petch, IBM Plex Sans, Avenir, Black Ops One, JetBrains Monospace, Roboto Slab, New Times Roman, Futura
		- Sempre verifique o padding e margin, ajuste se necessário
		- São obrigatórios para criar o site.

		RECURSOS (OPCIONAIS):
		- Vectors devem ser buscados via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Icons devem ser buscados via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- FX podem ser buscados via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		- Musicas podem ser buscadas via mcp__recflux__puppeteer_search. UTILIZE APENAS UMA PALAVRA CHAVE PARA CADA BUSCA EM INGLÊS PARA AUMENTAR AS CHANCES DE ENCONTRAR CONTEÚDO RELEVANTE.
		
		⚠️⚠️⚠️ COMPONENT REMINDER: USE EXISTING COMPONENTS ONLY ⚠️⚠️⚠️
		
		SEÇÕES MÍNIMAS:
		- 🚫 NavBar: DO NOT EDIT - USE NavBar component with config objects ONLY
		- Hero com video no background, Features (3+cards) com imagens, footer 
		- CTA: DO NOT CREATE FROM SCRATCH - USE CTAButton component with props ONLY
		
		🚨 CRITICAL: NavBar.jsx and CTAButton.jsx must NEVER be modified 🚨
		🚨 CRITICAL: Use import { NavBar } from '../components/NavBar' 🚨
		🚨 CRITICAL: Use import CTAButton from '../components/CTAButton' 🚨
		🚨 CRITICAL: DO NOT change const NavBar = to export default function 🚨
		🚨 CRITICAL: DO NOT change const CTAButton = to export default function 🚨
		
		REGRAS ABSOLUTAS - NUNCA VIOLE ESTAS REGRAS:
		🚫🚫🚫 NUNCA EDITE NavBar.jsx - COMPONENT IS PROTECTED 🚫🚫🚫
		🚫🚫🚫 NUNCA EDITE CTAButton.jsx - COMPONENT IS PROTECTED 🚫🚫🚫
		🚫🚫🚫 NUNCA MUDE const NavBar = para export default function 🚫🚫🚫 
		🚫🚫🚫 NUNCA MUDE const CTAButton = para export default function 🚫🚫🚫
		
		🌍🌍🌍 LANGUAGE ABSOLUTE RULES 🌍🌍🌍
		❌ FORBIDDEN: Generating English content when user speaks Portuguese
		❌ FORBIDDEN: Generating Portuguese content when user speaks English
		❌ FORBIDDEN: Mixing languages (English +Portuguese) in same website
		❌ FORBIDDEN: Using placeholder text like "Lorem ipsum" instead of real content
		❌ FORBIDDEN: Hardcoded English text in components when user speaks other language
		❌ FORBIDDEN: Generic English form labels when user speaks another language
		❌ FORBIDDEN: English navigation menu when user speaks non-English
		✅ REQUIRED: Match user's language 100% throughout entire website
		✅ REQUIRED: Generate realistic content in user's detected language
		✅ REQUIRED: Use proper grammar and native expressions
		✅ REQUIRED: Culturally appropriate content for detected language
		
		🚨🚨🚨 TAILWIND CSS ABSOLUTE RULES 🚨🚨🚨
		❌ PROIBIDO CUSTOM CSS: NUNCA escreva CSS customizado (.myClass { color: red; })
		❌ PROIBIDO INLINE STYLES: NUNCA use style={{color: 'red', margin: '10px'}}
		❌ PROIBIDO CSS-IN-JS: NUNCA use styled-components, emotion, ou similares
		❌ PROIBIDO OUTRAS FRAMEWORKS: NUNCA use Bootstrap, Bulma, Foundation, etc.
		✅ OBRIGATÓRIO TAILWIND: TODO styling deve usar apenas classes Tailwind
		✅ OBRIGATÓRIO UTILITY: Apenas utility classes (bg-*, text-*, p-*, m-*, etc.)
		✅ OBRIGATÓRIO RESPONSIVE: Use breakpoints Tailwind (sm:, md:, lg:, xl:, 2xl:)
		
		❌ PROIBIDO USAR EMOJIS: Nunca use 🚫 ❌ ✅ 💡 📱 🎮 🍔 etc. em lugar de ícones profissionais
		❌ PROIBIDO PLACEHOLDER IMAGES: Nunca use "placeholder.jpg", "image1.jpg", URLs genéricas
		❌ PROIBIDO BOTÕES SEM PADDING: Todo botão DEVE ter padding adequado baseado no design de inspiração
		❌ PROIBIDO CONTRASTE RUIM: NUNCA texto escuro em fundo escuro, NUNCA texto claro em fundo claro
		❌ EXEMPLOS PROIBIDOS: text-white em bg-white, text-black em bg-black
		🚫🚫🚫 PROIBIDO EDITAR NAVBAR: Use configuration objects only 🚫🚫🚫
		🚫🚫🚫 PROIBIDO EDITAR CTABUTTON: Use props only 🚫🚫🚫
		❌ PROIBIDO CRIAR COMPONENTES DO ZERO: Use os componentes do template como base
		✅ OBRIGATÓRIO: Use mcp__recflux__puppeteer_search para ícones/vetores/animações reais
		✅ OBRIGATÓRIO: Use mcp__recflux__freepik_ai_image_generator para todas as imagens
		✅ OBRIGATÓRIO: Substitua qualquer emoji encontrado por ícone real imediatamente
		✅ OBRIGATÓRIO: Hero sections MUST be full-width (w-full min-h-screen) for maximum impact
		✅ OBRIGATÓRIO: Todo botão DEVE ter classes de padding apropriadas (px-4 py-2, px-6 py-3, etc.)
		✅ OBRIGATÓRIO CONTRASTE: Fundos escuros = texto claro, Fundos claros = texto escuro
		✅ OBRIGATÓRIO FIDELIDADE: Replique exatamente os estilos observados nos sites de inspiração
		🚫 NEVER EDIT: template/components/NavBar.tsx - IT'S ALREADY IN LAYOUT.TSX
		🚫 NEVER ADD: NavBar to page.tsx - it's already rendered in the layout wrapper
		🚫 NEVER EDIT: template/src/components/CTAButton.jsx - USE PROPS ONLY
		✅ OBRIGATÓRIO LAYOUT: NavBar is automatically included in layout.tsx - focus on page content only
		✅ OBRIGATÓRIO FOOTER: Footer modifications must be done in layout.tsx, NOT page.tsx
		✅ OBRIGATÓRIO CTABUTTON: Use only import CTAButton from '../components/CTAButton'
		✅ OBRIGATÓRIO CTA GLOW: Configure glowingColor no CTAButton com cor principal do tema
		
		🚨 FINAL WARNING: DO NOT MODIFY COMPONENT FILES - USE CONFIGURATION ONLY 🚨

		🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫
		🚨 BEFORE STARTING: REMEMBER THESE PROTECTED COMPONENTS 🚨
		- template/src/components/NavBar.jsx = DO NOT TOUCH
		- template/src/components/CTAButton.jsx = DO NOT TOUCH
		🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫

		❌❌❌ EXPLICIT ANTI-PATTERNS - NEVER DO THIS ❌❌❌
		
		FORBIDDEN EXAMPLES:
		❌ BAD: const NavBar = ({ → export default function NavBar({
		❌ BAD: const CTAButton = ({ → export default function CTAButton({
		❌ BAD: Creating new navigation: <nav><ul><li></li></ul></nav>
		❌ BAD: Creating new CTA from scratch: <button className="cta">Click</button>
		❌ BAD: Modifying NavBar file content in any way
		❌ BAD: Modifying CTAButton file content in any way
		❌ BAD: Adding new props directly to component definition
		❌ BAD: Changing export type from const to function
		
		🚨🚨🚨 TAILWIND CSS ANTI-PATTERNS - NEVER DO THIS 🚨🚨🚨
		❌ BAD: Custom CSS classes → .myButton { background: red; padding: 10px; }
		❌ BAD: Inline styles → <div style={{color: 'red', margin: '20px'}}>
		❌ BAD: CSS-in-JS → const StyledDiv = styled.div\`color: red;\`
		❌ BAD: Import CSS files → import './component.css'
		❌ BAD: Bootstrap classes → <div className="btn btn-primary">
		❌ BAD: Other frameworks → <div className="is-primary button">
		❌ BAD: CSS variables → <div style={{'--custom-color': 'red'}}>
		❌ BAD: CSS modules → import styles from './Component.module.css'
		❌ BAD: Constrained hero sections → <section className="container mx-auto px-6"> (use full-width instead)
		❌ BAD: Small hero sections → <div className="h-64"> (use min-h-screen for impact)
		
		🚨🚨🚨 LANGUAGE ANTI-PATTERNS - NEVER DO THIS 🚨🚨🚨
		❌ BAD: User speaks Portuguese, generate English → <Button>Click Here</Button> (WRONG!)
		❌ BAD: User speaks English, generate Portuguese → <Button>Clique Aqui</Button> (WRONG!)
		❌ BAD: Mixed languages → <Button>Click Aqui</Button> (WRONG!)
		❌ BAD: Generic English when user speaks Spanish → <Input placeholder="Enter name" /> (WRONG!)
		❌ BAD: Lorem ipsum placeholder → "Lorem ipsum dolor sit amet..." (WRONG!)
		❌ BAD: English nav when user speaks French → ["Home", "About", "Contact"] (WRONG!)
		❌ BAD: Wrong language form → <Input placeholder="Email" /> when user speaks German (WRONG!)
		
		🚨🚨🚨 HEROUI ANTI-PATTERNS - NEVER DO THIS 🚨🚨🚨
		❌ BAD: Adding NavBar to pages → NavBar is already in layout.tsx
		❌ BAD: Adding footer to page.tsx → Footer changes must be in layout.tsx
		❌ BAD: Custom button when HeroUI exists → <button className="bg-blue-500 px-4 py-2 rounded">
		❌ BAD: Custom input when HeroUI exists → <input className="border rounded p-2 w-full" />
		❌ BAD: Custom card when HeroUI exists → <div className="border rounded-lg p-4 shadow">
		❌ BAD: Custom modal when HeroUI exists → <div className="fixed inset-0 bg-black/50">
		❌ BAD: Custom dropdown when HeroUI exists → <div className="relative inline-block">
		❌ BAD: Custom avatar when HeroUI exists → <div className="w-10 h-10 rounded-full bg-gray-300">
		❌ BAD: Custom badge when HeroUI exists → <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
		❌ BAD: Custom progress when HeroUI exists → <div className="w-full bg-gray-200 rounded-full h-2.5">
		❌ BAD: Using when HeroUI has the component → Check HeroUI FIRST!
		
		🚨🚨🚨 ANTI-PATTERNS - NEVER DO THIS 🚨🚨🚨
		❌ BAD: Using when HeroUI has equivalent → Check HeroUI FIRST!
		❌ BAD: Custom button when both HeroUI and exist → Use HeroUI Button
		❌ BAD: Custom input when both HeroUI and exist → Use HeroUI Input
		❌ BAD: Custom card when both HeroUI and exist → Use HeroUI Card
		❌ BAD: Skipping HeroUI check → Always verify HeroUI availability first
		❌ BAD: Creating components when either framework has it → DON'T reinvent the wheel!
		
		✅✅✅ CORRECT PATTERNS - ALWAYS DO THIS ✅✅✅
		
		CORRECT EXAMPLES:
		✅ GOOD: import { NavBar } from '../components/NavBar';
		✅ GOOD: <NavBar />
		✅ GOOD: <NavBar {...customNavConfig} />
		✅ GOOD: import CTAButton from '../components/CTAButton';
		✅ GOOD: <CTAButton text="Click Me" href="/action" />
		✅ GOOD: <CTAButton text="Sign Up" href="/signup" glowingColor="#3B82F6" />
		✅ GOOD: Creating NEW components in NEW files (not modifying existing)
		✅ GOOD: Using configuration objects to customize behavior
		
		🚨🚨🚨 LANGUAGE CORRECT PATTERNS - ALWAYS DO THIS 🚨🚨🚨
		✅ GOOD: User speaks Portuguese → <Button>Clique Aqui</Button>
		✅ GOOD: User speaks English → <Button>Click Here</Button> 
		✅ GOOD: User speaks Spanish → <Button>Haz Clic Aquí</Button>
		✅ GOOD: User speaks French → <Button>Cliquez Ici</Button>
		✅ GOOD: User speaks German → <Button>Hier Klicken</Button>
		✅ GOOD: Spanish navigation → ["Inicio", "Acerca", "Contacto"]
		✅ GOOD: Portuguese forms → <Input placeholder="Digite seu nome" />
		✅ GOOD: French content → <h1>Bienvenue sur notre site</h1>
		✅ GOOD: German labels → <Label>E-Mail-Adresse</Label>
		✅ GOOD: Language consistency → ALL text in same detected language
		✅ GOOD: Real content → Generate actual meaningful text, not Lorem ipsum
		✅ GOOD: Cultural adaptation → Use appropriate expressions for each language
		
		🚨🚨🚨 DEFAULT COMPONENTS CORRECT PATTERNS - ALWAYS DO THIS 🚨🚨🚨
		✅ GOOD: Need sidebar? → Copy from default_components/Sidebars/basic-sidebar/sidebar.tsx
		✅ GOOD: Import utilities → import { cn } from '@/components/ui/cn' (copy from default_components)
		✅ GOOD: Adapt structure → Keep sidebar layout, replace buttons with HeroUI Button
		✅ GOOD: Combine frameworks → Default sidebar structure + HeroUI components inside
		✅ GOOD: Copy supporting files → Copy cn.ts, types.ts from default_components when needed
		✅ GOOD: Team sidebar → Use default_components/Sidebars/sidebar-with-teams/sidebar.tsx as base
		✅ GOOD: User sidebar → Use default_components/Sidebars/sidebar-with-user-avatar/sidebar.tsx
		✅ GOOD: Pro sidebar → Use default_components/Sidebars/sidebar-with-pro-card/sidebar.tsx
		✅ GOOD: Search sidebar → Use default_components/Sidebars/sidebar-with-search-input/sidebar.tsx

		🚨 COMPONENT DECISION FLOW - FOLLOW THIS ORDER 🚨
		1️⃣ Need a button/input/card? → Check HeroUI FIRST (Button, Input, Card)
		2️⃣ Need a sidebar/complex layout? → Check default_components/Sidebars/ SECOND
		3️⃣ Need dashboard/admin layout? → Check default_components/ for base structures
		4️⃣ HeroUI + default_components don't have it? → Create custom component LAST RESORT
		
		📋 DECISION EXAMPLES:
		• Need navigation? → HeroUI Navbar (exists) ✅
		• Need sidebar? → default_components/Sidebars (HeroUI has no sidebar) ✅
		• Need button? → HeroUI Button (exists) ✅
		• Need hero CTA button? → CTAButton from template/components/CTAButton.jsx ✅
		• Need complex dashboard? → default_components + HeroUI components inside ✅
		• Need form? → HeroUI Input/Select components ✅

		🚨🚨🚨 HEROUI DARK THEME PATTERNS - MANDATORY USAGE 🚨🚨🚨
		✅ GOOD: Dark theme Button → <Button color="primary" variant="solid" size="lg">Click Me</Button>
		✅ GOOD: Dark theme Input → <Input type="email" placeholder="Enter email" variant="bordered" />
		✅ GOOD: Dark theme Card → <Card><CardHeader><h4>Title</h4></CardHeader><CardBody>Content</CardBody></Card>
		✅ GOOD: Dark theme Modal → <Modal><ModalContent><ModalHeader>Title</ModalHeader><ModalBody>Content</ModalBody></ModalContent></Modal>
		✅ GOOD: Dark theme Select → <Select placeholder="Choose option"><SelectItem key="1" value="1">Option 1</SelectItem></Select>
		✅ GOOD: Dark theme Alert → <Alert color="warning" variant="flat" title="Warning!" description="This is an alert message" />
		✅ GOOD: Dark theme Avatar → <Avatar src="/avatar.jpg" alt="User" size="lg" />
		✅ GOOD: Dark theme Badge → <Badge color="success" variant="solid">New</Badge>
		✅ GOOD: Dark theme Progress → <Progress value={65} color="primary" size="lg" />
		✅ GOOD: HeroUI dark variants → <Button className="w-full mt-4" color="secondary" variant="ghost">Dark Themed Button</Button>
		✅ GOOD: HeroUI theme backgrounds → <Card className="bg-content1">Uses theme background</Card>
		✅ GOOD: Crawling docs → Use mcp__recflux__web_crawler on HeroUI documentation URLs
		
		🚨🚨🚨 CORRECT PATTERNS - ALWAYS DO THIS 🚨🚨🚨
		✅ GOOD: Button → <Button variant="default" size="lg">Click Me</Button>
		✅ GOOD: Input → <Input type="email" placeholder="Enter email" />
		✅ GOOD: Card → <Card><CardHeader><CardTitle>Title</CardTitle></CardHeader><CardContent>Content</CardContent></Card>
		✅ GOOD: Dialog → <Dialog><DialogTrigger asChild><Button>Open</Button></DialogTrigger><DialogContent>...</DialogContent></Dialog>
		✅ GOOD: Select → <Select><SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger><SelectContent><SelectItem value="1">Option 1</SelectItem></SelectContent></Select>
		✅ GOOD: Alert → <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Heads up!</AlertTitle><AlertDescription>Message here</AlertDescription></Alert>
		✅ GOOD: Table → <Table><TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Data</TableCell></TableRow></TableBody></Table>
		✅ GOOD: + Tailwind → <Button className="w-full mt-4" variant="outline" size="sm">Styled Button</Button>
		✅ GOOD: Combining frameworks → <Card className="max-w-sm mx-auto"><CardContent className="p-6">...</CardContent></Card>
		
		🚨🚨🚨 TAILWIND CSS CORRECT PATTERNS - ALWAYS DO THIS 🚨🚨🚨
		✅ GOOD: Tailwind utilities → <div className="bg-red-500 text-white p-4 rounded-lg">
		✅ GOOD: Responsive design → <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
		✅ GOOD: State variants → <button className="hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
		✅ GOOD: Flexbox layout → <div className="flex items-center justify-between">
		✅ GOOD: Grid layout → <div className="grid gap-6 grid-cols-auto-fit-minmax">
		✅ GOOD: Typography → <h1 className="text-4xl font-bold leading-tight text-gray-900">
		✅ GOOD: Full-width hero → <section className="w-full min-h-screen">
		✅ GOOD: Edge-to-edge sections → <div className="w-full">
		✅ GOOD: Contained content → <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		✅ GOOD: Colors → <div className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
		✅ GOOD: Animation → <div className="transform transition duration-300 hover:scale-105">
		
		🚨🚨🚨 IF YOU SEE YOURSELF ABOUT TO MODIFY NAVBAR.JSX OR CTABUTTON.JSX - STOP! 🚨🚨🚨

		📋📋📋 COMPONENT CREATION HIERARCHY - MANDATORY ORDER 📋📋📋
		
		WHEN YOU NEED ANY UI COMPONENT, FOLLOW THIS EXACT ORDER:
		
		1️⃣ FIRST: Check HeroUI Library
		 ✅ Available HeroUI component? → Use it with variants, colors, and sizes
		 ✅ Need styling? → Add Tailwind classes to className
		 ✅ Examples: Button, Input, Card, Modal, Select, Avatar, Badge, etc.
		 ✅ Crawl documentation: Use mcp__recflux__web_crawler on HeroUI docs URLs
		
		2️⃣ SECOND: Check Library (ONLY if HeroUI doesn't have it)
		 ✅ Available component? → Use it with variants and props
		 ✅ Need styling? → Add Tailwind classes to className
		 ✅ Examples: Components not available in HeroUI
		
		3️⃣ THIRD: Framework + Tailwind Combination
		 ✅ Use HeroUI or component as base structure
		 ✅ Apply Tailwind classes for spacing, colors, responsive design
		 ✅ Example: <Button className="w-full mt-4" color="primary" variant="bordered">Text</Button>
		
		4️⃣ FOURTH: Custom Component (ONLY if neither framework has it)
		 ✅ Create custom component using ONLY Tailwind utilities
		 ✅ NO custom CSS classes, NO inline styles
		 ✅ Example: Custom loading spinner using Tailwind animations
		
		❌ NEVER: Create custom versions of existing HeroUI components
		❌ NEVER: Use when HeroUI has the equivalent component
		❌ NEVER: Use other UI libraries when HeroUI or has the component
		❌ NEVER: Write custom CSS when Tailwind utilities can achieve it
		
		🚨 BEFORE CREATING ANY COMPONENT: Ask yourself "Does HeroUI have this?" THEN "Does have this?" 🚨

		FLUXO DE TRABALHO:
		⚠️ COMPONENT REMINDER: Use existing NavBar and CTAButton with configs only ⚠️
		0) ANÁLISE COMPLETA DE INSPIRAÇÃO DE DESIGN - UMA ÚNICA CHAMADA PARA TOOL AUTOMATIZADO:
		 
		 OBRIGATÓRIO: Use APENAS mcp__recflux__design_inspiration_analyzer com o tema do projeto
		 - O tool AUTOMATICAMENTE seleciona exatamente 3 sites seguindo a fórmula obrigatória
		 - NUNCA chame múltiplos tools ou tente selecionar sites manualmente
		 - O analisador retorna TUDO: paletas, layouts, screenshots, insights consolidados
		 
		 DETALHAMENTO TÉCNICO (para compreensão do processo automatizado):
		 a) IDENTIFICAÇÃO DE SITES DE INSPIRAÇÃO: Identifique 2-4 sites de referência relevantes ao tema solicitado
		 ESTRATÉGIA DE SELEÇÃO:
		 1. SITES DIRETOS DE REFERÊNCIA (use 1-2 destes baseado no tema):
		 - https://huly.io/ (moderno, minimalista, tech-focused)
		 - https://linear.app/ (clean design, productivity tools)
		 - https://stripe.com/ (financial services, professional)
		 - https://figma.com/ (creative tools, collaborative design)
		 - https://notion.so/ (productivity, workspace tools)
		 - https://vercel.com/ (developer tools, modern tech)
		 
		 2. GALERIAS DE INSPIRAÇÃO VISUAL (escolha 1-2 baseado no tipo de projeto):
		 LANDING PAGES:
		 - https://land-book.com/ (landing page showcase)
		 - https://www.lapa.ninja/ (landing page inspiration)
		 - https://onepagelove.com/ (one page designs)
		 - https://www.landingfolio.com/ (landing page gallery)
		 - https://saaslandingpage.com/ (SaaS-focused)
		 - https://www.landing.love/ (modern landing pages)
		 
		 GENERAL WEB DESIGN:
		 - https://www.awwwards.com/ (award-winning sites)
		 - https://www.siteinspire.com/ (curated web design)
		 - https://httpster.net/ (totally rocking websites)
		 - https://godly.website/ (modern web design)
		 - https://www.cssdesignawards.com/ (CSS design awards)
		 - https://mindsparklemag.com/category/website/ (web design inspiration)
		 
		 UI/UX VISUAL GALLERIES:
		 - https://dribbble.com/ (design community)
		 - https://mobbin.com/ (mobile design patterns)
		 - https://component.gallery/ (design system components)
		 
		 CREATIVE & NICHE:
		 - https://www.behance.net/ (creative portfolios)
		 - https://muz.li/ (design inspiration)
		 - https://www.pinterest.com/ (visual discovery)
		 - https://saaspo.com/ (SaaS design showcase)
		 - https://gameuidatabase.com/ (game UI database)
		 - https://designfuell.com/ (design inspiration)
		 - https://visuelle.co.uk/ (visual design)
		 - https://maxibestof.one/ (best web designs)
		 
		 3. RECURSOS TEÓRICOS DE DESIGN (para princípios e melhores práticas):
		 UX/UI THEORY & BEST PRACTICES:
		 - https://goodux.appcues.com/categories (UX pattern theory and explanations)
		 - https://ui-patterns.com/patterns (UI pattern library with theory)
		 - https://goodui.org/ (evidence-based UI best practices)
		 
		 COMO USAR OS RECURSOS TEÓRICOS:
		 - Crawle estes sites para extrair PRINCÍPIOS e GUIDELINES
		 - Use as teorias para VALIDAR escolhas de design
		 - Aplique os padrões teóricos para OTIMIZAR usabilidade
		 - Combine teoria com inspiração visual para máxima efetividade
		 
		 4. SELEÇÃO INTELIGENTE AUTOMÁTICA: Com base no tema do projeto, escolha automaticamente:
		 FÓRMULA: 1 Site Direto +1 Galeria Visual +1 Recurso Teórico +(1-2 adicionais opcionais)
		 
		 TECH/SaaS/STARTUP → 
		 • https://huly.io/ (site direto) 
		 • https://land-book.com/ (galeria visual)
		 • https://goodui.org/ (teoria UX)
		 • https://www.awwwards.com/ (adicional)
		 
		 E-COMMERCE/BUSINESS → 
		 • https://stripe.com/ (site direto)
		 • https://www.landingfolio.com/ (galeria visual)
		 • https://goodux.appcues.com/categories (teoria UX)
		 • https://godly.website/ (adicional)
		 
		 CREATIVE/PORTFOLIO → 
		 • https://www.behance.net/ (galeria visual)
		 • https://dribbble.com/ (galeria visual)
		 • https://ui-patterns.com/patterns (teoria UI)
		 • https://httpster.net/ (adicional)
		 
		 LANDING PAGE/MARKETING → 
		 • https://onepagelove.com/ (galeria visual)
		 • https://www.lapa.ninja/ (galeria visual)
		 • https://goodux.appcues.com/categories (teoria UX)
		 • https://saaslandingpage.com/ (adicional)
		 
		 UI/UX FOCUSED → 
		 • https://mobbin.com/ (galeria visual)
		 • https://component.gallery/ (galeria visual)
		 • https://ui-patterns.com/patterns (teoria UI)
		 • https://goodui.org/ (teoria adicional)
		 
		 GAMING/ENTERTAINMENT → 
		 • https://gameuidatabase.com/ (galeria visual)
		 • https://www.awwwards.com/ (galeria visual)
		 • https://goodui.org/ (teoria UI)
		 • https://designfuell.com/ (adicional)
		 
		 GENERAL/OTHER → 
		 • https://www.siteinspire.com/ (galeria visual)
		 • https://land-book.com/ (galeria visual)
		 • https://goodui.org/ (teoria UI)
		 • Adicional baseado em contexto específico
		 
		 b) ANÁLISE HÍBRIDA: CRAWLING +VISUAL ANALYSIS - Execute ambas as estratégias:
		 
		 ESTRATÉGIA 1 - CRAWLING TEXTUAL ESPECIALIZADO:
		 Para cada tipo de site selecionado, use mcp__recflux__web_crawler com configuração específica:
		 
		 SITES DIRETOS DE REFERÊNCIA (huly.io, stripe.com, figma.com):
		 - maxPages=6, deepCrawl=true, deepCrawlStrategy='bfs'
		 - extractionQuery="Extract layout structures, color schemes, typography choices, component designs, spacing patterns, navigation styles, and visual hierarchy from this specific website"
		 - Foco: Estrutura específica e implementação real
		 
		 GALERIAS VISUAIS (awwwards, dribbble, land-book):
		 - maxPages=8, deepCrawl=true, deepCrawlStrategy='bfs'
		 - extractionQuery="Extract trending design elements, color palettes, typography trends, layout innovations, and visual styles from featured designs"
		 - Foco: Tendências visuais e estilos contemporâneos
		 
		 RECURSOS TEÓRICOS (goodui.org, ui-patterns.com, goodux.appcues.com):
		 - maxPages=10, deepCrawl=true, deepCrawlStrategy='dfs' (mais profundo para teoria)
		 - extractionQuery="Extract UX/UI principles, design guidelines, best practices, usability patterns, evidence-based recommendations, accessibility guidelines, and conversion optimization techniques"
		 - Foco: Princípios, teorias e melhores práticas fundamentais
		 
		 PROCESSAMENTO DIFERENCIADO:
		 - VISUAIS: Extrair exemplos e estilos para replicação
		 - TEÓRICOS: Extrair regras e princípios para validação
		 - DIRETOS: Extrair especificações técnicas para implementação
		 
		 ESTRATÉGIA 2 - ANÁLISE VISUAL DELEGADA COM SCREENSHOT E DOWNLOAD:
		 Para os 2-3 sites principais de inspiração:
		 
		 1. CAPTURA DE SCREENSHOTS E IMAGENS AUTOMATIZADA:
		 a) SITES DIRETOS: Para cada URL de inspiração direta (huly.io, stripe.com), use Puppeteer para capturar:
		 - Screenshot completo (full-page screenshot)
		 - Screenshot da viewport principal (above-the-fold)
		 - Screenshots de seções específicas (header, hero, features, footer)
		 
		 b) GALERIAS VISUAIS: Para galleries (awwwards.com, dribbble.com, land-book.com), execute:
		 PASSO 1 - NAVEGAÇÃO E SCREENSHOT DA GALERIA:
		 - Screenshot da página principal da galeria
		 - Navegue pelas páginas de showcase/featured designs
		 - Capture screenshots de múltiplos designs em destaque
		 
		 PASSO 2 - EXTRAÇÃO DE IMAGENS DOS DESIGNS:
		 - Use web crawler para identificar URLs de imagens dos designs
		 - Download direto das imagens de preview dos projetos
		 - Foco em imagens de alta resolução quando disponível
		 - Organize por tema/categoria quando possível
		 
		 PASSO 3 - SCREENSHOTS DE PROJETOS INDIVIDUAIS:
		 - Acesse 3-5 projetos em destaque relacionados ao tema
		 - Capture screenshots completos de cada projeto individual
		 - Documente URLs dos projetos originais para referência
		 
		 c) Salve screenshots e imagens temporariamente no diretório do projeto
		 d) Organize arquivos por categoria: direct-sites/, gallery-screenshots/, gallery-images/
		 
		 2. DELEGAÇÃO PARA MODELO VISUAL - GEMINI 2.0 FLASH:
		 IMPLEMENTAÇÃO ATUAL (FALLBACK): 
		 - Use análise textual detalhada +CSS inspection via web crawler
		 - Extraia informações de design através de selectors CSS específicos
		 - Analise computed styles e element properties
		 
		 IMPLEMENTAÇÃO PRINCIPAL - GEMINI 2.5 FLASH (OPENROUTER): 
		 - Integração com google/gemini-2.5-flash via OpenRouter API
		 - Custo-benefício otimizado para análise de screenshots em massa
		 - Capacidade nativa de visão para extração precisa de design elements
		 - FERRAMENTA DISPONÍVEL: Use mcp__recflux__gemini_vision_analyzer
		 - Ver especificação completa em src/visual-analysis-tool.ts e src/vision-analyzer.ts
		 
		 CONFIGURAÇÃO GEMINI OPENROUTER:
		 a) API Endpoint: https://openrouter.ai/api/v1/chat/completions
		 b) Model: "google/gemini-2.5-flash"
		 c) Headers: Authorization: Bearer OPENROUTER_API_KEY
		 d) Payload: messages com image_url para screenshots base64
		 
		 IMPLEMENTAÇÃO HÍBRIDA ATIVA:
		 a) Use mcp__recflux__design_inspiration_analyzer com o tema do projeto
		 b) O analisador AUTOMATICAMENTE FORÇA a fórmula "1 Site Direto +1 Galeria Visual +1 Recurso Teórico":
		 - GARANTE EXATAMENTE 3 sites selecionados (nunca mais, nunca menos)
		 - Seleciona 1 site direto da lista exclusiva (huly.io, stripe.com, figma.com, etc.)
		 - Seleciona 1 galeria visual da lista exclusiva (awwwards, dribbble, land-book, etc.)
		 - Seleciona 1 recurso teórico da lista exclusiva (goodui.org, ui-patterns.com, etc.)
		 - Executa web crawling para dados estruturais (HTML/CSS) nos 3 sites
		 - Captura screenshots dos sites selecionados (sites diretos +galerias)
		 - Download de imagens de design das galerias (awwwards, dribbble, land-book)
		 - Navega em projetos individuais das galerias para captura detalhada
		 - Analisa screenshots usando Gemini 2.5 Flash via OpenRouter
		 - Consolida insights textuais +visuais +imagens de referência
		 - Retorna paletas de cores, padrões de layout e especificações técnicas
		 c) Use os dados consolidados para:
		 - Informar geração de paleta de cores (step 2c)
		 - Criar componentes baseados nos padrões identificados
		 - Aplicar estilos visuais extraídos dos screenshots
		 - Usar imagens baixadas das galerias como referência visual direta
		 - Identificar layouts específicos dos projetos capturados
		 - Replicar elementos de design únicos encontrados nas galerias
		 c) Use o seguinte prompt estruturado:
		 "ANÁLISE VISUAL DE DESIGN - WEBSITE INSPIRATION
		 
		 Analise esta imagem de website e forneça uma análise técnica detalhada para replicação:
		 
		 1. LAYOUT & ESTRUTURA:
		 - Grid system usado (12-col, flexbox, css grid)
		 - Spacing patterns (margins, paddings em rem/px)
		 - Section arrangements (header height, content width, etc.)
		 
		 2. CORES ESPECÍFICAS:
		 - Identifique cores exatas (forneça hex codes aproximados)
		 - Gradients observados (direction, colors, stops)
		 - Color usage patterns (text, backgrounds, accents)
		 
		 3. TIPOGRAFIA TÉCNICA:
		 - Font families aparentes (serif, sans-serif, mono)
		 - Font weights observados (300, 400, 600, 700)
		 - Text sizes (aproxime em Tailwind scale: text-sm, text-lg, etc.)
		 - Line heights e letter spacing
		 
		 4. COMPONENTES REPLICÁVEIS:
		 - Button styles (rounded, shadows, hover states)
		 - Card designs (borders, shadows, spacing)
		 - Navigation patterns (sticky, transparent, etc.)
		 - Form elements styling
		 
		 5. IMPLEMENTAÇÃO TAILWIND CSS:
		 - Classes específicas do Tailwind para replicar o layout
		 - Componentes customizados baseados na inspiração
		 - Custom CSS necessário (se houver)
		 - Responsive breakpoints observados
		 
		 6. ELEMENTOS ÚNICOS:
		 - Animações ou micro-interactions visíveis
		 - Patterns decorativos ou elementos gráficos
		 - Innovative solutions que se destacam
		 
		 Forneça uma descrição técnica precisa que permita replicar este design usando React + Tailwind CSS."
		 
		 3. PROCESSAMENTO DOS RESULTADOS VISUAIS:
		 a) Colete todas as análises visuais dos screenshots
		 b) Extraia dados estruturados (cores, spacing, components)
		 c) Crie uma "style guide" consolidada baseada nas análises
		 d) Identifique padrões comuns entre os sites analisados
		 
		 4. CONSOLIDAÇÃO HÍBRIDA:
		 a) Combine dados textuais do web crawler
		 b) Integre insights visuais do modelo vision-capable
		 c) Crie um "design brief" unificado com:
		 - Paleta de cores extraída (hex codes específicos)
		 - Tipografia recommendations (font families +sizes)
		 - Layout patterns para implementar
		 - Component specifications (buttons, cards, etc.)
		 - Animation/interaction guidelines
		 c) ANÁLISE DETALHADA CATEGORIZADA: Para cada tipo de site crawlado, extraia e documente:
		 
		 SITES VISUAIS (diretos +galerias) - ASPECTOS VISUAIS:
		 - Paletas de cores dominantes (primária, secundária, accent, gradients)
		 - Tipografia (font families, sizes, weights, line-heights, font pairings)
		 - Espaçamento e grid systems (margins, paddings, containers, breakpoints)
		 - Estilo visual geral (minimalista, bold, colorful, monochrome, etc.)
		 - Estrutura de layout (header, hero, sections, footer arrangements)
		 - Padrões de navegação (header styles, menu types, mobile navigation)
		 - Componentes únicos (cards, buttons, forms, modals, testimonials)
		 - Call-to-Action patterns (placement, styling, messaging)
		 - Animações e interações (hover effects, transitions, micro-interactions)
		 
		 RECURSOS TEÓRICOS - PRINCÍPIOS E GUIDELINES:
		 - USABILIDADE: Heurísticas de Nielsen, princípios de acessibilidade
		 - UX PATTERNS: Padrões de navegação, fluxos de usuário otimizados
		 - UI GUIDELINES: Hierarquia visual, contraste, legibilidade
		 - CONVERSÃO: Técnicas para otimizar CTAs e formulários
		 - PSICOLOGIA: Princípios de design persuasivo e behavioral design
		 - RESPONSIVIDADE: Best practices para mobile-first design
		 - PERFORMANCE: Guidelines para loading e feedback visual
		 - ACESSIBILIDADE: WCAG guidelines e inclusive design
		 
		 CONSOLIDAÇÃO TEORIA +VISUAL:
		 - Aplique princípios teóricos para VALIDAR escolhas visuais
		 - Use guidelines para OTIMIZAR layouts observados
		 - Combine estética visual com usabilidade comprovada
		 - Priorize soluções que atendem tanto apelo visual quanto eficácia UX
		 d) SÍNTESE DE INSPIRAÇÃO: Combine os melhores elementos de cada site analisado
		 e) APLICAÇÃO ESTRATÉGICA: Use os insights coletados para influenciar:
		 - Escolha de cores base para a paleta (step 2c)
		 - Criação de componentes customizados que repliquem os padrões identificados
		 - Estrutura e layout do site final baseado nos designs analisados
		 - Prompts para geração de imagens contextuais
		 REGRAS CRÍTICAS:
		 - SEMPRE use mcp__recflux__design_inspiration_analyzer antes de começar o design
		 - NÃO pule esta etapa - é essencial para criar designs únicos e profissionais
		 - Use os dados consolidados para informar TODAS as decisões de design subsequentes
		 - O analisador automaticamente seleciona, captura e analisa sites de inspiração baseado no tema
		🚫🚫🚫 REMINDER BEFORE WORKFLOW: DO NOT EDIT NAVBAR.JSX OR CTABUTTON.JSX 🚫🚫🚫
		
		1) read_file em src/App.jsx e src/index.css
		 🚨 CRITICAL: If you see NavBar import, DO NOT modify the NavBar component file! 🚨
		 🚨 CRITICAL: If you see CTAButton import, DO NOT modify the CTAButton component file! 🚨
		 🌍 LANGUAGE CHECK: Detect user's language from their messages and prepare to generate content in that language 🌍
		
		2) GERAÇÃO DE PALETA DE CORES TEMÁTICA AVANÇADA COM INSPIRAÇÃO - Execute estes passos:
		 a) ANÁLISE DETALHADA DO TEMA: Identifique o tema específico e subtema (ex: gaming→RPG, business→fintech, food→italian)
		 b) EXTRAÇÃO DE CORES DOS SITES DE INSPIRAÇÃO: Com base na análise híbrida do step 5, identifique:
		 DADOS DO CRAWLING TEXTUAL:
		 - Cores dominantes encontradas nos sites crawlados (text-based analysis)
		 - Combinações de cores mencionadas em descriptions/CSS
		 - Paletas que se destacaram na análise textual
		 
		 DADOS DA ANÁLISE VISUAL (PRIORITÁRIO):
		 - Hex codes específicos extraídos pelo modelo visual das screenshots
		 - Gradientes observados com colors/directions exatos
		 - Patterns de uso de cor (backgrounds, texto, accents) identificados visualmente
		 - Color relationships precisos (complementary, analogous, triadic)
		 c) SELEÇÃO ESTRATÉGICA DE CORES HÍBRIDA: Use dados do design_inspiration_analyzer:
		 - Cores primárias, secundárias e de destaque consolidadas da análise visual
		 - 1 cor complementar baseada na psicologia das cores para o tema
		 - Gradientes específicos identificados nos sites de inspiração (se aplicável)
		 - Paletas de cores extraídas diretamente dos screenshots analisados pelo Gemini
		 
		 TEMAS E CORES OTIMIZADAS (como fallback):
		 - Gaming/Esports: Base=#8b5cf6 (roxo vibrante) +#06d6a0 (verde neon) para energia e competição
		 - Tech/SaaS: Base=#3b82f6 (azul confiança) +#1e293b (cinza profissional) para credibilidade
		 - Finance/Banking: Base=#1e40af (azul escuro) +#065f46 (verde escuro) para segurança e crescimento
		 - Food/Restaurant: Base=#dc2626 (vermelho apetite) +#f59e0b (dourado) para calor e apetite 
		 - Health/Medical: Base=#059669 (verde saúde) +#0ea5e9 (azul confiança) para bem-estar
		 - Fashion/Beauty: Base=#ec4899 (rosa elegante) +#581c87 (roxo luxo) para sofisticação
		 - Travel/Tourism: Base=#0ea5e9 (azul céu) +#f59e0b (dourado sol) para aventura
		 - Education: Base=#3b82f6 (azul conhecimento) +#059669 (verde crescimento) para aprendizado
		 - Real Estate: Base=#1e40af (azul confiança) +#92400e (marrom terra) para solidez
		 - Creative/Agency: Base=#8b5cf6 (roxo criativo) +#ec4899 (rosa inovação) para originalidade
		 - E-commerce: Base=#dc2626 (vermelho urgência) +#1e40af (azul confiança) para conversão
		 
		 d) GERAÇÃO INTELIGENTE COM INSPIRAÇÃO VISUAL: Use mcp__recflux__color_palette_generator com:
		 - mode='transformer' (para harmonia inteligente)
		 - temperature=0.8 (reduzido para manter fidelidade às cores extraídas visualmente)
		 - numColors=5 (para mais opções, incluindo gradients)
		 - baseColors=[hex_codes_exatos_dos_screenshots +cor_psicológica_temática]
		 EXEMPLO: baseColors=["#1a1a2e", "#16213e", "#e94560"] (cores de huly.io via análise visual)
		 e) VALIDAÇÃO DA INSPIRAÇÃO VISUAL: 
		 - Compare paleta gerada com hex codes extraídos pelos screenshots
		 - Confirme que as cores principais dos sites de inspiração estão representadas
		 - Ajuste se necessário para manter fidelidade visual à inspiração
		3) Implemente a UI no src/App.jsx com componentes customizados, aplicando as cores da paleta gerada
		 
		 🚫🚫🚫 CRITICAL WARNING: DO NOT EDIT EXISTING NAVBAR OR CTABUTTON COMPONENTS 🚫🚫🚫
		 ❌ FORBIDDEN: Modifying template/src/components/NavBar.jsx
		 ❌ FORBIDDEN: Modifying template/src/components/CTAButton.jsx
		 ✅ ONLY ALLOWED: Use with configuration objects and props
		 
		 🌟🌟🌟 CTABUTTON MANDATORY USAGE - HERO SECTIONS ONLY 🌟🌟🌟
		 ✅ REQUIRED: Use CTAButton ONLY in hero/landing sections for primary call-to-action
		 ✅ REQUIRED: Import: import CTAButton from './components/CTAButton'
		 ✅ REQUIRED: Configure with props: text, href, glowingColor
		 ✅ REQUIRED: Match glowingColor to your color palette (hex format)
		 ❌ FORBIDDEN: Using CTAButton in navigation, forms, or secondary buttons
		 ❌ FORBIDDEN: Creating custom CTA buttons when CTAButton exists
		 
		 📋 CTABUTTON CORRECT USAGE:
		 ✅ GOOD: <CTAButton text="Get Started" href="#signup" glowingColor="#3b82f6" />
		 ✅ GOOD: <CTAButton text="Try Now" href="#demo" glowingColor={primaryColor} />
		 ✅ GOOD: Hero section primary action → Use CTAButton
		 ❌ BAD: Secondary buttons → Use HeroUI Button instead
		 ❌ BAD: Navigation buttons → Use HeroUI Button instead
		 
		 🌍 LANGUAGE IMPLEMENTATION: Generate ALL UI text in user's detected language 🌍
		 - Titles, headings, and content in user's language
		 - Button text, form labels, placeholders in user's language 
		 - Navigation items in user's language
		 - Meta descriptions and alt text in user's language
		 
		 REGRAS CRÍTICAS PARA COMPONENTES CUSTOMIZADOS:
		 🚨 HEROUI FIRST: Check HeroUI library FIRST before creating ANY component 🚨
		 🚨 SECOND: Check library ONLY if HeroUI doesn't have it 🚨
		 🚨 TAILWIND THIRD: Use ONLY Tailwind utility classes for styling 🚨
		 
		 📋 COMPONENT CREATION CHECKLIST:
		 1️⃣ Need a button? → Check HeroUI Button first, then Button
		 2️⃣ Need a form? → Check HeroUI Input/Select first, then components
		 3️⃣ Need a card? → Check HeroUI Card first, then Card
		 4️⃣ Need a modal? → Check HeroUI Modal first, then Dialog
		 5️⃣ Need a table? → Check HeroUI Table first, then Table
		 6️⃣ Need avatar/badge? → Use HeroUI Avatar/Badge (not available in )
		 7️⃣ Custom styling? → Add Tailwind classes to HeroUI/ components
		 8️⃣ Unsure about usage? → Crawl HeroUI documentation with mcp__recflux__web_crawler
		 
		 - TODO botão deve usar HeroUI Button com variantes (solid, bordered, light, flat, faded, shadow, ghost)
		 - Use HeroUI components first, then + Tailwind classes para estilos específicos
		 - Aplique cores de texto que contrastem adequadamente com os fundos
		 - Implemente hover states via HeroUI/ variants + Tailwind transitions
		 ❌ NO custom components when HeroUI or exists - CHECK HEROUI FIRST ❌
		 ❌ NO custom CSS, NO inline styles, NO other frameworks ❌
		4) ANÁLISE E CRIAÇÃO DE COMPONENTES CUSTOMIZADOS:
		 🚨 WARNING: When creating components, NEVER modify existing NavBar.jsx or CTAButton.jsx 🚨
		 🚨 CRITICAL: Check HeroUI library FIRST before creating ANY new component 🚨
		 🚨 SECONDARY: Check library ONLY if HeroUI doesn't have it 🚨
		 
		 a) Com base nas análises de inspiração, identifique os padrões de componentes necessários
		 📋 MANDATORY CHECK: For EACH component needed, verify if HeroUI has it available FIRST
		 📋 SECONDARY CHECK: If HeroUI doesn't have it, check availability
		 b) Crie componentes customizados que repliquem fielmente os designs analisados
		 🚨 HEROUI FIRST: Use HeroUI components as base, then style with Tailwind 🚨
		 🚨 SECOND: Use components only if HeroUI doesn't have it 🚨
		 c) Organize componentes por categoria: Layout, Navigation, Data Display, Forms, Interactive, etc.
		 📚 Use HeroUI categories first: Forms, Layout, Navigation, Data Display, Feedback, Overlays
		 📚 Use categories as backup: Forms, Layout, Navigation, Data Display, Feedback, Overlays
		 d) Implemente componentes responsivos usando HeroUI + Tailwind CSS
		 🚨 TRIPLE FRAMEWORK: HeroUI first → backup → Tailwind styling 🚨
		 🚨 TAILWIND REMINDER: Use ONLY utility classes - NO custom CSS files 🚨
		 e) Crie arquivos organizados nas pastas components/, hooks/, e utils/ baseado nos padrões identificados
		 ❌ NO CSS files in components/ folder - HeroUI + Tailwind utilities only ❌
		 ✅ Import HeroUI: import { Button, Card, Input } from '@heroui/react' ✅
		 ✅ Import (if needed): import { Button, Card, Input } from '@/components/ui' ✅
		5) ANÁLISE COMPLETA DE INSPIRAÇÃO DE DESIGN - Execute estes passos OBRIGATORIAMENTE:
		 a) IDENTIFICAÇÃO DE SITES DE INSPIRAÇÃO: Identifique 2-4 sites de referência relevantes ao tema solicitado
		 ESTRATÉGIA DE SELEÇÃO:
		 1. SITES DIRETOS DE REFERÊNCIA (use 1-2 destes baseado no tema):
		 - https://huly.io/ (moderno, minimalista, tech-focused)
		 - https://linear.app/ (clean design, productivity tools)
		 - https://stripe.com/ (financial services, professional)
		 - https://figma.com/ (creative tools, collaborative design)
		 - https://notion.so/ (productivity, workspace tools)
		 - https://vercel.com/ (developer tools, modern tech)
		 
		 2. GALERIAS DE INSPIRAÇÃO VISUAL (escolha 1-2 baseado no tipo de projeto):
		 LANDING PAGES:
		 - https://land-book.com/ (landing page showcase)
		 - https://www.lapa.ninja/ (landing page inspiration)
		 - https://onepagelove.com/ (one page designs)
		 - https://www.landingfolio.com/ (landing page gallery)
		 - https://saaslandingpage.com/ (SaaS-focused)
		 - https://www.landing.love/ (modern landing pages)
		 
		 GENERAL WEB DESIGN:
		 - https://www.awwwards.com/ (award-winning sites)
		 - https://www.siteinspire.com/ (curated web design)
		 - https://httpster.net/ (totally rocking websites)
		 - https://godly.website/ (modern web design)
		 - https://www.cssdesignawards.com/ (CSS design awards)
		 - https://mindsparklemag.com/category/website/ (web design inspiration)
		 
		 UI/UX VISUAL GALLERIES:
		 - https://dribbble.com/ (design community)
		 - https://mobbin.com/ (mobile design patterns)
		 - https://component.gallery/ (design system components)
		 
		 CREATIVE & NICHE:
		 - https://www.behance.net/ (creative portfolios)
		 - https://muz.li/ (design inspiration)
		 - https://www.pinterest.com/ (visual discovery)
		 - https://saaspo.com/ (SaaS design showcase)
		 - https://gameuidatabase.com/ (game UI database)
		 - https://designfuell.com/ (design inspiration)
		 - https://visuelle.co.uk/ (visual design)
		 - https://maxibestof.one/ (best web designs)
		 
		 3. RECURSOS TEÓRICOS DE DESIGN (para princípios e melhores práticas):
		 UX/UI THEORY & BEST PRACTICES:
		 - https://goodux.appcues.com/categories (UX pattern theory and explanations)
		 - https://ui-patterns.com/patterns (UI pattern library with theory)
		 - https://goodui.org/ (evidence-based UI best practices)
		 
		 COMO USAR OS RECURSOS TEÓRICOS:
		 - Crawle estes sites para extrair PRINCÍPIOS e GUIDELINES
		 - Use as teorias para VALIDAR escolhas de design
		 - Aplique os padrões teóricos para OTIMIZAR usabilidade
		 - Combine teoria com inspiração visual para máxima efetividade
		 
		 4. SELEÇÃO INTELIGENTE AUTOMÁTICA: Com base no tema do projeto, escolha automaticamente:
		 FÓRMULA: 1 Site Direto +1 Galeria Visual +1 Recurso Teórico +(1-2 adicionais opcionais)
		 
		 TECH/SaaS/STARTUP → 
		 • https://huly.io/ (site direto) 
		 • https://land-book.com/ (galeria visual)
		 • https://goodui.org/ (teoria UX)
		 • https://www.awwwards.com/ (adicional)
		 
		 E-COMMERCE/BUSINESS → 
		 • https://stripe.com/ (site direto)
		 • https://www.landingfolio.com/ (galeria visual)
		 • https://goodux.appcues.com/categories (teoria UX)
		 • https://godly.website/ (adicional)
		 
		 CREATIVE/PORTFOLIO → 
		 • https://www.behance.net/ (galeria visual)
		 • https://dribbble.com/ (galeria visual)
		 • https://ui-patterns.com/patterns (teoria UI)
		 • https://httpster.net/ (adicional)
		 
		 LANDING PAGE/MARKETING → 
		 • https://onepagelove.com/ (galeria visual)
		 • https://www.lapa.ninja/ (galeria visual)
		 • https://goodux.appcues.com/categories (teoria UX)
		 • https://saaslandingpage.com/ (adicional)
		 
		 UI/UX FOCUSED → 
		 • https://mobbin.com/ (galeria visual)
		 • https://component.gallery/ (galeria visual)
		 • https://ui-patterns.com/patterns (teoria UI)
		 • https://goodui.org/ (teoria adicional)
		 
		 GAMING/ENTERTAINMENT → 
		 • https://gameuidatabase.com/ (galeria visual)
		 • https://www.awwwards.com/ (galeria visual)
		 • https://goodui.org/ (teoria UI)
		 • https://designfuell.com/ (adicional)
		 
		 GENERAL/OTHER → 
		 • https://www.siteinspire.com/ (galeria visual)
		 • https://land-book.com/ (galeria visual)
		 • https://goodui.org/ (teoria UI)
		 • Adicional baseado em contexto específico
		 
		 b) ANÁLISE HÍBRIDA: CRAWLING +VISUAL ANALYSIS - Execute ambas as estratégias:
		 
		 ESTRATÉGIA 1 - CRAWLING TEXTUAL ESPECIALIZADO:
		 Para cada tipo de site selecionado, use mcp__recflux__web_crawler com configuração específica:
		 
		 SITES DIRETOS DE REFERÊNCIA (huly.io, stripe.com, figma.com):
		 - maxPages=6, deepCrawl=true, deepCrawlStrategy='bfs'
		 - extractionQuery="Extract layout structures, color schemes, typography choices, component designs, spacing patterns, navigation styles, and visual hierarchy from this specific website"
		 - Foco: Estrutura específica e implementação real
		 
		 GALERIAS VISUAIS (awwwards, dribbble, land-book):
		 - maxPages=8, deepCrawl=true, deepCrawlStrategy='bfs'
		 - extractionQuery="Extract trending design elements, color palettes, typography trends, layout innovations, and visual styles from featured designs"
		 - Foco: Tendências visuais e estilos contemporâneos
		 
		 RECURSOS TEÓRICOS (goodui.org, ui-patterns.com, goodux.appcues.com):
		 - maxPages=10, deepCrawl=true, deepCrawlStrategy='dfs' (mais profundo para teoria)
		 - extractionQuery="Extract UX/UI principles, design guidelines, best practices, usability patterns, evidence-based recommendations, accessibility guidelines, and conversion optimization techniques"
		 - Foco: Princípios, teorias e melhores práticas fundamentais
		 
		 PROCESSAMENTO DIFERENCIADO:
		 - VISUAIS: Extrair exemplos e estilos para replicação
		 - TEÓRICOS: Extrair regras e princípios para validação
		 - DIRETOS: Extrair especificações técnicas para implementação
		 
		 ESTRATÉGIA 2 - ANÁLISE VISUAL DELEGADA COM SCREENSHOT E DOWNLOAD:
		 Para os 2-3 sites principais de inspiração:
		 
		 1. CAPTURA DE SCREENSHOTS E IMAGENS AUTOMATIZADA:
		 a) SITES DIRETOS: Para cada URL de inspiração direta (huly.io, stripe.com), use Puppeteer para capturar:
		 - Screenshot completo (full-page screenshot)
		 - Screenshot da viewport principal (above-the-fold)
		 - Screenshots de seções específicas (header, hero, features, footer)
		 
		 b) GALERIAS VISUAIS: Para galleries (awwwards.com, dribbble.com, land-book.com), execute:
		 PASSO 1 - NAVEGAÇÃO E SCREENSHOT DA GALERIA:
		 - Screenshot da página principal da galeria
		 - Navegue pelas páginas de showcase/featured designs
		 - Capture screenshots de múltiplos designs em destaque
		 
		 PASSO 2 - EXTRAÇÃO DE IMAGENS DOS DESIGNS:
		 - Use web crawler para identificar URLs de imagens dos designs
		 - Download direto das imagens de preview dos projetos
		 - Foco em imagens de alta resolução quando disponível
		 - Organize por tema/categoria quando possível
		 
		 PASSO 3 - SCREENSHOTS DE PROJETOS INDIVIDUAIS:
		 - Acesse 3-5 projetos em destaque relacionados ao tema
		 - Capture screenshots completos de cada projeto individual
		 - Documente URLs dos projetos originais para referência
		 
		 c) Salve screenshots e imagens temporariamente no diretório do projeto
		 d) Organize arquivos por categoria: direct-sites/, gallery-screenshots/, gallery-images/
		 
		 2. DELEGAÇÃO PARA MODELO VISUAL - GEMINI 2.0 FLASH:
		 IMPLEMENTAÇÃO ATUAL (FALLBACK): 
		 - Use análise textual detalhada +CSS inspection via web crawler
		 - Extraia informações de design através de selectors CSS específicos
		 - Analise computed styles e element properties
		 
		 IMPLEMENTAÇÃO PRINCIPAL - GEMINI 2.5 FLASH (OPENROUTER): 
		 - Integração com google/gemini-2.5-flash via OpenRouter API
		 - Custo-benefício otimizado para análise de screenshots em massa
		 - Capacidade nativa de visão para extração precisa de design elements
		 - FERRAMENTA DISPONÍVEL: Use mcp__recflux__gemini_vision_analyzer
		 - Ver especificação completa em src/visual-analysis-tool.ts e src/vision-analyzer.ts
		 
		 CONFIGURAÇÃO GEMINI OPENROUTER:
		 a) API Endpoint: https://openrouter.ai/api/v1/chat/completions
		 b) Model: "google/gemini-2.5-flash"
		 c) Headers: Authorization: Bearer OPENROUTER_API_KEY
		 d) Payload: messages com image_url para screenshots base64
		 
		 IMPLEMENTAÇÃO HÍBRIDA ATIVA:
		 a) Use mcp__recflux__design_inspiration_analyzer com o tema do projeto
		 b) O analisador AUTOMATICAMENTE FORÇA a fórmula "1 Site Direto +1 Galeria Visual +1 Recurso Teórico":
		 - GARANTE EXATAMENTE 3 sites selecionados (nunca mais, nunca menos)
		 - Seleciona 1 site direto da lista exclusiva (huly.io, stripe.com, figma.com, etc.)
		 - Seleciona 1 galeria visual da lista exclusiva (awwwards, dribbble, land-book, etc.)
		 - Seleciona 1 recurso teórico da lista exclusiva (goodui.org, ui-patterns.com, etc.)
		 - Executa web crawling para dados estruturais (HTML/CSS) nos 3 sites
		 - Captura screenshots dos sites selecionados (sites diretos +galerias)
		 - Download de imagens de design das galerias (awwwards, dribbble, land-book)
		 - Navega em projetos individuais das galerias para captura detalhada
		 - Analisa screenshots usando Gemini 2.5 Flash via OpenRouter
		 - Consolida insights textuais +visuais +imagens de referência
		 - Retorna paletas de cores, padrões de layout e especificações técnicas
		 c) Use os dados consolidados para:
		 - Informar geração de paleta de cores (step 2c)
		 - Criar componentes baseados nos padrões identificados
		 - Aplicar estilos visuais extraídos dos screenshots
		 - Usar imagens baixadas das galerias como referência visual direta
		 - Identificar layouts específicos dos projetos capturados
		 - Replicar elementos de design únicos encontrados nas galerias
		 c) Use o seguinte prompt estruturado:
		 "ANÁLISE VISUAL DE DESIGN - WEBSITE INSPIRATION
		 
		 Analise esta imagem de website e forneça uma análise técnica detalhada para replicação:
		 
		 1. LAYOUT & ESTRUTURA:
		 - Grid system usado (12-col, flexbox, css grid)
		 - Spacing patterns (margins, paddings em rem/px)
		 - Section arrangements (header height, content width, etc.)
		 
		 2. CORES ESPECÍFICAS:
		 - Identifique cores exatas (forneça hex codes aproximados)
		 - Gradients observados (direction, colors, stops)
		 - Color usage patterns (text, backgrounds, accents)
		 
		 3. TIPOGRAFIA TÉCNICA:
		 - Font families aparentes (serif, sans-serif, mono)
		 - Font weights observados (300, 400, 600, 700)
		 - Text sizes (aproxime em Tailwind scale: text-sm, text-lg, etc.)
		 - Line heights e letter spacing
		 
		 4. COMPONENTES REPLICÁVEIS:
		 - Button styles (rounded, shadows, hover states)
		 - Card designs (borders, shadows, spacing)
		 - Navigation patterns (sticky, transparent, etc.)
		 - Form elements styling
		 
		 5. IMPLEMENTAÇÃO TAILWIND CSS:
		 - Classes específicas do Tailwind para replicar o layout
		 - Componentes customizados baseados na inspiração
		 - Custom CSS necessário (se houver)
		 - Responsive breakpoints observados
		 
		 6. ELEMENTOS ÚNICOS:
		 - Animações ou micro-interactions visíveis
		 - Patterns decorativos ou elementos gráficos
		 - Innovative solutions que se destacam
		 
		 Forneça uma descrição técnica precisa que permita replicar este design usando React + Tailwind CSS."
		 
		 3. PROCESSAMENTO DOS RESULTADOS VISUAIS:
		 a) Colete todas as análises visuais dos screenshots
		 b) Extraia dados estruturados (cores, spacing, components)
		 c) Crie uma "style guide" consolidada baseada nas análises
		 d) Identifique padrões comuns entre os sites analisados
		 
		 4. CONSOLIDAÇÃO HÍBRIDA:
		 a) Combine dados textuais do web crawler
		 b) Integre insights visuais do modelo vision-capable
		 c) Crie um "design brief" unificado com:
		 - Paleta de cores extraída (hex codes específicos)
		 - Tipografia recommendations (font families +sizes)
		 - Layout patterns para implementar
		 - Component specifications (buttons, cards, etc.)
		 - Animation/interaction guidelines
		 c) ANÁLISE DETALHADA CATEGORIZADA: Para cada tipo de site crawlado, extraia e documente:
		 
		 SITES VISUAIS (diretos +galerias) - ASPECTOS VISUAIS:
		 - Paletas de cores dominantes (primária, secundária, accent, gradients)
		 - Tipografia (font families, sizes, weights, line-heights, font pairings)
		 - Espaçamento e grid systems (margins, paddings, containers, breakpoints)
		 - Estilo visual geral (minimalista, bold, colorful, monochrome, etc.)
		 - Estrutura de layout (header, hero, sections, footer arrangements)
		 - Padrões de navegação (header styles, menu types, mobile navigation)
		 - Componentes únicos (cards, buttons, forms, modals, testimonials)
		 - Call-to-Action patterns (placement, styling, messaging)
		 - Animações e interações (hover effects, transitions, micro-interactions)
		 
		 RECURSOS TEÓRICOS - PRINCÍPIOS E GUIDELINES:
		 - USABILIDADE: Heurísticas de Nielsen, princípios de acessibilidade
		 - UX PATTERNS: Padrões de navegação, fluxos de usuário otimizados
		 - UI GUIDELINES: Hierarquia visual, contraste, legibilidade
		 - CONVERSÃO: Técnicas para otimizar CTAs e formulários
		 - PSICOLOGIA: Princípios de design persuasivo e behavioral design
		 - RESPONSIVIDADE: Best practices para mobile-first design
		 - PERFORMANCE: Guidelines para loading e feedback visual
		 - ACESSIBILIDADE: WCAG guidelines e inclusive design
		 
		 CONSOLIDAÇÃO TEORIA +VISUAL:
		 - Aplique princípios teóricos para VALIDAR escolhas visuais
		 - Use guidelines para OTIMIZAR layouts observados
		 - Combine estética visual com usabilidade comprovada
		 - Priorize soluções que atendem tanto apelo visual quanto eficácia UX
		 d) SÍNTESE DE INSPIRAÇÃO: Combine os melhores elementos de cada site analisado
		 e) APLICAÇÃO ESTRATÉGICA: Use os insights coletados para influenciar:
		 - Escolha de cores base para a paleta (step 2c)
		 - Criação de componentes customizados que repliquem os padrões identificados
		 - Estrutura e layout do site final baseado nos designs analisados
		 - Prompts para geração de imagens contextuais
		 REGRAS CRÍTICAS:
		 - SEMPRE use mcp__recflux__design_inspiration_analyzer antes de começar o design
		 - NÃO pule esta etapa - é essencial para criar designs únicos e profissionais
		 - Use os dados consolidados para informar TODAS as decisões de design subsequentes
		 - O analisador automaticamente seleciona, captura e analisa sites de inspiração baseado no tema
		 - Documente claramente como cada elemento de inspiração foi aplicado
		6) ADICIONE VÍDEOS PROFISSIONAIS: Use mcp__recflux__puppeteer_search com searchType='videos' para encontrar vídeos de background relevantes ao tema para o hero
		 🚨 REMINDER: NavBar is already in layout.tsx - NEVER add NavBar to page.tsx 🚨
		 🚨 REMINDER: DO NOT CREATE NEW NAVIGATION - NavBar exists in app/layout.tsx 🚨
		 🚨 FOOTER MODIFICATION RULE: ALWAYS modify footer content in app/layout.tsx, NOT in page.tsx 🚨
		 🚨 CRITICAL: Footer changes must be made in layout.tsx to appear on all pages consistently 🚨
		 
		7) ADICIONE CONTEÚDO VISUAL PROFISSIONAL - Execute estes passos:
		 a) ANIMAÇÕES: Use mcp__recflux__puppeteer_search com searchType='animations' para encontrar animações relevantes ao tema
		 b) ÍCONES: Use mcp__recflux__puppeteer_search com searchType='icons' para encontrar ícones profissionais (NUNCA use emojis)
		 c) EFEITOS VISUAIS: Use mcp__recflux__puppeteer_search com searchType='vfx' para efeitos visuais especiais quando apropriado
		 d) INTEGRAÇÃO: Integre estes recursos encontrados no código usando as URLs retornadas
		 REGRAS CRÍTICAS - OBRIGATÓRIO SEGUIR:
		 - SEMPRE use as ferramentas de busca para encontrar conteúdo visual real
		 - PROIBIDO: Usar emojis em qualquer lugar do código (🚫 ❌ ✅ 💡 📱 etc.)
		 - OBRIGATÓRIO: Use URLs reais retornados pelas ferramentas de busca
		 - Se encontrar emoji no código, SUBSTITUA imediatamente por ícone real usando mcp__recflux__puppeteer_search
		8) PROCESSO CRÍTICO DE GERAÇÃO DE IMAGENS COM INSPIRAÇÃO - Execute estes passos em ordem sequencial PARA CADA IMAGEM INDIVIDUAL:
		 🚨 COMPONENT REMINDER: DO NOT generate images for NavBar or CTAButton - they are complete 🚨
		 🌍 LANGUAGE CONTEXT: When generating images, consider user's language and cultural context 🌍
		 
		 a) PLANEJAMENTO: Primeiro identifique EXATAMENTE onde cada imagem será colocada (hero, cards, sections, etc)
		 b) ANÁLISE CONTEXTUAL: Para cada localização de imagem, analise a árvore de componentes (títulos, descrições, stats, atributos) ao redor da posição da imagem
		 c) APLICAÇÃO DE INSPIRAÇÃO VISUAL PRECISA: Com base na análise híbrida do step 5, incorpore:
		 DADOS DA ANÁLISE VISUAL (SCREENSHOTS):
		 - Estilo visual ESPECÍFICO identificado pelo modelo visual (ex: "huly.io minimalist dark theme")
		 - Hex codes EXATOS extraídos das screenshots para usar na geração
		 - Layout compositions específicos observados (grid arrangements, spacing patterns)
		 - Visual elements únicos identificados nas imagens (gradients, shadows, textures)
		 
		 DADOS DO CRAWLING TEXTUAL (SUPORTE):
		 - Context adicional sobre branding/messaging dos sites
		 - Technical specifications mencionadas em text content
		 d) NÃO PARE até encontrar o título específico (ex: "Mystic Mage") E a descrição específica (ex: "Master of ancient spells and arcane knowledge") do elemento
		 e) GERAÇÃO ESPECÍFICA INDIVIDUAL COM INSPIRAÇÃO VISUAL PRECISA: Use mcp__recflux__freepik_ai_image_generator UMA VEZ POR CADA IMAGEM com:
		 FORMATO DE PROMPT ENHANCED:
		 - prompt="[título_específico] +[descrição_específica] +in the style of [site_específico_analisado] +[visual_style_extraído] +using colors [hex_codes_exatos] +[composition_pattern_observado]"
		 
		 EXEMPLOS BASEADOS EM ANÁLISE VISUAL:
		 - "Modern Dashboard Interface, Clean data visualization tool, in the style of huly.io minimalist design, dark theme with precise spacing, using colors #1a1a2e #16213e #e94560, with card-based layout and subtle gradients"
		 - "Professional Team Photo, Collaborative workspace environment, in the style of Linear.app clean aesthetic, bright minimal design, using colors #ffffff #f8fafc #6366f1, with geometric composition and soft shadows"
		 f) VERIFICAÇÃO: Confirme que a imagem gerada corresponde ao contexto específico do componente
		 g) REPETIÇÃO OBRIGATÓRIA: Execute este processo SEPARADAMENTE para CADA UMA das 3-6 imagens necessárias no site
		 REGRAS CRÍTICAS - EXECUÇÃO OBRIGATÓRIA:
		 - FAÇA UMA CHAMADA SEPARADA de mcp__recflux__freepik_ai_image_generator para cada imagem individual
		 - NUNCA tente gerar múltiplas imagens em uma única chamada
		 - SEMPRE inclua o htmlContext específico de onde a imagem será colocada
		 - Se há 6 cards, faça 6 chamadas separadas, uma para cada card
		 - PROIBIDO: Usar placeholder images, stock photos genéricas ou deixar src vazio
		 - OBRIGATÓRIO: Toda tag <img> deve usar imageUrl retornada pela ferramenta de geração
		 - VERIFICAÇÃO: Confirme que todas as imagens no código final são URLs geradas pela IA
		 EXEMPLO: Se encontrar uma card com título "Mystic Mage" e descrição "Master of ancient spells and arcane knowledge", use prompt "Mystic Mage, Master of ancient spells and arcane knowledge" - NUNCA use apenas "mage"
		9) Adicione fontes da lista permitida
		10) Implemente a paleta de cores em todos os elementos (backgrounds, texto, botões, bordas, gradients)
		11) Adicione outros recursos se necessário
		12) Verifique novamente o contraste de cores, principalmente se houver temas diferentes e veja o posicionamento dos elementos, ajuste se necessário
		13) VERIFICAÇÃO CRÍTICA DE CONTRASTE E BOTÕES - Execute OBRIGATORIAMENTE:
		 FASE 1 - CONTRASTE (CRÍTICO):
		 a) INSPEÇÃO TOTAL: Examine CADA combinação texto/fundo no código inteiro
		 b) VERIFICAÇÕES ESPECÍFICAS:
		 - Se bg-white/bg-gray-100/bg-light (claro) → DEVE usar text-gray-900/text-black
		 - Se bg-black/bg-gray-900/bg-dark (escuro) → DEVE usar text-white/text-gray-100
		 - Se bg-custom claro (bg-white, bg-gray-100) → adicione text-gray-900/text-black
		 - Se bg-custom escuro (bg-black, bg-gray-900, bg-blue-600) → adicione text-white
		 - Replique exatamente as cores observadas nos sites de inspiração
		 c) CORREÇÃO IMEDIATA: Substitua TODAS as combinações ruins encontradas
		 d) EXEMPLOS DE CORREÇÃO:
		 - ❌ "bg-white text-white" → ✅ "bg-white text-gray-900"
		 - ❌ "bg-black text-black" → ✅ "bg-black text-white"
		 - ❌ Botão sem contraste adequado → ✅ Replique cores dos sites de inspiração
		 - ❌ "button text-white bg-white" → ✅ "button text-gray-900 bg-white"
		 
		 FASE 2 - COMPONENTES:
		 e) INSPEÇÃO: Encontre TODOS os elementos button, cards, navegação no código
		 f) CORREÇÃO: Cada componente DEVE replicar o estilo dos sites de inspiração
		 g) FIDELIDADE VISUAL: Mantenha cores, spacing e styling conforme observado na análise
		 h) VALIDAÇÃO FINAL: Confirme que todos os componentes seguem os padrões das referências visuais
		14) Atualize o package.json com as dependências necessárias
		 🚨 FINAL REMINDER: Ensure NavBar and CTAButton components remain unmodified 🚨
		 🚨 HEROUI FINAL CHECK: Verify ALL components check HeroUI library FIRST 🚨
		 🚨 FINAL CHECK: Verify used ONLY when HeroUI doesn't have component 🚨
		 🚨 TAILWIND FINAL CHECK: Verify ALL styling uses ONLY Tailwind utility classes 🚨
		 
		15) VALIDAÇÃO FINAL DA INSPIRAÇÃO +TEORIA - Execute para garantir qualidade total:
		 🚨 CRITICAL QUADRUPLE FRAMEWORK VALIDATION: 🚨
		 ✅ LANGUAGE CHECK: Ensure ALL content matches user's detected language consistently
		 ✅ HEROUI PRIORITY CHECK: Ensure HeroUI checked FIRST for all components
		 ✅ BACKUP CHECK: Ensure used ONLY when HeroUI unavailable
		 ✅ TAILWIND CHECK: Ensure NO custom CSS, NO inline styles, NO other frameworks
		 ✅ COMBINATION CHECK: Verify components styled with Tailwind classes
		 ✅ DOCUMENTATION CHECK: Verify HeroUI docs were crawled when components used
		 
		 🌍 SPECIFIC LANGUAGE VALIDATION CHECKLIST: 🌍
		 ✅ ALL buttons and CTAs use user's language
		 ✅ ALL form inputs and placeholders use user's language
		 ✅ ALL navigation menu items use user's language
		 ✅ ALL page titles and headings use user's language
		 ✅ ALL content and descriptions use user's language
		 ✅ NO mixed languages anywhere in the website
		 ✅ NO English text when user speaks other language
		 ✅ NO placeholder/Lorem ipsum text in any language
		 a) VERIFICAÇÃO DE FIDELIDADE VISUAL: Compare o resultado final com sites visuais analisados
		 b) VALIDAÇÃO TEÓRICA UX/UI: Aplique princípios extraídos dos recursos teóricos
		 c) CHECKLIST DUPLO DE INSPIRAÇÃO:
		 ASPECTOS VISUAIS:
		 - ✅ Layout reflete a estrutura dos sites analisados?
		 - ✅ Paleta de cores incorpora elementos dos sites de referência?
		 - ✅ Tipografia segue padrões observados na inspiração?
		 - ✅ Componentes seguem o estilo visual dos sites analisados?
		 - ✅ Hierarquia visual reflete as melhores práticas observadas?
		 
		 VALIDAÇÃO TEÓRICA:
		 - ✅ Design atende heurísticas de usabilidade (Nielsen)?
		 - ✅ Contraste e legibilidade seguem guidelines de acessibilidade?
		 - ✅ CTAs aplicam técnicas de conversão comprovadas?
		 - ✅ Layout responsivo segue mobile-first principles?
		 - ✅ Hierarquia visual otimizada para scanning patterns?
		 - ✅ Componentes seguem padrões estabelecidos (UI patterns)?
		 d) AJUSTES FINAIS INTEGRADOS: 
		 - Se fidelidade visual baixa: ajuste baseado na inspiração visual
		 - Se validação teórica falha: ajuste baseado nos princípios UX/UI
		 - Busque equilíbrio entre estética e usabilidade
		 e) DOCUMENTAÇÃO COMPLETA: 
		 - Como sites visuais influenciaram o design
		 - Quais princípios teóricos foram aplicados
		 - Justificativas para escolhas de design baseadas em evidências

		Se solicitado, publicar com mcp__recflux__codesandbox_deploy
		
		RESUMO DO SISTEMA ENHANCED DE INSPIRAÇÃO +TEORIA +GEMINI VISION:
		Este sistema híbrido combina 3 pilares fundamentais:
		
		PILAR 1 - INSPIRAÇÃO VISUAL COM IA:
		• Web crawling de sites diretos e galerias visuais (estrutural)
		• ★ ANÁLISE VISUAL COM GEMINI 2.5 FLASH via OpenRouter (pixel-perfect)
		• Screenshots +AI vision para extração precisa de cores, layouts, componentes
		• Ferramenta: mcp__recflux__gemini_vision_analyzer
		
		PILAR 2 - FUNDAMENTOS TEÓRICOS:
		• Crawling profundo de recursos teóricos (GoodUI, UI Patterns, GoodUX)
		• Extração de princípios UX/UI e guidelines de usabilidade
		• Validação baseada em evidências e melhores práticas
		
		PILAR 3 - INTEGRAÇÃO INTELIGENTE:
		• Seleção automática de 25+fontes organizadas por categoria
		• Fórmula balanceada: Visual +Teoria +Implementação
		• Validação dupla: fidelidade visual +compliance teórico
		
		TECNOLOGIAS INTEGRADAS:
		✓ Google Gemini 2.5 Flash (OpenRouter) para análise visual
		✓ Crawl4AI para extração textual e estrutural
		✓ Puppeteer para captura de screenshots
		✓ Color palette generator com dados visuais precisos
		✓ Image generator com inspiração contextual
		
		DIFERENCIAIS ÚNICOS:
		✓ Separação clara: Visual (AI) +Textual (Crawling) +Teórico (Guidelines)
		✓ Análise AI com hex codes exatos e especificações técnicas
		✓ Custo-benefício otimizado (Gemini 2.5 Flash vs Claude/GPT-4V)
		✓ Crawling especializado para cada tipo de recurso
		✓ Validação dupla (estética +usabilidade)
		✓ Documentação completa das influências
		
		RESULTADO: Sites com design visualmente atrativo, teoricamente fundamentado, tecnicamente preciso e contextualmente fiel às inspirações
	`;
 try {
 // Clear all build caches before Cline execution to prevent stale deployments
 console.log('[CACHE] Clearing build caches before Cline execution...');
 const cacheDirectories = ['.next', 'out', 'node_modules/.cache', '.cache', 'build', 'dist'];
 for (const cacheDir of cacheDirectories) {
 try {
 await fs.rm(path.join(dir, cacheDir), { recursive: true, force: true });
 console.log(`[CACHE] ✅ Cleared ${cacheDir}`);
 } catch (e) {
 console.log(`[CACHE] ℹ️ ${cacheDir} not found (already clean)`);
 }
 }
 
 // Fix ownership after cache clearing to ensure build processes can write
 try {
 const { spawn } = await import('child_process');
 await new Promise<void>((resolve) => {
 const chownProcess = spawn('chown', ['-R', 'appuser:appuser', dir], { stdio: 'ignore' });
 chownProcess.on('close', () => resolve());
 chownProcess.on('error', () => resolve()); // Continue even if chown fails
 });
 console.log('[CACHE] ✅ Fixed ownership after cache clearing');
 } catch (e) {
 console.log('[CACHE] ℹ️ Could not fix ownership (might not be in container)');
 }
 
 const before = await hashDirectory(dir);
 const result = await runClineCLIInDirWithValidation(dir, nlPrompt, system);
 const stdout = result.stdout;
 console.log('[CLINE][NL PROMPT] result:', { 
 code: result.code, 
 stdoutLen: result.stdoutLen, 
 timedOut: (result as any).timedOut 
 });
 const after = await hashDirectory(dir);
 let changed = false;
 if (before.size !== after.size) changed = true; else { for (const [k,v] of after.entries()) { if (before.get(k) !== v) { changed = true; break; } } }
 
 if (changed) {
 console.log('[DEPLOY] Changes detected, deploying to Netlify...');
 try {
 const deployment = await deployToNetlify(dir);
 
 const messageText = `🚀 Site publicado!

📱 *Preview:*
${deployment.previewUrl}

⚙️ *Code:*
${deployment.adminUrl}`;
 
 return { 
 text: messageText,
 clineOutput: stdout,
 deploymentUrl: deployment.previewUrl,
 previewUrl: deployment.previewUrl,
 adminUrl: deployment.adminUrl,
 shouldSendImage: true, // Always try to send screenshot separately
 imageData: '', // Will be populated later
 imageCaption: '📸 Preview do seu site'
 };
 } catch (deployError) {
 console.error('[DEPLOY] Error:', deployError);
 return { 
 text: '❌ Código gerado mas falha no deploy.',
 clineOutput: stdout
 };
 }
 } else {
 return { 
 text: '✅ Nenhuma alteração detectada. Não publicarei.',
 clineOutput: stdout
 };
 }
 } catch (e) {
 console.error('[CLINE] Error or timeout:', e);
 
 // Check if we have a timeout case with partial results
 const clineResult = e as ClineResult;
 const isTimeout = (e instanceof Error && e.message.includes('timeout')) || 
 clineResult.timedOut === true;
 
 if (isTimeout && clineResult.stdout) {
 const stdout = clineResult.stdout;
 console.log('[CLINE] Timeout case - analyzing stdout for deployment URLs...');
 console.log('[CLINE] Stdout length:', stdout.length);
 
 // Look for deployment URLs in various formats from the logs
 const previewMatch = stdout.match(/\*\*[^*]*Site URL:\*\* (https:\/\/[^.\s]+\.netlify\.app)/i) ||
 stdout.match(/https:\/\/[^.\s]+\.netlify\.app/);
 const adminMatch = stdout.match(/\*\*[^*]*Admin URL:\*\* (https:\/\/app\.netlify\.com\/[^\s]+)/i) ||
 stdout.match(/https:\/\/app\.netlify\.com\/[^\s]+/);
 
 console.log('[CLINE] Preview match:', previewMatch);
 console.log('[CLINE] Editor match:', adminMatch);
 
 if (previewMatch || adminMatch) {
 const deploymentUrl = previewMatch ? previewMatch[1] || previewMatch[0] : '';
 const adminUrl = adminMatch ? adminMatch[1] || adminMatch[0] : '';
 
 console.log('[CLINE] Found deployment URLs after timeout:', { deploymentUrl, adminUrl });
 return {
 text: `🚀 Site publicado! (Cline timeout mas deploy funcionou)

📱 *Preview:*
${deploymentUrl}

⚙️ *Code:*
${adminUrl}

⚠️ *Nota:* Cline foi interrompido por timeout mas o deploy foi realizado com sucesso.`,
 deploymentUrl: deploymentUrl,
 previewUrl: deploymentUrl,
 adminUrl: adminUrl,
 clineOutput: stdout.substring(0, 1000) +(stdout.length > 1000 ? '...' : '')
 };
 }
 }
 
 // If Claude times out but we have changes, still try to deploy
 let changed = false;
 // For timeout case, assume there were changes if files exist
 try {
 const appPath = path.join(dir, 'src', 'App.jsx');
 const stats = await fs.stat(appPath);
 changed = stats.isFile();
 } catch {
 changed = false;
 }
 
 if (changed) {
 console.log('[DEPLOY] Cline timed out but changes detected, attempting deploy anyway...');
 try {
 const deployment = await deployToNetlify(dir);
 return { 
 text: `🚀 Site publicado! (Cline timeout mas deploy funcionou)

📱 *Preview:*
${deployment.previewUrl}

⚙️ *Code:*
${deployment.adminUrl}`,
 deploymentUrl: deployment.previewUrl,
 previewUrl: deployment.previewUrl,
 adminUrl: deployment.adminUrl
 };
 } catch (deployError) {
 return { text: '❌ Cline timeout e falha no deploy. Tente novamente.' };
 }
 }
 return { text: '❌ Erro ao gerar código. Tente um prompt mais simples.' };
 }
}

async function sendWhatsappText(to: string, body: string) {
	const chunks: string[] = [];
	const maxLen = 3500;
	for (let i = 0; i < body.length; i += maxLen) {
		chunks.push(body.slice(i, i +maxLen));
	}

	console.log(`[WHATSAPP_API] Sending ${chunks.length} chunk(s) to ${to}`);
	for (const [idx, chunk] of chunks.entries()) {
		const url = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
		const payload = {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: { body: chunk }
		};
		try {
			console.log(`[WHATSAPP_API] POST ${url} (chunk ${idx +1}/${chunks.length})`);
			const resp = await axios.post(url, payload, {
				headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
			});
			const preview = typeof resp.data === 'string' ? resp.data.slice(0, 500) : JSON.stringify(resp.data).slice(0, 500);
			console.log(`[WHATSAPP_API] status=${resp.status} body=${preview}`);
		} catch (err: any) {
			const status = err?.response?.status;
			const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
			console.error(`[WHATSAPP_API] error status=${status} message=${err?.message}`);
			if (dataPreview) console.error(`[WHATSAPP_API] error body=${dataPreview}`);
			throw err;
		}
	}
}

async function sendWhatsappImage(to: string, base64Image: string, caption?: string) {
	try {
		console.log(`[WHATSAPP_API] Sending image to ${to} (${Math.round(base64Image.length / 1024)}KB)`);
		
		// Convert base64 to buffer
		const imageBuffer = Buffer.from(base64Image, 'base64');
		
		// First, upload the media
		const uploadUrl = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/media`;
		const formData = new FormData();
		formData.append('messaging_product', 'whatsapp');
		formData.append('file', imageBuffer, {
			filename: 'screenshot.png',
			contentType: 'image/png'
		});
		formData.append('type', 'image/png');
		
		const uploadResp = await axios.post(uploadUrl, formData, {
			headers: { 
				Authorization: `Bearer ${WHATSAPP_TOKEN}`,
				...formData.getHeaders()
			}
		});
		
		const mediaId = uploadResp.data.id;
		console.log(`[WHATSAPP_API] Media uploaded successfully, ID: ${mediaId}`);
		
		// Then send the image message
		const messageUrl = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
		const payload = {
			messaging_product: 'whatsapp',
			to,
			type: 'image',
			image: {
				id: mediaId,
				caption: caption || ''
			}
		};
		
		const resp = await axios.post(messageUrl, payload, {
			headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
		});
		
		console.log(`[WHATSAPP_API] Image sent successfully, status=${resp.status}`);
		return resp.data;
	} catch (err: any) {
		const status = err?.response?.status;
		const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
		console.error(`[WHATSAPP_API] Image send error status=${status} message=${err?.message}`);
		if (dataPreview) console.error(`[WHATSAPP_API] Image send error body=${dataPreview}`);
		throw err;
	}
}

const app = express();
app.use(bodyParser.json());

// Optional Google auth setup
configureAuth(app);

app.get('/webhook', (req: Request, res: Response) => {
	const mode = req.query['hub.mode'];
	const token = req.query['hub.verify_token'];
	const challenge = req.query['hub.challenge'];

	if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
		return res.status(200).send(challenge as any);
	}
	return res.sendStatus(403);
});

app.post('/webhook', async (req: Request, res: Response) => {
	try {
		// Debug: print the incoming request
		console.log('[WEBHOOK] method=POST path=/webhook');
		console.log('[WEBHOOK] headers=', JSON.stringify(req.headers));
		console.log('[WEBHOOK] body=', JSON.stringify(req.body));
		const entry = req.body?.entry?.[0];
		const changes = entry?.changes?.[0];
		const value = changes?.value;
		const messages = value?.messages;
		// Ignore status callbacks (delivery/read, outbound acks)
		if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
			return res.sendStatus(200);
		}

		if (messages && messages[0] && messages[0].type === 'text') {
			const msg = messages[0];
			const from = msg.from;
			const text: string = (msg.text?.body || '').trim();
			const uniqueId = msg.id || `${from}:${msg.timestamp || Date.now()}`;
			if (!(await ensureFirstProcessDistributed(uniqueId))) {
				console.log(`[WEBHOOK] duplicate message detected, id=${uniqueId}, skipping`);
				return res.sendStatus(200);
			}

			let reply = '';
			let wrapAsCode = true;
			if (text.toLowerCase().startsWith('/deploy ')) {
				const reactCode = text.slice(8);
				// Immediate feedback to user about expected duration
				await sendWhatsappText(from, '⚡ Iniciando deploy… Aguarde alguns minutos!');
				const dirFromEnv = process.env.CLONED_TEMPLATE_DIR;
				if (!dirFromEnv) {
					reply = '⚠️ Projeto não inicializado. Faça /login para criar o projeto a partir do template.';
					wrapAsCode = false;
					await sendWhatsappText(from, reply);
					return res.sendStatus(200);
				}
				const dir = dirFromEnv;
				try { const st = await fs.stat(dir); if (!st.isDirectory()) throw new Error('not dir'); } catch {
					reply = '⚠️ Projeto ausente. Use /login ou peça project_reset para recriar a pasta.';
					wrapAsCode = false;
					await sendWhatsappText(from, reply);
					return res.sendStatus(200);
				}
				const systemDeploy = `Você é um admin de código. Edite o projeto desta pasta conforme o pedido.`;
				try {
					// Clear all build caches before Cline execution to prevent stale deployments
					console.log('[CACHE] Clearing build caches before Cline execution (deploy prompt)...');
					const cacheDirectories = ['.next', 'out', 'node_modules/.cache', '.cache', 'build', 'dist'];
					for (const cacheDir of cacheDirectories) {
						try {
							await fs.rm(path.join(dir, cacheDir), { recursive: true, force: true });
							console.log(`[CACHE] ✅ Cleared ${cacheDir}`);
						} catch (e) {
							console.log(`[CACHE] ℹ️ ${cacheDir} not found (already clean)`);
						}
					}
					
					// Fix ownership after cache clearing to ensure build processes can write
					try {
						const { spawn } = await import('child_process');
						await new Promise<void>((resolve) => {
							const chownProcess = spawn('chown', ['-R', 'appuser:appuser', dir], { stdio: 'ignore' });
							chownProcess.on('close', () => resolve());
							chownProcess.on('error', () => resolve()); // Continue even if chown fails
						});
						console.log('[CACHE] ✅ Fixed ownership after cache clearing');
					} catch (e) {
						console.log('[CACHE] ℹ️ Could not fix ownership (might not be in container)');
					}
					
					const before = await hashDirectory(dir);
					const result = await runClineCLIInDirWithValidation(dir, reactCode, systemDeploy);
					const stdout = result.stdout;
					console.log('[CLINE][DEPLOY PROMPT] raw output length', stdout?.length || 0);
					const after = await hashDirectory(dir);
					let changed = false;
					if (before.size !== after.size) changed = true;
					else {
						for (const [k, v] of after.entries()) { if (before.get(k) !== v) { changed = true; break; } }
					}
					
					let deploymentResult: { deploymentUrl?: string; previewUrl?: string; adminUrl?: string } | null = null;
					
					if (changed) {
						console.log('[DEPLOY] Changes detected, deploying to Netlify...');
						try {
							deploymentResult = await deployToNetlify(dir);
							reply = `🚀 Site publicado!

📱 **Preview:**
${deploymentResult.previewUrl}

⚙️ **Código:**
${deploymentResult.adminUrl}`;
						} catch (deployError) {
							console.error('[DEPLOY] Error:', deployError);
							reply = '❌ Código editado mas falha no deploy.';
						}
					} else {
						reply = '✅ Nenhuma alteração detectada. Não publicarei.';
					}
					
					// Send messages in order: comment → link → screenshot
					
					// 1. Send Cline's commentary first if available
					if (stdout && stdout.trim().length > 0) {
						console.log(`[WEBHOOK] Sending Cline commentary to ${from} for /deploy command`);
						await sendWhatsappText(from, stdout.trim());
					}
					
					// 2. Send the deployment result
					wrapAsCode = false;
					await sendWhatsappText(from, reply);
					
					
					return res.sendStatus(200);
				} finally {
					// Do not delete CLONED_TEMPLATE_DIR; it is managed via login/project_reset
				}
			} else if (text.toLowerCase().startsWith('/access ')) {
				reply = 'O comando /access não está disponível nesta versão.';
			} else if (text.toLowerCase().startsWith('/login')) {
				const base = (PUBLIC_BASE_URL && PUBLIC_BASE_URL.trim()) || `http://localhost:${process.env.PORT || 3000}`;
				const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
				const loginUrl = `${normalizedBase}/auth/google?state=${encodeURIComponent(from)}`;
				reply = `Login com Google: ${loginUrl}`;
				wrapAsCode = false;
			} else if (text.toLowerCase().startsWith('/agentic')) {
				// Formats:
				// GERAR: /agentic GERAR <userId> | <prompt>
				// EDITAR: /agentic EDITAR <userId> | <fileName> | <prompt> || <currentCode>
				const payload = text.startsWith('/agentic ') ? text.slice(9).trim() : '';
				const [left] = payload.split('||');
				const parts = (left || '').split('|').map(s => s.trim()).filter(Boolean);
				const head = (parts[0] || '').split(/\s+/).filter(Boolean);
				const actionType = (head[0]?.toUpperCase() as 'EDITAR' | 'FOCAR' | 'GERAR') || 'GERAR';
				// Try to get logged-in user via WhatsApp sender mapping; fallback to provided id or dev-user
				const mappedUser = getUserByWhatsApp(from);
				let userId = head[1] || 'dev-user';
				if (mappedUser?.email) {
					// Resolve Supabase user UUID via email
					const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
					const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
					if (supabaseUrl && supabaseKey) {
						try {
							const supabase = createClient(supabaseUrl, supabaseKey);
							const { data: user, error } = await supabase
								.from('users')
								.select('id')
								.eq('email', mappedUser.email)
								.single();
							if (!error && user?.id) {
								userId = user.id as string;
							}
						} catch (e) {
							console.warn('[SUPABASE] Failed to resolve user id by email:', (e as Error).message);
						}
					}
				}
				const prompt = parts.length > 1 ? parts[parts.length - 1] : '';

				if (!prompt) {
					const who = mappedUser ? ` (como ${mappedUser.email || mappedUser.name || mappedUser.id})` : '';
					reply = `Você está usando /agentic${who}.\nUso:\n/agentic GERAR | <prompt>\n/agentic EDITAR | <fileName> | <prompt> || <currentCode>`;
				} else {
					// Fallback: if userId isn't a UUID, try DEFAULT_USER_ID env, otherwise ask user to /login
					if (!isValidUuid(userId)) {
						const fallback = process.env.DEFAULT_USER_ID;
						if (fallback && isValidUuid(fallback)) {
							console.warn(`[AGENTIC] Using DEFAULT_USER_ID fallback for non-UUID userId (${userId})`);
							userId = fallback;
						} else {
							reply = 'Por favor, faça /login primeiro ou forneça um UUID de usuário válido. Você também pode definir DEFAULT_USER_ID nas variáveis do servidor.';
							wrapAsCode = false;
							await sendWhatsappText(from, reply);
							return res.sendStatus(200);
						}
					}
					// Independente do actionType, apenas confirmamos a edição
					reply = 'OK. Vou aplicar as mudanças no projeto ao publicar.';
				}
			} else if (text.toLowerCase() === '/help') {
				reply = 'Envie um prompt em linguagem natural (ex.: "Crie um portfólio moderno") e eu vou gerar e publicar. Comandos: /login, /agentic, /access, /deploy';
				wrapAsCode = false;
			} else {
				console.log(`[WEBHOOK] Processing deployment request from ${from}: "${text.substring(0, 100)}..."`);
				// Immediate feedback to user about expected duration
				await sendWhatsappText(from, '⚡ Gerando e publicando… Aguarde alguns minutos!');
				const result = await buildAndDeployFromPrompt(text, from);
				console.log('[WEBHOOK] Deployment result:', {
					textLength: result.text.length,
					hasDeploymentUrl: !!result.deploymentUrl,
					hasClineOutput: !!result.clineOutput
				});
				
				// Send messages in order: comment → link → screenshot
				
				// 1. Send Cline's commentary first if available
				if (result.clineOutput && result.clineOutput.trim().length > 0) {
					console.log(`[WEBHOOK] Sending Cline commentary to ${from}`);
					await sendWhatsappText(from, result.clineOutput.trim());
				}
				
				// 2. Send the link immediately when ready
				console.log(`[WEBHOOK] Sending deployment result to ${from}`);
				await sendWhatsappText(from, result.text);
				
				// 3. Take and send screenshot asynchronously (don't wait)
				if (result.shouldSendImage && result.previewUrl) {
					console.log(`[WEBHOOK] Taking screenshot asynchronously for ${from}`);
					// Don't await - run in background
					takeScreenshot(result.previewUrl)
						.then(async (screenshotData) => {
							console.log(`[WEBHOOK] Screenshot ready, sending to ${from}`);
							await sendWhatsappImage(from, screenshotData, result.imageCaption || '📸 Preview do seu site');
						})
						.catch((screenshotError) => {
							console.warn(`[WEBHOOK] Screenshot failed for ${from}:`, screenshotError);
						});
				}
				
				// Return early since we already sent the message(s)
				return res.sendStatus(200);
			}

			if (wrapAsCode && !reply.startsWith('```')) {
				reply = '```' +reply +'```';
			}

			await sendWhatsappText(from, reply);
		}

		res.sendStatus(200);
	} catch (err) {
		console.error(err);
		res.sendStatus(500);
	}
});

const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
	console.log(`Webhook listening on :${port}`);
});


