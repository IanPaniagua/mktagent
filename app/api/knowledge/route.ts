import { NextRequest, NextResponse } from 'next/server';
import { loadKnowledgeStore, saveKnowledgeStore } from '@/lib/knowledge/index';
import { KnowledgeEntry } from '@/lib/types';

export async function GET() {
  const store = loadKnowledgeStore();
  return NextResponse.json({ entries: store.entries });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, category, content } = body;

  if (!title || !category || !content) {
    return NextResponse.json(
      { error: 'title, category, and content are required' },
      { status: 400 }
    );
  }

  const store = loadKnowledgeStore();

  const now = new Date().toISOString();
  const newEntry: KnowledgeEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title,
    category,
    content,
    enabled: true,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  store.entries.push(newEntry);
  saveKnowledgeStore(store);

  return NextResponse.json({ entry: newEntry }, { status: 201 });
}
