# GrowthOS — Project Reference

## What This Is

GrowthOS is an AI-powered growth intelligence platform built for marketing consultants and growth agencies. It analyzes real companies using structured AI agents and produces client-ready deliverables — PM briefs, growth reviews, and marketing strategies with funnels.

The platform runs a sequential 4-phase growth loop:

```
[PM Agent] → [Head of Growth] → [MKT Agent] → [Results Review]
              ↑___________go-back loops____________________|
```

## Who Uses This

A consultant or agency uses GrowthOS to onboard a client company, run the full analysis pipeline, get deliverable documents to propose to the client, track results, and loop back with data.

The "client" = the company being analyzed (e.g., a SaaS startup).
The "user" = the consultant running GrowthOS on behalf of that company.

---

## The 4-Phase Growth Loop

### Phase 1 — PM Agent (PMCORE)
**Goal:** Understand the product deeply before any marketing spend.

Runs first. Scrapes landing page, GitHub, and uploaded documents (PRD, research, roadmap). Calls Claude to produce a **13-section PM Brief**.

**PM Brief sections:**
1. Product Clarity — what the product does, for whom, core problem solved
2. Vision & Strategic North Star — long-term vision, 3-year goal, strategic bets
3. OKRs — Objectives & Key Results (2-3 OKRs for next quarter)
4. ICP — Ideal Customer Profile (specific, named, with trigger events)
5. Jobs-to-be-Done — functional, emotional, social jobs
6. PMF Assessment — where on the PMF spectrum, signals present/missing
7. AARRR Assessment — current state of each pirate metric
8. Early Validation Plan — what hypotheses to test, how, with what metrics
9. Positioning — category, differentiation, messaging alignment
10. Value Proposition Gaps — what's missing between value and messaging
11. Pre-Marketing Needs — what to fix before acquiring users
12. Client Deliverables — concrete things the consultant can deliver to the company
13. Recommended PM Actions — specific next steps

Saves scraped content (landing page, GitHub) to Supabase alongside the brief — this is reused by downstream agents to avoid duplicate scraping.

**Output:** PM Brief stored in `pm_briefs` table. Includes client-ready deliverables.

---

### Phase 2 — Head of Growth (HoG)
**Goal:** Act as the strategic gatekeeper between PM and marketing.

Reads the PM Brief. Makes a **Go / No-Go decision** on whether the company is ready for marketing spend. Assesses the AARRR health of the business. Produces a growth readiness report.

**If No-Go:** Outputs a prioritized PM work list the company must complete first.
**If Go:** Outputs a growth hypothesis and brief for the MKT Agent.

After MKT results are in, HoG also reviews results and recommends: stay in MKT, or return to PM for a deeper product loop.

Stored in `growth_reviews` table.

**Key principle:** HoG prevents wasted ad spend on broken funnels. It's the intelligence layer that connects product readiness with marketing execution.

---

### Phase 3 — MKT Agent
**Goal:** Create converting funnels, not generic marketing plans.

Receives: PM Brief (structured context) + HoG approval + shared scraped data (no re-scraping landing/GitHub).
Only scrapes: competitor sites (MKT-specific).

Produces a **7-section Marketing Report** focused on AARRR-based funnels:
1. Executive Summary
2. Company Analysis
3. User Research (personas grounded in PM ICP)
4. Competitor Analysis
5. AARRR Funnel Strategy — funnel design per stage (Awareness→Revenue)
6. Channel Strategy & Converting Funnels — specific funnels per channel
7. Budget Allocation

**Output:** Marketing report + strategy plan + client proposal with KPIs.

---

### Phase 4 — Results Review
**Goal:** Track what happened, decide what's next.

KPIs are tracked against actuals. HoG reviews results and recommends:
- **Continue MKT:** double down on what's working
- **Return to PM:** product iteration needed before more spend
- **Scale:** increase budget, add channels

---

## Agent Identities

| Agent | Name | Model | Role |
|-------|------|-------|------|
| PM Agent | PMCORE | claude-sonnet-4-6 | Product intelligence, validation |
| Head of Growth | HoG | claude-sonnet-4-6 | Strategic gatekeeper, synthesizer |
| MKT Agent | MKTAGENT | claude-sonnet-4-6 | Marketing strategy, funnels |

---

## Core PM Frameworks Used

**AARRR (Pirate Metrics)** — Dave McClure's framework. Every product is assessed on:
- **Awareness** — do people know you exist?
- **Acquisition** — can you get users in the door?
- **Activation** — do they have their "aha moment"?
- **Retention** — do they come back?
- **Referral** — do they tell others?
- **Revenue** — do they pay / expand?

**OKRs** — Objectives & Key Results. Each objective is ambitious but clear. Each KR is measurable. Max 3 OKRs per quarter.

**Jobs-to-be-Done (JTBD)** — "When [situation], I want to [motivation], so I can [outcome]." Drives ICP precision and messaging.

**PMF Spectrum** — Idea / MVP / Pre-PMF / Early PMF / Growth. No product gets marketing budget before Early PMF signals exist.

**Early Validation** — Before building or spending, define the hypothesis, the test, the metric, and the decision rule. Inspired by lean startup / continuous discovery.

---

## Technical Architecture

### Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (SSE for streaming)
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude via `@anthropic-ai/sdk`

### Key Files
```
lib/
  pm-agent.ts          # PMCORE — runs PM analysis, returns scraped data
  pm-prompts.ts        # PMCORE system prompt + 13-section analysis prompt
  growth-agent.ts      # Head of Growth — reads PM brief, makes go/no-go
  growth-prompts.ts    # HoG system prompt + review prompt
  agent.ts             # MKTAGENT — runs marketing analysis, reuses scraped data
  prompts.ts           # MKTAGENT system prompt + AARRR funnel prompt
  types.ts             # All TypeScript types

app/api/
  companies/[id]/pm-analysis/route.ts   # SSE: PM analysis
  growth-review/route.ts                # SSE: HoG review
  analyze/route.ts                      # SSE: MKT analysis

supabase/
  schema.sql                            # Full DB schema
  supabase-pm-migration.sql             # pm_briefs table
  supabase-growth-migration.sql         # growth_reviews + new pm_briefs columns
```

### Database Tables
- `companies` — client company records
- `pm_briefs` — PMCORE output (13 sections + scraped cache)
- `growth_reviews` — HoG decisions and reviews
- `reports` — MKTAGENT output (7 sections)
- `proposals` — client proposals with KPIs
- `strategies` — active growth strategies

### Shared Scraping
PM Agent scrapes landing page and GitHub, saves content to `pm_briefs` (`scraped_landing_page`, `scraped_github` columns). MKT Agent and HoG reuse this data — they do NOT re-scrape those URLs. MKT Agent only scrapes competitor sites (its unique data source). Re-scraping happens only if pm_brief data is older than 7 days or explicitly requested.

---

## Business Model Context

GrowthOS is used by growth consultants to:
1. Onboard a new client company
2. Run the PM → HoG → MKT pipeline
3. Get client-ready deliverable documents (PM brief, growth review, marketing proposal)
4. Propose and close an engagement
5. Execute, track KPIs, loop back

The consultant is the paying user. The company is the client. Every output should be immediately usable in a client meeting.

---

## Key Principles

- **Product before marketing.** Never recommend marketing spend on a broken funnel.
- **Deliverables first.** Every phase produces something the consultant can hand to the client.
- **Validate early.** Use AARRR signals and early validation to guide decisions, not gut feel.
- **Specific over generic.** Name real companies, real job titles, real channels, real numbers.
- **Honest over diplomatic.** Call out PMF gaps. Don't promote a Pre-PMF product to "ready for growth."
- **Loop, don't linear.** Growth is a loop: PM → HoG → MKT → Results → repeat.
