import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { KPI } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase not configured.');
  return createClient(url, key);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  const supabase = getSupabase();
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('strategy_plan, proposal_content')
    .eq('id', proposalId)
    .single();

  if (error || !proposal) {
    return Response.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const content = proposal.proposal_content || proposal.strategy_plan || '';

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract 4-6 specific, measurable KPIs from this marketing strategy. Return ONLY a valid JSON array, no other text.

Each KPI must have:
- "name": short metric name (e.g. "Organic traffic", "Qualified leads/month", "Email open rate")
- "target": specific number or value to hit (e.g. "5000", "20", "35%")
- "unit": what it's measured in (e.g. "visits/month", "leads/month", "%", "€ MRR")

Focus on business-outcome metrics, not vanity metrics. Prioritize revenue-adjacent KPIs.

Strategy content:
${content.slice(0, 4000)}

Return format: [{"name":"...","target":"...","unit":"..."}]`,
    }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

  let kpis: KPI[] = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    kpis = match ? JSON.parse(match[0]) : [];
  } catch {
    kpis = [];
  }

  return Response.json({ kpis });
}
