import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase not configured.');
  return createClient(url, key);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  const body: {
    message: string;
    currentStrategy: string;
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  } = await request.json();

  const systemPrompt = `You are a senior marketing strategist helping a consultant refine a strategy plan for their client.
The consultant may want to adjust the strategy, change focus areas, add/remove channels, modify the timeline, or rethink the approach.
Respond with the COMPLETE updated strategy plan in clean markdown — not a diff, the full plan.
At the end, add the pricing suggestion line: PRICING_SUGGESTION: [min]-[max] EUR/month (recalculate if the scope changed).
Be direct, specific, and actionable. Match the original structure unless the consultant explicitly asks to change it.`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Here is the current strategy plan:\n\n${body.currentStrategy}`,
    },
    { role: 'assistant', content: 'Understood. I have the strategy plan. What would you like to adjust?' },
    ...body.chatHistory,
    { role: 'user', content: body.message },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let fullText = '';
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          system: systemPrompt,
          messages,
          stream: true,
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text;
          }
        }

        // Parse pricing
        const pricingMatch = fullText.match(/PRICING_SUGGESTION:\s*(\d+)-(\d+)\s*(\w+)\/month/i);
        const rationaleMatch = fullText.match(/PRICING_RATIONALE:\s*(.+)/i);
        const suggestedPriceMin = pricingMatch ? parseInt(pricingMatch[1]) : null;
        const suggestedPriceMax = pricingMatch ? parseInt(pricingMatch[2]) : null;
        const pricingRationale = rationaleMatch ? rationaleMatch[1].trim() : null;
        const cleanText = fullText
          .replace(/\n*PRICING_SUGGESTION:.*$/im, '')
          .replace(/\n*PRICING_RATIONALE:.*$/im, '')
          .trim();

        // Save updated strategy to DB
        const supabase = getSupabase();
        await supabase
          .from('proposals')
          .update({ strategy_plan: cleanText })
          .eq('id', proposalId);

        send({ type: 'complete', strategyText: cleanText, suggestedPriceMin, suggestedPriceMax, pricingRationale });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
