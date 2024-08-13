"use client";
import IconSend from "@/components/IconSend";
import gtc from "@/utils/grid-area-template-css.js";
import DataObjectIcon from '@mui/icons-material/DataObject';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Editor from "@monaco-editor/react";
import files from "@/utils/files-editor";
import { useCallback, useState, useEffect, useRef } from "react";

export default function InputBoxLayout({ nextImageHandler }) {

  // generation
  const [isClicked, setIsClicked] = useState(false);
  const handleGeneration = useCallback((e) => {
    e.preventDefault();
    setIsClicked(true);
    nextImageHandler();
  }, [nextImageHandler]);
  useEffect(() => {
    let timer;
    if (isClicked) {
      timer = setTimeout(() => setIsClicked(false), 2000);
    }
    return () => clearTimeout(timer); // Cleanup
  }, [isClicked]);
  
  // placeholder
  const [placeholder, setPlaceholder] = useState('Ex. Template para um site e-commerce');
  const handleSelectChange = (event) => {
    const value = event.target.value;
    if (value === '1') {
      setPlaceholder('Ex. Template para um e-commerce');
    } else if (value === '2') {
      setPlaceholder('Ex. Troque o verde por azul');
    } else if (value === '3') {
      setPlaceholder('Ex. Apenas o primeiro componente');
    }
  };

  // editor
  const editorRef = useRef(null);
  const [fileName, setFileName] = useState("index.html");
  const file = files[fileName];
  useEffect(() => {
    editorRef.current?.focus();
  }, [file.name]);

  return (
    <form className="relative w-3/4 h-12 mx-auto max-w-4xl" onSubmit={handleGeneration}>
      <main className={`${gtc("inputBox")} w-full h-full shadow-gradient underline-slide`}>
        <section className="grid-in-select h-full">
          <select 
            id="options" 
            className="w-full h-full p-2.5 pr-8 appearance-none text-blue-700 focus:border-green-200 border-none bg-blue-100 block transition-colors duration-300 ease-in-out uppercase rounded-tl-md hover:z-20 focus:z-20"
            onChange={handleSelectChange}
          >
            <option value="1">Gerar</option>
            <option value="2">Editar</option>
            <option value="3">Visualizar</option>
          </select>
        </section>
        <section className="grid-in-input h-full relative">
          <div className="h-full grid-in-input relative w-full outline-none flex">
            <input
              type="search"
              id="search-dropdown"
              className="flex-grow h-full block p-2.5 text-blue-600 focus:outline-none border-none bg-blue-200 placeholder-white transition-colors duration-300 ease-in-out uppercase font-bold hover:z-20 focus:z-20"
               placeholder={placeholder /* `Gere um template para um e-commerce`(GERAR), `Troque o verde por azul`(EDITAR) ou Ex. Apenas o primeiro componente (VISUALIZAR)*/}
              required
            />
            <button
              type="button"
              onClick={handleGeneration}
              className={`w-12 h-full bubble-animation p-2.5 font-medium h-full text-white bg-blue-300 rounded-tr-md border border-blue-300 hover:bg-green-200 hover:border-green-400 hover:outline-none transition-all duration-1000 ease-in-out hover:scale-[105%] group transform-gpu hover:z-20 focus:z-20 ${
                isClicked ? 'clicked' : ''
              }`}
            >
              <IconSend className="relative transition-transform duration-2000 ease-in-out -rotate-90 group-hover:rotate-90" />
            </button>
          </div>
        </section>
        <button
            className={`grid-in-button h-12 bg-[rgba(193,219,253,0.15)] text-white rounded-md uppercase p-1.5`}
          >
          <DataObjectIcon className={`justify-self-center`} />
          <ExpandMoreIcon className={`justify-self-end`}/>
        </button>
        <section className="grid-in-files h-12 text-white">
            <button
              className={`rounded-tl-md h-full px-4 ${fileName === "index.html" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
              onClick={(e) => {
                e.preventDefault();
                setFileName("index.html");
              }}
            >
              index.html
            </button>
            <button
              className={`h-full px-4 ${fileName === "style.css" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
              onClick={(e) => {
                e.preventDefault();
                setFileName("style.css");
              }}
            >
              style.css
            </button>
            <button
              className={`h-full px-4 ${fileName === "script.js" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
              onClick={(e) => {
                e.preventDefault();
                setFileName("script.js");
              }}
            >
              script.js
            </button>
            <button
              className={`rounded-tr-md h-full px-4 ${fileName === "image.svg" ? "bg-white text-green-500" : "bg-[rgba(193,219,253,0.15)]"}`}
              onClick={(e) => {
                e.preventDefault();
                setFileName("image.svg");
              }}
            >
              image.svg
            </button>
          </section>
        <section className="grid-in-code">
          <Editor
            width="100%"
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
        </section>
      </main>
    </form>
  );
}