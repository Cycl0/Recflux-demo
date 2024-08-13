"use client";

// import MonacoEditor from "@/components/MonacoEditor";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@/components/MonacoEditor'), {
  ssr: false,
});

export default function UserContextCode() {
  
      return (
        <Accordion
          style={{ background: 'transparent' }}
          className={`z-10 absolute w-full transparent-bg shadow-none border-none rounded-none`}>
          <AccordionSummary
            className={`w-1/2 left-1/2 max-h-8 bg-[rgba(193,219,253,0.15)] text-white rounded-md uppercase flex justify-between p-1.5`}
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <DataObjectIcon className={`justify-self-center`} />
          </AccordionSummary>
          <AccordionDetails
            className={`absolute p-0 left-1/3 -translate-x-1/3 w-screen`}>
            <MonacoEditor/>
          </AccordionDetails>
        </Accordion>
      );
    }