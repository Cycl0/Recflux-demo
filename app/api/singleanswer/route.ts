import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: Request) {
  try {
    // Verify API key exists
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid or missing prompt');
    }

    const { text } = await generateText({
          model: openai('gpt-4o'),
          system: 'You are a helpful assistant.',
          prompt
      });

    return new Response(text, {
      headers: { 'Content-Type': 'text/plain' }
    });

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
