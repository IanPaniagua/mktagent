'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ReportSection from '@/components/ReportSection';
import ExportButton from '@/components/ExportButton';
import ConfirmModal from '@/components/ConfirmModal';
import { CompanyData, AnalysisResult, ReportRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';

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

          {/* ── Próximos pasos CTA ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              marginTop: '48px',
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
              ¿Qué quieres hacer con este análisis?
            </h2>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Iniciar estrategia */}
              <button
                onClick={() => {
                  setStrategyName('');
                  setStrategyDesc('');
                  setStrategySuccess(false);
                  setStrategyModalOpen(true);
                }}
                style={{
                  flex: '1 1 200px',
                  padding: '16px 24px',
                  background: 'var(--acid)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.88';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '18px' }}>🚀</span>
                Iniciar estrategia
              </button>

              {/* Pausar proyecto */}
              <button
                onClick={() => {
                  setPauseReason('');
                  setPauseModalOpen(true);
                }}
                style={{
                  flex: '1 1 200px',
                  padding: '16px 24px',
                  background: 'var(--signal-amber)',
                  color: '#1A1000',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.88';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '18px' }}>⏸</span>
                Pausar proyecto
              </button>
            </div>
          </motion.div>

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
