import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: review, error } = await supabase
    .from('growth_reviews')
    .select('*, companies(id, name, industry, stage)')
    .eq('id', id)
    .single();

  if (error || !review) {
    return Response.json({ error: 'Growth review not found' }, { status: 404 });
  }

  return Response.json({ review });
}
