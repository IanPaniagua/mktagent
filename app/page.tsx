'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const phases = [
  {
    num: '01',
    agent: 'PMCORE',
    color: 'var(--signal-blue)',
    colorAlpha: 'rgba(0,140,255,0.07)',
    colorBorder: 'rgba(0,140,255,0.2)',
    title: 'Product Intelligence',
    description: 'Diagnoses the product before touching marketing. Defines Vision, OKRs, ICP, JTBD, PMF status, and AARRR health. Identifies what must be fixed before any spend.',
    outputs: ['Vision & OKRs', 'ICP & JTBD', 'PMF Assessment', 'AARRR Diagnosis', 'Early Validation Plan', 'Client Deliverables'],
  },
  {
    num: '02',
    agent: 'Head of Growth',
    color: '#ff9500',
    colorAlpha: 'rgba(255,149,0,0.07)',
    colorBorder: 'rgba(255,149,0,0.2)',
    title: 'Growth Gate',
    description: 'The strategic gatekeeper. Reviews the PM Brief, scores every AARRR stage, and makes the Go / No-Go call. Marketing budget only flows when the product is ready.',
    outputs: ['AARRR Health Score', 'Go / No-Go Decision', 'PM Priority Work', 'Growth Hypothesis', 'Next Phase Recommendation'],
  },
  {
    num: '03',
    agent: 'Marketing',
    color: 'var(--acid)',
    colorAlpha: 'rgba(200,255,0,0.05)',
    colorBorder: 'rgba(200,255,0,0.18)',
    title: 'Marketing & Funnels',
    description: 'Builds converting funnels, not generic plans. Competitor intelligence, AARRR-based channel strategy, 90-day action plan, and client proposal — specific to stage and budget.',
    outputs: ['AARRR Funnel Strategy', 'Competitor Analysis', 'Channel Funnels', '90-Day Action Plan', 'Budget Allocation', 'Client Proposal'],
  },
];

const steps = [
  { n: '01', label: 'Add company', sub: 'Name, stage, URLs, documents' },
  { n: '02', label: 'Run PMCORE', sub: '13-section product brief' },
  { n: '03', label: 'Growth Review', sub: 'Go / No-Go gate' },
  { n: '04', label: 'Marketing', sub: 'AARRR funnels + proposal' },
  { n: '05', label: 'Track results', sub: 'Loop back as needed' },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main
        className="grid-bg"
        style={{
          minHeight: '100vh',
          background: 'var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '96px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)', width: '800px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(0,140,255,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '960px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'var(--ink-muted)', border: '1px solid var(--ink-border)',
              borderRadius: '100px', padding: '6px 16px', marginBottom: '36px',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%', background: 'var(--acid)',
              display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
              color: 'var(--chrome-muted)', letterSpacing: '0.08em',
            }}>
              THREE-AGENT GROWTH INTELLIGENCE SYSTEM
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: 'clamp(36px, 5.5vw, 64px)',
              lineHeight: 1.1, color: 'var(--chrome)',
              marginBottom: '20px', fontWeight: 400,
            }}
          >
            Fix the product first.<br />
            <span style={{ color: 'var(--signal-blue)' }}>Then grow it.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            style={{
              fontFamily: 'var(--font-geist), sans-serif', fontSize: '16px',
              color: 'var(--chrome-muted)', lineHeight: 1.75,
              maxWidth: '540px', margin: '0 auto 20px',
            }}
          >
            Three AI agents work in sequence — PM, Head of Growth, and Marketing. No budget flows until the product is ready. Every phase produces client-ready deliverables.
          </motion.p>

          {/* Workflow steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0', marginBottom: '56px', flexWrap: 'wrap',
            }}
          >
            {steps.map((step, i) => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', padding: '0 12px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--ink-muted)', border: '1px solid var(--ink-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 6px',
                    fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
                    color: 'var(--chrome-dim)',
                  }}>
                    {step.n}
                  </div>
                  <div style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '12px', color: 'var(--chrome-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{step.label}</div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', color: 'var(--chrome-dim)', marginTop: '2px', whiteSpace: 'nowrap' }}>{step.sub}</div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: '28px', height: '1px', background: 'var(--ink-border)', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </motion.div>

          {/* Three agent cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 32px 1fr 32px 1fr',
              gap: '0', alignItems: 'start', marginBottom: '52px',
              textAlign: 'left',
            }}
          >
            {phases.map((phase, i) => (
              <>
                <div
                  key={phase.num}
                  style={{
                    background: phase.colorAlpha,
                    border: `1px solid ${phase.colorBorder}`,
                    borderRadius: '14px', padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{
                      fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px',
                      letterSpacing: '0.1em', color: phase.color,
                      background: `${phase.color}18`, border: `1px solid ${phase.color}38`,
                      padding: '3px 8px', borderRadius: '4px',
                    }}>
                      PHASE {phase.num}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
                      color: phase.color, fontWeight: 600, letterSpacing: '0.05em',
                    }}>
                      {phase.agent}
                    </span>
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-dm-serif), serif', fontSize: '19px',
                    color: 'var(--chrome)', fontWeight: 400, marginBottom: '10px',
                  }}>
                    {phase.title}
                  </h3>

                  <p style={{
                    fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                    color: 'var(--chrome-muted)', lineHeight: 1.7, marginBottom: '18px',
                  }}>
                    {phase.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {phase.outputs.map(o => (
                      <div key={o} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-muted)' }}>
                          {o}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {i < phases.length - 1 && (
                  <div key={`arrow-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '70px' }}>
                    <span style={{ color: 'var(--chrome-dim)', fontSize: '16px' }}>→</span>
                  </div>
                )}
              </>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
          >
            <Link
              href="/company"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '16px 40px', background: 'var(--signal-blue)',
                color: '#fff', borderRadius: '8px',
                fontFamily: 'var(--font-geist), sans-serif', fontSize: '15px',
                fontWeight: 700, textDecoration: 'none',
                letterSpacing: '-0.01em', transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,140,255,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              Start with a new company →
            </Link>

            <Link
              href="/dashboard"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
                color: 'var(--chrome-dim)', textDecoration: 'none',
                letterSpacing: '0.04em', transition: 'color 0.2s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--chrome-dim)')}
            >
              or view dashboard →
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            style={{
              display: 'flex', gap: '40px', justifyContent: 'center',
              marginTop: '60px', paddingTop: '40px', borderTop: '1px solid var(--ink-border)',
              flexWrap: 'wrap',
            }}
          >
            {[
              { number: '3', label: 'AI agents in sequence' },
              { number: '13', label: 'PM brief sections' },
              { number: 'Go/No-Go', label: 'growth gate' },
              { number: '7', label: 'Marketing sections' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), monospace', fontSize: '22px',
                  color: 'var(--signal-blue)', fontWeight: 500, marginBottom: '4px',
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
                  color: 'var(--chrome-dim)', letterSpacing: '0.05em',
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          style={{
            marginTop: '60px',
            fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
            color: 'var(--chrome-dim)', letterSpacing: '0.08em',
          }}
        >
          Powered by Claude · Firecrawl · Next.js
        </motion.p>
      </main>
    </>
  );
}
