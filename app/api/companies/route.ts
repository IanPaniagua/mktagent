import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CompanyData, CompanyRecord, Strategy, Proposal } from '@/lib/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createClient(url, key);
}

// GET /api/companies — fetch all companies with report counts and latest report
export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('last_analyzed_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    // Fetch latest report + count for each company
    const enriched = await Promise.all(
      (companies || []).map(async (company) => {
        const { data: reports, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (reportsError) {
          console.error('Error fetching reports for company', company.id, reportsError);
          return { ...company, report_count: 0, latest_report: undefined };
        }

        // Fetch active strategy
        const { data: strategyRows } = await supabase
          .from('strategies')
          .select('*')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .order('started_at', { ascending: false })
          .limit(1);

        const activeStrategy: Strategy | undefined = strategyRows?.[0] ?? undefined;

        // Fetch active proposal (draft, sent, or accepted)
        const { data: proposalRows } = await supabase
          .from('proposals')
          .select('*')
          .eq('company_id', company.id)
          .in('status', ['draft', 'sent', 'accepted'])
          .order('created_at', { ascending: false })
          .limit(1);

        const activeProposal: Proposal | undefined = proposalRows?.[0] ?? undefined;

        return {
          ...company,
          report_count: reports?.length ?? 0,
          latest_report: reports?.[0] ?? undefined,
          active_strategy: activeStrategy,
          active_proposal: activeProposal,
        };
      })
    );

    return NextResponse.json({ companies: enriched as CompanyRecord[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/companies — create a new company
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = (await request.json()) as CompanyData;

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: body.name,
        industry: body.industry,
        description: body.description,
        stage: body.stage,
        mrr: body.mrr,
        budget: body.budget,
        team_size: body.teamSize,
        primary_goal: body.primaryGoal,
        landing_page_url: body.landingPageUrl,
        github_url: body.githubUrl ?? null,
        competitors: body.competitors ?? [],
        target_audience: body.targetAudience,
        pain_points: body.painPoints,
        differentiation: body.differentiation,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ company: company as CompanyRecord }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
