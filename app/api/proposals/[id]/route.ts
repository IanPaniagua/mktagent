import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Proposal, ProposalStatus } from '@/lib/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables not configured.');
  return createClient(url, key);
}

// GET /api/proposals/[id]
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
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    return NextResponse.json({ proposal: data as Proposal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/proposals/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = (await request.json()) as Partial<Proposal> & { status?: ProposalStatus };

    // Build the update payload
    const updateData: Record<string, unknown> = { ...body };

    // Set timestamps based on status transitions
    if (body.status === 'sent' && !body.sent_at) {
      updateData.sent_at = new Date().toISOString();
    }
    if (body.status === 'accepted' && !body.accepted_at) {
      updateData.accepted_at = new Date().toISOString();
    }
    if (body.status === 'closed' && !body.closed_at) {
      updateData.closed_at = new Date().toISOString();
    }

    const { data: proposal, error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update company status based on proposal status
    if (body.status) {
      let companyStatus: string | null = null;
      if (body.status === 'sent') companyStatus = 'proposal_sent';
      if (body.status === 'accepted') companyStatus = 'offer_accepted';
      if (body.status === 'closed') companyStatus = 'completed';
      if (body.status === 'rejected') companyStatus = 'active';

      if (companyStatus && proposal?.company_id) {
        await supabase
          .from('companies')
          .update({ status: companyStatus })
          .eq('id', proposal.company_id);
      }
    }

    return NextResponse.json({ proposal: proposal as Proposal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
