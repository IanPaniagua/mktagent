'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';
import { GrowthReview } from '@/lib/types';

interface ReviewWithCompany extends GrowthReview {
  companies: { name: string; industry: string; stage: string; id: string };
}

const SECTIONS = [
  { key: 'growth_readiness',          label: 'Growth Readiness',       icon: '📡', color: 'var(--signal-blue)' },
  { key: 'aarrr_health_check',        label: 'AARRR Health Check',     icon: '🏴‍☠️', color: '#ff9500' },
  { key: 'roi_assessment',            label: 'ROI Assessment',         icon: '💰', color: 'var(--acid)' },
  { key: 'decision',                  label: 'Go / No-Go Decision',    icon: '⚡', color: 'var(--acid)' },
  { key: 'pm_priority_work',          label: 'PM Priority Work',       icon: '🔧', color: 'var(--signal-red)' },
  { key: 'growth_hypothesis',         label: 'Growth Hypothesis',      icon: '🧪', color: 'var(--acid)' },
  { key: 'next_phase_recommendation', label: 'Next Phase',             icon: '🗺️', color: 'var(--signal-blue)' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function GrowthReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [review, setReview] = useState<ReviewWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);

  useEffect(() => {
    fetch(`/api/growth-reviews/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.review) setReview(data.review as ReviewWithCompany);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--chrome-dim)', fontSize: '13px' }}>
            Loading growth review...
          </div>
        </main>
      </>
    );
  }

  if (!review) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--signal-red)', marginBottom: '16px' }}>Review not found.</p>
            <Link href="/dashboard" style={{ color: 'var(--acid)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>← Back to Dashboard</Link>
          </div>
        </main>
      </>
    );
  }

  const isGo = review.decision === 'go';
  const activeSectionData = SECTIONS.find(s => s.key === activeSection);
  const activeContent = review[activeSection as keyof GrowthReview] as string | undefined;

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--ink)', padding: '80px 0 60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '36px' }}>
            <Link href="/dashboard" style={{
              fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
              color: 'var(--chrome-dim)', textDecoration: 'none', letterSpacing: '0.05em',
              display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px',
            }}>
              ← Dashboard
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.2)',
                  borderRadius: '100px', padding: '5px 14px', marginBottom: '12px',
                }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: '#ff9500', letterSpacing: '0.08em' }}>
                    GROWTH REVIEW · PHASE 2 · HEAD OF GROWTH
                  </span>
                </div>

                <h1 style={{
                  fontFamily: 'var(--font-dm-serif), serif',
                  fontSize: 'clamp(26px, 4vw, 40px)',
                  color: 'var(--chrome)', fontWeight: 400, marginBottom: '6px',
                }}>
                  {review.companies?.name}
                </h1>
                <p style={{
                  fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
                  color: 'var(--chrome-dim)', letterSpacing: '0.04em',
                }}>
                  {review.companies?.industry} · {review.companies?.stage} · {fmtDate(review.created_at)}
                </p>
              </div>

              {/* Decision badge + CTA */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                <div style={{
                  padding: '10px 20px', borderRadius: '10px',
                  background: isGo ? 'rgba(200,255,0,0.08)' : 'rgba(255,59,48,0.08)',
                  border: `1px solid ${isGo ? 'rgba(200,255,0,0.3)' : 'rgba(255,59,48,0.3)'}`,
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace', fontSize: '20px',
                    fontWeight: 700, letterSpacing: '0.05em',
                    color: isGo ? 'var(--acid)' : 'var(--signal-red)',
                  }}>
                    {isGo ? '✓ GO' : '✗ NO-GO'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                    color: 'var(--chrome-muted)',
                  }}>
                    {isGo ? 'Ready for marketing' : 'PM work first'}
                  </span>
                </div>

                {isGo ? (
                  <button
                    onClick={() => {
                      sessionStorage.setItem('growthOS_company_id', review.company_id);
                      sessionStorage.setItem('growthOS_pm_brief_id', review.pm_brief_id ?? '');
                      router.push('/analyzing');
                    }}
                    style={{
                      padding: '11px 22px',
                      background: 'var(--acid)', color: 'var(--ink)',
                      border: 'none', borderRadius: '8px',
                      fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px',
                      fontWeight: 700, cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      whiteSpace: 'nowrap',
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
                    Step 3 — Launch Marketing →
                  </button>
                ) : (
                  <Link
                    href={review.pm_brief_id ? `/pm/brief/${review.pm_brief_id}` : '/dashboard'}
                    style={{
                      padding: '11px 22px',
                      background: 'rgba(0,140,255,0.1)', color: 'var(--signal-blue)',
                      border: '1px solid rgba(0,140,255,0.3)', borderRadius: '8px',
                      fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px',
                      fontWeight: 700, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ← Back to PM Work
                  </Link>
                )}
              </div>
            </div>

            {/* Cost */}
            {review.total_cost > 0 && (
              <div style={{
                display: 'inline-flex', gap: '20px', padding: '8px 16px',
                background: 'var(--ink-muted)', border: '1px solid var(--ink-border)',
                borderRadius: '8px', marginTop: '16px', flexWrap: 'wrap',
              }}>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                  IN <span style={{ color: 'var(--chrome-muted)' }}>{review.input_tokens.toLocaleString()}</span>
                </span>
                <span style={{ color: 'var(--ink-border)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)' }}>
                  OUT <span style={{ color: 'var(--chrome-muted)' }}>{review.output_tokens.toLocaleString()}</span>
                </span>
                <span style={{ color: 'var(--ink-border)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px' }}>
                  COST <span style={{ color: '#ff9500', fontWeight: 700 }}>${Number(review.total_cost).toFixed(4)}</span>
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
                background: 'var(--ink-soft)', border: '1px solid var(--ink-border)',
                borderRadius: '12px', overflow: 'hidden',
                position: 'sticky', top: '88px',
              }}
            >
              {SECTIONS.map((section, i) => {
                const hasContent = !!(review[section.key as keyof GrowthReview] as string);
                const isActive = activeSection === section.key;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    style={{
                      width: '100%', padding: '12px 16px',
                      background: isActive ? 'rgba(255,149,0,0.07)' : 'transparent',
                      border: 'none',
                      borderBottom: i < SECTIONS.length - 1 ? '1px solid var(--ink-border)' : 'none',
                      borderLeft: isActive ? '2px solid #ff9500' : '2px solid transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      gap: '10px', textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>{section.icon}</span>
                    <span style={{
                      fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                      color: isActive ? 'var(--chrome)' : 'var(--chrome-muted)',
                      fontWeight: isActive ? 600 : 400, flex: 1, lineHeight: 1.3,
                    }}>
                      {section.label}
                    </span>
                    {hasContent && (
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: isActive ? '#ff9500' : 'var(--chrome-dim)', flexShrink: 0,
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
                background: 'var(--ink-soft)', border: '1px solid var(--ink-border)',
                borderRadius: '12px', padding: '32px', minHeight: '500px',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '24px', paddingBottom: '20px',
                borderBottom: '1px solid var(--ink-border)',
              }}>
                <span style={{ fontSize: '22px' }}>{activeSectionData?.icon}</span>
                <h2 style={{
                  fontFamily: 'var(--font-dm-serif), serif', fontSize: '22px',
                  color: 'var(--chrome)', fontWeight: 400,
                }}>
                  {activeSectionData?.label}
                </h2>
              </div>

              {activeContent ? (
                <div className="markdown-content" style={{
                  fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px',
                  color: 'var(--chrome-muted)', lineHeight: 1.8,
                }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center', padding: '60px 20px',
                  color: 'var(--chrome-dim)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px',
                }}>
                  {activeSection === 'growth_hypothesis' && !isGo
                    ? 'Not applicable — decision is NO-GO. Focus on PM priority work first.'
                    : 'No content for this section.'}
                </div>
              )}
            </motion.div>
          </div>

          {/* Bottom CTA bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              marginTop: '32px', padding: '20px 24px',
              background: isGo ? 'rgba(200,255,0,0.04)' : 'rgba(0,140,255,0.04)',
              border: `1px solid ${isGo ? 'rgba(200,255,0,0.15)' : 'rgba(0,140,255,0.15)'}`,
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '20px', flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{
                fontFamily: 'var(--font-dm-serif), serif', fontSize: '18px',
                color: 'var(--chrome)', fontWeight: 400, marginBottom: '4px',
              }}>
                {isGo ? 'Ready to build the marketing funnel.' : 'Complete PM work before marketing.'}
              </p>
              <p style={{
                fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                color: 'var(--chrome-muted)', margin: 0,
              }}>
                {isGo
                  ? 'The Head of Growth has cleared this company for marketing spend. Proceed to Phase 3.'
                  : 'See PM Priority Work for the specific actions required before marketing budget is approved.'}
              </p>
            </div>

            {isGo ? (
              <button
                onClick={() => {
                  sessionStorage.setItem('growthOS_company_id', review.company_id);
                  sessionStorage.setItem('growthOS_pm_brief_id', review.pm_brief_id ?? '');
                  router.push('/analyzing');
                }}
                style={{
                  padding: '12px 28px', background: 'var(--acid)', color: 'var(--ink)',
                  border: 'none', borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px',
                  fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'transform 0.2s, box-shadow 0.2s',
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
                Step 3 — Launch Marketing Analysis →
              </button>
            ) : (
              <Link
                href={review.pm_brief_id ? `/pm/brief/${review.pm_brief_id}` : '/dashboard'}
                style={{
                  padding: '12px 28px', background: 'rgba(0,140,255,0.1)', color: 'var(--signal-blue)',
                  border: '1px solid rgba(0,140,255,0.3)', borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px',
                  fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                ← Return to PM Brief
              </Link>
            )}
          </motion.div>
        </div>
      </main>
    </>
  );
}
