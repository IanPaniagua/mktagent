import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildPMDirectionsPrompt, buildPMBriefSummary } from '@/lib/pm-prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const supabase = getSupabase();

        // Fetch brief + company
        const { data: brief, error } = await supabase
          .from('pm_briefs')
          .select('*, companies(name, stage)')
          .eq('id', id)
          .single();

        if (error || !brief) { send({ type: 'error', message: 'Brief not found' }); controller.close(); return; }

        const briefSummary = buildPMBriefSummary(brief);
        const prompt = buildPMDirectionsPrompt({
          companyName: brief.companies.name,
          stage: brief.companies.stage,
          briefSummary,
        });

        let fullText = '';
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 1500,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text;
          }
        }

        // Parse directions
        const aMatch = fullText.match(/DIRECTION_A:\s*([\s\S]*?)(?=PRICING_A:|$)/i);
        const pricingAMatch = fullText.match(/PRICING_A:\s*([^\n]+)/i);
        const timelineAMatch = fullText.match(/TIMELINE_A:\s*([^\n]+)/i);
        const bMatch = fullText.match(/DIRECTION_B:\s*([\s\S]*?)(?=PRICING_B:|$)/i);
        const pricingBMatch = fullText.match(/PRICING_B:\s*([^\n]+)/i);
        const timelineBMatch = fullText.match(/TIMELINE_B:\s*([^\n]+)/i);

        send({ type: 'direction_a', content: aMatch?.[1]?.trim() ?? fullText });
        send({ type: 'pricing_a', content: pricingAMatch?.[1]?.trim() ?? '' });
        send({ type: 'timeline_a', content: timelineAMatch?.[1]?.trim() ?? '' });
        send({ type: 'direction_b', content: bMatch?.[1]?.trim() ?? '' });
        send({ type: 'pricing_b', content: pricingBMatch?.[1]?.trim() ?? '' });
        send({ type: 'timeline_b', content: timelineBMatch?.[1]?.trim() ?? '' });
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
