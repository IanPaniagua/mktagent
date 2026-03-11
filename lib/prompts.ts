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
