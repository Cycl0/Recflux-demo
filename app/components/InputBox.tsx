"use client";
import IconSend from "@/components/IconSend";
import gtc from "@/utils/grid-area-template-css.js";
import { useCallback, useState, useEffect } from "react";

export default function InputBoxLayout({ nextImageHandler }) {
  const [isClicked, setIsClicked] = useState(false);
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

  const handleSubmit = useCallback(() => {
    event.preventDefault();
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
    <form className="w-3/4 h-12 mx-auto max-w-4xl" onSubmit={handleSubmit}>
      <div className={`${gtc("inputBox")} h-full shadow-gradient underline-slide`}>
        <div className="relative grid-in-select">
          <select 
            id="options" 
            className="relative w-full h-full p-2.5 pr-8 appearance-none text-blue-700 focus:border-green-200 border-none bg-blue-100 block transition-colors duration-300 ease-in-out uppercase rounded-tl-md hover:z-20 focus:z-20"
            onChange={handleSelectChange}
          >
            <option value="1">Gerar</option>
            <option value="2">Editar</option>
            <option value="3">Visualizar</option>
          </select>
        </div>
        <div className="h-full grid-in-input relative">
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
              onClick={handleSubmit}
              className={`w-12 h-full bubble-animation p-2.5 font-medium h-full text-white bg-blue-300 rounded-tr-md border border-blue-300 hover:bg-green-200 hover:border-white hover:outline-none transition-all duration-1000 ease-in-out hover:scale-[105%] group transform-gpu hover:z-20 focus:z-20 ${
                isClicked ? 'clicked' : ''
              }`}
            >
              <IconSend className="relative transition-transform duration-2000 ease-in-out -rotate-90 group-hover:rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}