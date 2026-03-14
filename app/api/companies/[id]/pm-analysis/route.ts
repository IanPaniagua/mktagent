import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PMInputData, CompanyRecord } from '@/lib/types';
import { runPMAnalysis, PMScrapedData } from '@/lib/pm-agent';

export const maxDuration = 300;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const supabase = getSupabase();

        // Fetch company record
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyError || !company) {
          send({ type: 'error', message: 'Company not found' });
          controller.close();
          return;
        }

        const pmInput = (await request.json()) as PMInputData;

        const briefSections: Record<string, string> = {};
        let usageData = { inputTokens: 0, outputTokens: 0, totalCost: 0 };
        let scrapedCache: PMScrapedData = { landingPage: '', github: '' };

        await runPMAnalysis(
          company as CompanyRecord,
          pmInput,
          (step, status, message) => {
            send({ type: 'step', step, status, message });
          },
          (section, content) => {
            briefSections[section] = content;
            send({ type: 'result', section, content });
          },
          (usage) => {
            usageData = usage;
            send({ type: 'cost', usage });
          },
          (scraped) => {
            scrapedCache = scraped;
          }
        );

        // Save PM brief + scraped cache to Supabase
        const { data: savedBrief, error: saveError } = await supabase
          .from('pm_briefs')
          .insert({
            company_id: companyId,
            ...briefSections,
            scraped_landing_page: scrapedCache.landingPage.slice(0, 20000),
            scraped_github: scrapedCache.github.slice(0, 10000),
            status: 'complete',
            input_tokens: usageData.inputTokens,
            output_tokens: usageData.outputTokens,
            total_cost: usageData.totalCost,
          })
          .select()
          .single();

        if (saveError) {
          console.error('[PM Analysis] Failed to save brief:', saveError);
          send({ type: 'error', message: 'Analysis complete but failed to save brief.' });
        } else {
          send({ type: 'complete', briefId: savedBrief.id });
        }
      } catch (error) {
        console.error('[PM Analysis] Error:', error);
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'PM analysis failed',
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
