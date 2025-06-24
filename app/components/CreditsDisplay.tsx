"use client";
import React from 'react';

interface CreditsDisplayProps {
  credits: number | null;
  loading: boolean;
}

const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ credits, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center px-3 py-1 mr-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const isLowCredits = (credits || 0) < 50;
  const isNoCredits = (credits || 0) < 10;

  return (
    <div className={`flex items-center px-3 py-1 mr-2 backdrop-blur-md rounded-full border text-sm font-medium shadow-lg ${
      isNoCredits 
        ? 'bg-red-500/20 border-red-500/40 text-red-200 shadow-red-500/50'
        : isLowCredits 
          ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200 shadow-yellow-500/50'
          : 'bg-white/10 border-white/20 text-white shadow-cyan-400/50'
    }`}
    title={
      isNoCredits 
        ? 'Sem créditos suficientes! Compre mais créditos para continuar usando.'
        : isLowCredits 
          ? 'Créditos baixos! Considere comprar mais para não interromper seu trabalho.'
          : 'Créditos'
    }>
      <span className={`mr-2 ${
        isNoCredits ? 'text-red-400' : isLowCredits ? 'text-yellow-400' : 'text-cyan-400'
      }`}>💎</span>
      <span>{credits || 0}</span>
      {isNoCredits && <span className="ml-2 text-xs">⚠️</span>}
      {isLowCredits && !isNoCredits && <span className="ml-2 text-xs">⚡</span>}
    </div>
  );
};

export default CreditsDisplay; 