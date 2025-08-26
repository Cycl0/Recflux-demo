'use client';

import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback page loaded');
        console.log('Current URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        const url = new URL(window.location.href);
        const hasCode = !!url.searchParams.get('code');
        const hasError = !!url.searchParams.get('error');

        // Handle PKCE authorization code flow
        if (hasCode && !hasError) {
          console.log('Found authorization code, exchanging for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            console.error('Code exchange failed:', error);
            if (window.opener) {
              window.opener.postMessage({ type: 'SUPABASE_AUTH_ERROR', error }, '*');
            }
            setTimeout(() => window.close(), 1000);
            return;
          }

          const session = data?.session;
          if (session && window.opener) {
            console.log('Session obtained via code exchange:', session);
            try {
              // Persist session in opener directly to avoid timing issues
              await window.opener?.supabase?.auth?.setSession?.({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              });
            } catch (_) {}
            window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS', session }, '*');
            setTimeout(() => window.close(), 500);
            return;
          }

          // Fallback: try to read session after short delay
          setTimeout(async () => {
            const { data: { session: refreshed } } = await supabase.auth.getSession();
            if (refreshed && window.opener) {
              window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS', session: refreshed }, '*');
            } else if (window.opener) {
              window.opener.postMessage({ type: 'SUPABASE_AUTH_ERROR', error: 'No session after code exchange' }, '*');
            }
            setTimeout(() => window.close(), 500);
          }, 1000);
          return;
        }
        
        // Check if we have a hash with auth tokens
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log('Found access_token in hash, processing...');
          
          // Let Supabase process the hash automatically
          // The auth state change should be triggered automatically
          const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change in callback:', event, session);
            
            if (event === 'SIGNED_IN' && session) {
              console.log('Successfully signed in:', session);
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SUPABASE_AUTH_SUCCESS',
                  session: session
                }, '*');
              }
              
              // Clean up listener and close window
              authListener.data.subscription.unsubscribe();
              setTimeout(() => window.close(), 1000);
            } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
              console.log('Auth failed or signed out');
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SUPABASE_AUTH_ERROR',
                  error: 'Authentication failed'
                }, '*');
              }
              authListener.data.subscription.unsubscribe();
              setTimeout(() => window.close(), 1000);
            }
          });
          
          // Also try to get session directly after a short delay
          setTimeout(async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session && window.opener) {
              console.log('Got session directly:', session);
              window.opener.postMessage({
                type: 'SUPABASE_AUTH_SUCCESS',
                session: session
              }, '*');
              authListener.data.subscription.unsubscribe();
              setTimeout(() => window.close(), 500);
            }
          }, 2000);
          
        } else {
          // No hash or already processed, check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session) {
            console.log('Existing session found:', session);
            if (window.opener) {
              window.opener.postMessage({
                type: 'SUPABASE_AUTH_SUCCESS',
                session: session
              }, '*');
            }
          } else {
            console.log('No session found, error:', error);
            if (window.opener) {
              window.opener.postMessage({
                type: 'SUPABASE_AUTH_ERROR',
                error: error || 'No session found'
              }, '*');
            }
          }
          
          setTimeout(() => window.close(), 1000);
        }
        
      } catch (err) {
        console.error('Auth callback error:', err);
        if (window.opener) {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_ERROR', error: err }, '*');
        }
        setTimeout(() => window.close(), 1000);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#15171c]">
        <LoadingSpinner theme='dark' size='lg' message='Autenticação completa. Fechando...'/>
    </div>
  );
} 