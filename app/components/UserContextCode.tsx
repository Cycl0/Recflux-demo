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
          className={`transparent-bg shadow-none border-none rounded-none flex justify-center`}>
          <AccordionSummary
            className={`w-24 h-12 bg-blue-400 text-white rounded-md flex justify-center uppercase`}
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <DataObjectIcon />
          </AccordionSummary>
          <AccordionDetails
            className={`flex justify-center`}>
            <MonacoEditor/>
          </AccordionDetails>
        </Accordion>
      );
    }