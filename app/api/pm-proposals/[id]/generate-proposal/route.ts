import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildPMProposalPrompt } from '@/lib/pm-prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  let body: { proposedPrice: number; currency: string };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const supabase = getSupabase();

  const { data: proposal, error } = await supabase
    .from('pm_proposals')
    .select('*, companies(name, stage), pm_briefs(*)')
    .eq('id', proposalId)
    .single();

  if (error || !proposal?.pm_plan) {
    return new Response('Proposal not found or missing PM plan', { status: 404 });
  }

  const prompt = buildPMProposalPrompt({
    companyName: proposal.companies.name,
    pmPlan: proposal.pm_plan,
    proposedPrice: body.proposedPrice,
    currency: body.currency ?? 'EUR',
    executionBudgetMin: proposal.execution_budget_min ?? null,
    executionBudgetMax: proposal.execution_budget_max ?? null,
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
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text;
            send({ type: 'chunk', content: event.delta.text });
          }
        }

        await supabase
          .from('pm_proposals')
          .update({
            proposal_content: fullText,
            proposed_price: body.proposedPrice,
            updated_at: new Date().toISOString(),
          })
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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
