'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const headline = "Your company's marketing intelligence, fully automated.";
const words = headline.split(' ');

const features = [
  { icon: '⚡', label: 'User Research' },
  { icon: '🔍', label: 'Competitor Analysis' },
  { icon: '🎯', label: 'Go-to-Market Strategy' },
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
          padding: '80px 24px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(200,255,0,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            maxWidth: '800px',
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--ink-muted)',
              border: '1px solid var(--ink-border)',
              borderRadius: '100px',
              padding: '6px 16px',
              marginBottom: '40px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--acid)',
                display: 'inline-block',
                animation: 'blink 1.5s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-muted)',
                letterSpacing: '0.08em',
              }}
            >
              AI-POWERED MARKETING INTELLIGENCE
            </span>
          </motion.div>

          {/* Headline with stagger */}
          <h1
            style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: 'clamp(40px, 7vw, 72px)',
              lineHeight: 1.1,
              color: 'var(--chrome)',
              marginBottom: '24px',
              fontWeight: 400,
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
                style={{ display: 'inline-block', marginRight: '0.3em' }}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            style={{
              fontFamily: 'var(--font-geist), sans-serif',
              fontSize: '18px',
              color: 'var(--chrome-muted)',
              lineHeight: 1.6,
              maxWidth: '520px',
              margin: '0 auto 40px',
            }}
          >
            Feed it your landing page, your repo, your docs. Get back a complete marketing strategy in minutes.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.4 }}
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '48px',
            }}
          >
            {features.map((feature) => (
              <div
                key={feature.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '100px',
                  background: 'var(--ink-muted)',
                }}
              >
                <span style={{ fontSize: '14px' }}>{feature.icon}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '12px',
                    color: 'var(--chrome-muted)',
                    letterSpacing: '0.03em',
                  }}
                >
                  {feature.label}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            <Link
              href="/company"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 36px',
                background: 'var(--acid)',
                color: 'var(--ink)',
                borderRadius: '8px',
                fontFamily: 'var(--font-geist), sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(200,255,0,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              Start Analysis
              <span style={{ fontSize: '18px' }}>→</span>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            style={{
              display: 'flex',
              gap: '40px',
              justifyContent: 'center',
              marginTop: '64px',
              paddingTop: '40px',
              borderTop: '1px solid var(--ink-border)',
            }}
          >
            {[
              { number: '2-4', label: 'min analysis time' },
              { number: '8+', label: 'data sources analyzed' },
              { number: '6', label: 'report sections' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '28px',
                  color: 'var(--acid)',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-dim)',
                  letterSpacing: '0.05em',
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2, duration: 0.4 }}
          style={{
            position: 'absolute',
            bottom: '24px',
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: '11px',
            color: 'var(--chrome-dim)',
            letterSpacing: '0.08em',
          }}
        >
          Powered by Claude · Firecrawl · Next.js
        </motion.p>
      </main>
    </>
  );
}
