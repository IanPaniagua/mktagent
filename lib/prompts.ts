import { buildKnowledgeContext } from './knowledge/index';

export const SYSTEM_PROMPT = `You are MKTAGENT, an elite marketing intelligence AI with the expertise of a senior partner at McKinsey combined with a growth hacker who has scaled 50+ B2B startups. You analyze companies with surgical precision and produce actionable, specific, no-fluff marketing strategies.

Your analysis is always:
- Brutally honest about where the company actually is
- Specific to their budget, stage, and resources
- Prioritized — you always tell them what to do FIRST
- Data-driven from the actual content you've analyzed
- Realistic — no moonshot advice for early-stage companies

You output your analysis in clean Markdown with clear sections.`;

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

---

# YOUR ANALYSIS TASK

Based on ALL the information above, produce a comprehensive marketing intelligence report with these exact sections. Use the exact section headers below:

## 1. EXECUTIVE SUMMARY
Diagnose the company's current stage (not what they said, what the data shows). Identify the next realistic phase. List the top 3 immediate priorities.

## 2. COMPANY ANALYSIS
Analyze what they currently have: messaging quality, value prop clarity, positioning, brand voice, technical maturity (from repo if available). Identify gaps.

## 3. USER RESEARCH
Based on their product, messaging, and market positioning, define 2-3 detailed user personas. For each: demographics, psychographics, pain points, motivations, watering holes (where they find info online), and how to reach them.

## 4. COMPETITOR ANALYSIS
For each competitor analyzed, provide: their positioning strategy, strengths, weaknesses, pricing (if found), and content/marketing approach. Then identify 3-5 competitive gaps the company can exploit.

## 5. MARKETING STRATEGY
Given their budget of ${params.budget} and stage of ${params.stage}, provide:
- Top 3 recommended marketing channels with specific reasoning
- Content strategy (what to create, how often, in what format)
- Distribution strategy
- 90-day action plan broken into: Week 1-2, Week 3-4, Month 2, Month 3

## 6. BUDGET ALLOCATION
Break down their exact stated budget (${params.budget}/month) into specific channel allocations with percentages and monthly amounts. Format as a clear breakdown table.

Be specific. Be brutal. Be actionable. No generic advice. Reference the actual content you analyzed.`;
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
A cost-effective strategy focused on the highest-ROI actions. Specific, achievable, low-risk.
Summarize in 3-4 sentences. Be concrete about channels and tactics.

DIRECTION B — THE PREMIUM PATH (2-3x the budget):
An accelerated, more aggressive strategy for faster results. Higher investment, higher upside.
Summarize in 3-4 sentences. Be concrete about channels and tactics.

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

## Key Channels (Prioritized)
List 3-5 marketing channels in order of priority. For each: why this channel, expected impact, resource requirement.

## Month 1–3 Action Plan
### Month 1: Foundation
Specific weekly tasks and deliverables.

### Month 2: Execution
Scale what's working, cut what's not.

### Month 3: Optimization
Double down on winners, prepare for next phase.

## Expected Outcomes
Realistic projections: traffic, leads, conversions, brand metrics. Be specific to their stage.

## Success Metrics
5–7 specific KPIs to track. Each with target value and timeframe.

## Budget Breakdown
How the ${params.budget}/month gets allocated across channels.

Be brutally specific. Reference actual data from the report. No generic advice.

## Pricing Suggestion
Based on the scope of work, the company's stage (${params.stage}), their current budget (${params.budget}/month), and standard market rates for marketing consulting/execution in Europe, suggest a monthly retainer price range. Consider: junior agencies charge €800-1500/mo, mid-tier €1500-4000/mo, senior/specialist €4000-10000/mo. Factor in effort, channels involved, and expected results.

## Execution Budget Estimate
Separately from the consultant fee, estimate the monthly budget the client will need to actually execute this strategy — covering ads, tools, content creation, freelancers, etc. This is the real money the client spends on marketing execution, NOT the consultant's fee.

At the very end, output EXACTLY these four lines (nothing else on those lines):
PRICING_SUGGESTION: [min]-[max] EUR/month
PRICING_RATIONALE: [One sentence: why this range. Reference the stage, the channels involved, and the expected value delivered.]
EXECUTION_BUDGET_ESTIMATE: [min]-[max] EUR/month
EXECUTION_BUDGET_RATIONALE: [One sentence: breakdown of where this budget goes — e.g. ads, tools, content, freelancers.]

Example:
PRICING_SUGGESTION: 2000-3500 EUR/month
PRICING_RATIONALE: Given their MVP stage and focus on 2 high-effort channels (SEO + outbound), this mid-tier range reflects 15-20h/month of senior work with compounding returns from month 2 onwards.
EXECUTION_BUDGET_ESTIMATE: 1500-3000 EUR/month
EXECUTION_BUDGET_RATIONALE: Covers Google/LinkedIn ads (€800-1500), SEO tools + content writing (€400-800), and email platform (€100-200).

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
[2 short paragraphs. Start with the real problem the company has — not a generic diagnosis, something specific and uncomfortable they probably already know but haven't fixed. Then pivot to the opportunity. Be direct. No corporate language. This section should feel like advice from a trusted advisor, not a sales pitch. End with a single sentence that sets the stakes: what happens if they do nothing vs. what's possible if they act now.]

---

## What We're Going After

[A bold, confident statement of the ONE main goal for the next 90 days — expressed in business outcome terms, not marketing jargon. Then a short paragraph on why THIS goal, why NOW, why THIS approach for their specific situation.]

### The Numbers That Will Move
[Create a table with 4-6 specific, measurable KPIs. For each one: what we're measuring, the current estimated baseline, the 90-day target, and the business value of hitting that target (revenue impact, time saved, cost reduced). Be realistic but ambitious. Express value in money or time where possible.]

| Metric | Baseline | 90-Day Target | Business Value |
|--------|----------|---------------|----------------|
| [metric] | [now] | [target] | [€ or time impact] |

---

## The Payoff

[This section answers the client's real question: "What's in it for me?" Write 2-3 paragraphs about the concrete business outcomes — expressed in revenue, leads, time freed up, competitive position, or cost savings. Be specific about the ROI logic. Example: "For every €1 invested in this approach, companies at your stage typically see €3-5 back within 6 months." Make it tangible. Make it real. This is the emotional core of the proposal — the dream of what their business looks like when this works.]

---

## How We Get There

[NOT a task list. A narrative of the journey in 3 phases. Each phase has a name and a clear "by the end of this phase, you will have:" statement. Focus on what the client gains at each stage, not what we do.]

### Phase 1 — Foundation (Weeks 1–4)
**By the end of this phase:** [specific outcome the client can feel/measure]
[2-3 sentences on the approach]

### Phase 2 — Momentum (Weeks 5–8)
**By the end of this phase:** [specific outcome]
[2-3 sentences]

### Phase 3 — Acceleration (Weeks 9–12)
**By the end of this phase:** [specific outcome]
[2-3 sentences]

---

## The Investment

**${priceFormatted}/month** — 90-day engagement (strategy + execution management)
${execBudgetLine ? `\n${execBudgetLine}\n` : ''}
[One short paragraph: justify this number not by what we do, but by what they get. Reference the KPI targets. Frame the fee as a fraction of the expected return. Example: "If we hit the targets above, this engagement pays for itself in [X]. The question isn't whether you can afford this — it's whether you can afford to wait."]

What's included:
- [4-6 bullet points — describe deliverables in terms of outcomes, not hours. E.g. "A content machine that generates qualified leads while you sleep" not "8 blog posts/month"]

---

## Why Now

[1 tight paragraph. The cost of inaction. What the competitive window looks like. Why the timing is right for ${params.companyName} specifically. End with a direct, confident recommendation to move forward.]

---

*Prepared with care · ${month}*

---

TONE RULES:
- Write like a smart friend who happens to be an expert, not a consultant trying to sound impressive
- Every number must be specific and defensible
- Use "you/your" more than "we/our"
- No passive voice
- No phrases like "leverage synergies", "holistic approach", "value-added"
- Short sentences. Strong verbs.
- The client should feel seen, not sold to`;
}
