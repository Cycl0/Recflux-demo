import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import ReactDiffViewer from 'react-diff-viewer';
import { supabase } from '@/utils/supabaseClient';
import { RefreshCcw } from 'lucide-react';
import FileCopyIcon from '@mui/icons-material/FileCopy';

interface FileVersion {
  id: string;
  version: number;
  last_prompt: string;
  code: string;
  created_at: string;
}

interface OptionType {
  value: string;
  label: string;
}

interface FileDiffViewerProps {
  fileId: string;
  currentCode: string;
  onCopyToCurrentFile: (code: string) => void;
}

const customStyleSelect = {
  control: (provided: any) => ({
    ...provided,
    minHeight: '38px',
    background: 'rgba(193,219,253,0.15)',
    border: '1px solid #e0e0e0',
    boxShadow: 'none',
    margin: '0 8px',
    color: '#333',
  }),
  menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
};

export default function FileDiffViewer({ fileId, currentCode, onCopyToCurrentFile }: FileDiffViewerProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [selectedOld, setSelectedOld] = useState<OptionType | null>(null);
  const [selectedNew, setSelectedNew] = useState<OptionType | null>(null);
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch file versions
  useEffect(() => {
    if (!fileId) {
      console.error('No fileId provided');
      return;
    }
    setLoading(true);
    supabase
      .from('file_versions')
      .select('*')
      .eq('file_id', fileId)
      .order('version', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setVersions(data);
        }
        setLoading(false);
      });
  }, [fileId]);

  // Build options for selects
  const options: OptionType[] = versions.map(v => ({
    value: v.id,
    label: `v${v.version} - ${v.created_at.slice(0, 19).replace('T', ' ')}${v.last_prompt ? ' - ' + v.last_prompt.slice(0, 30) : ''}`
  }));

  // Handlers
  function handleOldSelectChange(option: OptionType | null) {
    setSelectedOld(option);
    const found = versions.find(v => v.id === option?.value);
    setOldCode(found?.code || '');
  }
  function handleNewSelectChange(option: OptionType | null) {
    setSelectedNew(option);
    const found = versions.find(v => v.id === option?.value);
    setNewCode(found?.code || '');
  }
  function refreshDiff() {
    setSelectedOld(null);
    setSelectedNew(null);
    setOldCode('');
    setNewCode('');
  }
  function copyToCurrentFile() {
    if (selectedNew) {
      const found = versions.find(v => v.id === selectedNew.value);
      if (found) onCopyToCurrentFile(found.code);
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className={`w-full flex items-center justify-center mt-6 relative`}>
        <Select
          options={options}
          onChange={handleOldSelectChange}
          value={selectedOld}
          styles={customStyleSelect}
          className="w-full mx-2"
          placeholder="Selecione uma versão antiga"
          isDisabled={loading}
        />
        <Select
          options={options}
          onChange={handleNewSelectChange}
          value={selectedNew}
          styles={customStyleSelect}
          className="w-full mx-2"
          placeholder="Selecione uma versão nova"
          isDisabled={loading}
        />
        <button
          onClick={refreshDiff}
          className={`!absolute left-0 top-10 w-10 h-10 bg-[rgba(193,219,253,0.15)] backdrop-blur-md text-white p-1.5 hover:shadow-gradient transition-all transform-gpu  ease-in-out duration-200`}
          title="Limpar seleção"
        >
          <RefreshCcw size={20} />
        </button>
        <button
          onClick={copyToCurrentFile}
          className={`!absolute right-0 top-10 w-10 h-10 bg-[rgba(193,219,253,0.15)] backdrop-blur-md text-white p-1.5 hover:shadow-gradient transition-all transform-gpu  ease-in-out duration-200`}
          title="Copiar para arquivo atual"
        >
          <FileCopyIcon style={{ fontSize: 20 }} />
        </button>
      </div>
      <div className="flex-1 overflow-auto mt-2">
        <ReactDiffViewer
          oldValue={oldCode}
          newValue={newCode}
          splitView={false}
          leftTitle="Versão Antiga"
          rightTitle="Versão Nova"
        />
      </div>
    </div>
  );
}
