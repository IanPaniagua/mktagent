'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { UsageData } from '@/lib/types';

interface Step {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'done';
  message?: string;
}

const INITIAL_STEPS: Step[] = [
  { id: 1, label: 'Loading PM Brief', status: 'pending' },
  { id: 2, label: 'Running AARRR health check', status: 'pending' },
  { id: 3, label: 'Evaluating growth readiness', status: 'pending' },
  { id: 4, label: 'Head of Growth making decision', status: 'pending' },
  { id: 5, label: 'Structuring review sections', status: 'pending' },
];

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: '14px', height: '14px',
      border: '2px solid rgba(255,149,0,0.2)',
      borderTopColor: '#ff9500', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

export default function GrowthReviewingPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [done, setDone] = useState(false);
  const [decision, setDecision] = useState<'go' | 'no-go' | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = Math.round((doneCount / steps.length) * 100);

  function updateStep(id: number, status: Step['status'], message?: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, message } : s));
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const pmBriefId = sessionStorage.getItem('growthOS_pm_brief_id');
    const companyId = sessionStorage.getItem('growthOS_company_id');

    if (!companyId) {
      setError('No company found. Go back to the PM Brief.');
      return;
    }

    fetch('/api/growth-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, pmBriefId, phase: 'post-pm' }),
    }).then(async res => {
      if (!res.ok || !res.body) {
        setError('Growth review failed. Please try again.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'step') {
              updateStep(msg.step, msg.status, msg.message);
            }
            if (msg.type === 'cost') {
              setUsage(msg.usage);
            }
            if (msg.type === 'complete') {
              setDone(true);
              setDecision(msg.decision);
              setReviewId(msg.reviewId);
              // Clean session
              sessionStorage.removeItem('growthOS_pm_brief_id');
              sessionStorage.removeItem('growthOS_company_id');
            }
            if (msg.type === 'error') {
              setError(msg.message);
            }
          } catch { /* skip */ }
        }
      }
    }).catch(() => setError('Connection failed. Please try again.'));
  }, []);

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh', background: 'var(--ink)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px 60px',
      }}>
        <div style={{ maxWidth: '560px', width: '100%' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.25)',
              borderRadius: '100px', padding: '5px 14px', marginBottom: '20px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff9500', display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: '#ff9500', letterSpacing: '0.1em' }}>
                PHASE 2 · HEAD OF GROWTH
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: 'clamp(26px, 4vw, 36px)',
              color: 'var(--chrome)', fontWeight: 400, lineHeight: 1.2,
            }}>
              Growth Review
              {!done && <span style={{ animation: 'blink 1s step-end infinite' }}>_</span>}
            </h1>
            <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', marginTop: '10px', lineHeight: 1.6 }}>
              The Head of Growth is reviewing the PM Brief and making the Go / No-Go decision.
            </p>
          </div>

          {/* Progress bar */}
          <div style={{
            height: '3px', background: 'var(--ink-muted)',
            borderRadius: '2px', marginBottom: '32px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: done
                ? (decision === 'go' ? 'var(--acid)' : 'var(--signal-red)')
                : '#ff9500',
              width: `${progress}%`,
              transition: 'width 0.4s ease, background 0.3s',
            }} />
          </div>

          {/* Steps */}
          <div style={{
            background: 'var(--ink-soft)', border: '1px solid var(--ink-border)',
            borderRadius: '12px', overflow: 'hidden', marginBottom: '32px',
          }}>
            {steps.map((step, i) => (
              <div
                key={step.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: i < steps.length - 1 ? '1px solid var(--ink-border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: step.status === 'active' ? 'rgba(255,149,0,0.04)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ width: '22px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                  {step.status === 'done' && (
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#ff9500', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700,
                    }}>✓</span>
                  )}
                  {step.status === 'active' && <Spinner />}
                  {step.status === 'pending' && (
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: '1px solid var(--ink-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px',
                      color: 'var(--chrome-dim)',
                    }}>{step.id}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                    color: step.status === 'active' ? 'var(--chrome)' : step.status === 'done' ? 'var(--chrome-muted)' : 'var(--chrome-dim)',
                    fontWeight: step.status === 'active' ? 600 : 400,
                  }}>
                    {step.message || step.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Error state */}
          {error && (
            <div style={{
              padding: '16px 20px', background: 'rgba(255,59,48,0.08)',
              border: '1px solid rgba(255,59,48,0.25)', borderRadius: '10px',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--signal-red)', marginBottom: '12px' }}>{error}</p>
              <button onClick={() => router.back()} style={{
                padding: '8px 20px', background: 'transparent',
                border: '1px solid var(--signal-red)', borderRadius: '6px',
                color: 'var(--signal-red)', fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px', cursor: 'pointer',
              }}>
                Go Back
              </button>
            </div>
          )}

          {/* Done state */}
          {done && reviewId && (
            <div style={{ textAlign: 'center' }}>
              {/* Decision banner */}
              <div style={{
                padding: '20px 24px', borderRadius: '12px', marginBottom: '24px',
                background: decision === 'go' ? 'rgba(200,255,0,0.06)' : 'rgba(255,59,48,0.06)',
                border: `1px solid ${decision === 'go' ? 'rgba(200,255,0,0.25)' : 'rgba(255,59,48,0.25)'}`,
              }}>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), monospace', fontSize: '28px',
                  fontWeight: 700, letterSpacing: '0.05em',
                  color: decision === 'go' ? 'var(--acid)' : 'var(--signal-red)',
                  marginBottom: '8px',
                }}>
                  {decision === 'go' ? '✓ GO' : '✗ NO-GO'}
                </div>
                <p style={{
                  fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                  color: 'var(--chrome-muted)', margin: 0, lineHeight: 1.6,
                }}>
                  {decision === 'go'
                    ? 'The product is ready for marketing. See the full review for the growth hypothesis.'
                    : 'More PM work needed before marketing spend. See the review for priority actions.'}
                </p>
              </div>

              {/* Usage */}
              {usage && (
                <div style={{
                  display: 'inline-flex', gap: '20px', padding: '8px 16px',
                  background: 'var(--ink-muted)', border: '1px solid var(--ink-border)',
                  borderRadius: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                    IN <span style={{ color: 'var(--chrome-muted)' }}>{usage.inputTokens.toLocaleString()}</span>
                  </span>
                  <span style={{ color: 'var(--ink-border)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                    OUT <span style={{ color: 'var(--chrome-muted)' }}>{usage.outputTokens.toLocaleString()}</span>
                  </span>
                  <span style={{ color: 'var(--ink-border)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                    COST <span style={{ color: '#ff9500', fontWeight: 700 }}>${usage.totalCost.toFixed(4)}</span>
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => router.push(`/growth-review/${reviewId}`)}
                  style={{
                    padding: '14px 32px',
                    background: decision === 'go' ? 'var(--acid)' : 'var(--signal-blue)',
                    color: decision === 'go' ? 'var(--ink)' : '#fff',
                    border: 'none', borderRadius: '8px',
                    fontFamily: 'var(--font-geist), sans-serif', fontSize: '15px',
                    fontWeight: 700, cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${decision === 'go' ? 'rgba(200,255,0,0.3)' : 'rgba(0,140,255,0.3)'}`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  View Full Growth Review →
                </button>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                  Saved to dashboard
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
