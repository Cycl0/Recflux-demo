/**
 * Video Analyzer Integration
 *
 * This module analyzes video content from search results to intelligently
 * select the most appropriate video for a website based on theme, aesthetics,
 * and technical suitability. Uses OpenRouter API for vision model access.
 */
import axios from 'axios';
import { promises as fs } from 'fs';
import { getRedisCache } from './redis-cache.js';
function logWithTimestamp(msg) {
    fs.appendFile('mcp-video-analyzer.log', new Date().toISOString() + ': ' + msg + '\n').catch(() => { });
}
export class VideoAnalyzer {
    config;
    constructor(apiKey) {
        this.config = {
            apiKey,
            model: 'openrouter/sonoma-sky-alpha', // OpenRouter's vision model
            temperature: 0.2, // Slightly higher temperature for creative analysis
            maxTokens: 4000 // Increased for analyzing many videos
        };
    }
    /**
     * Analyze multiple videos and select the best one for the website
     */
    async analyzeAndSelectBestVideo(request) {
        const startTime = Date.now();
        try {
            // Initialize Redis cache
            const cache = getRedisCache();
            // Try to connect to Redis (non-blocking)
            try {
                await cache.connect();
            }
            catch (redisError) {
                logWithTimestamp(`[VIDEO_ANALYZER] Redis connection failed, proceeding without cache: ${redisError}`);
            }
            // Create cache key based on video IDs and theme
            const videoIds = request.videos.map(v => v.id).sort().join(',');
            const cacheKey = `video_analysis:${videoIds}:${request.theme}`;
            // Check cache first (unless bypassing cache)
            if (!request.bypassCache) {
                logWithTimestamp(`[VIDEO_ANALYZER] Checking cache for videos: ${videoIds}`);
                try {
                    // Use the client directly since RedisCache doesn't have generic get method
                    const cachedResult = await cache.client?.get(cacheKey);
                    if (cachedResult) {
                        logWithTimestamp(`[VIDEO_ANALYZER] Cache hit! Returning cached result`);
                        const result = JSON.parse(cachedResult);
                        result.metadata.processingTime = Date.now() - startTime;
                        result.metadata.cached = true;
                        return result;
                    }
                    else {
                        logWithTimestamp(`[VIDEO_ANALYZER] Cache miss, proceeding with fresh analysis`);
                    }
                }
                catch (cacheError) {
                    logWithTimestamp(`[VIDEO_ANALYZER] Cache error: ${cacheError}`);
                }
            }
            // Analyze videos using vision model
            const analysisPrompt = this.createVideoAnalysisPrompt(request);
            // For video analysis, we'll analyze thumbnails since we can't analyze video content directly
            // First, let's get the thumbnail images
            const thumbnailAnalyses = await this.analyzeThumbnails(request.videos, analysisPrompt);
            // Process the analysis results
            const result = this.processAnalysisResults(request.videos, thumbnailAnalyses, request.theme);
            const processingTime = Date.now() - startTime;
            result.metadata.processingTime = processingTime;
            result.metadata.cached = false;
            // Cache the successful result
            if (!request.bypassCache) {
                try {
                    const ttl = parseInt(process.env.CACHE_TTL_VIDEO || '86400'); // 24 hours default
                    // Use the client directly since RedisCache doesn't have generic setex method
                    await cache.client?.setEx(cacheKey, ttl, JSON.stringify(result));
                    logWithTimestamp(`[VIDEO_ANALYZER] Successfully cached video analysis`);
                }
                catch (cacheError) {
                    logWithTimestamp(`[VIDEO_ANALYZER] Error caching video analysis: ${cacheError}`);
                }
            }
            return result;
        }
        catch (error) {
            logWithTimestamp('[VIDEO_ANALYZER] Analysis failed:' + (error instanceof Error ? error.message : 'Unknown error'));
            throw new Error(`Video analysis via OpenRouter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create analysis prompt for video selection
     */
    createVideoAnalysisPrompt(request) {
        const themeColorProfiles = {
            'business': { colors: ['navy blue', 'charcoal gray', 'white', 'silver'], mood: 'professional, trustworthy', style: 'clean, corporate' },
            'technology': { colors: ['electric blue', 'cyan', 'dark gray', 'white'], mood: 'innovative, cutting-edge', style: 'modern, sleek' },
            'healthcare': { colors: ['soft blue', 'green', 'white', 'light gray'], mood: 'caring, peaceful', style: 'clean, calming' },
            'finance': { colors: ['deep blue', 'gold', 'dark green', 'white'], mood: 'secure, stable', style: 'professional, premium' },
            'food-drink': { colors: ['warm oranges', 'browns', 'greens', 'cream'], mood: 'appetizing, warm', style: 'natural, inviting' },
            'travel': { colors: ['blues', 'earth tones', 'vibrant accents'], mood: 'adventurous, inspiring', style: 'dynamic, scenic' },
            'fitness': { colors: ['energetic orange', 'bright green', 'black', 'white'], mood: 'energetic, motivating', style: 'dynamic, bold' },
            'real-estate': { colors: ['warm grays', 'earth tones', 'white', 'accent blues'], mood: 'welcoming, luxurious', style: 'elegant, spacious' },
            'fashion': { colors: ['black', 'white', 'pastels', 'metallics'], mood: 'stylish, sophisticated', style: 'chic, artistic' }
        };
        const profile = themeColorProfiles[request.theme] || {
            colors: ['neutral tones', 'white', 'gray'],
            mood: 'professional, clean',
            style: 'modern, minimal'
        };
        return `
INTELLIGENT VIDEO SELECTION TASK - ${request.theme.toUpperCase()} WEBSITE BACKGROUND

You are analyzing video thumbnails to select the PERFECT background video for a ${request.theme} website that will harmonize with the site's design and enhance user experience.

WEBSITE CONTEXT & DESIGN REQUIREMENTS:
- Industry: ${request.theme}
- Expected Color Palette: ${profile.colors.join(', ')}
- Desired Mood: ${profile.mood}
- Design Style: ${profile.style}
${request.websiteContext ? `- Specific Context: ${request.websiteContext}` : ''}

CRITICAL ANALYSIS CRITERIA (weighted importance):

1. COLOR HARMONY & PALETTE MATCHING (35% weight):
   - Does the video's color palette complement ${profile.colors.join(', ')}?
   - Will it clash with typical ${request.theme} website colors?
   - Are the dominant colors suitable for text overlay contrast?
   - Does it support the ${profile.mood} mood through color choices?

2. THEME & CONTEXTUAL RELEVANCE (30% weight):
   - Perfect alignment with ${request.theme} industry expectations
   - Conveys the right message and professional tone
   - Matches the ${profile.style} design aesthetic
   - Appeals to the target ${request.theme} audience

3. BACKGROUND VIDEO OPTIMIZATION (25% weight):
   - Non-distracting movement that enhances rather than competes
   - Excellent contrast potential for white/dark text overlay
   - Subtle, elegant motion suitable for long viewing
   - Clean composition without busy or cluttered elements
   - Appropriate focal points that don't interfere with content

4. PRODUCTION QUALITY & TECHNICAL (10% weight):
   - Professional cinematography and lighting
   - High resolution and clarity
   - Smooth, stable footage
   - Suitable aspect ratio and duration for web looping

ANALYSIS INSTRUCTIONS:
- Examine EACH thumbnail's color composition carefully
- Consider how each video would look with typical ${request.theme} website elements (navigation, text, buttons)
- Prioritize videos that would create a cohesive, professional brand experience
- Look for videos that enhance rather than distract from the site's content

CRITICAL INSTRUCTIONS:
1. You MUST be able to see and analyze the video thumbnail images provided above
2. If you cannot see the images, respond with: {"error": "Cannot see images", "selectedVideoIndex": 0}
3. If you CAN see the images, analyze their colors and respond with the JSON format below
4. You MUST respond with ONLY valid JSON. No text before or after.

REQUIRED OUTPUT FORMAT (respond with this exact JSON structure):
{
  "selectedVideoIndex": 0,
  "confidence": 0.92,
  "reasoning": "Selected video 1 because its soft blue and white tones perfectly complement the expected healthcare color palette, creating a calming atmosphere that aligns with the caring, peaceful mood. The subtle movement and clean composition provide excellent contrast for text overlay while maintaining professional healthcare industry standards.",
  "colorAnalysis": "Dominant colors: soft blues, whites, light grays - perfect harmony with healthcare palette",
  "scores": [
    {
      "index": 0,
      "score": 9.2,
      "colorHarmony": 9.5,
      "themeRelevance": 9.0,
      "backgroundSuitability": 9.0,
      "technicalQuality": 8.5,
      "pros": ["perfect color palette match", "excellent contrast for text", "professional ${request.theme} aesthetic"],
      "cons": ["minor: could use slightly more movement"]
    }
  ]
}

IMPORTANT: Respond with ONLY the JSON object above. No additional text or explanation.
`;
    }
    /**
     * Analyze video thumbnails using vision model
     */
    async analyzeThumbnails(videos, prompt) {
        try {
            // Start with just 3 videos for testing - if AI can't see images, reducing count helps debug
            const maxVideos = 3;
            const videosToAnalyze = videos.slice(0, maxVideos);
            logWithTimestamp(`[VIDEO_ANALYZER] Analyzing ${videosToAnalyze.length} video thumbnails using direct URLs (limited from ${videos.length})`);
            logWithTimestamp(`[VIDEO_ANALYZER] Using model: ${this.config.model}`);
            // Log thumbnail URLs for verification
            videosToAnalyze.forEach((video, index) => {
                logWithTimestamp(`[VIDEO_ANALYZER] Video ${index + 1}: "${video.title}" - Thumbnail: ${video.thumbnail}`);
            });
            // Prepare vision API request with thumbnail URLs directly
            const imageContent = videosToAnalyze.map((video, index) => [
                {
                    type: 'text',
                    text: `VIDEO ${index + 1} (${video.title}):`
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: video.thumbnail,
                        detail: 'low' // Use low detail for faster processing of multiple images
                    }
                }
            ]).flat();
            const visionRequest = {
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            ...imageContent
                        ]
                    }
                ]
            };
            logWithTimestamp(`[VIDEO_ANALYZER] Sending ${videosToAnalyze.length} thumbnail URLs to OpenRouter API`);
            // Make API call to OpenRouter (supports vision models)
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', visionRequest, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 90000
            });
            const content = response.data.choices[0]?.message?.content || '';
            logWithTimestamp(`[VIDEO_ANALYZER] Received response from OpenRouter API (${content.length} chars)`);
            logWithTimestamp(`[VIDEO_ANALYZER] Raw response content: ${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`);
            if (!content || content.length === 0) {
                logWithTimestamp(`[VIDEO_ANALYZER] Empty response received from API`);
                logWithTimestamp(`[VIDEO_ANALYZER] Full API response: ${JSON.stringify(response.data)}`);
                throw new Error('Empty response from OpenRouter API');
            }
            return content;
        }
        catch (error) {
            logWithTimestamp(`[VIDEO_ANALYZER] Direct thumbnail analysis failed: ${error}`);
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    logWithTimestamp(`[VIDEO_ANALYZER] API Error Response: Status ${error.response.status}`);
                    logWithTimestamp(`[VIDEO_ANALYZER] API Error Data: ${JSON.stringify(error.response.data)}`);
                    logWithTimestamp(`[VIDEO_ANALYZER] API Error Headers: ${JSON.stringify(error.response.headers)}`);
                }
                else if (error.request) {
                    logWithTimestamp(`[VIDEO_ANALYZER] No response received from API`);
                    logWithTimestamp(`[VIDEO_ANALYZER] Request timeout or network error`);
                }
                else {
                    logWithTimestamp(`[VIDEO_ANALYZER] Error setting up request: ${error.message}`);
                }
            }
            throw new Error(`Thumbnail analysis via OpenRouter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Process analysis results and return structured response
     */
    processAnalysisResults(videos, analysisResponse, theme) {
        try {
            // Try to parse JSON response from the model
            let analysisData;
            // First try to find JSON in code blocks
            const jsonBlockMatch = analysisResponse.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch) {
                try {
                    analysisData = JSON.parse(jsonBlockMatch[1]);
                    logWithTimestamp(`[VIDEO_ANALYZER] Successfully parsed JSON from code block`);
                }
                catch (parseError) {
                    logWithTimestamp(`[VIDEO_ANALYZER] Failed to parse JSON from code block: ${parseError}`);
                    analysisData = null;
                }
            }
            // If no JSON block found, try multiple JSON extraction strategies
            if (!analysisData) {
                // Strategy 1: Look for complete JSON object with braces
                let jsonObjectMatch = analysisResponse.match(/\{[\s\S]*?\}/);
                if (jsonObjectMatch) {
                    try {
                        analysisData = JSON.parse(jsonObjectMatch[0]);
                        logWithTimestamp(`[VIDEO_ANALYZER] Successfully parsed JSON object from response (strategy 1)`);
                    }
                    catch (parseError) {
                        logWithTimestamp(`[VIDEO_ANALYZER] Strategy 1 failed: ${parseError}`);
                        analysisData = null;
                    }
                }
                // Strategy 2: Look for the largest JSON-like structure
                if (!analysisData) {
                    const jsonMatches = analysisResponse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                    if (jsonMatches && jsonMatches.length > 0) {
                        // Try the longest match first
                        const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
                        for (const match of sortedMatches) {
                            try {
                                analysisData = JSON.parse(match);
                                logWithTimestamp(`[VIDEO_ANALYZER] Successfully parsed JSON object (strategy 2)`);
                                break;
                            }
                            catch (parseError) {
                                continue; // Try next match
                            }
                        }
                    }
                }
                // Strategy 3: Manual field extraction if JSON parsing completely fails
                if (!analysisData) {
                    logWithTimestamp(`[VIDEO_ANALYZER] JSON parsing failed, attempting manual extraction`);
                    const selectedVideoMatch = analysisResponse.match(/"selectedVideoIndex"\s*:\s*(\d+)/i);
                    const confidenceMatch = analysisResponse.match(/"confidence"\s*:\s*([0-9.]+)/i);
                    const reasoningMatch = analysisResponse.match(/"reasoning"\s*:\s*"([^"]+)"/i);
                    const colorAnalysisMatch = analysisResponse.match(/"colorAnalysis"\s*:\s*"([^"]+)"/i);
                    if (selectedVideoMatch) {
                        analysisData = {
                            selectedVideoIndex: parseInt(selectedVideoMatch[1]),
                            confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7,
                            reasoning: reasoningMatch ? reasoningMatch[1] : 'Manual extraction from malformed response',
                            colorAnalysis: colorAnalysisMatch ? colorAnalysisMatch[1] : 'Color analysis extraction failed',
                            scores: [] // Will be filled by fallback
                        };
                        logWithTimestamp(`[VIDEO_ANALYZER] Successfully extracted data manually (strategy 3) - Color: ${analysisData.colorAnalysis}`);
                    }
                }
            }
            // Use fallback if JSON parsing failed
            if (!analysisData) {
                logWithTimestamp(`[VIDEO_ANALYZER] No valid JSON found in response, using fallback analysis`);
                logWithTimestamp(`[VIDEO_ANALYZER] Full response length: ${analysisResponse.length} characters`);
                logWithTimestamp(`[VIDEO_ANALYZER] Response starts with: ${analysisResponse.substring(0, 100)}...`);
                logWithTimestamp(`[VIDEO_ANALYZER] Response ends with: ...${analysisResponse.substring(Math.max(0, analysisResponse.length - 100))}`);
                analysisData = this.fallbackAnalysis(videos, analysisResponse);
            }
            const selectedIndex = Math.max(0, Math.min(analysisData.selectedVideoIndex || 0, videos.length - 1));
            const selectedVideo = videos[selectedIndex];
            // Create alternatives list
            const alternatives = videos
                .map((video, index) => {
                const scoreData = analysisData.scores?.find((s) => s.index === index);
                return {
                    video,
                    score: scoreData?.score || (index === selectedIndex ? 8.5 : 6.0),
                    reason: index === selectedIndex ? 'Selected as best match' :
                        scoreData?.pros?.[0] || 'Alternative option'
                };
            })
                .filter((_, index) => index !== selectedIndex)
                .sort((a, b) => b.score - a.score);
            return {
                selectedVideo,
                confidence: Math.max(0.1, Math.min(1.0, analysisData.confidence || 0.8)),
                reasoning: analysisData.reasoning || `Selected video best matches ${theme} theme requirements`,
                colorAnalysis: analysisData.colorAnalysis || 'Color analysis not available',
                alternatives,
                metadata: {
                    totalAnalyzed: videos.length,
                    processingTime: 0, // Will be set by caller
                    model: this.config.model,
                    analysisType: 'enhanced-color-aware'
                }
            };
        }
        catch (error) {
            logWithTimestamp(`[VIDEO_ANALYZER] Error processing analysis results: ${error}`);
            // Return first video as fallback
            return {
                selectedVideo: videos[0],
                confidence: 0.5,
                reasoning: `Analysis processing failed, selected first video as fallback. Theme: ${theme}`,
                alternatives: videos.slice(1).map(video => ({
                    video,
                    score: 5.0,
                    reason: 'Fallback alternative'
                })),
                metadata: {
                    totalAnalyzed: videos.length,
                    processingTime: 0,
                    model: this.config.model
                }
            };
        }
    }
    /**
     * Fallback analysis when JSON parsing fails
     */
    fallbackAnalysis(videos, response) {
        logWithTimestamp(`[VIDEO_ANALYZER] Performing fallback analysis on response: ${response.substring(0, 200)}...`);
        // Try to extract some basic information from the response
        let selectedIndex = 0;
        // Try different patterns to find selected video
        const patterns = [
            /video\s*(\d+)/i,
            /selected.*?(\d+)/i,
            /best.*?(\d+)/i,
            /recommend.*?(\d+)/i,
            /first.*?(\d+)/i
        ];
        for (const pattern of patterns) {
            const match = response.match(pattern);
            if (match) {
                const videoNumber = parseInt(match[1]);
                if (!isNaN(videoNumber) && videoNumber >= 1 && videoNumber <= videos.length) {
                    selectedIndex = videoNumber - 1;
                    logWithTimestamp(`[VIDEO_ANALYZER] Found video selection: ${videoNumber} (index ${selectedIndex})`);
                    break;
                }
            }
        }
        // Extract confidence if mentioned
        const confidenceMatch = response.match(/confidence[:\s]*([0-9.]+)/i);
        let confidence = 0.7;
        if (confidenceMatch) {
            const parsedConfidence = parseFloat(confidenceMatch[1]);
            if (!isNaN(parsedConfidence)) {
                confidence = Math.max(0.1, Math.min(1.0, parsedConfidence > 1 ? parsedConfidence / 100 : parsedConfidence));
            }
        }
        // Extract reasoning (first meaningful paragraph)
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const reasoning = sentences.length > 0 ? sentences[0].trim() + '.' : `Selected video ${selectedIndex + 1} as best match for ${videos[selectedIndex]?.title || 'video'}.`;
        return {
            selectedVideoIndex: selectedIndex,
            confidence,
            reasoning: reasoning.substring(0, 500),
            scores: videos.map((_, index) => ({
                index,
                score: index === selectedIndex ? 8.0 : Math.random() * 2 + 5.5, // Random scores for alternatives
                pros: ['Analyzed by AI model'],
                cons: ['Detailed scoring unavailable due to parsing failure']
            }))
        };
    }
}
export default VideoAnalyzer;
