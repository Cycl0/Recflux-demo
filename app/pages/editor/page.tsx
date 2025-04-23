"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import Cookies from 'js-cookie';
import { GoogleOAuthProvider, useGoogleOneTapLogin } from '@react-oauth/google';
import WinBoxWindow from '@/components/WinBoxWindow';
import ConfigWindowContent from '@/components/ConfigWindowContent';
import NavBar from '@/components/NavBar';
import CurrentProjectLabel from '@/components/CurrentProjectLabel';
import NavStyledDropdown from '@/components/NavStyledDropdown';
import Editor from "@monaco-editor/react";
import 'react-resizable/css/styles.css';
import { LiveProvider, LivePreview, LiveError } from "react-live";
import {emptyFiles, initialFiles} from "@/utils/files-editor";
import { throttle } from 'lodash';
import { supabase } from '@/utils/supabaseClient';
import { useChat } from 'ai/react'
import CopyButton from '@/components/CopyButton'
import { Bot, User, Moon, Sun } from 'lucide-react'
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import remarkGfm from 'remark-gfm';
import 'prismjs/themes/prism-tomorrow.css';
import TextareaAutosize from 'react-textarea-autosize';
import IconSend from "@/components/IconSend";
import Select from 'react-select';

// Chat action options for the Select component
const chatActionOptions = [
  { value: '1', label: 'GERAR' },
  { value: '2', label: 'EDITAR' },
  { value: '3', label: 'FOCAR' },
  { value: '4', label: 'CHAT' }
];

import { useRouter } from 'next/navigation';
import FileDiffViewer from "@/components/FileDiffViewer";

// Editor context for sending code to the editor
const EditorContext = React.createContext({
  setFilesCurrentHandler: (fileName: string, code: string, index?: number) => {}, // Will be replaced below
  throttleEditorOpen: (open: boolean) => {},
  selectedFile: undefined as undefined | { value?: string; name?: string },
});

interface ChatProps {
  onPromptSubmit?: (prompt: string, fileName?: string, code?: string) => void;
}

function Chat({ onPromptSubmit, theme }: ChatProps & { theme: 'dark' | 'light' }) {
  // Restore chat prompt from cookie
  const [input, setInput] = useState(() => Cookies.get('chatPrompt') || '');
  useEffect(() => {
    Cookies.set('chatPrompt', input, { expires: 7 });
  }, [input]);
  const { setFilesCurrentHandler, throttleEditorOpen, selectedFile } = useContext(EditorContext);
  const [chatAction, setChatAction] = useState({ value: '1', label: 'GERAR' });
  const chat = useChat({
    api: '/api/chat',
  });
  const { messages, handleInputChange: baseHandleInputChange, handleSubmit: baseHandleSubmit, isLoading } = chat;

  // Custom handleInputChange to sync with cookie
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
    baseHandleInputChange(e as any);
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  if (onPromptSubmit) onPromptSubmit(input);
    Cookies.remove('chatPrompt');
    e.preventDefault();
    if (chatAction.value === '2') { // EDITAR
      // Compose a prompt referencing the code from the editor
      const editPrompt = `Aqui está o código atual do arquivo ${selectedFile?.name || ''}: 

${selectedFile?.value || ''}

Edite o código acima conforme o pedido do usuário a seguir. NÃO reescreva tudo, apenas edite o necessário, mantendo o restante igual.

Pedido do usuário: ${input}`;
      chat.append({ role: "user", content: editPrompt });
    } else if (chatAction.value === '3') { // FOCAR
      // Compose a prompt for focusing on a specific element
      const focusPrompt = `Aqui está o código atual do arquivo ${selectedFile?.name || ''}:

${selectedFile?.value || ''}

Extraia do código acima apenas o(s) elemento(s) que correspondem ao pedido do usuário a seguir. NÃO reescreva tudo, apenas retorne o(s) elemento(s) relevante(s), mantendo a estrutura original com <>[...]</> se houver múltiplos. NÃO SE ESQUEÇA DE MANTER O WRAP COM A FUNÇÃO E O METODO RENDER.

Pedido do usuário: ${input}`;
      chat.append({ role: "user", content: focusPrompt });
    } else if (chatAction.value === '4') { // CHAT
      // Compose a prompt for chatting with context
      const chatPrompt = `Aqui está o código atual do arquivo ${selectedFile?.name || ''}:

${selectedFile?.value || ''}

Além disso, considere todas as seções de código já geradas nesta conversa:

Considere todo esse contexto (o código atual e o código já gerado) para responder à solicitação do usuário de forma significativa. NÃO edite ou reescreva o código, apenas utilize o contexto para conversar sobre ele.

Pedido do usuário: ${input}`;
      chat.append({ role: "user", content: chatPrompt });
    } else {
      baseHandleSubmit(e);
    }
  };


  const [allCodeGenerated, setAllCodeGenerated] = useState<string[]>([]);
  const [autoSentCodes, setAutoSentCodes] = useState<{[key: string]: boolean}>({});
  const [sendingToEditor, setSendingToEditor] = useState(false); // visual indicator
  const lastUserMessageId = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg?.id !== lastUserMessageId.current) {
      // Only reset if a new user message is detected
      setAllCodeGenerated([]);
      processedMessagesRef.current = new Set();
      lastUserMessageId.current = lastUserMsg?.id || null;
      return;
    }

    let newCode: string[] = [];
    let updated = false;
    for (const message of messages) {
      if (message.role === 'assistant' && !processedMessagesRef.current.has(message.id)) {
        const codeBlocks = message.content
          .split(/```/g)
          .filter((_, i) => i % 2 === 1)
          .map(code => code.replace(/^[a-zA-Z0-9]+\n/, '').trim());
        newCode = newCode.concat(codeBlocks);
        processedMessagesRef.current.add(message.id);
        updated = true;
      }
    }
    if (newCode.length > 0) {
      setAllCodeGenerated(prev => [...prev, ...newCode]);
    }
  }, [messages]);

  // Only send code to the editor when the prompt is finished (assistant's last message is complete and not streaming)
  useEffect(() => {
    if (chatAction.value == '4') return;
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;
    if (autoSentCodes[lastMessage.id]) return;
    // If the assistant is still streaming, don't send yet
    if (isLoading) return;
    // Send code to editor
    setSendingToEditor(true);
    // Collect all code blocks from the last assistant message
    const codeBlocks = lastMessage.content
      .split(/```/g)
      .filter((_, i) => i % 2 === 1)
      .map(code => code.replace(/^[a-zA-Z0-9]+\n/, '').trim());
    codeBlocks.forEach((codeContent, idx) => {
      let filteredContent = codeContent.replace(/^(jsx|tsx|js|html|css|svg|xml|json|python|typescript|javascript|do not copy this line|\/\/.*)\s*\n/i, '');
      let langMatch = filteredContent.match(/^([a-zA-Z0-9]+)/);
      let lang = langMatch ? langMatch[1].toLowerCase() : '';
      let fileName = 'script.js';
      if (lang && lang.includes('html')) fileName = 'index.html';
      else if (lang && lang.includes('css')) fileName = 'style.css';
      else if (lang && lang.includes('js')) fileName = 'script.js';
      else if (lang && (lang.includes('svg') || lang.includes('xml'))) fileName = 'image.svg';
      setFilesCurrentHandler(fileName, filteredContent, 0);
      throttleEditorOpen(true);
      if (onPromptSubmit) {
        onPromptSubmit(input, fileName, filteredContent);
      }
    });
    setAutoSentCodes(prev => ({ ...prev, [lastMessage.id]: true }));
    setTimeout(() => setSendingToEditor(false), 1200); // show indicator for 1.2s
  }, [messages, chatAction.value, isLoading]);

  return (
    <div className={`relative flex flex-col h-full rounded-lg shadow-lg  ${theme === 'dark' ? 'bg-[#232733]' : 'bg-white'}`}>
      {/* Chat messages area */}
      <div className={`flex-1 space-y-4 !pb-[200px] p-4 ${theme === 'dark' ? 'bg-[#232733]' : 'bg-white'}`}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="relative mb-2">
              {message.role === 'user' ? (
                <span className="float-left mr-2">
                  <User className="w-6 h-6 text-blue-600" />
                </span>
              ) : (
                <span className="float-right mr-2">
                  <Bot className="w-6 h-6 text-gray-400" />
                </span>
              )}
            </div>
            <div className={`inline-block max-w-[80%] px-4 py-2 rounded-lg shadow-md break-words whitespace-pre-wrap
                ${message.role === 'user'
                  ? theme === 'dark'
                    ? 'bg-cyan-400/20 text-cyan-100 border border-cyan-400/40 backdrop-blur-md'
                    : 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                  : theme === 'dark'
                    ? 'bg-white/10 text-cyan-100 border border-cyan-700/70 backdrop-blur-lg'
                    : 'bg-white text-gray-900 border border-cyan-100'}
              `}
              style={theme === 'dark' ? { boxShadow: '0 4px 32px 0 rgba(34,211,238,0.10)', backgroundClip: 'padding-box' } : {}}>

              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypePrism]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    // For buttons, extract raw text
                    function extractTextFromChildren(children: React.ReactNode): string {
                      if (typeof children === 'string' || typeof children === 'number') return String(children);
                      if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
                      if (React.isValidElement(children) && children.props && children.props.children) {
                        return extractTextFromChildren(children.props.children);
                      }
                      return '';
                    }
                    let codeContent = extractTextFromChildren(children);
                    codeContent = codeContent.replace(/\n$/, '');
                    return !inline ? (
                      <div className="relative my-4 bg-white/10 rounded-xl shadow-md p-2 overflow-x-auto glassmorphism-border">
                        <div className="flex gap-2 mb-1 justify-end">
                          <CopyButton text={codeContent} />
                          <button
                            className="ml-1 px-2 py-1 bg-blue-200 text-blue-900 rounded shadow-gradient hover:bg-blue-300 transition-all duration-300 ease-in-out"
                            title="Enviar para o Editor"
                            onClick={() => {
                              // Guess file extension from language
                              let lang = match ? match[1].toLowerCase() : '';
                              let fileName = 'script.js';
                              if (lang && lang.includes('html')) fileName = 'index.html';
                              else if (lang && lang.includes('css')) fileName = 'style.css';
                              else if (lang && lang.includes('js')) fileName = 'script.js';
                              else if (lang && (lang.includes('svg') || lang.includes('xml'))) fileName = 'image.svg';
                              setFilesCurrentHandler(fileName, codeContent, 0);
                              throttleEditorOpen(true);
                            }}
                          >
                            Enviar para o Editor
                          </button>
                        </div>
                        <pre className={`${className} !min-h-10`} {...props}>
                          <code className={className}>{children}</code>
                        </pre>
                      </div>
                    ) : (
                      <code className={className} {...props}>{children}</code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
      {/* Chat input form below messages */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 left-0 w-full dark:bg-[#232733] bg-transparent p-4 z-10 flex flex-col gap-2">
        <Select
          className="w-32 mb-2"
          value={chatAction}
          onChange={setChatAction}
          isSearchable={false}
          options={chatActionOptions}
          styles={{
            control: (provided, state) => ({
              ...provided,
              background: theme === 'dark'
                ? (state.isFocused
                    ? 'rgba(255,255,255,0.92)'
                    : 'rgba(255,255,255,0.82)')
                : (state.isFocused
                    ? 'rgba(186,230,253,0.35)'
                    : 'rgba(255,255,255,0.18)'),
              color: theme === 'dark' ? '#232733' : '#0e7490',
              border: state.isFocused
                ? (theme === 'dark' ? '2px solid #67e8f9' : '2px solid rgba(34,211,238,0.30)')
                : (theme === 'dark' ? '1.5px solid #164e63' : '1.5px solid rgba(14,116,144,0.13)'),
              boxShadow: state.isFocused
                ? '0 4px 32px 0 rgba(34,211,238,0.18)'
                : '0 2px 12px 0 rgba(14,116,144,0.10)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              cursor: 'pointer',
              fontWeight: 500,
              borderRadius: 14,
              minHeight: 44,
              transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
            }),
            menu: (provided) => ({
              ...provided,
              background: theme === 'dark' ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.22)',
              color: theme === 'dark' ? '#232733' : '#0e7490',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 16,
              boxShadow: '0 8px 32px 0 rgba(34,211,238,0.12)',
              border: theme === 'dark' ? '1.5px solid #67e8f9' : '1.5px solid rgba(14,116,144,0.13)',
              marginBottom: 8,
              marginTop: 0,
              overflow: 'hidden',
            }),
            option: (provided, state) => ({
              ...provided,
              background: theme === 'dark'
                ? (state.isSelected
                    ? 'rgba(186,230,253,0.42)'
                    : state.isFocused
                      ? 'rgba(186,230,253,0.22)'
                      : 'transparent')
                : (state.isSelected
                    ? 'rgba(186,230,253,0.42)'
                    : state.isFocused
                      ? 'rgba(186,230,253,0.22)'
                      : 'transparent'),
              color: theme === 'dark' ? '#232733' : '#0e7490',
              fontWeight: state.isSelected ? 700 : 500,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }),
            singleValue: (provided) => ({
              ...provided,
              color: theme === 'dark' ? '#232733' : '#0e7490',
              fontWeight: 700,
            }),
            dropdownIndicator: (provided) => ({
              ...provided,
              color: theme === 'dark' ? '#232733' : '#0e7490',
            }),
            indicatorSeparator: (provided) => ({
              ...provided,
              backgroundColor: theme === 'dark' ? '#67e8f9' : 'rgba(14,116,144,0.13)',
            }),
            input: (provided) => ({
              ...provided,
              color: theme === 'dark' ? '#232733' : '#0e7490',
            }),
          }}
          menuPlacement="top"
        />
        <div className="flex gap-2 items-center">
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            placeholder="Digite o que deseja fazer..."
            className="flex-1 resize-none p-2 bg-gray-100 dark:bg-[#1a1d22] backdrop-blur-md text-gray-900 dark:text-gray-100 focus:bg-gray-200 dark:focus:bg-[#1a1d22] border-none placeholder-gray-900 dark:placeholder-gray-100 rounded-xl shadow-[0_4px_32px_0_rgba(34,211,238,0.18)] outline-none focus:ring-2 focus:ring-cyan-200/40 transition-all duration-300 ease-in-out"
            rows={1}
          />
          {sendingToEditor && (
            <span className="animate-spin text-cyan-700" title="Enviando para o Editor">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </span>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="py-3 px-4 bg-gradient-to-br from-cyan-300/80 to-blue-100/70 backdrop-blur-md text-cyan-900 rounded-xl shadow-[0_4px_32px_0_rgba(34,211,238,0.22)] hover:from-cyan-200/90 hover:to-blue-50/80 focus:bg-cyan-100/80 active:bg-cyan-400/80 transition-all duration-300 ease-in-out disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-200/40"
            aria-label="Enviar mensagem"
          >
            <IconSend
              className={`relative transition-transform duration-500 ease-in-out ${isLoading ? 'rotate-90' : '-rotate-90'}`}
            />
          </button>
        </div>
      </form>
    </div>
  );
}

function TriggerableGoogleOneTapHandler({ open, onClose }: { open: boolean, onClose: () => void }) {
 
  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      // console.log('One Tap Success:', credentialResponse);
      const { credential } = credentialResponse;
      // Exchange Google credential for Supabase session
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });
      if (error) {
        console.error('Supabase signInWithIdToken error:', error);
      } else {
        // console.log('Supabase session:', data);
      }
      onClose();
    },
    onError: () => {
      console.log('One Tap Login Failed');
      onClose();
    },
    promptMomentNotification: notification => {
      // console.log('Prompt notification:', notification);
      if (
        (notification.isNotDisplayed && notification.isNotDisplayed()) ||
        (notification.isSkippedMoment && notification.isSkippedMoment()) ||
        (notification.isDismissedMoment && notification.isDismissedMoment())
      ) {
        onClose();
      }
    }
  });
  return null;
}

function useSupabaseGoogleRegistration() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper to register/update user in your table
  const registerUserIfNeeded = async (sessionUser) => {
    if (!sessionUser) {
      console.log('[registerUserIfNeeded] No sessionUser');
      return;
    }
    // console.log('[registerUserIfNeeded] sessionUser:', sessionUser);
    setUser(sessionUser);
    const userEmail = sessionUser.email;
    if (!userEmail) return;
    const { data: customUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    // Do not call setPublicUserId here. Only handle user registration/updating in this hook.
    // Setting publicUserId is handled in the Home component's useEffect.
    // if (customUser) {
    //   setPublicUserId(customUser.id);
    // }
  };

  useEffect(() => {
    // Always check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('[useEffect] getSession result:', session);
      if (session?.user) {
        registerUserIfNeeded(session.user);
      } else {
        console.log('[useEffect] No user in session');
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log('[onAuthStateChange]', event, session);
      if (event === 'SIGNED_IN' && session?.user) {
        registerUserIfNeeded(session.user);
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export default function Home({ onLayoutChange = () => {}, ...props }) {
  // Editor theme state (dark/light) for editor page only
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('editorTheme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('editorTheme', theme);
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const [showDiffModal, setShowDiffModal] = useState(false);
  // Track the last submitted prompt
  const [lastPrompt, setLastPrompt] = useState<string>('');

  // Handle prompt submit from Chat and save file version with prompt
  const handlePromptSubmit = async (prompt: string, fileName?: string, code?: string) => {
    setLastPrompt(prompt);
    if (!fileName || !code) return;
    // Get fileId from filesCurrent
    const fileId = filesCurrent[fileName]?.id;
    if (!fileId || !publicUserId) return;
    // Fetch latest version number
    let nextVersion = 1;
    try {
      const { data: latestVersionRows, error: latestVersionError } = await supabase
        .from('file_versions')
        .select('version')
        .eq('file_id', fileId)
        .order('version', { ascending: false })
        .limit(1);
      if (!latestVersionError && latestVersionRows && latestVersionRows.length > 0) {
        nextVersion = (latestVersionRows[0].version || 0) + 1;
      }
      const { saveFileVersion } = await import('@/utils/supabaseProjects');
      await saveFileVersion(fileId, prompt, code, nextVersion, publicUserId);
    } catch (err) {
      // Ignore save errors for now
    }
  };

  // Step 1: Add state variable for projects
  const [projects, setProjects] = useState<any[]>([]); // Replace 'any' with your Project type if available
  // Auth state - must be declared FIRST so it's available everywhere
  const { user, loading: userLoading } = useSupabaseGoogleRegistration();

  // Project selection state for ConfigWindowContent
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Handler for when a new project is created
  const handleProjectCreate = (newProjectId: string) => {
    setSelectedProjectId(newProjectId);
  };

  // Automatically select the first project after projects are fetched
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Add state for publicUserId
  const [publicUserId, setPublicUserId] = useState<string | null>(null);

  // Step 2: Fetch and set projects when publicUserId changes
  useEffect(() => {
    async function fetchProjectsAndMaybeCreate() {
      if (!publicUserId) return;
      const projectsList = await import('@/utils/supabaseProjects').then(mod => mod.getUserProjects(publicUserId));
      setProjects(projectsList || []);
      // If no projects, create the initial one
      if (projectsList.length === 0) {
        try {
          const { createProject } = await import('@/utils/supabaseProjects');
          const newProj = await createProject(publicUserId, 'Primeiro Projeto');
          setProjects([newProj]);
          setSelectedProjectId(newProj.id);
        } catch (e) {
          console.error('Failed to create initial project:', e);
        }
      }
    }
    fetchProjectsAndMaybeCreate();
  }, [publicUserId]);

  // Fetch and set publicUserId after login
  useEffect(() => {
    async function fetchCustomUserId() {
      if (!user) return;
      const userEmail = user.email;
      if (!userEmail) return;
      const { data: customUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
      if (customUser) {
        setPublicUserId(customUser.id);
      }
    }
    fetchCustomUserId();
  }, [user]);

  // Project-specific editor state: maps projectId to files object
  const [allFilesCurrent, setAllFilesCurrent] = useState<{ [projectId: string]: any }>({});
  const filesCurrent = (selectedProjectId && allFilesCurrent[selectedProjectId]) ? allFilesCurrent[selectedProjectId] : {};

  // Track project loading state to avoid race condition
  const [loadingProject, setLoadingProject] = useState(false);

  // Load code for the selected project whenever it changes
  useEffect(() => {
    if (!selectedProjectId) {
      console.warn('[LOAD] Skipped: selectedProjectId is falsy', selectedProjectId);
      return;
    }
    setLoadingProject(true);
    // Always try to load from DB for existing projects
    (async () => {
      try {
        const { data: dbFiles, error } = await supabase
          .from('files_metadata')
          .select('*')
          .eq('project_id', selectedProjectId);
        if (error) throw error;
        let filesObj = {};
        if (dbFiles && dbFiles.length > 0) {
          for (const file of dbFiles) {
            // Fetch the latest code from file_versions
            let codeValue = '';
            try {
              const { data: versionRows, error: versionError } = await supabase
                .from('file_versions')
                .select('code')
                .eq('file_id', file.id)
                .order('version', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1);
              if (!versionError && versionRows && versionRows.length > 0) {
                codeValue = versionRows[0].code || '';
              }
            } catch (err) {
              // leave codeValue as ''
            }
            filesObj[file.name] = {
              name: file.name,
              id: file.id,
              language: file.language || '',
              value: codeValue,
              desc: file.desc || ''
            };
          }
        } else {
          // Only use initialFiles if truly new project (no files in DB)
          filesObj = { ...initialFiles };
        }
        setAllFilesCurrent(prev => ({
          ...prev,
          [selectedProjectId]: filesObj
        }));
        setLoadingProject(false);
      } catch (e) {
        setLoadingProject(false);
        setAllFilesCurrent(prev => ({
          ...prev,
          [selectedProjectId]: { ...initialFiles }
        }));
      }
    })();
  }, [selectedProjectId]);

  // Persist editor code to the correct cookie whenever it changes
  useEffect(() => {
    if (!selectedProjectId) {
      console.warn('[SAVE] Skipped: selectedProjectId is falsy', selectedProjectId);
      return;
    }
    if (loadingProject) {
      console.log('[SAVE] Skipped: loadingProject is true');
      return;
    }
    const storageKey = `editorCode_${selectedProjectId}`;
    localStorage.setItem(storageKey, JSON.stringify(allFilesCurrent[selectedProjectId]));
    // console.log('[SAVE] storageKey', storageKey, 'selectedProjectId', selectedProjectId, 'files', allFilesCurrent[selectedProjectId], 'localStorage', localStorage.getItem(storageKey));
  }, [allFilesCurrent, selectedProjectId, loadingProject]);

  // Manual Save logic
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  // Editor file type for type safety
  type EditorFile = { value?: string; [key: string]: any };


  // Save project files to Supabase DB (skip if unchanged)
  const saveProjectFilesToDB = useCallback(async () => {
    if (!selectedProjectId || !publicUserId) return;
    const filesToSave: Record<string, EditorFile> = allFilesCurrent[selectedProjectId] || {};

    // Build a map of { fileName: code } for current in-memory code
    const currentFilesCode: Record<string, string> = {};
    for (const [fileName, fileObj] of Object.entries(filesToSave)) {
      // Only compare the 'value' (code) field for each file
      currentFilesCode[fileName] = typeof fileObj.value === 'string' ? fileObj.value : '';
    }

    // Get previous code from localStorage
    const storageKey = `files_${publicUserId}_${selectedProjectId}`;
    let previousFilesCode: Record<string, string> = {};
    const localStorageFilesRaw = localStorage.getItem(storageKey);
    if (localStorageFilesRaw) {
      try {
        const parsed = JSON.parse(localStorageFilesRaw);
        for (const [fileName, fileObj] of Object.entries(parsed)) {
          // Only compare the 'value' (code) field for each file
          previousFilesCode[fileName] = (fileObj as EditorFile).value || '';
        }
      } catch (e) {
        previousFilesCode = {};
      }
    }

    // Skip save if previous code from localStorage is the same as current
    if (JSON.stringify(previousFilesCode) === JSON.stringify(currentFilesCode)) {
      // No code changes, skip save
      return;
    }

    const now = new Date().toISOString();
    // Track if any file failed to save
    let allSuccess = true;
    for (const [fileName, fileObj] of Object.entries(filesToSave)) {
      const typedFileObj = fileObj as EditorFile;
      // 1. Upsert into files table by (project_id, name)
      const { data: fileRows, error: fileError } = await supabase
        .from('files_metadata')
        .upsert([
          {
            project_id: selectedProjectId,
            name: fileName,
            updated_at: now,
          }
        ], { onConflict: 'project_id,name', ignoreDuplicates: false })
        .select();

      if (fileError) {
        console.error(`[DB SAVE] Failed to upsert file '${fileName}':`, fileError);
        allSuccess = false;
        break;
      }
      const fileId = fileRows && fileRows.length > 0 ? fileRows[0].id : undefined;
      if (!fileId) {
        console.error(`[DB SAVE] Could not get file_id for '${fileName}' after upsert.`);
        allSuccess = false;
        break;
      }
      // 2. Insert new file_versions row for history
      // Fetch the latest version for this file
      let nextVersion = 1;
      try {
        const { data: latestVersionRows, error: latestVersionError } = await supabase
          .from('file_versions')
          .select('version')
          .eq('file_id', fileId)
          .order('version', { ascending: false })
          .limit(1);
        if (!latestVersionError && latestVersionRows && latestVersionRows.length > 0) {
          nextVersion = (latestVersionRows[0].version || 0) + 1;
        }
      } catch (e) {
        // fallback to version 1
      }
      // Only pass lastPrompt if this save was triggered by code generation
      // For manual save/autosave/copy, pass null
      const { saveFileVersion } = await import('@/utils/supabaseProjects');
      try {
        await saveFileVersion(fileId, null, typedFileObj.value || '', nextVersion, publicUserId);
        console.log(`[DB SAVE] Saved file '${fileName}' and version to DB.`);
      } catch (versionError) {
        console.error(`[DB SAVE] Failed to insert file_version for '${fileName}':`, versionError);
        allSuccess = false;
        break;
      }
    }

    // After all upserts succeed, update localStorage to match current files
    // This ensures the next save compares to the latest version
    if (allSuccess) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filesToSave));
      } catch (e) {
        console.error('Failed to update localStorage after save:', e);
      }
    }
  }, [selectedProjectId, publicUserId, allFilesCurrent]);

  // Throttle manual save to avoid rapid consecutive saves (2s window)
const throttledSaveEditorCode = useMemo(() => throttle(() => {
  if (!selectedProjectId) return;
  setSaveStatus('saving');
  const storageKey = `editorCode_${selectedProjectId}`;
  localStorage.setItem(storageKey, JSON.stringify(allFilesCurrent[selectedProjectId] || initialFiles));
  saveProjectFilesToDB(); // Also save to DB on manual save
  setSaveStatus('saved');
  setTimeout(() => setSaveStatus('idle'), 1200);
}, 2000, { trailing: false }), [selectedProjectId, allFilesCurrent, saveProjectFilesToDB]);


  // Auto-save every 1 minute (localStorage only)
  useEffect(() => {
    if (!selectedProjectId) return;
    const interval = setInterval(() => {
      const storageKey = `editorCode_${selectedProjectId}`;
      localStorage.setItem(storageKey, JSON.stringify(allFilesCurrent[selectedProjectId] || initialFiles));
    }, 1 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedProjectId, allFilesCurrent]);

  // Auto-save to DB every 2 minutes if files have changed
  const lastDBSavedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedProjectId || !publicUserId) return;
    const interval = setInterval(() => {
      const filesToSave = allFilesCurrent[selectedProjectId] || initialFiles;
      const serialized = JSON.stringify(filesToSave);
      if (serialized !== lastDBSavedRef.current) {
        saveProjectFilesToDB();
        lastDBSavedRef.current = serialized;
      }
    }, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, [selectedProjectId, publicUserId, allFilesCurrent, saveProjectFilesToDB]);

  // Track the last file sent to the editor
  const [lastUpdatedFile, setLastUpdatedFile] = useState('script.js');

  // Files
  const [filesRecentPrompt, setFilesRecentPrompt] = useState([]);
  const [filesGenerated, setFilesGenerated] = useState([]);

  // Update selectedFile when filesCurrent or lastUpdatedFile changes
  useEffect(() => {
    if (filesCurrent[lastUpdatedFile]) {
      setSelectedFile(filesCurrent[lastUpdatedFile]);
    }
  }, [filesCurrent, lastUpdatedFile]);

  const [selectedFile, setSelectedFile] = useState(filesCurrent["script.js"]);
  const handleFileSelect = (fileName) => (e) => {
    e.preventDefault();
    setSelectedFile(filesCurrent[fileName]);
    setLastUpdatedFile(fileName);
  };
function GoogleSignInButton() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/pages/editor`
  }
});
  };
  return (
    <button
      onClick={handleGoogleLogin}
      title="Sign in with Google"
      className="
        px-4 h-9 flex items-center justify-center
        rounded-full
        bg-cyan-400/30
        text-cyan-200
        font-semibold
        shadow-md
        border border-cyan-200/30
        backdrop-blur-md
        transition-all
        hover:bg-cyan-400/50
        hover:text-white
        hover:shadow-cyan-400/40
        hover:scale-105
        focus:outline-none
        focus:ring-2 focus:ring-cyan-300
      "
      style={{
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        fontSize: 15,
        letterSpacing: 0.5,
      }}
    >
      Sign in
    </button>
  );
}

    // Compose Handlers
  function setFilesHandler(setter, fileName, content, desc) {
    setter(prevState => ({
      ...prevState,
      [fileName]: {
        ...(prevState[fileName] || {}),
        value: content,
        desc: desc
      }
    }));
  }

    // Handlers
    const setFilesGeneratedHandler = (fileName, content) =>
        setFilesHandler(setFilesGenerated, fileName, content, getDateTime());
    const setFilesRecentPromptHandler = (fileName, content) =>
        setFilesHandler(setFilesRecentPrompt, fileName, content, getDateTime());
    const setFilesCurrentHandler = (fileName: string, content: string, index?: number) => {
  if (!selectedProjectId) return;
  setAllFilesCurrent(prev => ({
    ...prev,
    [selectedProjectId]: {
      ...prev[selectedProjectId],
      [fileName]: {
        ...((prev[selectedProjectId] && prev[selectedProjectId][fileName]) || {}),
        value: content,
      },
    },
  }));
  setLastUpdatedFile(fileName);
};

  // Throttle editor value updates to 200ms to avoid UI overload
const handleEditorChange = useMemo(
  () => throttle((value, event) => {
    setFilesCurrentHandler(selectedFile?.name, value);
  }, 200),
  [selectedFile?.name, setFilesCurrentHandler]
);


    function indexHandler(index) {
        setIndex(index);
    }

    function getDateTime() {
        const date = new Date();
        const currentDate = (date.getMonth() + 1) + "-" + date.getDate();
        const currentTime = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        return currentDate + "-" + currentTime;
    }

   // diff
    const [codeData, setCodeData] = useState([]);

    // fetch
    //

    const [demoThumbnails, setDemoThumbnails] = useState([]);
    const [demoUrl, setDemoUrl] = useState([]);

  const editorRef = useRef(null);

  const [index, setIndex] = useState(-1);
  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  };

    const [code, setCode] = useState(false);

  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [mounted, setMounted] = useState(false);
  const [initialLayout, setInitialLayout] = useState(null);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [zIndexCustomGridItem, setZIndexCustomGridItem] = useState(10);

    useEffect(() => {
    setMounted(true);
  }, []);

  const [overlapPanels, setOverlapPanels] = useState(true);
  const toggleOverlap  = () => {
    setOverlapPanels(prevOverlap => !prevOverlap);
  };

  // Function to open the editor (used in context)
  const throttleEditorOpen = (open: boolean) => {
    setCode(open);
  };

  const onBreakpointChange = useCallback((breakpoint) => {
    setCurrentBreakpoint(breakpoint);
    console.log(currentBreakpoint);
  }, [currentBreakpoint]);

  type LayoutType = { [key: string]: any };


  const onResize = useCallback(
    (layout, oldItem, newItem, placeholder, e, element) => {
          setActiveKey(newItem.i); // Set the active key to the currently resized item
          setZIndexCustomGridItem(zIndexCustomGridItem + 1);
          const updatedLayout = layout.map((item) => {
        if (item.i === newItem.i) {
          return newItem;
        } else {
          return {
            ...item,
            w: Math.max(1, props.cols[currentBreakpoint] - newItem.w),
            x: newItem.x === 0 ? newItem.w : props.cols[currentBreakpoint] - item.w,
          };
        }
      });

    },
    [props.cols, currentBreakpoint]
  );

  const onDragStart = useCallback(
    (layout, oldItem, newItem, placeholder, e, element) => {
          setActiveKey(newItem.i); // Set the active key to the currently dragged item
          setZIndexCustomGridItem(zIndexCustomGridItem + 1);
      },
      []
  );

  const reactScope = {
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    useReducer: React.useReducer,
    useRef: React.useRef,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useContext: React.useContext,
    Component: React.Component,
  };

  const { push } = useRouter();


   useEffect(() => {
    const handleHashScroll = (e: Event) => {
      e.preventDefault();
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
      }
    };

  window.addEventListener('hashchange', handleHashScroll);
  return () => window.removeEventListener('hashchange', handleHashScroll);
}, []);

const centerWinBox = (id: string) => {
  const winbox = window.winboxWindows?.[id];
  if (winbox) {
    const width = winbox.width;
    const height = winbox.height;
    const x = Math.max(0, (window.innerWidth - width) / 2);
    const y = Math.max(0, (window.innerHeight - height) / 2);
    winbox.move(x, y);
    winbox.focus();
  }
};

let navExtra;
const themeToggleButton = (
  <button
    onClick={toggleTheme}
    aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
    className="px-3 py-1 rounded border border-cyan-400 bg-transparent text-black dark:text-white dark:border-cyan-400 hover:bg-blue-100 dark:hover:bg-[#232733] transition mr-4 flex items-center justify-center"

  >
    {theme === 'dark' ? (
      <Sun size={24} strokeWidth={2} />
    ) : (
      <Moon size={24} strokeWidth={2} color="#67e8f9" />
    )}
  </button>
);
const handleLogout = async () => {
  // Sign out from Supabase
  await supabase.auth.signOut();
  // Optionally clear user state or reload
  window.location.reload();
};
// console.log('user:', user);
// console.log('publicUserId:', publicUserId);
// console.log('projects:', projects);
// console.log('selectedProjectId:', selectedProjectId);
if (userLoading) {
  navExtra = (
    <div className="flex items-center justify-center h-9 px-4">
      {themeToggleButton}
      <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></span>
    </div>
  );
} else if (user) {
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")?.[0] || "";
  const email = user.email;
  const avatarUrl =
    user.user_metadata?.avatar_url || "/images/icon.png";
  navExtra = (
    <>
      {themeToggleButton}
      {(publicUserId && selectedProjectId) && (
        <CurrentProjectLabel
          userId={publicUserId}
          selectedProjectId={selectedProjectId}
          onOpenConfig={() => setShowConfigModal(true)}
        />
      )}
      <NavStyledDropdown
        name={name}
        email={email}
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
        onOpenProjectModal={() => setShowConfigModal(true)}
      />
    </>
  );
} else {
  navExtra = <>{themeToggleButton}<GoogleSignInButton /></>;
}

// State for modal
const [showConfigModal, setShowConfigModal] = useState(false);
const [showCopyModal, setShowCopyModal] = useState(false);
const [copyTargetFile, setCopyTargetFile] = useState("");
const [codeToCopy, setCodeToCopy] = useState("");
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";
const [showOneTap, setShowOneTap] = useState(false);

// Handler for FileDiffViewer to open the copy modal
function handleCopyToCurrentFile(code: string) {
  setCodeToCopy(code);
  setShowCopyModal(true);
  setCopyTargetFile("");
}


// Show Google One Tap automatically for unauthenticated users
useEffect(() => {
  if (!user && !userLoading) {
    setShowOneTap(true);
  } else {
    setShowOneTap(false);
  }
}, [user, userLoading]);

return (
  <GoogleOAuthProvider clientId={clientId}>
    {showOneTap && (
      <TriggerableGoogleOneTapHandler open={showOneTap} onClose={() => setShowOneTap(false)} />
    )}
    <div className={theme === 'dark' ? 'dark bg-blue-gradient min-h-screen w-full relative' : 'bg-blue-gradient min-h-screen w-full relative'}>
      <EditorContext.Provider value={{ setFilesCurrentHandler, throttleEditorOpen, selectedFile }}>
        <NavBar extra={navExtra} />
        <WinBoxWindow id="chat" title="Chat" x={50} y={100} width={525} height={500}>
          <div className="w-full h-full flex flex-col bg-white/70 dark:bg-[#232733] text-gray-900 dark:text-gray-100 border border-cyan-100 dark:border-cyan-700 rounded-b-md p-0">
            <Chat onPromptSubmit={handlePromptSubmit} theme={theme} />
          </div>
        </WinBoxWindow>
        <WinBoxWindow id="editor" title="Editor" x={610} y={100} width={525} height={500}>
          <div className="w-full h-full flex flex-col min-h-0 min-w-0 bg-white/70 dark:bg-[#232733] text-gray-900 dark:text-gray-100 border border-cyan-100 dark:border-cyan-700 rounded-b-md p-0">
            <div className={`flex items-center gap-4 p-2 border-b ${theme === 'dark' ? 'bg-[#232733] border-cyan-400' : 'bg-white/70 border-cyan-100'}`}>
              <button
                onClick={throttledSaveEditorCode}
                disabled={saveStatus === 'saving'}
                className={`px-2 py-1 rounded bg-cyan-600 text-white font-semibold shadow-md transition-all duration-300 ease-in-out flex items-center justify-center ${saveStatus === 'saving' ? 'opacity-60 cursor-not-allowed' : 'hover:bg-cyan-700'}`}
                style={{ minWidth: 24, minHeight: 24 }}
                aria-label="Salvar código do projeto"
              >
                {saveStatus === 'saved' ? (
                  <svg className="w-[12px] h-[12px] text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : saveStatus === 'saving' ? (
                  <span className="animate-spin w-[12px] h-[12px] border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  // Save icon (floppy disk)
                  <svg className="w-[12px] h-[12px] text-white" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11 2H9v3h2z"/>
                    <path d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v4.5A1.5 1.5 0 0 1 11.5 7h-7A1.5 1.5 0 0 1 3 5.5V1H1.5a.5.5 0 0 0-.5.5m3 4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V1H4zM3 15h10v-4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5z"/>
                  </svg>
                )}
              </button>
              {/* Diff Modal Trigger Button */}
              <button
                onClick={() => setShowDiffModal(true)}
                className="z-[2147483647] px-2 py-1 rounded bg-cyan-600 text-white font-semibold shadow-md transition-all duration-300 ease-in-out flex items-center justify-center hover:bg-sky-600"
                style={{ minWidth: 24, minHeight: 24 }}
                aria-label="Comparar versões do arquivo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4m-2.5 6.5A.5.5 0 0 1 6 10h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5"/>
                  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1"/>
                </svg>
              </button>
            </div>
            <Editor
              key={selectedFile?.name}
              className="flex-1 w-full h-full min-h-0 min-w-0 bg-white/90 dark:bg-[#232733] text-gray-900 dark:text-gray-100"
              width="100%"
              height="100%"
              path={selectedFile?.name}
              defaultLanguage={selectedFile?.language}
              value={filesCurrent[selectedFile?.name]?.value ?? ''}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              onMount={(editor) => {
                editorRef.current = editor;
                setTimeout(() => editor.layout(), 100);
              }}
              onChange={(value) => {
                setFilesCurrentHandler(selectedFile?.name, value ?? '');
              }}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          </div>
        </WinBoxWindow>

        <WinBoxWindow id="preview" title="Preview" x={1175} y={100} width={525} height={500}>
          <div className="w-full h-full flex flex-col bg-white/70 dark:bg-[#232733] text-gray-900 dark:text-gray-100 border border-cyan-100 dark:border-cyan-700 rounded-b-md p-0">
            <LiveProvider code={selectedFile?.value} scope={reactScope} noInline>
              <LivePreview />
              <LiveError className="text-wrap" />
            </LiveProvider>
          </div>
        </WinBoxWindow>
      {showConfigModal && (
        <div
          className="z-[2147483647] fixed top-0 left-0 w-full h-full bg-black/50 dark:bg-[#232733]/50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfigModal(false);
            }
          }}
        >
          <ConfigWindowContent
            userId={publicUserId}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            onProjectCreated={handleProjectCreate}
          />
        </div>
      )}
      {showDiffModal && (
        <div
          className="z-[2147483647] fixed top-0 left-0 w-full h-full bg-black/50 dark:bg-[#232733]/50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDiffModal(false);
            }
          }}
        >
          <FileDiffViewer
            fileId={selectedFile?.id}
            currentCode={selectedFile?.value}
            onCopyToCurrentFile={handleCopyToCurrentFile}
          />
        </div>
      )}
      {/* File Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70">
          <div className="bg-white dark:bg-[#232733] text-gray-900 dark:text-gray-100 border-2 border-cyan-100 dark:border-cyan-700 rounded-lg shadow-xl min-w-[340px] max-w-md w-full p-6 relative">
            <button onClick={() => setShowCopyModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-cyan-400 transition-all text-2xl">&times;</button>
            <h2 className="text-lg font-bold mb-4">Copiar código para arquivo</h2>
            <select
              className="w-full mb-4 p-2 rounded border border-cyan-200 dark:border-cyan-700 bg-gray-100 dark:bg-[#1a1d22] text-gray-900 dark:text-gray-100"
              value={copyTargetFile}
              onChange={e => setCopyTargetFile(e.target.value)}
            >
              <option value="" disabled>Escolha um arquivo</option>
              {Object.keys(filesCurrent).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              className="w-full py-2 rounded bg-cyan-600 text-white font-semibold shadow-md hover:bg-cyan-700 transition-all"
              disabled={!copyTargetFile}
              onClick={() => {
                setFilesCurrentHandler(copyTargetFile, codeToCopy);
                setShowCopyModal(false);
              }}
            >
              Copiar
            </button>
          </div>
        </div>
      )}
              <nav className={`
        w-full h-20 block fixed w-full z-[2147483647] bottom-0 noselect
        shadow-lg bg-gray-900/30 text-blue-100 rounded
        dark:shadow-xl dark:border-t dark:border-cyan-900/40
        dark:bg-[#1a1d22]/80 dark:backdrop-blur-lg dark:backdrop-saturate-150
        dark:shadow-cyan-900/30 dark:border-cyan-900/40
        dark:rounded-t-xl
        transition-all
      `}>
        <div className="w-full h-full flex flex-row justify-between items-end mx-auto px-4 space-y-2">
          {/* Chat Controls */}
          <div className="w-full flex flex-col items-center space-y-1">
            <span className="text-xs text-blue-100 dark:text-cyan-200 mb-1 font-semibold tracking-wide">Chat</span>
              <div className="flex w-full justify-center space-x-2">
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Centralizar e focar Chat"
                  onClick={() => { centerWinBox('chat'); push('#chat'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Centralizar</span>
                </button>
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Focar Chat"
                  onClick={() => { window.winboxWindows?.['chat']?.focus(); push('#chat'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Focar</span>
                </button>
              </div>
            </div>
            {/* Editor Controls */}
            <div className="w-full flex flex-col items-center space-y-1">
              <span className="text-xs text-blue-100 mb-1">Editor</span>
              <div className="flex w-full justify-center space-x-2">
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Centralizar e focar Editor"
                  onClick={() => { centerWinBox('editor'); push('#editor'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Centralizar</span>
                </button>
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Focar Editor"
                  onClick={() => { window.winboxWindows?.['editor']?.focus(); push('#editor'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Focar</span>
                </button>
              </div>
            </div>
            {/* Preview Controls */}
            <div className="w-full flex flex-col items-center space-y-1">
              <span className="text-xs text-blue-100 mb-1">Preview</span>
              <div className="flex w-full justify-center space-x-2">
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Centralizar e focar Preview"
                  onClick={() => { centerWinBox('preview'); push('#preview'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Centralizar</span>
                </button>
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Focar Preview"
                  onClick={() => { window.winboxWindows?.['preview']?.focus(); push('#preview'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Focar</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </EditorContext.Provider>
    </div>
  </GoogleOAuthProvider>
);
}