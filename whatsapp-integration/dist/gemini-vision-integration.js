/**
 * Gemini 2.5 Flash Vision Integration via OpenRouter
 *
 * This module provides integration with Google's Gemini 2.5 Flash model
 * through OpenRouter API for visual analysis of website screenshots.
 */
import axios from 'axios';
import { promises as fs } from 'fs';
export class GeminiVisionAnalyzer {
    config;
    constructor(apiKey) {
        this.config = {
            apiKey,
            model: 'google/gemini-2.5-flash',
            maxTokens: 4000,
            temperature: 0.1 // Low temperature for consistent technical analysis
        };
    }
    /**
     * Analyze a website screenshot using Gemini 2.0 Flash
     */
    async analyzeScreenshot(request) {
        const startTime = Date.now();
        try {
            // Read screenshot
            const imageBuffer = await fs.readFile(request.screenshotPath);
            let base64Image = imageBuffer.toString('base64');
            // Upload to imgbb
            const imgbbApiKey = process.env.IMGBB_API_KEY;
            if (!imgbbApiKey) {
                throw new Error('IMGBB_API_KEY environment variable is required');
            }
            console.log('[GEMINI_VISION] Original image size:', Math.round(base64Image.length / 1024), 'KB');
            // Check if image is too large for imgbb (32MB limit, but we'll be conservative with 8MB for base64)
            // Base64 encoding increases size by ~33%, so 8MB base64 ≈ 6MB binary
            const maxSizeBase64 = 8 * 1024 * 1024; // 8MB for base64 string
            if (base64Image.length > maxSizeBase64) {
                console.log('[GEMINI_VISION] Image too large for imgbb, size:', Math.round(base64Image.length / 1024), 'KB > 8MB limit');
                console.log('[GEMINI_VISION] Skipping vision analysis for this image to prevent API errors');
                throw new Error(`Image too large for imgbb upload: ${Math.round(base64Image.length / 1024)}KB > 8MB base64 limit. Consider using viewport screenshots only.`);
            }
            // Use form data format for imgbb API
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('image', base64Image);
            formData.append('name', `screenshot_${Date.now()}`);
            const imgbbResponse = await axios.post(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });
            console.log('[GEMINI_VISION] Imgbb response status:', imgbbResponse.status);
            console.log('[GEMINI_VISION] Imgbb response success:', imgbbResponse.data?.success);
            if (!imgbbResponse.data?.success) {
                throw new Error(`Failed to upload image to imgbb: ${JSON.stringify(imgbbResponse.data)}`);
            }
            const imageUrl = imgbbResponse.data.data.url;
            console.log('[GEMINI_VISION] Image uploaded successfully to:', imageUrl);
            // Prepare OpenRouter API request with image URL
            const openRouterRequest = {
                model: this.config.model,
                max_tokens: request.config?.maxTokens || this.config.maxTokens,
                temperature: request.config?.temperature || this.config.temperature,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: request.prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl
                                }
                            }
                        ]
                    }
                ]
            };
            // Make API call to OpenRouter
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', openRouterRequest, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://your-site.com', // Optional: for OpenRouter analytics
                    'X-Title': 'Website Design Analysis Tool' // Optional: for OpenRouter analytics
                }
            });
            const analysis = response.data.choices[0].message.content;
            const processingTime = Date.now() - startTime;
            return {
                analysis,
                confidence: this.calculateConfidence(analysis),
                metadata: {
                    model: this.config.model,
                    tokens_used: response.data.usage?.total_tokens || 0,
                    processing_time: processingTime
                }
            };
        }
        catch (error) {
            console.error('[GEMINI_VISION] Analysis failed:', error);
            throw new Error(`Gemini vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Analyze multiple screenshots in batch (with rate limiting)
     */
    async analyzeBatch(requests) {
        const results = [];
        // Process with delay to respect rate limits
        for (let i = 0; i < requests.length; i++) {
            console.log(`[GEMINI_VISION] Processing screenshot ${i + 1}/${requests.length}`);
            try {
                const result = await this.analyzeScreenshot(requests[i]);
                results.push(result);
                // Rate limiting: 1 request per 2 seconds to be safe
                if (i < requests.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                console.error(`[GEMINI_VISION] Failed to process request ${i + 1}:`, error);
                // Continue with other requests
                results.push({
                    analysis: 'Analysis failed',
                    confidence: 0,
                    metadata: {
                        model: this.config.model,
                        tokens_used: 0,
                        processing_time: 0
                    }
                });
            }
        }
        return results;
    }
    getMimeType(filePath) {
        const extension = filePath.toLowerCase().split('.').pop();
        switch (extension) {
            case 'png': return 'image/png';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'webp': return 'image/webp';
            case 'gif': return 'image/gif';
            default: return 'image/png';
        }
    }
    calculateConfidence(analysis) {
        // Simple heuristic to estimate confidence based on analysis quality
        const keywords = [
            'color', 'layout', 'typography', 'component', 'spacing',
            'design', 'style', 'button', 'navigation', 'grid'
        ];
        const foundKeywords = keywords.filter(keyword => analysis.toLowerCase().includes(keyword)).length;
        // Base confidence on keyword coverage and response length
        const keywordScore = Math.min(foundKeywords / keywords.length, 1);
        const lengthScore = Math.min(analysis.length / 1000, 1); // Longer = more detailed
        return Math.round((keywordScore * 0.7 + lengthScore * 0.3) * 100) / 100;
    }
}
/**
 * Design-specific prompt templates for Gemini analysis
 */
export const GeminiDesignPrompts = {
    /**
     * Comprehensive design analysis prompt
     */
    fullAnalysis: `
DESIGN ANALYSIS TASK - WEBSITE SCREENSHOT

Analyze this website screenshot and provide detailed technical specifications for replication using modern web technologies.

REQUIRED ANALYSIS SECTIONS:

1. COLOR PALETTE EXTRACTION:
   - Primary colors (provide exact hex codes where possible)
   - Secondary colors and accents
   - Background colors and gradients
   - Text colors and contrast ratios
   - Border and divider colors

2. LAYOUT & STRUCTURE:
   - Grid system (12-column, flexbox, CSS grid)
   - Container widths and max-widths
   - Section spacing and padding patterns
   - Responsive breakpoints observed
   - Content organization and hierarchy

3. TYPOGRAPHY ANALYSIS:
   - Font families (serif, sans-serif, monospace)
   - Font weights used (light, regular, medium, bold)
   - Font sizes in relative scale (small, medium, large, xl)
   - Line heights and letter spacing
   - Text alignment patterns

4. COMPONENT SPECIFICATIONS:
   - Button styles (shapes, sizes, colors, hover states)
   - Card designs (borders, shadows, padding, content layout)
   - Navigation patterns (header style, menu organization)
   - Form elements and input styling
   - Icon usage and styling

5. VISUAL EFFECTS:
   - Shadow styles and blur effects
   - Border radius patterns
   - Hover and interaction states
   - Animations or transitions visible
   - Image treatments and filters

6. TAILWIND CSS IMPLEMENTATION:
   - Specific Tailwind classes for layout replication
   - Custom CSS requirements (if any)
   - Responsive utilities needed
   - Color configuration suggestions

7. DESIGN STYLE CLASSIFICATION:
   - Overall aesthetic (minimal, bold, corporate, creative, etc.)
   - Industry/niche apparent from design
   - Modern trends incorporated
   - Unique or innovative elements

Provide specific, actionable technical details that enable accurate replication.
Focus on measurable aspects like colors, sizes, spacing, and component structures.
`,
    /**
     * Color-focused analysis prompt
     */
    colorAnalysis: `
COLOR EXTRACTION TASK - WEBSITE SCREENSHOT

Analyze this website screenshot and extract detailed color information.

REQUIRED ANALYSIS:
1. Extract exact hex codes for all visible colors
2. Identify color usage patterns (backgrounds, text, accents, borders)
3. Analyze color relationships (complementary, analogous, triadic)
4. Note any gradients with their direction and color stops
5. Assess contrast ratios for accessibility
6. Identify brand color hierarchy (primary, secondary, tertiary)

Provide specific hex codes and usage recommendations for implementation.
`,
    /**
     * Layout-focused analysis prompt
     */
    layoutAnalysis: `
LAYOUT ANALYSIS TASK - WEBSITE SCREENSHOT

Analyze this website screenshot and provide detailed layout specifications.

REQUIRED ANALYSIS:
1. Grid system identification (12-col, flexbox, CSS grid)
2. Container and section widths
3. Spacing patterns (margins, padding, gaps)
4. Content hierarchy and organization
5. Responsive design patterns visible
6. Section arrangements (header, hero, content, footer)
7. Element positioning and alignment
8. White space usage patterns

Provide specific measurements and CSS implementation suggestions.
`,
    /**
     * Component-focused analysis prompt
     */
    componentAnalysis: `
COMPONENT ANALYSIS TASK - WEBSITE SCREENSHOT

Analyze this website screenshot and identify reusable UI components.

REQUIRED ANALYSIS:
1. Button variations (primary, secondary, sizes, states)
2. Card components (structure, spacing, shadows, borders)
3. Navigation components (header, menus, breadcrumbs)
4. Form elements (inputs, selects, checkboxes)
5. Typography components (headings, paragraphs, lists)
6. Media components (images, videos, icons)
7. Layout components (containers, sections, dividers)

Provide component specifications for implementation with modern frameworks.
`
};
/**
 * Integration with existing MCP server
 */
export function createGeminiVisionMCPTool() {
    return {
        name: 'gemini_vision_analyzer',
        description: 'Analyze website screenshots using Gemini 2.0 Flash for design inspiration extraction',
        inputSchema: {
            type: 'object',
            properties: {
                screenshotPath: {
                    type: 'string',
                    description: 'Path to the screenshot file to analyze'
                },
                analysisType: {
                    type: 'string',
                    enum: ['full', 'color', 'layout', 'component'],
                    default: 'full',
                    description: 'Type of analysis to perform'
                },
                customPrompt: {
                    type: 'string',
                    description: 'Optional custom prompt for specific analysis needs'
                }
            },
            required: ['screenshotPath']
        },
        handler: async ({ screenshotPath, analysisType = 'full', customPrompt }) => {
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                throw new Error('OPENROUTER_API_KEY environment variable is required');
            }
            const analyzer = new GeminiVisionAnalyzer(apiKey);
            let prompt = customPrompt;
            if (!prompt) {
                switch (analysisType) {
                    case 'full':
                        prompt = GeminiDesignPrompts.fullAnalysis;
                        break;
                    case 'color':
                        prompt = GeminiDesignPrompts.colorAnalysis;
                        break;
                    case 'layout':
                        prompt = GeminiDesignPrompts.layoutAnalysis;
                        break;
                    case 'component':
                        prompt = GeminiDesignPrompts.componentAnalysis;
                        break;
                    default: prompt = GeminiDesignPrompts.fullAnalysis;
                }
            }
            const result = await analyzer.analyzeScreenshot({
                screenshotPath,
                prompt
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            analysis: result.analysis,
                            confidence: result.confidence,
                            metadata: result.metadata,
                            analysisType,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    };
}
export default GeminiVisionAnalyzer;
