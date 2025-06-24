import React from 'react';

const ProTag = () => {
  return (
    <>
      <style jsx>{`
        .pro-tag-container {
          display: inline-block;
          margin-left: 10px;
          border-radius: 50px; /* Circular edges */
          padding: 2px; /* Defines border thickness */
          background: linear-gradient(90deg, #d72cff, #a450ff, #50a9ff, #50e6ff, #a4ff50, #d72cff);
          background-size: 300% 300%;
          animation: gradient-animation 4s ease infinite;
        }

        .pro-tag-inner {
          background: #1a1d22;
          padding: 0.2em 0.8em;
          border-radius: 48px; /* Slightly smaller to fit inside */
          display: block;
        }
        
        .pro-tag-text {
          font-size: 0.8rem;
          font-weight: 600;
          background: linear-gradient(90deg, #d72cff, #a450ff, #50a9ff, #50e6ff, #a4ff50, #d72cff);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradient-animation 4s ease infinite;
        }

        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="pro-tag-container">
        <div className="pro-tag-inner">
          <span className="pro-tag-text">PRO</span>
        </div>
      </div>
    </>
  );
};

export default ProTag; 