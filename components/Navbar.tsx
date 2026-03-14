'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The 3-phase workflow shown in the top-right progress indicator
const phases = [
  {
    label: 'PM',
    sublabel: 'PMCORE',
    paths: ['/pm/', '/pm-analyzing'],
    donePaths: ['/growth-reviewing', '/growth-review/', '/analyzing', '/results'],
    color: 'var(--signal-blue)',
  },
  {
    label: 'Growth',
    sublabel: 'Head of Growth',
    paths: ['/growth-reviewing', '/growth-review/'],
    donePaths: ['/analyzing', '/results'],
    color: '#ff9500',
  },
  {
    label: 'Marketing',
    sublabel: 'Marketing Agent',
    paths: ['/analyzing', '/results'],
    donePaths: [],
    color: 'var(--acid)',
  },
];

function pathMatchesAny(pathname: string, paths: string[]) {
  return paths.some(p => pathname.startsWith(p));
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const isActive = href === '/knowledge'
    ? pathname === '/knowledge'
    : pathname.startsWith(href);
  return (
    <Link
      href={href}
      style={{
        fontFamily: 'var(--font-dm-mono), monospace',
        fontSize: '12px',
        color: isActive ? 'var(--acid)' : 'var(--chrome-muted)',
        textDecoration: 'none',
        letterSpacing: '0.05em',
        paddingBottom: '2px',
        borderBottom: isActive ? '1px solid var(--acid)' : '1px solid transparent',
        transition: 'color 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
          (e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--acid-dim)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
          (e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent';
        }
      }}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  // Show phase indicator on PM, Growth, and Marketing workflow pages
  const isWorkflowPage = pathMatchesAny(pathname, [
    '/pm/', '/pm-analyzing', '/growth-reviewing', '/growth-review/', '/analyzing', '/results',
  ]);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '56px',
        background: 'rgba(8,8,14,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--ink-border)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* Left: logo + nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            color: 'var(--acid)',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textDecoration: 'none',
          }}
        >
          GrowthOS
        </Link>

        <NavLink href="/knowledge/pm" label="PM KB" pathname={pathname} />
        <NavLink href="/knowledge" label="Mkt KB" pathname={pathname} />
        <NavLink href="/dashboard" label="Dashboard" pathname={pathname} />
      </div>

      {/* Right: 3-phase workflow indicator */}
      {isWorkflowPage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {phases.map((phase, idx) => {
            const isActive = pathMatchesAny(pathname, phase.paths);
            const isDone = pathMatchesAny(pathname, phase.donePaths);

            return (
              <div key={phase.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {idx > 0 && (
                  <div style={{
                    width: '20px', height: '1px',
                    background: isDone ? phase.color + '80' : 'var(--ink-border)',
                    transition: 'background 0.3s',
                  }} />
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '100px',
                  background: isActive
                    ? `${phase.color}18`
                    : isDone ? `${phase.color}10` : 'transparent',
                  border: `1px solid ${isActive ? phase.color + '50' : isDone ? phase.color + '30' : 'var(--ink-border)'}`,
                  transition: 'all 0.3s',
                }}>
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-dm-mono), monospace', fontSize: '9px',
                    background: isDone ? phase.color : isActive ? phase.color : 'transparent',
                    color: isDone || isActive ? 'var(--ink)' : 'var(--chrome-dim)',
                    border: isDone || isActive ? 'none' : `1px solid var(--ink-border)`,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {isDone ? '✓' : idx + 1}
                  </span>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px',
                      color: isActive ? phase.color : isDone ? phase.color + 'cc' : 'var(--chrome-dim)',
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: '0.05em',
                      lineHeight: 1,
                    }}>
                      {phase.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-dm-mono), monospace', fontSize: '9px',
                      color: 'var(--chrome-dim)', letterSpacing: '0.03em',
                      lineHeight: 1, marginTop: '2px',
                    }}>
                      {phase.sublabel}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Right: CTA on home page */}
      {!isWorkflowPage && pathname === '/' && (
        <Link
          href="/company"
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: '12px',
            color: 'var(--chrome-muted)',
            textDecoration: 'none',
            border: '1px solid var(--ink-border)',
            padding: '6px 14px',
            borderRadius: '6px',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--acid)';
            (e.currentTarget as HTMLElement).style.color = 'var(--acid)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
            (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
          }}
        >
          Start Analysis →
        </Link>
      )}
    </nav>
  );
}
