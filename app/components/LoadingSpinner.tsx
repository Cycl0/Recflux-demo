import React from 'react';

interface LoadingSpinnerProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({ 
  theme = 'dark', 
  size = 'md', 
  message = 'Processando...' 
}: LoadingSpinnerProps) {
  const [currentMessage, setCurrentMessage] = React.useState(message);
  
  // Dynamic messages to keep users engaged
  const dynamicMessages = [
    'Analisando código...',
    'Processando solicitação...',
    'Aplicando inteligência...',
    'Quase pronto...',
    'Finalizando...'
  ];
  
  React.useEffect(() => {
    if (message === 'Processando...') {
      let index = 0;
      const interval = setInterval(() => {
        setCurrentMessage(dynamicMessages[index]);
        index = (index + 1) % dynamicMessages.length;
      }, 1500);
      
      return () => clearInterval(interval);
    } else {
      setCurrentMessage(message);
    }
  }, [message]);
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const containerSizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      {/* Main Loading Animation Container */}
      <div className={`relative ${containerSizeClasses[size]} flex items-center justify-center`}
           style={{ animation: 'float 3s ease-in-out infinite' }}>
        {/* Outer rotating ring */}
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 ${
          theme === 'dark' 
            ? 'border-cyan-400/30 border-t-cyan-400' 
            : 'border-blue-300/30 border-t-blue-500'
        } animate-spin`} 
        style={{ animationDuration: '1s' }} />
        
        {/* Middle pulsing ring */}
        <div className={`absolute inset-2 rounded-full ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-cyan-400/20 to-blue-400/20' 
            : 'bg-gradient-to-r from-blue-300/20 to-cyan-300/20'
        } animate-pulse`} 
        style={{ animationDuration: '1.5s' }} />
        
        {/* Inner counter-rotating ring */}
        <div className={`absolute inset-3 rounded-full border ${
          theme === 'dark' 
            ? 'border-blue-400/50 border-b-transparent' 
            : 'border-cyan-400/50 border-b-transparent'
        } animate-spin`} 
        style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
        
        {/* Center dot with scaling animation */}
        <div className={`w-2 h-2 rounded-full ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-cyan-400 to-blue-400' 
            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
        } animate-ping`} 
        style={{ animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite, glow 2s ease-in-out infinite' }} />
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${
                theme === 'dark' ? 'bg-cyan-300' : 'bg-blue-400'
              } animate-bounce`}
              style={{
                top: `${20 + Math.sin(i * Math.PI / 3) * 30}%`,
                left: `${50 + Math.cos(i * Math.PI / 3) * 35}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.2s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading Text with Typewriter Effect */}
      <div className="text-center">
        <div className={`text-sm font-medium ${
          theme === 'dark' ? 'text-cyan-100' : 'text-blue-700'
        } transition-all duration-500 ease-in-out`}>
          {currentMessage}
        </div>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mt-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                theme === 'dark' ? 'bg-cyan-400' : 'bg-blue-500'
              } animate-bounce`}
              style={{
                animationDelay: `${i * 0.3}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>



      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px currentColor; }
          50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
        }
        
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// Inline Loading Component for smaller spaces
export function InlineLoader({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-4 h-4 rounded-full border-2 ${
        theme === 'dark' 
          ? 'border-cyan-400/30 border-t-cyan-400' 
          : 'border-blue-300/30 border-t-blue-500'
      } animate-spin`} />
      <span className={`text-xs ${
        theme === 'dark' ? 'text-cyan-100' : 'text-blue-700'
      } animate-pulse`}>
        Carregando...
      </span>
    </div>
  );
}

// Skeleton Loading for Chat Messages
export function ChatMessageSkeleton({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="relative mb-2">
        <div className={`w-6 h-6 rounded-full ${
          theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
        } animate-pulse`} />
      </div>
      <div className={`ml-2 max-w-[80%] px-4 py-2 rounded-lg ${
        theme === 'dark' 
          ? 'bg-white/10 border border-cyan-700/70' 
          : 'bg-white border border-cyan-100'
      }`}>
        <div className="space-y-2">
          <div className={`h-3 rounded ${
            theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
          } animate-pulse`} style={{ width: '80%' }} />
          <div className={`h-3 rounded ${
            theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
          } animate-pulse`} style={{ width: '60%' }} />
          <div className={`h-3 rounded ${
            theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
          } animate-pulse`} style={{ width: '90%' }} />
        </div>
      </div>
    </div>
  );
} 