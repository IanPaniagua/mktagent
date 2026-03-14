import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function buildProposalClarifyPrompt(
  companyName: string,
  currentProposal: string,
  clarification: string
): string {
  return `You are PMCORE reviewing a client proposal you wrote for ${companyName}.

The consultant has asked you to revise parts of the proposal based on this feedback:
"${clarification}"

CURRENT PROPOSAL:
${currentProposal}

---

INSTRUCTIONS:
- Return the FULL updated proposal — same structure, same sections
- Only change what the feedback asks for — keep everything else exactly as written
- Maintain the same tone: direct, honest, confident, no jargon
- Do not add new sections or remove existing ones unless explicitly asked
- Keep the exact same Markdown formatting and headers

Return only the updated proposal text, nothing else.`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const { clarification } = await request.json() as { clarification: string };

        if (!clarification?.trim()) {
          send({ type: 'error', message: 'No clarification text provided.' });
          controller.close();
          return;
        }

        const supabase = getSupabase();

        const { data: proposal, error: propError } = await supabase
          .from('pm_proposals')
          .select('*, companies(name, stage)')
          .eq('id', id)
          .single();

        if (propError || !proposal) {
          send({ type: 'error', message: 'Proposal not found.' });
          controller.close();
          return;
        }

        if (!proposal.proposal_content) {
          send({ type: 'error', message: 'No proposal content to update. Generate the proposal first.' });
          controller.close();
          return;
        }

        const prompt = buildProposalClarifyPrompt(
          proposal.companies?.name ?? 'the company',
          proposal.proposal_content,
          clarification
        );

        send({ type: 'status', message: 'PMCORE is updating the proposal...' });

        const aiStream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        });

        let fullContent = '';
        for await (const chunk of aiStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullContent += chunk.delta.text;
            send({ type: 'token', text: chunk.delta.text });
          }
        }

        const { error: updateError } = await supabase
          .from('pm_proposals')
          .update({ proposal_content: fullContent, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          console.error('[Proposal Clarify] Failed to save:', updateError);
          send({ type: 'error', message: 'Updated but failed to save. Copy the content manually.' });
          controller.close();
          return;
        }

        send({ type: 'complete', proposalContent: fullContent });
      } catch (error) {
        console.error('[Proposal Clarify] Error:', error);
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Clarification failed.',
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
