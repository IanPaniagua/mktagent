import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// GET /api/pm-briefs/by-company/[companyId] — get latest PM brief for a company
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const supabase = getSupabase();
    const { companyId } = await params;

    const { data, error } = await supabase
      .from('pm_briefs')
      .select('id, status, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ briefId: null });
    }

    return NextResponse.json({ briefId: data.id, status: data.status, createdAt: data.created_at });
  } catch {
    return NextResponse.json({ briefId: null });
  }
}
