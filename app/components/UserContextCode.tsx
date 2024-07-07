"use client";

// import MonacoEditor from "@/components/MonacoEditor";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@/components/MonacoEditor'), {
  ssr: false,
});

export default function UserContextCode() {
  
      return (
        <Accordion>
          <AccordionSummary
            className={`w-56 h-12 bg-blue-400 text-white rounded-md flex items-center justify-center uppercase`}
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            Código do usuário
          </AccordionSummary>
          <AccordionDetails>
            <MonacoEditor/>
          </AccordionDetails>
        </Accordion>
      );
    }