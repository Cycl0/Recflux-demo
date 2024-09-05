"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { Responsive, WidthProvider } from "react-grid-layout";
import NavBar from '@/components/NavBar';
import NavStyledDropdown from '@/components/NavStyledDropdown';
import Editor from "@monaco-editor/react";
import files from "@/utils/files-editor";
import CustomGridItem from "@/components/CustomGridItem";
import 'react-resizable/css/styles.css';

export default function Home(props) {

  const editorRef = useRef(null);

  const [fileName, setFileName] = useState("index.html");
  const file = files[fileName];
  useEffect(() => {
    editorRef.current?.focus();
  }, [file.name]);

  const [index, setIndex] = useState(-1);
  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  };

  const ResponsiveReactGridLayout = useMemo(() => WidthProvider(Responsive), []);
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [mounted, setMounted] = useState(false);
  const initialLayout = window.innerWidth < 640 ? props.mobileLayout : props.initialLayout;
  const [layouts, setLayouts] = useState<LayoutType>({ lg: initialLayout });

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
        <main className="w-full min-h-[150vh] max-h[150vh] bg-blue-gradient py-24">
            <NavBar extra={<NavStyledDropdown />} />
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
                        path={file.name}
                        defaultLanguage={file.language}
                        defaultValue={file.value}
                        onMount={(editor) => (editorRef.current = editor)}
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
                    <Editor
                        className="flex-1"
                        width="100%"
                        height="100%"
                        path={file.name}
                        defaultLanguage={file.language}
                        defaultValue={file.value}
                        onMount={(editor) => (editorRef.current = editor)}
                        options={{
                            minimap: { enabled: true },
                            fontSize: 14,
                            wordWrap: 'on',
                        }}
                    />
                </CustomGridItem>
                <CustomGridItem
                    key="2"
                    className="bg-black/[.3] transform-gpu shadow-gradient text-white transition-all duration-[5ms] ease-in-out"
                    isActive={activeKey === "2"}
                    zIndex={zIndexCustomGridItem}
                >
                <img src="./icon.png" />
                </CustomGridItem>
            </ResponsiveReactGridLayout>
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
