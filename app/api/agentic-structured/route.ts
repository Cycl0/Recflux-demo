import { NextRequest, NextResponse } from 'next/server';

// The URL of our new, external microservice.
// It's recommended to store this in an environment variable.
const MICROSERVICE_URL = process.env.AGENTIC_STRUCTURED_URL || 'http://localhost:3001/api/agentic';

/**
 * This route acts as a streaming BFF.
 * It forwards the client request to the microservice and pipes the
 * microservice's streaming response directly back to the client.
 */
export async function POST(req: NextRequest) {
  console.log('[BFF] /api/agentic-structured hit. Forwarding to microservice...');

  try {
    const body = await req.json();

    // 1. Get the full response from the microservice.
    // This is necessary because we need the complete text to parse it.
    const microserviceResponse = await fetch(MICROSERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!microserviceResponse.ok) {
      const errorBody = await microserviceResponse.text();
      console.error(`[BFF] Microservice error: ${errorBody}`);
      return new NextResponse(errorBody, { status: microserviceResponse.status });
    }

    const responseText = await microserviceResponse.text();
    console.log('[BFF] Received full response from microservice. Now extracting clean JSON...');

    // 2. The AI response is wrapped in a markdown code block. Extract the raw JSON.
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

    if (!jsonMatch || !jsonMatch[1]) {
      // Fallback for cases where the AI might return raw JSON without markdown.
      const rawJsonMatch = responseText.match(/{[\s\S]*}/);
      if (!rawJsonMatch) {
        console.error('[BFF] No valid JSON found in microservice response.');
        return new NextResponse(
          JSON.stringify({ error: 'Failed to extract JSON from AI response.', rawResponse: responseText }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      console.log('[BFF] Sending raw, cleaned JSON to client (fallback method).');
      return new NextResponse(rawJsonMatch[0], {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Send the clean, extracted JSON string to the client.
    const cleanJsonString = jsonMatch[1];
    console.log('[BFF] Sending extracted and cleaned JSON to client.');
    return new NextResponse(cleanJsonString, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[BFF] Error in BFF:', error);
    return new NextResponse('An internal error occurred in the BFF.', { status: 503 });
  }
} 