import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { buildPMSystemPrompt } from '@/lib/pm-prompts';
import { calculateCost } from '@/lib/agent';

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Inlined here to avoid Turbopack module cache issues with newly-added exports
function buildBriefSummary(brief: Record<string, string | undefined>): string {
  const sectionMap: Array<{ key: string; label: string }> = [
    { key: 'product_clarity',        label: 'Product Clarity' },
    { key: 'vision',                 label: 'Vision & Strategic North Star' },
    { key: 'okrs',                   label: 'OKRs' },
    { key: 'icp',                    label: 'ICP' },
    { key: 'jobs_to_be_done',        label: 'Jobs-to-be-Done' },
    { key: 'pmf_assessment',         label: 'PMF Assessment' },
    { key: 'aarrr_assessment',       label: 'AARRR Metrics Assessment' },
    { key: 'early_validation',       label: 'Early Validation Plan' },
    { key: 'positioning',            label: 'Positioning' },
    { key: 'value_prop_gaps',        label: 'Value Proposition Gaps' },
    { key: 'pre_marketing_needs',    label: 'Pre-Marketing Needs' },
    { key: 'client_deliverables',    label: 'Client Deliverables' },
    { key: 'recommended_pm_actions', label: 'Recommended PM Actions' },
  ];
  return sectionMap
    .filter(s => brief[s.key])
    .map(s => `## ${s.label}\n${brief[s.key]}`)
    .join('\n\n');
}

function buildClarificationPrompt(
  companyName: string,
  stage: string,
  currentBriefSummary: string,
  clarification: string
): string {
  return `You are PMCORE reviewing an existing Product Intelligence Brief for ${companyName} (${stage} stage).

The founder has provided additional context or corrections that may affect parts of the brief. Your job is to:
1. Identify which sections of the brief are affected by this new information
2. Rewrite ONLY those sections with the updated information integrated
3. Leave unaffected sections out entirely — do not repeat content that does not change

NEW INFORMATION FROM FOUNDER:
"${clarification}"

CURRENT BRIEF:
${currentBriefSummary}

---

INSTRUCTIONS:
- Output only the sections that need updating, using the exact same numbered headers as the original
- Integrate the new information naturally — rewrite the section so it reads as a coherent whole
- Be specific about what changed and why it matters for the product analysis
- If the new information affects the ROI or prioritization of recommendations, update those too
- Maximum 4 sections updated per clarification — if more seem affected, prioritize the most impactful ones

Use these exact headers for any sections you update:
## 1. PRODUCT CLARITY
## 2. VISION & STRATEGIC NORTH STAR
## 3. OKRs — OBJECTIVES & KEY RESULTS
## 4. ICP (IDEAL CUSTOMER PROFILE)
## 5. JOBS-TO-BE-DONE
## 6. PMF ASSESSMENT
## 7. AARRR METRICS ASSESSMENT
## 8. EARLY VALIDATION PLAN
## 9. POSITIONING
## 10. VALUE PROPOSITION GAPS
## 11. PRE-MARKETING NEEDS
## 12. CLIENT DELIVERABLES
## 13. RECOMMENDED PM ACTIONS

Start your response by listing which sections you are updating and why in one line each. Then provide the full updated content for each section.`;
}

const SECTION_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'product_clarity',        pattern: /##\s*1\.\s*PRODUCT CLARITY([\s\S]*?)(?=##\s*2\.|$)/i },
  { key: 'vision',                 pattern: /##\s*2\.\s*VISION[^#]*([\s\S]*?)(?=##\s*3\.|$)/i },
  { key: 'okrs',                   pattern: /##\s*3\.\s*OKRs?[^#]*([\s\S]*?)(?=##\s*4\.|$)/i },
  { key: 'icp',                    pattern: /##\s*4\.\s*ICP[^#]*([\s\S]*?)(?=##\s*5\.|$)/i },
  { key: 'jobs_to_be_done',        pattern: /##\s*5\.\s*JOBS-TO-BE-DONE([\s\S]*?)(?=##\s*6\.|$)/i },
  { key: 'pmf_assessment',         pattern: /##\s*6\.\s*PMF ASSESSMENT([\s\S]*?)(?=##\s*7\.|$)/i },
  { key: 'aarrr_assessment',       pattern: /##\s*7\.\s*AARRR[^#]*([\s\S]*?)(?=##\s*8\.|$)/i },
  { key: 'early_validation',       pattern: /##\s*8\.\s*EARLY VALIDATION[^#]*([\s\S]*?)(?=##\s*9\.|$)/i },
  { key: 'positioning',            pattern: /##\s*9\.\s*POSITIONING([\s\S]*?)(?=##\s*10\.|$)/i },
  { key: 'value_prop_gaps',        pattern: /##\s*10\.\s*VALUE PROPOSITION GAPS([\s\S]*?)(?=##\s*11\.|$)/i },
  { key: 'pre_marketing_needs',    pattern: /##\s*11\.\s*PRE-MARKETING NEEDS([\s\S]*?)(?=##\s*12\.|$)/i },
  { key: 'client_deliverables',    pattern: /##\s*12\.\s*CLIENT DELIVERABLES([\s\S]*?)(?=##\s*13\.|$)/i },
  { key: 'recommended_pm_actions', pattern: /##\s*13\.\s*RECOMMENDED PM ACTIONS([\s\S]*?)$/i },
];

function parseUpdatedSections(content: string): Record<string, string> {
  const updated: Record<string, string> = {};
  for (const { key, pattern } of SECTION_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[1]) {
      updated[key] = match[1].trim();
    }
  }
  return updated;
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

        const { data: brief, error: briefError } = await supabase
          .from('pm_briefs')
          .select('*, companies(name, stage)')
          .eq('id', id)
          .single();

        if (briefError || !brief) {
          send({ type: 'error', message: 'PM Brief not found.' });
          controller.close();
          return;
        }

        const currentSummary = buildBriefSummary(brief);
        const prompt = buildClarificationPrompt(
          brief.companies?.name ?? 'the company',
          brief.companies?.stage ?? '',
          currentSummary,
          clarification
        );

        send({ type: 'status', message: 'PMCORE is reviewing your clarification...' });

        const aiStream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: buildPMSystemPrompt(),
          messages: [{ role: 'user', content: prompt }],
        });

        let fullContent = '';
        for await (const chunk of aiStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullContent += chunk.delta.text;
            send({ type: 'token', text: chunk.delta.text });
          }
        }

        const finalMessage = await aiStream.finalMessage();
        const usage = calculateCost(
          finalMessage.usage.input_tokens,
          finalMessage.usage.output_tokens
        );

        const updatedSections = parseUpdatedSections(fullContent);

        if (Object.keys(updatedSections).length === 0) {
          send({ type: 'error', message: 'PMCORE could not identify sections to update. Try being more specific.' });
          controller.close();
          return;
        }

        const { error: updateError } = await supabase
          .from('pm_briefs')
          .update({ ...updatedSections, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          console.error('[Clarify] Failed to update brief:', updateError);
          send({ type: 'error', message: 'Analysis complete but failed to save updates.' });
          controller.close();
          return;
        }

        send({
          type: 'complete',
          updatedSections,
          updatedKeys: Object.keys(updatedSections),
          usage,
        });
      } catch (error) {
        console.error('[Clarify] Error:', error);
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
