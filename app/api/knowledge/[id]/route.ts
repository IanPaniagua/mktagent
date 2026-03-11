import { NextRequest, NextResponse } from 'next/server';
import { loadKnowledgeStore, saveKnowledgeStore } from '@/lib/knowledge/index';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = loadKnowledgeStore();
  const entry = store.entries.find((e) => e.id === id);

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const store = loadKnowledgeStore();
  const idx = store.entries.findIndex((e) => e.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const existing = store.entries[idx];
  const updated = {
    ...existing,
    ...body,
    id: existing.id,
    isDefault: existing.isDefault,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  store.entries[idx] = updated;
  saveKnowledgeStore(store);

  return NextResponse.json({ entry: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = loadKnowledgeStore();
  const entry = store.entries.find((e) => e.id === id);

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (entry.isDefault) {
    return NextResponse.json(
      { error: 'Cannot delete default entries' },
      { status: 403 }
    );
  }

  store.entries = store.entries.filter((e) => e.id !== id);
  saveKnowledgeStore(store);

  return NextResponse.json({ success: true });
}
