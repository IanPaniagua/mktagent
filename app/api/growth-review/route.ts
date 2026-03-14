import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PMBriefRecord } from '@/lib/types';
import { runGrowthReview, GrowthPhase } from '@/lib/growth-agent';

export const maxDuration = 300;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const body = await request.json() as {
          companyId: string;
          pmBriefId?: string;
          reportId?: string;
          phase?: GrowthPhase;
        };

        const { companyId, pmBriefId, reportId, phase = 'post-pm' } = body;

        if (!companyId) {
          send({ type: 'error', message: 'companyId is required' });
          controller.close();
          return;
        }

        const supabase = getSupabase();

        // Fetch company
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

        // Fetch PM brief
        let pmBrief: PMBriefRecord | null = null;
        if (pmBriefId) {
          const { data } = await supabase.from('pm_briefs').select('*').eq('id', pmBriefId).single();
          pmBrief = data;
        } else {
          const { data } = await supabase
            .from('pm_briefs')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          pmBrief = data;
        }

        if (!pmBrief) {
          send({ type: 'error', message: 'No PM brief found. Run PM analysis first.' });
          controller.close();
          return;
        }

        // Optionally fetch marketing report summary for post-mkt reviews
        let reportSummary: string | undefined;
        if (phase === 'post-mkt' && reportId) {
          const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();
          if (report) {
            reportSummary = [
              report.executive_summary && `## Executive Summary\n${report.executive_summary}`,
              report.marketing_strategy && `## Marketing Strategy\n${report.marketing_strategy}`,
              report.budget_allocation && `## Budget Allocation\n${report.budget_allocation}`,
            ].filter(Boolean).join('\n\n');
          }
        }

        const reviewSections: Record<string, string> = {};
        let usageData = { inputTokens: 0, outputTokens: 0, totalCost: 0 };

        await runGrowthReview(
          company.name,
          company.stage,
          pmBrief,
          phase,
          (step, status, message) => {
            send({ type: 'step', step, status, message });
          },
          (section, content) => {
            reviewSections[section] = content;
            send({ type: 'result', section, content });
          },
          (usage) => {
            usageData = usage;
            send({ type: 'cost', usage });
          },
          reportSummary
        );

        // Save growth review to Supabase
        const decision = (reviewSections['decision_flag'] as 'go' | 'no-go') ?? 'no-go';
        const { data: savedReview, error: saveError } = await supabase
          .from('growth_reviews')
          .insert({
            company_id: companyId,
            pm_brief_id: pmBrief.id,
            report_id: reportId ?? null,
            phase,
            growth_readiness: reviewSections['growth_readiness'],
            aarrr_health_check: reviewSections['aarrr_health_check'],
            roi_assessment: reviewSections['roi_assessment'],
            decision,
            pm_priority_work: reviewSections['pm_priority_work'],
            growth_hypothesis: reviewSections['growth_hypothesis'],
            next_phase_recommendation: reviewSections['next_phase_recommendation'],
            input_tokens: usageData.inputTokens,
            output_tokens: usageData.outputTokens,
            total_cost: usageData.totalCost,
          })
          .select()
          .single();

        if (saveError) {
          console.error('[Growth Review] Failed to save:', saveError);
          send({ type: 'error', message: 'Review complete but failed to save.' });
        } else {
          send({ type: 'complete', reviewId: savedReview.id, decision });
        }
      } catch (error) {
        console.error('[Growth Review] Error:', error);
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Growth review failed',
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
