"use client";
import IconSend from "@/components/IconSend";
import {gtc, gtcm} from "@/utils/grid-area-template-css.js";
import DataObjectIcon from '@mui/icons-material/DataObject';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import FileSelector from "@/components/FileSelector";
import Editor from "@monaco-editor/react";
import { wrapGrid } from 'animate-css-grid';
import { debounce, throttle } from 'lodash';
import { useCallback, useState, useEffect, useRef } from "react";
import Select from 'react-select';
import TextareaAutosize from 'react-textarea-autosize';

export default function InputBox({
  indexHandler,
  files,
  filesCurrent,
  selectedFile,
  handleFileSelect,
  editorOpen,
  throttleEditorOpen,
  setFilesCurrentHandler,
  filesRecentPrompt,
  setFilesRecentPromptHandler,
   setFilesGeneratedHandler,
  codeData
}) {

  // generation
  const [isClicked, setIsClicked] = useState(false);
  const handleSubmitPrompt = useCallback(
    debounce((e) => {
      e.preventDefault();
      const nextIndex = filesRecentPrompt.length;
      Object.keys(filesCurrent[0]).forEach(fileName => {
        setFilesRecentPromptHandler(fileName, filesCurrent[0][fileName].value, nextIndex);
      });

            setFilesGeneratedHandler("index.html", codeData.demoCodeHTML[nextIndex], nextIndex);
            setFilesGeneratedHandler("style.css", codeData.demoCodeCSS[nextIndex], nextIndex);
            setFilesGeneratedHandler("script.js", codeData.demoCodeJS[nextIndex], nextIndex);
            setFilesGeneratedHandler("image.svg", codeData.demoSVG[nextIndex], nextIndex);

      setIsClicked(true);
      indexHandler((prevIndex) => prevIndex + 1);
    }, 1000),
    [filesCurrent, filesRecentPrompt, setFilesRecentPromptHandler, indexHandler]
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
  // files
  useEffect(() => {
    editorRef.current?.focus();
  }, [selectedFile?.name]);

  // editor
  const editorRef = useRef(null);
  const [editorSideBarMode, setEditorSideBarMode] = useState(false);
  const throttleLayoutChange = useCallback(
    throttle((newMode) => {
      setEditorSideBarMode(newMode);
    }, 1000),
    []
  );
  const handleEditorChange = useCallback(
  throttle((value, event) => {
    setFilesCurrentHandler(selectedFile?.name, value, 0);
  }, 200),
  [selectedFile?.name, setFilesCurrentHandler]
);

  // grid animation
  const gridRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (gridRef.current) {
      wrapGrid(gridRef.current);
    }
  }, []);

  return (
        <div className="relative md:w-3/4 h-12 mx-auto max-w-4xl">
            <main className={`
                        2xs:!w-[calc(1300%/9)] 2xs:!-translate-x-[calc(7650%/117)] 2xs:!left-1/2
                        w-full absolute
                        ${gtc("inputBoxMobile")}
                        ${editorSideBarMode ? gtcm("inputBoxSide", "2xs") : gtcm("inputBox", "2xs")}
                        z-10 h-12
                        transition-all transform-gpu  duration-500 ease-in-out`}
                ref={gridRef}
            >
                <section className="grid-in-select underline-slide h-12 z-20 transition-all transform-gpu  ease-in-out delay-500 duration-200">
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
                                        pt-4 text-white text-sm focus:outline-none focus:ring-0 border-none
                                        bg-blue-900 placeholder-gray-300
                                        transition-colors duration-200 ease-in-out
                                        uppercase font-bold hover:z-20 focus:z-20"
                                placeholder={placeholder}
                            ></TextareaAutosize>
                            <button
                                type="button"
                                onClick={handleSubmitPrompt}
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
                <FileSelector
                             files={files}
                             editorSideBarMode={editorSideBarMode}
                             editorOpen={editorOpen}
                             handleFileSelect={handleFileSelect}
                             selectedFileName={selectedFile?.name}
                             className={`
                               grid-in-files flex
                               ${editorOpen ? editorSideBarMode ? `2xs:neon-l-shape-right justify-end` : `2xs:neon-l-shape-left` : ``}`}>
                        <button
                            className={`
                          order-first
                          h-full min-w-8 flex justify-center items-center
                          backdrop-blur-2xl shadow-gradient brightness-150
                          ${editorSideBarMode} ? 'rounded-tl-md' : ''
                        `}
                            onClick={(e) => {
                                e.preventDefault();
                                // TODO
                            }}
                            aria-label="Gerenciar arquivos"
                        >
                            <AddCircleIcon />
                        </button>
                </FileSelector>
                <section
                    className={`
                      grid-in-code
                      md:min-w-96 md:flex-none flex-1
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
                                onChange={handleEditorChange}
                                value={filesCurrent[0][selectedFile?.name]?.value}
                                path={selectedFile.name}
                                defaultLanguage={selectedFile.language}
                                defaultValue={selectedFile.value}
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
        </div>
    );

}
