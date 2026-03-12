import { buildPMKnowledgeContext } from './pm-knowledge/index';

export const PM_SYSTEM_PROMPT = `You are PMCORE, an elite Product Management intelligence AI with the expertise of a senior PM who has worked at Stripe, Notion, and Figma. You analyze products with brutal clarity — identifying PMF signals, ICP precision, and product-market positioning gaps that most teams miss.

Your analysis is always:
- Grounded in proven frameworks (JTBD, ICP, PMF signals, Value Prop Canvas)
- Honest about where the product actually is vs. where the founder thinks it is
- Referenced in real case studies — you cite what actually worked at Notion, Slack, Stripe, Figma, Intercom, and Linear
- Specific to their stage — you don't give Scale advice to Pre-PMF products
- Actionable — every section ends with 2-3 concrete next steps

You output in clean Markdown with the exact section headers specified.`;

export function buildPMSystemPrompt(): string {
  const knowledgeContext = buildPMKnowledgeContext();
  if (!knowledgeContext) return PM_SYSTEM_PROMPT;
  return `${PM_SYSTEM_PROMPT}

---

${knowledgeContext}`;
}

export function buildPMAnalysisPrompt(params: {
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
  additionalContext: string;
}): string {
  return `# Product Intelligence Input

## Company Profile
- **Name**: ${params.companyName}
- **Industry**: ${params.industry}
- **Description**: ${params.description}
- **Stage**: ${params.stage}
- **MRR/ARR**: ${params.mrr}
- **Team Size**: ${params.teamSize}
- **Primary Goal**: ${params.primaryGoal}
- **Target Audience**: ${params.targetAudience}
- **Pain Points Solved**: ${params.painPoints}
- **Differentiation**: ${params.differentiation}

## Landing Page Content
${params.landingPageContent || 'No landing page content available.'}

## GitHub Repository
${params.githubContent || 'No GitHub repository provided or content unavailable.'}

## Internal Documents (PRD, research, roadmap)
${params.documentsContent || 'No documents provided.'}

## Additional Context from Founder
${params.additionalContext || 'No additional context provided.'}

---

# YOUR ANALYSIS TASK

Based on ALL the information above, produce a Product Intelligence Brief with these exact sections. Use the exact section headers below:

## 1. PRODUCT CLARITY
In plain language: what this product does, who it's for, and the core problem it solves. Assess whether the product's purpose is clear from the available data. Flag any ambiguity. Identify the single most important thing the product helps customers accomplish.

## 2. ICP (IDEAL CUSTOMER PROFILE)
Define the precise ideal customer: company size, role/title, industry, current situation, trigger event that makes them look for this solution, and estimated budget. Be specific — name a real company type and real job title. Evaluate whether the current target audience definition is too broad, too narrow, or correctly scoped.

## 3. JOBS-TO-BE-DONE
Identify 2-3 core jobs customers hire this product to do. For each job: the functional job statement ("When [situation], I want to [motivation], so I can [outcome]"), the emotional job (how they want to feel), and the social job (how they want to be perceived). Identify what solution they're currently using (or not using) to do this job.

## 4. PMF ASSESSMENT
Diagnose where this product sits on the PMF spectrum: Idea / MVP / Pre-PMF / Early PMF / Growth. What signals of PMF exist? What signals are missing? What one thing, if improved, would most accelerate PMF? Be honest — don't promote a Pre-PMF product to Early PMF without evidence.

## 5. POSITIONING
Assess the current positioning: What category does this product compete in? What's the competitive alternative (not just direct competitors — include spreadsheets, manual processes, etc.)? What is the single strongest differentiator? Is the current messaging aligned with this differentiator? Suggest a sharper positioning angle if the current one is weak.

## 6. VALUE PROPOSITION GAPS
Analyze the gap between the actual value the product delivers and how it's currently communicated. Identify 2-3 specific gaps: things the product does that the messaging doesn't say, or things the messaging promises that the product doesn't deliver. Give a concrete rewrite suggestion for the most important headline or tagline.

## 7. PRE-MARKETING NEEDS
List what must be built, fixed, or established BEFORE spending on marketing acquisition. Prioritize ruthlessly. Format as a checklist with priority (Critical / Important / Nice-to-have). Focus on: website clarity, onboarding flow, retention mechanism, analytics/tracking, social proof.

## 8. QUICK MARKETING WINS
What marketing activities can start NOW in parallel with product improvements? These should be low-cost, high-learning activities. Typical examples: founder content on LinkedIn, customer interviews for testimonials, SEO foundation (not content yet), community presence. Be specific about which 2-3 to start this week.

## 9. RECOMMENDED PM ACTIONS
What specific PM-level work should happen before the full marketing strategy is executed? This might include: a website redesign, an onboarding flow fix, a referral mechanism, a pricing page update, a customer success workflow, or a specific automation. For each action: what it is, why it matters for marketing readiness, and rough effort (days / weeks).

Be specific. Be honest. Reference the actual content you analyzed. Ground every recommendation in the knowledge base frameworks and case studies.`;
}

export function buildPMDirectionsPrompt(params: {
  companyName: string;
  stage: string;
  briefSummary: string;
}): string {
  return `You are PMCORE, reviewing the Product Intelligence Brief for ${params.companyName} (${params.stage} stage).

Based on this PM brief, propose TWO strategic directions for the pre-marketing PM work:

DIRECTION A — FIX FOUNDATION FIRST:
Prioritize fixing all critical and important product issues before starting any marketing spend. This is the clean, methodical path.
- List the top issues to fix (Critical → Important → Nice-to-have)
- What we'll deliver and in what order
- Estimated timeline (weeks)
- Why this sequence matters for marketing outcomes

DIRECTION B — START NOW, FIX IN PARALLEL:
Launch quick marketing wins immediately while simultaneously fixing critical issues. Split effort between execution and product work.
- What starts immediately (quick wins with no product dependency)
- What gets fixed in parallel (critical items only)
- How we manage both tracks without losing focus
- Estimated timeline and resource split

For each direction include a rough agency fee range based on effort (junior agencies €800-1500/mo, mid-tier €1500-4000/mo, senior/specialist €4000-10000/mo) and estimated execution timeline.

Format EXACTLY as:
DIRECTION_A: [text — 4-5 sentences, specific, reference actual issues from the brief]
PRICING_A: [min]-[max] EUR/month
TIMELINE_A: [X] weeks
DIRECTION_B: [text — 4-5 sentences, specific]
PRICING_B: [min]-[max] EUR/month
TIMELINE_B: [X] weeks

---
PM BRIEF SUMMARY:
${params.briefSummary}`;
}

export function buildPMPlanPrompt(params: {
  companyName: string;
  stage: string;
  chosenDirection: string;
  userInput: string;
  briefSummary: string;
}): string {
  const directionContext = params.userInput
    ? `Client direction: ${params.userInput}`
    : `Chosen direction: ${params.chosenDirection}`;

  return `You are PMCORE building a detailed PM Action Plan for ${params.companyName} (${params.stage} stage).

${directionContext}

Based on the PM Brief and chosen direction, produce a comprehensive PM action plan in Markdown:

## Objective
What we're fixing and why it matters for this company's path to growth.

## Priority Issues (by severity)

### 🔴 Critical — Must fix before marketing
Issues that will actively sabotage any marketing spend. For each: what it is, why it's critical, exact deliverable, estimated effort (days).

### 🟡 Important — Fix during first engagement
Issues that significantly limit marketing ROI. For each: what it is, impact if ignored, exact deliverable, estimated effort.

### 🟢 Nice to Have — Improve when possible
Polish items that improve conversion but aren't blocking. Brief list.

## Delivery Plan

### Week 1–2: Immediate Actions
Specific deliverables, who does what, what gets shipped.

### Week 3–4: Core Fixes
The structural work. Specific outputs.

### Month 2: Optimization & Handoff
Final pieces, documentation, marketing readiness confirmation.

## Marketing Readiness Checkpoint
By the end of this engagement, the company will have: [specific list of what exists and is working].

## Success Metrics
How we know the PM work is done and marketing can begin.

## Pricing Suggestion
Based on the scope of work, company stage (${params.stage}), and standard market rates for PM consulting in Europe.

At the very end, output EXACTLY these four lines:
PRICING_SUGGESTION: [min]-[max] EUR/month
PRICING_RATIONALE: [One sentence: why this range.]
EXECUTION_BUDGET_ESTIMATE: [min]-[max] EUR/month
EXECUTION_BUDGET_RATIONALE: [One sentence: what this covers — tools, freelancers, etc.]

---
PM BRIEF:
${params.briefSummary}`;
}

export function buildPMProposalPrompt(params: {
  companyName: string;
  pmPlan: string;
  proposedPrice: number;
  currency: string;
  executionBudgetMin?: number | null;
  executionBudgetMax?: number | null;
}): string {
  const currencySymbol = params.currency === 'EUR' ? '€' : params.currency === 'GBP' ? '£' : '$';
  const priceFormatted = `${currencySymbol}${params.proposedPrice.toLocaleString()}`;
  const execBudgetLine = params.executionBudgetMin && params.executionBudgetMax
    ? `**Estimated execution budget: ${currencySymbol}${params.executionBudgetMin.toLocaleString()}–${currencySymbol}${params.executionBudgetMax.toLocaleString()}/month** (tools, freelancers, platforms — paid directly by you, separate from this fee)`
    : null;

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return `You are a senior consultant writing a PM phase proposal for ${params.companyName}.

This is a PRE-MARKETING engagement. The goal is to fix the product foundation so that marketing spend actually works.

Use this action plan as your foundation (do NOT copy it literally — translate it into client outcomes):
${params.pmPlan}

---

Write the proposal in Markdown using EXACTLY this structure:

# Getting ${params.companyName} Ready for Growth
### Prepared ${month} · Investment: ${priceFormatted}/month

---

## The Honest Assessment
[2 short paragraphs. Name the real problem — not diplomatically. The specific product/positioning issues that would make any marketing spend a waste right now. Then pivot: what's possible once these are fixed. End with one sentence on the cost of inaction.]

---

## What We're Going to Fix

### Critical Issues
[3-5 bullet points — the blockers. Each one: what it is and what it costs them right now in lost conversions, confused prospects, or wasted effort.]

### What You'll Have When We're Done
[A clear "after" picture. Specific, tangible. Not "better website" but "a homepage that converts 3x better because visitors understand what you do in 5 seconds."]

---

## The Engagement

[NOT a task list. Narrative of the journey in 2-3 phases. Each phase: what the client experiences and has at the end.]

### Phase 1 — Diagnose & Prioritize (Week 1–2)
**By the end of this phase:** [specific client outcome]
[2 sentences]

### Phase 2 — Build & Fix (Week 3–4)
**By the end of this phase:** [specific client outcome]
[2 sentences]

### Phase 3 — Validate & Hand Off (Month 2)
**By the end of this phase:** [specific client outcome — including "you are now ready for marketing"]
[2 sentences]

---

## The Investment

**${priceFormatted}/month** — PM foundation engagement
${execBudgetLine ? `\n${execBudgetLine}\n` : ''}
[One paragraph: why this is money well spent. Frame it as: "Without this, every euro you spend on marketing is being wasted on a leaky funnel." Reference the specific issues being fixed.]

What's included:
- [4-5 bullet points — deliverables as outcomes, not hours]

---

## Why This Before Marketing

[1 tight paragraph. The case for doing PM work first. What companies that skip this step experience. The ROI logic: fix the funnel once vs. keep pouring money into a broken one. Direct and confident.]

---

*Prepared with care · ${month}*

---

TONE RULES:
- Direct, not aggressive. Honest, not harsh.
- The client should feel: "These people see exactly what we need."
- No consultant jargon. Write like a smart friend who's seen this before.
- Short sentences. Every sentence earns its place.`;
}

export function buildPMBriefSummary(brief: {
  product_clarity?: string;
  icp?: string;
  jobs_to_be_done?: string;
  pmf_assessment?: string;
  positioning?: string;
  value_prop_gaps?: string;
  pre_marketing_needs?: string;
  quick_marketing_wins?: string;
  recommended_pm_actions?: string;
}): string {
  const sections = [
    brief.product_clarity && `## Product Clarity\n${brief.product_clarity}`,
    brief.icp && `## ICP\n${brief.icp}`,
    brief.jobs_to_be_done && `## Jobs-to-be-Done\n${brief.jobs_to_be_done}`,
    brief.pmf_assessment && `## PMF Assessment\n${brief.pmf_assessment}`,
    brief.positioning && `## Positioning\n${brief.positioning}`,
    brief.value_prop_gaps && `## Value Proposition Gaps\n${brief.value_prop_gaps}`,
    brief.pre_marketing_needs && `## Pre-Marketing Needs\n${brief.pre_marketing_needs}`,
    brief.quick_marketing_wins && `## Quick Marketing Wins\n${brief.quick_marketing_wins}`,
    brief.recommended_pm_actions && `## Recommended PM Actions\n${brief.recommended_pm_actions}`,
  ].filter(Boolean);

  return sections.join('\n\n');
}
