import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { KPIActual } from '@/lib/types';

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
  try {
    const { id: proposalId } = await params;
    const supabase = getSupabase();

    // Fetch proposal with company join
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*, companies(name)')
      .eq('id', proposalId)
      .single();

    if (error || !proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const companyName: string = (proposal.companies as { name: string } | null)?.name ?? 'Client';
    const kpis: { name: string; target: string; unit: string }[] = proposal.kpis ?? [];
    const kpiActuals: KPIActual[] = proposal.kpi_actuals ?? [];
    const strategyPlan: string = proposal.strategy_plan ?? '';
    const proposedPrice: number | null = proposal.proposed_price ?? null;
    const actualPrice: number | null = proposal.actual_price ?? null;
    const currency: string = proposal.currency ?? 'EUR';
    const closedAt: string = proposal.closed_at ?? new Date().toISOString();

    const closedDate = new Date(closedAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Build KPI tables
    const kpisTable = kpis.length > 0
      ? `| Metric | Target | Unit |\n|--------|--------|------|\n` +
        kpis.map(k => `| ${k.name} | ${k.target} | ${k.unit} |`).join('\n')
      : 'No KPIs were defined for this engagement.';

    const kpiActualsTable = kpiActuals.length > 0
      ? `| Metric | Target | Actual | Note |\n|--------|--------|--------|------|\n` +
        kpiActuals.map(k => `| ${k.name} | ${k.target} | ${k.actual} | ${k.note ?? ''} |`).join('\n')
      : 'No actuals recorded.';

    const investmentLine = proposedPrice && actualPrice
      ? `${proposedPrice.toLocaleString()} ${currency} → actual charged: ${actualPrice.toLocaleString()} ${currency}`
      : proposedPrice
      ? `${proposedPrice.toLocaleString()} ${currency} (actual price not recorded)`
      : 'Price not recorded';

    const prompt = `You are writing a professional project results report for ${companyName}.

This was the committed strategy and KPIs:
${strategyPlan.slice(0, 3000)}

These were the success metrics committed in the proposal:
${kpisTable}

These are the actual results achieved:
${kpiActualsTable}

Investment: ${investmentLine}

Write a concise, honest results document in markdown with:

# Project Results: ${companyName}
### 90-Day Engagement · Closed ${closedDate}

---

## Performance vs Targets
[A table comparing each KPI: Metric | Target | Actual | Status (✓ Hit / ~ Near / ✗ Missed)]
[Brief narrative: what moved, what didn't, and why]

## What Worked
[2-3 bullet points: the wins, with numbers]

## What We'd Do Differently
[2-3 honest bullet points: what to change next time. Be specific, not generic]

## The Bottom Line
[1-2 paragraphs: overall assessment. Was it worth it? What's the trajectory now? What should happen next?]

## Next Recommended Step
[One clear recommendation: continue with X, pivot to Y, or pause because Z]

---
*Prepared ${today}*

Be honest. If targets were missed, say why without excuses. If they were exceeded, explain what drove it.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const resultsReport =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    // Save to DB
    await supabase
      .from('proposals')
      .update({ results_report: resultsReport })
      .eq('id', proposalId);

    return Response.json({ results_report: resultsReport });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
