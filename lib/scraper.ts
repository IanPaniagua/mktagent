import { ScrapedData } from './types';

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || '' });

    const result = await app.scrapeUrl(url, { formats: ['markdown'] });

    if (result.success && result.markdown) {
      return {
        url,
        title: (result.metadata?.title as string) || url,
        content: result.markdown,
        success: true,
      };
    }

    throw new Error('Firecrawl returned no content');
  } catch (firecrawlError) {
    console.warn(`Firecrawl failed for ${url}:`, firecrawlError);

    // Fallback: basic fetch
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MKTAGENT/1.0)' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;

      return {
        url,
        title,
        content: text,
        success: true,
      };
    } catch (fetchError) {
      console.warn(`Fallback fetch also failed for ${url}:`, fetchError);
      return {
        url,
        title: url,
        content: '',
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      };
    }
  }
}

export function guessCompetitorUrl(name: string): string {
  // If it looks like a URL already
  if (name.startsWith('http://') || name.startsWith('https://')) {
    return name;
  }
  // If it has a dot, assume it's a domain
  if (name.includes('.')) {
    return `https://${name}`;
  }
  // Otherwise, guess the .com
  const slug = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  return `https://${slug}.com`;
}
