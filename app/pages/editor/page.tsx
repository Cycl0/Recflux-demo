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
import { Bot, User } from 'lucide-react'
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

// const { data, error } = await supabase.from('users').select('*');


// Editor context for sending code to the editor
const EditorContext = React.createContext({
  setFilesCurrentHandler: (fileName: string, code: string, index?: number) => {},
  throttleEditorOpen: (open: boolean) => {},
  selectedFile: undefined as undefined | { value?: string; name?: string },
});

function Chat() {
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
    });
    setAutoSentCodes(prev => ({ ...prev, [lastMessage.id]: true }));
    setTimeout(() => setSendingToEditor(false), 1200); // show indicator for 1.2s
  }, [messages, chatAction.value, isLoading]);

  return (
    <div className="relative flex flex-col h-full rounded-lg shadow-lg bg-transparent">
      {/* Chat messages area */}
      <div className="flex-1 space-y-4 !pb-[200px] p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg shadow-gradient transition-all duration-300 ease-in-out text-gray-600 ${message.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}`}
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
            <div className="markdown-body">
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
                        <pre className={className} {...props}>
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
      <form onSubmit={handleSubmit} className="sticky bottom-0 left-0 w-full bg-transparent p-4 z-10 flex flex-col gap-2">
        <Select
          className="w-32 mb-2"
          value={chatAction}
          onChange={setChatAction}
          isSearchable={false}
          options={chatActionOptions}
          styles={{
            control: (provided, state) => ({
              ...provided,
              background: state.isFocused
                ? 'rgba(186,230,253,0.35)'
                : 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: state.isFocused
                ? '2px solid rgba(34,211,238,0.30)'
                : '1.5px solid rgba(14,116,144,0.13)',
              boxShadow: state.isFocused
                ? '0 4px 32px 0 rgba(34,211,238,0.18)'
                : '0 2px 12px 0 rgba(14,116,144,0.10)',
              color: '#0e7490',
              cursor: 'pointer',
              fontWeight: 500,
              borderRadius: 14,
              minHeight: 44,
              transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
            }),
            menu: (provided) => ({
              ...provided,
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 16,
              boxShadow: '0 8px 32px 0 rgba(34,211,238,0.12)',
              border: '1.5px solid rgba(14,116,144,0.13)',
              marginBottom: 8,
              marginTop: 0,
              overflow: 'hidden',
            }),
            option: (provided, state) => ({
              ...provided,
              background: state.isSelected
                ? 'rgba(186,230,253,0.42)'
                : state.isFocused
                ? 'rgba(186,230,253,0.22)'
                : 'transparent',
              color: '#0e7490',
              fontWeight: state.isSelected ? 700 : 500,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }),
            singleValue: (provided) => ({
              ...provided,
              color: '#0e7490',
              fontWeight: 700,
            }),
            dropdownIndicator: (provided) => ({
              ...provided,
              color: '#0e7490',
            }),
            indicatorSeparator: (provided) => ({
              ...provided,
              backgroundColor: 'rgba(14,116,144,0.13)',
            }),
            input: (provided) => ({
              ...provided,
              color: '#0e7490',
              fontWeight: 600,
            }),
          }}
          menuPlacement="top"
        />
        <div className="flex gap-2 items-center">
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            placeholder="Digite o que deseja fazer..."
            className="flex-1 resize-none p-2 bg-gradient-to-br from-cyan-200/70 to-blue-100/60 backdrop-blur-md text-cyan-900 focus:bg-cyan-100/70 border-none placeholder-cyan-900/70 rounded-xl shadow-[0_4px_32px_0_rgba(34,211,238,0.18)] outline-none focus:ring-2 focus:ring-cyan-200/40 transition-all duration-300 ease-in-out"
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
    const { id, email, user_metadata } = sessionUser;
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (selectError) {
      console.error('[registerUserIfNeeded] select error:', selectError);
    }
    if (!existingUser) {
      const { error: insertError } = await supabase.from('users').insert([
        {
          email,
          username: user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
          google_id: user_metadata?.sub || id,
          full_name: user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
          avatar_url: user_metadata?.avatar_url || null,
        }
      ]);
      if (insertError) {
        console.error('User insert error:', insertError);
      } else {
        console.log('User inserted in users table');
      }
    } else {
      const { error: updateError } = await supabase.from('users').update({
        full_name: user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
        avatar_url: user_metadata?.avatar_url || null,
      }).eq('email', email);
      if (updateError) {
        console.error('User update error:', updateError);
      } else {
        console.log('User updated in users table');
      }
    }
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
  // Auth state - must be declared FIRST so it's available everywhere
  const { user, loading: userLoading } = useSupabaseGoogleRegistration();

  // Project selection state for ConfigWindowContent
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Handler for when a new project is created
  const handleProjectCreate = (newProjectId: string) => {
    setSelectedProjectId(newProjectId);
  };

  // Add state for publicUserId
  const [publicUserId, setPublicUserId] = useState<string | null>(null);

  // Automatically select the most recent project
  useEffect(() => {
    async function fetchAndSetDefaultProject() {
      if (!publicUserId) return;
      if (selectedProjectId) return;
      try {
        const projects = await import('@/utils/supabaseProjects').then(mod => mod.getUserProjects(publicUserId));
        if (Array.isArray(projects) && projects.length > 0) {
          setSelectedProjectId(projects[0].id);
        }
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchAndSetDefaultProject();
  }, [publicUserId, selectedProjectId]);

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

  // Restore editor code from cookie
  const [filesCurrent, setFilesCurrent] = useState(() => {
    const saved = Cookies.get('editorCode');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [initialFiles];
      }
    }
    return [initialFiles];
  });

  // Persist editor code to cookie whenever it changes
  useEffect(() => {
    Cookies.set('editorCode', JSON.stringify(filesCurrent), { expires: 7 });
  }, [filesCurrent]);
  useEffect(() => {
    Cookies.set('editorCode', JSON.stringify(filesCurrent), { expires: 7 });
  }, [filesCurrent]);
  // Track the last file sent to the editor
  const [lastUpdatedFile, setLastUpdatedFile] = useState('script.js');
  // ...existing Home logic
  // Make sure to render <Chat /> inside the EditorContext.Provider
  // (No change needed here unless Chat is rendered elsewhere)


  // Files
  const [filesRecentPrompt, setFilesRecentPrompt] = useState([]);
  const [filesGenerated, setFilesGenerated] = useState([]);

  // Update selectedFile when filesCurrent or lastUpdatedFile changes
  useEffect(() => {
    if (filesCurrent[0][lastUpdatedFile]) {
      setSelectedFile(filesCurrent[0][lastUpdatedFile]);
    }
  }, [filesCurrent, lastUpdatedFile]);

  const [selectedFile, setSelectedFile] = useState(filesCurrent[0]["script.js"]);
  const handleFileSelect = (fileName) => (e) => {
    e.preventDefault();
    setSelectedFile(filesCurrent[0][fileName]);
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
  function setFilesHandler(setter, fileName, content, desc, index = 0) {
    setter(prevState => {
        const newState = [...prevState];

        // Ensure the array has enough elements
        while (newState.length <= index) {
            newState.push({ ...emptyFiles });
        }

        // Defensive check
        if (!newState[index]) {
            newState[index] = { ...emptyFiles };
        }

        newState[index] = {
            ...newState[index],
            [fileName]: {
                ...(newState[index][fileName] || {}),  // Defensive
                value: content,
                desc: desc
            },
        };

        return newState;
    });
}

    // Handlers
    const setFilesGeneratedHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesGenerated, fileName, content, getDateTime(), index);
    const setFilesRecentPromptHandler = (fileName, content, index = 0) =>
        setFilesHandler(setFilesRecentPrompt, fileName, content, getDateTime(), index);
    const setFilesCurrentHandler = (fileName, content, index = 0) => {
    setFilesHandler(setFilesCurrent, fileName, content, getDateTime(), index);
    setLastUpdatedFile(fileName);
  };

  // Throttle editor value updates to 200ms to avoid UI overload
const handleEditorChange = useMemo(
  () => throttle((value, event) => {
    setFilesCurrentHandler(selectedFile?.name, value, 0);
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
    // useEffect(() => {
    //     const fetchData = async () => {
    //         try {
    //             const codeResponse = await fetch('/api/code');
    //             const urlResponse = await fetch('/api/url');

    //             const codeData = await codeResponse.json();
    //             const urlData = await urlResponse.json();
    //             const thumbnailUrlsData = await Promise.all(
    //                 urlData.map(async (url) => {
    //                     try {
    //                         const response = await fetch(`/api/thumbnail?url=${encodeURIComponent(url)}`);
    //                         if (!response.ok) {
    //                             console.error(`Failed to fetch thumbnail for ${url}:`, response.status, response.statusText);
    //                             const text = await response.text();
    //                             console.error('Response body:', text);
    //                             return null; // or a placeholder image URL
    //                         }
    //                         const blob = await response.blob();
    //                         return URL.createObjectURL(blob);
    //                     } catch (error) {
    //                         console.error(`Error fetching thumbnail for ${url}:`, error);
    //                         return null; // or a placeholder image URL
    //                     }
    //                 })
    //             );
    //             setCodeData(codeData || []);
    //             setFilesGeneratedHandler("index.html", codeData.demoCodeHTML[0], 0);
    //             setFilesGeneratedHandler("style.css", codeData.demoCodeCSS[0], 0);
    //             setFilesGeneratedHandler("script.js", codeData.demoCodeJS[0], 0);
    //             setFilesGeneratedHandler("image.svg", codeData.demoSVG[0], 0);
    //             setDemoUrl(urlData || []);
    //             setDemoThumbnails(thumbnailUrlsData.filter(Boolean));
    //         } catch (error) {
    //             console.error('Error fetching data:', error);
    //         }
    //     };
    //     fetchData();
    // }, []);


  const editorRef = useRef(null);

  const [index, setIndex] = useState(-1);
  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  };

    const [code, setCode] = useState(false);

  // WinBox.js does not require ResponsiveReactGridLayout
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [mounted, setMounted] = useState(false);
  const [initialLayout, setInitialLayout] = useState(null);


  /* const [layouts, setLayouts] = useState<LayoutType>({ lg: initialLayout }); */
  // No grid layouts needed for WinBox.js

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
    /*
    *   const onDragStop = useCallback(
    *     (layout, oldItem, newItem, placeholder, e, element) => {
    *       setActiveKey(null); // Reset active key when dragging stops
    *     },
    *     []
    *   );
    *  */

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
const handleLogout = async () => {
  // Sign out from Supabase
  await supabase.auth.signOut();
  // Optionally clear user state or reload
  window.location.reload();
};

if (userLoading) {
  navExtra = (
    <div className="flex items-center justify-center h-9 px-4">
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
      <CurrentProjectLabel
        userId={publicUserId}
        selectedProjectId={selectedProjectId}
        onOpenConfig={() => setShowConfigModal(true)}
      />
      <NavStyledDropdown
        name={name}
        email={email}
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
      />
    </>
  );
} else {
  navExtra = <GoogleSignInButton />;
}

// Google OAuth client ID (replace with your real client ID)

// State for modal
const [showConfigModal, setShowConfigModal] = useState(false);
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";
const [showOneTap, setShowOneTap] = useState(false);

return (
<GoogleOAuthProvider clientId={clientId}>
  {showOneTap && (
    <TriggerableGoogleOneTapHandler open={showOneTap} onClose={() => setShowOneTap(false)} />
  )}

  <div className="bg-blue-gradient min-h-screen w-full relative">
    <EditorContext.Provider value={{ setFilesCurrentHandler, throttleEditorOpen, selectedFile }}>
      <NavBar extra={navExtra} />
      {/* Modal for Project Configuration */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-0 max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={() => setShowConfigModal(false)}
              aria-label="Fechar"
            >
              &times;
            </button>
            <ConfigWindowContent
              userId={publicUserId}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              onProjectCreated={handleProjectCreate}
            />
          </div>
        </div>
      )}

      <WinBoxWindow id="chat" title="Chat" x={50} y={100} width={400} height={500}>
        <Chat />
      </WinBoxWindow>
      <WinBoxWindow id="editor" title="Editor" x={500} y={100} width={600} height={500}>
        <div className="w-full h-full flex flex-col min-h-0 min-w-0">
          <Editor
              key={selectedFile?.name}
              className="flex-1 w-full h-full min-h-0 min-w-0"
              width="100%"
              height="100%"
              path={selectedFile?.name}
              defaultLanguage={selectedFile?.language}
              value={selectedFile?.value}
              onMount={(editor) => {
                editorRef.current = editor;
                setTimeout(() => editor.layout(), 100);
              }}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          </div>
        </WinBoxWindow>
        <WinBoxWindow id="preview" title="Preview" x={1150} y={100} width={500} height={500}>
          <LiveProvider code={selectedFile?.value} scope={reactScope} noInline>
            <LivePreview />
            <LiveError className="text-wrap" />
          </LiveProvider>
        </WinBoxWindow>
        <nav className="w-full h-20 block fixed w-full z-30 bottom-0 noselect shadow-lg bg-gray-900/30 rounded">
          <div className="w-full h-full flex flex-row justify-between items-end mx-auto px-4 space-y-2">
            {/* Chat Controls */}
            <div className="w-full flex flex-col items-center space-y-1">
              <span className="text-xs text-blue-100 mb-1">Chat</span>
              <div className="flex w-full justify-center space-x-2">
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition"
                  title="Centralizar e focar Chat"
                  onClick={() => { centerWinBox('chat'); push('#chat'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Centralizar</span>
                </button>
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition"
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
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition"
                  title="Centralizar e focar Editor"
                  onClick={() => { centerWinBox('editor'); push('#editor'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Centralizar</span>
                </button>
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition"
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
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition"
                  title="Centralizar e focar Preview"
                  onClick={() => { centerWinBox('preview'); push('#preview'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Centralizar</span>
                </button>
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition"
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
