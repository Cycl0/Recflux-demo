import React, { useState, useEffect, useRef } from "react";

import Editor from "@monaco-editor/react";
import files from "@/utils/files-editor";

function MonacoEditor() {
  const editorRef = useRef(null);
  const [fileName, setFileName] = useState("index.html");

  const file = files[fileName];

  useEffect(() => {
    editorRef.current?.focus();
  }, [file.name]);

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <div className="flex justify-center w-10 z-20 text-white">
        <button
          className={`rounded-tl-md p-4 ${fileName === "index.html" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
          onClick={(e) => {
            e.preventDefault();
            setFileName("index.html");
          }}
        >
          index.html
        </button>
        <button
          className={`p-4 ${fileName === "style.css" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
          onClick={(e) => {
            e.preventDefault();
            setFileName("style.css");
          }}
        >
          style.css
        </button>
        <button
          className={`p-4 ${fileName === "script.js" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
          onClick={(e) => {
            e.preventDefault();
            setFileName("script.js");
          }}
        >
          script.js
        </button>
        <button
          className={`rounded-tr-md p-4 ${fileName === "image.svg" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
          onClick={(e) => {
            e.preventDefault();
            setFileName("image.svg");
          }}
        >
          image.svg
        </button>
      </div>
      <Editor
        width="49%"
        height="600px"
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
    </div>
  );
};

export default MonacoEditor;