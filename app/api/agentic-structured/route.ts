import { NextRequest, NextResponse } from 'next/server';
import { type } from 'os';

// The URL of our new, external microservice.
// It's recommended to store this in an environment variable.
const MICROSERVICE_URL = process.env.AGENTIC_STRUCTURED_LB_URL || 'http://localhost:3001/api/agentic';

/**
 * Enhanced logging function
 */
function logInfo(message: string, data?: any) {
  console.log(`[BFF-INFO] ${message}`, data ? data : '');
}

function logError(message: string, error?: any) {
  console.error(`[BFF-ERROR] ${message}`);
  
  if (error) {
    if (error instanceof Error) {
      console.error(`[BFF-ERROR] Name: ${error.name}`);
      console.error(`[BFF-ERROR] Message: ${error.message}`);
      console.error(`[BFF-ERROR] Stack: ${error.stack}`);
    } else {
      console.error('[BFF-ERROR] Raw error data:', error);
    }
  }
}

function logRequest(req: NextRequest, body: any) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  logInfo('Request details', {
    url: req.url,
    method: req.method,
    headers: headers,
    // Sanitize sensitive data before logging
    body: {
      ...body,
      userId: body.userId ? `${body.userId.substring(0, 4)}...` : undefined
    }
  });
}

/**
 * This route acts as a streaming BFF.
 * It forwards the client request to the microservice and pipes the
 * microservice's streaming response directly back to the client.
 */
export async function POST(req: NextRequest) {
  logInfo('Endpoint hit. Forwarding to microservice...');
  logInfo(`Using microservice URL: ${MICROSERVICE_URL}`);
  
  try {
    // Parse the request body
    const body = await req.json();
    
    // Log request details (with sensitive data sanitized)
    logRequest(req, body);
    
    // Check for user ID in the request body
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
    
    logInfo('Forwarding request for user', { 
      userId: userId ? `${userId.substring(0, 4)}...` : undefined
    });

    // Forward request to microservice
    logInfo('Sending request to microservice', { url: MICROSERVICE_URL });
    const startTime = Date.now();
    
    try {
      const microserviceResponse = await fetch(MICROSERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), // The body now contains userId and/or userEmail
      });
      
      const responseTime = Date.now() - startTime;
      logInfo(`Microservice responded in ${responseTime}ms with status: ${microserviceResponse.status}`);

      if (!microserviceResponse.ok) {
        const errorBody = await microserviceResponse.text();
        logError(`Microservice error (${microserviceResponse.status}): ${errorBody}`);
        
        // Try to parse as JSON to provide better error details
        try {
          const errorJson = JSON.parse(errorBody);
          logError('Parsed error response', errorJson);
        } catch (parseError) {
          logError('Could not parse error response as JSON', { raw: errorBody });
        }
        
        // Forward the exact error and status from the microservice
        return new NextResponse(errorBody, { 
          status: microserviceResponse.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const responseText = await microserviceResponse.text();
      logInfo(`Received ${responseText.length} bytes from microservice`);
      
      if (responseText.length < 100) {
        logInfo('Full response (short):', responseText);
      } else {
        logInfo('Response preview:', responseText.substring(0, 100) + '...');
      }
      
      logInfo('Extracting clean JSON from response...');

      // The AI response is wrapped in a markdown code block. Extract the raw JSON.
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

      if (!jsonMatch || !jsonMatch[1]) {
        // Fallback for cases where the AI might return raw JSON without markdown.
        logInfo('No JSON code block found, trying to extract raw JSON...');
        const rawJsonMatch = responseText.match(/{[\s\S]*}/);
        
        if (!rawJsonMatch) {
          logError('No valid JSON found in microservice response');
          logError('Raw response:', responseText);
          return new NextResponse(
            JSON.stringify({ 
              error: 'Failed to extract JSON from AI response.', 
              rawResponse: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        logInfo('Found raw JSON, sending to client');
        return new NextResponse(rawJsonMatch[0], {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Send the clean, extracted JSON string to the client.
      const cleanJsonString = jsonMatch[1];
      logInfo('Successfully extracted JSON from code block');
      
      try {
        // Validate JSON by parsing it
        const parsedJson = JSON.parse(cleanJsonString);
        logInfo('JSON is valid');
      } catch (parseError) {
        logError('Extracted JSON is not valid', parseError);
        logError('Invalid JSON content:', cleanJsonString);
      }
      
      return new NextResponse(cleanJsonString, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      logError('Fetch to microservice failed', fetchError);
      return new NextResponse(JSON.stringify({ 
        error: 'Failed to communicate with the microservice',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    logError('Unhandled error in BFF', error);
    
    // Check for specific error types
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
      error: 'An internal error occurred in the BFF.',
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 