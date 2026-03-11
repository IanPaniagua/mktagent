import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AnalysisResult, UsageData, ReportRecord } from '@/lib/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables not configured.');
  }
  return createClient(url, key);
}

// GET /api/companies/[id]/reports — get all reports for a company
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reports: reports ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/companies/[id]/reports — save a new report
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = (await request.json()) as { results: Partial<AnalysisResult>; usageData: UsageData };
    const { results, usageData } = body;

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        company_id: id,
        executive_summary: results.executiveSummary ?? '',
        company_analysis: results.companyAnalysis ?? '',
        user_research: results.userResearch ?? '',
        competitor_analysis: results.competitorAnalysis ?? '',
        marketing_strategy: results.marketingStrategy ?? '',
        budget_allocation: results.budgetAllocation ?? '',
        input_tokens: usageData?.inputTokens ?? 0,
        output_tokens: usageData?.outputTokens ?? 0,
        total_cost: usageData?.totalCost ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Update company's last_analyzed_at
    await supabase
      .from('companies')
      .update({ last_analyzed_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ report: report as ReportRecord }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
