import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Proposal } from '@/lib/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables not configured.');
  return createClient(url, key);
}

// GET /api/companies/[id]/proposals — fetch all proposals for a company
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ proposals: (data ?? []) as Proposal[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
