'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  confirmLabel: string;
  confirmStyle?: 'acid' | 'amber' | 'red';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CONFIRM_STYLES: Record<string, { bg: string; color: string }> = {
  acid:  { bg: 'var(--acid)',          color: 'var(--ink)' },
  amber: { bg: 'var(--signal-amber)',  color: '#1A1000'    },
  red:   { bg: 'var(--signal-red)',    color: '#fff'       },
};

export default function ConfirmModal({
  isOpen,
  title,
  subtitle,
  children,
  confirmLabel,
  confirmStyle = 'acid',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  const btnStyle = CONFIRM_STYLES[confirmStyle] ?? CONFIRM_STYLES.acid;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.60)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              background: 'var(--ink-soft)',
              border: '1px solid var(--ink-border)',
              borderRadius: '20px',
              padding: '36px',
              maxWidth: '480px',
              width: 'calc(100% - 32px)',
              margin: '0 16px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Title */}
            <h2
              style={{
                fontFamily: 'var(--font-dm-serif), serif',
                fontSize: '26px',
                color: 'var(--chrome)',
                fontWeight: 400,
                marginBottom: subtitle ? '8px' : '24px',
              }}
            >
              {title}
            </h2>

            {/* Subtitle (company name etc.) */}
            {subtitle && (
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                  color: 'var(--acid)',
                  marginBottom: '24px',
                  letterSpacing: '0.03em',
                }}
              >
                {subtitle}
              </p>
            )}

            {/* Form content */}
            <div style={{ marginBottom: '28px' }}>{children}</div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={onCancel}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '8px',
                  color: 'var(--chrome-muted)',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isLoading) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
                }}
              >
                Cancelar
              </button>

              <button
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  background: btnStyle.bg,
                  color: btnStyle.color,
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = isLoading ? '0.7' : '1'; }}
              >
                {isLoading && (
                  <span style={{
                    width: '12px', height: '12px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'modal-spin 0.7s linear infinite',
                  }} />
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      <style>{`
        @keyframes modal-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AnimatePresence>
  );
}
