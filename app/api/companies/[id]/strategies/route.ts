import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Strategy } from '@/lib/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables not configured.');
  return createClient(url, key);
}

// GET /api/companies/[id]/strategies — fetch all strategies for a company
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('company_id', id)
      .order('started_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ strategies: (data ?? []) as Strategy[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/companies/[id]/strategies — create a new strategy
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = (await request.json()) as {
      name: string;
      description?: string;
      report_id?: string;
    };

    const { data, error } = await supabase
      .from('strategies')
      .insert({
        company_id: id,
        report_id: body.report_id ?? null,
        name: body.name,
        description: body.description ?? null,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ strategy: data as Strategy }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
