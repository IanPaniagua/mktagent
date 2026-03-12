import { NextRequest, NextResponse } from 'next/server';
import { loadPMKnowledgeStore, savePMKnowledgeStore } from '@/lib/pm-knowledge/index';
import { PMKnowledgeEntry } from '@/lib/types';

export async function GET() {
  try {
    const store = loadPMKnowledgeStore();
    return NextResponse.json({ entries: store.entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Omit<PMKnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>;
    const store = loadPMKnowledgeStore();

    const now = new Date().toISOString();
    const entry: PMKnowledgeEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: body.title,
      category: body.category,
      content: body.content,
      enabled: body.enabled ?? true,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    store.entries.push(entry);
    savePMKnowledgeStore(store);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
