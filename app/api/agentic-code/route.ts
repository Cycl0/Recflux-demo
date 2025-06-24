import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

interface CodeChange {
  type: 'insert' | 'replace' | 'delete';
  startLine: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
  code: string;
  description: string;
}

interface AgenticResponse {
  changes: CodeChange[];
  explanation: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    const { prompt, currentCode, fileName } = await req.json();

    // Create OpenRouter client using OpenAI-compatible API
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const systemPrompt = `You are a code editor that makes ONLY the exact changes requested by the user. You are NOT a code generator.

⚠️ CRITICAL RESTRICTIONS:
- DO NOT generate new code unless explicitly asked
- DO NOT rewrite existing functions
- DO NOT add features not specifically requested
- DO NOT "improve" or "optimize" code unless asked
- DO NOT add comments, documentation, or explanations in the code
- ONLY make the minimal change to satisfy the user's request

RESPONSE FORMAT: Valid JSON only, no markdown, no explanations outside the JSON:

{
  "changes": [
    {
      "type": "insert|replace|delete",
      "startLine": number,
      "endLine": number,
      "code": "exact code (empty for delete)",
      "description": "what this does"
    }
  ],
  "explanation": "why this specific change was made"
}

OPERATION RULES:
- Line numbers start at 1
- "insert": adds code BEFORE the specified line
- "replace": replaces the exact line range
- "delete": removes the exact line range (code must be "")
- Preserve exact indentation and formatting

EXAMPLES:
User: "remove line 5"
Response: {"changes":[{"type":"delete","startLine":5,"endLine":5,"code":"","description":"Remove line 5"}],"explanation":"Deleted line 5 as requested"}

User: "change line 3 to console.log('test')"
Response: {"changes":[{"type":"replace","startLine":3,"endLine":3,"code":"  console.log('test');","description":"Replace line 3"}],"explanation":"Changed line 3 to console.log statement"}

User: "add hello world after line 2"
Response: {"changes":[{"type":"insert","startLine":3,"code":"  console.log('hello world');","description":"Add hello world"}],"explanation":"Added hello world after line 2"}

Remember: Make ONLY the change requested. Nothing more, nothing less.`;

    const userPrompt = `FILE: ${fileName}
CODE:
${currentCode}

USER REQUEST: ${prompt}

Make ONLY the exact changes needed for this request. Do not add anything extra. Return JSON with the minimal changes.`;

    const { text } = await generateText({
      model: openrouter('anthropic/claude-sonnet-4'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
    });

    let response: AgenticResponse;
    try {
      response = JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Validate the response structure
    if (!response.changes || !Array.isArray(response.changes)) {
      throw new Error('Invalid response structure');
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Agentic code error:', error);
    return NextResponse.json(
      { error: 'Failed to process agentic code request' },
      { status: 500 }
    );
  }
} 