-- PM Briefs table
-- Run this in your Supabase SQL Editor to add PM Agent support

CREATE TABLE IF NOT EXISTS pm_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- PM Brief sections (output from PMCORE)
  product_clarity TEXT,
  icp TEXT,
  jobs_to_be_done TEXT,
  pmf_assessment TEXT,
  positioning TEXT,
  value_prop_gaps TEXT,
  pre_marketing_needs TEXT,
  quick_marketing_wins TEXT,
  recommended_pm_actions TEXT,

  -- Status & metadata
  status TEXT NOT NULL DEFAULT 'complete',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast company lookup
CREATE INDEX IF NOT EXISTS pm_briefs_company_id_idx ON pm_briefs(company_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_pm_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pm_briefs_updated_at_trigger
  BEFORE UPDATE ON pm_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_pm_briefs_updated_at();
