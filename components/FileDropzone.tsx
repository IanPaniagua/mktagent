'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadedDocument } from '@/lib/types';

interface FileDropzoneProps {
  files: UploadedDocument[];
  onChange: (files: UploadedDocument[]) => void;
  maxFiles?: number;
}

export default function FileDropzone({ files, onChange, maxFiles = 3 }: FileDropzoneProps) {
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError('');

      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const newDocs: UploadedDocument[] = [];

      for (const file of acceptedFiles) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} is too large (max 10MB)`);
          continue;
        }

        const content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        newDocs.push({
          name: file.name,
          type: file.type || 'text/plain',
          content,
          size: file.size,
        });
      }

      onChange([...files, ...newDocs]);
    },
    [files, onChange, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles,
    disabled: files.length >= maxFiles,
  });

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setError('');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('docx')) return '📝';
    return '📃';
  };

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--acid)' : 'var(--ink-border)'}`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          cursor: files.length >= maxFiles ? 'not-allowed' : 'pointer',
          background: isDragActive ? 'rgba(200,255,0,0.03)' : 'var(--ink-muted)',
          transition: 'all 0.2s ease',
          opacity: files.length >= maxFiles ? 0.5 : 1,
        }}
      >
        <input {...getInputProps()} />
        <div style={{ marginBottom: '8px', fontSize: '24px' }}>⬆</div>
        <p style={{
          fontFamily: 'var(--font-geist), sans-serif',
          color: isDragActive ? 'var(--acid)' : 'var(--chrome-muted)',
          fontSize: '14px',
          marginBottom: '4px',
        }}>
          {isDragActive
            ? 'Drop files here...'
            : files.length >= maxFiles
            ? `Maximum ${maxFiles} files reached`
            : 'Drop files here, or click to browse'
          }
        </p>
        <p style={{
          fontFamily: 'var(--font-dm-mono), monospace',
          color: 'var(--chrome-dim)',
          fontSize: '11px',
        }}>
          PDF, DOCX, TXT, MD — max 10MB each — {maxFiles} files max
        </p>
      </div>

      {error && (
        <p style={{
          color: 'var(--signal-red)',
          fontSize: '12px',
          marginTop: '8px',
          fontFamily: 'var(--font-dm-mono), monospace',
        }}>
          ⚠ {error}
        </p>
      )}

      {files.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {files.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '8px',
                borderLeft: '2px solid var(--acid)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>{getFileIcon(file.type)}</span>
                <div>
                  <p style={{
                    fontFamily: 'var(--font-geist), sans-serif',
                    color: 'var(--chrome)',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    {file.name}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    color: 'var(--chrome-dim)',
                    fontSize: '11px',
                  }}>
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--chrome-dim)',
                  fontSize: '18px',
                  lineHeight: 1,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--signal-red)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--chrome-dim)')}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
