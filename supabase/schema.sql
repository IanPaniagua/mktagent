-- ─────────────────────────────────────────────────────────────────────────────
-- MKTAGENT — Supabase Schema
-- Run this SQL in the Supabase SQL editor to set up the database.
--
-- Tables:
--   companies  — one record per company being tracked
--   reports    — one record per analysis run, linked to a company
-- ─────────────────────────────────────────────────────────────────────────────

-- ── companies ─────────────────────────────────────────────────────────────────
create table if not exists companies (
  id                uuid        default gen_random_uuid() primary key,
  name              text        not null,
  industry          text,
  description       text,
  stage             text,
  mrr               text,
  budget            text,
  team_size         text,
  primary_goal      text,
  landing_page_url  text,
  github_url        text,
  competitors       text[]      default '{}',
  target_audience   text,
  pain_points       text,
  differentiation   text,
  status            text        default 'active'
                                check (status in ('active', 'monitoring', 'completed', 'paused')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  last_analyzed_at  timestamptz
);

-- ── reports ───────────────────────────────────────────────────────────────────
create table if not exists reports (
  id                   uuid        default gen_random_uuid() primary key,
  company_id           uuid        references companies(id) on delete cascade,
  executive_summary    text,
  company_analysis     text,
  user_research        text,
  competitor_analysis  text,
  marketing_strategy   text,
  budget_allocation    text,
  input_tokens         integer     default 0,
  output_tokens        integer     default 0,
  total_cost           numeric(10,6) default 0,
  created_at           timestamptz default now()
);

-- ── indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_reports_company_id
  on reports(company_id);

create index if not exists idx_reports_created_at
  on reports(created_at desc);

create index if not exists idx_companies_last_analyzed_at
  on companies(last_analyzed_at desc nulls last);

create index if not exists idx_companies_created_at
  on companies(created_at desc);

-- ── auto-update updated_at trigger ────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger companies_updated_at
  before update on companies
  for each row execute function update_updated_at();

-- ── pause columns (idempotent) ─────────────────────────────────────────────────
alter table companies add column if not exists pause_reason text;
alter table companies add column if not exists paused_at timestamptz;

-- ── strategies ────────────────────────────────────────────────────────────────
create table if not exists strategies (
  id              uuid        default gen_random_uuid() primary key,
  company_id      uuid        references companies(id) on delete cascade,
  report_id       uuid        references reports(id) on delete set null,
  name            text        not null,
  description     text,
  status          text        default 'active'
                              check (status in ('active', 'completed', 'abandoned')),
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  results         text,
  created_at      timestamptz default now()
);

create index if not exists idx_strategies_company_id on strategies(company_id);
create index if not exists idx_strategies_status on strategies(status);
