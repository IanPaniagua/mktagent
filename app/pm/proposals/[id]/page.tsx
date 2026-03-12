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

  function generatePlan() {
    setPlanText('');
    setPlanStreaming(true);
    setPlanDone(false);

    const es = new EventSource(`/api/pm-proposals/${proposalId}/generate-plan`, { withCredentials: false });
    // EventSource only supports GET — use fetch with SSE instead
    es.close();

    fetch(`/api/pm-proposals/${proposalId}/generate-plan`, { method: 'POST' })
      .then(async res => {
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
              if (msg.type === 'chunk') setPlanText(prev => prev + msg.content);
              if (msg.type === 'complete') {
                setPlanDone(true);
                setPlanStreaming(false);
                if (msg.suggestedPrice) { setSuggestedPrice(msg.suggestedPrice); setEditedPrice(msg.suggestedPrice); }
                if (msg.execMin) setExecMin(msg.execMin);
                if (msg.execMax) setExecMax(msg.execMax);
              }
              if (msg.type === 'error') setPlanStreaming(false);
            } catch { /* skip */ }
          }
        }
        setPlanStreaming(false);
      })
      .catch(() => setPlanStreaming(false));
  }

  function generateProposal() {
    if (!proposal) return;
    setProposalText('');
    setProposalStreaming(true);
    setProposalDone(false);
    setPhase('proposal');

    fetch(`/api/pm-proposals/${proposalId}/generate-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedPrice: editedPrice || suggestedPrice || 0,
        currency: proposal.currency ?? 'EUR',
      }),
    }).then(async res => {
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
            if (msg.type === 'chunk') setProposalText(prev => prev + msg.content);
            if (msg.type === 'complete') { setProposalDone(true); setProposalStreaming(false); }
            if (msg.type === 'error') setProposalStreaming(false);
          } catch { /* skip */ }
        }
      }
      setProposalStreaming(false);
    }).catch(() => setProposalStreaming(false));
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

              {/* Status actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {proposal.status === 'draft' && proposalDone && (
                  <button
                    onClick={() => updateStatus('sent')}
                    disabled={statusUpdating}
                    style={{
                      padding: '10px 20px', background: 'rgba(0,140,255,0.12)', color: 'var(--signal-blue)',
                      border: '1px solid rgba(0,140,255,0.3)', borderRadius: '8px',
                      fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', transition: 'background 0.2s',
                    }}
                  >
                    Mark as Sent
                  </button>
                )}
                {proposal.status === 'sent' && (
                  <>
                    <button
                      onClick={() => updateStatus('accepted')}
                      disabled={statusUpdating}
                      style={{
                        padding: '10px 20px', background: 'rgba(200,255,0,0.1)', color: 'var(--acid)',
                        border: '1px solid rgba(200,255,0,0.3)', borderRadius: '8px',
                        fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Accepted
                    </button>
                    <button
                      onClick={() => updateStatus('rejected')}
                      disabled={statusUpdating}
                      style={{
                        padding: '10px 20px', background: 'rgba(255,51,85,0.08)', color: 'var(--signal-red)',
                        border: '1px solid rgba(255,51,85,0.2)', borderRadius: '8px',
                        fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Rejected
                    </button>
                  </>
                )}
              </div>
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

                {(planStreaming || planText) && (
                  <div style={{
                    background: 'var(--ink-soft)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '12px',
                    padding: '32px',
                    minHeight: '400px',
                  }}>
                    {planStreaming && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--ink-border)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--signal-blue)', animation: 'pulse 1s infinite' }} />
                        <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--signal-blue)', letterSpacing: '0.08em' }}>
                          PMCORE GENERATING ACTION PLAN...
                        </span>
                      </div>
                    )}
                    <div className="markdown-content" style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.8 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{planText}</ReactMarkdown>
                    </div>
                  </div>
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
                              onChange={e => setEditedPrice(Number(e.target.value))}
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
                <div style={{
                  background: 'var(--ink-soft)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '12px',
                  padding: '32px',
                  minHeight: '400px',
                }}>
                  {proposalStreaming && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--ink-border)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--signal-blue)', animation: 'pulse 1s infinite' }} />
                      <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--signal-blue)', letterSpacing: '0.08em' }}>
                        WRITING CLIENT PROPOSAL...
                      </span>
                    </div>
                  )}

                  {!proposalText && !proposalStreaming && (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
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

                  {proposalText && (
                    <div className="markdown-content" style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '15px', color: 'var(--chrome-muted)', lineHeight: 1.9 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposalText}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Proposal actions */}
                {proposalDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      marginTop: '24px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                    }}
                  >
                    {/* Regenerate */}
                    <button
                      onClick={generateProposal}
                      style={{
                        padding: '14px 20px',
                        background: 'transparent',
                        border: '1px solid var(--ink-border)',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-geist), sans-serif',
                        fontSize: '14px',
                        color: 'var(--chrome-muted)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, color 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)'; (e.currentTarget as HTMLElement).style.color = 'var(--chrome)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)'; }}
                    >
                      Regenerate Proposal
                    </button>

                    {/* Proceed to marketing */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button
                        onClick={goToMarketing}
                        style={{
                          padding: '14px 20px',
                          background: 'var(--acid)',
                          color: 'var(--ink)',
                          border: 'none',
                          borderRadius: '8px',
                          fontFamily: 'var(--font-geist), sans-serif',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(200,255,0,0.25)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                      >
                        Client Accepted → Launch Marketing Analysis
                      </button>
                      <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', textAlign: 'center', margin: 0 }}>
                        PM Brief context will be injected into the marketing analysis automatically.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Skip warning */}
                {proposalDone && (
                  <div style={{
                    marginTop: '16px',
                    padding: '14px 18px',
                    background: 'rgba(255,153,0,0.05)',
                    border: '1px solid rgba(255,153,0,0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}>
                    <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'rgba(255,153,0,0.8)', margin: 0 }}>
                      ⚠️ Client wants to skip PM work and go straight to marketing? They can, but results will be limited.
                    </p>
                    <button
                      onClick={goToMarketing}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid rgba(255,153,0,0.3)',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-dm-mono), monospace',
                        fontSize: '11px',
                        color: 'rgba(255,153,0,0.8)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Skip PM → Go to Marketing
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </>
  );
}
