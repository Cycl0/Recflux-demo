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
  onClose: () => void; // New prop
  theme: 'dark' | 'light';
}

const customStyleSelect = (theme: 'dark' | 'light') => ({
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: '42px',
    background: theme === 'dark'
      ? (state.isFocused ? 'rgba(30,41,59,0.92)' : 'rgba(30,41,59,0.85)')
      : (state.isFocused ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.85)'),
    border: state.isFocused
      ? '1.5px solid #22d3ee'
      : (theme ? '1px solid #334155' : '1px solid #bae6fd'),
    boxShadow: state.isFocused ? '0 0 0 2px #67e8f9' : 'none',
    margin: '0 8px',
    color: theme ? '#e0f2fe' : '#0e2235',
    backdropFilter: 'blur(8px)',
    borderRadius: '0.75rem',
    transition: 'all 0.2s',
    fontWeight: 500,
    fontSize: '1rem',
    outline: 'none',
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 9999,
    background: theme === 'dark' ? 'rgba(30,41,59,0.98)' : 'rgba(255,255,255,1)',
    backdropFilter: 'blur(8px)',
    borderRadius: '0.75rem',
    boxShadow: theme === 'dark' ? '0 8px 32px 0 rgba(34,211,238,0.10)' : '0 8px 32px 0 rgba(0,184,255,0.08)',
    border: theme === 'dark' ? '1px solid #334155' : '1px solid #bae6fd',
    overflow: 'hidden',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    background: state.isSelected
      ? (theme === 'dark' ? 'rgba(34,211,238,0.28)' : 'rgba(34,211,238,0.16)')
      : state.isFocused
      ? (theme === 'dark' ? 'rgba(34,211,238,0.17)' : 'rgba(34,211,238,0.09)')
      : (theme === 'dark' ? 'rgba(30,41,59,0.0)' : 'rgba(255,255,255,0.0)'),
    color: state.isSelected ? (theme === 'dark' ? '#e0f2fe' : '#0369a1') : (theme === 'dark' ? '#e0f2fe' : '#164e63'),
    fontWeight: state.isSelected ? 700 : 500,
    cursor: 'pointer',
    borderRadius: '0.5rem',
    margin: '2px 4px',
    padding: '8px 12px',
    transition: 'background 0.15s',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: theme === 'dark' ? '#e0f2fe' : '#0e2235',
    fontWeight: 600,
    textShadow: theme === 'dark' ? '0 1px 4px rgba(34,211,238,0.14)' : '0 1px 4px rgba(0,184,255,0.08)',
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: theme === 'dark' ? '#bae6fd' : '#38bdf8',
    fontWeight: 400,
    fontSize: '0.98rem',
  }),
  input: (provided: any) => ({
    ...provided,
    color: theme === 'dark' ? '#e0f2fe' : '#0e2235',
  }),
});

export default function FileDiffViewer({ fileId, currentCode, onCopyToCurrentFile, onClose, theme }: FileDiffViewerProps) {
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
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-4xl mx-auto bg-white/70 dark:bg-[#232733]/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 dark:border-white/10 flex flex-col p-6"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >

        <div className={`w-full flex items-center justify-center mt-6 relative`}>
          <Select
          options={options}
          onChange={handleOldSelectChange}
          value={selectedOld}
          styles={customStyleSelect(theme)}
          className="w-full mx-2"
          placeholder="Selecione uma versão antiga"
          isDisabled={loading}
        />
        <Select
          options={options}
          onChange={handleNewSelectChange}
          value={selectedNew}
          styles={customStyleSelect(theme)}
          className="w-full mx-2"
          placeholder="Selecione uma versão nova"
          isDisabled={loading}
        />
        <button
          onClick={refreshDiff}
          className="mt-6 z-10 absolute left-4 top-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-md shadow-[0_4px_24px_0_rgba(0,255,255,0.20)] border border-white/30 dark:border-white/10 text-cyan-700 dark:text-cyan-200 hover:bg-cyan-100/60 dark:hover:bg-cyan-900/30 hover:shadow-cyan-300/60 dark:hover:shadow-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-200"
          title="Limpar seleção"
        >
          <RefreshCcw size={22} />
        </button>
        <button
          onClick={openCopyModal}
          className="mt-6 z-10 absolute right-4 top-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-md shadow-[0_4px_24px_0_rgba(0,255,255,0.20)] border border-white/30 dark:border-white/10 text-cyan-700 dark:text-cyan-200 hover:bg-cyan-100/60 dark:hover:bg-cyan-900/30 hover:shadow-cyan-300/60 dark:hover:shadow-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-200"
          title="Copiar para arquivo atual"
        >
          <FileCopyIcon style={{ fontSize: 22, color: 'inherit' }} />
        </button>

        {/* Copy-to-current-file Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className={`rounded-lg shadow-lg max-w-md w-full flex flex-col relative p-6 
  ${theme === 'dark' ? 'bg-[#232733] text-cyan-100' : 'bg-white text-gray-900'}`}>
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
                styles={customStyleSelect(theme)}
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
      <div className="mt-4 rounded-xl bg-white/70 dark:bg-[#181b20]/80 shadow-inner backdrop-blur p-2"
        style={{ height: '420px', maxHeight: '60vh', overflow: 'auto' }}
      >
        <ReactDiffViewer
          oldValue={oldCode}
          newValue={newCode}
          splitView={false}
          useDarkTheme={theme === 'dark'}
          styles={{
            variables: {
              light: {
                diffViewerBackground: 'rgba(255,255,255,0.85)',
                addedBackground: 'rgba(0,255,128,0.12)',
                removedBackground: 'rgba(255,0,64,0.10)',
                wordAddedBackground: 'rgba(0,255,128,0.25)',
                wordRemovedBackground: 'rgba(255,0,64,0.18)',
                addedGutterBackground: 'rgba(0,255,128,0.08)',
                removedGutterBackground: 'rgba(255,0,64,0.08)',
                gutterBackground: 'rgba(0,0,0,0.03)',
                gutterColor: '#999',
                codeFoldGutterBackground: '#f3f3f3',
                codeFoldBackground: '#f7f7f7',
                emptyLineBackground: 'transparent',
                highlightBackground: 'rgba(0,184,255,0.09)',
                highlightGutterBackground: 'rgba(0,184,255,0.13)',
                removedColor: '#b30000',
                addedColor: '#007a3d',
                codeFoldContentColor: '#555',
              },
              dark: {
                diffViewerBackground: 'rgba(35,39,51,0.95)',
                addedBackground: 'rgba(0,255,128,0.12)',
                removedBackground: 'rgba(255,0,64,0.13)',
                wordAddedBackground: 'rgba(0,255,128,0.22)',
                wordRemovedBackground: 'rgba(255,0,64,0.17)',
                addedGutterBackground: 'rgba(0,255,128,0.08)',
                removedGutterBackground: 'rgba(255,0,64,0.09)',
                gutterBackground: 'rgba(255,255,255,0.04)',
                gutterColor: '#bbb',
                codeFoldGutterBackground: '#232733',
                codeFoldBackground: '#232733',
                emptyLineBackground: 'transparent',
                highlightBackground: 'rgba(0,184,255,0.09)',
                highlightGutterBackground: 'rgba(0,184,255,0.13)',
                removedColor: '#ff6b6b',
                addedColor: '#2ee59d',
                codeFoldContentColor: '#bbb',
              }
            }
          }}
        />
      </div>
    </div>
    </div>
  );
}
