import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    // Verify API key exists
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    const { messages } = await req.json();

    // Validate messages format
    if (!Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }

      const result = streamText({
          model: openai('gpt-4o'),
          system: 'You are a helpful assistant.',
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
