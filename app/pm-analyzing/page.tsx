'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import AnalysisStep from '@/components/AnalysisStep';
import { AnalysisStep as AnalysisStepType, PMInputData, UsageData } from '@/lib/types';

const INITIAL_STEPS: AnalysisStepType[] = [
  { id: 1, name: 'Scraping landing page',            description: 'Extracting product content and messaging...', status: 'pending' },
  { id: 2, name: 'Reading GitHub repository',        description: 'Analyzing codebase maturity and README...', status: 'pending' },
  { id: 3, name: 'Processing product documents',     description: 'Parsing PRDs, research, and roadmap...', status: 'pending' },
  { id: 4, name: 'Analyzing product positioning',   description: 'Vision, ICP, JTBD, competitive alternatives...', status: 'pending' },
  { id: 5, name: 'Diagnosing PMF & AARRR signals',  description: 'PMF stage, pirate metrics health, validation plan...', status: 'pending' },
  { id: 6, name: 'Building Product Intelligence Brief', description: 'PMCORE generating 13-section report...', status: 'pending' },
  { id: 7, name: 'Structuring brief sections',       description: 'Parsing Vision, OKRs, AARRR, Deliverables...', status: 'pending' },
];

function PMAnalyzingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('company');

  const [steps, setSteps] = useState<AnalysisStepType[]>(INITIAL_STEPS);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!companyId || hasStarted.current) return;
    hasStarted.current = true;

    const stored = sessionStorage.getItem('mktagent_pm_input');
    if (!stored) {
      router.push(`/pm/${companyId}`);
      return;
    }

    const pmInput = JSON.parse(stored) as PMInputData;
    startAnalysis(companyId, pmInput);
  }, [companyId, router]);

  const updateStep = (stepId: number, status: AnalysisStepType['status'], description?: string) => {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, status, description: description || s.description } : s
    ));
  };

  const startAnalysis = async (id: string, pmInput: PMInputData) => {
    try {
      const response = await fetch(`/api/companies/${id}/pm-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pmInput),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'step' && event.step !== undefined) {
              updateStep(event.step, event.status || 'active', event.message);
            } else if (event.type === 'cost' && event.usage) {
              setUsageData(event.usage);
            } else if (event.type === 'complete' && event.briefId) {
              setBriefId(event.briefId);
              sessionStorage.removeItem('mktagent_pm_input');
              setIsComplete(true);
            } else if (event.type === 'error') {
              setHasError(true);
              setErrorMessage(event.message || 'PM analysis failed');
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setHasError(true);
      setErrorMessage(err instanceof Error ? err.message : 'PM analysis failed');
    }
  };

  const handleRetry = () => {
    hasStarted.current = false;
    setHasError(false);
    setErrorMessage('');
    setSteps(INITIAL_STEPS);
    setIsComplete(false);
    setBriefId(null);

    if (companyId) {
      const stored = sessionStorage.getItem('mktagent_pm_input');
      if (stored) {
        hasStarted.current = true;
        startAnalysis(companyId, JSON.parse(stored) as PMInputData);
      } else {
        router.push(`/pm/${companyId}`);
      }
    }
  };

  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = (doneCount / steps.length) * 100;

  return (
    <>
      <Navbar />
      <div className="scan-line" />

      <main style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 40px',
      }}>
        <div style={{ maxWidth: '680px', width: '100%' }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '48px', textAlign: 'center' }}
          >
            <div style={{ marginBottom: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--signal-blue)',
                letterSpacing: '0.1em',
              }}>
                PHASE 1 · PMCORE — PRODUCT INTELLIGENCE
              </span>
              {' '}
              <span style={{
                fontFamily: 'var(--font-dm-serif), serif',
                fontSize: '28px',
                color: 'var(--chrome)',
              }}>
                Product Intelligence
              </span>
              <span className="cursor-blink" style={{
                color: 'var(--signal-blue)',
                fontFamily: 'var(--font-dm-mono), monospace',
                marginLeft: '4px',
              }}>
                _
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '12px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.05em',
            }}>
              {hasError ? 'ANALYSIS FAILED' : isComplete ? 'BRIEF COMPLETE' : 'ANALYSIS IN PROGRESS'}
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="progress-bar" style={{ marginBottom: '40px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                background: 'var(--signal-blue)',
              }}
            />
          </div>

          {/* Steps */}
          <div style={{
            background: 'var(--ink-soft)',
            border: '1px solid var(--ink-border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            {steps.map((step, i) => (
              <div
                key={step.id}
                style={{ borderBottom: i < steps.length - 1 ? '1px solid var(--ink-border)' : 'none' }}
              >
                <AnalysisStep step={step} />
              </div>
            ))}
          </div>

          {/* Bottom state */}
          <AnimatePresence mode="wait">
            {hasError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  marginTop: '32px',
                  padding: '20px 24px',
                  background: 'rgba(255,51,85,0.08)',
                  border: '1px solid rgba(255,51,85,0.3)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  color: 'var(--signal-red)',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}>
                  ⚠ {errorMessage}
                </p>
                <button
                  onClick={handleRetry}
                  style={{
                    padding: '10px 24px',
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '8px',
                    color: 'var(--chrome)',
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--signal-blue)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                >
                  Retry Analysis
                </button>
              </motion.div>
            )}

            {isComplete && !hasError && briefId && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ marginTop: '32px', textAlign: 'center' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--signal-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '28px',
                    color: '#fff',
                  }}
                >
                  ✓
                </motion.div>
                <p style={{
                  fontFamily: 'var(--font-dm-serif), serif',
                  fontSize: '24px',
                  color: 'var(--chrome)',
                  marginBottom: '8px',
                }}>
                  Product Brief Ready
                </p>
                <p style={{
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  color: 'var(--chrome-muted)',
                  marginBottom: '20px',
                }}>
                  PMCORE has completed the product intelligence analysis.
                </p>

                {usageData && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      display: 'inline-flex',
                      gap: '20px',
                      padding: '10px 20px',
                      background: 'var(--ink-muted)',
                      border: '1px solid var(--ink-border)',
                      borderRadius: '8px',
                      marginBottom: '24px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', letterSpacing: '0.05em' }}>
                      IN <span style={{ color: 'var(--chrome-muted)' }}>{usageData.inputTokens.toLocaleString()}</span> tokens
                    </span>
                    <span style={{ color: 'var(--ink-border)' }}>·</span>
                    <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', letterSpacing: '0.05em' }}>
                      OUT <span style={{ color: 'var(--chrome-muted)' }}>{usageData.outputTokens.toLocaleString()}</span> tokens
                    </span>
                    <span style={{ color: 'var(--ink-border)' }}>·</span>
                    <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', letterSpacing: '0.05em' }}>
                      COST <span style={{ color: 'var(--signal-blue)', fontWeight: 700 }}>${usageData.totalCost.toFixed(4)}</span>
                    </span>
                  </motion.div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => router.push(`/pm/brief/${briefId}`)}
                    style={{
                      padding: '14px 36px',
                      background: 'var(--signal-blue)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-geist), sans-serif',
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,140,255,0.3)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    View Product Brief →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isComplete && !hasError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginTop: '24px',
                textAlign: 'center',
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
                letterSpacing: '0.05em',
              }}
            >
              {doneCount} / {steps.length} STEPS COMPLETE
            </motion.p>
          )}
        </div>
      </main>
    </>
  );
}

export default function PMAnalyzingPage() {
  return (
    <Suspense fallback={null}>
      <PMAnalyzingContent />
    </Suspense>
  );
}
