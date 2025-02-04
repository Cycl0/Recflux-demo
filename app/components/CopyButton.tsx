'use client'

import { useState } from 'react'
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function CopyButton({
    text,
    className,
}: {
  text: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
      <button onClick={handleCopy} className={className}>
          {copied ? (
              <CheckIcon className="w-4 h-4 text-green-500" />
          ) : (
              <ContentCopyIcon className="w-4 h-4" />
          )}
      </button>
  )
}
