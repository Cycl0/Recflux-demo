import React, { useEffect, useRef } from 'react';
import { createHighlighter } from 'shiki';
import { shikiToMonaco } from '@shikijs/monaco';
import * as monaco from 'monaco-editor-core';
import { Editor } from '@monaco-editor/react';

const MonacoEditor: React.FC = () => {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const initializeEditor = async () => {
      const highlighter = await createHighlighter({
        themes: ['vitesse-dark', 'vitesse-light'],
        langs: ['javascript', 'typescript', 'vue', 'jsx'],
      });

      monaco.languages.register({ id: 'vue' });
      monaco.languages.register({ id: 'typescript' });
      monaco.languages.register({ id: 'javascript' });

      shikiToMonaco(highlighter, monaco);
    };

    initializeEditor();
  }, []);

  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor;
  };

  return (
    <Editor
      width="400px"
      height="600px"
      defaultLanguage="javascript"
      defaultValue="// Codigo"
      theme="vitesse-dark"
      onMount={handleEditorDidMount}
    />
  );
};

export default MonacoEditor;