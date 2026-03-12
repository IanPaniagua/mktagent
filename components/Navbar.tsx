'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const steps = [
  { path: '/company', label: 'Input', number: 1 },
  { path: '/analyzing', label: 'Analysis', number: 2 },
  { path: '/results', label: 'Report', number: 3 },
];

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
        position: 'relative',
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
  const isAppPage = steps.some(s => pathname.startsWith(s.path));

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'rgba(8,8,14,0.8)',
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
          MKTAGENT
        </Link>

        <NavLink href="/knowledge/pm" label="PM KB" pathname={pathname} />
        <NavLink href="/knowledge" label="Mkt KB" pathname={pathname} />
        <NavLink href="/dashboard" label="Dashboard" pathname={pathname} />
      </div>

      {isAppPage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {steps.map((step, idx) => {
            const isActive = pathname.startsWith(step.path);
            const isDone =
              (step.path === '/company' && (pathname.startsWith('/analyzing') || pathname.startsWith('/results'))) ||
              (step.path === '/analyzing' && pathname.startsWith('/results'));

            return (
              <div key={step.path} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {idx > 0 && (
                  <div
                    style={{
                      width: '24px',
                      height: '1px',
                      background: isDone ? 'var(--acid-dim)' : 'var(--ink-border)',
                    }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '11px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDone ? 'var(--acid)' : isActive ? 'var(--acid)' : 'transparent',
                      color: isDone || isActive ? 'var(--ink)' : 'var(--chrome-dim)',
                      border: isDone || isActive ? 'none' : '1px solid var(--ink-border)',
                      fontWeight: 600,
                    }}
                  >
                    {isDone ? '✓' : step.number}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '11px',
                      color: isActive ? 'var(--chrome)' : isDone ? 'var(--chrome-muted)' : 'var(--chrome-dim)',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isAppPage && pathname === '/' && (
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
