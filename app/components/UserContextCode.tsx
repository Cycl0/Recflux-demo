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
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            Accordion 1
          </AccordionSummary>
          <AccordionDetails>
            <MonacoEditor/>
          </AccordionDetails>
        </Accordion>
      );
    }