"use client";

import { useEffect, useState } from "react";
import { CopyBlock, nord } from "react-code-blocks";
import { FlipTilt } from 'react-flip-tilt';
import Modal from "@/components/Modal";
import { Highlight } from "@mui/icons-material";

export default function GeneratedSection({ index }) {
  index %= 6;
  const [demoCodeHTML, setDemoCodeHTML] = useState([]);
  const [demoSVG, setDemoSVG] = useState([]);
  const [demoCodeCSS, setDemoCodeCSS] = useState([]);
  const [demoImage, setDemoImage] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const codeResponse = await fetch('/api/code');
        if (!codeResponse.ok) {
          throw new Error('Failed to fetch code data');
        }
        const imageResponse = await fetch('/api/images');
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch images');
        }

        const codeData = await codeResponse.json();
        const imageData = await imageResponse.json();
        setDemoCodeHTML(codeData.demoCodeHTML || []);
        setDemoSVG(codeData.demoSVG || []);
        setDemoCodeCSS(codeData.demoCodeCSS || []);
        setDemoImage(imageData || []);
      } catch (error) {
        console.error('Error fetching the JSON file:', error);
      }
    };
    fetchData();
  }, []);

  const customStyle = {
    width: "400px",
    maxHeight: "600px",
    overflow: "auto",
    boxShadow: '0 15px 30px -15px rgba(96, 239, 255, 0.5)',
    scrollbarWidth: 'thin',
    scrollbarColor: '#60efff #e0fffb',
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  }
  
  return (
    <div className={`max-w-full flex flex-col items-center justify-center mt-32`}>
        <div className={`relative`}>
          <div className={`absolute -top-6 -left-6 w-1/3 h-1/3 border-t-2 border-l-2 border-blue-400`} />
          <div className={`absolute -bottom-6 -right-6 w-1/3 h-1/3 border-b-2 border-r-2 border-green-400`} />
          <FlipTilt
            className={`w-[480px] h-[270px]`}
            onClick={toggleModal}
            front={demoImage[index]}
            back={demoImage[index]}
            borderColor='#60efff'
            />
        </div>
      <div className={`w-full flex items-center justify-center space-x-10 mt-20`}>
        
        {demoCodeHTML[index] && (
          <CopyBlock
            customStyle={customStyle}
            language="html"
            text={demoCodeHTML[index]}
            showLineNumbers={true}
            wrapLongLines={true}
            theme={nord}
            highlight={""/*highlight[index]*/}
            codeBlock={true}
          />
        )}
        {demoCodeCSS[index] && (
          <CopyBlock
            customStyle={customStyle}
            language="css"
            text={demoCodeCSS[index]}
            showLineNumbers={true}
            wrapLongLines={true}
            theme={nord}
            highlight={""/*highlight[index]*/}
            codeBlock={true}
          />
        )}
        {demoSVG[index] && (
          <CopyBlock
            customStyle={customStyle}
            language="xml"
            text={demoSVG[index]}
            showLineNumbers={true}
            wrapLongLines={true}
            theme={nord}
            highlight={""/*highlight[index]*/}
            codeBlock={true}
          />
        )}
      </div>
      <Modal 
        isOpen={isModalOpen}
        onClose={toggleModal}
        imageSrc={demoImage[index]}
      />
      </div>
      );
      }