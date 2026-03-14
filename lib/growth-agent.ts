import Anthropic from '@anthropic-ai/sdk';
import { GrowthReview, PMBriefRecord } from './types';
import { buildPMBriefSummary } from './pm-prompts';
import { buildGrowthReviewPrompt, GROWTH_SYSTEM_PROMPT } from './growth-prompts';
import { calculateCost, StepCallback, ResultCallback, CostCallback } from './agent';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type GrowthPhase = 'post-pm' | 'post-mkt';

export async function runGrowthReview(
  companyName: string,
  stage: string,
  pmBrief: PMBriefRecord,
  phase: GrowthPhase,
  onStep: StepCallback,
  onResult: ResultCallback,
  onCost?: CostCallback,
  reportSummary?: string
): Promise<void> {
  onStep(1, 'active', 'Loading PM Brief...');
  const pmBriefSummary = buildPMBriefSummary(pmBrief);
  onStep(1, 'done', 'PM Brief loaded');

  onStep(2, 'active', 'Running AARRR health check...');
  await new Promise(r => setTimeout(r, 300));
  onStep(2, 'done', 'AARRR signals assessed');

  onStep(3, 'active', 'Evaluating growth readiness...');
  await new Promise(r => setTimeout(r, 300));
  onStep(3, 'done', 'Readiness evaluation prepared');

  onStep(4, 'active', 'Head of Growth making Go / No-Go decision...');

  const prompt = buildGrowthReviewPrompt({
    companyName,
    stage,
    pmBriefSummary,
    reportSummary,
    phase,
  });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: GROWTH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  let fullContent = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullContent += chunk.delta.text;
    }
  }

  const finalMessage = await stream.finalMessage();
  if (onCost) {
    const usage = calculateCost(
      finalMessage.usage.input_tokens,
      finalMessage.usage.output_tokens
    );
    onCost(usage);
  }

  onStep(4, 'done', 'Growth review complete');

  onStep(5, 'active', 'Parsing growth review sections...');
  const sections = parseGrowthReviewSections(fullContent);
  for (const [section, content] of Object.entries(sections)) {
    onResult(section, content);
  }
  onStep(5, 'done', 'Review ready');
}

function parseGrowthReviewSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};

  const sectionPatterns: Array<{ key: string; pattern: RegExp }> = [
    { key: 'growth_readiness',          pattern: /##\s*1\.\s*GROWTH READINESS ASSESSMENT([\s\S]*?)(?=##\s*2\.|$)/i },
    { key: 'aarrr_health_check',        pattern: /##\s*2\.\s*AARRR HEALTH CHECK([\s\S]*?)(?=##\s*3\.|$)/i },
    { key: 'roi_assessment',            pattern: /##\s*3\.\s*ROI ASSESSMENT([\s\S]*?)(?=##\s*4\.|$)/i },
    { key: 'decision',                  pattern: /##\s*4\.\s*GO \/ NO-GO DECISION([\s\S]*?)(?=##\s*5\.|$)/i },
    { key: 'pm_priority_work',          pattern: /##\s*5\.\s*PM PRIORITY WORK([\s\S]*?)(?=##\s*6\.|$)/i },
    { key: 'growth_hypothesis',         pattern: /##\s*6\.\s*GROWTH HYPOTHESIS([\s\S]*?)(?=##\s*7\.|$)/i },
    { key: 'next_phase_recommendation', pattern: /##\s*7\.\s*NEXT PHASE RECOMMENDATION([\s\S]*?)$/i },
  ];

  for (const { key, pattern } of sectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

  if (Object.keys(sections).length === 0) {
    sections['growth_readiness'] = content;
  }

  // Extract the go/no-go decision as a simple flag
  if (sections['decision']) {
    const isGo = /\*\*GO\*\*/.test(sections['decision']) && !/\*\*NO-GO\*\*/.test(sections['decision']);
    sections['decision_flag'] = isGo ? 'go' : 'no-go';
  }

  return sections;
}
