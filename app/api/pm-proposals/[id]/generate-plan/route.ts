import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildPMPlanPrompt, buildPMBriefSummary } from '@/lib/pm-prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const supabase = getSupabase();

        // Fetch proposal + brief + company
        const { data: proposal, error: pErr } = await supabase
          .from('pm_proposals')
          .select('*, companies(name, stage)')
          .eq('id', proposalId)
          .single();

        if (pErr || !proposal) { send({ type: 'error', message: 'Proposal not found' }); controller.close(); return; }

        const { data: brief, error: bErr } = await supabase
          .from('pm_briefs')
          .select('*')
          .eq('id', proposal.pm_brief_id)
          .single();

        if (bErr || !brief) { send({ type: 'error', message: 'Brief not found' }); controller.close(); return; }

        const briefSummary = buildPMBriefSummary(brief);
        const prompt = buildPMPlanPrompt({
          companyName: proposal.companies.name,
          stage: proposal.companies.stage,
          chosenDirection: proposal.chosen_direction ?? 'Direction A',
          userInput: proposal.user_input ?? '',
          briefSummary,
        });

        let fullText = '';
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text;
            send({ type: 'chunk', content: event.delta.text });
          }
        }

        // Parse pricing — handles €1,500-€3,000 / 1.500-3.000 / 1500–3000 etc.
        function parseRange(text: string, label: string): [number | null, number | null] {
          const m = text.match(new RegExp(`${label}:\\s*[€$£]?\\s*([\\d,\\.]+)\\s*[-–]\\s*[€$£]?\\s*([\\d,\\.]+)`, 'i'));
          if (!m) return [null, null];
          const clean = (s: string) => parseInt(s.replace(/[,\.]/g, '').replace(/\D/g, ''), 10);
          return [clean(m[1]), clean(m[2])];
        }

        const [priceMin, priceMax] = parseRange(fullText, 'PRICING_SUGGESTION');
        const [execMin, execMax] = parseRange(fullText, 'EXECUTION_BUDGET_ESTIMATE');
        console.log('[generate-plan] pricing parsed:', { priceMin, priceMax, execMin, execMax });
        const suggestedPrice = priceMin && priceMax ? Math.round((priceMin + priceMax) / 2) : null;

        // Save plan to DB
        await supabase
          .from('pm_proposals')
          .update({
            pm_plan: fullText,
            proposed_price: suggestedPrice,
            execution_budget_min: execMin,
            execution_budget_max: execMax,
            updated_at: new Date().toISOString(),
          })
          .eq('id', proposalId);

        send({ type: 'complete', suggestedPrice, execMin, execMax });
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
