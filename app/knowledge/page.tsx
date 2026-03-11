'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { KnowledgeEntry } from '@/lib/types';
import Navbar from '@/components/Navbar';

type Category = KnowledgeEntry['category'] | 'all';

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'var(--chrome-muted)' },
  { value: 'philosophy', label: 'Philosophy', color: 'var(--signal-blue)' },
  { value: 'framework', label: 'Framework', color: 'var(--acid)' },
  { value: 'playbook', label: 'Playbook', color: 'var(--signal-amber)' },
  { value: 'rule', label: 'Rule', color: 'var(--chrome-muted)' },
  { value: 'case-study', label: 'Case Study', color: 'var(--signal-blue)' },
  { value: 'persona', label: 'Persona', color: 'var(--acid-dim)' },
];

function getCategoryColor(category: KnowledgeEntry['category']): string {
  return CATEGORIES.find(c => c.value === category)?.color ?? 'var(--chrome-muted)';
}

function getCategoryLabel(category: KnowledgeEntry['category']): string {
  return CATEGORIES.find(c => c.value === category)?.label ?? category;
}

// ---- Toggle Switch ----
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-label={enabled ? 'Disable entry' : 'Enable entry'}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '11px',
        background: enabled ? 'var(--acid)' : 'var(--ink-border)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: enabled ? '21px' : '3px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: enabled ? 'var(--ink)' : 'var(--chrome-dim)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

// ---- Knowledge Card ----
function KnowledgeCard({
  entry,
  onToggle,
  onEdit,
  onDelete,
}: {
  entry: KnowledgeEntry;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview = entry.content.replace(/^#+\s.*$/gm, '').replace(/\*\*/g, '').replace(/\n+/g, ' ').trim().slice(0, 120);
  const categoryColor = getCategoryColor(entry.category);
  const categoryLabel = getCategoryLabel(entry.category);

  return (
    <div
      style={{
        background: 'var(--ink-soft)',
        border: `1px solid ${entry.enabled ? 'var(--ink-border)' : 'var(--ink-muted)'}`,
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: entry.enabled ? 1 : 0.55,
        transition: 'opacity 0.2s, border-color 0.2s',
      }}
    >
      {/* Category badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: categoryColor,
            background: `${categoryColor}18`,
            border: `1px solid ${categoryColor}40`,
            padding: '3px 8px',
            borderRadius: '4px',
          }}
        >
          {categoryLabel}
        </span>
        {entry.isDefault && (
          <span
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '9px',
              color: 'var(--chrome-dim)',
              letterSpacing: '0.08em',
            }}
          >
            DEFAULT
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-dm-serif), serif',
          fontSize: '18px',
          color: 'var(--chrome)',
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        {entry.title}
      </h3>

      {/* Preview */}
      <p
        style={{
          fontFamily: 'var(--font-geist), sans-serif',
          fontSize: '13px',
          color: 'var(--chrome-muted)',
          lineHeight: 1.6,
          margin: 0,
          flexGrow: 1,
        }}
      >
        {preview}{preview.length >= 120 ? '…' : ''}
      </p>

      {/* Actions row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid var(--ink-border)',
        }}
      >
        <Toggle enabled={entry.enabled} onChange={onToggle} />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onEdit}
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '11px',
              color: 'var(--chrome-muted)',
              background: 'transparent',
              border: '1px solid var(--ink-border)',
              borderRadius: '6px',
              padding: '5px 12px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)';
              (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
            }}
          >
            Edit
          </button>
          {!entry.isDefault && (
            <button
              onClick={onDelete}
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--signal-red)',
                background: 'transparent',
                border: '1px solid var(--signal-red)30',
                borderRadius: '6px',
                padding: '5px 12px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--signal-red)';
                (e.currentTarget as HTMLElement).style.background = 'var(--signal-red)15';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--signal-red)30';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Modal ----
interface ModalProps {
  entry: Partial<KnowledgeEntry> | null;
  onClose: () => void;
  onSave: (data: { title: string; category: KnowledgeEntry['category']; content: string }) => Promise<void>;
  saving: boolean;
}

function EntryModal({ entry, onClose, onSave, saving }: ModalProps) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [category, setCategory] = useState<KnowledgeEntry['category']>(entry?.category ?? 'rule');
  const [content, setContent] = useState(entry?.content ?? '');
  const [preview, setPreview] = useState(false);

  const charCount = content.length;

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    await onSave({ title: title.trim(), category, content });
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--ink-soft)',
          border: '1px solid var(--ink-border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--ink-border)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontSize: '20px',
              color: 'var(--chrome)',
              margin: 0,
            }}
          >
            {entry?.id ? 'Edit Entry' : 'New Knowledge Entry'}
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setPreview(p => !p)}
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: preview ? 'var(--acid)' : 'var(--chrome-muted)',
                background: preview ? 'var(--acid)18' : 'transparent',
                border: `1px solid ${preview ? 'var(--acid)40' : 'var(--ink-border)'}`,
                borderRadius: '6px',
                padding: '5px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {preview ? 'Edit Mode' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '16px',
                color: 'var(--chrome-dim)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '4px',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Title + Category row */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-muted)',
                  letterSpacing: '0.08em',
                }}
              >
                TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Enterprise Sales Playbook"
                style={{
                  background: 'var(--ink-muted)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--chrome)',
                  fontFamily: 'var(--font-geist), sans-serif',
                  fontSize: '14px',
                  width: '100%',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
                onBlur={e => (e.target.style.borderColor = 'var(--ink-border)')}
              />
            </div>
            <div style={{ flex: '0 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-muted)',
                  letterSpacing: '0.08em',
                }}
              >
                CATEGORY
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as KnowledgeEntry['category'])}
                style={{
                  background: 'var(--ink-muted)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--chrome)',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '12px',
                  width: '100%',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238888A0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '32px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
                onBlur={e => (e.target.style.borderColor = 'var(--ink-border)')}
              >
                {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '11px',
                  color: 'var(--chrome-muted)',
                  letterSpacing: '0.08em',
                }}
              >
                CONTENT <span style={{ color: 'var(--chrome-dim)' }}>(Markdown)</span>
              </label>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '10px',
                  color: 'var(--chrome-dim)',
                }}
              >
                {charCount.toLocaleString()} chars
              </span>
            </div>

            {/* Split view: editor + preview */}
            <div
              style={{
                display: 'flex',
                gap: '0',
                border: '1px solid var(--ink-border)',
                borderRadius: '8px',
                overflow: 'hidden',
                minHeight: '320px',
              }}
            >
              {/* Editor pane */}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="# Title&#10;&#10;Write your knowledge entry in Markdown..."
                style={{
                  flex: preview ? '1' : '1',
                  display: 'block',
                  background: 'var(--ink-muted)',
                  border: 'none',
                  borderRight: preview ? '1px solid var(--ink-border)' : 'none',
                  padding: '16px',
                  color: 'var(--chrome)',
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  resize: 'vertical',
                  minHeight: '320px',
                  width: preview ? '50%' : '100%',
                }}
              />

              {/* Preview pane */}
              {preview && (
                <div
                  className="report-content"
                  style={{
                    flex: '1',
                    padding: '16px 20px',
                    overflow: 'auto',
                    background: 'var(--ink)',
                    minHeight: '320px',
                    width: '50%',
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || '*Nothing to preview yet.*'}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid var(--ink-border)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '12px',
              color: 'var(--chrome-muted)',
              background: 'transparent',
              border: '1px solid var(--ink-border)',
              borderRadius: '8px',
              padding: '8px 20px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--chrome-dim)';
              (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '12px',
              color: 'var(--ink)',
              background: saving || !title.trim() || !content.trim() ? 'var(--acid-dim)' : 'var(--acid)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              cursor: saving || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              letterSpacing: '0.05em',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filteredEntries =
    activeCategory === 'all'
      ? entries
      : entries.filter(e => e.category === activeCategory);

  const enabledCount = entries.filter(e => e.enabled).length;

  const handleToggle = async (entry: KnowledgeEntry) => {
    // Optimistic update
    setEntries(prev =>
      prev.map(e => (e.id === entry.id ? { ...e, enabled: !e.enabled } : e))
    );
    try {
      await fetch(`/api/knowledge/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !entry.enabled }),
      });
    } catch {
      // Revert on error
      setEntries(prev =>
        prev.map(e => (e.id === entry.id ? { ...e, enabled: entry.enabled } : e))
      );
    }
  };

  const handleOpenNew = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = async (data: { title: string; category: KnowledgeEntry['category']; content: string }) => {
    setSaving(true);
    try {
      if (editingEntry) {
        const res = await fetch(`/api/knowledge/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        setEntries(prev => prev.map(e => (e.id === editingEntry.id ? json.entry : e)));
      } else {
        const res = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        setEntries(prev => [...prev, json.entry]);
      }
      handleCloseModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    try {
      await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== id));
      setDeleteConfirm(null);
    } catch {
      // silent
    }
  };

  return (
    <>
      <Navbar />
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--ink)',
          paddingTop: '56px',
          display: 'flex',
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: '280px',
            flexShrink: 0,
            borderRight: '1px solid var(--ink-border)',
            padding: '32px 20px',
            position: 'sticky',
            top: '56px',
            height: 'calc(100vh - 56px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Title */}
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-dm-serif), serif',
                fontSize: '22px',
                color: 'var(--chrome)',
                margin: '0 0 6px',
                lineHeight: 1.2,
              }}
            >
              Knowledge Base
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '11px',
                color: 'var(--chrome-dim)',
              }}
            >
              {enabledCount} {enabledCount === 1 ? 'entry' : 'entries'} active
            </p>
          </div>

          {/* Add button */}
          <button
            onClick={handleOpenNew}
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '12px',
              color: 'var(--ink)',
              background: 'var(--acid)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textAlign: 'left',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--acid-dim)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--acid)')}
          >
            + Add Entry
          </button>

          {/* Category filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '10px',
                color: 'var(--chrome-dim)',
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              FILTER BY CATEGORY
            </p>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.value;
              const count =
                cat.value === 'all'
                  ? entries.length
                  : entries.filter(e => e.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: '12px',
                    color: isActive ? cat.color : 'var(--chrome-muted)',
                    background: isActive ? `${cat.color}15` : 'transparent',
                    border: `1px solid ${isActive ? `${cat.color}40` : 'transparent'}`,
                    borderRadius: '6px',
                    padding: '7px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--chrome)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--ink-muted)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--chrome-muted)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: isActive ? cat.color : 'var(--chrome-dim)',
                        background: 'var(--ink-muted)',
                        borderRadius: '10px',
                        padding: '1px 7px',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '32px', minWidth: 0 }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '13px',
                color: 'var(--chrome-dim)',
              }}
            >
              Loading knowledge base…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                gap: '16px',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '13px',
                  color: 'var(--chrome-dim)',
                  textAlign: 'center',
                }}
              >
                No {activeCategory !== 'all' ? getCategoryLabel(activeCategory as KnowledgeEntry['category']).toLowerCase() : ''} entries yet.
              </p>
              <button
                onClick={handleOpenNew}
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '12px',
                  color: 'var(--acid)',
                  background: 'transparent',
                  border: '1px solid var(--acid)40',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--acid)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--acid)10';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--acid)40';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                + Add your first {activeCategory !== 'all' ? getCategoryLabel(activeCategory as KnowledgeEntry['category']).toLowerCase() : ''} entry
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {filteredEntries.map(entry => (
                <KnowledgeCard
                  key={entry.id}
                  entry={entry}
                  onToggle={() => handleToggle(entry)}
                  onEdit={() => handleOpenEdit(entry)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {modalOpen && (
        <EntryModal
          entry={editingEntry}
          onClose={handleCloseModal}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Delete confirm toast */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ink-soft)',
            border: '1px solid var(--signal-red)60',
            borderRadius: '8px',
            padding: '12px 20px',
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: '12px',
            color: 'var(--signal-red)',
            zIndex: 300,
            pointerEvents: 'none',
          }}
        >
          Click Delete again to confirm
        </div>
      )}
    </>
  );
}
