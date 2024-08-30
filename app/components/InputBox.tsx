"use client";
import IconSend from "@/components/IconSend";
import gtc from "@/utils/grid-area-template-css.js";
import DataObjectIcon from '@mui/icons-material/DataObject';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import Editor from "@monaco-editor/react";
import files from "@/utils/files-editor";
import { wrapGrid } from 'animate-css-grid';
import { debounce, throttle } from 'lodash';
import { useCallback, useState, useEffect, useRef } from "react";
import Select from 'react-select';
import TextareaAutosize from 'react-textarea-autosize';

export default function InputBoxLayout({ nextImageHandler }) {

    // generation
    const [isClicked, setIsClicked] = useState(false);
    const throttleHandleGeneration = useCallback(
    debounce((newMode) => {
      setIsClicked(newMode);
      nextImageHandler();
    }, 1000),
    [nextImageHandler]
    );
  useEffect(() => {
    let timer;
    if (isClicked) {
      timer = setTimeout(() => setIsClicked(false), 2000);
    }
    return () => clearTimeout(timer); // Cleanup
  }, [isClicked]);
  
  // action selector
  // const [action, setAction] = useState({ value: '1', label: 'GERAR' });
  const [placeholder, setPlaceholder] = useState('Ex: Template para um site e-commerce');
  const actionList = [
    { value: '1', label: 'GERAR' },
    { value: '2', label: 'EDITAR' },
    { value: '3', label: 'FOCAR' },
  ];
  const handleSelectActionChange = (selectedAction) => {
    // setAction(selectedAction);
    switch (selectedAction.value) {
      case '1':
        setPlaceholder('Ex: Template para um e-commerce');
        break;
      case '2':
        setPlaceholder('Ex: Troque o verde por azul');
        break;
      case '3':
        setPlaceholder('Ex: Apenas o primeiro componente');
        break;
      default:
        setPlaceholder('');
        break;
    }
  };

  // editor
  const editorRef = useRef(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const throttleEditorOpen = useCallback(
    throttle((newMode) => {
      setEditorOpen(newMode);
    }, 1000),
    []
  );
  const [editorSideBarMode, setEditorSideBarMode] = useState(false);
  const throttleLayoutChange = useCallback(
    throttle((newMode) => {
      setEditorSideBarMode(newMode);
    }, 1000),
    []
  );
  const [fileName, setFileName] = useState("index.html");
  const file = files[fileName];
  useEffect(() => {
    editorRef.current?.focus();
  }, [file.name]);

  // grid animation
  const gridRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (gridRef.current) {
      wrapGrid(gridRef.current);
    }
  }, []);

  return (
        <form className="relative md:w-3/4 h-12 mx-auto max-w-4xl" onSubmit={throttleHandleGeneration}>
            <main className={`
                        absolute -translate-x-[calc(7650%/117)] left-1/2
                        ${editorSideBarMode ? gtc("inputBoxSide") : gtc("inputBox")}
                        z-10 w-[calc(1300%/9)] h-12
                        transition-all transform-gpu  duration-500 ease-in-out`}
                ref={gridRef}
            >
                <section className="grid-in-select underline-slide h-12 z-10 transition-all transform-gpu  ease-in-out delay-500 duration-200">
                    <Select
                        defaultValue={actionList[0]}
                        id="actionSelect"
                        options={actionList}
                        isSearchable={false}
                        className="
                       w-full h-full backdrop-blur-md appearance-none text-blue-700 border-b-2 border-blue-400
                       border-none bg-white block transition-colors duration-200
                       ease-in-out uppercase rounded-tl-md hover:z-20 focus:z-20"
                        onChange={handleSelectActionChange}
                    >
                        {/* <option value="1">Gerar</option> */}
                        {/* <option value="2">Editar</option> */}
                        {/* <option value="3">Focar</option> */}
                    </Select>
                </section>
                <section className="grid-in-input h-12 relative z-10 shadow-gradient transition-all transform-gpu  ease-in-out delay-200 duration-500">
                    <div className={`w-full h-12`}>

                        <div className="h-full relative w-full outline-none flex">
                            <TextareaAutosize
                                maxRows={4}
                                className="
                                        w-full flex-grow min-h-12 flex items-center justify-center
                                        pt-4 text-blue-600 text-sm focus:outline-none focus:ring-0 border-none
                                        bg-blue-100 placeholder-gray-400
                                        transition-colors duration-200 ease-in-out
                                        uppercase font-bold hover:z-20 focus:z-20"
                                placeholder={placeholder /* `Ex: Gere um template para um e-commerce`(GERAR), `Ex: Troque o verde por azul`(EDITAR) ou Ex: Apenas o primeiro componente (FOCAR)*/}
                            ></TextareaAutosize>
                            <button
                                type="button"
                                onClick={throttleHandleGeneration}
                                className={`
                            w-12 h-full p-2.5 font-medium h-full
                            text-white bg-blue-300 rounded-tr-md border border-blue-300
                            hover:bg-transparent hover:border-green-400 hover:outline-none
                            transition-all transform-gpu  duration-1000 ease-in-out hover:scale-[105%] group hover:z-20 focus:z-20
                            hover:shadow-gradient hover:backdrop-blur-md
                            ${isClicked ? ' bubble-animation clicked' : ''
                                    }`}
                                aria-label="Enviar Prompt"
                            >
                                <IconSend className="relative transition-transform duration-2000 ease-in-out -rotate-90 group-hover:rotate-90" />
                            </button>
                        </div>
                    </div>
                </section>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        throttleEditorOpen(!editorOpen);
                    }}
                    className={`
                      grid-in-button
                      ${editorOpen ? `h-14` : `h-12 rounded-br-md`}
                      ${editorSideBarMode ? `rounded-br-md` : `rounded-bl-md`}
                      !bg-[rgba(193,219,253,0.15)] backdrop-blur-md z-negative
                      text-white uppercase p-1.5 hover:shadow-gradient
                      transition-all transform-gpu  ease-in-out duration-200`}
                    aria-label="Abrir Editor"
                >
                    <div className={`w-full`}>

                        <DataObjectIcon className={`justify-self-center`} />
                        <ExpandMoreIcon className={`${editorOpen ? `rotate-180` : ``} justify-self-end transition ease-in-out duration-200`} />
                    </div>
                </button>

                <section className={`
                             grid-in-files
                             ${editorOpen ? editorSideBarMode ? `neon-l-shape-right` : `neon-l-shape-left` : ``}`}>
                    <div className={`
                           w-full ${editorOpen ? `h-8 opacity-100` : `h-0 opacity-0`}
                           flex justify-end divide-x-2 divide-transparent text-white
                           transition-all transform-gpu  ease-in-out duration-200`}>

                        <button
                            className={`
                          h-full px-4 flex-1 flex justify-center items-center
                          backdrop-blur-xl hover:shadow-gradient
                          ${fileName === "index.html" ? "bg-blue-100 text-blue-500" : "bg-[rgba(193,219,253,0.15)]"}
                          ${editorSideBarMode ? `max-w-24 rounded-tl-md` : ``}`}
                            onClick={(e) => {
                                e.preventDefault();
                                setFileName("index.html");
                            }}
                            aria-label="Selecionar arquivo index.html"
                        >
                            index.html
                        </button>
                        <button
                            className={`
                          h-full px-4 flex-1 flex justify-center items-center
                          backdrop-blur-sm  hover:shadow-gradient
                          ${fileName === "style.css" ? "bg-blue-100 text-blue-500" : "bg-[rgba(193,219,253,0.15)]"}
                          ${editorSideBarMode ? `max-w-24` : ``}`}
                            onClick={(e) => {
                                e.preventDefault();
                                setFileName("style.css");
                            }}
                            aria-label="Selecionar arquivo style.css"
                        >
                            style.css
                        </button>
                        <button
                            className={`
                          h-full px-4 flex-1 flex justify-center items-center
                          backdrop-blur-xl  hover:shadow-gradient
                          ${fileName === "script.js" ? "bg-blue-100 text-blue-500" : "bg-[rgba(193,219,253,0.15)]"}
                          ${editorSideBarMode ? `max-w-24` : ``}
                        `}
                            onClick={(e) => {
                                e.preventDefault();
                                setFileName("script.js");
                            }}
                            aria-label="Selecionar arquivo script.js"
                        >
                            script.js
                        </button>
                        <button
                            className={`
                          h-full flex-1 flex justify-center items-center
                          px-4 backdrop-blur-sm  hover:shadow-gradient
                          ${fileName === "image.svg" ? "bg-blue-100 text-blue-500" : "bg-[rgba(193,219,253,0.15)]"}
                          ${editorSideBarMode ? `max-w-24` : `rounded-tr-md`}
                        `}
                            onClick={(e) => {
                                e.preventDefault();
                                setFileName("image.svg");
                            }}
                            aria-label="Selecionar arquivo image.svg"
                        >
                            image.svg
                        </button>
                    </div>
                </section>
                <section
                    className={`
                      grid-in-code
                      min-w-96
                      ${editorOpen ? 'h-[600px] opacity-100' : 'z-negative h-0 opacity-0'}

                    `}>
                    <div
                        className={`
                      flex items-center justify-end rounded-b-md
                      transition-all transform-gpu  ease-in-out delay-200 duration-200
                      relative
                    `}>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                throttleLayoutChange(!editorSideBarMode);
                            }}
                            className={`invisible xl:!visible !absolute
                        ${editorSideBarMode ? `rounded-tr-xl -right-8` : `rounded-tl-xl -left-8`}
                        w-8 h-1/4 bg-[rgba(193,219,253,0.15)] backdrop-blur-md text-white
                        p-1.5 hover:shadow-gradient
                        transition-all transform-gpu  ease-in-out duration-200
                      `}>
                            <VerticalSplitIcon className={`${editorSideBarMode ? `` : `rotate-180`}`} />
                        </button>
                        <div className={`${editorOpen ? `` : `hidden`} ${editorSideBarMode ? `w-96` : `flex-1`} overflow-hidden rounded-b-md`}>
                            <Editor
                                className="flex-1 rounded-md"
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
                        </div>
                    </div>
                </section>
            </main>
        </form>
    );
}
