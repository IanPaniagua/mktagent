import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CompanyRecord, CompanyStatus } from '@/lib/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables not configured.');
  }
  return createClient(url, key);
}

// GET /api/companies/[id] — get one company with all reports
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (companyError) throw companyError;
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    if (reportsError) throw reportsError;

    return NextResponse.json({
      company: company as CompanyRecord,
      reports: reports ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/companies/[id] — update company fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = (await request.json()) as Partial<CompanyRecord & { status: CompanyStatus }>;

    const { data: company, error } = await supabase
      .from('companies')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/companies] Supabase error:', JSON.stringify(error));
      throw error;
    }

    return NextResponse.json({ company: company as CompanyRecord });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PATCH /api/companies] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/companies/[id] — delete company (cascade deletes reports)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
