import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildStrategyPlanPrompt } from '@/lib/prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables not configured.');
  return createClient(url, key);
}

// POST /api/companies/[id]/strategy-plan — AI generates full strategy (SSE)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;

  let body: {
    chosenDirection: string;
    userInput: string;
    reportContent: string;
    budget: string;
    stage: string;
    companyName: string;
    reportId?: string;
    directionBudget?: string;
    directionPremium?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const prompt = buildStrategyPlanPrompt({
    companyName: body.companyName,
    chosenDirection: body.chosenDirection,
    userInput: body.userInput,
    budget: body.budget,
    stage: body.stage,
    reportSummary: body.reportContent,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let fullText = '';

        const response = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 2048,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullText += event.delta.text;
            send({ type: 'chunk', content: event.delta.text });
          }
        }

        // Parse pricing suggestion from the end of the text
        const pricingMatch = fullText.match(/PRICING_SUGGESTION:\s*(\d+)-(\d+)\s*(\w+)\/month/i);
        const rationaleMatch = fullText.match(/PRICING_RATIONALE:\s*(.+)/i);
        const execBudgetMatch = fullText.match(/EXECUTION_BUDGET_ESTIMATE:\s*(\d+)-(\d+)\s*\w+\/month/i);
        const execBudgetRationaleMatch = fullText.match(/EXECUTION_BUDGET_RATIONALE:\s*(.+)/i);
        let suggestedPriceMin: number | null = null;
        let suggestedPriceMax: number | null = null;
        let priceCurrency = 'EUR';
        let pricingRationale: string | null = null;
        let executionBudgetMin: number | null = null;
        let executionBudgetMax: number | null = null;
        let executionBudgetRationale: string | null = null;
        if (pricingMatch) {
          suggestedPriceMin = parseInt(pricingMatch[1]);
          suggestedPriceMax = parseInt(pricingMatch[2]);
          priceCurrency = pricingMatch[3].toUpperCase();
        }
        if (rationaleMatch) {
          pricingRationale = rationaleMatch[1].trim();
        }
        if (execBudgetMatch) {
          executionBudgetMin = parseInt(execBudgetMatch[1]);
          executionBudgetMax = parseInt(execBudgetMatch[2]);
        }
        if (execBudgetRationaleMatch) {
          executionBudgetRationale = execBudgetRationaleMatch[1].trim();
        }
        // Strip all marker lines from displayed strategy text
        const cleanText = fullText
          .replace(/\n*PRICING_SUGGESTION:.*$/im, '')
          .replace(/\n*PRICING_RATIONALE:.*$/im, '')
          .replace(/\n*EXECUTION_BUDGET_ESTIMATE:.*$/im, '')
          .replace(/\n*EXECUTION_BUDGET_RATIONALE:.*$/im, '')
          .trim();

        // Save proposal to DB
        const supabase = getSupabase();
        const { data: proposal, error } = await supabase
          .from('proposals')
          .insert({
            company_id: companyId,
            report_id: body.reportId ?? null,
            direction_budget: body.directionBudget ?? null,
            direction_premium: body.directionPremium ?? null,
            user_input: body.userInput ?? null,
            chosen_direction: body.chosenDirection,
            strategy_plan: cleanText,
            execution_budget_min: executionBudgetMin,
            execution_budget_max: executionBudgetMax,
            status: 'draft',
          })
          .select()
          .single();

        if (error) {
          console.error('[strategy-plan] DB error:', error);
          send({ type: 'complete', proposalId: null, strategyText: cleanText });
        } else {
          send({
            type: 'complete',
            proposalId: proposal.id,
            strategyText: cleanText,
            suggestedPriceMin,
            suggestedPriceMax,
            priceCurrency,
            pricingRationale,
            executionBudgetMin,
            executionBudgetMax,
            executionBudgetRationale,
          });
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
