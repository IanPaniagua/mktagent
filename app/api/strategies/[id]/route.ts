import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Strategy, StrategyStatus } from '@/lib/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables not configured.');
  return createClient(url, key);
}

// PATCH /api/strategies/[id] — update a strategy
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = (await request.json()) as Partial<Pick<Strategy, 'status' | 'results' | 'name' | 'description' | 'completed_at'>>;

    const updates: Record<string, unknown> = { ...body };

    // Auto-set completed_at when finishing
    if (
      body.status === 'completed' ||
      body.status === 'abandoned'
    ) {
      if (!body.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('strategies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ strategy: data as Strategy });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/strategies/[id] — delete a strategy
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
