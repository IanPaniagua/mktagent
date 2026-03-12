'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';
import { PMBriefRecord } from '@/lib/types';

interface BriefWithCompany extends PMBriefRecord {
  companies: {
    name: string;
    industry: string;
    stage: string;
    landing_page_url: string;
    id: string;
  };
}

const SECTIONS: { key: keyof PMBriefRecord; label: string; icon: string; color: string }[] = [
  { key: 'product_clarity',        label: 'Product Clarity',         icon: '🎯', color: 'var(--acid)' },
  { key: 'icp',                    label: 'ICP',                      icon: '👤', color: 'var(--signal-blue)' },
  { key: 'jobs_to_be_done',        label: 'Jobs-to-be-Done',          icon: '💼', color: 'var(--acid)' },
  { key: 'pmf_assessment',         label: 'PMF Assessment',           icon: '📊', color: '#ff9500' },
  { key: 'positioning',            label: 'Positioning',              icon: '⚔️', color: 'var(--signal-blue)' },
  { key: 'value_prop_gaps',        label: 'Value Prop Gaps',          icon: '📝', color: '#ff9500' },
  { key: 'pre_marketing_needs',    label: 'Pre-Marketing Needs',      icon: '🔧', color: 'var(--signal-red)' },
  { key: 'quick_marketing_wins',   label: 'Quick Wins',               icon: '⚡', color: 'var(--acid)' },
  { key: 'recommended_pm_actions', label: 'Recommended PM Actions',   icon: '🗺️', color: 'var(--signal-blue)' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PMBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [brief, setBrief] = useState<BriefWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].key);

  // Directions state
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionA, setDirectionA] = useState('');
  const [pricingA, setPricingA] = useState('');
  const [timelineA, setTimelineA] = useState('');
  const [directionB, setDirectionB] = useState('');
  const [pricingB, setPricingB] = useState('');
  const [timelineB, setTimelineB] = useState('');
  const [directionsDone, setDirectionsDone] = useState(false);
  const [chosenDirection, setChosenDirection] = useState<'Direction A' | 'Direction B' | null>(null);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [existingProposalId, setExistingProposalId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pm-briefs/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.brief) setBrief(data.brief as BriefWithCompany);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Check for existing proposal
    fetch(`/api/pm-briefs/${id}/proposals`)
      .then(r => r.json())
      .then(data => {
        if (data.proposal?.id) setExistingProposalId(data.proposal.id);
      })
      .catch(() => {/* no proposal */});
  }, [id]);

  function generateDirections() {
    setDirectionsLoading(true);
    setDirectionA(''); setPricingA(''); setTimelineA('');
    setDirectionB(''); setPricingB(''); setTimelineB('');
    setDirectionsDone(false);

    fetch(`/api/pm-briefs/${id}/directions`, { method: 'POST' })
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
              if (msg.type === 'direction_a') setDirectionA(msg.content ?? '');
              if (msg.type === 'pricing_a') setPricingA(msg.content ?? '');
              if (msg.type === 'timeline_a') setTimelineA(msg.content ?? '');
              if (msg.type === 'direction_b') setDirectionB(msg.content ?? '');
              if (msg.type === 'pricing_b') setPricingB(msg.content ?? '');
              if (msg.type === 'timeline_b') setTimelineB(msg.content ?? '');
              if (msg.type === 'complete') { setDirectionsDone(true); setDirectionsLoading(false); }
            } catch { /* skip */ }
          }
        }
        setDirectionsLoading(false);
      })
      .catch(() => setDirectionsLoading(false));
  }

  async function chooseDirection(direction: 'Direction A' | 'Direction B') {
    if (!brief) return;
    setChosenDirection(direction);
    setCreatingProposal(true);

    const dirText = direction === 'Direction A' ? directionA : directionB;

    const res = await fetch('/api/pm-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pm_brief_id: brief.id,
        company_id: brief.company_id,
        direction_fix_first: directionA,
        direction_quick_start: directionB,
        chosen_direction: direction,
        user_input: dirText,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/pm/proposals/${data.proposal.id}`);
    } else {
      setCreatingProposal(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--chrome-dim)', fontSize: '13px' }}>
            Loading brief...
          </div>
        </main>
      </>
    );
  }

  if (!brief) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--signal-red)', marginBottom: '16px' }}>Brief not found.</p>
            <Link href="/dashboard" style={{ color: 'var(--acid)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>← Back to Dashboard</Link>
          </div>
        </main>
      </>
    );
  }

  const activeSectionData = SECTIONS.find(s => s.key === activeSection);
  const activeContent = brief[activeSection as keyof PMBriefRecord] as string | undefined;

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        padding: '80px 0 60px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '40px' }}
          >
            <Link href="/dashboard" style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '12px',
              color: 'var(--chrome-dim)',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '20px',
            }}>
              ← Dashboard
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(0,140,255,0.08)',
                  border: '1px solid rgba(0,140,255,0.2)',
                  borderRadius: '100px',
                  padding: '5px 14px',
                  marginBottom: '12px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    color: 'var(--signal-blue)',
                    letterSpacing: '0.08em',
                  }}>
                    PRODUCT INTELLIGENCE BRIEF · PHASE 1
                  </span>
                </div>

                <h1 style={{
                  fontFamily: 'var(--font-dm-serif), serif',
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  color: 'var(--chrome)',
                  fontWeight: 400,
                  marginBottom: '6px',
                }}>
                  {brief.companies?.name}
                </h1>
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '12px',
                  color: 'var(--chrome-dim)',
                  letterSpacing: '0.04em',
                }}>
                  {brief.companies?.industry} · {brief.companies?.stage} · Generated {fmtDate(brief.created_at)}
                </p>
              </div>

              {/* Run marketing button */}
              <button
                onClick={() => {
                  sessionStorage.setItem('mktagent_pm_brief_id', brief.id);
                  sessionStorage.setItem('mktagent_company_id', brief.company_id);
                  router.push(`/analyzing`);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'var(--acid)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(200,255,0,0.3)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                Run Marketing Analysis →
              </button>
            </div>

            {/* Cost row */}
            {brief.total_cost > 0 && (
              <div style={{
                display: 'inline-flex',
                gap: '20px',
                padding: '8px 16px',
                background: 'var(--ink-muted)',
                border: '1px solid var(--ink-border)',
                borderRadius: '8px',
                marginTop: '16px',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', letterSpacing: '0.05em' }}>
                  IN <span style={{ color: 'var(--chrome-muted)' }}>{brief.input_tokens.toLocaleString()}</span>
                </span>
                <span style={{ color: 'var(--ink-border)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', letterSpacing: '0.05em' }}>
                  OUT <span style={{ color: 'var(--chrome-muted)' }}>{brief.output_tokens.toLocaleString()}</span>
                </span>
                <span style={{ color: 'var(--ink-border)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', letterSpacing: '0.05em' }}>
                  COST <span style={{ color: 'var(--signal-blue)', fontWeight: 700 }}>${Number(brief.total_cost).toFixed(4)}</span>
                </span>
              </div>
            )}
          </motion.div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'sticky',
                top: '88px',
              }}
            >
              {SECTIONS.map((section, i) => {
                const hasContent = !!(brief[section.key as keyof PMBriefRecord] as string);
                const isActive = activeSection === section.key;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: isActive ? 'rgba(0,140,255,0.08)' : 'transparent',
                      border: 'none',
                      borderBottom: i < SECTIONS.length - 1 ? '1px solid var(--ink-border)' : 'none',
                      borderLeft: isActive ? '2px solid var(--signal-blue)' : '2px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>{section.icon}</span>
                    <span style={{
                      fontFamily: 'var(--font-geist), sans-serif',
                      fontSize: '13px',
                      color: isActive ? 'var(--chrome)' : 'var(--chrome-muted)',
                      fontWeight: isActive ? 600 : 400,
                      flex: 1,
                      lineHeight: 1.3,
                    }}>
                      {section.label}
                    </span>
                    {hasContent && (
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: isActive ? 'var(--signal-blue)' : 'var(--chrome-dim)',
                        flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })}
            </motion.div>

            {/* Content panel */}
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '12px',
                padding: '32px',
                minHeight: '500px',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--ink-border)',
              }}>
                <span style={{ fontSize: '22px' }}>{activeSectionData?.icon}</span>
                <h2 style={{
                  fontFamily: 'var(--font-dm-serif), serif',
                  fontSize: '22px',
                  color: 'var(--chrome)',
                  fontWeight: 400,
                }}>
                  {activeSectionData?.label}
                </h2>
              </div>

              {activeContent ? (
                <div className="markdown-content" style={{
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  color: 'var(--chrome-muted)',
                  lineHeight: 1.8,
                }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--chrome-dim)',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                }}>
                  No content for this section.
                </div>
              )}
            </motion.div>
          </div>

          {/* ── WHAT TO FIX FIRST? Directions section ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ marginTop: '40px' }}
          >
            {/* Section header */}
            <div style={{
              padding: '24px 28px',
              background: 'rgba(0,140,255,0.04)',
              border: '1px solid rgba(0,140,255,0.2)',
              borderRadius: directionsDone ? '12px 12px 0 0' : '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '20px', color: 'var(--chrome)', marginBottom: '6px', fontWeight: 400 }}>
                  What should we fix first?
                </p>
                <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)' }}>
                  PMCORE will propose two strategic directions based on the brief. Pick the one that fits the client.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {existingProposalId && (
                <button
                  onClick={() => router.push(`/pm/proposals/${existingProposalId}`)}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(200,255,0,0.08)',
                    color: 'var(--acid)',
                    border: '1px solid rgba(200,255,0,0.25)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Resume Proposal →
                </button>
              )}
              {!directionsDone && (
                <button
                  onClick={generateDirections}
                  disabled={directionsLoading}
                  style={{
                    padding: '12px 24px',
                    background: directionsLoading ? 'var(--ink-muted)' : 'var(--signal-blue)',
                    color: directionsLoading ? 'var(--chrome-dim)' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: directionsLoading ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { if (!directionsLoading) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,140,255,0.3)'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  {directionsLoading ? (
                    <>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--signal-blue)', animation: 'pulse 1s infinite' }} />
                      Analyzing...
                    </>
                  ) : 'Generate Directions →'}
                </button>
              )}
              </div>
            </div>

            {/* Direction cards */}
            <AnimatePresence>
              {directionsDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0',
                    border: '1px solid rgba(0,140,255,0.2)',
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Direction A */}
                  <div style={{
                    padding: '28px',
                    background: chosenDirection === 'Direction A' ? 'rgba(0,140,255,0.08)' : 'var(--ink-soft)',
                    borderRight: '1px solid rgba(0,140,255,0.15)',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--signal-blue)', letterSpacing: '0.08em', background: 'rgba(0,140,255,0.1)', padding: '3px 10px', borderRadius: '100px', border: '1px solid rgba(0,140,255,0.2)' }}>
                        DIRECTION A
                      </span>
                      <span style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome)', fontWeight: 600 }}>Fix Foundation First</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', lineHeight: 1.8, marginBottom: '16px' }}>
                      {directionA}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      {pricingA && (
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', marginBottom: '2px' }}>FEE</div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '15px', color: 'var(--signal-blue)', fontWeight: 700 }}>{pricingA}</div>
                        </div>
                      )}
                      {timelineA && (
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', marginBottom: '2px' }}>TIMELINE</div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '15px', color: 'var(--chrome-muted)', fontWeight: 700 }}>{timelineA}</div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => chooseDirection('Direction A')}
                      disabled={creatingProposal}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: chosenDirection === 'Direction A' ? 'var(--signal-blue)' : 'rgba(0,140,255,0.1)',
                        color: chosenDirection === 'Direction A' ? '#fff' : 'var(--signal-blue)',
                        border: '1px solid rgba(0,140,255,0.3)',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-geist), sans-serif',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: creatingProposal ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {creatingProposal && chosenDirection === 'Direction A' ? 'Creating...' : 'Choose Direction A →'}
                    </button>
                  </div>

                  {/* Direction B */}
                  <div style={{
                    padding: '28px',
                    background: chosenDirection === 'Direction B' ? 'rgba(0,140,255,0.08)' : 'var(--ink-soft)',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: '#ff9500', letterSpacing: '0.08em', background: 'rgba(255,149,0,0.1)', padding: '3px 10px', borderRadius: '100px', border: '1px solid rgba(255,149,0,0.2)' }}>
                        DIRECTION B
                      </span>
                      <span style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome)', fontWeight: 600 }}>Start Now, Fix in Parallel</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', lineHeight: 1.8, marginBottom: '16px' }}>
                      {directionB}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      {pricingB && (
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', marginBottom: '2px' }}>FEE</div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '15px', color: '#ff9500', fontWeight: 700 }}>{pricingB}</div>
                        </div>
                      )}
                      {timelineB && (
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', marginBottom: '2px' }}>TIMELINE</div>
                          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '15px', color: 'var(--chrome-muted)', fontWeight: 700 }}>{timelineB}</div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => chooseDirection('Direction B')}
                      disabled={creatingProposal}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: chosenDirection === 'Direction B' ? '#ff9500' : 'rgba(255,149,0,0.1)',
                        color: chosenDirection === 'Direction B' ? '#fff' : '#ff9500',
                        border: '1px solid rgba(255,149,0,0.3)',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-geist), sans-serif',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: creatingProposal ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {creatingProposal && chosenDirection === 'Direction B' ? 'Creating...' : 'Choose Direction B →'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Skip to marketing (secondary action) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              background: 'rgba(255,153,0,0.04)',
              border: '1px solid rgba(255,153,0,0.15)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'rgba(255,153,0,0.8)', margin: 0 }}>
              ⚠️ Client wants to skip PM work? They can go straight to marketing — but results will be limited.
            </p>
            <button
              onClick={() => {
                sessionStorage.setItem('mktagent_pm_brief_id', brief.id);
                sessionStorage.setItem('mktagent_company_id', brief.company_id);
                router.push('/analyzing');
              }}
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
          </motion.div>
        </div>
      </main>
    </>
  );
}
