'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ReportSection from '@/components/ReportSection';
import ExportButton from '@/components/ExportButton';
import ConfirmModal from '@/components/ConfirmModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CompanyData, AnalysisResult, ReportRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';

// ─── Next Steps Pipeline ───────────────────────────────────────────────────────

type PipelineStep = 'choose' | 'strategy' | 'proposal';

function NextStepsPipeline({
  companyId,
  reportId,
  companyData,
  reportContent,
}: {
  companyId: string;
  reportId: string | null;
  companyData: CompanyData;
  reportContent: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<PipelineStep>('choose');

  // Step 1: directions
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [directionBudget, setDirectionBudget] = useState('');
  const [directionPremium, setDirectionPremium] = useState('');
  const [directionsLoaded, setDirectionsLoaded] = useState(false);
  const [userDirectionInput, setUserDirectionInput] = useState('');

  // Step 2: strategy
  const [chosenDirection, setChosenDirection] = useState('');
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [strategyText, setStrategyText] = useState('');
  const [strategyDone, setStrategyDone] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [suggestedPriceMin, setSuggestedPriceMin] = useState<number | null>(null);
  const [suggestedPriceMax, setSuggestedPriceMax] = useState<number | null>(null);
  const [pricingRationale, setPricingRationale] = useState<string | null>(null);
  // Chat refinement
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [refining, setRefining] = useState(false);

  // Step 3: proposal generation
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [proposalText, setProposalText] = useState('');
  const [proposalDone, setProposalDone] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [markingSent, setMarkingSent] = useState(false);

  const strategyRef = useRef<HTMLDivElement>(null);
  const proposalRef = useRef<HTMLDivElement>(null);

  async function fetchDirections() {
    setLoadingDirections(true);
    setDirectionBudget('');
    setDirectionPremium('');
    setDirectionsLoaded(false);
    try {
      const res = await fetch(`/api/companies/${companyId}/directions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportContent,
          budget: companyData.budget,
          stage: companyData.stage,
          companyName: companyData.name,
        }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'direction_budget') setDirectionBudget(evt.content);
          if (evt.type === 'direction_premium') setDirectionPremium(evt.content);
          if (evt.type === 'complete') setDirectionsLoaded(true);
        }
      }
    } catch (e) {
      console.error('Directions error', e);
    } finally {
      setLoadingDirections(false);
    }
  }

  async function buildStrategy(direction: string, isCustom?: boolean) {
    setChosenDirection(direction);
    setStep('strategy');
    setLoadingStrategy(true);
    setStrategyText('');
    setStrategyDone(false);
    setTimeout(() => strategyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    try {
      const res = await fetch(`/api/companies/${companyId}/strategy-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chosenDirection: isCustom ? 'custom' : direction === directionBudget ? 'budget' : 'premium',
          userInput: isCustom ? userDirectionInput : '',
          reportContent,
          budget: companyData.budget,
          stage: companyData.stage,
          companyName: companyData.name,
          reportId: reportId ?? undefined,
          directionBudget,
          directionPremium,
        }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'chunk') {
            text += evt.content;
          }
          if (evt.type === 'complete') {
            setStrategyText(evt.strategyText || text);
            setStrategyDone(true);
            if (evt.proposalId) setProposalId(evt.proposalId);
            if (evt.suggestedPriceMin) setSuggestedPriceMin(evt.suggestedPriceMin as number);
            if (evt.suggestedPriceMax) {
              setSuggestedPriceMax(evt.suggestedPriceMax as number);
              setProposedPrice(String(evt.suggestedPriceMax as number));
            }
            if (evt.pricingRationale) setPricingRationale(evt.pricingRationale as string);
          }
        }
      }
    } catch (e) {
      console.error('Strategy error', e);
    } finally {
      setLoadingStrategy(false);
    }
  }

  async function generateProposal() {
    if (!proposalId) return;
    setStep('proposal');
    setLoadingProposal(true);
    setProposalText('');
    setProposalDone(false);
    setTimeout(() => proposalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    const price = parseFloat(proposedPrice) || 0;
    try {
      const res = await fetch(`/api/proposals/${proposalId}/generate-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyData.name,
          budget: companyData.budget,
          proposedPrice: price,
          currency,
        }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'chunk') {
            text += evt.content;
          }
          if (evt.type === 'complete') {
            setProposalText(text);
            setProposalDone(true);
          }
        }
      }
    } catch (e) {
      console.error('Proposal gen error', e);
    } finally {
      setLoadingProposal(false);
    }
  }

  async function markAsSent() {
    if (!proposalId) return;
    setMarkingSent(true);
    try {
      const price = parseFloat(proposedPrice) || undefined;
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
          proposed_price: price,
          currency,
        }),
      });
      router.push(`/proposals/${proposalId}`);
    } catch (e) {
      console.error('Mark sent error', e);
    } finally {
      setMarkingSent(false);
    }
  }

  async function refineStrategy() {
    if (!chatInput.trim() || !proposalId || refining) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setRefining(true);
    const newHistory = [...chatHistory, { role: 'user' as const, content: userMsg }];
    setChatHistory(newHistory);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, currentStrategy: strategyText, chatHistory }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'complete') {
            setStrategyText(evt.strategyText);
            if (evt.suggestedPriceMin) setSuggestedPriceMin(evt.suggestedPriceMin as number);
            if (evt.suggestedPriceMax) {
              setSuggestedPriceMax(evt.suggestedPriceMax as number);
              setProposedPrice(String(evt.suggestedPriceMax as number));
            }
            setChatHistory([...newHistory, { role: 'assistant', content: 'Strategy updated based on your input.' }]);
            if (evt.pricingRationale) setPricingRationale(evt.pricingRationale as string);
          }
        }
      }
    } catch (e) {
      console.error('Refine error', e);
    } finally {
      setRefining(false);
    }
  }

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      style={{ marginTop: '48px' }}
    >
      {/* ── STEP 1: Choose Direction ── */}
      <div style={{
        padding: '40px',
        background: 'var(--ink-soft)',
        border: '1px solid var(--ink-border)',
        borderRadius: '20px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-dm-serif), serif',
          fontSize: '28px',
          color: 'var(--chrome)',
          fontWeight: 400,
          marginBottom: '8px',
        }}>
          What&apos;s the next move?
        </h2>
        <p style={{
          fontFamily: 'var(--font-geist), sans-serif',
          fontSize: '14px',
          color: 'var(--chrome-muted)',
          marginBottom: '28px',
        }}>
          Based on everything analyzed, here are two strategic paths forward.
        </p>

        {!directionsLoaded && !loadingDirections && (
          <button
            onClick={fetchDirections}
            style={{
              padding: '14px 28px',
              background: 'var(--acid)',
              color: 'var(--ink)',
              border: 'none',
              borderRadius: '10px',
              fontFamily: 'var(--font-geist), sans-serif',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            Generate directions →
          </button>
        )}

        {loadingDirections && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                height: '180px',
                background: 'var(--ink-muted)',
                borderRadius: '12px',
                animation: 'skeleton-pulse 1.6s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {directionsLoaded && step === 'choose' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Lean path */}
              <div style={{
                padding: '24px',
                background: 'var(--ink-muted)',
                border: '1px solid var(--ink-border)',
                borderLeft: '2px solid var(--signal-amber)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    color: 'var(--signal-amber)',
                    background: 'rgba(255,176,32,0.12)',
                    border: '1px solid rgba(255,176,32,0.3)',
                    padding: '2px 8px',
                    borderRadius: '100px',
                  }}>
                    LEAN PATH
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '10px',
                    color: 'var(--chrome-dim)',
                  }}>
                    ~{companyData.budget}/month
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '13px',
                  color: 'var(--chrome-muted)',
                  lineHeight: 1.65,
                  flex: 1,
                }}>
                  {directionBudget}
                </p>
                <button
                  onClick={() => buildStrategy(directionBudget)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(255,176,32,0.4)',
                    borderRadius: '8px',
                    color: 'var(--signal-amber)',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,176,32,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  [ Choose this path ]
                </button>
              </div>

              {/* Premium path */}
              <div style={{
                padding: '24px',
                background: 'var(--ink-muted)',
                border: '1px solid var(--ink-border)',
                borderLeft: '2px solid var(--acid)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    color: 'var(--acid)',
                    background: 'rgba(200,255,0,0.12)',
                    border: '1px solid rgba(200,255,0,0.3)',
                    padding: '2px 8px',
                    borderRadius: '100px',
                  }}>
                    PREMIUM PATH
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '10px',
                    color: 'var(--chrome-dim)',
                  }}>
                    ~2–3× budget
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '13px',
                  color: 'var(--chrome-muted)',
                  lineHeight: 1.65,
                  flex: 1,
                }}>
                  {directionPremium}
                </p>
                <button
                  onClick={() => buildStrategy(directionPremium)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(200,255,0,0.3)',
                    borderRadius: '8px',
                    color: 'var(--acid)',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,255,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  [ Choose this path ]
                </button>
              </div>
            </div>

            {/* Custom direction */}
            <div style={{
              padding: '20px',
              background: 'var(--ink-muted)',
              border: '1px solid var(--ink-border)',
              borderRadius: '12px',
            }}>
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
                letterSpacing: '0.06em',
                marginBottom: '10px',
              }}>
                OR WRITE YOUR OWN DIRECTION
              </p>
              <textarea
                value={userDirectionInput}
                onChange={e => setUserDirectionInput(e.target.value)}
                placeholder="Or describe your own direction..."
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--ink)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                  color: 'var(--chrome)',
                  resize: 'vertical',
                  outline: 'none',
                  marginBottom: '12px',
                  lineHeight: 1.6,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
              />
              <button
                onClick={() => {
                  if (userDirectionInput.trim()) buildStrategy(userDirectionInput, true);
                }}
                disabled={!userDirectionInput.trim()}
                style={{
                  padding: '10px 20px',
                  background: userDirectionInput.trim() ? 'var(--acid)' : 'var(--ink-border)',
                  color: userDirectionInput.trim() ? 'var(--ink)' : 'var(--chrome-dim)',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: userDirectionInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.2s',
                }}
              >
                Build from my input →
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── STEP 2: Strategy Plan ── */}
      {(step === 'strategy' || step === 'proposal') && (
        <div
          ref={strategyRef}
          style={{
            marginTop: '20px',
            padding: '40px',
            background: 'var(--ink-soft)',
            border: '1px solid var(--ink-border)',
            borderRadius: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h2 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '24px',
              color: 'var(--chrome)',
              fontWeight: 400,
            }}>
              Your Strategy Plan
            </h2>
            {chosenDirection === directionBudget && (
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                letterSpacing: '0.08em',
                color: 'var(--signal-amber)',
                background: 'rgba(255,176,32,0.12)',
                border: '1px solid rgba(255,176,32,0.3)',
                padding: '2px 8px',
                borderRadius: '100px',
              }}>LEAN PATH</span>
            )}
            {chosenDirection === directionPremium && (
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                letterSpacing: '0.08em',
                color: 'var(--acid)',
                background: 'rgba(200,255,0,0.12)',
                border: '1px solid rgba(200,255,0,0.3)',
                padding: '2px 8px',
                borderRadius: '100px',
              }}>PREMIUM PATH</span>
            )}
            {chosenDirection !== directionBudget && chosenDirection !== directionPremium && (
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                letterSpacing: '0.08em',
                color: 'var(--signal-blue)',
                background: 'rgba(0,140,255,0.12)',
                border: '1px solid rgba(0,140,255,0.3)',
                padding: '2px 8px',
                borderRadius: '100px',
              }}>CUSTOM</span>
            )}
          </div>

          {loadingStrategy && !strategyText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '14px', height: '14px',
                border: '2px solid var(--acid)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'modal-spin 0.7s linear infinite',
              }} />
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '12px',
                color: 'var(--chrome-dim)',
              }}>
                Generating strategy plan...
              </span>
            </div>
          )}

          {strategyText && (
            <div style={{ marginBottom: '28px' }}>
              {/* Markdown rendered strategy */}
              <div style={{
                padding: '28px 32px',
                background: 'var(--ink-muted)',
                border: '1px solid var(--ink-border)',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '20px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '12px', marginTop: '24px', borderBottom: '1px solid var(--ink-border)', paddingBottom: '8px' }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--acid)', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '8px', marginTop: '20px' }}>{children}</h3>,
                    p: ({ children }) => <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.75, marginBottom: '12px' }}>{children}</p>,
                    li: ({ children }) => <li style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.7, marginBottom: '6px' }}>{children}</li>,
                    ul: ({ children }) => <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ol>,
                    strong: ({ children }) => <strong style={{ color: 'var(--chrome)', fontWeight: 600 }}>{children}</strong>,
                    code: ({ children }) => <code style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', background: 'var(--ink-soft)', padding: '2px 6px', borderRadius: '4px', color: 'var(--acid)' }}>{children}</code>,
                    table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>{children}</table>,
                    th: ({ children }) => <th style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.08em', padding: '8px 12px', borderBottom: '1px solid var(--ink-border)', textAlign: 'left' }}>{children}</th>,
                    td: ({ children }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--ink-border)', color: 'var(--chrome-muted)', fontFamily: 'var(--font-geist), sans-serif' }}>{children}</td>,
                  }}
                >
                  {strategyText}
                </ReactMarkdown>
              </div>

              {/* Chat refinement interface */}
              {strategyDone && (
                <div style={{
                  background: 'var(--ink-soft)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '24px',
                }}>
                  {/* Chat history */}
                  {chatHistory.length > 0 && (
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ink-border)' }}>
                      {chatHistory.map((msg, i) => (
                        <div key={i} style={{
                          marginBottom: '10px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-dm-mono), monospace',
                            fontSize: '10px',
                            color: msg.role === 'user' ? 'var(--acid)' : 'var(--chrome-dim)',
                            letterSpacing: '0.08em',
                            minWidth: '60px',
                            paddingTop: '2px',
                          }}>
                            {msg.role === 'user' ? 'YOU' : 'AGENT'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', lineHeight: 1.6 }}>
                            {msg.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Input area */}
                  <div style={{ padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); refineStrategy(); } }}
                        placeholder="Refine this strategy... e.g. 'Focus more on LinkedIn, remove TikTok' or 'Make month 1 more aggressive'"
                        rows={2}
                        style={{
                          width: '100%',
                          background: 'var(--ink-muted)',
                          border: '1px solid var(--ink-border)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontFamily: 'var(--font-geist), sans-serif',
                          fontSize: '13px',
                          color: 'var(--chrome)',
                          resize: 'none',
                          outline: 'none',
                          lineHeight: 1.5,
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                        disabled={refining}
                      />
                    </div>
                    <button
                      onClick={refineStrategy}
                      disabled={!chatInput.trim() || refining}
                      style={{
                        padding: '10px 18px',
                        background: chatInput.trim() && !refining ? 'var(--acid)' : 'var(--ink-muted)',
                        color: chatInput.trim() && !refining ? 'var(--ink)' : 'var(--chrome-dim)',
                        border: '1px solid var(--ink-border)',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-dm-mono), monospace',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: chatInput.trim() && !refining ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                    >
                      {refining ? (
                        <>
                          <span style={{ width: '10px', height: '10px', border: '2px solid var(--chrome-dim)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'modal-spin 0.7s linear infinite' }} />
                          Refining...
                        </>
                      ) : '↵ Refine'}
                    </button>
                  </div>
                  <div style={{ padding: '6px 20px 10px', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)' }}>
                    Press Enter to send · Shift+Enter for new line · Strategy updates instantly
                  </div>
                </div>
              )}
            </div>
          )}

          {strategyDone && step === 'strategy' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStep('proposal')}
                style={{
                  padding: '14px 24px',
                  background: 'var(--acid)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                ✓ I like this — Generate Proposal
              </button>
              <button
                onClick={() => {
                  setStep('choose');
                  setStrategyText('');
                  setStrategyDone(false);
                  setProposalId(null);
                }}
                style={{
                  padding: '14px 24px',
                  background: 'transparent',
                  color: 'var(--chrome-muted)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
                }}
              >
                ← Try a different direction
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Generate Client Proposal ── */}
      {step === 'proposal' && (
        <div
          ref={proposalRef}
          style={{
            marginTop: '20px',
            padding: '40px',
            background: 'var(--ink-soft)',
            border: '1px solid var(--ink-border)',
            borderRadius: '20px',
          }}
        >
          <h2 style={{
            fontFamily: 'var(--font-dm-serif), serif',
            fontSize: '24px',
            color: 'var(--chrome)',
            fontWeight: 400,
            marginBottom: '24px',
          }}>
            Client Proposal
          </h2>

          {/* Price + generate controls */}
          {!loadingProposal && !proposalDone && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-dim)',
                  letterSpacing: '0.06em',
                }}>
                  YOUR FEE — What you will charge the client for implementing this strategy
                </p>
                {suggestedPriceMin && suggestedPriceMax && (
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '10px',
                    color: 'var(--acid)',
                    background: 'rgba(200,255,0,0.08)',
                    border: '1px solid rgba(200,255,0,0.25)',
                    padding: '2px 10px',
                    borderRadius: '100px',
                    letterSpacing: '0.06em',
                  }}>
                    Agent suggests: €{suggestedPriceMin.toLocaleString()}–€{suggestedPriceMax.toLocaleString()}/mo
                  </span>
                )}
              </div>

              {/* Pricing rationale advice card */}
              {pricingRationale && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'rgba(200,255,0,0.04)',
                  border: '1px solid rgba(200,255,0,0.15)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>💡</span>
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '10px',
                      color: 'var(--acid)',
                      letterSpacing: '0.1em',
                      marginBottom: '4px',
                    }}>AGENT ADVICE</p>
                    <p style={{
                      fontFamily: 'var(--font-geist), sans-serif',
                      fontSize: '13px',
                      color: 'var(--chrome-muted)',
                      lineHeight: 1.6,
                      margin: 0,
                    }}>{pricingRationale}</p>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  style={{
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '8px',
                    padding: '11px 14px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '13px',
                    color: 'var(--chrome)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
                <input
                  type="number"
                  value={proposedPrice}
                  onChange={e => setProposedPrice(e.target.value)}
                  placeholder="e.g. 2500"
                  style={{
                    flex: 1,
                    maxWidth: '200px',
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '8px',
                    padding: '11px 14px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '13px',
                    color: 'var(--chrome)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                />
                {proposedPrice && (
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '13px',
                    color: 'var(--acid)',
                  }}>
                    {currencySymbol}{parseFloat(proposedPrice).toLocaleString()}/mo
                  </span>
                )}
              </div>
              <button
                onClick={generateProposal}
                disabled={!proposalId}
                style={{
                  padding: '14px 28px',
                  background: proposalId ? 'var(--acid)' : 'var(--ink-border)',
                  color: proposalId ? 'var(--ink)' : 'var(--chrome-dim)',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: proposalId ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.2s',
                }}
              >
                Generate client proposal →
              </button>
            </div>
          )}

          {loadingProposal && !proposalText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '14px', height: '14px',
                border: '2px solid var(--acid)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'modal-spin 0.7s linear infinite',
              }} />
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '12px',
                color: 'var(--chrome-dim)',
              }}>
                Writing your proposal...
              </span>
            </div>
          )}

          {proposalText && (
            <div style={{
              padding: '32px',
              background: 'var(--ink-muted)',
              border: '1px solid var(--ink-border)',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '26px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '8px', marginTop: '0' }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '20px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '12px', marginTop: '28px', borderBottom: '1px solid var(--ink-border)', paddingBottom: '8px' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--acid)', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '8px', marginTop: '20px' }}>{children}</h3>,
                  p: ({ children }) => <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.75, marginBottom: '12px' }}>{children}</p>,
                  li: ({ children }) => <li style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.7, marginBottom: '6px' }}>{children}</li>,
                  ul: ({ children }) => <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ol>,
                  strong: ({ children }) => <strong style={{ color: 'var(--chrome)', fontWeight: 600 }}>{children}</strong>,
                  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--ink-border)', margin: '24px 0' }} />,
                  blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid var(--acid)', paddingLeft: '16px', margin: '16px 0', color: 'var(--chrome-muted)' }}>{children}</blockquote>,
                  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>{children}</table>,
                  th: ({ children }) => <th style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.08em', padding: '8px 12px', borderBottom: '1px solid var(--ink-border)', textAlign: 'left' }}>{children}</th>,
                  td: ({ children }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--ink-border)', color: 'var(--chrome-muted)', fontFamily: 'var(--font-geist), sans-serif' }}>{children}</td>,
                }}
              >
                {proposalText}
              </ReactMarkdown>
            </div>
          )}

          {proposalDone && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Price update if not set yet */}
              {!proposedPrice && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    style={{
                      background: 'var(--ink-muted)',
                      border: '1px solid var(--ink-border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '12px',
                      color: 'var(--chrome)',
                      outline: 'none',
                    }}
                  >
                    <option value="EUR">EUR €</option>
                    <option value="USD">USD $</option>
                    <option value="GBP">GBP £</option>
                  </select>
                  <input
                    type="number"
                    value={proposedPrice}
                    onChange={e => setProposedPrice(e.target.value)}
                    placeholder="Price/month"
                    style={{
                      width: '140px',
                      background: 'var(--ink-muted)',
                      border: '1px solid var(--ink-border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '12px',
                      color: 'var(--chrome)',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
              <button
                onClick={markAsSent}
                disabled={markingSent}
                style={{
                  padding: '14px 24px',
                  background: 'var(--acid)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: markingSent ? 'not-allowed' : 'pointer',
                  opacity: markingSent ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {markingSent && (
                  <span style={{
                    width: '12px', height: '12px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'modal-spin 0.7s linear infinite',
                  }} />
                )}
                Mark as Sent
              </button>
              {proposalId && (
                <Link
                  href={`/proposals/${proposalId}`}
                  style={{
                    padding: '14px 20px',
                    background: 'transparent',
                    color: 'var(--chrome-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '10px',
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '14px',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
                  }}
                >
                  View Proposal →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes modal-spin { to { transform: rotate(360deg); } }
        @keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
      `}</style>
    </motion.div>
  );
}

const SECTIONS = [
  { id: 'executiveSummary', key: 'executiveSummary' as keyof AnalysisResult, title: 'Executive Summary', icon: '⚡', anchor: 'exec' },
  { id: 'companyAnalysis', key: 'companyAnalysis' as keyof AnalysisResult, title: 'Company Analysis', icon: '🏢', anchor: 'company' },
  { id: 'userResearch', key: 'userResearch' as keyof AnalysisResult, title: 'User Research', icon: '👥', anchor: 'users' },
  { id: 'competitorAnalysis', key: 'competitorAnalysis' as keyof AnalysisResult, title: 'Competitor Analysis', icon: '🔍', anchor: 'competitors' },
  { id: 'marketingStrategy', key: 'marketingStrategy' as keyof AnalysisResult, title: 'Marketing Strategy', icon: '🎯', anchor: 'strategy' },
  { id: 'budgetAllocation', key: 'budgetAllocation' as keyof AnalysisResult, title: 'Budget Allocation', icon: '💰', anchor: 'budget' },
];

export default function ResultsPage() {
  const router = useRouter();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult>({
    executiveSummary: '',
    companyAnalysis: '',
    userResearch: '',
    competitorAnalysis: '',
    marketingStrategy: '',
    budgetAllocation: '',
  });
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('executiveSummary');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── "Iniciar estrategia" modal state ────────────────────────────────────────
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [strategyDesc, setStrategyDesc] = useState('');
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategySuccess, setStrategySuccess] = useState(false);

  // ── "Pausar proyecto" modal state ────────────────────────────────────────────
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseLoading, setPauseLoading] = useState(false);

  useEffect(() => {
    const storedCompany = sessionStorage.getItem('mktagent_company');
    const storedResults = sessionStorage.getItem('mktagent_results');
    const storedCompanyId = sessionStorage.getItem('mktagent_company_id');
    const storedReportId = sessionStorage.getItem('mktagent_report_id');

    if (!storedCompany) {
      router.push('/company');
      return;
    }

    if (storedCompanyId) setCompanyId(storedCompanyId);
    if (storedReportId) setReportId(storedReportId);

    try {
      const company = JSON.parse(storedCompany) as CompanyData;
      setCompanyData(company);

      if (storedResults) {
        const res = JSON.parse(storedResults) as Partial<AnalysisResult>;
        setResults({
          executiveSummary: res.executiveSummary || '',
          companyAnalysis: res.companyAnalysis || '',
          userResearch: res.userResearch || '',
          competitorAnalysis: res.competitorAnalysis || '',
          marketingStrategy: res.marketingStrategy || '',
          budgetAllocation: res.budgetAllocation || '',
        });
        setSavedDate(new Date().toISOString());
      } else if (storedCompanyId) {
        fetch(`/api/companies/${storedCompanyId}/reports`)
          .then(r => r.json())
          .then(({ reports }: { reports: ReportRecord[] }) => {
            if (reports && reports.length > 0) {
              const latest = reports[0];
              setResults({
                executiveSummary: latest.executive_summary || '',
                companyAnalysis: latest.company_analysis || '',
                userResearch: latest.user_research || '',
                competitorAnalysis: latest.competitor_analysis || '',
                marketingStrategy: latest.marketing_strategy || '',
                budgetAllocation: latest.budget_allocation || '',
              });
              setSavedDate(latest.created_at);
              if (latest.id && !storedReportId) {
                setReportId(latest.id);
                sessionStorage.setItem('mktagent_report_id', latest.id);
              }
              sessionStorage.setItem('mktagent_results', JSON.stringify({
                executiveSummary: latest.executive_summary,
                companyAnalysis: latest.company_analysis,
                userResearch: latest.user_research,
                competitorAnalysis: latest.competitor_analysis,
                marketingStrategy: latest.marketing_strategy,
                budgetAllocation: latest.budget_allocation,
              }));
            } else {
              router.push('/company');
            }
          })
          .catch(() => router.push('/company'));
      } else {
        router.push('/company');
      }
    } catch {
      router.push('/company');
    }
  }, [router]);

  // Intersection observer for sidebar highlight
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(section => {
      const el = document.getElementById(section.id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(section.id); },
        { threshold: 0.3, rootMargin: '-56px 0px 0px 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [results]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNewAnalysis = () => {
    sessionStorage.removeItem('mktagent_company');
    sessionStorage.removeItem('mktagent_results');
    sessionStorage.removeItem('mktagent_company_id');
    sessionStorage.removeItem('mktagent_usage');
    sessionStorage.removeItem('mktagent_report_id');
    router.push('/company');
  };

  // ── Strategy handlers ────────────────────────────────────────────────────────

  async function handleStrategyConfirm() {
    if (!strategyName.trim() || !companyId) return;
    setStrategyLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: strategyName.trim(),
          description: strategyDesc.trim() || undefined,
          report_id: reportId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create strategy');
      setStrategySuccess(true);
      setTimeout(() => {
        setStrategyModalOpen(false);
        setStrategySuccess(false);
        setStrategyName('');
        setStrategyDesc('');
        router.push('/dashboard');
      }, 1200);
    } catch (err) {
      console.error('[MKTAGENT] Strategy creation failed:', err);
    } finally {
      setStrategyLoading(false);
    }
  }

  // ── Pause handlers ───────────────────────────────────────────────────────────

  async function handlePauseConfirm() {
    if (!companyId) return;
    setPauseLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paused',
          pause_reason: pauseReason,
          paused_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to pause');
      setPauseModalOpen(false);
      setPauseReason('');
      router.push('/dashboard');
    } catch (err) {
      console.error('[MKTAGENT] Pause failed:', err);
    } finally {
      setPauseLoading(false);
    }
  }

  // ── Parse a channel hint from the marketingStrategy section ─────────────────

  function parseChannelHint(text: string): string | null {
    if (!text) return null;
    // Look for a pattern like "1. Channel Name" or "**Channel**" near the top
    const numbered = text.match(/^\d+\.\s+\*{0,2}([^*\n:,]{3,40})/m);
    if (numbered) return numbered[1].trim();
    const bold = text.match(/\*\*([^*]{3,40})\*\*/);
    if (bold) return bold[1].trim();
    return null;
  }

  const channelHint = parseChannelHint(results.marketingStrategy);

  if (!companyData) {
    return (
      <>
        <Navbar />
        <main style={{
          minHeight: '100vh',
          background: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="spinner" style={{
            width: '32px',
            height: '32px',
            border: '2px solid var(--ink-border)',
            borderTopColor: 'var(--acid)',
            borderRadius: '50%',
          }} />
        </main>
      </>
    );
  }

  const stageColors: Record<string, string> = {
    'Idea': 'var(--signal-amber)',
    'MVP': 'var(--signal-blue)',
    'Pre-PMF': 'var(--signal-amber)',
    'Post-PMF': 'var(--acid-dim)',
    'Growth': 'var(--acid)',
    'Scale': 'var(--acid)',
  };

  const stageColor = stageColors[companyData.stage] || 'var(--chrome-muted)';

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        paddingTop: '56px',
        display: 'flex',
      }}>
        {/* Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            width: '260px',
            flexShrink: 0,
            position: 'sticky',
            top: '56px',
            height: 'calc(100vh - 56px)',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--ink-border)',
            padding: '32px 0',
            overflow: 'hidden',
          }}
        >
          {/* Company info */}
          <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--ink-border)' }}>
            <h2 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '18px',
              color: 'var(--chrome)',
              marginBottom: '8px',
              fontWeight: 400,
            }}>
              {companyData.name}
            </h2>
            {companyData.stage && (
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                padding: '3px 10px',
                borderRadius: '100px',
                background: `${stageColor}20`,
                color: stageColor,
                border: `1px solid ${stageColor}40`,
                letterSpacing: '0.08em',
              }}>
                {companyData.stage.toUpperCase()}
              </span>
            )}
            {companyData.industry && (
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
                marginTop: '8px',
              }}>
                {companyData.industry}
              </p>
            )}
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }} aria-label="Report sections">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 20px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderLeft: isActive ? '2px solid var(--acid)' : '2px solid transparent',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                  aria-label={`Jump to ${section.title}`}
                >
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{section.icon}</span>
                  <span style={{
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '13px',
                    color: isActive ? 'var(--chrome)' : 'var(--chrome-muted)',
                    fontWeight: isActive ? 500 : 400,
                    transition: 'color 0.2s',
                  }}>
                    {section.title}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Export + New Analysis */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ink-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ExportButton companyName={companyData.name} results={results} />
            <button
              onClick={handleNewAnalysis}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
                letterSpacing: '0.05em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--chrome-muted)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--chrome-dim)')}
              aria-label="Start a new analysis"
            >
              + NEW ANALYSIS
            </button>
          </div>
        </motion.aside>

        {/* Main content */}
        <div style={{ flex: 1, padding: '40px', maxWidth: '900px', overflow: 'visible' }}>

          {/* Dashboard header bar */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              padding: '10px 16px',
              background: 'var(--ink-soft)',
              border: '1px solid var(--ink-border)',
              borderRadius: '10px',
            }}
          >
            <Link
              href="/dashboard"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-muted)',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--chrome)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)')}
            >
              ← Dashboard
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '15px', color: 'var(--chrome)' }}>
                {companyData.name}
              </span>
              {savedDate && (
                <span style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-dim)',
                  letterSpacing: '0.04em',
                }}>
                  Saved · {formatDate(savedDate)}
                </span>
              )}
            </div>
          </motion.div>

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '40px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--acid)', letterSpacing: '0.1em' }}>
                MARKETING INTELLIGENCE REPORT
              </span>
              <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '36px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '8px' }}>
              {companyData.name}
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[companyData.industry, companyData.stage, companyData.mrr, companyData.budget].filter(Boolean).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    color: 'var(--chrome-muted)',
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    padding: '3px 10px',
                    borderRadius: '4px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Report sections */}
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <ReportSection
                id={section.id}
                title={section.title}
                icon={section.icon}
                content={results[section.key]}
                defaultOpen={i === 0}
              />
            </motion.div>
          ))}

          {/* ── Next Steps Pipeline ────────────────────────────────────────── */}
          {companyId && (
            <NextStepsPipeline
              companyId={companyId}
              reportId={reportId}
              companyData={companyData}
              reportContent={[
                results.executiveSummary,
                results.marketingStrategy,
                results.budgetAllocation,
              ].filter(Boolean).join('\n\n').slice(0, 4000)}
            />
          )}


          {/* Footer */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--ink-border)', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '11px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.08em',
            }}>
              Generated by MKTAGENT · Powered by Claude · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>

      {/* ── Iniciar estrategia modal ─────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={strategyModalOpen}
        title="Iniciar estrategia"
        subtitle={companyData?.name}
        confirmLabel={strategySuccess ? '✓ Estrategia iniciada' : '🚀 Iniciar'}
        confirmStyle="acid"
        onConfirm={handleStrategyConfirm}
        onCancel={() => {
          if (!strategyLoading) {
            setStrategyModalOpen(false);
            setStrategyName('');
            setStrategyDesc('');
          }
        }}
        isLoading={strategyLoading}
      >
        <AnimatePresence mode="wait">
          {strategySuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px',
                background: 'rgba(200,255,0,0.08)',
                border: '1px solid rgba(200,255,0,0.2)',
                borderRadius: '10px',
              }}
            >
              <span style={{ color: 'var(--acid)', fontSize: '18px' }}>✓</span>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '13px',
                color: 'var(--acid)',
              }}>
                Estrategia iniciada — redirigiendo...
              </span>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 1 }}>
              {/* Strategy name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-dim)',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}>
                  NOMBRE DE LA ESTRATEGIA *
                </label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={e => setStrategyName(e.target.value)}
                  placeholder="Ej: SEO + Content para Q2"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '8px',
                    padding: '11px 14px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '13px',
                    color: 'var(--chrome)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                />
              </div>

              {/* Strategy description */}
              <div style={{ marginBottom: channelHint ? '12px' : '0' }}>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-dim)',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}>
                  DESCRIPCIÓN / OBJETIVO
                </label>
                <textarea
                  value={strategyDesc}
                  onChange={e => setStrategyDesc(e.target.value)}
                  placeholder="Qué quieres lograr con esta estrategia..."
                  rows={3}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '8px',
                    padding: '11px 14px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '13px',
                    color: 'var(--chrome)',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    lineHeight: 1.6,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                />
              </div>

              {/* Channel hint */}
              {channelHint && (
                <p style={{
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '12px',
                  color: 'var(--chrome-dim)',
                  padding: '10px 12px',
                  background: 'var(--ink-muted)',
                  borderRadius: '8px',
                  lineHeight: 1.5,
                }}>
                  💡 Basado en el reporte, considera: <span style={{ color: 'var(--chrome-muted)' }}>{channelHint}</span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ConfirmModal>

      {/* ── Pausar proyecto modal ────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={pauseModalOpen}
        title="Pausar proyecto"
        subtitle={companyData?.name}
        confirmLabel="Confirmar pausa"
        confirmStyle="amber"
        onConfirm={handlePauseConfirm}
        onCancel={() => {
          if (!pauseLoading) {
            setPauseModalOpen(false);
            setPauseReason('');
          }
        }}
        isLoading={pauseLoading}
      >
        <textarea
          value={pauseReason}
          onChange={e => setPauseReason(e.target.value)}
          placeholder="Ej: No hay tracción suficiente para continuar con la inversión..."
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--ink-muted)',
            border: '1px solid var(--ink-border)',
            borderRadius: '10px',
            padding: '14px 16px',
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: '13px',
            color: 'var(--chrome)',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s',
            lineHeight: 1.6,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--signal-amber)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
        />
        <p style={{
          fontFamily: 'var(--font-dm-mono), monospace',
          fontSize: '11px',
          color: 'var(--chrome-dim)',
          marginTop: '8px',
        }}>
          ¿Cuál es la razón?
        </p>
      </ConfirmModal>
    </>
  );
}
