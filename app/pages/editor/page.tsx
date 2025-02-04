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
    return (
      <main className="w-full min-h-[150vh] bg-blue-gradient py-24">
        <NavBar extra={<NavStyledDropdown />} />
        <LiveProvider code={filesCurrent[0]?.value} noInline>
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
            allowOverlap={true}
            isResizable={true}
            isDraggable={true}
          >
            <CustomGridItem
              key="0"
              className="bg-black/[.3] transform-gpu shadow-gradient text-white transition-all duration-[5ms] ease-out"
              isActive={activeKey === "0"}
              zIndex={zIndexCustomGridItem}
            >
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
              key="1"
              className="bg-black/[.3] transform-gpu shadow-gradient text-white transition-all duration-[5ms] ease-in-out"
              isActive={activeKey === "1"}
              zIndex={zIndexCustomGridItem}
            >
              <LiveEditor className="font-mono h-full" />
            </CustomGridItem>
            <CustomGridItem
              key="2"
              className="bg-black/[.3] transform-gpu shadow-gradient text-white transition-all duration-[5ms] ease-in-out"
              isActive={activeKey === "2"}
              zIndex={zIndexCustomGridItem}
            >

              <LivePreview />
              <LiveError />
            </CustomGridItem>
          </ResponsiveReactGridLayout>
        </LiveProvider>
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
