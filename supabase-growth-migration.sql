-- Growth System Migration
-- Run this in your Supabase SQL Editor after supabase-pm-migration.sql

-- ─── 1. Add new columns to pm_briefs ─────────────────────────────────────────

ALTER TABLE pm_briefs
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS okrs TEXT,
  ADD COLUMN IF NOT EXISTS aarrr_assessment TEXT,
  ADD COLUMN IF NOT EXISTS early_validation TEXT,
  ADD COLUMN IF NOT EXISTS client_deliverables TEXT,
  ADD COLUMN IF NOT EXISTS scraped_landing_page TEXT,
  ADD COLUMN IF NOT EXISTS scraped_github TEXT;

-- ─── 2. Create growth_reviews table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS growth_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pm_brief_id UUID REFERENCES pm_briefs(id) ON DELETE SET NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,

  -- Phase: 'post-pm' = after PM analysis, 'post-mkt' = after marketing cycle
  phase TEXT NOT NULL DEFAULT 'post-pm' CHECK (phase IN ('post-pm', 'post-mkt')),

  -- Review sections
  growth_readiness TEXT,
  aarrr_health_check TEXT,
  roi_assessment TEXT,
  decision TEXT NOT NULL DEFAULT 'no-go' CHECK (decision IN ('go', 'no-go')),
  pm_priority_work TEXT,
  growth_hypothesis TEXT,
  next_phase_recommendation TEXT,

  -- Token usage & cost
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS growth_reviews_company_id_idx ON growth_reviews(company_id);
CREATE INDEX IF NOT EXISTS growth_reviews_pm_brief_id_idx ON growth_reviews(pm_brief_id);
CREATE INDEX IF NOT EXISTS growth_reviews_decision_idx ON growth_reviews(decision);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_growth_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER growth_reviews_updated_at_trigger
  BEFORE UPDATE ON growth_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_growth_reviews_updated_at();

-- ─── 3. Add growth_review_id to companies for quick latest-review lookup ─────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS latest_growth_review_id UUID REFERENCES growth_reviews(id) ON DELETE SET NULL;
