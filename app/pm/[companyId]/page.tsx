'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FileDropzone from '@/components/FileDropzone';
import { CompanyRecord, UploadedDocument } from '@/lib/types';

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--ink-muted)',
  border: '1px solid var(--ink-border)',
  borderRadius: '8px',
  color: 'var(--chrome)',
  fontFamily: 'var(--font-geist), sans-serif',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-dm-mono), monospace',
  fontSize: '11px',
  color: 'var(--chrome-muted)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '8px',
};

const sectionStyle = {
  background: 'var(--ink-soft)',
  border: '1px solid var(--ink-border)',
  borderRadius: '12px',
  padding: '28px',
  marginBottom: '20px',
};

export default function PMInputPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [additionalContext, setAdditionalContext] = useState('');
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBriefId, setExistingBriefId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/companies/${companyId}`)
      .then(r => r.json())
      .then(data => {
        if (data.company) setCompany(data.company);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Check for existing PM brief
    fetch(`/api/pm-briefs/by-company/${companyId}`)
      .then(r => r.json())
      .then(data => {
        if (data.briefId) setExistingBriefId(data.briefId);
      })
      .catch(() => {});
  }, [companyId]);

  const handleFilesChange = useCallback((files: UploadedDocument[]) => {
    setDocuments(files);
  }, []);

  const handleSubmit = () => {
    if (!company) return;
    setIsSubmitting(true);
    sessionStorage.setItem('mktagent_pm_input', JSON.stringify({
      companyId,
      additionalContext,
      documents,
    }));
    router.push(`/pm-analyzing?company=${companyId}`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--chrome-dim)', fontSize: '13px' }}>
            Loading...
          </div>
        </main>
      </>
    );
  }

  if (!company) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--signal-red)', marginBottom: '16px' }}>Company not found.</p>
            <Link href="/dashboard" style={{ color: 'var(--acid)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>← Back to Dashboard</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        padding: '80px 24px 60px',
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

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

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0,140,255,0.08)',
              border: '1px solid rgba(0,140,255,0.2)',
              borderRadius: '100px',
              padding: '5px 14px',
              marginBottom: '16px',
            }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--signal-blue)',
                letterSpacing: '0.08em',
              }}>
                PHASE 1 · PM ANALYSIS
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: 'clamp(28px, 4vw, 40px)',
              color: 'var(--chrome)',
              fontWeight: 400,
              marginBottom: '8px',
            }}>
              Product Intelligence Brief
            </h1>
            <p style={{
              fontFamily: 'var(--font-geist), sans-serif',
              fontSize: '15px',
              color: 'var(--chrome-muted)',
              lineHeight: 1.6,
            }}>
              For <strong style={{ color: 'var(--chrome)' }}>{company.name}</strong> · {company.industry} · {company.stage}
            </p>

            {existingBriefId && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(200,255,0,0.06)',
                border: '1px solid rgba(200,255,0,0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--acid)' }}>
                  ✓ PM Brief already exists for this company
                </span>
                <Link href={`/pm/brief/${existingBriefId}`} style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--acid)',
                  textDecoration: 'none',
                  border: '1px solid rgba(200,255,0,0.3)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                }}>
                  View Existing Brief →
                </Link>
              </div>
            )}
          </motion.div>

          {/* Phase indicator */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '32px',
              padding: '16px 20px',
              background: 'var(--ink-soft)',
              border: '1px solid var(--ink-border)',
              borderRadius: '10px',
            }}
          >
            {[
              { num: '1', label: 'PM Analysis', active: true },
              { num: '→', label: '', active: false },
              { num: '2', label: 'Marketing Analysis', active: false },
              { num: '→', label: '', active: false },
              { num: '3', label: 'Strategy & Proposal', active: false },
            ].map((item, i) => (
              item.num === '→'
                ? <span key={i} style={{ color: 'var(--ink-border)', fontSize: '14px' }}>→</span>
                : (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: item.active ? 'var(--signal-blue)' : 'var(--ink-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '11px',
                      color: item.active ? '#fff' : 'var(--chrome-dim)',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {item.num}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '11px',
                      color: item.active ? 'var(--chrome)' : 'var(--chrome-dim)',
                      letterSpacing: '0.03em',
                    }}>
                      {item.label}
                    </span>
                  </div>
                )
            ))}
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {/* Additional context */}
            <div style={sectionStyle}>
              <h2 style={{
                fontFamily: 'var(--font-dm-serif), serif',
                fontSize: '18px',
                color: 'var(--chrome)',
                marginBottom: '8px',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span>💬</span> Founder Context
              </h2>
              <p style={{
                fontFamily: 'var(--font-geist), sans-serif',
                fontSize: '13px',
                color: 'var(--chrome-muted)',
                marginBottom: '20px',
                lineHeight: 1.6,
              }}>
                Tell PMCORE what you know that isn't on the website. Current customers, what's working, what isn't, your biggest uncertainty about the product.
              </p>
              <label style={labelStyle}>Additional context (optional)</label>
              <textarea
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="e.g. We have 12 paying customers, all inbound. Biggest issue is onboarding takes too long. Our best customers are ops managers at Series A startups..."
                rows={5}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  lineHeight: 1.6,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--signal-blue)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
              />
            </div>

            {/* Documents */}
            <div style={sectionStyle}>
              <h2 style={{
                fontFamily: 'var(--font-dm-serif), serif',
                fontSize: '18px',
                color: 'var(--chrome)',
                marginBottom: '8px',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span>📄</span> Product Documents
              </h2>
              <p style={{
                fontFamily: 'var(--font-geist), sans-serif',
                fontSize: '13px',
                color: 'var(--chrome-muted)',
                marginBottom: '20px',
                lineHeight: 1.6,
              }}>
                Upload PRDs, user research, roadmaps, customer interview notes, or any other product context. PDF, DOCX, or TXT.
              </p>
              <FileDropzone
                files={documents}
                onChange={handleFilesChange}
              />
            </div>

            {/* What PMCORE will analyze */}
            <div style={{
              ...sectionStyle,
              background: 'rgba(0,140,255,0.04)',
              border: '1px solid rgba(0,140,255,0.15)',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--signal-blue)',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}>
                WHAT PMCORE WILL ANALYZE
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { icon: '🎯', label: 'Product Clarity & Core Value' },
                  { icon: '👤', label: 'ICP Definition' },
                  { icon: '💼', label: 'Jobs-to-be-Done' },
                  { icon: '📊', label: 'PMF Assessment' },
                  { icon: '⚔️', label: 'Competitive Positioning' },
                  { icon: '📝', label: 'Value Proposition Gaps' },
                  { icon: '🔧', label: 'Pre-Marketing Needs' },
                  { icon: '⚡', label: 'Quick Marketing Wins' },
                  { icon: '🗺️', label: 'Recommended PM Actions', },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{item.icon}</span>
                    <span style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '14px 36px',
                  background: isSubmitting ? 'var(--ink-muted)' : 'var(--signal-blue)',
                  color: isSubmitting ? 'var(--chrome-dim)' : '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,140,255,0.3)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {isSubmitting ? 'Starting...' : 'Run PM Analysis →'}
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
