"use client";

import { useState } from "react";
import InputBox from "@/components/InputBox";
import GeneratedSection from "@/components/GeneratedSection";
import VideoBackground from '@/components/VideoBackground';
import NavBar from '@/components/NavBar';
import { Button } from "flowbite-react";

export default function Home() {
    const [index, setIndex] = useState(-1);

    function nextImageHandler() {
        setIndex((prevIndex) => prevIndex + 1);
  }
  return (
        <>
            <NavBar>
                <Button className="
                       text-blue-900 bg-blue-100
                       focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium
                       rounded-md text-sm px-4 text-center
                       hover:bg-black/[0.07] border-2 hover:border-green-400 hover:outline-none hover:text-green-300
                       transition-all transform-gpu  duration-1000 ease-in-out hover:scale-[105%] group hover:z-20 focus:z-20
                       hover:shadow-gradient hover:backdrop-blur-md"
                >
                    Teste agora
                </Button>
            </NavBar>
            <main className="xl:!p-36 lg:!p-12 md:!p-8 sm:!p-4">
                <VideoBackground />
                <div id="content" className={`min-h-screen items-center justify-between py-20 px-12  rounded-md`}>
                    <InputBox nextImageHandler={nextImageHandler} />
                    {(index > -1) && <GeneratedSection index={index}/>}
                </div>
            </main>
        </>
    );
}
