"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { Responsive, WidthProvider } from "react-grid-layout";
import NavBar from '@/components/NavBar';
import NavStyledDropdown from '@/components/NavStyledDropdown';
import Editor from "@monaco-editor/react";
import CustomGridItem from "@/components/CustomGridItem";
import 'react-resizable/css/styles.css';
import { LiveProvider, LiveEditor, LivePreview, LiveError } from "react-live";
import {emptyFiles, initialFiles} from "@/utils/files-editor";
import { throttle } from 'lodash';

import { Button } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers'; // Represents "overlap on"
import LayersClearIcon from '@mui/icons-material/LayersClear'; // Represents "overlap off"

import { useChat } from 'ai/react'
import CopyButton from '@/components/CopyButton'
import { Bot, User } from 'lucide-react'
import TextareaAutosize from 'react-textarea-autosize';
import IconSend from "@/components/IconSend";

import { useRouter } from 'next/navigation';

function Chat() {
  const chat = useChat({
    api: '/api/chat',
  });
  const { messages, input, handleInputChange, handleSubmit, isLoading } = chat;

  const [allCodeGenerated, setAllCodeGenerated] = useState([]);
  const [processedMessages, setProcessedMessages] = useState(new Set());

  useEffect(() => {
    const newCode = [];
    const newProcessed = new Set(processedMessages);

    messages.forEach((message) => {
      if (message.role === 'user') {
        // Reset code when new user message appears
        setAllCodeGenerated([]);
        newProcessed.clear();
      }

      if (message.role === 'assistant' && !processedMessages.has(message.id)) {
        const codeBlocks = message.content
                                  .split(/```/g)
                                  .filter((_, i) => i % 2 === 1)
                                  .map(code => code.replace(/^\w+\n/, '').trim());
        console.log(codeBlocks);
        newCode.push(...codeBlocks);
        newProcessed.add(message.id);
      }
    });

    if (newCode.length > 0) {
      setAllCodeGenerated(prev => [...prev, ...newCode]);
      console.log(allCodeGenerated);
    }
    setProcessedMessages(newProcessed);
  }, [messages]);

  return (
    <div className="flex flex-col h-full rounded-lg backdrop-blur-md bg-black/[.06] md:bg-white/[.04] shadow-lg">
    {/* Chat messages area */}

    <div className="flex-1 overflow-auto space-y-4 p-4">
    {messages.map((message) => {

      return(
        <div
          key={message.id}
          className={`p-4 rounded-lg shadow-gradient transition-all duration-300 ease-in-out text-gray-600
        ${message.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}`}
        >
          {message.content.split(/```/).map((part, index) => {
            if (index === 0) {
              // For the very first text part, include the role icon as a floated element.
              return (
                <div key={index} className="relative">
                {message.role === 'user' ? (
                  <span className="float-left mr-2">
                    <User className="w-6 h-6 text-blue-600" />
                  </span>
                ) : (
                  <span className="float-right mr-2">
                    <Bot className="w-6 h-6 text-gray-400" />
                  </span>
                )}
                <p className="break-words">{part}</p>
                {/* Clear the float so that any following content starts on a new line */}
                <div className="clear-both" />
                </div>
              );
            } else if (index % 2 === 1) {
              // Render code blocks (which were split by ``` markers)
              const codeContent = part.replace(/^\w+\n/, '');

              return (
                <div key={index} className="relative my-4">
                  <pre className="p-4 bg-gray-800 text-gray-100 rounded-lg overflow-x-auto text-sm shadow-gradient">
                    <code>{codeContent}</code>
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton
                      text={codeContent}
                      className="text-gray-600 hover:text-gray-800 transition-all duration-300 ease-in-out shadow-gradient"
                    />
                  </div>
                </div>
              );
            } else {
              // Render any subsequent plain text parts normally
              return <p key={index} className="break-words">{part}</p>;
            }
          })}
        </div>
    )})}
      </div>

      {/* Chat input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t-2 border-transparent backdrop-blur-md">
        <div className="flex gap-2">
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            placeholder="Digite o que deseja fazer..."
            className="flex-1 resize-none p-2 bg-blue-100/[.5] text-white focus:bg-white/[.07] backdrop-blur-2xl border-none brightness-200 placeholder-gray-500 text-white rounded outline-none focus:ring-2 focus:ring-blue-100/50 transition-all duration-300 ease-in-out"
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="py-2 pl-3 pr-4 !bg-blue-200/[.05] hover:bg-blue-300/[.1] rounded transition-all duration-300 ease-in-out disabled:opacity-50 hover:shadow-gradient focus:outline-none focus:ring-2 focus:ring-blue-100/50"
          >
            <IconSend
              className={`relative transition-transform duration-500 ease-in-out ${
                isLoading ? 'rotate-90' : '-rotate-90'
              }`}
            />
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Home(props) {


  // Files
  const [filesRecentPrompt, setFilesRecentPrompt] = useState([]);
  const [filesCurrent, setFilesCurrent] = useState([initialFiles]);
  const [filesGenerated, setFilesGenerated] = useState([]);

  const [selectedFile, setSelectedFile] = useState(filesCurrent[0]["script.js"]);
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

  const handleEditorChange = useCallback(
  throttle((value, event) => {
    setFilesCurrentHandler(selectedFile?.name, value, 0);
  }, 200),
  [selectedFile?.name, setFilesCurrentHandler]
);


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
    // useEffect(() => {
    //     const fetchData = async () => {
    //         try {
    //             const codeResponse = await fetch('/api/code');
    //             const urlResponse = await fetch('/api/url');

    //             const codeData = await codeResponse.json();
    //             const urlData = await urlResponse.json();
    //             const thumbnailUrlsData = await Promise.all(
    //                 urlData.map(async (url) => {
    //                     try {
    //                         const response = await fetch(`/api/thumbnail?url=${encodeURIComponent(url)}`);
    //                         if (!response.ok) {
    //                             console.error(`Failed to fetch thumbnail for ${url}:`, response.status, response.statusText);
    //                             const text = await response.text();
    //                             console.error('Response body:', text);
    //                             return null; // or a placeholder image URL
    //                         }
    //                         const blob = await response.blob();
    //                         return URL.createObjectURL(blob);
    //                     } catch (error) {
    //                         console.error(`Error fetching thumbnail for ${url}:`, error);
    //                         return null; // or a placeholder image URL
    //                     }
    //                 })
    //             );
    //             setCodeData(codeData || []);
    //             setFilesGeneratedHandler("index.html", codeData.demoCodeHTML[0], 0);
    //             setFilesGeneratedHandler("style.css", codeData.demoCodeCSS[0], 0);
    //             setFilesGeneratedHandler("script.js", codeData.demoCodeJS[0], 0);
    //             setFilesGeneratedHandler("image.svg", codeData.demoSVG[0], 0);
    //             setDemoUrl(urlData || []);
    //             setDemoThumbnails(thumbnailUrlsData.filter(Boolean));
    //         } catch (error) {
    //             console.error('Error fetching data:', error);
    //         }
    //     };
    //     fetchData();
    // }, []);


  const editorRef = useRef(null);

  const [index, setIndex] = useState(-1);
  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  };

    const [code, setCode] = useState(false);

  const ResponsiveReactGridLayout = useMemo(() => WidthProvider(Responsive), []);
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [mounted, setMounted] = useState(false);
  const [initialLayout, setInitialLayout] = useState(null);


  /* const [layouts, setLayouts] = useState<LayoutType>({ lg: initialLayout }); */
  const [layouts, setLayouts] = useState<LayoutType>({
    lg: window.innerWidth < 640 ? props.mobileLayout : props.initialLayout
  });

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [zIndexCustomGridItem, setZIndexCustomGridItem] = useState(10);

    useEffect(() => {
    setMounted(true);
  }, []);

  const [overlapPanels, setOverlapPanels] = useState(true);
  const toggleOverlap  = () => {
    setOverlapPanels(prevOverlap => !prevOverlap);
  };

  const onBreakpointChange = useCallback((breakpoint) => {
    setCurrentBreakpoint(breakpoint);
    console.log(currentBreakpoint);
  }, [currentBreakpoint]);

  type LayoutType = { [key: string]: any };
  const onLayoutChange = useCallback(
    (layout, layouts) => {
      props.onLayoutChange(layout, layouts);
      setLayouts(layouts);
    },
    [props]
  );

  const onResize = useCallback(
    (layout, oldItem, newItem, placeholder, e, element) => {
          setActiveKey(newItem.i); // Set the active key to the currently resized item
          setZIndexCustomGridItem(zIndexCustomGridItem + 1);
          const updatedLayout = layout.map((item) => {
        if (item.i === newItem.i) {
          return newItem;
        } else {
          return {
            ...item,
            w: Math.max(1, props.cols[currentBreakpoint] - newItem.w),
            x: newItem.x === 0 ? newItem.w : props.cols[currentBreakpoint] - item.w,
          };
        }
      });
      setLayouts({ [currentBreakpoint]: updatedLayout });
    },
    [props.cols, currentBreakpoint]
  );

  const onDragStart = useCallback(
    (layout, oldItem, newItem, placeholder, e, element) => {
          setActiveKey(newItem.i); // Set the active key to the currently dragged item
          setZIndexCustomGridItem(zIndexCustomGridItem + 1);
      },
      []
  );
    /*
    *   const onDragStop = useCallback(
    *     (layout, oldItem, newItem, placeholder, e, element) => {
    *       setActiveKey(null); // Reset active key when dragging stops
    *     },
    *     []
    *   );
    *  */

  const reactScope = {
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    useReducer: React.useReducer,
    useRef: React.useRef,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useContext: React.useContext,
    Component: React.Component,
  };

  const editFullCode = async () => {
    let prompt = `
    Remove imports, exports and return all the following code sections formatted together in order, leave only the classes, hooks and put at the end the last eval inside render().\n";
    Example:
    const Wrapper = ({ children }) => (
      <div style={{
        background: 'papayawhip',
        width: '100%',
        padding: '2rem'
      }}>
        {children}
      </div>
    )
    const Title = () => (
      <h3 style={{ color: 'palevioletred' }}>
        Hello World!
      </h3>
    )
    render(
      <Wrapper>
        <Title />
      </Wrapper>
    )

    Now here's my code sections:
    ${allCodeGenerated.join('\n[...]\n')}`;

    let fullCode = await fetch('/api/singleanswer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt
      })
    })

    return fullCode;
  };

  const { push } = useRouter();


   useEffect(() => {
    const handleHashScroll = (e: Event) => {
      e.preventDefault();
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        element?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
   }, []);

  return (
    <main className="w-full min-h-[150vh] bg-blue-gradient py-24">
      <NavBar extra={<NavStyledDropdown />} />
      <div className="flex items-center justify-center">
        {/* <Button
            variant="contained"
            color="primary"
            onClick={editFullCode}
            sx={{
            backgroundColor: 'transparent',
            color: 'white',
            boxShadow: 'none',
            '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            boxShadow: 'none',
            }
            }}>
            {overlapPanels ? 'Disable Overlap' : 'Enable Overlap'}
            </Button> */}
        <Button
          variant="contained"
          color="primary"
          onClick={toggleOverlap}
          startIcon={overlapPanels ? <LayersIcon /> : <LayersClearIcon />}
          sx={{
            backgroundColor: 'transparent',
            color: 'white',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              boxShadow: 'none',
            }
          }}>
          {overlapPanels ? 'Disable Overlap' : 'Enable Overlap'}
        </Button>
      </div>
      <LiveProvider code={filesCurrent[0]?.value} scope={reactScope} noInline>
        <ResponsiveReactGridLayout
          {...props}
          draggableHandle=".drag-handle"
          className="min-h-[150vh] max-h[150vh]"
          layouts={layouts}
          autoResize={false}
          onBreakpointChange={onBreakpointChange}
          onLayoutChange={onLayoutChange}
          onResize={onResize}
          onDragStart={onDragStart}
          measureBeforeMount={false}
          useCSSTransforms={mounted}
          allowOverlap={overlapPanels}
          isResizable={true}
          isDraggable={true}
        >
          <CustomGridItem
            id="#chat"
            key="0"
            className="bg-black/[.3] transform-gpu shadow-gradient text-white transition-all duration-[5ms] ease-out"
            isActive={activeKey === "0"}
            zIndex={zIndexCustomGridItem}
          >
            <Chat/>
            <Editor
              className="flex-1"
              width="100%"
              height="100%"
              path={filesCurrent[0]?.name}
              defaultLanguage={filesCurrent[0]?.language}
              defaultValue={filesCurrent[0]?.value}
              onMount={(editor) => (editorRef.current = editor)}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          </CustomGridItem>
          <CustomGridItem
            id="#editor"
            key="1"
            className="bg-black/[.3] transform-gpu shadow-gradient text-white transition-all duration-[5ms] ease-in-out"
            isActive={activeKey === "1"}
            zIndex={zIndexCustomGridItem}
          >
            <LiveEditor className="font-mono h-full" />
          </CustomGridItem>
          <CustomGridItem
            id="#view"
            key="2"
            className="bg-black/[.3] transform-gpu shadow-gradient text-white transition-all duration-[5ms] ease-in-out"
            isActive={activeKey === "2"}
            zIndex={zIndexCustomGridItem}
          >

            <LivePreview />
            <LiveError className="text-wrap" />
          </CustomGridItem>
        </ResponsiveReactGridLayout>
      </LiveProvider>
      <nav className="w-full h-16 block md:hidden fixed w-full z-30 bottom-0 noselect shadow-lg">
        <div className="w-full h-full flex justify-between items-center mx-auto px-16 divide-x-2 divide-transparent">
          <button
            className={`w-1/3 h-full px-4 py-2 transition-all duration-300 ease-in-out
              backdrop-blur-2xl bg-black/[.06] md:bg-white/[.04]
              focus::text-blue-100/[.7] bg-transparent text-white
              shadow-gradient hover:brightness-150 hover:text-blue-200`
            }
            onClick={() => push("#chat")}
          >
            <a >Chat</a>
          </button>
          <button
            className={`w-1/3 h-full px-4 py-2 transition-all duration-300 ease-in-out
              backdrop-blur-2xl bg-black/[.06] md:bg-white/[.04]
              focus::text-blue-100/[.7] bg-transparent text-white
              shadow-gradient hover:brightness-150 hover:text-blue-200`
            }
            onClick={() => push("#editor")}
          >
            <a >Editor</a>
          </button>
          <button
            className={`w-1/3 h-full px-4 py-2 transition-all duration-300 ease-in-out
              backdrop-blur-2xl bg-black/[.06] md:bg-white/[.04]
              focus::text-blue-100/[.7] bg-transparent text-white
              shadow-gradient hover:brightness-150 hover:text-blue-200`
            }
            onClick={() => push("#view")}
          >
            <a>View</a>
          </button>
        </div>
      </nav>
    </main>
  );
}

Home.propTypes = {
  onLayoutChange: PropTypes.func.isRequired,
};

Home.defaultProps = {
  className: "layout",
  rowHeight: 27,
  onLayoutChange: function () {},
  cols: { lg: 30, md: 30, sm: 30, xs: 30, xxs: 30 },
  initialLayout: [
    { h: 25, i: "0", static: false, w: 10, x: 0, y: 0 },
    { h: 25, i: "1", static: false, w: 10, x: 10, y: 0 },
    { h: 25, i: "2", static: false, w: 10, x: 20, y: 0 }
    ],
    mobileLayout: [
        { h: 25, i: "0", static: false, w: 30, x: 0, y: 0 },
        { h: 25, i: "1", static: false, w: 30, x: 0, y: 8 },
        { h: 25, i: "2", static: false, w: 30, x: 0, y: 16 }
    ],
    resizeHandles: ['nw', 'se', 'ne', 'sw']
};
