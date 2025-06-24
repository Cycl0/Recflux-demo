import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

interface CodeChange {
  type: 'insert' | 'replace' | 'delete';
  startLine: number;
  endLine?: number;
  code: string;
  description: string;
}

interface AgenticResponse {
  changes?: CodeChange[];
  explanation: string;
  hasChanges: boolean;
}

export async function POST(req: NextRequest) {
  try {
    // Verify API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    const { messages, currentCode, fileName, chatAction } = await req.json();

    // Create OpenRouter client using OpenAI-compatible API
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    let systemPrompt = '';
    let shouldMakeChanges = false;

    // Determine system prompt based on chat action
    switch (chatAction) {
      case 'GERAR':
        systemPrompt = `You are a React code generator. Generate clean, functional React code based on user requests.

Rules:
- Output code in React format
- Replace export default with render(<Component/>)
- Do not use imports
- Format code in a code block
- Add brief comments above the code block explaining what it does
- Focus on creating complete, working components`;
        break;

      case 'EDITAR':
        shouldMakeChanges = true;
        systemPrompt = `You are a precise code editor. Make only the specific changes requested by the user.

CURRENT CODE:
\`\`\`
${currentCode}
\`\`\`

Rules:
- Make ONLY the changes requested
- Do not rewrite entire functions unless necessary
- Preserve existing code structure
- Maintain proper indentation
- Explain what changes you made and why

Respond with a clear explanation of the changes made.`;
        break;

      case 'FOCAR':
        systemPrompt = `You are a code focus assistant. Extract and show only the relevant parts of the code.

CURRENT CODE:
\`\`\`
${currentCode}
\`\`\`

Rules:
- Extract only the elements that match the user's request
- Keep the original structure with <>[...]</> if multiple elements
- Maintain the function wrapper and render method
- Do not rewrite everything, just focus on the requested parts`;
        break;

      case 'CHAT':
        systemPrompt = `You are a helpful coding assistant. Discuss the code and answer questions without making changes.

CURRENT CODE CONTEXT:
\`\`\`
${currentCode}
\`\`\`

Rules:
- Use the code context to provide meaningful responses
- Do not edit or rewrite the code
- Provide explanations, suggestions, or answers based on the code
- Be conversational and helpful`;
        break;

      case 'AGENTIC':
        systemPrompt = `You are a helpful coding assistant discussing code changes.

The user is requesting code changes that will be processed automatically. Your role is to:
- Acknowledge their request
- Explain what changes you understand they want
- Provide context about the changes
- Be conversational and helpful

Do NOT output JSON or code blocks. Just have a normal conversation about the requested changes.

CURRENT CODE CONTEXT:
\`\`\`
${currentCode}
\`\`\`

Be helpful and conversational while discussing their code change request.`;
        break;

      default:
        systemPrompt = `You are a helpful coding assistant. Provide clear, concise responses about code and programming.`;
    }

    // Add file context if available
    if (fileName && currentCode && chatAction !== 'GERAR') {
      systemPrompt += `\n\nCurrent file: ${fileName}\n`;
    }

    const result = streamText({
      model: openrouter('anthropic/claude-sonnet-4'),
      system: systemPrompt,
      messages,
      temperature: chatAction === 'AGENTIC' ? 0 : 0.1,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Agentic Chat API Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 