import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    // Verify API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    const { messages } = await req.json();

    // Validate messages format
    if (!Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }

    // Create OpenRouter client using OpenAI-compatible API
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

      const result = streamText({
          model: openrouter('anthropic/claude-sonnet-4'),
          system: 'You are a helpful assistant.\nYou will output the code in react no matter what and will replace the export default with render(<component/>) and not use any imports. You will give the code formatted in a code block and comment about it only above the block',
          messages,
      });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('API Route Error:', error);
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
