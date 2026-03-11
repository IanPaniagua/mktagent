'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import AnalysisStep from '@/components/AnalysisStep';
import { CompanyData, AnalysisStep as AnalysisStepType, AnalysisResult, UsageData } from '@/lib/types';

const INITIAL_STEPS: AnalysisStepType[] = [
  { id: 1, name: 'Scraping landing page', description: 'Extracting content and messaging...', status: 'pending' },
  { id: 2, name: 'Reading GitHub repository', description: 'Analyzing codebase and README...', status: 'pending' },
  { id: 3, name: 'Processing uploaded documents', description: 'Parsing PDFs and documents...', status: 'pending' },
  { id: 4, name: 'Running competitor research', description: 'Scraping competitor websites...', status: 'pending' },
  { id: 5, name: 'Conducting user research', description: 'Analyzing market positioning...', status: 'pending' },
  { id: 6, name: 'Analyzing company stage', description: 'Diagnosing current position...', status: 'pending' },
  { id: 7, name: 'Building marketing strategy', description: 'Generating strategic recommendations...', status: 'pending' },
  { id: 8, name: 'Generating final report', description: 'Compiling intelligence brief...', status: 'pending' },
];

export default function AnalyzingPage() {
  const router = useRouter();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [steps, setSteps] = useState<AnalysisStepType[]>(INITIAL_STEPS);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState<Partial<AnalysisResult>>({});
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [savedToDashboard, setSavedToDashboard] = useState(false);
  const hasStarted = useRef(false);
  const hasSaved = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('mktagent_company');
    if (!stored) {
      router.push('/company');
      return;
    }
    try {
      const data = JSON.parse(stored) as CompanyData;
      setCompanyData(data);
    } catch {
      router.push('/company');
    }
  }, [router]);

  useEffect(() => {
    if (!companyData || hasStarted.current) return;
    hasStarted.current = true;
    startAnalysis(companyData);
  }, [companyData]);

  // Save to Supabase when analysis completes
  useEffect(() => {
    if (!isComplete || hasSaved.current || !companyData) return;
    hasSaved.current = true;
    saveToDashboard(companyData, results, usageData);
  }, [isComplete, companyData, results, usageData]);

  const saveToDashboard = async (
    company: CompanyData,
    analysisResults: Partial<AnalysisResult>,
    usage: UsageData | null
  ) => {
    try {
      // Check for existing company_id (re-analysis flow)
      const existingId = sessionStorage.getItem('mktagent_company_id');
      let companyId = existingId;

      if (!companyId) {
        // Create new company record
        const res = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(company),
        });
        if (!res.ok) throw new Error(`Failed to create company: ${res.status}`);
        const { company: created } = await res.json();
        companyId = created.id;
        sessionStorage.setItem('mktagent_company_id', companyId as string);
      }

      // Save the report
      const reportRes = await fetch(`/api/companies/${companyId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: analysisResults, usageData: usage }),
      });
      if (!reportRes.ok) throw new Error(`Failed to save report: ${reportRes.status}`);

      const { report: savedReport } = await reportRes.json();
      if (savedReport?.id) {
        sessionStorage.setItem('mktagent_report_id', savedReport.id);
      }

      setSavedToDashboard(true);
    } catch (err) {
      // Silently fail — don't break the UI
      console.error('[MKTAGENT] Failed to save to dashboard:', err);
    }
  };

  const updateStep = (stepId: number, status: AnalysisStepType['status'], description?: string) => {
    setSteps(prev => prev.map(s =>
      s.id === stepId
        ? { ...s, status, description: description || s.description }
        : s
    ));
  };

  const startAnalysis = async (data: CompanyData) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
            const event = JSON.parse(jsonStr) as {
              type: string;
              step?: number;
              status?: 'active' | 'done';
              message?: string;
              section?: string;
              content?: string;
              usage?: UsageData;
            };

            if (event.type === 'step' && event.step !== undefined) {
              updateStep(event.step, event.status || 'active', event.message);
            } else if (event.type === 'result' && event.section) {
              setResults(prev => ({ ...prev, [event.section!]: event.content || '' }));
            } else if (event.type === 'cost' && event.usage) {
              setUsageData(event.usage);
            } else if (event.type === 'complete') {
              setIsComplete(true);
            } else if (event.type === 'error') {
              setHasError(true);
              setErrorMessage(event.message || 'Analysis failed');
            }
          } catch {
            // Ignore parse errors for individual events
          }
        }
      }
    } catch (err) {
      setHasError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  const handleViewResults = () => {
    sessionStorage.setItem('mktagent_results', JSON.stringify(results));
    if (usageData) {
      sessionStorage.setItem('mktagent_usage', JSON.stringify(usageData));
    }
    router.push('/results');
  };

  const handleRetry = () => {
    hasStarted.current = false;
    hasSaved.current = false;
    setHasError(false);
    setErrorMessage('');
    setSteps(INITIAL_STEPS);
    setResults({});
    setIsComplete(false);
    setSavedToDashboard(false);
    if (companyData) {
      hasStarted.current = true;
      startAnalysis(companyData);
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
            {companyData && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '12px',
                  color: 'var(--acid)',
                  letterSpacing: '0.1em',
                }}>
                  ANALYZING
                </span>
                {' '}
                <span style={{
                  fontFamily: 'var(--font-dm-serif), serif',
                  fontSize: '28px',
                  color: 'var(--chrome)',
                }}>
                  {companyData.name}
                </span>
                <span className="cursor-blink" style={{
                  color: 'var(--acid)',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  marginLeft: '4px',
                }}>
                  _
                </span>
              </div>
            )}
            <p style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '12px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.05em',
            }}>
              {hasError ? 'ANALYSIS FAILED' : isComplete ? 'ANALYSIS COMPLETE' : 'ANALYSIS IN PROGRESS'}
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="progress-bar" style={{ marginBottom: '40px' }}>
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
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
                style={{
                  borderBottom: i < steps.length - 1 ? '1px solid var(--ink-border)' : 'none',
                }}
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
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                  aria-label="Retry analysis"
                >
                  Retry Analysis
                </button>
              </motion.div>
            )}

            {isComplete && !hasError && (
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
                    background: 'var(--acid)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '28px',
                    color: 'var(--ink)',
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
                  Analysis Complete
                </p>
                <p style={{
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  color: 'var(--chrome-muted)',
                  marginBottom: '20px',
                }}>
                  Your full marketing intelligence report is ready.
                </p>

                {/* Cost breakdown */}
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
                      COST <span style={{ color: 'var(--acid)', fontWeight: 700 }}>${usageData.totalCost.toFixed(4)}</span>
                    </span>
                  </motion.div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={handleViewResults}
                    style={{
                      padding: '14px 36px',
                      background: 'var(--acid)',
                      color: 'var(--ink)',
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
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(200,255,0,0.3)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                    aria-label="View full report"
                  >
                    View Full Report →
                  </button>

                  {/* Saved to dashboard indicator */}
                  <AnimatePresence>
                    {savedToDashboard && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: 'var(--acid)', fontSize: '12px' }}>✓</span>
                        <span style={{
                          fontFamily: 'var(--font-dm-mono), monospace',
                          fontSize: '11px',
                          color: 'var(--chrome-dim)',
                          letterSpacing: '0.04em',
                        }}>
                          Saved to dashboard
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress count */}
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
