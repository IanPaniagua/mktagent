'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import FileDropzone from '@/components/FileDropzone';
import { CompanyData, UploadedDocument } from '@/lib/types';

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

const sectionTitleStyle = {
  fontFamily: 'var(--font-dm-serif), serif',
  fontSize: '18px',
  color: 'var(--chrome)',
  marginBottom: '24px',
  fontWeight: 400,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const fieldGroupStyle = {
  display: 'grid',
  gap: '16px',
};

export default function CompanyPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<CompanyData>({
    name: '',
    industry: '',
    description: '',
    mrr: '',
    budget: '',
    teamSize: '',
    stage: '',
    primaryGoal: '',
    landingPageUrl: '',
    githubUrl: '',
    documents: [],
    competitors: [],
    targetAudience: '',
    painPoints: '',
    differentiation: '',
  });

  const [competitorInput, setCompetitorInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyData, string>>>({});

  const update = useCallback(<K extends keyof CompanyData>(key: K, value: CompanyData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CompanyData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (!formData.stage) newErrors.stage = 'Stage is required';
    if (!formData.landingPageUrl.trim()) {
      newErrors.landingPageUrl = 'Landing page URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.landingPageUrl)) {
      newErrors.landingPageUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const dataToSave: CompanyData = {
      ...formData,
      competitors: competitorInput
        ? competitorInput.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };

    sessionStorage.setItem('mktagent_company', JSON.stringify(dataToSave));
    router.push('/analyzing');
  };

  // Checklist for summary card
  const checklist = [
    { label: 'Company profile', done: !!(formData.name && formData.stage) },
    { label: 'Landing page', done: !!formData.landingPageUrl },
    { label: 'GitHub repo', done: !!formData.githubUrl },
    { label: 'Documents', done: !!(formData.documents && formData.documents.length > 0) },
    { label: 'Competitors', done: !!competitorInput.trim() },
    { label: 'Target audience', done: !!formData.targetAudience },
  ];

  const doneCount = checklist.filter(c => c.done).length;
  const hasRequired = !!(formData.name && formData.stage && formData.landingPageUrl);

  const estimatedTime = () => {
    let base = 2;
    if (formData.githubUrl) base += 0.5;
    if (formData.documents && formData.documents.length > 0) base += 0.5;
    const compCount = competitorInput ? competitorInput.split(',').filter(s => s.trim()).length : 0;
    base += compCount * 0.3;
    return `~${Math.round(base)}-${Math.round(base + 2)} min`;
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '40px' }}
          >
            <h1 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '32px',
              color: 'var(--chrome)',
              fontWeight: 400,
              marginBottom: '8px',
            }}>
              Company Intelligence Setup
            </h1>
            <p style={{
              fontFamily: 'var(--font-geist), sans-serif',
              fontSize: '15px',
              color: 'var(--chrome-muted)',
            }}>
              The more data you provide, the more precise your marketing strategy will be.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
            {/* LEFT: Form */}
            <div>
              {/* Section 1: Company Basics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={sectionStyle}
              >
                <h2 style={sectionTitleStyle}>
                  <span style={{ color: 'var(--acid)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>01</span>
                  Company Basics
                </h2>
                <div style={fieldGroupStyle}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label htmlFor="name" style={labelStyle}>Company Name *</label>
                      <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={e => update('name', e.target.value)}
                        placeholder="Acme Inc."
                        style={{ ...inputStyle, borderColor: errors.name ? 'var(--signal-red)' : 'var(--ink-border)' }}
                        aria-required="true"
                        aria-describedby={errors.name ? 'name-error' : undefined}
                      />
                      {errors.name && <p id="name-error" style={{ color: 'var(--signal-red)', fontSize: '11px', marginTop: '4px', fontFamily: 'var(--font-dm-mono), monospace' }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="industry" style={labelStyle}>Industry / Sector</label>
                      <input
                        id="industry"
                        type="text"
                        value={formData.industry}
                        onChange={e => update('industry', e.target.value)}
                        placeholder="B2B SaaS, Fintech, Healthcare..."
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" style={labelStyle}>
                      Short Description
                      <span style={{ color: 'var(--chrome-dim)', marginLeft: '8px' }}>
                        {formData.description.length}/300
                      </span>
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={e => update('description', e.target.value.slice(0, 300))}
                      placeholder="What does your company do? Be specific..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label htmlFor="mrr" style={labelStyle}>MRR / ARR</label>
                      <select id="mrr" value={formData.mrr} onChange={e => update('mrr', e.target.value)} style={inputStyle}>
                        <option value="">Select...</option>
                        <option value="Pre-revenue">Pre-revenue</option>
                        <option value="Less than $10k">{'<$10k'}</option>
                        <option value="$10k-$100k">$10k–$100k</option>
                        <option value="$100k-$1M">$100k–$1M</option>
                        <option value="$1M+">$1M+</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="budget" style={labelStyle}>Monthly Mktg Budget</label>
                      <select id="budget" value={formData.budget} onChange={e => update('budget', e.target.value)} style={inputStyle}>
                        <option value="">Select...</option>
                        <option value="$0-$500/mo">$0–$500/mo</option>
                        <option value="$500-$2k/mo">$500–$2k/mo</option>
                        <option value="$2k-$10k/mo">$2k–$10k/mo</option>
                        <option value="$10k-$50k/mo">$10k–$50k/mo</option>
                        <option value="$50k+/mo">$50k+/mo</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="teamSize" style={labelStyle}>Team Size</label>
                      <select id="teamSize" value={formData.teamSize} onChange={e => update('teamSize', e.target.value)} style={inputStyle}>
                        <option value="">Select...</option>
                        <option value="1-3">1–3</option>
                        <option value="4-10">4–10</option>
                        <option value="11-50">11–50</option>
                        <option value="50+">50+</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Section 2: Company Stage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={sectionStyle}
              >
                <h2 style={sectionTitleStyle}>
                  <span style={{ color: 'var(--acid)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>02</span>
                  Company Stage
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label htmlFor="stage" style={labelStyle}>Current Stage *</label>
                    <select
                      id="stage"
                      value={formData.stage}
                      onChange={e => update('stage', e.target.value)}
                      style={{ ...inputStyle, borderColor: errors.stage ? 'var(--signal-red)' : 'var(--ink-border)' }}
                      aria-required="true"
                    >
                      <option value="">Select stage...</option>
                      <option value="Idea">Idea</option>
                      <option value="MVP">MVP</option>
                      <option value="Pre-PMF">Pre-PMF</option>
                      <option value="Post-PMF">Post-PMF</option>
                      <option value="Growth">Growth</option>
                      <option value="Scale">Scale</option>
                    </select>
                    {errors.stage && <p style={{ color: 'var(--signal-red)', fontSize: '11px', marginTop: '4px', fontFamily: 'var(--font-dm-mono), monospace' }}>{errors.stage}</p>}
                  </div>
                  <div>
                    <label htmlFor="primaryGoal" style={labelStyle}>Primary Goal Right Now</label>
                    <select id="primaryGoal" value={formData.primaryGoal} onChange={e => update('primaryGoal', e.target.value)} style={inputStyle}>
                      <option value="">Select goal...</option>
                      <option value="Validate idea">Validate idea</option>
                      <option value="Get first customers">Get first customers</option>
                      <option value="Grow MRR">Grow MRR</option>
                      <option value="Reduce churn">Reduce churn</option>
                      <option value="Expand markets">Expand markets</option>
                      <option value="Raise funding">Raise funding</option>
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* Section 3: Data Sources */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={sectionStyle}
              >
                <h2 style={sectionTitleStyle}>
                  <span style={{ color: 'var(--acid)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>03</span>
                  Data Sources
                </h2>
                <div style={fieldGroupStyle}>
                  <div>
                    <label htmlFor="landingPageUrl" style={labelStyle}>Landing Page URL *</label>
                    <input
                      id="landingPageUrl"
                      type="url"
                      value={formData.landingPageUrl}
                      onChange={e => update('landingPageUrl', e.target.value)}
                      placeholder="https://yourcompany.com"
                      style={{ ...inputStyle, borderColor: errors.landingPageUrl ? 'var(--signal-red)' : 'var(--ink-border)' }}
                      aria-required="true"
                      aria-describedby={errors.landingPageUrl ? 'url-error' : undefined}
                    />
                    {errors.landingPageUrl && <p id="url-error" style={{ color: 'var(--signal-red)', fontSize: '11px', marginTop: '4px', fontFamily: 'var(--font-dm-mono), monospace' }}>{errors.landingPageUrl}</p>}
                  </div>

                  <div>
                    <label htmlFor="githubUrl" style={labelStyle}>GitHub Repo URL <span style={{ color: 'var(--chrome-dim)' }}>(optional)</span></label>
                    <input
                      id="githubUrl"
                      type="url"
                      value={formData.githubUrl || ''}
                      onChange={e => update('githubUrl', e.target.value)}
                      placeholder="https://github.com/yourorg/yourrepo"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Upload Documents <span style={{ color: 'var(--chrome-dim)' }}>(optional)</span></label>
                    <FileDropzone
                      files={formData.documents || []}
                      onChange={(docs: UploadedDocument[]) => update('documents', docs)}
                    />
                  </div>

                  <div>
                    <label htmlFor="competitors" style={labelStyle}>Known Competitors <span style={{ color: 'var(--chrome-dim)' }}>(optional)</span></label>
                    <input
                      id="competitors"
                      type="text"
                      value={competitorInput}
                      onChange={e => setCompetitorInput(e.target.value)}
                      placeholder="Notion, Linear, Figma, competitor.com"
                      style={inputStyle}
                    />
                    <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', marginTop: '6px' }}>
                      Comma-separated names or URLs — we&apos;ll scrape each one
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Section 4: Additional Context */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={sectionStyle}
              >
                <h2 style={sectionTitleStyle}>
                  <span style={{ color: 'var(--acid)', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}>04</span>
                  Additional Context
                </h2>
                <div style={fieldGroupStyle}>
                  <div>
                    <label htmlFor="targetAudience" style={labelStyle}>Target Audience Description</label>
                    <textarea
                      id="targetAudience"
                      value={formData.targetAudience}
                      onChange={e => update('targetAudience', e.target.value)}
                      placeholder="Who are your ideal customers? Be specific about their roles, company sizes, industries..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="painPoints" style={labelStyle}>Main Pain Points You Solve</label>
                    <textarea
                      id="painPoints"
                      value={formData.painPoints}
                      onChange={e => update('painPoints', e.target.value)}
                      placeholder="What problems does your product solve? What frustrations does it remove?"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="differentiation" style={labelStyle}>What Makes You Different</label>
                    <textarea
                      id="differentiation"
                      value={formData.differentiation}
                      onChange={e => update('differentiation', e.target.value)}
                      placeholder="Why should customers choose you over alternatives? What's your unfair advantage?"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT: Summary Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              style={{ position: 'sticky', top: '80px' }}
            >
              <div style={{
                background: 'var(--ink-soft)',
                border: '1px solid var(--ink-border)',
                borderRadius: '12px',
                padding: '24px',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-muted)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '20px',
                }}>
                  Analysis Preview
                </h3>

                {/* Checklist */}
                <div style={{ marginBottom: '24px' }}>
                  {checklist.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 0',
                        borderBottom: i < checklist.length - 1 ? '1px solid var(--ink-border)' : 'none',
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: `1px solid ${item.done ? 'var(--acid)' : 'var(--ink-border)'}`,
                        background: item.done ? 'var(--acid)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '10px',
                        color: 'var(--ink)',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                      }}>
                        {item.done ? '✓' : ''}
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-geist), sans-serif',
                        fontSize: '13px',
                        color: item.done ? 'var(--chrome)' : 'var(--chrome-dim)',
                        transition: 'color 0.2s',
                      }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Estimated time */}
                <div style={{
                  background: 'var(--ink-muted)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    color: 'var(--chrome-muted)',
                  }}>
                    Est. analysis time
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '14px',
                    color: 'var(--acid)',
                    fontWeight: 500,
                  }}>
                    {estimatedTime()}
                  </span>
                </div>

                {/* Data points badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '24px',
                    color: 'var(--acid)',
                    fontWeight: 500,
                  }}>
                    {doneCount}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    color: 'var(--chrome-dim)',
                    lineHeight: 1.4,
                  }}>
                    of {checklist.length} data<br />sources ready
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!hasRequired || isSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: hasRequired ? 'var(--acid)' : 'var(--ink-muted)',
                    color: hasRequired ? 'var(--ink)' : 'var(--chrome-dim)',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-geist), sans-serif',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: hasRequired && !isSubmitting ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  aria-label="Run marketing analysis"
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                      Starting...
                    </>
                  ) : (
                    <>
                      Run Analysis →
                    </>
                  )}
                </button>

                {!hasRequired && (
                  <p style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '11px',
                    color: 'var(--chrome-dim)',
                    marginTop: '10px',
                    textAlign: 'center',
                  }}>
                    Fill in required fields to continue
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
