import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  // Only apply to API routes that require authentication
  if (req.nextUrl.pathname.startsWith('/api/agentic-structured')) {
    console.log('[Middleware] Processing request to', req.nextUrl.pathname);
    
    // Create a response to modify
    const res = NextResponse.next();
    
    // Create a Supabase client for the middleware
    const supabase = createMiddlewareClient({ req, res });
    
    // Debug cookies
    const cookies = req.cookies.getAll();
    console.log('[Middleware] Cookies present:', cookies.map(c => c.name));
    
    // Check if the user is authenticated
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('[Middleware] Authentication error:', error.message);
        return new NextResponse(
          JSON.stringify({ error: 'Authentication error', message: error.message }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (!data.session) {
        console.log('[Middleware] No session found');
        
        // Try to get the user directly
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user) {
          console.log('[Middleware] Found user via getUser:', userData.user.email);
          // User is authenticated but session might be missing in the request
          // Let the request continue and handle authentication in the API route
          return res;
        }
        
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[Middleware] User authenticated:', data.session.user.email);
      return res;
    } catch (err) {
      console.error('[Middleware] Unexpected error:', err);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error in authentication middleware' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // For all other routes, continue
  return NextResponse.next();
}

// Configure the middleware to run only for specific paths
// Temporarily disable for agentic-structured
export const config = {
  matcher: ['/api/disabled-for-now/:path*']
}; 