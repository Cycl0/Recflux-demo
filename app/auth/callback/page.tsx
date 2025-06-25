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