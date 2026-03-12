import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PMProposal } from '@/lib/types';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json() as {
      pm_brief_id: string;
      company_id: string;
      direction_fix_first?: string;
      direction_quick_start?: string;
      chosen_direction?: string;
      user_input?: string;
    };

    const { data, error } = await supabase
      .from('pm_proposals')
      .insert({
        pm_brief_id: body.pm_brief_id,
        company_id: body.company_id,
        direction_fix_first: body.direction_fix_first ?? null,
        direction_quick_start: body.direction_quick_start ?? null,
        chosen_direction: body.chosen_direction ?? null,
        user_input: body.user_input ?? null,
        currency: 'EUR',
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ proposal: data as PMProposal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
