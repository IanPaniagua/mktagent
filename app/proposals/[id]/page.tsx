'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ConfirmModal from '@/components/ConfirmModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Proposal, ProposalStatus, KPI, KPIActual } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, { bg: string; color: string; label: string }> = {
  draft:    { bg: 'rgba(120,120,130,0.18)', color: 'var(--chrome-muted)', label: 'Draft'    },
  sent:     { bg: 'rgba(0,140,255,0.12)',  color: 'var(--signal-blue)',  label: 'Sent'     },
  accepted: { bg: 'rgba(200,255,0,0.12)',  color: 'var(--acid)',         label: 'Accepted' },
  rejected: { bg: 'rgba(255,51,85,0.12)', color: 'var(--signal-red)',   label: 'Rejected' },
  closed:   { bg: 'rgba(120,120,130,0.18)', color: 'var(--chrome-dim)', label: 'Closed'   },
};

function StatusBadge({ status }: { status: ProposalStatus }) {
  const cfg = PROPOSAL_STATUS_CONFIG[status] ?? PROPOSAL_STATUS_CONFIG.draft;
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

// ─── Timeline ─────────────────────────────────────────────────────────────────

function StatusTimeline({ proposal }: { proposal: Proposal }) {
  const stages: { status: ProposalStatus; label: string; date?: string }[] = [
    { status: 'draft',    label: 'Draft',    date: proposal.created_at },
    { status: 'sent',     label: 'Sent',     date: proposal.sent_at },
    { status: 'accepted', label: 'Accepted', date: proposal.accepted_at },
    { status: 'closed',   label: 'Closed',   date: proposal.closed_at },
  ];

  const ORDER: ProposalStatus[] = ['draft', 'sent', 'accepted', 'closed'];
  const currentIdx = ORDER.indexOf(proposal.status === 'rejected' ? 'sent' : proposal.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {stages.map((stage, i) => {
        const isActive = stage.status === proposal.status;
        const isPast = i < currentIdx;
        const isFuture = i > currentIdx;
        const cfg = PROPOSAL_STATUS_CONFIG[stage.status];
        return (
          <div key={stage.status} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingBottom: i < stages.length - 1 ? '16px' : '0', position: 'relative' }}>
            {/* Vertical line */}
            {i < stages.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '6px',
                top: '14px',
                bottom: '0',
                width: '1px',
                background: isPast || isActive ? cfg.color + '40' : 'var(--ink-border)',
              }} />
            )}
            {/* Dot */}
            <div style={{
              width: '13px',
              height: '13px',
              borderRadius: '50%',
              flexShrink: 0,
              marginTop: '2px',
              background: isActive ? cfg.color : isPast ? 'rgba(200,255,0,0.3)' : 'var(--ink-muted)',
              border: `1px solid ${isActive ? cfg.color : isPast ? 'rgba(200,255,0,0.3)' : 'var(--ink-border)'}`,
            }} />
            <div>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: isActive ? cfg.color : isFuture ? 'var(--chrome-dim)' : 'var(--chrome-muted)',
                letterSpacing: '0.04em',
              }}>
                {stage.label}
              </span>
              {stage.date && (
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '10px',
                  color: 'var(--chrome-dim)',
                  margin: 0,
                }}>
                  {fmtDate(stage.date)}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {proposal.status === 'rejected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '-8px' }}>
          <div style={{
            width: '13px', height: '13px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,51,85,0.3)',
            border: '1px solid rgba(255,51,85,0.5)',
          }} />
          <span style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: '11px',
            color: 'var(--signal-red)',
            letterSpacing: '0.04em',
          }}>
            REJECTED
          </span>
        </div>
      )}
    </div>
  );
}

// ─── KPI tag ──────────────────────────────────────────────────────────────────

function KpiTag({ kpi, onDelete }: { kpi: KPI; onDelete: () => void }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: 'rgba(200,255,0,0.08)',
      border: '1px solid rgba(200,255,0,0.2)',
      borderRadius: '100px',
      fontFamily: 'var(--font-dm-mono), monospace',
      fontSize: '11px',
      color: 'var(--chrome-muted)',
    }}>
      <span style={{ color: 'var(--acid)' }}>{kpi.name}</span>
      <span>: {kpi.target} {kpi.unit}</span>
      <button
        onClick={onDelete}
        style={{
          background: 'none',
          border: 'none',
          padding: '0 0 0 2px',
          cursor: 'pointer',
          color: 'var(--chrome-dim)',
          fontSize: '12px',
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--signal-red)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--chrome-dim)')}
      >
        ×
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit price
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  // Actual price (when accepted/closing)
  const [actualPriceInput, setActualPriceInput] = useState('');

  // KPIs
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [newKpiName, setNewKpiName] = useState('');
  const [newKpiTarget, setNewKpiTarget] = useState('');
  const [newKpiUnit, setNewKpiUnit] = useState('');
  const [savingKpis, setSavingKpis] = useState(false);
  const [showKpiForm, setShowKpiForm] = useState(false);
  const [suggestingKpis, setSuggestingKpis] = useState(false);

  // KPI actuals (for close modal)
  const [kpiActuals, setKpiActuals] = useState<KPIActual[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Action modals
  const [actionLoading, setActionLoading] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeActualPrice, setCloseActualPrice] = useState('');
  const [closingLoading, setClosingLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/proposals/${id}`);
        if (!res.ok) throw new Error('Proposal not found');
        const { proposal: p } = await res.json();
        setProposal(p);
        setKpis(p.kpis ?? []);
        setActualPriceInput(p.actual_price ? String(p.actual_price) : '');
        setCloseActualPrice(p.proposed_price ? String(p.proposed_price) : '');
        // Initialize kpiActuals from saved data, or scaffold from kpis
        if (p.kpi_actuals?.length) {
          setKpiActuals(p.kpi_actuals);
        } else if (p.kpis?.length) {
          setKpiActuals(p.kpis.map((k: KPI) => ({ name: k.name, target: k.target, unit: k.unit, actual: '', note: '' })));
        }

        // Fetch company name
        const compRes = await fetch(`/api/companies/${p.company_id}`);
        if (compRes.ok) {
          const { company } = await compRes.json();
          setCompanyName(company?.name ?? '');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function updateStatus(status: ProposalStatus) {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const { proposal: updated } = await res.json();
      setProposal(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function savePrice() {
    if (!proposal) return;
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_price: parseFloat(priceInput) }),
      });
      if (!res.ok) throw new Error('Failed');
      const { proposal: updated } = await res.json();
      setProposal(updated);
      setEditingPrice(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPrice(false);
    }
  }

  async function saveKpis() {
    if (!proposal) return;
    setSavingKpis(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpis }),
      });
      if (!res.ok) throw new Error('Failed');
      const { proposal: updated } = await res.json();
      setProposal(updated);
      setKpis(updated.kpis ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingKpis(false);
    }
  }

  function addKpi() {
    if (!newKpiName.trim()) return;
    setKpis(prev => [...prev, { name: newKpiName.trim(), target: newKpiTarget.trim(), unit: newKpiUnit.trim() }]);
    setNewKpiName('');
    setNewKpiTarget('');
    setNewKpiUnit('');
    setShowKpiForm(false);
  }

  async function suggestKpis() {
    if (!proposal) return;
    setSuggestingKpis(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/suggest-kpis`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const { kpis: suggested } = await res.json();
      if (suggested?.length) {
        setKpis(suggested);
        setKpiActuals(suggested.map((k: KPI) => ({ name: k.name, target: k.target, unit: k.unit, actual: '', note: '' })));
        // Auto-save
        await fetch(`/api/proposals/${proposal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kpis: suggested }),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSuggestingKpis(false);
    }
  }

  async function closeProject() {
    if (!proposal) return;
    setClosingLoading(true);
    try {
      // Build a legacy results summary string from actuals for backward compatibility
      const resultsSummary = kpiActuals
        .filter(k => k.actual.trim())
        .map(k => `${k.name}: target ${k.target} ${k.unit} → actual ${k.actual}${k.note ? ` (${k.note})` : ''}`)
        .join('. ');

      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'closed',
          actual_price: parseFloat(closeActualPrice) || undefined,
          kpi_actuals: kpiActuals,
          results: resultsSummary || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to close');
      const { proposal: updated } = await res.json();
      setProposal(updated);

      // Generate the results report
      setGeneratingReport(true);
      try {
        const reportRes = await fetch(`/api/proposals/${proposal.id}/generate-results-report`, { method: 'POST' });
        if (reportRes.ok) {
          const { results_report } = await reportRes.json();
          setProposal(prev => prev ? { ...prev, results_report } : prev);
        }
      } catch (e) {
        console.error('Report generation failed:', e);
      } finally {
        setGeneratingReport(false);
      }

      setCloseModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setClosingLoading(false);
    }
  }

  function downloadResultsReport() {
    if (!proposal?.results_report) return;
    const blob = new Blob([proposal.results_report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${companyName?.replace(/\s+/g, '-').toLowerCase() ?? 'project'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '2px solid var(--ink-border)',
            borderTopColor: 'var(--acid)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </>
    );
  }

  if (error || !proposal) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--signal-red)', fontSize: '14px' }}>
            {error || 'Proposal not found'}
          </p>
          <Link href="/dashboard" style={{ color: 'var(--chrome-muted)', fontSize: '13px' }}>← Back to Dashboard</Link>
        </main>
      </>
    );
  }

  const currencySymbol = proposal.currency === 'EUR' ? '€' : proposal.currency === 'GBP' ? '£' : '$';

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        paddingTop: '56px',
        display: 'flex',
        gap: '0',
      }}>
        {/* ── Proposal content (left) ── */}
        <div style={{ flex: 1, padding: '40px', maxWidth: '820px', overflowY: 'auto' }}>
          {/* Back */}
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '11px',
              color: 'var(--chrome-muted)',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              marginBottom: '32px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--chrome)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)')}
          >
            ← Dashboard
          </Link>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--acid)',
                letterSpacing: '0.1em',
              }}>
                CLIENT PROPOSAL
              </span>
              <StatusBadge status={proposal.status} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '32px',
              color: 'var(--chrome)',
              fontWeight: 400,
              marginBottom: '32px',
            }}>
              {companyName || 'Proposal'}
            </h1>

            {/* Proposal content */}
            {proposal.proposal_content ? (
              <div style={{
                padding: '36px 40px',
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '16px',
              }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '28px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '6px', marginTop: '0' }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '20px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '12px', marginTop: '36px', borderBottom: '1px solid var(--ink-border)', paddingBottom: '10px' }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--acid)', letterSpacing: '0.12em', fontWeight: 500, marginBottom: '10px', marginTop: '24px' }}>{children}</h3>,
                    h4: ({ children }) => <h4 style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-muted)', letterSpacing: '0.08em', fontWeight: 500, marginBottom: '8px', marginTop: '16px' }}>{children}</h4>,
                    p: ({ children }) => <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.8, marginBottom: '14px' }}>{children}</p>,
                    li: ({ children }) => <li style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.75, marginBottom: '6px' }}>{children}</li>,
                    ul: ({ children }) => <ul style={{ paddingLeft: '20px', marginBottom: '14px' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginBottom: '14px' }}>{children}</ol>,
                    strong: ({ children }) => <strong style={{ color: 'var(--chrome)', fontWeight: 600 }}>{children}</strong>,
                    em: ({ children }) => <em style={{ color: 'var(--chrome-muted)', fontStyle: 'italic' }}>{children}</em>,
                    hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--ink-border)', margin: '28px 0' }} />,
                    blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid var(--acid)', paddingLeft: '20px', margin: '20px 0', color: 'var(--chrome-muted)' }}>{children}</blockquote>,
                    table: ({ children }) => <div style={{ overflowX: 'auto', marginBottom: '16px' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>{children}</table></div>,
                    th: ({ children }) => <th style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.08em', padding: '10px 14px', borderBottom: '1px solid var(--ink-border)', textAlign: 'left', background: 'var(--ink-muted)' }}>{children}</th>,
                    td: ({ children }) => <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--ink-border)', color: 'var(--chrome-muted)', fontFamily: 'var(--font-geist), sans-serif', verticalAlign: 'top' }}>{children}</td>,
                    code: ({ children }) => <code style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', background: 'var(--ink-muted)', padding: '2px 6px', borderRadius: '4px', color: 'var(--acid)' }}>{children}</code>,
                  }}
                >
                  {proposal.proposal_content}
                </ReactMarkdown>
              </div>
            ) : proposal.strategy_plan ? (
              <div style={{
                padding: '36px 40px',
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '16px',
              }}>
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-dim)',
                  letterSpacing: '0.06em',
                  marginBottom: '20px',
                }}>
                  STRATEGY PLAN
                </p>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '20px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '12px', marginTop: '28px', borderBottom: '1px solid var(--ink-border)', paddingBottom: '8px' }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--acid)', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '8px', marginTop: '20px' }}>{children}</h3>,
                    p: ({ children }) => <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.8, marginBottom: '12px' }}>{children}</p>,
                    li: ({ children }) => <li style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.7, marginBottom: '6px' }}>{children}</li>,
                    ul: ({ children }) => <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ol>,
                    strong: ({ children }) => <strong style={{ color: 'var(--chrome)', fontWeight: 600 }}>{children}</strong>,
                    hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--ink-border)', margin: '24px 0' }} />,
                    table: ({ children }) => <div style={{ overflowX: 'auto', marginBottom: '16px' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>{children}</table></div>,
                    th: ({ children }) => <th style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.08em', padding: '8px 12px', borderBottom: '1px solid var(--ink-border)', textAlign: 'left' }}>{children}</th>,
                    td: ({ children }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--ink-border)', color: 'var(--chrome-muted)', fontFamily: 'var(--font-geist), sans-serif' }}>{children}</td>,
                  }}
                >
                  {proposal.strategy_plan}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{
                padding: '32px',
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '16px',
                textAlign: 'center',
              }}>
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                  color: 'var(--chrome-dim)',
                }}>
                  No proposal content yet.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Sidebar (right) ── */}
        <div style={{
          width: '300px',
          flexShrink: 0,
          position: 'sticky',
          top: '56px',
          height: 'calc(100vh - 56px)',
          borderLeft: '1px solid var(--ink-border)',
          padding: '32px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* Company + status */}
          <div>
            <p style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '10px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}>
              COMPANY
            </p>
            <h3 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '20px',
              color: 'var(--chrome)',
              fontWeight: 400,
              marginBottom: '12px',
            }}>
              {companyName}
            </h3>
            <StatusTimeline proposal={proposal} />
          </div>

          <div style={{ height: '1px', background: 'var(--ink-border)' }} />

          {/* Price */}
          <div>
            <p style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '10px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}>
              PROPOSED PRICE
            </p>
            {editingPrice ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--acid)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '13px',
                    color: 'var(--chrome)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={savePrice}
                  disabled={savingPrice}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--acid)',
                    color: 'var(--ink)',
                    border: 'none',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditingPrice(false)}
                  style={{
                    padding: '8px 10px',
                    background: 'transparent',
                    color: 'var(--chrome-dim)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setPriceInput(proposal.proposed_price ? String(proposal.proposed_price) : '');
                  setEditingPrice(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '22px',
                  color: proposal.proposed_price ? 'var(--acid)' : 'var(--chrome-dim)',
                  letterSpacing: '-0.02em',
                }}>
                  {proposal.proposed_price
                    ? `${currencySymbol}${Number(proposal.proposed_price).toLocaleString()}`
                    : '— Set price'}
                </span>
                {proposal.proposed_price && (
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    color: 'var(--chrome-dim)',
                    marginLeft: '4px',
                  }}>
                    /mo
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Execution budget estimate */}
          {(proposal.execution_budget_min || proposal.execution_budget_max) && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255,180,0,0.06)',
              border: '1px solid rgba(255,180,0,0.15)',
              borderRadius: '8px',
            }}>
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                color: 'var(--signal-amber)',
                letterSpacing: '0.06em',
                marginBottom: '4px',
              }}>
                CLIENT EXECUTION BUDGET
              </p>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '14px',
                color: 'var(--chrome)',
              }}>
                {currencySymbol}{Number(proposal.execution_budget_min).toLocaleString()}–{currencySymbol}{Number(proposal.execution_budget_max).toLocaleString()}/mo
              </span>
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                color: 'var(--chrome-dim)',
                marginTop: '4px',
                lineHeight: 1.4,
              }}>
                ads · tools · content · freelancers
              </p>
            </div>
          )}

          {/* Actual price (accepted or closed) */}
          {(proposal.status === 'accepted' || proposal.status === 'closed') && (
            <div>
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                color: 'var(--chrome-dim)',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}>
                ACTUAL PRICE
              </p>
              {proposal.status === 'accepted' ? (
                <input
                  type="number"
                  value={actualPriceInput}
                  onChange={e => setActualPriceInput(e.target.value)}
                  placeholder="Enter actual price..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '13px',
                    color: 'var(--chrome)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                />
              ) : (
                <span style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '18px',
                  color: 'var(--chrome-muted)',
                }}>
                  {proposal.actual_price
                    ? `${currencySymbol}${Number(proposal.actual_price).toLocaleString()}`
                    : '—'}
                </span>
              )}
            </div>
          )}

          {/* Days active */}
          {proposal.status === 'accepted' && proposal.accepted_at && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(200,255,0,0.06)',
              border: '1px solid rgba(200,255,0,0.15)',
              borderRadius: '8px',
            }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--acid)',
              }}>
                {daysSince(proposal.accepted_at)} days active
              </span>
            </div>
          )}

          <div style={{ height: '1px', background: 'var(--ink-border)' }} />

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {proposal.status === 'draft' && (
              <button
                onClick={() => updateStatus('sent')}
                disabled={actionLoading}
                style={{
                  padding: '12px 16px',
                  background: 'var(--acid)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                Mark as Sent
              </button>
            )}

            {proposal.status === 'sent' && (
              <>
                <button
                  onClick={() => updateStatus('accepted')}
                  disabled={actionLoading}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--acid)',
                    color: 'var(--ink)',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  Mark as Accepted
                </button>
                <button
                  onClick={() => updateStatus('rejected')}
                  disabled={actionLoading}
                  style={{
                    padding: '12px 16px',
                    background: 'transparent',
                    color: 'var(--signal-red)',
                    border: '1px solid rgba(255,51,85,0.4)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '13px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1,
                    transition: 'opacity 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,51,85,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Mark as Rejected
                </button>
              </>
            )}

            {proposal.status === 'accepted' && (
              <button
                onClick={() => {
                  setCloseActualPrice(proposal.proposed_price ? String(proposal.proposed_price) : '');
                  // Scaffold kpiActuals from current kpis if not already set
                  setKpiActuals(prev => {
                    if (prev.length > 0) return prev;
                    return kpis.map(k => ({ name: k.name, target: k.target, unit: k.unit, actual: '', note: '' }));
                  });
                  setCloseModalOpen(true);
                }}
                style={{
                  padding: '12px 16px',
                  background: 'var(--signal-amber)',
                  color: '#1A1000',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                Close Project
              </button>
            )}
          </div>

          {/* KPIs (shown when accepted or closed) */}
          {(proposal.status === 'accepted' || proposal.status === 'closed') && (
            <>
              <div style={{ height: '1px', background: 'var(--ink-border)' }} />
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <p style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '10px',
                    color: 'var(--chrome-dim)',
                    letterSpacing: '0.06em',
                    marginBottom: '2px',
                  }}>
                    SUCCESS METRICS
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '11px',
                    color: 'var(--chrome-dim)',
                    marginBottom: '10px',
                  }}>
                    What you committed to deliver — track these during the engagement
                  </p>
                  {proposal.status === 'accepted' && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={suggestKpis}
                        disabled={suggestingKpis}
                        style={{
                          padding: '4px 10px',
                          background: suggestingKpis ? 'transparent' : 'rgba(200,255,0,0.08)',
                          border: '1px solid rgba(200,255,0,0.3)',
                          borderRadius: '4px',
                          color: 'var(--acid)',
                          fontFamily: 'var(--font-dm-mono), monospace',
                          fontSize: '10px',
                          cursor: suggestingKpis ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {suggestingKpis ? (
                          <><span style={{ width: '8px', height: '8px', border: '1.5px solid var(--acid)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'modal-spin 0.7s linear infinite' }} /> Suggesting...</>
                        ) : '✦ Suggest from strategy'}
                      </button>
                      <button
                        onClick={() => setShowKpiForm(v => !v)}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          border: '1px solid var(--ink-border)',
                          borderRadius: '4px',
                          color: 'var(--chrome-dim)',
                          fontFamily: 'var(--font-dm-mono), monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        + Add manually
                      </button>
                    </div>
                  )}
                </div>

                {/* KPI form */}
                <AnimatePresence>
                  {showKpiForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', marginBottom: '12px' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--ink-muted)', borderRadius: '8px', border: '1px solid var(--ink-border)' }}>
                        <input
                          type="text"
                          value={newKpiName}
                          onChange={e => setNewKpiName(e.target.value)}
                          placeholder="Metric name (e.g. Organic traffic)"
                          style={{
                            background: 'var(--ink)',
                            border: '1px solid var(--ink-border)',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            fontFamily: 'var(--font-dm-mono), monospace',
                            fontSize: '12px',
                            color: 'var(--chrome)',
                            outline: 'none',
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={newKpiTarget}
                            onChange={e => setNewKpiTarget(e.target.value)}
                            placeholder="Target (e.g. 5000)"
                            style={{
                              flex: 1,
                              background: 'var(--ink)',
                              border: '1px solid var(--ink-border)',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontFamily: 'var(--font-dm-mono), monospace',
                              fontSize: '12px',
                              color: 'var(--chrome)',
                              outline: 'none',
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                          />
                          <input
                            type="text"
                            value={newKpiUnit}
                            onChange={e => setNewKpiUnit(e.target.value)}
                            placeholder="Unit"
                            style={{
                              width: '80px',
                              background: 'var(--ink)',
                              border: '1px solid var(--ink-border)',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontFamily: 'var(--font-dm-mono), monospace',
                              fontSize: '12px',
                              color: 'var(--chrome)',
                              outline: 'none',
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                          />
                        </div>
                        <button
                          onClick={addKpi}
                          disabled={!newKpiName.trim()}
                          style={{
                            padding: '8px',
                            background: newKpiName.trim() ? 'var(--acid)' : 'var(--ink-border)',
                            color: newKpiName.trim() ? 'var(--ink)' : 'var(--chrome-dim)',
                            border: 'none',
                            borderRadius: '6px',
                            fontFamily: 'var(--font-dm-mono), monospace',
                            fontSize: '11px',
                            cursor: newKpiName.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Add KPI
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* KPI list */}
                {kpis.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: proposal.status === 'accepted' ? '10px' : '0' }}>
                    {kpis.map((kpi, i) => (
                      <KpiTag
                        key={i}
                        kpi={kpi}
                        onDelete={() => setKpis(prev => prev.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    color: 'var(--chrome-dim)',
                    marginBottom: '8px',
                  }}>
                    No KPIs yet.
                  </p>
                )}

                {proposal.status === 'accepted' && (
                  <button
                    onClick={saveKpis}
                    disabled={savingKpis}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      border: '1px solid rgba(200,255,0,0.3)',
                      borderRadius: '6px',
                      color: 'var(--acid)',
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '11px',
                      cursor: savingKpis ? 'not-allowed' : 'pointer',
                      opacity: savingKpis ? 0.6 : 1,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,255,0,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {savingKpis ? 'Saving...' : 'Save KPIs'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Results report (shown when closed) */}
          {proposal.status === 'closed' && (
            <>
              <div style={{ height: '1px', background: 'var(--ink-border)' }} />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '10px',
                      color: 'var(--chrome-dim)',
                      letterSpacing: '0.06em',
                      marginBottom: '2px',
                    }}>
                      RESULTS REPORT
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-geist), sans-serif',
                      fontSize: '11px',
                      color: 'var(--chrome-dim)',
                    }}>
                      Generated at project close
                    </p>
                  </div>
                  {proposal.results_report && (
                    <button
                      onClick={downloadResultsReport}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid var(--ink-border)',
                        borderRadius: '6px',
                        color: 'var(--chrome-muted)',
                        fontFamily: 'var(--font-dm-mono), monospace',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, color 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--acid)'; e.currentTarget.style.color = 'var(--acid)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-border)'; e.currentTarget.style.color = 'var(--chrome-muted)'; }}
                    >
                      ↓ Download
                    </button>
                  )}
                </div>
                {generatingReport ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 0' }}>
                    <div style={{
                      width: '16px', height: '16px',
                      border: '2px solid var(--ink-border)',
                      borderTopColor: 'var(--signal-amber)',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                      Generating report...
                    </span>
                  </div>
                ) : proposal.results_report ? (
                  <div style={{
                    padding: '28px 32px',
                    background: 'var(--ink-muted)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '12px',
                  }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '22px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '4px', marginTop: '0' }}>{children}</h1>,
                        h2: ({ children }) => <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '16px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '10px', marginTop: '28px', borderBottom: '1px solid var(--ink-border)', paddingBottom: '8px' }}>{children}</h2>,
                        h3: ({ children }) => <h3 style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--acid)', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '6px', marginTop: '0' }}>{children}</h3>,
                        p: ({ children }) => <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', lineHeight: 1.75, marginBottom: '12px' }}>{children}</p>,
                        li: ({ children }) => <li style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', lineHeight: 1.7, marginBottom: '4px' }}>{children}</li>,
                        ul: ({ children }) => <ul style={{ paddingLeft: '18px', marginBottom: '12px' }}>{children}</ul>,
                        ol: ({ children }) => <ol style={{ paddingLeft: '18px', marginBottom: '12px' }}>{children}</ol>,
                        strong: ({ children }) => <strong style={{ color: 'var(--chrome)', fontWeight: 600 }}>{children}</strong>,
                        em: ({ children }) => <em style={{ color: 'var(--chrome-dim)', fontStyle: 'italic' }}>{children}</em>,
                        hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--ink-border)', margin: '20px 0' }} />,
                        table: ({ children }) => <div style={{ overflowX: 'auto', marginBottom: '14px' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>{children}</table></div>,
                        th: ({ children }) => <th style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', letterSpacing: '0.06em', padding: '8px 10px', borderBottom: '1px solid var(--ink-border)', textAlign: 'left', background: 'var(--ink-soft)' }}>{children}</th>,
                        td: ({ children }) => <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--ink-border)', color: 'var(--chrome-muted)', fontFamily: 'var(--font-geist), sans-serif', verticalAlign: 'top' }}>{children}</td>,
                        code: ({ children }) => <code style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', background: 'var(--ink)', padding: '2px 5px', borderRadius: '3px', color: 'var(--acid)' }}>{children}</code>,
                      }}
                    >
                      {proposal.results_report}
                    </ReactMarkdown>
                  </div>
                ) : proposal.results ? (
                  <p style={{
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '13px',
                    color: 'var(--chrome-muted)',
                    lineHeight: 1.65,
                  }}>
                    {proposal.results}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Close Project Modal ── */}
      <ConfirmModal
        isOpen={closeModalOpen}
        title="How did we do?"
        subtitle={companyName}
        confirmLabel="Close & Generate Report →"
        confirmStyle="amber"
        onConfirm={closeProject}
        onCancel={() => setCloseModalOpen(false)}
        isLoading={closingLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Step A — KPI actuals */}
          {kpis.length > 0 ? (
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
                letterSpacing: '0.06em',
                marginBottom: '10px',
              }}>
                RESULTS VS TARGETS
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {kpiActuals.map((ka, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--ink-muted)',
                      border: '1px solid var(--ink-border)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                      <span style={{
                        fontFamily: 'var(--font-dm-mono), monospace',
                        fontSize: '12px',
                        color: 'var(--acid)',
                        fontWeight: 500,
                      }}>
                        {ka.name}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-dm-mono), monospace',
                        fontSize: '10px',
                        color: 'var(--chrome-dim)',
                      }}>
                        target: {ka.target} {ka.unit}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={ka.actual}
                        onChange={e => setKpiActuals(prev => prev.map((x, idx) => idx === i ? { ...x, actual: e.target.value } : x))}
                        placeholder={`e.g. ${ka.target}`}
                        style={{
                          flex: 1,
                          background: 'var(--ink)',
                          border: '1px solid rgba(245,158,11,0.3)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontFamily: 'var(--font-dm-mono), monospace',
                          fontSize: '12px',
                          color: 'var(--signal-amber)',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--signal-amber)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)')}
                      />
                      <input
                        type="text"
                        value={ka.note ?? ''}
                        onChange={e => setKpiActuals(prev => prev.map((x, idx) => idx === i ? { ...x, note: e.target.value } : x))}
                        placeholder="Note (optional)"
                        style={{
                          width: '140px',
                          background: 'var(--ink)',
                          border: '1px solid var(--ink-border)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontFamily: 'var(--font-dm-mono), monospace',
                          fontSize: '11px',
                          color: 'var(--chrome-dim)',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
                letterSpacing: '0.06em',
                marginBottom: '6px',
              }}>
                RESULTS SUMMARY
              </label>
              <p style={{
                fontFamily: 'var(--font-geist), sans-serif',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
                marginBottom: '8px',
              }}>
                No KPIs were set — add a free-form summary
              </p>
              <textarea
                value={kpiActuals[0]?.note ?? ''}
                onChange={e => setKpiActuals([{ name: 'Summary', target: '', unit: '', actual: e.target.value, note: '' }])}
                placeholder="What happened during the engagement? What results were achieved?"
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--ink-muted)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '8px',
                  padding: '11px 14px',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '12px',
                  color: 'var(--chrome)',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.6,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--signal-amber)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
              />
            </div>
          )}

          {/* Step B — Actual price */}
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '11px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}>
              ACTUAL PRICE CHARGED
            </label>
            <input
              type="number"
              value={closeActualPrice}
              onChange={e => setCloseActualPrice(e.target.value)}
              placeholder="e.g. 2500"
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
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--signal-amber)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
            />
          </div>
        </div>
      </ConfirmModal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
