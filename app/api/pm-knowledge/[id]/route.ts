import { NextRequest, NextResponse } from 'next/server';
import { loadPMKnowledgeStore, savePMKnowledgeStore } from '@/lib/pm-knowledge/index';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = loadPMKnowledgeStore();

    const idx = store.entries.findIndex((e) => e.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    store.entries[idx] = {
      ...store.entries[idx],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    savePMKnowledgeStore(store);
    return NextResponse.json({ entry: store.entries[idx] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = loadPMKnowledgeStore();

    const idx = store.entries.findIndex((e) => e.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const entry = store.entries[idx];
    if (entry.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default entries' }, { status: 400 });
    }

    store.entries.splice(idx, 1);
    savePMKnowledgeStore(store);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
