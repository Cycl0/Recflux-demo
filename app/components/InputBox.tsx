"use client";
import IconSend from "@/components/IconSend";
import gtc from "@/utils/grid-area-template-css.js";
import { useCallback, useState, useEffect } from "react";

export default function InputBoxLayout({ nextImageHandler }) {
  const [isClicked, setIsClicked] = useState(false);
  const [placeholder, setPlaceholder] = useState('Template para um site e-commerce');

  const handleSelectChange = (event) => {
    const value = event.target.value;
    if (value === '1') {
      setPlaceholder('Ex. Gere um template para um e-commerce');
    } else if (value === '2') {
      setPlaceholder('Ex. Troque o verde por azul');
    }
  };

  const handleClick = useCallback(() => {
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

  return (
    <form className="w-3/4 h-12 mx-auto max-w-3xl">
      <div className={`${gtc("inputBox")} h-full shadow-gradient underline-slide`}>
        <div className="relative grid-in-select">
          <select 
            id="options" 
            className="appearance-none text-blue-700 border-green-100 ring-1 ring-blue-100 bg-blue-100 block w-full p-2.5 pr-8 border-r border-white/20 transition-colors duration-300 ease-in-out uppercase rounded-tl-md"
            onChange={handleSelectChange}
          >
            <option value="1" defaultValue>Gerar</option>
            <option value="2">Editar</option>
          </select>
        </div>
        <div className="grid-in-input relative w-full">
          <div className="grid-in-input relative w-full outline-none">
            <input
              type="search"
              id="search-dropdown"
              className="block p-2.5 w-full z-20 text-blue-600 border-white/20 focus:outline-none ring-1 ring-blue-100 bg-blue-200 placeholder-white transition-colors duration-300 ease-in-out dark:bg-blue-600 dark:focus:bg-blue-1000 uppercase rounded-tr-md font-bold"
               placeholder={placeholder /* `Gere um template para um e-commerce`(GERAR) ou `Troque o verde por azul`(EDITAR) */}
              required
            />
          </div>
          <button
            type="button"
            onClick={handleClick}
            className={`w-12 h-12 bubble-animation absolute top-0 end-0 p-2.5 font-medium h-full text-white bg-blue-300 rounded-tr-md border border-blue-300 hover:bg-green-200 hover:border-white hover:ring-4 hover:outline-none hover:ring-green-200 dark:bg-blue-600 dark:hover:bg-blue-400 dark:hover:ring-blue-800 transition-all duration-1000 ease-in-out hover:scale-[105%] group transform-gpu ${
              isClicked ? 'clicked' : ''
            }`}
          >
            <IconSend className="relative transition-transform duration-2000 ease-in-out group-hover:scale-110" />
          </button>
        </div>
      </div>
    </form>
  );
}