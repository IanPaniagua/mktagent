import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildProposalPrompt } from '@/lib/prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables not configured.');
  return createClient(url, key);
}

// POST /api/proposals/[id]/generate-proposal — generate full client proposal (SSE)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  let body: {
    companyName: string;
    budget: string;
    proposedPrice: number;
    currency: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Fetch the proposal to get strategy_plan + execution budget
  const supabase = getSupabase();
  const { data: proposalRow, error: fetchError } = await supabase
    .from('proposals')
    .select('strategy_plan, execution_budget_min, execution_budget_max')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposalRow?.strategy_plan) {
    return new Response('Proposal not found or missing strategy plan', { status: 404 });
  }

  const prompt = buildProposalPrompt({
    companyName: body.companyName,
    strategyPlan: proposalRow.strategy_plan,
    budget: body.budget,
    proposedPrice: body.proposedPrice,
    currency: body.currency,
    executionBudgetMin: proposalRow.execution_budget_min ?? null,
    executionBudgetMax: proposalRow.execution_budget_max ?? null,
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
          max_tokens: 3000,
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

        // Save proposal content to DB
        await supabase
          .from('proposals')
          .update({ proposal_content: fullText })
          .eq('id', proposalId);

        send({ type: 'complete' });
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
