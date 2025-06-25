'use client';

import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session to verify authentication
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && window.opener) {
          // Send a message to the parent window that login was successful
          window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS', session }, window.location.origin);
        } else if (error) {
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({ type: 'SUPABASE_AUTH_ERROR', error }, window.location.origin);
          }
        }
        
        // Close the popup after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
      } catch (err) {
        console.error('Auth callback error:', err);
        if (window.opener) {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_ERROR', error: err }, window.location.origin);
        }
        setTimeout(() => {
          window.close();
        }, 1000);
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