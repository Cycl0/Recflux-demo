"use client";

import { useState, useEffect } from "react";
import InputBox from "@/components/InputBox";
import GeneratedSection from "@/components/GeneratedSection";
import VideoBackground from '@/components/VideoBackground';
import NavBar from '@/components/NavBar';
import { Button } from "flowbite-react";
import {emptyFiles, initialFiles} from "@/utils/files-editor";

export default function Home() {

    const [index, setIndex] = useState(-1);

    // Files
    const [filesRecentPrompt, setFilesRecentPrompt] = useState([]);
    const [filesCurrent, setFilesCurrent] = useState([initialFiles]);
    const [filesGenerated, setFilesGenerated] = useState([]);

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
    //

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


    return (
        <>
            <NavBar extra={
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
            } />
            <main className="xl:!p-36 lg:!p-12 md:!p-8 sm:!p-4">
                <VideoBackground />
                <div id="content" className={`min-h-screen items-center justify-between py-40 md:py-20 md:px-12 xs:px-4 px-2 rounded-md`}>
                    <InputBox indexHandler={indexHandler} files={initialFiles}  setFilesGeneratedHandler={setFilesGeneratedHandler} codeData={codeData}
                            filesCurrent={filesCurrent} setFilesCurrentHandler={setFilesCurrentHandler}
                            filesRecentPrompt={filesRecentPrompt} setFilesRecentPromptHandler={setFilesRecentPromptHandler} />
                    {(index > -1) && (
                        <GeneratedSection
                            initialFiles={initialFiles}
                            index={index} indexHandler={indexHandler}
                            filesGenerated={filesGenerated} setFilesGeneratedHandler={setFilesGeneratedHandler}
                            filesCurrent={filesCurrent} setFilesCurrentHandler={setFilesCurrentHandler}
                            filesRecentPrompt={filesRecentPrompt}
                            demoThumbnails={demoThumbnails} demoUrl={demoUrl}
                        />
                    )}
                </div>
            </main>
        </>
    );
}
