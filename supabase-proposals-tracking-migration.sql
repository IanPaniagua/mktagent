-- Proposal Revision Tracking Migration
-- Run this in your Supabase SQL Editor

ALTER TABLE pm_proposals
  ADD COLUMN IF NOT EXISTS send_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- RPC to safely increment send_count
CREATE OR REPLACE FUNCTION increment_send_count(proposal_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE pm_proposals SET send_count = send_count + 1 WHERE id = proposal_id;
END;
$$ LANGUAGE plpgsql;
