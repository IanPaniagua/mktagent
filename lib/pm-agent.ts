import Anthropic from '@anthropic-ai/sdk';
import { CompanyRecord, PMInputData, UsageData } from './types';
import { scrapeUrl } from './scraper';
import { parseDocument, base64ToBuffer } from './parser';
import { buildPMSystemPrompt, buildPMAnalysisPrompt } from './pm-prompts';
import { calculateCost, StepCallback, ResultCallback, CostCallback } from './agent';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runPMAnalysis(
  company: CompanyRecord,
  pmInput: PMInputData,
  onStep: StepCallback,
  onResult: ResultCallback,
  onCost?: CostCallback
): Promise<void> {
  // Step 1: Scrape landing page
  onStep(1, 'active', 'Scraping landing page...');
  let landingPageContent = '';
  try {
    const scraped = await scrapeUrl(company.landing_page_url);
    landingPageContent = scraped.content;
  } catch (e) {
    console.warn('PM: Landing page scrape failed:', e);
  }
  onStep(1, 'done', 'Landing page scraped');

  // Step 2: Scrape GitHub
  onStep(2, 'active', 'Reading GitHub repository...');
  let githubContent = '';
  if (company.github_url) {
    try {
      const ghData = await scrapeUrl(company.github_url);
      githubContent = ghData.content;
    } catch (e) {
      console.warn('PM: GitHub scrape failed:', e);
    }
  }
  onStep(2, 'done', company.github_url ? 'GitHub repository read' : 'No GitHub repo provided');

  // Step 3: Parse uploaded documents
  onStep(3, 'active', 'Processing documents (PRD, research, roadmap)...');
  let documentsContent = '';
  if (pmInput.documents && pmInput.documents.length > 0) {
    const parsedDocs = await Promise.all(
      pmInput.documents.map(async (doc) => {
        try {
          const buffer = base64ToBuffer(doc.content);
          const parsed = await parseDocument(buffer, doc.name, doc.type);
          return `### ${parsed.filename}\n${parsed.content}`;
        } catch (e) {
          console.warn(`PM: Failed to parse ${doc.name}:`, e);
          return '';
        }
      })
    );
    documentsContent = parsedDocs.filter(Boolean).join('\n\n');
  }
  onStep(3, 'done', pmInput.documents?.length ? `${pmInput.documents.length} document(s) processed` : 'No documents provided');

  // Step 4: Analyzing product positioning
  onStep(4, 'active', 'Analyzing product positioning & ICP...');
  await new Promise(r => setTimeout(r, 400));
  onStep(4, 'done', 'Positioning data compiled');

  // Step 5: Diagnosing PMF signals
  onStep(5, 'active', 'Diagnosing PMF signals...');
  await new Promise(r => setTimeout(r, 400));
  onStep(5, 'done', 'PMF diagnosis prepared');

  // Step 6: Building product brief via Claude
  onStep(6, 'active', 'Building Product Intelligence Brief with PMCORE...');

  const prompt = buildPMAnalysisPrompt({
    companyName: company.name,
    industry: company.industry,
    description: company.description,
    stage: company.stage,
    mrr: company.mrr,
    budget: company.budget,
    teamSize: company.team_size,
    primaryGoal: company.primary_goal,
    targetAudience: company.target_audience,
    painPoints: company.pain_points,
    differentiation: company.differentiation,
    landingPageContent: landingPageContent.slice(0, 8000),
    githubContent: githubContent.slice(0, 4000),
    documentsContent: documentsContent.slice(0, 8000),
    additionalContext: pmInput.additionalContext ?? '',
  });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    system: buildPMSystemPrompt(),
    messages: [{ role: 'user', content: prompt }],
  });

  let fullContent = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullContent += chunk.delta.text;
    }
  }

  const finalMessage = await stream.finalMessage();
  if (onCost) {
    const usage = calculateCost(
      finalMessage.usage.input_tokens,
      finalMessage.usage.output_tokens
    );
    onCost(usage);
  }

  onStep(6, 'done', 'Product Brief generated');

  // Step 7: Parsing brief sections
  onStep(7, 'active', 'Parsing and structuring brief sections...');
  const sections = parseBriefSections(fullContent);
  for (const [section, content] of Object.entries(sections)) {
    onResult(section, content);
  }
  onStep(7, 'done', 'Brief complete');
}

function parseBriefSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};

  const sectionPatterns: Array<{ key: string; pattern: RegExp }> = [
    { key: 'product_clarity',        pattern: /##\s*1\.\s*PRODUCT CLARITY([\s\S]*?)(?=##\s*2\.|$)/i },
    { key: 'icp',                    pattern: /##\s*2\.\s*ICP[^#]*([\s\S]*?)(?=##\s*3\.|$)/i },
    { key: 'jobs_to_be_done',        pattern: /##\s*3\.\s*JOBS-TO-BE-DONE([\s\S]*?)(?=##\s*4\.|$)/i },
    { key: 'pmf_assessment',         pattern: /##\s*4\.\s*PMF ASSESSMENT([\s\S]*?)(?=##\s*5\.|$)/i },
    { key: 'positioning',            pattern: /##\s*5\.\s*POSITIONING([\s\S]*?)(?=##\s*6\.|$)/i },
    { key: 'value_prop_gaps',        pattern: /##\s*6\.\s*VALUE PROPOSITION GAPS([\s\S]*?)(?=##\s*7\.|$)/i },
    { key: 'pre_marketing_needs',    pattern: /##\s*7\.\s*PRE-MARKETING NEEDS([\s\S]*?)(?=##\s*8\.|$)/i },
    { key: 'quick_marketing_wins',   pattern: /##\s*8\.\s*QUICK MARKETING WINS([\s\S]*?)(?=##\s*9\.|$)/i },
    { key: 'recommended_pm_actions', pattern: /##\s*9\.\s*RECOMMENDED PM ACTIONS([\s\S]*?)$/i },
  ];

  for (const { key, pattern } of sectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

  if (Object.keys(sections).length === 0) {
    sections['product_clarity'] = content;
  }

  return sections;
}
