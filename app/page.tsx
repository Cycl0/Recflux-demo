"use client";

import { useState } from "react";
import InputBox from "@/components/InputBox";
import GeneratedSection from "@/components/GeneratedSection";
import VideoBackground from '@/components/VideoBackground';

export default function Home() {
  const [index, setIndex] = useState(-1);

  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  }
  
  return (
    <main className="p-36">
      <VideoBackground />
      <div id="content" className={`min-h-screen items-center justify-between p-12 backdrop-blur-2xl opacity-[99%] shadow-gradient-2 rounded-md`}>
        <InputBox nextImageHandler={nextImageHandler} />
        {(index >  -1) && <GeneratedSection index={index} />}
      </div>
    </main>
  );
}
