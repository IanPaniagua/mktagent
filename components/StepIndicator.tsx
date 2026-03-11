'use client';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { number: 1, label: 'Company Info' },
  { number: 2, label: 'Analysis' },
  { number: 3, label: 'Report' },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
      {steps.map((step, idx) => {
        const isDone = step.number < currentStep;
        const isActive = step.number === currentStep;

        return (
          <div key={step.number} style={{ display: 'flex', alignItems: 'center' }}>
            {idx > 0 && (
              <div
                style={{
                  width: '48px',
                  height: '1px',
                  background: isDone ? 'var(--acid)' : 'var(--ink-border)',
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDone ? 'var(--acid)' : isActive ? 'transparent' : 'transparent',
                  border: isActive ? '2px solid var(--acid)' : isDone ? 'none' : '1px solid var(--ink-border)',
                  color: isDone ? 'var(--ink)' : isActive ? 'var(--acid)' : 'var(--chrome-dim)',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                }}
              >
                {isDone ? '✓' : step.number}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '10px',
                  color: isActive ? 'var(--acid)' : isDone ? 'var(--chrome-muted)' : 'var(--chrome-dim)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
