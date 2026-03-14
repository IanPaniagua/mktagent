'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';
import { PMProposal, PMProposalStatus } from '@/lib/types';

interface PMProposalWithRelations extends PMProposal {
  companies: { name: string; stage: string; budget?: string };
  pm_briefs: { id: string; company_id: string };
}

const STATUS_CONFIG: Record<PMProposalStatus, { bg: string; color: string; label: string }> = {
  draft:    { bg: 'rgba(120,120,130,0.18)', color: 'var(--chrome-muted)', label: 'Draft'    },
  sent:     { bg: 'rgba(0,140,255,0.12)',  color: 'var(--signal-blue)',  label: 'Sent'     },
  accepted: { bg: 'rgba(200,255,0,0.12)',  color: 'var(--acid)',         label: 'Accepted' },
  rejected: { bg: 'rgba(255,51,85,0.12)', color: 'var(--signal-red)',   label: 'Rejected' },
};

function StatusBadge({ status }: { status: PMProposalStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span style={{
      fontFamily: 'var(--font-dm-mono), monospace',
      fontSize: '10px',
      letterSpacing: '0.06em',
      padding: '3px 10px',
      borderRadius: '100px',
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}

type Phase = 'plan' | 'proposal';

export default function PMProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proposalId } = use(params);
  const router = useRouter();

  const [proposal, setProposal] = useState<PMProposalWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  // Plan generation
  const [planText, setPlanText] = useState('');
  const [planStreaming, setPlanStreaming] = useState(false);
  const [planDone, setPlanDone] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [execMin, setExecMin] = useState<number | null>(null);
  const [execMax, setExecMax] = useState<number | null>(null);

  // Proposal generation
  const [proposalText, setProposalText] = useState('');
  const [proposalStreaming, setProposalStreaming] = useState(false);
  const [proposalDone, setProposalDone] = useState(false);
  const [editedPrice, setEditedPrice] = useState<number>(0);

  // UI phase
  const [phase, setPhase] = useState<Phase>('plan');

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);

  // Proposal clarification
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyText, setClarifyText] = useState('');
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyStreamText, setClarifyStreamText] = useState('');
  const [clarifyDone, setClarifyDone] = useState(false);
  const [clarifyError, setClarifyError] = useState('');

  useEffect(() => {
    fetch(`/api/pm-proposals/${proposalId}`)
      .then(r => r.json())
      .then(data => {
        if (data.proposal) {
          const p = data.proposal as PMProposalWithRelations;
          setProposal(p);
          // Restore existing data
          if (p.pm_plan) {
            setPlanText(p.pm_plan);
            setPlanDone(true);
          }
          if (p.proposed_price) {
            setSuggestedPrice(p.proposed_price);
            setEditedPrice(p.proposed_price);
          }
          if (p.execution_budget_min) setExecMin(p.execution_budget_min);
          if (p.execution_budget_max) setExecMax(p.execution_budget_max);
          if (p.proposal_content) {
            setProposalText(p.proposal_content);
            setProposalDone(true);
            setPhase('proposal');
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [proposalId]);

  async function readSSE(
    res: Response,
    onChunk: (text: string) => void,
    onComplete: (msg: Record<string, unknown>) => void,
    onError: () => void,
  ) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim();
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'chunk') onChunk(msg.content ?? '');
          if (msg.type === 'complete') onComplete(msg);
          if (msg.type === 'error') onError();
        } catch { /* skip */ }
      }
    }
  }

  function generatePlan() {
    setPlanText('');
    setPlanStreaming(true);
    setPlanDone(false);

    let accumulated = '';
    fetch(`/api/pm-proposals/${proposalId}/generate-plan`, { method: 'POST' })
      .then(res => readSSE(
        res,
        chunk => { accumulated += chunk; },
        msg => {
          setPlanText(accumulated);
          setPlanDone(true);
          setPlanStreaming(false);
          if (msg.suggestedPrice) { setSuggestedPrice(msg.suggestedPrice as number); setEditedPrice(msg.suggestedPrice as number); }
          if (msg.execMin) setExecMin(msg.execMin as number);
          if (msg.execMax) setExecMax(msg.execMax as number);
        },
        () => setPlanStreaming(false),
      ))
      .catch(() => setPlanStreaming(false));
  }

  function generateProposal() {
    if (!proposal) return;
    setProposalText('');
    setProposalStreaming(true);
    setProposalDone(false);
    setPhase('proposal');

    let accumulated = '';
    fetch(`/api/pm-proposals/${proposalId}/generate-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedPrice: editedPrice || suggestedPrice || 0,
        currency: proposal.currency ?? 'EUR',
      }),
    })
      .then(res => readSSE(
        res,
        chunk => { accumulated += chunk; },
        () => { setProposalText(accumulated); setProposalDone(true); setProposalStreaming(false); },
        () => setProposalStreaming(false),
      ))
      .catch(() => setProposalStreaming(false));
  }

  async function savePrice() {
    await fetch(`/api/pm-proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed_price: editedPrice }),
    });
    setPriceSaved(true);
    setTimeout(() => setPriceSaved(false), 2000);
  }

  async function updateStatus(status: PMProposalStatus) {
    if (!proposal) return;
    setStatusUpdating(true);
    const res = await fetch(`/api/pm-proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setProposal(p => p ? { ...p, status: data.proposal.status } : p);
    }
    setStatusUpdating(false);
  }

  async function sendProposalClarification() {
    if (!clarifyText.trim()) return;
    setClarifyLoading(true);
    setClarifyStreamText('');
    setClarifyDone(false);
    setClarifyError('');

    try {
      const res = await fetch(`/api/pm-proposals/${proposalId}/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clarification: clarifyText }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'token') setClarifyStreamText(prev => prev + msg.text);
            if (msg.type === 'complete') {
              setProposalText(msg.proposalContent);
              setClarifyDone(true);
              setClarifyLoading(false);
              setClarifyText('');
            }
            if (msg.type === 'error') {
              setClarifyError(msg.message);
              setClarifyLoading(false);
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setClarifyError('Connection failed. Please try again.');
      setClarifyLoading(false);
    }
  }

  function goToMarketing() {
    if (!proposal) return;
    sessionStorage.setItem('mktagent_pm_brief_id', proposal.pm_brief_id);
    sessionStorage.setItem('mktagent_company_id', proposal.company_id);
    router.push('/analyzing');
  }

  const currency = proposal?.currency ?? 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--chrome-dim)', fontSize: '13px' }}>
            Loading proposal...
          </div>
        </main>
      </>
    );
  }

  if (!proposal) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--signal-red)', marginBottom: '16px' }}>Proposal not found.</p>
            <Link href="/dashboard" style={{ color: 'var(--signal-blue)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>← Dashboard</Link>
          </div>
        </main>
      </>
    );
  }

  const chosenLabel = proposal.chosen_direction === 'Direction A'
    ? 'Fix Foundation First'
    : proposal.chosen_direction === 'Direction B'
      ? 'Start Now, Fix in Parallel'
      : proposal.chosen_direction ?? 'Custom Direction';

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--ink)', padding: '80px 0 80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '36px' }}>
            <Link href={`/pm/brief/${proposal.pm_brief_id}`} style={{
              fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
              color: 'var(--chrome-dim)', textDecoration: 'none', letterSpacing: '0.05em',
              display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px',
            }}>
              ← PM Brief
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0,140,255,0.08)', border: '1px solid rgba(0,140,255,0.2)',
                  borderRadius: '100px', padding: '5px 14px', marginBottom: '12px',
                }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--signal-blue)', letterSpacing: '0.08em' }}>
                    PM PROPOSAL · PHASE 1
                  </span>
                </div>
                <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 'clamp(26px, 4vw, 38px)', color: 'var(--chrome)', fontWeight: 400, marginBottom: '6px' }}>
                  {proposal.companies?.name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--chrome-dim)', letterSpacing: '0.04em' }}>
                    {proposal.companies?.stage} · Direction: <span style={{ color: 'var(--signal-blue)' }}>{chosenLabel}</span>
                  </p>
                  <StatusBadge status={proposal.status} />
                </div>
              </div>

              {/* Send count badge */}
              {proposal.send_count > 0 && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(120,120,130,0.1)', border: '1px solid rgba(120,120,130,0.2)',
                  borderRadius: '100px', padding: '4px 12px',
                }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', letterSpacing: '0.06em' }}>
                    SENT {proposal.send_count}×
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Direction summary */}
          {(proposal.direction_fix_first || proposal.direction_quick_start || proposal.user_input) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                marginBottom: '28px',
                padding: '20px 24px',
                background: 'rgba(0,140,255,0.04)',
                border: '1px solid rgba(0,140,255,0.15)',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--signal-blue)', letterSpacing: '0.08em', marginBottom: '10px' }}>
                CHOSEN DIRECTION
              </div>
              <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.7 }}>
                {proposal.user_input ||
                  (proposal.chosen_direction === 'Direction A' ? proposal.direction_fix_first : proposal.direction_quick_start)}
              </p>
            </motion.div>
          )}

          {/* Tab switcher (once plan exists) */}
          {planDone && (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--ink-soft)', border: '1px solid var(--ink-border)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
              {(['plan', 'proposal'] as Phase[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  style={{
                    padding: '8px 20px',
                    background: phase === p ? 'rgba(0,140,255,0.15)' : 'transparent',
                    border: phase === p ? '1px solid rgba(0,140,255,0.3)' : '1px solid transparent',
                    borderRadius: '7px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '12px',
                    color: phase === p ? 'var(--signal-blue)' : 'var(--chrome-dim)',
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                    transition: 'all 0.15s',
                  }}
                >
                  {p === 'plan' ? 'PM ACTION PLAN' : 'CLIENT PROPOSAL'}
                </button>
              ))}
            </div>
          )}

          {/* ── PLAN phase ── */}
          <AnimatePresence mode="wait">
            {phase === 'plan' && (
              <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!planDone && !planStreaming && (
                  <motion.div
                    style={{
                      padding: '40px',
                      background: 'var(--ink-soft)',
                      border: '1px solid var(--ink-border)',
                      borderRadius: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '16px' }}>📋</div>
                    <h3 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '22px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '10px' }}>
                      Generate PM Action Plan
                    </h3>
                    <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-dim)', marginBottom: '28px', maxWidth: '480px', margin: '0 auto 28px' }}>
                      PMCORE will build a detailed action plan with Critical / Important / Nice-to-have issues, a 2-month delivery roadmap, and pricing.
                    </p>
                    <button
                      onClick={generatePlan}
                      style={{
                        padding: '14px 32px',
                        background: 'var(--signal-blue)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-geist), sans-serif',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,140,255,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    >
                      Generate PM Action Plan →
                    </button>
                  </motion.div>
                )}

                {planStreaming && (
                  <div style={{
                    background: 'var(--ink-soft)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '12px',
                    padding: '60px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      border: '3px solid rgba(0,140,255,0.15)',
                      borderTopColor: 'var(--signal-blue)',
                      animation: 'spin-anim 0.8s linear infinite',
                    }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--signal-blue)', letterSpacing: '0.08em', marginBottom: '6px' }}>
                        PMCORE IS WORKING...
                      </div>
                      <div style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-dim)' }}>
                        Building your PM Action Plan. This takes about a minute.
                      </div>
                    </div>
                  </div>
                )}

                {!planStreaming && planText && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--ink-soft)',
                      border: '1px solid var(--ink-border)',
                      borderRadius: '12px',
                      padding: '32px',
                    }}
                  >
                    <div className="markdown-content" style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.8 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{planText}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}

                {/* Pricing + CTA */}
                {planDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      marginTop: '24px',
                      padding: '24px 28px',
                      background: 'rgba(0,140,255,0.04)',
                      border: '1px solid rgba(0,140,255,0.2)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '24px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.08em', marginBottom: '8px' }}>
                        SUGGESTED PRICING
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', marginBottom: '4px' }}>PM Fee/month</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '20px', color: 'var(--signal-blue)', fontWeight: 700 }}>{currencySymbol}</span>
                            <input
                              type="number"
                              value={editedPrice || ''}
                              onChange={e => { setEditedPrice(Number(e.target.value)); setPriceSaved(false); }}
                              style={{
                                background: 'var(--ink-muted)',
                                border: '1px solid var(--ink-border)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                fontFamily: 'var(--font-dm-mono), monospace',
                                fontSize: '18px',
                                color: 'var(--chrome)',
                                width: '120px',
                                outline: 'none',
                              }}
                            />
                            <button
                              onClick={savePrice}
                              style={{
                                padding: '7px 14px',
                                background: priceSaved ? 'rgba(200,255,0,0.1)' : 'rgba(0,140,255,0.1)',
                                border: `1px solid ${priceSaved ? 'rgba(200,255,0,0.3)' : 'rgba(0,140,255,0.3)'}`,
                                borderRadius: '6px',
                                fontFamily: 'var(--font-dm-mono), monospace',
                                fontSize: '11px',
                                color: priceSaved ? 'var(--acid)' : 'var(--signal-blue)',
                                cursor: 'pointer',
                                letterSpacing: '0.05em',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {priceSaved ? '✓ SAVED' : 'SAVE'}
                            </button>
                          </div>
                        </div>
                        {execMin && execMax && (
                          <div>
                            <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', marginBottom: '4px' }}>Execution budget</div>
                            <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '16px', color: 'var(--chrome-muted)' }}>
                              {currencySymbol}{execMin.toLocaleString()}–{currencySymbol}{execMax.toLocaleString()}/mo
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={generateProposal}
                      disabled={proposalStreaming}
                      style={{
                        padding: '14px 28px',
                        background: proposalStreaming ? 'var(--ink-muted)' : 'var(--signal-blue)',
                        color: proposalStreaming ? 'var(--chrome-dim)' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-geist), sans-serif',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: proposalStreaming ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { if (!proposalStreaming) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,140,255,0.3)'; } }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    >
                      {proposalStreaming ? 'Generating...' : 'Generate Client Proposal →'}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── PROPOSAL phase ── */}
            {phase === 'proposal' && (
              <motion.div key="proposal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {proposalStreaming && (
                  <div style={{
                    background: 'var(--ink-soft)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '12px',
                    padding: '60px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      border: '3px solid rgba(0,140,255,0.15)',
                      borderTopColor: 'var(--signal-blue)',
                      animation: 'spin-anim 0.8s linear infinite',
                    }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--signal-blue)', letterSpacing: '0.08em', marginBottom: '6px' }}>
                        WRITING CLIENT PROPOSAL...
                      </div>
                      <div style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-dim)' }}>
                        Translating the action plan into a client-facing document.
                      </div>
                    </div>
                  </div>
                )}

                {!proposalStreaming && !proposalText && (
                  <div style={{
                    background: 'var(--ink-soft)', border: '1px solid var(--ink-border)',
                    borderRadius: '12px', padding: '60px 20px', textAlign: 'center',
                  }}>
                    <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px', color: 'var(--chrome-dim)', marginBottom: '20px' }}>
                      Go back to the PM Action Plan tab and click &quot;Generate Client Proposal&quot;.
                    </p>
                    <button
                      onClick={() => setPhase('plan')}
                      style={{
                        padding: '10px 20px', background: 'transparent',
                        border: '1px solid var(--ink-border)', borderRadius: '8px',
                        fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
                        color: 'var(--chrome-muted)', cursor: 'pointer',
                      }}
                    >
                      ← Back to Plan
                    </button>
                  </div>
                )}

                {!proposalStreaming && proposalText && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--ink-soft)', border: '1px solid var(--ink-border)',
                      borderRadius: '12px', padding: '40px',
                    }}
                  >
                    <div className="markdown-content" style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '15px', color: 'var(--chrome-muted)', lineHeight: 1.9 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposalText}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}

                {/* Clarify panel */}
                {proposalDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{ marginTop: '20px' }}
                  >
                    <button
                      onClick={() => { setClarifyOpen(o => !o); setClarifyDone(false); setClarifyStreamText(''); setClarifyError(''); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: clarifyOpen ? 'rgba(0,140,255,0.08)' : 'transparent',
                        border: `1px solid ${clarifyOpen ? 'rgba(0,140,255,0.3)' : 'var(--ink-border)'}`,
                        borderRadius: '8px', padding: '10px 16px',
                        fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
                        color: clarifyOpen ? 'var(--signal-blue)' : 'var(--chrome-dim)',
                        cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.05em',
                      }}
                    >
                      <span>💬</span>
                      <span>ASK PMCORE TO UPDATE PROPOSAL</span>
                      <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{clarifyOpen ? '▲' : '▼'}</span>
                    </button>

                    <AnimatePresence>
                      {clarifyOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            marginTop: '8px',
                            padding: '20px',
                            background: 'var(--ink-soft)',
                            border: '1px solid rgba(0,140,255,0.2)',
                            borderRadius: '10px',
                          }}>
                            {!clarifyDone && (
                              <>
                                <textarea
                                  value={clarifyText}
                                  onChange={e => setClarifyText(e.target.value)}
                                  placeholder='e.g. "Change the price to €2,500/month" or "Make the tone more direct in the assessment section"'
                                  disabled={clarifyLoading}
                                  rows={3}
                                  style={{
                                    width: '100%', boxSizing: 'border-box',
                                    background: 'var(--ink-muted)',
                                    border: '1px solid var(--ink-border)',
                                    borderRadius: '8px', padding: '12px 14px',
                                    fontFamily: 'var(--font-geist), sans-serif',
                                    fontSize: '14px', color: 'var(--chrome)',
                                    resize: 'vertical', outline: 'none',
                                    opacity: clarifyLoading ? 0.5 : 1,
                                  }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                  <button
                                    onClick={sendProposalClarification}
                                    disabled={clarifyLoading || !clarifyText.trim()}
                                    style={{
                                      padding: '10px 22px',
                                      background: clarifyLoading || !clarifyText.trim() ? 'var(--ink-muted)' : 'var(--signal-blue)',
                                      color: clarifyLoading || !clarifyText.trim() ? 'var(--chrome-dim)' : '#fff',
                                      border: 'none', borderRadius: '7px',
                                      fontFamily: 'var(--font-geist), sans-serif',
                                      fontSize: '13px', fontWeight: 700,
                                      cursor: clarifyLoading || !clarifyText.trim() ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    {clarifyLoading ? 'Updating...' : 'Update Proposal →'}
                                  </button>
                                </div>
                              </>
                            )}

                            {clarifyLoading && clarifyStreamText && (
                              <div style={{
                                marginTop: '14px',
                                padding: '14px',
                                background: 'rgba(0,140,255,0.04)',
                                border: '1px solid rgba(0,140,255,0.15)',
                                borderRadius: '8px',
                                fontFamily: 'var(--font-geist), sans-serif',
                                fontSize: '13px', color: 'var(--chrome-muted)',
                                lineHeight: 1.7, maxHeight: '200px', overflowY: 'auto',
                              }}>
                                {clarifyStreamText}
                                <span style={{ display: 'inline-block', width: '2px', height: '14px', background: 'var(--signal-blue)', marginLeft: '2px', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                              </div>
                            )}

                            {clarifyDone && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <span style={{
                                  fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
                                  color: 'var(--acid)', letterSpacing: '0.05em',
                                }}>
                                  ✓ PROPOSAL UPDATED
                                </span>
                                <button
                                  onClick={() => { setClarifyDone(false); setClarifyStreamText(''); setClarifyOpen(false); }}
                                  style={{
                                    padding: '6px 14px', background: 'transparent',
                                    border: '1px solid var(--ink-border)', borderRadius: '6px',
                                    fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
                                    color: 'var(--chrome-dim)', cursor: 'pointer',
                                  }}
                                >
                                  Close
                                </button>
                              </div>
                            )}

                            {clarifyError && (
                              <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--signal-red)', marginTop: '10px' }}>
                                {clarifyError}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Proposal actions — status workflow */}
                {proposalDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      marginTop: '24px',
                      padding: '20px 24px',
                      background: 'var(--ink-soft)',
                      border: '1px solid var(--ink-border)',
                      borderRadius: '12px',
                    }}
                  >
                    {/* Draft or Rejected → send it */}
                    {(proposal.status === 'draft' || proposal.status === 'rejected') && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.07em', marginBottom: '4px' }}>
                            {proposal.status === 'rejected' ? 'PROPOSAL REVISED — READY TO RESEND' : 'READY TO SEND'}
                          </div>
                          <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', margin: 0 }}>
                            {proposal.status === 'rejected'
                              ? 'Make any final edits above, then mark as sent again.'
                              : 'When you\'ve sent this to the client, mark it here to track the status.'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                          <button
                            onClick={generateProposal}
                            style={{
                              padding: '11px 18px', background: 'transparent',
                              border: '1px solid var(--ink-border)', borderRadius: '8px',
                              fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                              color: 'var(--chrome-muted)', cursor: 'pointer',
                            }}
                          >
                            Regenerate
                          </button>
                          <button
                            onClick={() => updateStatus('sent')}
                            disabled={statusUpdating}
                            style={{
                              padding: '11px 22px', background: 'var(--signal-blue)', color: '#fff',
                              border: 'none', borderRadius: '8px',
                              fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', fontWeight: 700,
                              cursor: statusUpdating ? 'not-allowed' : 'pointer',
                              opacity: statusUpdating ? 0.6 : 1,
                            }}
                          >
                            {statusUpdating ? 'Saving...' : 'Mark as Sent →'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sent → waiting for response */}
                    {proposal.status === 'sent' && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.07em', marginBottom: '12px' }}>
                          WAITING FOR CLIENT RESPONSE
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => updateStatus('accepted')}
                            disabled={statusUpdating}
                            style={{
                              padding: '12px 24px', background: 'rgba(200,255,0,0.1)', color: 'var(--acid)',
                              border: '1px solid rgba(200,255,0,0.3)', borderRadius: '8px',
                              fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', fontWeight: 700,
                              cursor: statusUpdating ? 'not-allowed' : 'pointer', flex: 1,
                            }}
                          >
                            ✓ Client Accepted
                          </button>
                          <button
                            onClick={() => updateStatus('rejected')}
                            disabled={statusUpdating}
                            style={{
                              padding: '12px 24px', background: 'rgba(255,51,85,0.06)', color: 'var(--signal-red)',
                              border: '1px solid rgba(255,51,85,0.2)', borderRadius: '8px',
                              fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', fontWeight: 600,
                              cursor: statusUpdating ? 'not-allowed' : 'pointer', flex: 1,
                            }}
                          >
                            ✗ Client Rejected
                          </button>
                        </div>
                        <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', margin: '10px 0 0', letterSpacing: '0.04em' }}>
                          If rejected, use the clarify panel above to revise, then resend.
                        </p>
                      </div>
                    )}

                    {/* Accepted → proceed to growth review */}
                    {proposal.status === 'accepted' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--acid)', letterSpacing: '0.07em', marginBottom: '4px' }}>
                            ✓ PROPOSAL ACCEPTED
                          </div>
                          <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', margin: 0 }}>
                            {proposal.send_count > 1 ? `Accepted after ${proposal.send_count} sends. ` : 'Accepted on first send. '}
                            Ready to move to the Growth Review.
                          </p>
                        </div>
                        <button
                          onClick={goToMarketing}
                          style={{
                            padding: '12px 24px', background: 'var(--acid)', color: 'var(--ink)',
                            border: 'none', borderRadius: '8px',
                            fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', fontWeight: 700,
                            cursor: 'pointer', flexShrink: 0,
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(200,255,0,0.3)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                        >
                          Step 2 — Growth Review →
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </>
  );
}
