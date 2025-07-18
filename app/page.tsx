"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import InputBox from "@/components/InputBox";
import GeneratedSection from "@/components/GeneratedSection";
import NavBar from '@/components/NavBar';
import { Button } from "flowbite-react";
import {emptyFiles, initialFiles} from "@/utils/files-editor";
import { throttle } from 'lodash';
import Link from 'next/link';
import Spline from '@splinetool/react-spline';
import { useRouter } from 'next/navigation';
import AOS from 'aos';
import 'aos/dist/aos.css';
import React from "react";

export default function Home() {

    const [index, setIndex] = useState(-1);


   // Editor
   const [editorOpen, setEditorOpen] = useState(false);
  const throttleEditorOpen = useCallback(
    throttle((newMode) => {
      setEditorOpen(newMode);
    }, 1000),
    []
  );


    // Files
    const [filesRecentPrompt, setFilesRecentPrompt] = useState([]);
    const [filesCurrent, setFilesCurrent] = useState([initialFiles]);
    const [filesGenerated, setFilesGenerated] = useState([]);

    const [selectedFile, setSelectedFile] = useState(filesCurrent[0]["index.html"]);
    const handleFileSelect = (fileName) => (e) => {
        e.preventDefault();
        setSelectedFile(filesCurrent[0][fileName]);
    };

    // Compose Handlers
  function setFilesHandler(setter, fileName, content, desc, index = 0) {
    setter(prevState => {
        const newState = [...prevState];

        // Ensure the array has enough elements
        while (newState.length <= index) {
            newState.push({ ...emptyFiles });
        }

        console.log("Before update:", newState[index]);

        // Defensive check
        if (!newState[index]) {
            newState[index] = { ...emptyFiles };
        }

        newState[index] = {
            ...newState[index],
            [fileName]: {
                ...(newState[index][fileName] || {}),  // Defensive
                value: content,
                desc: desc
            },
        };

        console.log("After update:", newState[index]);

        return newState;
    });
}

    // Handlers
    const setFilesGeneratedHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesGenerated, fileName, content, getDateTime(), index);
    const setFilesRecentPromptHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesRecentPrompt, fileName, content, getDateTime(), index);
    const setFilesCurrentHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesCurrent, fileName, content, getDateTime(), index);

    function indexHandler(index) {
        setIndex(index);
    }

    function getDateTime() {
        const date = new Date();
        const currentDate = (date.getMonth() + 1) + "-" + date.getDate();
        const currentTime = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        return currentDate + "-" + currentTime;
    }

   // diff
    const [codeData, setCodeData] = useState([]);

    // fetch

    const [demoThumbnails, setDemoThumbnails] = useState([]);
    const [demoUrl, setDemoUrl] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const codeResponse = await fetch('/api/code');
                const urlResponse = await fetch('/api/url');

                const codeData = await codeResponse.json();
                const urlData = await urlResponse.json();
                const thumbnailUrlsData = await Promise.all(
                    urlData.map(async (url) => {
                        try {
                            const response = await fetch(`/api/thumbnail?url=${encodeURIComponent(url)}`);
                            if (!response.ok) {
                                console.error(`Failed to fetch thumbnail for ${url}:`, response.status, response.statusText);
                                const text = await response.text();
                                console.error('Response body:', text);
                                return null; // or a placeholder image URL
                            }
                            const blob = await response.blob();
                            return URL.createObjectURL(blob);
                        } catch (error) {
                            console.error(`Error fetching thumbnail for ${url}:`, error);
                            return null; // or a placeholder image URL
                        }
                    })
                );
                setCodeData(codeData || []);
                setFilesGeneratedHandler("index.html", codeData.demoCodeHTML[0], 0);
                setFilesGeneratedHandler("style.css", codeData.demoCodeCSS[0], 0);
                setFilesGeneratedHandler("script.js", codeData.demoCodeJS[0], 0);
                setFilesGeneratedHandler("image.svg", codeData.demoSVG[0], 0);
                setDemoUrl(urlData || []);
                setDemoThumbnails(thumbnailUrlsData.filter(Boolean));
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const router = useRouter();
    const heroSectionRef = useRef(null);
    const [showArrow, setShowArrow] = useState(true);
    const [arrowGone, setArrowGone] = useState(false);
    const arrowRef = useRef(null);

    function handleTesteAgoraClick(e) {
        e.preventDefault();
        router.push('/pages/editor');
    }

    useEffect(() => {
        AOS.init({ once: true, duration: 900, offset: 80 });
    }, []);

    // Cleanup animation frames on unmount
    useEffect(() => {
        function onScroll() {
            const hero = heroSectionRef.current;
            if (!hero) return;
            const rect = hero.getBoundingClientRect();
            if (!arrowGone && rect.bottom <= 80) {
                setArrowGone(true);
            }
            setShowArrow(!arrowGone && rect.bottom > 80);
        }
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, [arrowGone]);

    return (
        <>
            <NavBar extra={
                <Link href={`/pages/editor`}>
                    <Button className="
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
            } />
            <div>
                {/* Section 1: Hero Section */}
                <div className="min-h-screen flex flex-col items-center justify-center relative">
                  <section
                    ref={heroSectionRef}
                    className="relative w-full max-w-5xl mx-auto my-12 flex flex-col md:flex-row items-center justify-center min-h-[70vh] py-10 px-4 md:px-12 z-10 gap-12 md:gap-20 bg-gradient-to-br from-[#0e7490]/60 via-[#232733]/80 to-[#15171c]/90 rounded-3xl shadow-2xl border border-cyan-700/20 backdrop-blur-xl overflow-hidden"
                  >
                    <div className="w-full max-w-xl md:w-1/2 flex-shrink-0 flex items-center justify-center">
                      <div className="w-full aspect-[4/5] md:aspect-[4/5] max-h-[480px] md:max-h-[600px] flex items-center justify-center rounded-2xl shadow-xl border border-cyan-700/30 bg-[#181c23]/70">
                        <Spline scene="https://prod.spline.design/NfRaXdJLo18x37Nj/scene.splinecode" />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left px-2 md:px-8">
                      <h1 className="text-5xl md:text-7xl font-extrabold text-white drop-shadow-xl mt-8 md:mt-0 mb-6 tracking-tight leading-tight">
                        Bem-vindo ao <span className="text-cyan-400">Recflux</span>
                      </h1>
                      <p className="text-lg md:text-2xl text-cyan-100/90 max-w-2xl mb-8 font-medium">
                        Crie, edite e gerencie projetos de código com <span className="text-cyan-300 font-semibold">IA</span>, colaboração e recursos premium para desenvolvedores modernos.
                      </p>
                      <a
                        href="/pages/editor"
                        className="inline-block mt-2 px-8 py-3 rounded-xl bg-cyan-600 text-white font-bold shadow-lg hover:bg-cyan-700 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/60 text-lg"
                        onClick={handleTesteAgoraClick}
                      >
                        Teste Agora
                      </a>
                    </div>
                  </section>
                  {/* Animated Arrow */}
                  {!arrowGone && (
                    <div
                      ref={arrowRef}
                      className={`flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2 bottom-8 z-20 transition-opacity duration-500 ${showArrow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                      style={{ willChange: 'opacity' }}
                    >
                      <span className="text-cyan-300 text-4xl md:text-5xl drop-shadow-lg" style={{
                        display: 'inline-block',
                        animation: 'arrow-bounce 1.2s infinite cubic-bezier(.6,0,.4,1)'
                      }}>
                        ↓
                      </span>
                      <span className="text-cyan-200 text-xs mt-2 opacity-80">Role para saber mais</span>
                      <style>{`
                        @keyframes arrow-bounce {
                          0%, 100% { transform: translateY(0); }
                          20% { transform: translateY(8px); }
                          40% { transform: translateY(-4px); }
                          60% { transform: translateY(8px); }
                          80% { transform: translateY(0); }
                        }
                      `}</style>
                    </div>
                  )}
                </div>
                {/* Section 2: Features Section */}
                <div className="min-h-screen flex items-center justify-center">
                    <section
                        className="relative w-full max-w-5xl mx-auto px-4 md:px-0 z-10 flex items-center justify-center min-h-screen"
                    >
                        <div className="bg-[#181c23]/80 dark:bg-[#181c23]/80 rounded-2xl shadow-xl border border-cyan-700/20 p-8 md:p-14 backdrop-blur-xl w-full">
                            <h2 className="text-3xl md:text-4xl font-bold text-cyan-300 mb-6 text-center drop-shadow-lg">O que você pode fazer com o Recflux?</h2>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-8 text-cyan-100 text-lg">
                                <li className="flex items-start gap-3">
                                    <span className="text-cyan-400 text-2xl">💡</span>
                                    Crie projetos de código a partir de templates gerados pela IA.
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-cyan-400 text-2xl">📝</span>
                                    Edite arquivos com um editor moderno, com destaque de sintaxe e recursos avançados.
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-cyan-400 text-2xl">🤖</span>
                                    Conte com assistência de IA para gerar, revisar e explicar código.
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-cyan-400 text-2xl">🚀</span>
                                    Acesse recursos premium como deploy, integrações e suporte prioritário.
                                </li>
                            </ul>
                        </div>
                    </section>
                </div>
                {/* Section 3: Editor & Generated Section */}
                <div className="min-h-screen flex items-center justify-center">
                    <main className="xl:!p-36 lg:!p-12 md:!p-8 sm:!p-4 w-full">
                        <div id="content" className={`min-h-screen items-center justify-between py-40 md:py-20 md:px-12 xs:px-4 px-2 rounded-md`}>
                            <InputBox indexHandler={indexHandler} files={initialFiles}  setFilesGeneratedHandler={setFilesGeneratedHandler}  selectedFile={selectedFile}
                                handleFileSelect={handleFileSelect}
                                editorOpen={editorOpen}
                                throttleEditorOpen={throttleEditorOpen}  codeData={codeData}
                                filesCurrent={filesCurrent} setFilesCurrentHandler={setFilesCurrentHandler}
                                filesRecentPrompt={filesRecentPrompt} setFilesRecentPromptHandler={setFilesRecentPromptHandler} />
                            {(index > -1) && (
                                <GeneratedSection
                                    initialFiles={initialFiles}
                                    index={index} indexHandler={indexHandler}
                                    filesGenerated={filesGenerated} setFilesGeneratedHandler={setFilesGeneratedHandler}
                                    filesCurrent={filesCurrent} setFilesCurrentHandler={setFilesCurrentHandler}
                                    filesRecentPrompt={filesRecentPrompt} handleFileSelect={handleFileSelect}
                                    throttleEditorOpen={throttleEditorOpen}
                                    demoThumbnails={demoThumbnails} demoUrl={demoUrl}
                                />
                            )}
                        </div>
                    </main>
                </div>
            </div>
            <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none select-none">
                <img
                    src="/images/wallpaper.png"
                    alt="Wallpaper background"
                    className="w-full h-full object-cover"
                />
            </div>
        </>
    );
}
