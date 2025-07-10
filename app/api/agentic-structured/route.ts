import { NextRequest, NextResponse } from 'next/server';
import { type } from 'os';

// The URL of our new, external microservice.
// It's recommended to store this in an environment variable.
const MICROSERVICE_URL = process.env.AGENTIC_STRUCTURED_LB_URL || 'http://localhost:3001/api/agentic';

/**
 * This route acts as a streaming BFF.
 * It forwards the client request to the microservice and pipes the
 * microservice's streaming response directly back to the client.
 */
export async function POST(req: NextRequest) {
  console.log('[BFF] /api/agentic-structured hit. Forwarding to microservice...');
  
  try {
    // Parse the request body
    const body = await req.json();
    
    // Check for user ID or email in the request body
    const userId = body.userId;
    const userEmail = body.userEmail;
    
    if (!userId && !userEmail) {
      console.error('[BFF] No user ID or email found in request');
      return new NextResponse(JSON.stringify({ 
        error: 'Authentication required',
        explanation: 'User ID or email is required. Please make sure you are logged in.'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[BFF] Forwarding request for user:', userEmail || userId);

    // Forward request to microservice
    const microserviceResponse = await fetch(MICROSERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), // The body now contains userId and/or userEmail
    });

    if (!microserviceResponse.ok) {
      const errorBody = await microserviceResponse.text();
      console.error(`[BFF] Microservice error: ${errorBody}`);
      // Forward the exact error and status from the microservice
      return new NextResponse(errorBody, { 
        status: microserviceResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const responseText = await microserviceResponse.text();
    console.log('[BFF] Received full response from microservice. Now extracting clean JSON...');

    // The AI response is wrapped in a markdown code block. Extract the raw JSON.
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

    // Send the clean, extracted JSON string to the client.
    const cleanJsonString = jsonMatch[1];
    console.log('[BFF] Sending extracted and cleaned JSON to client.');
    return new NextResponse(cleanJsonString, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[BFF] Error in BFF:', error);
    return new NextResponse(JSON.stringify({ error: 'An internal error occurred in the BFF.' }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 