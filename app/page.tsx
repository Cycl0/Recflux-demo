"use client";

import { useState } from "react";
import InputBox from "@/components/InputBox";
import CodeSection from "@/components/CodeSection";
import VideoBackground from '@/components/VideoBackground';
import UserContextCode from "@/components/UserContextCode";

export default function Home() {
  const [index, setIndex] = useState(-1);

  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  }
  
  return (
    <main className="p-36">
      <VideoBackground />
      <div id="content" className={`flex min-h-screen flex-col items-center justify-between p-12 backdrop-blur-xl opacity-[99%] shadow-gradient-2 rounded-md`}>
        <InputBox nextImageHandler={nextImageHandler} />
        <UserContextCode />
        {(index >  -1) && <CodeSection index={index} />}
      </div>
    </main>
  );
}
