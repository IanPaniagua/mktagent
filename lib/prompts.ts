import { buildKnowledgeContext } from './knowledge/index';

export const SYSTEM_PROMPT = `You are the Marketing Intelligence AI for GrowthOS, specialized in building converting funnels that maximize ROI for B2B companies. You combine the analytical precision of a growth marketer with the strategic depth of a senior partner who has scaled 50+ SaaS companies.

You operate AFTER the PM phase and Head of Growth approval — meaning the product foundation has been assessed and unit economics are viable. Your job is to build the marketing machine that maximizes return on every euro spent.

You are deeply trained in:

**AARRR (Pirate Metrics) — Converting Funnels**
You design marketing funnels stage by stage:
- **Awareness**: SEO, content, social, paid — how do the right people discover this product?
- **Acquisition**: landing pages, CTAs, lead magnets, trials — how do you get them in the door?
- **Activation**: onboarding sequences, in-app messaging, email — how do they reach the "aha moment"?
- **Retention**: lifecycle emails, product habits, success metrics — how do you keep them?
- **Referral**: referral programs, case studies, communities — how do users become advocates?
- **Revenue**: upgrade funnels, expansion triggers, pricing page optimization — how do you monetize?

You never recommend a channel without designing the full funnel that channel feeds into. A LinkedIn ad without an activation sequence is a waste of budget.

**Channel-Funnel Thinking**
For every recommended channel you define:
- The entry point (how users enter the funnel)
- The nurture sequence (what happens after entry)
- The conversion mechanism (what converts them)
- The retention hook (what keeps them)
- The revenue trigger (what causes expansion/upgrade)

**Stage-Appropriate Strategy**
- Pre-PMF → focus on Activation/Retention before Acquisition
- Early PMF → 1-2 channels max, nail the funnel before scaling
- Growth → diversify channels, optimize CAC/LTV, build referral loops

**ROI Maximization Framework**
Every channel recommendation is evaluated on:
- **Expected CAC** (Customer Acquisition Cost): what it costs to acquire one paying customer via this channel
- **LTV:CAC ratio**: must be ≥ 3:1 to recommend a channel. Below 2:1, reject it.
- **Payback period**: how many months to recover CAC from gross margin. Under 12 months = prioritize, 12–18 = secondary, 18+ = avoid at early stage
- **90-day ROI**: realistic revenue return on the proposed monthly spend over 3 months
- **Marginal ROI**: which additional €100/month of budget produces the highest incremental return

You always rank channels by ROI, not by brand awareness or "reach". The highest-ROI channel gets the most budget. Low-ROI channels are cut, not balanced.

**Your output is always:**
- ROI-justified: every channel recommendation includes a CAC estimate and LTV:CAC ratio
- Specific to their budget, stage, and team size
- Grounded in the actual company data and PM Brief you analyzed
- Funnel-focused, not tactic-focused
- Immediately usable by the consultant in a client meeting

You output in clean Markdown with the exact section headers specified.`;

export function buildSystemPrompt(): string {
  const knowledgeContext = buildKnowledgeContext();
  if (!knowledgeContext) {
    return SYSTEM_PROMPT;
  }
  return `${SYSTEM_PROMPT}

---

${knowledgeContext}`;
}

export function buildAnalysisPrompt(params: {
  companyName: string;
  industry: string;
  description: string;
  stage: string;
  mrr: string;
  budget: string;
  teamSize: string;
  primaryGoal: string;
  targetAudience: string;
  painPoints: string;
  differentiation: string;
  landingPageContent: string;
  githubContent: string;
  documentsContent: string;
  competitorContents: Array<{ name: string; content: string }>;
  pmBriefContext?: string;
}): string {
  const competitorSection = params.competitorContents.length > 0
    ? params.competitorContents.map(c => `### ${c.name}\n${c.content || 'No content scraped.'}`).join('\n\n')
    : 'No competitors provided.';

  return `# Company Intelligence Brief

## Company Profile
- **Name**: ${params.companyName}
- **Industry**: ${params.industry}
- **Description**: ${params.description}
- **Stage**: ${params.stage}
- **MRR/ARR**: ${params.mrr}
- **Monthly Marketing Budget**: ${params.budget}
- **Team Size**: ${params.teamSize}
- **Primary Goal**: ${params.primaryGoal}
- **Target Audience**: ${params.targetAudience}
- **Pain Points Solved**: ${params.painPoints}
- **Differentiation**: ${params.differentiation}

## Landing Page Content
${params.landingPageContent || 'No landing page content available.'}

## GitHub Repository
${params.githubContent || 'No GitHub repository provided or content unavailable.'}

## Internal Documents
${params.documentsContent || 'No internal documents provided.'}

## Competitor Intelligence
${competitorSection}

${params.pmBriefContext ? `## Product Intelligence Brief (from PMCORE — use this to align all marketing decisions)
${params.pmBriefContext}

**Key instructions:** Use the ICP from PMCORE for user personas. Use the AARRR Assessment to identify the weakest funnel stage. Use the PMF Assessment to calibrate channel ambition. Use the Early Validation Plan to inform testing. Do not recommend channels that contradict the Pre-Marketing Needs.

` : ''}---

# YOUR ANALYSIS TASK

Produce a comprehensive marketing intelligence report with these exact sections:

## 1. EXECUTIVE SUMMARY
Diagnose the company's current marketing-ready stage (based on PM Brief if available, otherwise data). Identify the next realistic marketing phase. List the top 3 immediate priorities. If a PM Brief is available, summarize how it shapes the marketing strategy.

## 2. COMPANY ANALYSIS
Analyze what they currently have: messaging quality, value prop clarity, positioning, brand voice, technical maturity. Reference the PM Brief's Value Proposition Gaps and Positioning sections if available. Identify the top 3 marketing readiness gaps.

## 3. USER RESEARCH
Define 2-3 detailed user personas grounded in the PM ICP (if available). For each: demographics, psychographics, JTBD alignment, pain points, watering holes (where they find info online), and primary message that will resonate. Identify which persona to target FIRST and why.

## 4. COMPETITOR ANALYSIS
For each competitor analyzed: their positioning strategy, strengths, weaknesses, pricing (if found), and funnel approach. Then identify 3-5 specific competitive gaps this company can own — be specific about what content, channel, or message is uncontested.

## 5. AARRR FUNNEL STRATEGY
Design the complete AARRR funnel for this company at their current stage and budget (${params.budget}/month):

**Awareness** — How the right people discover this company
- Recommended channels (max 2-3 at ${params.stage} stage)
- Specific content types and messaging angles
- Expected reach timeline

**Acquisition** — How visitors become leads/trials
- Landing page strategy and primary CTA
- Lead magnet or trial offer
- Target conversion rate

**Activation** — How new users reach the "aha moment"
- Define the specific "aha moment" for this product
- Onboarding sequence (Day 0, Day 3, Day 7, Day 14)
- Activation metric to track

**Retention** — How to keep users engaged
- Lifecycle email strategy (triggers, cadence, content)
- In-product retention hooks
- Churn intervention triggers

**Referral** — How satisfied users become advocates
- Referral mechanism (if ready)
- Case study / testimonial strategy
- Community play (if applicable)

**Revenue** — How to monetize and expand
- Upgrade trigger and pricing page strategy
- Expansion revenue opportunities
- CAC/LTV target at this stage

## 6. CHANNEL STRATEGY & CONVERTING FUNNELS
For each recommended channel (max 3), define the full converting funnel:

**Channel [Name]**
- Entry: [how users enter from this channel]
- Hook: [what captures attention]
- Nurture: [what happens after entry — emails, retargeting, content]
- Convert: [specific CTA and offer]
- Retain: [handoff to retention]
- Metrics: [what to track for this channel's funnel]

## 7. ROI PROJECTIONS
Model the expected return on marketing investment for this company:

**Unit Economics Baseline**
| Metric | Estimate | Basis |
|--------|----------|-------|
| Estimated LTV | €/$ | [pricing × avg lifetime] |
| Target CAC (LTV÷3) | €/$ | |
| Current estimated CAC | €/$ | [if data available] |
| Gross margin % | % | [estimated from stage/industry] |
| Payback period | X months | |

**Channel ROI Comparison**
| Channel | Est. CAC | LTV:CAC | 90-day leads | 90-day revenue | ROI% |
|---------|----------|---------|-------------|----------------|------|
| [Ch 1] | €/$ | X:1 | X | €/$ | X% |
| [Ch 2] | €/$ | X:1 | X | €/$ | X% |
| [Ch 3] | €/$ | X:1 | X | €/$ | X% |

**ROI Verdict**: which channel wins and why. What is the projected 90-day total ROI on the full ${params.budget}/month budget? Express as: "Investing ${params.budget}/month should generate €/$ X in new revenue within 90 days, representing a X% ROI."

Flag any channel where projected CAC > LTV and recommend cutting it.

## 8. BUDGET ALLOCATION
Break down their exact stated budget (${params.budget}/month) ranked by ROI — highest-return channels get the most budget. Format as a table:

| Funnel Stage | Channel/Activity | Monthly Budget | % | Est. CAC | LTV:CAC | Expected Output |
|---|---|---|---|---|---|---|
| Awareness | ... | €/$ | % | €/$ | X:1 | ... |
| Acquisition | ... | €/$ | % | €/$ | X:1 | ... |
| Activation | ... | €/$ | % | — | — | ... |
| Retention | ... | €/$ | % | — | — | ... |
| Referral | ... | €/$ | % | — | — | ... |
| Revenue | ... | €/$ | % | — | — | ... |

Include a 90-day action plan: Week 1-2, Week 3-4, Month 2, Month 3. Each milestone should include an expected ROI checkpoint.

Be specific. Be brutal. Be ROI-focused. Reference the actual content you analyzed. No generic advice.`;
}

// ─── Directions prompt ────────────────────────────────────────────────────────

export function buildDirectionsPrompt(params: {
  companyName: string;
  budget: string;
  stage: string;
  reportSummary: string;
}): string {
  return `Based on the marketing analysis report below for ${params.companyName} (${params.stage} stage, budget: ${params.budget}/month), suggest TWO clear strategic directions:

DIRECTION A — THE LEAN PATH (fits budget: ${params.budget}/month):
A cost-effective strategy focused on the highest-ROI AARRR funnel actions. Specific, achievable, low-risk.
Summarize in 3-4 sentences. Be concrete about which funnel stages and channels to prioritize.

DIRECTION B — THE PREMIUM PATH (2-3x the budget):
An accelerated, more aggressive strategy for faster funnel results. Higher investment, higher upside.
Summarize in 3-4 sentences. Be concrete about channels and funnel acceleration tactics.

Format EXACTLY as:
DIRECTION_A: [text]
DIRECTION_B: [text]

---
REPORT SUMMARY:
${params.reportSummary}`;
}

// ─── Strategy plan prompt ─────────────────────────────────────────────────────

export function buildStrategyPlanPrompt(params: {
  companyName: string;
  chosenDirection: string;
  userInput: string;
  budget: string;
  stage: string;
  reportSummary: string;
}): string {
  const directionContext = params.userInput
    ? `Custom direction from client: ${params.userInput}`
    : `Chosen direction: ${params.chosenDirection}`;

  return `You are building a detailed marketing strategy plan for ${params.companyName}.

${directionContext}

Company stage: ${params.stage}
Monthly budget: ${params.budget}

Based on the analysis report and chosen direction, produce a comprehensive strategy plan in markdown with these sections:

## Objective
What we're trying to achieve and why it matters for this company specifically.

## ROI Priority
State the target LTV:CAC ratio and payback period for this engagement. Which funnel stage, if optimized, produces the highest ROI? What is the projected 90-day ROI on the full budget?

## AARRR Funnel Priority
Which funnel stage is the primary focus and why. What must be working before moving to the next stage.

## Key Channels (Prioritized)
List 2-3 marketing channels in order of priority. For each: why this channel, the full funnel it feeds, expected impact, resource requirement.

## Month 1–3 Action Plan
### Month 1: Foundation & Funnel Setup
Build the funnel infrastructure. Specific weekly deliverables.

### Month 2: Launch & Learn
Traffic on. Measure every funnel stage. Cut what's not working.

### Month 3: Optimize & Scale
Double down on the highest-converting funnel stage. Prepare next phase.

## Expected Outcomes
Realistic projections per AARRR stage: awareness reach, acquisition rate, activation %, retention %, referral rate, revenue impact. Be specific to their stage and budget.

## Success Metrics
6-8 specific KPIs covering all AARRR stages. Each with baseline, target, and timeframe.

## Budget Breakdown
How the ${params.budget}/month gets allocated across the funnel stages and channels.

Be brutally specific. Reference actual data from the report. No generic advice.

## Pricing Suggestion
Based on the scope of work, the company's stage (${params.stage}), their current budget (${params.budget}/month), and standard market rates for marketing consulting/execution in Europe, suggest a monthly retainer price range. Consider: junior agencies charge €800-1500/mo, mid-tier €1500-4000/mo, senior/specialist €4000-10000/mo. Factor in effort, channels involved, and expected results.

## Execution Budget Estimate
Separately from the consultant fee, estimate the monthly budget the client will need to actually execute this strategy — covering ads, tools, content creation, freelancers, etc.

At the very end, output EXACTLY these four lines (nothing else on those lines):
PRICING_SUGGESTION: [min]-[max] EUR/month
PRICING_RATIONALE: [One sentence: why this range.]
EXECUTION_BUDGET_ESTIMATE: [min]-[max] EUR/month
EXECUTION_BUDGET_RATIONALE: [One sentence: breakdown of where this budget goes.]

---
REPORT SUMMARY:
${params.reportSummary}`;
}

// ─── Client proposal prompt ───────────────────────────────────────────────────

export function buildProposalPrompt(params: {
  companyName: string;
  strategyPlan: string;
  budget: string;
  proposedPrice: number;
  currency: string;
  executionBudgetMin?: number | null;
  executionBudgetMax?: number | null;
}): string {
  const currencySymbol = params.currency === 'EUR' ? '€' : params.currency === 'GBP' ? '£' : '$';
  const priceFormatted = `${currencySymbol}${params.proposedPrice.toLocaleString()}`;
  const execBudgetLine = params.executionBudgetMin && params.executionBudgetMax
    ? `**Estimated execution budget: ${currencySymbol}${params.executionBudgetMin.toLocaleString()}–${currencySymbol}${params.executionBudgetMax.toLocaleString()}/month** (ad spend, tools, content — paid directly by you to platforms/vendors, separate from this fee)`
    : null;

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return `You are a senior consultant writing a client proposal for ${params.companyName}.

This is NOT a task list. This is a sales document. It must make the client feel understood, excited, and confident. The goal is for them to read this and think: "These people get us. We need to work with them."

Use this strategy plan as your foundation (do NOT copy it literally — translate it into business outcomes):
${params.strategyPlan}

---

Write the proposal in markdown using EXACTLY this structure:

# Growing ${params.companyName}: A 90-Day Marketing Strategy
### Prepared ${month} · Investment: ${priceFormatted}/month

---

## The Honest Truth
[2 short paragraphs. Start with the real problem the company has — not a generic diagnosis, something specific and uncomfortable they probably already know but haven't fixed. Then pivot to the opportunity. Be direct. No corporate language. End with a single sentence that sets the stakes: what happens if they do nothing vs. what's possible if they act now.]

---

## What We're Going After

[A bold, confident statement of the ONE main goal for the next 90 days — expressed in business outcome terms, not marketing jargon. Then a short paragraph on why THIS goal, why NOW, why THIS approach for their specific situation.]

### The Numbers That Will Move
[Create a table with 4-6 specific, measurable KPIs covering the AARRR funnel. For each: metric, baseline, 90-day target, business value.]

| Metric | Funnel Stage | Baseline | 90-Day Target | Business Value |
|--------|-------------|----------|---------------|----------------|
| [metric] | [AARRR stage] | [now] | [target] | [€ or time impact] |

---

## The Payoff

[2-3 paragraphs about the concrete business outcomes. Express in revenue, leads, time freed up, competitive position. Include the ROI logic. Make it tangible.]

---

## How We Get There

### Phase 1 — Funnel Foundation (Weeks 1–4)
**By the end of this phase:** [specific outcome the client can feel/measure]
[2-3 sentences on the approach]

### Phase 2 — Traffic & Learn (Weeks 5–8)
**By the end of this phase:** [specific outcome]
[2-3 sentences]

### Phase 3 — Scale What Works (Weeks 9–12)
**By the end of this phase:** [specific outcome]
[2-3 sentences]

---

## The Investment

**${priceFormatted}/month** — 90-day engagement (strategy + execution management)
${execBudgetLine ? `\n${execBudgetLine}\n` : ''}
[One short paragraph: justify this number by what they get, not what we do. Reference the KPI targets. Frame the fee as a fraction of the expected return.]

What's included:
- [4-6 bullet points — deliverables as outcomes, not hours]

---

## Why Now

[1 tight paragraph. The cost of inaction. The competitive window. Why the timing is right for ${params.companyName} specifically. End with a direct, confident recommendation to move forward.]

---

*Prepared with care · ${month}*

---

TONE RULES:
- Write like a smart friend who happens to be an expert
- Every number must be specific and defensible
- Use "you/your" more than "we/our"
- No passive voice, no jargon
- Short sentences. Strong verbs.
- The client should feel seen, not sold to`;
}
