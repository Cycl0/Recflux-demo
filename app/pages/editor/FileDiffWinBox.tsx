import React, { useCallback } from 'react';
import FileDiffViewer from '@/components/FileDiffViewer';

interface FileDiffWinBoxProps {
  fileId: string;
  currentCode: string;
  onCopyToCurrentFile: (code: string) => void;
}

export default function FileDiffWinBox({ fileId, currentCode, onCopyToCurrentFile }: FileDiffWinBoxProps) {
  return (
    <div className="w-full h-full">
      <FileDiffViewer fileId={fileId} currentCode={currentCode} onCopyToCurrentFile={onCopyToCurrentFile} />
    </div>
  );
}
