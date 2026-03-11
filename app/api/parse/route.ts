import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await parseDocument(buffer, file.name, file.type);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Parse route error:', error);
    return NextResponse.json(
      { error: 'Failed to parse file' },
      { status: 500 }
    );
  }
}
