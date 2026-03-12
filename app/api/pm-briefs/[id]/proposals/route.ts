import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

// GET /api/pm-briefs/[id]/proposals — returns the latest proposal for a brief
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('pm_proposals')
    .select('id, status, proposed_price, pm_plan, proposal_content, created_at')
    .eq('pm_brief_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ proposal: null });
  return NextResponse.json({ proposal: data });
}
