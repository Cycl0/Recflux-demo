"use client";
import React from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button } from "flowbite-react";
import Link from 'next/link';

const TesteAgoraButton: React.FC = () => {
  const handleClick = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/pages/editor`
      }
    });
  };
  return (
    <Link href={`/pages/editor`}>
      <Button
        onClick={handleClick}
        className="
          xs:!block hidden
          text-blue-900 bg-blue-100
          focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium
          rounded-md text-sm px-4 text-center
          hover:bg-black/[0.07] border-2 hover:border-green-400 hover:outline-none hover:text-green-300
          transition-all transform-gpu  duration-1000 ease-in-out hover:scale-[105%] group hover:z-20 focus:z-20
          hover:shadow-gradient hover:backdrop-blur-md"
      >
        Teste agora
      </Button>
    </Link>
  );
};

export default TesteAgoraButton; 