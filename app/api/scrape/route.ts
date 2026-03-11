import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url: string; type: 'landing' | 'competitor' };
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = await scrapeUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Scrape route error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape URL', success: false },
      { status: 500 }
    );
  }
}
