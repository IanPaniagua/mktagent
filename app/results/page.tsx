'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ReportSection from '@/components/ReportSection';
import ExportButton from '@/components/ExportButton';
import { CompanyData, AnalysisResult } from '@/lib/types';

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
  const [results, setResults] = useState<AnalysisResult>({
    executiveSummary: '',
    companyAnalysis: '',
    userResearch: '',
    competitorAnalysis: '',
    marketingStrategy: '',
    budgetAllocation: '',
  });
  const [activeSection, setActiveSection] = useState<string>('executiveSummary');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const storedCompany = sessionStorage.getItem('mktagent_company');
    const storedResults = sessionStorage.getItem('mktagent_results');

    if (!storedCompany || !storedResults) {
      router.push('/company');
      return;
    }

    try {
      const company = JSON.parse(storedCompany) as CompanyData;
      const res = JSON.parse(storedResults) as Partial<AnalysisResult>;
      setCompanyData(company);
      setResults({
        executiveSummary: res.executiveSummary || '',
        companyAnalysis: res.companyAnalysis || '',
        userResearch: res.userResearch || '',
        competitorAnalysis: res.competitorAnalysis || '',
        marketingStrategy: res.marketingStrategy || '',
        budgetAllocation: res.budgetAllocation || '',
      });
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
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(section.id);
          }
        },
        { threshold: 0.3, rootMargin: '-56px 0px 0px 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [results]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNewAnalysis = () => {
    sessionStorage.removeItem('mktagent_company');
    sessionStorage.removeItem('mktagent_results');
    router.push('/company');
  };

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
            <ExportButton
              companyName={companyData.name}
              results={results}
            />
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

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '40px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--acid)',
                letterSpacing: '0.1em',
              }}>
                MARKETING INTELLIGENCE REPORT
              </span>
              <span style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
              }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '36px',
              color: 'var(--chrome)',
              fontWeight: 400,
              marginBottom: '8px',
            }}>
              {companyData.name}
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                companyData.industry,
                companyData.stage,
                companyData.mrr,
                companyData.budget,
              ].filter(Boolean).map((tag, i) => (
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

          {/* Footer */}
          <div style={{
            marginTop: '48px',
            paddingTop: '24px',
            borderTop: '1px solid var(--ink-border)',
            textAlign: 'center',
          }}>
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
    </>
  );
}
