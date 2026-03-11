'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReportSectionProps {
  id: string;
  title: string;
  icon: string;
  content: string;
  defaultOpen?: boolean;
}

export default function ReportSection({ id, title, icon, content, defaultOpen = true }: ReportSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      id={id}
      style={{
        background: 'var(--ink-soft)',
        border: '1px solid var(--ink-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '16px',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderBottom: isOpen ? '1px solid var(--ink-border)' : 'none',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <h2 style={{
            fontFamily: 'var(--font-dm-serif), serif',
            fontSize: '20px',
            color: 'var(--chrome)',
            fontWeight: 400,
            margin: 0,
          }}>
            {title}
          </h2>
        </div>
        <span style={{
          color: 'var(--chrome-dim)',
          fontSize: '20px',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          ⌄
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`${id}-content`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '24px' }} className="report-content">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--chrome-dim)',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                }}>
                  No data available for this section
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
