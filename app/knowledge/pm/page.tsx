'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { PMKnowledgeEntry } from '@/lib/types';
import Navbar from '@/components/Navbar';

type Category = PMKnowledgeEntry['category'] | 'all';

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'all',        label: 'All',        color: 'var(--chrome-muted)' },
  { value: 'philosophy', label: 'Philosophy',  color: 'var(--signal-blue)' },
  { value: 'framework',  label: 'Framework',   color: 'var(--acid)' },
  { value: 'playbook',   label: 'Playbook',    color: '#ff9500' },
  { value: 'rule',       label: 'Rule',        color: 'var(--chrome-muted)' },
  { value: 'case-study', label: 'Case Study',  color: 'var(--signal-blue)' },
];

function getCategoryColor(cat: PMKnowledgeEntry['category']) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? 'var(--chrome-muted)';
}

function getCategoryLabel(cat: PMKnowledgeEntry['category']) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-label={enabled ? 'Disable' : 'Enable'}
      style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: enabled ? 'var(--signal-blue)' : 'var(--ink-border)',
        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px', left: enabled ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: enabled ? '#fff' : 'var(--chrome-dim)', transition: 'left 0.2s',
      }} />
    </button>
  );
}

function KnowledgeCard({ entry, onToggle, onEdit, onDelete }: {
  entry: PMKnowledgeEntry;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview = entry.content.replace(/^#+\s.*$/gm, '').replace(/\*\*/g, '').replace(/\n+/g, ' ').trim().slice(0, 120);
  const color = getCategoryColor(entry.category);
  const label = getCategoryLabel(entry.category);

  return (
    <div style={{
      background: 'var(--ink-soft)', border: `1px solid ${entry.enabled ? 'var(--ink-border)' : 'var(--ink-muted)'}`,
      borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px',
      opacity: entry.enabled ? 1 : 0.55, transition: 'opacity 0.2s, border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', letterSpacing: '0.12em',
          textTransform: 'uppercase', color, background: `${color}18`, border: `1px solid ${color}40`,
          padding: '3px 8px', borderRadius: '4px',
        }}>{label}</span>
        {entry.isDefault && (
          <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '9px', color: 'var(--chrome-dim)', letterSpacing: '0.08em' }}>
            DEFAULT
          </span>
        )}
      </div>
      <h3 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '18px', color: 'var(--chrome)', lineHeight: 1.3, margin: 0 }}>
        {entry.title}
      </h3>
      <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '13px', color: 'var(--chrome-muted)', lineHeight: 1.6, margin: 0, flexGrow: 1 }}>
        {preview}{preview.length >= 120 ? '…' : ''}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--ink-border)' }}>
        <Toggle enabled={entry.enabled} onChange={onToggle} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onEdit}
            style={{
              fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-muted)',
              background: 'transparent', border: '1px solid var(--ink-border)', borderRadius: '6px',
              padding: '5px 12px', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)'; (e.currentTarget as HTMLElement).style.color = 'var(--chrome)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)'; }}
          >
            Edit
          </button>
          {!entry.isDefault && (
            <button
              onClick={onDelete}
              style={{
                fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'rgba(255,60,80,0.6)',
                background: 'transparent', border: '1px solid rgba(255,60,80,0.2)', borderRadius: '6px',
                padding: '5px 12px', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,60,80,0.5)'; (e.currentTarget as HTMLElement).style.color = 'rgb(255,60,80)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,60,80,0.2)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,60,80,0.6)'; }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type EditingEntry = Pick<PMKnowledgeEntry, 'title' | 'category' | 'content' | 'enabled'>;

export default function PMKnowledgePage() {
  const [entries, setEntries] = useState<PMKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category>('all');
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [editForm, setEditForm] = useState<EditingEntry>({ title: '', category: 'framework', content: '', enabled: true });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch('/api/pm-knowledge')
      .then(r => r.json())
      .then(data => { setEntries(data.entries ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter);
  const enabledCount = entries.filter(e => e.enabled).length;

  async function handleToggle(id: string) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = { ...entry, enabled: !entry.enabled };
    setEntries(prev => prev.map(e => e.id === id ? updated : e));
    await fetch(`/api/pm-knowledge/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: updated.enabled }),
    });
  }

  function startEdit(entry: PMKnowledgeEntry) {
    setEditingId(entry.id);
    setEditForm({ title: entry.title, category: entry.category, content: entry.content, enabled: entry.enabled });
    setPreview(false);
  }

  function startNew() {
    setEditingId('new');
    setEditForm({ title: '', category: 'framework', content: '', enabled: true });
    setPreview(false);
  }

  async function handleSave() {
    if (!editForm.title || !editForm.content) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        const res = await fetch('/api/pm-knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
        const data = await res.json();
        if (data.entry) setEntries(prev => [...prev, data.entry]);
      } else {
        const res = await fetch(`/api/pm-knowledge/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
        const data = await res.json();
        if (data.entry) setEntries(prev => prev.map(e => e.id === editingId ? data.entry : e));
      }
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/pm-knowledge/${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--ink-muted)',
    border: '1px solid var(--ink-border)', borderRadius: '8px', color: 'var(--chrome)',
    fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--ink)', padding: '80px 32px 60px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <Link href="/knowledge" style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--chrome-dim)', textDecoration: 'none' }}>
                Marketing KB
              </Link>
              <span style={{ color: 'var(--ink-border)' }}>·</span>
              <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--signal-blue)' }}>
                PM KB
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0,140,255,0.08)', border: '1px solid rgba(0,140,255,0.2)',
                  borderRadius: '100px', padding: '5px 14px', marginBottom: '12px',
                }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--signal-blue)', letterSpacing: '0.08em' }}>
                    PMCORE KNOWLEDGE BASE
                  </span>
                </div>
                <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '36px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '4px' }}>
                  PM Knowledge
                </h1>
                <p style={{ fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)' }}>
                  {enabledCount} of {entries.length} entries active · PMCORE uses these in every PM analysis
                </p>
              </div>
              <button
                onClick={startNew}
                style={{
                  padding: '10px 20px', background: 'var(--signal-blue)', color: '#fff',
                  border: 'none', borderRadius: '8px', fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'opacity 0.2s', flexShrink: 0,
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                + Add Entry
              </button>
            </div>
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                style={{
                  padding: '6px 16px', background: filter === cat.value ? `${cat.color}18` : 'var(--ink-muted)',
                  border: `1px solid ${filter === cat.value ? `${cat.color}60` : 'var(--ink-border)'}`,
                  borderRadius: '100px', cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px',
                  color: filter === cat.value ? cat.color : 'var(--chrome-dim)', letterSpacing: '0.04em',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Edit modal */}
          {editingId !== null && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            }}>
              <div style={{
                background: 'var(--ink-soft)', border: '1px solid var(--ink-border)',
                borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '720px',
                maxHeight: '90vh', overflowY: 'auto',
              }}>
                <h2 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: '22px', color: 'var(--chrome)', fontWeight: 400, marginBottom: '24px' }}>
                  {editingId === 'new' ? 'New PM Knowledge Entry' : 'Edit Entry'}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Title
                    </label>
                    <input
                      value={editForm.title}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. PLG Growth Framework"
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--signal-blue)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Category
                    </label>
                    <select
                      value={editForm.category}
                      onChange={e => setEditForm(p => ({ ...p, category: e.target.value as PMKnowledgeEntry['category'] }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Content (Markdown)
                      </label>
                      <button
                        onClick={() => setPreview(p => !p)}
                        style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--chrome-dim)', background: 'transparent', border: '1px solid var(--ink-border)', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}
                      >
                        {preview ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {preview ? (
                      <div style={{ padding: '16px', background: 'var(--ink-muted)', border: '1px solid var(--ink-border)', borderRadius: '8px', minHeight: '200px', fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', color: 'var(--chrome-muted)', lineHeight: 1.7 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{editForm.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <textarea
                        value={editForm.content}
                        onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))}
                        rows={12}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-dm-mono), monospace', fontSize: '13px' }}
                        placeholder="# Title&#10;&#10;## Section&#10;Content in Markdown..."
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--signal-blue)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                      />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--ink-border)', borderRadius: '8px', color: 'var(--chrome-muted)', fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editForm.title || !editForm.content}
                    style={{ padding: '10px 24px', background: saving ? 'var(--ink-muted)' : 'var(--signal-blue)', color: saving ? 'var(--chrome-dim)' : '#fff', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-geist), sans-serif', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
                  >
                    {saving ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--chrome-dim)', fontSize: '13px' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {filtered.map(entry => (
                <KnowledgeCard
                  key={entry.id}
                  entry={entry}
                  onToggle={() => handleToggle(entry.id)}
                  onEdit={() => startEdit(entry)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
