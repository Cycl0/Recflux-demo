"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export default function Modal({ isOpen, onClose, imageSrc }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isMounted) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black transition-opacity duration-300"
           style={{ opacity: isOpen ? 0.7 : 0 }} />
      <div 
        className={`absolute inset-0 transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-[40%] opacity-0'
        }`}
      >
        <Image
          src={imageSrc}
          alt="Demo image"
          layout="fill"
          objectFit="contain"
          quality={100}
        />
      </div>
    </div>,
    document.body
  );
}