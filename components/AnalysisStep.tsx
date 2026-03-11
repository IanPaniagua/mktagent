'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisStep as AnalysisStepType } from '@/lib/types';

interface AnalysisStepProps {
  step: AnalysisStepType;
}

export default function AnalysisStep({ step }: AnalysisStepProps) {
  const isPending = step.status === 'pending';
  const isActive = step.status === 'active';
  const isDone = step.status === 'done';
  const isError = step.status === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '16px 20px',
        borderRadius: '10px',
        background: isActive ? 'rgba(200,255,0,0.03)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(200,255,0,0.15)' : 'transparent'}`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Status indicator */}
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {isPending && (
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '1px solid var(--ink-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '10px',
              color: 'var(--chrome-dim)',
            }}>
              {step.id}
            </span>
          </div>
        )}

        {isActive && (
          <div style={{ position: 'relative', width: '24px', height: '24px' }}>
            <div
              className="spinner"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px solid var(--ink-border)',
                borderTopColor: 'var(--acid)',
              }}
            />
          </div>
        )}

        {isDone && (
          <div
            className="pop-in"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--acid)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            ✓
          </div>
        )}

        {isError && (
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--signal-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
          }}>
            ✕
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <span style={{
            fontFamily: 'var(--font-geist), sans-serif',
            fontSize: '15px',
            fontWeight: isActive ? 600 : 400,
            color: isPending ? 'var(--chrome-dim)' : isDone ? 'var(--chrome-muted)' : 'var(--chrome)',
            transition: 'color 0.3s ease',
          }}>
            {step.name}
          </span>

          {isActive && (
            <span style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '10px',
              color: 'var(--acid)',
              background: 'rgba(200,255,0,0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.05em',
            }}>
              RUNNING
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {(isActive || isDone || isError) && (
            <motion.p
              key={step.description}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '12px',
                color: isError ? 'var(--signal-red)' : 'var(--chrome-muted)',
              }}
            >
              {step.description}
            </motion.p>
          )}
        </AnimatePresence>

        {step.subItems && step.subItems.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {step.subItems.map((item, i) => (
              <span
                key={i}
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '10px',
                  color: 'var(--acid)',
                  background: 'var(--ink-muted)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--ink-border)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
