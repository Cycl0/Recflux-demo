"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import Cookies from 'js-cookie';
import { GoogleOAuthProvider, useGoogleOneTapLogin } from '@react-oauth/google';
// Material UI imports
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline,
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Container,
  Grid,
  Stack
} from '@mui/material';
import {
  Send as SendIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Save as SaveIcon,
  CompareArrows as CompareArrowsIcon,
  Build as BuildIcon,
  Person as PersonIcon,
  SmartToy as SmartToyIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import WinBoxWindow from '@/components/WinBoxWindow';
import ConfigWindowContent from '@/components/ConfigWindowContent';
import NavBar from '@/components/NavBar';
import CurrentProjectLabel from '@/components/CurrentProjectLabel';
import NavStyledDropdown from '@/components/NavStyledDropdown';
import CreditsDisplay from '@/components/CreditsDisplay';
import Editor from "@monaco-editor/react";
import 'react-resizable/css/styles.css';
import { LiveProvider, LivePreview } from "react-live";
import LiveErrorWithRef from "@/components/LiveErrorWithRef";
import {emptyFiles, initialFiles} from "@/utils/files-editor";
import { throttle } from 'lodash';
import { supabase } from '@/utils/supabaseClient';
import { useSupabaseUser } from '@/utils/useSupabaseUser';
import { useChat } from "@ai-sdk/react";
import CopyButton from '@/components/CopyButton'
import { Bot, User, Moon, Sun } from 'lucide-react'
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import remarkGfm from 'remark-gfm';
import 'prismjs/themes/prism-tomorrow.css';
import TextareaAutosize from 'react-textarea-autosize';
import IconSend from "@/components/IconSend";
import ReactSelect from 'react-select';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ChatMessageSkeleton } from '@/components/ChatMessageSkeleton';
import ReactDiffViewer from 'react-diff-viewer';
import ProTag from '@/components/ProTag';

// Chat action options for the Select component
const chatActionOptions = [
  { value: 'GERAR', label: 'GERAR' },
  { value: 'EDITAR', label: 'EDITAR' },
  { value: 'FOCAR', label: 'FOCAR' },
  { value: 'CHAT', label: 'CHAT' }
];

import { useRouter } from 'next/navigation';
import FileDiffViewer from "@/components/FileDiffViewer";

// Material UI Theme
const createMuiTheme = (isDarkMode: boolean) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: '#00bcd4', // cyan
      light: '#33c9dc',
      dark: '#00838f',
    },
    secondary: {
      main: '#2196f3', // blue
      light: '#64b5f6',
      dark: '#1976d2',
    },
    background: {
      default: isDarkMode ? '#15171c' : '#f0f9ff',
      paper: isDarkMode ? '#232733' : '#ffffff',
    },
    text: {
      primary: isDarkMode ? '#e0f2f1' : '#0e7490',
      secondary: isDarkMode ? '#b2dfdb' : '#0891b2',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 24px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: isDarkMode 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(34,211,238,0.1)',
        },
      },
    },
  },
});

// Editor context for sending code to the editor
const EditorContext = React.createContext({
  setFilesCurrentHandler: (fileName: string, code: string, index?: number) => {}, // Will be replaced below
  throttleEditorOpen: (open: boolean) => {},
  selectedFile: undefined as undefined | { value?: string; name?: string; id?: string },
  editorSelection: null as null | { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; selectedText: string },
  cursorPosition: null as null | { lineNumber: number; column: number },
  applyAgenticChanges: (changes: any[]): { oldCode: string; newCode: string } => ({ oldCode: '', newCode: '' }),
});

interface ChatProps {
  onPromptSubmit?: (prompt: string, fileName?: string, code?: string) => void;
  /**
   * Ref for appending messages or scrolling, injected by parent if needed
   */
  appendRef?: React.MutableRefObject<any>;
  user?: any;
  onCreditsUpdate?: () => void;
  publicUserId?: string | null;
}

// Generate diff from API changes data instead of comparing code strings
function generateDiffFromChanges(changes: any[], oldCode: string): string {
  const diffLines: string[] = [];
  const oldLines = oldCode.split('\n');
  
  changes.forEach((change, index) => {
    const { type, startLine, endLine, code, description } = change;
    
    if (type === 'replace') {
      // Show what was replaced
      const startIdx = startLine - 1;
      const endIdx = endLine ? endLine - 1 : startIdx;
      
      for (let i = startIdx; i <= endIdx && i < oldLines.length; i++) {
        if (oldLines[i] && oldLines[i].trim()) {
          diffLines.push(`${i + 1}: - ${oldLines[i].trim()}`);
        }
      }
      
      // Show new code
      const newLines = code.split('\n');
      newLines.forEach((line, idx) => {
        if (line.trim()) {
          diffLines.push(`${startIdx + idx + 1}: + ${line.trim()}`);
        }
      });
      
    } else if (type === 'insert') {
      // Show inserted code
      const newLines = code.split('\n');
      newLines.forEach((line, idx) => {
        if (line.trim()) {
          diffLines.push(`${startLine + idx}: + ${line.trim()}`);
        }
      });
      
    } else if (type === 'delete') {
      // Show deleted lines
      const startIdx = startLine - 1;
      const endIdx = endLine ? endLine - 1 : startIdx;
      
      for (let i = startIdx; i <= endIdx && i < oldLines.length; i++) {
        if (oldLines[i] && oldLines[i].trim()) {
          diffLines.push(`${i + 1}: - ${oldLines[i].trim()}`);
        }
      }
    }
  });
  
  if (diffLines.length === 0) {
    return 'Mudanças aplicadas (diff detalhado não disponível)';
  }
  
  return diffLines.join('\n');
}

// PERFORMANCE: Memoized message component to prevent unnecessary re-renders
const MessageComponent = React.memo(({ message, theme, setFilesCurrentHandler, throttleEditorOpen }: {
  message: any;
  theme: 'dark' | 'light';
  setFilesCurrentHandler: (fileName: string, content: string, index?: number) => void;
  throttleEditorOpen: (open: boolean) => void;
}) => {
  const [showDiff, setShowDiff] = useState(false);
  if ((message as any).isLoading) {
    return <ChatMessageSkeleton key={message.id} theme={theme} />;
  }

  return (
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
        
        {/* Show diff viewer if diff data is available */}
        {(message as any).diffData && (
          <div className="mt-4">
            <button 
              onClick={() => setShowDiff(prev => !prev)}
              className="w-full text-left flex items-center justify-between p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">📊 Diferenças aplicadas:</h4>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 transform transition-transform ${showDiff ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showDiff && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <ReactDiffViewer
                  oldValue={(message as any).diffData.oldCode}
                  newValue={(message as any).diffData.newCode}
                  splitView={false}
                  hideLineNumbers={false}
                  useDarkTheme={theme === 'dark'}
                  styles={{
                    variables: {
                      dark: {
                        diffViewerBackground: '#1a1b26',
                        addedBackground: '#2d4a2b',
                        removedBackground: '#4a2d2d',
                        wordAddedBackground: '#3d6a3a',
                        wordRemovedBackground: '#6a3a3a',
                        addedGutterBackground: '#2d4a2b',
                        removedGutterBackground: '#4a2d2d',
                        gutterBackground: '#232733',
                        gutterBackgroundDark: '#1a1b26',
                        diffViewerTitleBackground: '#232733',
                        diffViewerTitleColor: '#e0f2f1',
                        diffViewerTitleBorderColor: '#67e8f9',
                      },
                      light: {
                        diffViewerBackground: '#ffffff',
                        addedBackground: '#e6ffed',
                        removedBackground: '#ffeef0',
                        wordAddedBackground: '#acf2bd',
                        wordRemovedBackground: '#fdb8c0',
                        addedGutterBackground: '#cdffd8',
                        removedGutterBackground: '#fdbdcf',
                        gutterBackground: '#f7f7f7',
                        diffViewerTitleBackground: '#f0f9ff',
                        diffViewerTitleColor: '#0e7490',
                        diffViewerTitleBorderColor: '#22d3ee',
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function Chat({ onPromptSubmit, theme, appendRef, user, onCreditsUpdate, publicUserId }: ChatProps & { theme: 'dark' | 'light' }) {
  // Restore chat prompt from cookie
  const [input, setInput] = useState(() => Cookies.get('chatPrompt') || '');
  useEffect(() => {
    Cookies.set('chatPrompt', input, { expires: 7 });
  }, [input]);
  const { setFilesCurrentHandler, throttleEditorOpen, selectedFile, editorSelection, cursorPosition, applyAgenticChanges } = useContext(EditorContext);
  const [chatAction, setChatAction] = useState({ value: 'GERAR', label: 'GERAR' });
  
  // Manual message management for all actions - OPTIMIZED WITH CLEANUP
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // PERFORMANCE: Limit message history to prevent infinite growth
  const MAX_MESSAGES = 50; // Keep last 50 messages max
  
  // Clean up old messages when limit exceeded
  useEffect(() => {
    if (messages.length > MAX_MESSAGES) {
      setMessages(prev => {
        const cleaned = prev.slice(-MAX_MESSAGES);
        console.log(`[PERFORMANCE] Cleaned message history: ${prev.length} -> ${cleaned.length}`);
        return cleaned;
      });
    }
  }, [messages.length]);
  
  // Manual message management for AGENTIC actions
  // Use messages directly
  const allMessages = messages;
  const currentLoading = isLoading;

  // Expose append method via appendRef
  useEffect(() => {
    if (appendRef) {
      appendRef.current = (message: { role: "data" | "system" | "user" | "assistant"; content: string }) => {
        setMessages(prev => [...prev, { ...message, id: Date.now().toString() }]);
      };
      return () => {
        appendRef.current = null;
      };
    }
  }, [appendRef]);

  // Custom handleInputChange to sync with cookie
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  }

  const [creditError, setCreditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    console.log('[SUBMIT] Starting handleSubmit', { isSubmitting, currentLoading, input });
    
    if (isSubmitting || currentLoading) {
      console.log('[SUBMIT] Blocked by loading state', { isSubmitting, currentLoading });
      return;
    }
    
    // Check if user is authenticated
    if (!user || !user.email) {
      console.log('[SUBMIT] User not authenticated', { user });
      setCreditError('Você precisa estar logado para enviar prompts.');
      return;
    }

    // Debug authentication status
    console.log('[SUBMIT] User authenticated:', { email: user.email, id: user.id });
    
    // Check if session is valid
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[SUBMIT] Current session:', session ? 'Valid' : 'Invalid');
      if (!session) {
        console.log('[SUBMIT] Session missing, attempting to refresh');
        const { data: refreshData } = await supabase.auth.refreshSession();
        console.log('[SUBMIT] Session refresh result:', refreshData.session ? 'Success' : 'Failed');
        if (!refreshData.session) {
          console.log('[SUBMIT] Session refresh failed, continuing with client-side user info');
          // We'll continue anyway and rely on the user email we have client-side
        }
      }
    } catch (sessionError) {
      console.error('[SUBMIT] Session check error:', sessionError);
    }

    // Clear previous errors
    setCreditError(null);
    setIsSubmitting(true);
    console.log('[SUBMIT] Set isSubmitting to true');

    try {
      // Credit check is now handled by the microservice.
      if (onPromptSubmit) onPromptSubmit(input);
      if (typeof window !== 'undefined') {
        Cookies.remove('chatPrompt');
      }
      
      setInput('');
      
      const actionPrompts = {
        'GERAR': input, // Direct user input for generation
        'EDITAR': input, // Direct user input for editing (main agentic mode)
        'FOCAR': `Focus on and extract only the component or section related to: ${input}\n\nRemove all other code and keep only the relevant parts. Maintain the component structure. If the code does not include a render call for the component, add one at the end, like \`render(<MyComponent />);\` replacing 'MyComponent' with the actual component's name.`
      };

      const agenticPrompt = actionPrompts[chatAction.value] || input;

      // Combine user message and skeleton into a single state update
      const userMessage = { 
        id: Date.now().toString(), 
        role: "user" as const, 
        content: input 
      };
      const assistantMessageId = (Date.now() + 1).toString();
      const skeletonMessage = { id: assistantMessageId, role: "assistant" as const, content: "", isLoading: true };

      setMessages(prev => [...prev, userMessage, skeletonMessage]);
      setIsLoading(true);
      console.log('[SUBMIT] Set isLoading to true, starting API call');

      try {
        const response = await fetch('/api/agentic-structured', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: agenticPrompt,
            currentCode: chatAction.value === 'GERAR' ? '' : (selectedFile?.value || ''),
            fileName: selectedFile?.name || 'script.js',
            actionType: chatAction.value,
            userEmail: user.email // Explicitly include the user's email
          })
        });

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({ 
              error: "Erro de comunicação com a API", 
              explanation: `A API retornou um status ${response.status} mas não foi possível ler o corpo do erro.`
          }));
          
          // Handle insufficient credits error specifically on the main chat UI
          if (response.status === 402) {
            setCreditError(errorData.explanation || 'Créditos insuficientes.');
            setMessages(prev => prev.filter(m => m.id !== assistantMessageId)); // Remove skeleton
            setIsLoading(false);
            setIsSubmitting(false);
            return; // Stop execution
          }
          
          // For other errors, throw to be caught by the catch block below
          throw errorData;
        }
        
        // If we are here, the call was successful and credits were deducted.
        // We should refetch credits on the client to update the UI.
        if (onCreditsUpdate) {
            console.log('[CREDITS] Attempting to refresh credits after successful API call');
            onCreditsUpdate();
            console.log('[CREDITS] Credits refresh function called');
        }

        const data = await response.json();

        const actionIcons = {
          'GERAR': '🚀',
          'EDITAR': '✏️', 
          'FOCAR': '🎯',
          'CHAT': '💬'
        };

        const actionMessages = {
          'GERAR': 'Código gerado com sucesso!',
          'EDITAR': 'Edições aplicadas com sucesso!',
          'FOCAR': 'Foco aplicado com sucesso!',
          'CHAT': 'Resposta gerada com sucesso!'
        };

        const finalAssistantMessage = {
          id: assistantMessageId,
          role: "assistant" as const,
          content: '',
          isLoading: false // Make sure to set isLoading to false
        };

        if (data.changes && data.changes.length > 0) {
          // Apply changes and get old/new code for diff
          const { oldCode, newCode } = applyAgenticChanges(data.changes);
          
          // Save file version with prompt tag
          if (selectedFile?.id && publicUserId && (chatAction.value === 'GERAR' || chatAction.value === 'EDITAR')) {
            (async () => {
              try {
                const { saveFileVersion } = await import('@/utils/supabaseProjects');
                // Fetch latest version number
                let nextVersion = 1;
                const { data: latestVersionRows, error: latestVersionError } = await supabase
                  .from('file_versions')
                  .select('version')
                  .eq('file_id', selectedFile.id)
                  .order('version', { ascending: false })
                  .limit(1);

                if (!latestVersionError && latestVersionRows && latestVersionRows.length > 0) {
                  nextVersion = (latestVersionRows[0].version || 0) + 1;
                }
                // Create a tag from the first 5 words of the prompt
                const promptTag = input.split(' ').slice(0, 5).join(' ');
                await saveFileVersion(selectedFile.id, promptTag, newCode, nextVersion, publicUserId);
                console.log(`[SAVE VERSION] Saved version ${nextVersion} for file ${selectedFile.name} with tag: ${promptTag}`);
              } catch (e) {
                console.error("Failed to save file version with prompt tag:", e);
                // Don't block UI for this, just log it.
              }
            })();
          }
          
          // Store diff data for ReactDiffViewer
          const diffData = {
            oldCode: oldCode,
            newCode: newCode,
            changes: data.changes
          };
          
          finalAssistantMessage.content = `${actionIcons[chatAction.value]} **${actionMessages[chatAction.value]}**\n\n${data.explanation}\n\n**Detalhes das mudanças:**\n${data.changes.map((change, i) => 
            `${i + 1}. **${change.type.toUpperCase()}** na linha ${change.startLine}${change.endLine && change.endLine !== change.startLine ? `-${change.endLine}` : ''}: ${change.description}`
          ).join('\n')}`;
          
          // Add diff data to message for custom rendering
          (finalAssistantMessage as any).diffData = diffData;
        } else if (data.error) {
            finalAssistantMessage.content = `❌ Erro: ${data.error}\n\n${data.explanation || ''}`;
        } else {
          // For CHAT mode or when no changes are needed, just show the explanation
          if (chatAction.value === 'CHAT') {
            finalAssistantMessage.content = `${actionIcons[chatAction.value]} ${data.explanation || 'Resposta gerada.'}`;
          } else {
            finalAssistantMessage.content = `ℹ️ ${data.explanation || 'Nenhuma mudança necessária para esta solicitação.'}`;
          }
        }

        // Add response to chat for all structured actions
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? finalAssistantMessage : m));
        setIsLoading(false);
        console.log('[SUBMIT] Set isLoading to false (success)');
      } catch (error) {
        console.error('Structured API error:', error);
        
        const finalAssistantMessage = {
          id: assistantMessageId,
          role: "assistant" as const,
          content: `❌ Erro: ${error.error || 'Erro desconhecido'}\n\n${error.explanation || 'Não foi possível processar sua solicitação.'}`,
          isLoading: false
        };

        // Replace the skeleton message with error message
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? finalAssistantMessage : m));
        setIsLoading(false);
        console.log('[SUBMIT] Set isLoading to false (API error)');
      }
    
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setCreditError('Erro ao processar prompt. Tente novamente.');
      setIsLoading(false); // CRITICAL: Reset loading state on error
      console.log('[SUBMIT] Set isLoading to false (general error)');
    } finally {
      setIsSubmitting(false);
      console.log('[SUBMIT] Set isSubmitting to false (finally block)');
    }
  };
  
  const [allCodeGenerated, setAllCodeGenerated] = useState<string[]>([]);
  const [autoSentCodes, setAutoSentCodes] = useState<{[key: string]: boolean}>({});
  const [sendingToEditor, setSendingToEditor] = useState(false); // visual indicator
  const lastUserMessageId = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // PERFORMANCE: Clean up memory leaks and limit processing scope
  useEffect(() => {
    // Find the last user message
    const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg?.id !== lastUserMessageId.current) {
      // Only reset if a new user message is detected
      setAllCodeGenerated([]);
      processedMessagesRef.current = new Set();
      lastUserMessageId.current = lastUserMsg?.id || null;
      
      // PERFORMANCE: Clean up old autoSentCodes to prevent memory leaks
      setAutoSentCodes({});
      console.log('[PERFORMANCE] Cleaned up autoSentCodes and processedMessages');
      return;
    }

    // PERFORMANCE: Only process recent messages (last 10) instead of all messages
    const recentMessages = allMessages.slice(-10);
    let newCode: string[] = [];
    let updated = false;
    
    for (const message of recentMessages) {
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
      // PERFORMANCE: Limit allCodeGenerated to prevent infinite growth
      setAllCodeGenerated(prev => {
        const combined = [...prev, ...newCode];
        // Keep only last 20 code blocks
        return combined.slice(-20);
      });
    }
    
    // PERFORMANCE: Clean up old processed messages periodically
    if (processedMessagesRef.current.size > 100) {
      const recentMessageIds = new Set(recentMessages.map(m => m.id));
      const newProcessedSet = new Set<string>();
      for (const id of Array.from(processedMessagesRef.current)) {
        if (recentMessageIds.has(id)) {
          newProcessedSet.add(id);
        }
      }
      processedMessagesRef.current = newProcessedSet;
      console.log('[PERFORMANCE] Cleaned up processedMessagesRef');
    }
  }, [allMessages]);

  // Only send code to the editor when the prompt is finished (assistant's last message is complete and not streaming)
  useEffect(() => {
    if (allMessages.length === 0) return;
    const lastMessage = allMessages[allMessages.length - 1];
    if (lastMessage.role !== 'assistant') return;
    if (autoSentCodes[lastMessage.id]) return;
    // If the assistant is still streaming, don't send yet
    if (currentLoading) return;
    
    // All structured actions are handled via structured API
    // Only process code blocks for GERAR and FOCAR (EDITAR applies changes directly, CHAT doesn't generate code)
    if (chatAction.value === 'GERAR' || chatAction.value === 'FOCAR') {
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
      setTimeout(() => setSendingToEditor(false), 1200); // show indicator for 1.2s
    }
    
    // PERFORMANCE: Clean up old autoSentCodes periodically
    setAutoSentCodes(prev => {
      const entries = Object.entries(prev);
      if (entries.length > 50) {
        // Keep only the last 25 entries
        const recentEntries = entries.slice(-25);
        const cleaned = Object.fromEntries(recentEntries);
        console.log('[PERFORMANCE] Cleaned up autoSentCodes');
        return { ...cleaned, [lastMessage.id]: true };
      }
      return { ...prev, [lastMessage.id]: true };
    });
  }, [allMessages, chatAction.value, currentLoading, selectedFile?.name]);

  return (
    <div className={`relative flex flex-col h-full rounded-lg shadow-lg  ${theme === 'dark' ? 'bg-[#232733]' : 'bg-white'}`}>
      {/* Credit error display */}
      {creditError && (
        <div className={`p-3 mx-4 mt-2 rounded-lg text-sm border ${
          theme === 'dark' 
            ? 'bg-red-500/20 border-red-500/40 text-red-200' 
            : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          {creditError}
        </div>
      )}
      
      {/* Chat messages area */}
      <div className={`flex-1 space-y-4 !pb-[200px] p-4 ${theme === 'dark' ? 'bg-[#232733]' : 'bg-white'}`}>
        {allMessages.map((message) => (
          <MessageComponent key={message.id} message={message} theme={theme} setFilesCurrentHandler={setFilesCurrentHandler} throttleEditorOpen={throttleEditorOpen} />
        ))}
      </div>
      {/* Chat input form below messages */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 left-0 w-full dark:bg-[#232733] bg-transparent p-4 z-10 flex flex-col gap-2">
        
        {/* Loading overlay for input area */}
        {(isSubmitting || isLoading) && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
            <LoadingSpinner 
              theme={theme} 
              size="sm" 
              message={`${chatAction.label} em andamento...`} 
            />
          </div>
        )}
        <ReactSelect
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
            disabled={currentLoading || isSubmitting}
            className="py-3 px-4 bg-gradient-to-br from-cyan-300/80 to-blue-100/70 backdrop-blur-md text-cyan-900 rounded-xl shadow-[0_4px_32px_0_rgba(34,211,238,0.22)] hover:from-cyan-200/90 hover:to-blue-50/80 focus:bg-cyan-100/80 active:bg-cyan-400/80 transition-all duration-300 ease-in-out disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-200/40"
            aria-label="Enviar mensagem"
          >
            {currentLoading || isSubmitting ? (
              <div className="w-4 h-4 border-2 border-cyan-900/30 border-t-cyan-900 rounded-full animate-spin" />
            ) : (
              <IconSend className="relative transition-transform duration-500 ease-in-out -rotate-90" />
            )}
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
      return { isNewUser: false };
    }
    setUser(sessionUser);
    const userEmail = sessionUser.email;
    if (!userEmail) return { isNewUser: false };
    
    let isNewUser = false;
    
    // Check if user exists in your users table
    let { data: customUser, error: customUserError } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('email', userEmail)
      .single();
    // If not found, insert the user with default credits
    if (customUserError && customUserError.code === 'PGRST116') {
      isNewUser = true;
      const username = userEmail.split('@')[0];
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ email: userEmail, username, plan: 'free', credits: 10 }])
        .select('id, stripe_customer_id')
        .single();
      if (insertError) {
        console.error('Failed to insert user:', insertError.message);
        return { isNewUser: false };
      }
      customUser = newUser;
      console.log('New user created with 10 credits:', newUser);
    } else if (customUserError) {
      console.error('Error fetching user:', customUserError.message);
      return { isNewUser: false };
    }
    // If user exists and has no stripe_customer_id, create one
    if (customUser && !customUser.stripe_customer_id) {
      // Call API route to create Stripe customer and update user
      await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: customUser.id, email: userEmail })
      });
    }
    
    return { isNewUser };
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
        const result = await registerUserIfNeeded(session.user);
        // If this is a new user, trigger credit refresh after a short delay
        if (result?.isNewUser) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshCredits'));
          }, 1500);
        }
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for messages from popup window
    const handleMessage = async (event) => {
      // Accept messages from any origin for popup auth
      if (event.data.type === 'SUPABASE_AUTH_SUCCESS') {
        console.log('Received auth success from popup');
        // Use the session from the popup message or refresh the session in the main window
        if (event.data.session?.user) {
          const result = await registerUserIfNeeded(event.data.session.user);
          // If this is a new user, trigger credit refresh after a short delay
          if (result?.isNewUser) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('refreshCredits'));
            }, 1500);
          }
        } else {
          // Fallback: refresh the session in the main window
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user) {
            const result = await registerUserIfNeeded(session.user);
            // If this is a new user, trigger credit refresh after a short delay
            if (result?.isNewUser) {
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('refreshCredits'));
              }, 1500);
            }
          }
        }
      } else if (event.data.type === 'SUPABASE_AUTH_ERROR') {
        console.error('Auth error from popup:', event.data.error);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return { user, loading };
}

function Home({ onLayoutChange = () => {}, ...props }) {
  // Editor theme state (dark/light) for editor page only
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('editorTheme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  // Responsive window dimensions and positions
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive window positions and sizes
  const getWindowConfig = useCallback(() => {
    const { width: screenWidth, height: screenHeight } = windowDimensions;
    const topMargin = 92; // Top navbar margin
    const bottomMargin = 80; // Bottom navbar margin
    const availableHeight = screenHeight - topMargin - bottomMargin; // Full height between navbars
    const padding = 20;

    // For mobile/small screens (< 768px)
    if (screenWidth < 768) {
      const windowWidth = screenWidth; // Full screen width
      const windowHeight = availableHeight; // Full available height
      
      return {
        chat: {
          width: windowWidth,
          height: windowHeight,
          x: 0, // No left margin
          y: topMargin // Start at 92px from top
        },
        editor: {
          width: windowWidth,
          height: windowHeight,
          x: 0, // No left margin
          y: topMargin // Start at 92px from top
        },
        preview: {
          width: windowWidth,
          height: windowHeight,
          x: 0, // No left margin
          y: topMargin // Start at 92px from top
        }
      };
    }
    
    // For tablet screens (768px - 1024px)
    if (screenWidth < 1024) {
      const windowWidth = (screenWidth - padding * 4) / 2;
      const windowHeight = availableHeight;
      
      return {
        chat: {
          width: windowWidth,
          height: windowHeight,
          x: padding,
          y: topMargin
        },
        editor: {
          width: windowWidth,
          height: windowHeight,
          x: screenWidth - windowWidth - padding,
          y: topMargin
        },
        preview: {
          width: windowWidth,
          height: windowHeight,
          x: padding,
          y: topMargin
        }
      };
    }
    
    // For desktop screens (>= 1024px)
    const windowWidth = (screenWidth - padding * 6) / 3;
    const windowHeight = availableHeight;
    
    return {
      chat: {
        width: windowWidth,
        height: windowHeight,
        x: padding,
        y: topMargin
      },
      editor: {
        width: windowWidth,
        height: windowHeight,
        x: padding + windowWidth + padding,
        y: topMargin
      },
      preview: {
        width: windowWidth,
        height: windowHeight,
        x: padding + (windowWidth + padding) * 2,
        y: topMargin
      }
    };
  }, [windowDimensions]);

  const windowConfig = getWindowConfig();

  // Hide WinBox windows on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.winboxWindows) {
        Object.values(window.winboxWindows).forEach(wb => {
          if (wb && typeof wb.hide === 'function') {
            wb.hide();
          }
        });
      }
    };
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('editorTheme', theme);
      // Apply deep dark background to body in dark mode
      if (theme === 'dark') {
        document.body.style.background = '#15171c';
        document.body.classList.add('dark');
        // Set a darker gradient for dark mode
        document.body.style.setProperty('--background-gradient', 'radial-gradient(circle, rgba(21,23,28,1) 5%, rgba(30,41,59,1) 27%, rgba(17,24,39,1) 62%, rgba(2,6,23,1) 92%)');
      } else {
        document.body.style.background = '';
        document.body.classList.remove('dark');
        // Reset to default gradient
        document.body.style.setProperty('--background-gradient', 'radial-gradient(circle, rgba(148,248,240,1) 5%, rgba(0,225,240,1) 27%, rgba(0,107,125,1) 62%, rgba(0,32,32,1) 92%)');
      }
    }
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.background = '';
        document.body.classList.remove('dark');
      }
    };
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
  // Enhanced user hook for credits
  const { credits, creditsLoading, refetchCredits, subscriptionStatus } = useSupabaseUser();

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
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(allFilesCurrent[selectedProjectId]));
    }
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
    if (typeof window !== 'undefined') {
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
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(filesToSave));
        }
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
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(allFilesCurrent[selectedProjectId] || initialFiles));
  }
  saveProjectFilesToDB(); // Also save to DB on manual save
  setSaveStatus('saved');
  setTimeout(() => setSaveStatus('idle'), 1200);
}, 2000, { trailing: false }), [selectedProjectId, allFilesCurrent, saveProjectFilesToDB]);


  // Auto-save every 1 minute (localStorage only)
  useEffect(() => {
    if (!selectedProjectId) return;
    const interval = setInterval(() => {
      const storageKey = `editorCode_${selectedProjectId}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(allFilesCurrent[selectedProjectId] || initialFiles));
      }
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

  // Editor state for cursor and selection
  const [editorSelection, setEditorSelection] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(null);

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
  const handleGoogleLogin = () => {
    console.log('Opening login popup from origin:', window.location.origin);
    const popup = window.open('/login', 'supabase-login', 'width=500,height=600');
    console.log('Popup opened:', popup);
  };
  return (
    <Button
      onClick={handleGoogleLogin}
      variant="contained"
      color="primary"
      size="small"
      startIcon={<PersonIcon />}
      sx={{ 
        borderRadius: 3,
        minWidth: 120,
        textTransform: 'none',
        fontWeight: 600
      }}
    >
      Sign in
    </Button>
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

  // Function to apply agentic code changes
  const applyAgenticChanges = useCallback((changes: any[]): { oldCode: string; newCode: string } => {
    if (!selectedFile?.name) {
      console.error('No selected file to apply changes to');
      return { oldCode: '', newCode: '' };
    }
    
    const oldCode = selectedFile.value || '';
    
    const lines = oldCode.split('\n');
    
    // Sort changes by line number in reverse order to maintain line positions
    const sortedChanges = [...changes].sort((a, b) => (b.startLine || 0) - (a.startLine || 0));

    sortedChanges.forEach((change) => {
      const startLineIndex = change.startLine - 1; // Convert to 0-based index
      const endLineIndex = (change.endLine || change.startLine) - 1;
      
      switch (change.type) {
        case 'insert':
          const insertLines = change.code.split('\n');
          lines.splice(startLineIndex, 0, ...insertLines);
          break;
        case 'replace':
          const replaceLines = change.code.split('\n');
          const replaceCount = endLineIndex - startLineIndex + 1;
          lines.splice(startLineIndex, replaceCount, ...replaceLines);
          break;
        case 'delete':
          const deleteCount = endLineIndex - startLineIndex + 1;
          lines.splice(startLineIndex, deleteCount);
          break;
        default:
          console.error('Unknown change type:', change.type);
      }
    });

    const newCode = lines.join('\n');
    
    // Apply the changes to the editor
    setFilesCurrentHandler(selectedFile.name, newCode);
    
    return { oldCode, newCode };
  }, [selectedFile, setFilesCurrentHandler]);

  // State for throttled preview code
  const [previewCode, setPreviewCode] = useState(selectedFile?.value || '');

  // Throttle editor value updates to 500ms to avoid UI overload and improve preview performance
const handleEditorChange = useMemo(
    () => throttle((value) => {
      setFilesCurrentHandler(selectedFile?.name, value ?? '');
    }, 500), // Increased from 200ms to 500ms for better performance
  [selectedFile?.name, setFilesCurrentHandler]
);

  // Throttle preview updates to 1000ms (1 second) for better performance
  const updatePreview = useMemo(
    () => throttle((code) => {
      setPreviewCode(code);
    }, 1000), // Update preview every 1 second maximum
    []
  );

  // Update preview code when selected file changes
  useEffect(() => {
    if (selectedFile?.value) {
      updatePreview(selectedFile.value);
    }
  }, [selectedFile?.value, updatePreview]);


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
      if (typeof window !== 'undefined') {
        e.preventDefault();
        const hash = window.location.hash;
        if (hash) {
          const element = document.querySelector(hash);
        }
      }
    };
    if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', handleHashScroll);
  return () => window.removeEventListener('hashchange', handleHashScroll);
    }
}, []);

// Function to center/reposition WinBox windows responsively
const centerWinBox = (id: string) => {
  if (typeof window !== 'undefined') {
    const winbox = window.winboxWindows?.[id];
    if (winbox) {
      // Calculate responsive config
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const topMargin = 92; // Top navbar margin
      const bottomMargin = 80; // Bottom navbar margin
      const availableHeight = screenHeight - topMargin - bottomMargin; // Full height between navbars
      const padding = 20;

      let windowConf;

      // For mobile/small screens (< 768px)
      if (screenWidth < 768) {
        const windowWidth = screenWidth; // Full screen width
        const windowHeight = availableHeight; // Full available height
        
        const configs = {
          chat: { width: windowWidth, height: windowHeight, x: 0, y: topMargin },
          editor: { width: windowWidth, height: windowHeight, x: 0, y: topMargin },
          preview: { width: windowWidth, height: windowHeight, x: 0, y: topMargin }
        };
        windowConf = configs[id as keyof typeof configs];
      }
      // For tablet screens (768px - 1024px)
      else if (screenWidth < 1024) {
        const windowWidth = (screenWidth - padding * 4) / 2;
        const windowHeight = availableHeight;
        
        const configs = {
          chat: { width: windowWidth, height: windowHeight, x: padding, y: topMargin },
          editor: { width: windowWidth, height: windowHeight, x: screenWidth - windowWidth - padding, y: topMargin },
          preview: { width: windowWidth, height: windowHeight, x: padding, y: topMargin}
        };
        windowConf = configs[id as keyof typeof configs];
      }
      // For desktop screens (>= 1024px)
      else {
        const windowWidth = (screenWidth - padding * 6) / 3;
        const windowHeight = availableHeight;
        
        const configs = {
          chat: { width: windowWidth, height: windowHeight, x: padding, y: topMargin },
          editor: { width: windowWidth, height: windowHeight, x: padding + windowWidth + padding, y: topMargin },
          preview: { width: windowWidth, height: windowHeight, x: padding + (windowWidth + padding) * 2, y: topMargin }
        };
        windowConf = configs[id as keyof typeof configs];
      }
      
      if (windowConf) {
        winbox.resize(windowConf.width, windowConf.height);
        winbox.move(windowConf.x, windowConf.y);
      }
      winbox.focus();
    }
  }
};

let navExtra;
const themeToggleButton = (
  <IconButton
    onClick={toggleTheme}
    aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
    color="primary"
    sx={{ mr: 2 }}
  >
    {theme === 'dark' ? (
      <LightModeIcon />
    ) : (
      <DarkModeIcon />
    )}
  </IconButton>
);
const handleLogout = async () => {
  // Sign out from Supabase
  await supabase.auth.signOut();
  // Optionally clear user state or reload
  if (typeof window !== 'undefined') {
  window.location.reload();
  }
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
      <div className="flex items-center mr-4 cursor-pointer" onClick={() => {
          push('/pages/planos');
      }}>
      <CreditsDisplay credits={credits} loading={creditsLoading} />
        {subscriptionStatus === 'premium' && <ProTag />}
      </div>
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
  if (selectedFile?.name) {
    setFilesCurrentHandler(selectedFile.name, code);
  }
}


// Show Google One Tap automatically for unauthenticated users
useEffect(() => {
  if (!user && !userLoading) {
    setShowOneTap(true);
  } else {
    setShowOneTap(false);
  }
}, [user, userLoading]);

// Ref to access LiveError component
const liveErrorRef = useRef<HTMLDivElement | null>(null);
// Ref to access Chat's append method
const chatAppendRef = useRef<any>(null);
// Fix loading state
const [isFixing, setIsFixing] = useState(false);

const handleFixCode = async () => {
  // Check if user is authenticated and has enough credits
  if (!user || !user.email) {
    alert('Você precisa estar logado para usar esta funcionalidade.');
    return;
  }

  try {
    setIsFixing(true);
    // Credit check is now handled by the microservice.

    // Get error text from the preview
    let errorText = '';
    if (liveErrorRef.current) {
      const pre = liveErrorRef.current.querySelector('pre');
      if (pre) errorText = pre.textContent || '';
    }

    // Create fix prompt - either for specific error or general code analysis
    let fixPrompt;
    
    if (errorText) {
      // Extract line number from error if available
      const lineMatch = errorText.match(/\((\d+):(\d+)\)/);
      const lineNumber = lineMatch ? lineMatch[1] : null;
      
      fixPrompt = `Corrija o seguinte erro no código:

ERRO: ${errorText}

${lineNumber ? `🎯 O erro está na linha ${lineNumber}. Foque nesta linha e nas linhas adjacentes (${parseInt(lineNumber) - 1}, ${lineNumber}, ${parseInt(lineNumber) + 1}).` : ''}

${errorText.includes('expected ";"') ? '⚠️ Este é um erro de ponto e vírgula ausente. Procure onde adicionar um ";" na linha indicada.' : ''}
${errorText.includes('Unexpected token') ? '⚠️ Este é um erro de token inesperado. Verifique parênteses, chaves, colchetes ou vírgulas ausentes/extras.' : ''}
${errorText.includes('is not defined') ? '⚠️ Este é um erro de referência. Uma variável ou função está sendo usada antes de ser declarada, ou há um erro de digitação no nome.' : ''}

Faça APENAS as mudanças mínimas necessárias para corrigir este erro específico. Não reescreva o código inteiro.`;
    } else {
      // No explicit error - analyze code for potential issues
      fixPrompt = `Analise o código e corrija quaisquer problemas encontrados:

🔍 **ANÁLISE COMPLETA SOLICITADA:**

**Erros de Sintaxe:**
- Parênteses, chaves, colchetes não fechados
- Ponto e vírgula ausente
- Propriedades malformadas em objetos
- Estruturas de código inválidas

**Problemas de Lógica:**
- Código inalcançável (unreachable code)
- Variáveis declaradas mas não utilizadas
- Funções declaradas mas não chamadas
- Condições que nunca são verdadeiras/falsas
- Loops infinitos
- Return statements após outros returns

**Problemas de React:**
- Hooks usados incorretamente
- Dependências ausentes em useEffect
- Componentes não retornando JSX válido
- Props não utilizadas
- Sintaxe de render verbosa - simplifique render(<Component />, document.getElementById('root')) para render(<Component />)

**Problemas de JavaScript:**
- Variáveis não declaradas
- Comparações com tipos incompatíveis
- Funções chamadas com argumentos incorretos
- Objetos ou arrays mal formados

⚠️ **INSTRUÇÕES:**
- Detecte e corrija TODOS os tipos de problemas listados acima
- Se encontrar problemas, corrija-os com mudanças mínimas
- Se o código estiver correto, retorne um array vazio de mudanças
- Foque em correções técnicas que melhoram a funcionalidade
- Preserve a estrutura e lógica existente do código
- Remova código inalcançável quando encontrado`;
    }

    // Add user message to chat manually (like AGENTIC mode)
    if (chatAppendRef.current && typeof chatAppendRef.current === 'function') {
      const userMessage = errorText 
        ? `🔧 Corrigindo erro: ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}`
        : `🔍 Analisando código em busca de problemas...`;
      
      chatAppendRef.current({ 
        role: 'user', 
        content: userMessage
      });
    }

    // Use structured API for precise fixes with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('/api/agentic-structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fixPrompt,
          currentCode: selectedFile?.value || '',
          fileName: selectedFile?.name || 'script.js',
          actionType: 'FIX',
          userEmail: user.email // Explicitly include the user's email
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
            error: 'Erro na API', 
            explanation: `A API retornou um status ${response.status}`
        }));
        
        let errorMessage = `❌ **Erro ao corrigir código:**\n\n${errorData.explanation || errorData.error}`;

        // Handle insufficient credits error specifically
        if (response.status === 402) {
          errorMessage = `❌ **Créditos Insuficientes!**\n\n${errorData.explanation || 'Por favor, recarregue sua conta para continuar.'}`;
        }
        
        if (chatAppendRef.current && typeof chatAppendRef.current === 'function') {
            chatAppendRef.current({ 
                role: "assistant", 
                content: errorMessage
            });
        }
        // After showing the error, stop execution for this function
        setIsFixing(false);
        return; 
      }
      
      // If we get here, credits were deducted. Let's update the UI.
      refetchCredits();

      const data = await response.json();

      if (data.changes && data.changes.length > 0) {
        // Apply changes and get new/old code for diff
        const { oldCode, newCode } = applyAgenticChanges(data.changes);
        
        // Generate diff and show success message in chat
        if (chatAppendRef.current && typeof chatAppendRef.current === 'function') {
          const diffData = {
            oldCode: oldCode,
            newCode: newCode,
            changes: data.changes
          };
          
          const fixMessage = { 
            role: "assistant", 
            content: `🔧 **Erro corrigido com sucesso!**\n\n${data.explanation}\n\n**Correções aplicadas:**\n${data.changes.map((change, i) => 
              `${i + 1}. **${change.type.toUpperCase()}** na linha ${change.startLine}${change.endLine && change.endLine !== change.startLine ? `-${change.endLine}` : ''}: ${change.description}`
            ).join('\n')}`
          };
          
          // Add diff data for ReactDiffViewer
          (fixMessage as any).diffData = diffData;
          
          chatAppendRef.current(fixMessage);
        }
      } else if (data.error) {
        if (chatAppendRef.current && typeof chatAppendRef.current === 'function') {
          const errorDetails = data.details ? `\n\n**Detalhes técnicos:**\n${data.details}` : '';
          chatAppendRef.current({ 
            role: "assistant", 
            content: `❌ **Erro ao corrigir código:**\n\n${data.error}${errorDetails}\n\n💡 **Dica:** Tente verificar manualmente se há parênteses, chaves ou vírgulas ausentes na linha mencionada no erro.` 
          });
        }
      } else {
        // No changes needed
        if (chatAppendRef.current && typeof chatAppendRef.current === 'function') {
          chatAppendRef.current({ 
            role: "assistant", 
            content: `ℹ️ ${data.explanation || 'Nenhuma correção necessária detectada.'}` 
          });
        }
      }
    } catch (error) {
      clearTimeout(timeoutId); // Ensure timeout is cleared on error
      console.error('Fix error:', error);
      
      let errorMessage = "❌ Erro ao processar correção do código. Tente novamente.";
      if (error.name === 'AbortError') {
        errorMessage = "⏱️ Tempo limite excedido. A correção demorou muito para processar. Tente novamente.";
      } else if (error.message.includes('Falha ao analisar') || error.message.includes('API Error')) {
        errorMessage = `❌ ${error.message}`;
      }
      
      if (chatAppendRef.current && typeof chatAppendRef.current === 'function') {
        chatAppendRef.current({ 
          role: "assistant", 
          content: errorMessage
        });
      }
    }

    // This update is now redundant as it's handled after the API call.
    // refetchCredits();

  } catch (error) {
    console.error('Error in handleFixCode:', error);
    alert('Erro ao processar solicitação. Tente novamente.');
    setIsFixing(false);
  } finally {
    setIsFixing(false);
  }
};

const muiTheme = useMemo(() => createMuiTheme(theme === 'dark'), [theme]);

return (
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <GoogleOAuthProvider clientId={clientId}>
      {showOneTap && (
        <TriggerableGoogleOneTapHandler open={showOneTap} onClose={() => setShowOneTap(false)} />
      )}
      <div className={theme === 'dark' ? 'dark bg-blue-gradient min-h-screen w-full relative' : 'bg-blue-gradient min-h-screen w-full relative'}>
      <EditorContext.Provider value={{ setFilesCurrentHandler, throttleEditorOpen, selectedFile, editorSelection, cursorPosition, applyAgenticChanges: applyAgenticChanges as (changes: any[]) => { oldCode: string; newCode: string } }}>
        <NavBar extra={navExtra} />
        <WinBoxWindow 
          id="chat" 
          title="Chat" 
          x={windowConfig.chat.x} 
          y={windowConfig.chat.y} 
          width={windowConfig.chat.width} 
          height={windowConfig.chat.height}
        >
          <div className="w-full h-full flex flex-col bg-white/70 dark:bg-[#232733] text-gray-900 dark:text-gray-100 border border-cyan-100 dark:border-cyan-700 rounded-b-md p-0">
            <Chat 
              onPromptSubmit={handlePromptSubmit} 
              theme={theme} 
              appendRef={chatAppendRef} 
              user={user}
              onCreditsUpdate={refetchCredits}
              publicUserId={publicUserId}
            />
          </div>
        </WinBoxWindow>
        <WinBoxWindow 
          id="editor" 
          title="Editor" 
          x={windowConfig.editor.x} 
          y={windowConfig.editor.y} 
          width={windowConfig.editor.width} 
          height={windowConfig.editor.height}
        >
          <div className="w-full h-full flex flex-col min-h-0 min-w-0 bg-white/70 dark:bg-[#232733] text-gray-900 dark:text-gray-100 border border-cyan-100 dark:border-cyan-700 rounded-b-md p-0">
            <div className={`flex items-center justify-between gap-4 p-2 border-b ${theme === 'dark' ? 'bg-[#232733] border-cyan-400' : 'bg-white/70 border-cyan-100'}`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={throttledSaveEditorCode}
                  disabled={saveStatus === 'saving'}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-300 ease-in-out flex items-center justify-center
                    min-w-[48px] min-h-[32px]
                    bg-white/30 dark:bg-white/10
                    backdrop-blur-md
                    shadow-[0_4px_24px_0_rgba(0,255,255,0.15),0_1.5px_8px_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_0_rgba(0,255,255,0.12),0_1.5px_8px_0_rgba(0,0,0,0.25)]
                    border border-white/40 dark:border-white/10
                    hover:bg-white/50 hover:shadow-cyan-200/60 dark:hover:bg-white/20 dark:hover:shadow-cyan-400/40
                    focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:focus:ring-cyan-600
                    text-cyan-900 dark:text-cyan-100
                    ${saveStatus === 'saving' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  style={{ minWidth: 24, minHeight: 24 }}
                  aria-label="Salvar código do projeto"
                >
                  {saveStatus === 'saved' ? (
                    <svg className="w-[14px] h-[14px] text-cyan-800 dark:text-cyan-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : saveStatus === 'saving' ? (
                    <span className="animate-spin w-[14px] h-[14px] border-2 border-cyan-800 dark:border-cyan-100 border-t-transparent rounded-full" />
                  ) : (
                    <span className="text-cyan-900 dark:text-cyan-100 text-xs text-normal">
                      Save
                    </span>
                  )}
                </button>
                {/* Diff Modal Trigger Button */}
                <button
                  onClick={() => setShowDiffModal(true)}
                  className="px-3 py-1.5 rounded-xl font-semibold transition-all duration-300 ease-in-out flex items-center justify-center
                    min-w-[48px] min-h-[32px]
                    bg-white/30 dark:bg-white/10
                    backdrop-blur-md
                    shadow-[0_4px_24px_0_rgba(0,255,255,0.15),0_1.5px_8px_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_0_rgba(0,255,255,0.12),0_1.5px_8px_0_rgba(0,0,0,0.25)]
                    border border-white/40 dark:border-white/10
                    hover:bg-white/50 hover:shadow-cyan-200/60 dark:hover:bg-white/20 dark:hover:shadow-cyan-400/40
                    focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:focus:ring-cyan-600
                    text-cyan-900 dark:text-cyan-100"
                  style={{ minWidth: 24, minHeight: 24 }}
                  aria-label="Comparar versões do arquivo"
                >
                  <span className="text-cyan-900 dark:text-cyan-100 text-xs text-normal">
                    Diff
                  </span>
                </button>
                {/* Fix Button */}
                <button
                  onClick={() => handleFixCode()}
                  disabled={isFixing}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-300 ease-in-out flex items-center justify-center
                    min-w-[48px] min-h-[32px]
                    bg-white/30 dark:bg-white/10
                    backdrop-blur-md
                    shadow-[0_4px_24px_0_rgba(0,255,255,0.15),0_1.5px_8px_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_0_rgba(0,255,255,0.12),0_1.5px_8px_0_rgba(0,0,0,0.25)]
                    border border-white/40 dark:border-white/10
                    hover:bg-white/50 hover:shadow-cyan-200/60 dark:hover:bg-white/20 dark:hover:shadow-cyan-400/40
                    focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:focus:ring-cyan-600
                    text-cyan-900 dark:text-cyan-100
                    ${isFixing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  style={{ minWidth: 24, minHeight: 24 }}
                  aria-label="Corrigir código automaticamente"
                >
                  <span className="text-cyan-900 dark:text-cyan-100 text-xs text-normal">
                    Fix
                  </span>
                </button>
              </div>
              {(publicUserId && selectedProjectId) && (
                <CurrentProjectLabel
                  userId={publicUserId}
                  selectedProjectId={selectedProjectId}
                  onOpenConfig={() => setShowConfigModal(true)}
                />
              )}
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
                
                // Track cursor position changes
                editor.onDidChangeCursorPosition((e) => {
                  setCursorPosition({
                    lineNumber: e.position.lineNumber,
                    column: e.position.column
                  });
                });
                
                // Track selection changes
                editor.onDidChangeCursorSelection((e) => {
                  const model = editor.getModel();
                  if (model && !e.selection.isEmpty()) {
                    const selectedText = model.getValueInRange(e.selection);
                    setEditorSelection({
                      startLineNumber: e.selection.startLineNumber,
                      startColumn: e.selection.startColumn,
                      endLineNumber: e.selection.endLineNumber,
                      endColumn: e.selection.endColumn,
                      selectedText: selectedText
                    });
                  } else {
                    setEditorSelection(null);
                  }
                });
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

        <WinBoxWindow 
          id="preview" 
          title="Preview" 
          x={windowConfig.preview.x} 
          y={windowConfig.preview.y} 
          width={windowConfig.preview.width} 
          height={windowConfig.preview.height}
        >
          <div className="w-full h-full flex flex-col bg-white/70 dark:bg-[#232733] text-gray-900 dark:text-gray-100 border border-cyan-100 dark:border-cyan-700 rounded-b-md p-0">
            <LiveProvider
              code={previewCode}
              scope={reactScope}
              noInline
            >
              <LivePreview />
              <LiveErrorWithRef ref={liveErrorRef} className="text-wrap"/>
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
            theme={theme}
          />
        </div>
      )}
      {isFixing && (
        <div className="z-[2147483647] fixed top-0 left-0 w-full h-full bg-black/60 dark:bg-[#232733]/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 dark:bg-[#232733]/90 backdrop-blur-md rounded-2xl border border-cyan-100 dark:border-cyan-700 p-8 shadow-2xl">
            <LoadingSpinner 
              theme={theme} 
              size="lg" 
              message="Analisando e corrigindo código..."
            />
          </div>
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
            onClose={() => setShowDiffModal(false)}
            theme={theme}
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
                  title="Focar Chat"
                  onClick={() => { centerWinBox('chat'); push('#chat'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Focar</span>
                </button>
              </div>
            </div>
            {/* Editor Controls */}
            <div className="w-full flex flex-col items-center space-y-1">
              <span className="text-xs text-blue-100 dark:text-cyan-200 mb-1 font-semibold tracking-wide">Editor</span>
              <div className="flex w-full justify-center space-x-2">
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Focar Editor"
                  onClick={() => { centerWinBox('editor'); push('#editor'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Focar</span>
                </button>
              </div>
            </div>
            {/* Preview Controls */}
            <div className="w-full flex flex-col items-center space-y-1">
              <span className="text-xs text-blue-100 dark:text-cyan-200 mb-1 font-semibold tracking-wide">Preview</span>
              <div className="flex w-full justify-center space-x-2">
                <button
                  className="flex flex-col items-center px-3 py-2 rounded bg-blue-900/60 text-blue-100 shadow hover:bg-blue-800/80 transition dark:rounded-lg dark:bg-cyan-800/60 dark:text-cyan-100 dark:shadow-md dark:border dark:border-cyan-700 dark:hover:bg-cyan-700/90 dark:hover:text-cyan-50 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-cyan-400"
                  title="Focar Preview"
                  onClick={() => { centerWinBox('preview'); push('#preview'); }}
                >
                  <span className=""><svg width="20" height="20" fill="currentColor"><path d="M12 7V4h-1v3H8l4 4 4-4h-3zm0 6v3h1v-3h3l-4-4-4 4h3z"/></svg></span>
                  <span className="text-[10px] font-bold text-blue-200 leading-none mt-0.5">Focar</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </EditorContext.Provider>
      </div>
    </GoogleOAuthProvider>
  </ThemeProvider>
);
}

export default Home;