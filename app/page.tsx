'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const phases = [
  {
    num: '01',
    agent: 'PMCORE',
    color: 'var(--signal-blue)',
    colorAlpha: 'rgba(0,140,255,0.08)',
    colorBorder: 'rgba(0,140,255,0.2)',
    title: 'Product Intelligence',
    description: 'Diagnoses your product before marketing. Defines your ICP, JTBD, PMF status, and positioning gaps. Tells you what needs to be fixed before spending on acquisition.',
    outputs: ['ICP Definition', 'Jobs-to-be-Done', 'PMF Assessment', 'Positioning Analysis', 'Pre-Marketing Checklist'],
  },
  {
    num: '02',
    agent: 'MKTAGENT',
    color: 'var(--acid)',
    colorAlpha: 'rgba(200,255,0,0.06)',
    colorBorder: 'rgba(200,255,0,0.2)',
    title: 'Marketing Intelligence',
    description: 'Builds your full marketing strategy grounded in the PM Brief. Competitor analysis, channel selection, 90-day plan, and budget allocation — specific to your stage and budget.',
    outputs: ['Competitor Analysis', 'Channel Strategy', '90-Day Action Plan', 'Budget Allocation', 'Proposal & KPIs'],
  },
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
          justifyContent: 'center',
          padding: '80px 24px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '35%', left: '50%',
          transform: 'translate(-50%, -50%)', width: '700px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(0,140,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '860px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'var(--ink-muted)', border: '1px solid var(--ink-border)',
              borderRadius: '100px', padding: '6px 16px', marginBottom: '40px',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%', background: 'var(--signal-blue)',
              display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
              color: 'var(--chrome-muted)', letterSpacing: '0.08em',
            }}>
              TWO-AGENT INTELLIGENCE SYSTEM
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: 'clamp(38px, 6vw, 68px)',
              lineHeight: 1.1, color: 'var(--chrome)',
              marginBottom: '24px', fontWeight: 400,
            }}
          >
            From product clarity<br />
            <span style={{ color: 'var(--signal-blue)' }}>to marketing strategy.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{
              fontFamily: 'var(--font-geist), sans-serif', fontSize: '17px',
              color: 'var(--chrome-muted)', lineHeight: 1.7,
              maxWidth: '560px', margin: '0 auto 56px',
            }}
          >
            Two specialized AI agents work in sequence. PMCORE diagnoses your product first. MKTAGENT builds the marketing strategy after. No fluff, no guessing.
          </motion.p>

          {/* Two phases */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 40px 1fr',
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
                    borderRadius: '16px', padding: '28px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <span style={{
                      fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px',
                      letterSpacing: '0.12em', color: phase.color,
                      background: `${phase.color}18`, border: `1px solid ${phase.color}40`,
                      padding: '3px 8px', borderRadius: '4px',
                    }}>
                      PHASE {phase.num}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px',
                      color: phase.color, fontWeight: 600, letterSpacing: '0.06em',
                    }}>
                      {phase.agent}
                    </span>
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-dm-serif), serif', fontSize: '22px',
                    color: 'var(--chrome)', fontWeight: 400, marginBottom: '12px',
                  }}>
                    {phase.title}
                  </h3>

                  <p style={{
                    fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px',
                    color: 'var(--chrome-muted)', lineHeight: 1.7, marginBottom: '20px',
                  }}>
                    {phase.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {phase.outputs.map(o => (
                      <div key={o} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--chrome-muted)' }}>
                          {o}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {i === 0 && (
                  <div key="arrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '80px' }}>
                    <span style={{ color: 'var(--chrome-dim)', fontSize: '20px' }}>→</span>
                  </div>
                )}
              </>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <Link
              href="/company"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '16px 40px', background: 'var(--signal-blue)',
                color: '#fff', borderRadius: '8px',
                fontFamily: 'var(--font-geist), sans-serif', fontSize: '16px',
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
              Start with a new company
              <span style={{ fontSize: '18px' }}>→</span>
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
              { number: '2', label: 'AI agents in sequence' },
              { number: '9', label: 'PM brief sections' },
              { number: '6', label: 'Marketing report sections' },
              { number: '3–6', label: 'min total runtime' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), monospace', fontSize: '26px',
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

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          style={{
            position: 'absolute', bottom: '24px',
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
