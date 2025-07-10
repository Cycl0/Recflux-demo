import { NextRequest, NextResponse } from 'next/server';
import { type } from 'os';

// The URL of our new, external microservice.
const MICROSERVICE_URL = process.env.AGENTIC_STRUCTURED_LB_URL || 'http://localhost:3001/api/agentic';

/**
 * Enhanced logging function
 */
function logInfo(message: string, data?: any) {
  console.log(`[BFF-INFO] ${message}`, data ? data : '');
}

function logError(message: string, error?: any) {
  console.error(`[BFF-ERROR] ${message}`, error ? (error.stack || error) : '');
}

/**
 * Extracts a clean JSON string from text that may be wrapped in markdown.
 * @param text The raw response text from the microservice.
 * @returns A clean JSON string or null if no valid JSON is found.
 */
function extractJson(text: string): string | null {
  // First, try to find a JSON block wrapped in ```json
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      // Validate that the extracted part is valid JSON before returning
      JSON.parse(jsonMatch[1]);
      return jsonMatch[1].trim();
    } catch {
      // Invalid JSON, fall through to the next check.
    }
  }

  // If not found or invalid, try to find a raw JSON object in the text
  const rawJsonMatch = text.match(/{[\s\S]*}/);
  if (rawJsonMatch && rawJsonMatch[0]) {
    try {
      // Validate this fallback match as well
      JSON.parse(rawJsonMatch[0]);
      return rawJsonMatch[0].trim();
    } catch {
      // Not valid JSON.
    }
  }

  // If no valid JSON is found anywhere, return null.
  return null;
}

/**
 * This route acts as a streaming BFF.
 * It forwards the client request to the microservice and pipes the
 * microservice's streaming response directly back to the client.
 */
export async function POST(req: NextRequest) {
  logInfo('Endpoint hit. Forwarding to microservice...');
  
  try {
    const body = await req.json();
    const userId = body.userId;
    
    if (!userId) {
      logError('No user ID found in request');
      return new NextResponse(JSON.stringify({ 
        error: 'Authentication required',
        explanation: 'User ID is required. Please make sure you are logged in.'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Forward request to microservice
    const microserviceResponse = await fetch(MICROSERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!microserviceResponse.ok) {
      const errorBody = await microserviceResponse.text();
      logError(`Microservice error (${microserviceResponse.status}): ${errorBody}`);
      return new NextResponse(errorBody, { 
        status: microserviceResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const responseText = await microserviceResponse.text();
    const cleanJsonString = extractJson(responseText);

    if (!cleanJsonString) {
      logError('No valid JSON found in microservice response', { raw: responseText });
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to extract valid JSON from AI response.', 
          rawResponse: responseText.substring(0, 500)
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    logInfo('Successfully extracted JSON, sending to client');
    return new NextResponse(cleanJsonString, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logError('Unhandled error in BFF', error);
    
    if (error instanceof SyntaxError) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: error.message
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new NextResponse(JSON.stringify({ 
      error: 'An internal server error occurred.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 