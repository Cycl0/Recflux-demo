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
  // State for copy modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySelected, setCopySelected] = useState<OptionType | null>(null);

  function openCopyModal() {
    setCopySelected(null);
    setShowCopyModal(true);
  }
  function closeCopyModal() {
    setShowCopyModal(false);
  }
  function handleCopySelect(option: OptionType | null) {
    setCopySelected(option);
  }
  function confirmCopyToCurrentFile() {
    if (copySelected) {
      const found = versions.find(v => v.id === copySelected.value);
      if (found) onCopyToCurrentFile(found.code);
      setShowCopyModal(false);
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
          onClick={openCopyModal}
          className={`!absolute right-0 top-10 w-10 h-10 bg-[rgba(193,219,253,0.15)] backdrop-blur-md text-white p-1.5 hover:shadow-gradient transition-all transform-gpu  ease-in-out duration-200`}
          title="Copiar para arquivo atual"
        >
          <FileCopyIcon style={{ fontSize: 20 }} />
        </button>

        {/* Copy-to-current-file Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full flex flex-col relative p-6">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold z-10"
                onClick={closeCopyModal}
                aria-label="Fechar modal de cópia"
              >
                &times;
              </button>
              <h2 className="text-lg font-semibold mb-4">Copiar versão para o arquivo atual</h2>
              <Select
                options={options}
                value={copySelected}
                onChange={handleCopySelect}
                styles={customStyleSelect}
                className="mb-4"
                placeholder="Selecione uma versão para copiar"
                isDisabled={loading}
              />
              <button
                className="px-4 py-2 bg-cyan-600 text-white rounded font-semibold shadow-md hover:bg-cyan-700 transition-all disabled:opacity-50"
                onClick={confirmCopyToCurrentFile}
                disabled={!copySelected}
              >
                Copiar para arquivo atual
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto mt-2">
        <ReactDiffViewer
          oldValue={oldCode}
          newValue={newCode}
          splitView={false}
        />
      </div>
    </div>
  );
}
