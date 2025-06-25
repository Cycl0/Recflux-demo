'use client';

import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  useEffect(() => {
    const signIn = async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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