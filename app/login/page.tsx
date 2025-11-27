'use client';

import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  useEffect(() => {
    const signIn = async () => {
      // Get the correct origin - use current window's origin
      const currentOrigin = window.location.origin;
      
      // Build the redirect URL based on current environment
      let redirectUrl = `${currentOrigin}/auth/callback`;
      
      // Determine if we're in development or production
      const isLocalhost = currentOrigin.includes('localhost');
      const isProduction = currentOrigin.includes('recflux.vercel.app') || currentOrigin.includes('vercel.app');
      
      if (isLocalhost) {
        redirectUrl = 'http://localhost:3000/auth/callback';
      } else if (isProduction) {
        redirectUrl = 'https://recflux.com.br/auth/callback';
      }
      
      console.log('Current origin:', currentOrigin);
      console.log('Is localhost:', isLocalhost);
      console.log('Is production:', isProduction);
      console.log('Final redirect URL:', redirectUrl);
      
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
    };
    signIn();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#15171c]">
        <LoadingSpinner theme='dark' size='lg' message='Redirecionando para o login do Google...'/>
    </div>
  );
} 