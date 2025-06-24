import React from 'react';

export function ChatMessageSkeleton({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  return (
    <div className="flex justify-start mb-4 animate-pulse">
      <div className="relative mb-2">
        <div className={`w-6 h-6 rounded-full ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
        }`} />
      </div>
      <div className={`ml-2 max-w-[80%] w-full px-4 py-3 rounded-lg ${
        theme === 'dark' 
          ? 'bg-white/10' 
          : 'bg-gray-200'
      }`}>
        <div className="space-y-3">
          <div className={`h-2.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ width: '90%' }} />
          <div className={`h-2.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ width: '80%' }} />
          <div className={`h-2.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ width: '95%' }} />
          <div className={`h-2.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
} 