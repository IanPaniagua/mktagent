'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ConfirmModal from '@/components/ConfirmModal';
import { CompanyRecord, CompanyStatus, CompanyData, Strategy, ReportRecord } from '@/lib/types';
import { formatRelativeTime, formatDate } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPausedDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtStrategyDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CompanyStatus, { bg: string; color: string; label: string }> = {
  active:     { bg: 'rgba(200,255,0,0.12)',  color: 'var(--acid)',         label: 'Active'     },
  monitoring: { bg: 'rgba(0,140,255,0.12)',  color: 'var(--signal-blue)',  label: 'Monitoring' },
  completed:  { bg: 'rgba(120,120,130,0.18)', color: 'var(--chrome-muted)', label: 'Completed'  },
  paused:     { bg: 'rgba(60,60,70,0.30)',   color: 'var(--chrome-dim)',   label: 'Paused'     },
};

function StatusBadge({ status }: { status: CompanyStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
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

function StrategyStatusBadge({ status }: { status: Strategy['status'] }) {
  const cfg: Record<Strategy['status'], { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(200,255,0,0.12)',  color: 'var(--acid)',          label: 'Activa'    },
    completed: { bg: 'rgba(68,136,255,0.12)', color: 'var(--signal-blue)',   label: 'Completada' },
    abandoned: { bg: 'rgba(120,120,130,0.18)', color: 'var(--chrome-muted)', label: 'Abandonada' },
  };
  const c = cfg[status];
  return (
    <span style={{
      fontFamily: 'var(--font-dm-mono), monospace',
      fontSize: '9px',
      letterSpacing: '0.06em',
      padding: '2px 7px',
      borderRadius: '100px',
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.color}40`,
      whiteSpace: 'nowrap',
    }}>
      {c.label.toUpperCase()}
    </span>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--ink-soft)',
      border: '1px solid var(--ink-border)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {[120, 80, 60, 100, 40].map((w, i) => (
        <div
          key={i}
          className="skeleton-pulse"
          style={{
            height: i === 0 ? '24px' : '14px',
            width: `${w}%`,
            maxWidth: `${w * 2.5}px`,
            borderRadius: '6px',
            background: 'var(--ink-muted)',
          }}
        />
      ))}
    </div>
  );
}

// ─── History accordion ─────────────────────────────────────────────────────────

function HistoryAccordion({
  companyId,
  open,
}: {
  companyId: string;
  open: boolean;
}) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/companies/${companyId}/strategies`).then(r => r.json()),
      fetch(`/api/companies/${companyId}/reports`).then(r => r.json()),
    ]).then(([sData, rData]) => {
      setStrategies(sData.strategies ?? []);
      setReports(rData.reports ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, companyId]);

  type TimelineItem =
    | { kind: 'strategy'; data: Strategy; ts: string }
    | { kind: 'report'; data: ReportRecord; ts: string };

  const items: TimelineItem[] = [
    ...strategies.map(s => ({ kind: 'strategy' as const, data: s, ts: s.started_at })),
    ...reports.map(r => ({ kind: 'report' as const, data: r, ts: r.created_at })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{
            borderTop: '1px solid var(--ink-border)',
            padding: '16px 0 4px',
            marginTop: '16px',
          }}>
            <p style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '10px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.08em',
              marginBottom: '12px',
            }}>
              HISTORIAL
            </p>

            {loading && (
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
              }}>
                Cargando…
              </p>
            )}

            {!loading && items.length === 0 && (
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
              }}>
                Sin historial aún.
              </p>
            )}

            {!loading && items.length > 0 && (
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                {/* Vertical line */}
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '6px',
                  bottom: '6px',
                  width: '1px',
                  background: 'rgba(200,255,0,0.2)',
                }} />

                {items.map((item, idx) => (
                  <div key={`${item.kind}-${idx}`} style={{ position: 'relative', marginBottom: '14px' }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-17px',
                      top: '5px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: item.kind === 'strategy' ? 'var(--acid)' : 'var(--chrome-dim)',
                      border: '1px solid var(--ink-border)',
                    }} />

                    {item.kind === 'strategy' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-dm-mono), monospace',
                            fontSize: '12px',
                            color: 'var(--chrome-muted)',
                          }}>
                            {item.data.name}
                          </span>
                          <StrategyStatusBadge status={item.data.status} />
                          <span style={{
                            fontFamily: 'var(--font-dm-mono), monospace',
                            fontSize: '10px',
                            color: 'var(--chrome-dim)',
                          }}>
                            {fmtStrategyDate(item.data.started_at)}
                            {item.data.completed_at && ` → ${fmtStrategyDate(item.data.completed_at)}`}
                          </span>
                        </div>
                        {item.data.results && (
                          <p style={{
                            fontFamily: 'var(--font-geist), sans-serif',
                            fontSize: '11px',
                            color: 'var(--chrome-dim)',
                            marginTop: '3px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '320px',
                          }}>
                            {item.data.results}
                          </p>
                        )}
                      </div>
                    )}

                    {item.kind === 'report' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontFamily: 'var(--font-dm-mono), monospace',
                          fontSize: '10px',
                          color: 'var(--chrome-dim)',
                          letterSpacing: '0.04em',
                        }}>
                          REPORTE · {fmtStrategyDate(item.data.created_at)}
                        </span>
                        {item.data.total_cost != null && (
                          <span style={{
                            fontFamily: 'var(--font-dm-mono), monospace',
                            fontSize: '10px',
                            color: 'var(--chrome-dim)',
                          }}>
                            ${Number(item.data.total_cost).toFixed(4)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Strategy bar (active strategy on card) ────────────────────────────────────

function ActiveStrategyBar({
  strategy,
  onComplete,
  onAbandon,
}: {
  strategy: Strategy;
  onComplete: () => void;
  onAbandon: () => void;
}) {
  return (
    <div style={{
      marginTop: '12px',
      padding: '8px 12px',
      background: 'rgba(200,255,0,0.05)',
      border: '1px solid rgba(200,255,0,0.15)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--acid)', flexShrink: 0 }} />
      <span style={{
        fontFamily: 'var(--font-dm-mono), monospace',
        fontSize: '11px',
        color: 'var(--chrome-dim)',
      }}>
        Estrategia activa:
      </span>
      <span style={{
        fontFamily: 'var(--font-dm-mono), monospace',
        fontSize: '11px',
        color: 'var(--acid)',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {strategy.name}
      </span>
      <span style={{
        fontFamily: 'var(--font-dm-mono), monospace',
        fontSize: '10px',
        color: 'var(--chrome-dim)',
      }}>
        desde el {fmtStrategyDate(strategy.started_at)}
      </span>
      <button
        onClick={onComplete}
        title="Completar estrategia"
        style={{
          padding: '2px 8px',
          background: 'transparent',
          border: '1px solid rgba(200,255,0,0.3)',
          borderRadius: '4px',
          color: 'var(--acid)',
          fontFamily: 'var(--font-dm-mono), monospace',
          fontSize: '10px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,255,0,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        ✓ Completar
      </button>
      <button
        onClick={onAbandon}
        title="Abandonar estrategia"
        style={{
          padding: '2px 8px',
          background: 'transparent',
          border: '1px solid rgba(255,51,85,0.3)',
          borderRadius: '4px',
          color: 'rgba(255,51,85,0.7)',
          fontFamily: 'var(--font-dm-mono), monospace',
          fontSize: '10px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,51,85,0.08)';
          e.currentTarget.style.color = 'rgb(255,51,85)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,51,85,0.7)';
        }}
      >
        ✕ Abandonar
      </button>
    </div>
  );
}

// ─── Three-dot menu ────────────────────────────────────────────────────────────

function CompanyMenu({
  company,
  onStatusChange,
  onPauseRequest,
  onDelete,
}: {
  company: CompanyRecord;
  onStatusChange: (id: string, status: CompanyStatus) => void;
  onPauseRequest: (company: CompanyRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const statuses: CompanyStatus[] = ['active', 'monitoring', 'completed', 'paused'];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          padding: '6px 10px',
          background: 'transparent',
          border: '1px solid var(--ink-border)',
          borderRadius: '6px',
          color: 'var(--chrome-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-dm-mono), monospace',
          fontSize: '13px',
          lineHeight: 1,
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
          (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
        }}
        aria-label="More options"
      >
        ···
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              zIndex: 50,
              background: 'var(--ink-soft)',
              border: '1px solid var(--ink-border)',
              borderRadius: '10px',
              padding: '8px',
              minWidth: '160px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <p style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '10px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.06em',
              padding: '4px 8px 8px',
            }}>
              SET STATUS
            </p>
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => {
                  if (s === 'paused') {
                    onPauseRequest(company);
                  } else {
                    onStatusChange(company.id, s);
                  }
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  background: company.status === s ? 'var(--ink-muted)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = company.status === s ? 'var(--ink-muted)' : 'transparent')}
              >
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: STATUS_CONFIG[s].color, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '12px',
                  color: 'var(--chrome-muted)',
                }}>
                  {STATUS_CONFIG[s].label}
                </span>
              </button>
            ))}
            <div style={{ height: '1px', background: 'var(--ink-border)', margin: '8px 0' }} />
            <button
              onClick={() => { onDelete(company.id); setOpen(false); }}
              style={{
                width: '100%',
                padding: '7px 8px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '12px',
                color: 'rgba(255,60,80,0.7)',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget.style.color = 'rgb(255,60,80)');
                (e.currentTarget.style.background = 'rgba(255,60,80,0.08)');
              }}
              onMouseLeave={e => {
                (e.currentTarget.style.color = 'rgba(255,60,80,0.7)');
                (e.currentTarget.style.background = 'transparent');
              }}
            >
              Delete company
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pause modal
  const [pauseTarget, setPauseTarget] = useState<CompanyRecord | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseLoading, setPauseLoading] = useState(false);

  // Strategy complete/abandon modal
  const [strategyModal, setStrategyModal] = useState<{
    strategy: Strategy;
    companyId: string;
    mode: 'complete' | 'abandon';
  } | null>(null);
  const [strategyResult, setStrategyResult] = useState('');
  const [strategyLoading, setStrategyLoading] = useState(false);

  // History accordion state (keyed by company id)
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error(`Failed to load companies: ${res.status}`);
      const { companies: data } = await res.json();
      setCompanies(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: CompanyStatus) {
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch (err) {
      console.error('[MKTAGENT] Status update failed:', err);
    }
  }

  function handlePauseRequest(company: CompanyRecord) {
    setPauseTarget(company);
    setPauseReason('');
  }

  async function handlePauseConfirm() {
    if (!pauseTarget) return;
    setPauseLoading(true);
    try {
      const payload = {
        status: 'paused' as const,
        pause_reason: pauseReason,
        paused_at: new Date().toISOString(),
      };
      const res = await fetch(`/api/companies/${pauseTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to pause');
      const { company: updated } = await res.json();
      setCompanies(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      setPauseTarget(null);
    } catch (err) {
      console.error('[MKTAGENT] Pause failed:', err);
    } finally {
      setPauseLoading(false);
    }
  }

  async function handleStrategyAction(results: string) {
    if (!strategyModal) return;
    setStrategyLoading(true);
    const { strategy, companyId, mode } = strategyModal;
    try {
      const res = await fetch(`/api/strategies/${strategy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: mode === 'complete' ? 'completed' : 'abandoned',
          results,
          completed_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to update strategy');
      // Remove active_strategy from company locally
      setCompanies(prev => prev.map(c =>
        c.id === companyId ? { ...c, active_strategy: undefined } : c
      ));
      setStrategyModal(null);
      setStrategyResult('');
    } catch (err) {
      console.error('[MKTAGENT] Strategy update failed:', err);
    } finally {
      setStrategyLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this company and all its reports? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('[MKTAGENT] Delete failed:', err);
    }
  }

  function handleReanalyze(company: CompanyRecord) {
    const companyData: CompanyData = {
      name: company.name,
      industry: company.industry,
      description: company.description,
      stage: company.stage,
      mrr: company.mrr,
      budget: company.budget,
      teamSize: company.team_size,
      primaryGoal: company.primary_goal,
      landingPageUrl: company.landing_page_url,
      githubUrl: company.github_url,
      competitors: company.competitors ?? [],
      targetAudience: company.target_audience,
      painPoints: company.pain_points,
      differentiation: company.differentiation,
    };
    sessionStorage.setItem('mktagent_company', JSON.stringify(companyData));
    sessionStorage.setItem('mktagent_company_id', company.id);
    sessionStorage.removeItem('mktagent_results');
    sessionStorage.removeItem('mktagent_usage');
    router.push('/analyzing');
  }

  function handleViewReport(company: CompanyRecord) {
    const companyData: CompanyData = {
      name: company.name,
      industry: company.industry,
      description: company.description,
      stage: company.stage,
      mrr: company.mrr,
      budget: company.budget,
      teamSize: company.team_size,
      primaryGoal: company.primary_goal,
      landingPageUrl: company.landing_page_url,
      githubUrl: company.github_url,
      competitors: company.competitors ?? [],
      targetAudience: company.target_audience,
      painPoints: company.pain_points,
      differentiation: company.differentiation,
    };
    sessionStorage.setItem('mktagent_company', JSON.stringify(companyData));
    sessionStorage.setItem('mktagent_company_id', company.id);

    if (company.latest_report) {
      const r = company.latest_report;
      sessionStorage.setItem('mktagent_results', JSON.stringify({
        executiveSummary: r.executive_summary,
        companyAnalysis: r.company_analysis,
        userResearch: r.user_research,
        competitorAnalysis: r.competitor_analysis,
        marketingStrategy: r.marketing_strategy,
        budgetAllocation: r.budget_allocation,
      }));
      if (r.id) sessionStorage.setItem('mktagent_report_id', r.id);
    } else {
      sessionStorage.removeItem('mktagent_results');
    }
    router.push('/results');
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const totalReports = companies.reduce((sum, c) => sum + (c.report_count ?? 0), 0);
  const totalCost = companies.reduce((sum, c) => {
    const cost = c.latest_report?.total_cost ?? 0;
    return sum + Number(cost);
  }, 0);

  const stats = [
    { label: 'Total Companies', value: String(totalCompanies) },
    { label: 'Active', value: String(activeCompanies) },
    { label: 'Reports Generated', value: String(totalReports) },
    { label: 'Total Cost', value: `$${totalCost.toFixed(2)}` },
  ];

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        paddingTop: '80px',
        paddingBottom: '60px',
        padding: '80px 32px 60px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '40px' }}
          >
            <h1 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '40px',
              color: 'var(--chrome)',
              fontWeight: 400,
              marginBottom: '8px',
            }}>
              Dashboard
            </h1>
            <p style={{
              fontFamily: 'var(--font-geist), sans-serif',
              fontSize: '14px',
              color: 'var(--chrome-muted)',
            }}>
              Your portfolio of companies under analysis
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'var(--ink-soft)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '24px',
                  color: 'var(--acid)',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}>
                  {loading ? '—' : stat.value}
                </p>
                <p style={{
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '12px',
                  color: 'var(--chrome-dim)',
                }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Error state */}
          {error && (
            <div style={{
              padding: '20px 24px',
              background: 'rgba(255,51,85,0.08)',
              border: '1px solid rgba(255,51,85,0.3)',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <p style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                color: 'var(--signal-red)',
                fontSize: '13px',
              }}>
                ⚠ {error}
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && companies.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '20px',
                padding: '64px 40px',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'var(--ink-muted)', border: '1px solid var(--ink-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: '24px',
              }}>
                📊
              </div>
              <h2 style={{
                fontFamily: 'var(--font-dm-serif), serif',
                fontSize: '24px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '8px',
              }}>
                No companies yet
              </h2>
              <p style={{
                fontFamily: 'var(--font-geist), sans-serif',
                fontSize: '14px', color: 'var(--chrome-muted)', marginBottom: '28px',
              }}>
                Run your first analysis to start tracking companies here.
              </p>
              <Link
                href="/company"
                style={{
                  display: 'inline-block', padding: '12px 28px', background: 'var(--acid)',
                  color: 'var(--ink)', borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', fontWeight: 700,
                  textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 32px rgba(200,255,0,0.25)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                Run your first analysis →
              </Link>
            </motion.div>
          )}

          {/* Company grid */}
          {!loading && !error && companies.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}
            >
              {companies.map((company, i) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  style={{
                    background: 'var(--ink-soft)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,255,0,0.2)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)')}
                >
                  {/* Top row: name + status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <h2 style={{
                      fontFamily: 'var(--font-dm-serif), serif',
                      fontSize: '20px', color: 'var(--chrome)', fontWeight: 400, lineHeight: 1.2,
                    }}>
                      {company.name}
                    </h2>
                    <StatusBadge status={company.status} />
                  </div>

                  {/* Pause info */}
                  {company.status === 'paused' && company.pause_reason && (
                    <p style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '11px',
                      color: 'var(--chrome-muted)',
                      fontStyle: 'italic',
                      marginBottom: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {company.pause_reason}
                    </p>
                  )}
                  {company.status === 'paused' && company.paused_at && (
                    <p style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '10px',
                      color: 'var(--chrome-dim)',
                      marginBottom: '8px',
                    }}>
                      Pausado el {fmtPausedDate(company.paused_at)}
                    </p>
                  )}

                  {/* Tags: industry + stage */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[company.industry, company.stage].filter(Boolean).map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontFamily: 'var(--font-dm-mono), monospace',
                          fontSize: '10px', color: 'var(--chrome-dim)',
                          background: 'var(--ink-muted)', border: '1px solid var(--ink-border)',
                          padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.04em',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Landing page URL */}
                  {company.landing_page_url && (
                    <p style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '11px', color: 'var(--chrome-dim)', marginBottom: '16px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {company.landing_page_url}
                    </p>
                  )}

                  {/* Meta row: last analyzed + report count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    {company.last_analyzed_at ? (
                      <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                        Last analyzed {formatRelativeTime(company.last_analyzed_at)}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                        Never analyzed
                      </span>
                    )}
                    {(company.report_count ?? 0) > 0 && (
                      <>
                        <span style={{ color: 'var(--ink-border)', fontSize: '10px' }}>·</span>
                        <span style={{
                          fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
                          color: 'var(--acid)', background: 'rgba(200,255,0,0.08)',
                          border: '1px solid rgba(200,255,0,0.2)', padding: '2px 8px', borderRadius: '100px',
                        }}>
                          {company.report_count} report{(company.report_count ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Quick stats from latest report */}
                  {company.latest_report && (
                    <div style={{
                      display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px',
                      padding: '10px 12px', background: 'var(--ink-muted)',
                      border: '1px solid var(--ink-border)', borderRadius: '8px',
                    }}>
                      {[
                        { label: 'Budget', value: company.budget },
                        { label: 'MRR', value: company.mrr },
                        { label: 'Goal', value: company.primary_goal },
                      ].filter(s => s.value).map((stat) => (
                        <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <span style={{
                            fontFamily: 'var(--font-dm-mono), monospace', fontSize: '9px',
                            color: 'var(--chrome-dim)', letterSpacing: '0.06em',
                          }}>
                            {stat.label.toUpperCase()}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
                            color: 'var(--chrome-muted)', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px',
                          }}>
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active strategy bar */}
                  {company.active_strategy && (
                    <ActiveStrategyBar
                      strategy={company.active_strategy}
                      onComplete={() => {
                        setStrategyResult('');
                        setStrategyModal({ strategy: company.active_strategy!, companyId: company.id, mode: 'complete' });
                      }}
                      onAbandon={() => {
                        setStrategyResult('');
                        setStrategyModal({ strategy: company.active_strategy!, companyId: company.id, mode: 'abandon' });
                      }}
                    />
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                    {company.latest_report ? (
                      <button
                        onClick={() => handleViewReport(company)}
                        style={{
                          flex: 1, padding: '9px 16px', background: 'var(--acid)',
                          color: 'var(--ink)', border: 'none', borderRadius: '7px',
                          fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                          fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                      >
                        View Report
                      </button>
                    ) : (
                      <div style={{ flex: 1 }} />
                    )}
                    <button
                      onClick={() => handleReanalyze(company)}
                      style={{
                        flex: company.latest_report ? 'none' : 1,
                        padding: '9px 16px', background: 'transparent',
                        color: 'var(--chrome-muted)', border: '1px solid var(--ink-border)',
                        borderRadius: '7px', fontFamily: 'var(--font-geist), sans-serif',
                        fontSize: '13px', cursor: 'pointer',
                        transition: 'border-color 0.2s, color 0.2s', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--acid)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
                      }}
                    >
                      Re-analyze
                    </button>

                    {/* Ver historial */}
                    <button
                      onClick={() => setOpenHistory(prev => ({ ...prev, [company.id]: !prev[company.id] }))}
                      style={{
                        padding: '9px 12px', background: 'transparent',
                        color: openHistory[company.id] ? 'var(--chrome)' : 'var(--chrome-dim)',
                        border: '1px solid var(--ink-border)', borderRadius: '7px',
                        fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px',
                        cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
                        letterSpacing: '0.04em', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
                        (e.currentTarget as HTMLElement).style.color = openHistory[company.id] ? 'var(--chrome)' : 'var(--chrome-dim)';
                      }}
                    >
                      {openHistory[company.id] ? '↑ Historial' : '↓ Historial'}
                    </button>

                    <CompanyMenu
                      company={company}
                      onStatusChange={handleStatusChange}
                      onPauseRequest={handlePauseRequest}
                      onDelete={handleDelete}
                    />
                  </div>

                  {/* History accordion */}
                  <HistoryAccordion
                    companyId={company.id}
                    open={!!openHistory[company.id]}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      {/* ── Pause modal ── */}
      <ConfirmModal
        isOpen={!!pauseTarget}
        title="Pausar proyecto"
        subtitle={pauseTarget?.name}
        confirmLabel="Confirmar pausa"
        confirmStyle="amber"
        onConfirm={handlePauseConfirm}
        onCancel={() => setPauseTarget(null)}
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

      {/* ── Strategy complete/abandon modal ── */}
      <ConfirmModal
        isOpen={!!strategyModal}
        title={strategyModal?.mode === 'complete' ? '✓ Completar estrategia' : '✕ Abandonar estrategia'}
        subtitle={strategyModal?.strategy.name}
        confirmLabel={strategyModal?.mode === 'complete' ? 'Confirmar completado' : 'Confirmar abandono'}
        confirmStyle={strategyModal?.mode === 'complete' ? 'acid' : 'red'}
        onConfirm={() => handleStrategyAction(strategyResult)}
        onCancel={() => { setStrategyModal(null); setStrategyResult(''); }}
        isLoading={strategyLoading}
      >
        <textarea
          value={strategyResult}
          onChange={e => setStrategyResult(e.target.value)}
          placeholder={
            strategyModal?.mode === 'complete'
              ? '¿Cuáles fueron los resultados?'
              : '¿Por qué abandonas esta estrategia?'
          }
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--ink-muted)',
            border: '1px solid var(--ink-border)',
            borderRadius: '10px',
            padding: '12px 14px',
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
      </ConfirmModal>

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
