"use client";

import { useState } from "react";
import InputBox from "@/components/InputBox";
import GeneratedSection from "@/components/GeneratedSection";
import VideoBackground from '@/components/VideoBackground';
import NavBar from '@/components/NavBar';
import { Button } from "flowbite-react";
import initialFiles from "@/utils/files-editor";

export default function Home() {
    const [index, setIndex] = useState(-1);
    function indexHandler(index) {
        setIndex(index);
    }

    // Files
    const [filesRecentPrompt, setFilesRecentPrompt] = useState([initialFiles]);
    const [filesCurrent, setFilesCurrent] = useState([initialFiles]);
    const [filesGenerated, setFilesGenerated] = useState([initialFiles]);

    // Compose Handlers
    function setFilesHandler(setter, fileName, content, index = 0) {
        setter(prevState => {
            const newState = [...prevState];
            while (newState.length <= index) {
                newState.push({ ...initialFiles });
            }
            newState[index] = {
                ...newState[index],
                [fileName]: {
                    ...newState[index][fileName],
                    value: content
                }
            };
            return newState;
        });
    }

    // Handlers
    const setFilesGeneratedHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesGenerated, fileName, content, index);
    const setFilesRecentPromptHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesRecentPrompt, fileName, content, index);
    const setFilesCurrentHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesCurrent, fileName, content, index);

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
                    <InputBox indexHandler={indexHandler} files={initialFiles}
                            filesCurrent={filesCurrent} setFilesCurrentHandler={setFilesCurrentHandler}
                            filesRecentPrompt={filesRecentPrompt} setFilesRecentPromptHandler={setFilesRecentPromptHandler} />
                    {(index > -1) && (
                        <GeneratedSection
                            index={index} indexHandler={indexHandler}
                            filesGenerated={filesGenerated} setFilesGeneratedHandler={setFilesGeneratedHandler}
                            filesCurrent={filesCurrent} setFilesCurrentHandler={setFilesCurrentHandler}
                            filesRecentPrompt={filesRecentPrompt}
                        />
                    )}
                </div>
            </main>
        </>
    );
}
