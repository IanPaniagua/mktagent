import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CompanyData } from '@/lib/types';
import { runAnalysis, PreScrapedData } from '@/lib/agent';
import { buildPMBriefSummary } from '@/lib/pm-prompts';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const body = await request.json() as CompanyData & { companyId?: string; pmBriefId?: string };

        let pmBriefContext: string | undefined;
        let preScraped: PreScrapedData | undefined;

        const companyId = body.companyId;
        const pmBriefId = body.pmBriefId;

        if ((companyId || pmBriefId) && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            let query = supabase.from('pm_briefs').select('*');
            if (pmBriefId) {
              query = query.eq('id', pmBriefId);
            } else if (companyId) {
              query = query.eq('company_id', companyId).order('created_at', { ascending: false }).limit(1);
            }

            const { data: briefs } = await query;
            const brief = Array.isArray(briefs) ? briefs[0] : briefs;

            if (brief) {
              pmBriefContext = buildPMBriefSummary(brief);

              // Pass cached scrape data to avoid re-scraping
              if (brief.scraped_landing_page || brief.scraped_github) {
                preScraped = {
                  landingPage: brief.scraped_landing_page ?? '',
                  github: brief.scraped_github ?? '',
                  scrapedAt: brief.created_at,
                };
              }
            }
          } catch (e) {
            console.warn('[Analyze] Failed to fetch PM brief:', e);
          }
        }

        const companyData: CompanyData = {
          name: body.name,
          industry: body.industry,
          description: body.description,
          mrr: body.mrr,
          budget: body.budget,
          teamSize: body.teamSize,
          stage: body.stage,
          primaryGoal: body.primaryGoal,
          landingPageUrl: body.landingPageUrl,
          githubUrl: body.githubUrl,
          documents: body.documents,
          competitors: body.competitors,
          targetAudience: body.targetAudience,
          painPoints: body.painPoints,
          differentiation: body.differentiation,
        };

        await runAnalysis(
          companyData,
          (step, status, message) => {
            send({ type: 'step', step, status, message });
          },
          (section, content) => {
            send({ type: 'result', section, content });
          },
          (usage) => {
            send({ type: 'cost', usage });
          },
          pmBriefContext,
          preScraped
        );

        send({ type: 'complete' });
      } catch (error) {
        console.error('Analyze route error:', error);
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Analysis failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
