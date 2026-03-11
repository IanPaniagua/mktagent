import Anthropic from '@anthropic-ai/sdk';
import { buildDirectionsPrompt } from '@/lib/prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = 'force-dynamic';

// POST /api/companies/[id]/directions — AI generates 2 strategic directions (SSE)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  void id; // company id available if needed

  let body: { reportContent: string; budget: string; stage: string; companyName: string };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const prompt = buildDirectionsPrompt({
    companyName: body.companyName,
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
          max_tokens: 1024,
          stream: true,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullText += event.delta.text;
          }
        }

        // Parse directions from the response
        const budgetMatch = fullText.match(/DIRECTION_A:\s*([\s\S]*?)(?=DIRECTION_B:|$)/i);
        const premiumMatch = fullText.match(/DIRECTION_B:\s*([\s\S]*?)$/i);

        const directionBudget = budgetMatch ? budgetMatch[1].trim() : fullText;
        const directionPremium = premiumMatch ? premiumMatch[1].trim() : '';

        send({ type: 'direction_budget', content: directionBudget });
        send({ type: 'direction_premium', content: directionPremium });
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
