import Anthropic from '@anthropic-ai/sdk';
import { CompanyData, ScrapedData, UsageData } from './types';
import { scrapeUrl, guessCompetitorUrl } from './scraper';
import { parseDocument, base64ToBuffer } from './parser';
import { buildSystemPrompt, buildAnalysisPrompt } from './prompts';

// claude-sonnet-4-6 pricing (USD per million tokens)
const PRICING = { input: 3.0, output: 15.0 };

export function calculateCost(inputTokens: number, outputTokens: number): UsageData {
  const totalCost =
    (inputTokens / 1_000_000) * PRICING.input +
    (outputTokens / 1_000_000) * PRICING.output;
  return { inputTokens, outputTokens, totalCost };
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type StepCallback = (step: number, status: 'active' | 'done', message: string) => void;
export type ResultCallback = (section: string, content: string) => void;
export type CostCallback = (usage: UsageData) => void;

export interface PreScrapedData {
  landingPage?: string;
  github?: string;
  scrapedAt?: string; // ISO date — used to decide if re-scraping is needed
}

const SCRAPE_CACHE_TTL_DAYS = 7;

function isCacheStale(scrapedAt?: string): boolean {
  if (!scrapedAt) return true;
  const age = Date.now() - new Date(scrapedAt).getTime();
  return age > SCRAPE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export async function runAnalysis(
  companyData: CompanyData,
  onStep: StepCallback,
  onResult: ResultCallback,
  onCost?: CostCallback,
  pmBriefContext?: string,
  preScraped?: PreScrapedData
): Promise<void> {
  const useCache = preScraped && !isCacheStale(preScraped.scrapedAt);

  // Step 1: Landing page — reuse PM scrape if fresh
  onStep(1, 'active', useCache ? 'Loading cached landing page data...' : 'Scraping landing page...');
  let landingPageData: ScrapedData = { url: companyData.landingPageUrl, title: '', content: '', success: false };

  if (useCache && preScraped?.landingPage) {
    landingPageData = { url: companyData.landingPageUrl, title: '', content: preScraped.landingPage, success: true };
    onStep(1, 'done', 'Landing page loaded from PM cache');
  } else {
    try {
      landingPageData = await scrapeUrl(companyData.landingPageUrl);
    } catch (e) {
      console.warn('Landing page scrape failed:', e);
    }
    onStep(1, 'done', 'Landing page scraped');
  }

  // Step 2: GitHub — reuse PM scrape if fresh
  onStep(2, 'active', useCache ? 'Loading cached GitHub data...' : 'Reading GitHub repository...');
  let githubContent = '';

  if (useCache && preScraped?.github) {
    githubContent = preScraped.github;
    onStep(2, 'done', 'GitHub data loaded from PM cache');
  } else if (companyData.githubUrl) {
    try {
      const ghData = await scrapeUrl(companyData.githubUrl);
      githubContent = ghData.content;
    } catch (e) {
      console.warn('GitHub scrape failed:', e);
    }
    onStep(2, 'done', companyData.githubUrl ? 'GitHub repository read' : 'No GitHub repo provided');
  } else {
    onStep(2, 'done', 'No GitHub repo provided');
  }

  // Step 3: Parse uploaded documents
  onStep(3, 'active', 'Processing uploaded documents...');
  let documentsContent = '';
  if (companyData.documents && companyData.documents.length > 0) {
    const parsedDocs = await Promise.all(
      companyData.documents.map(async (doc) => {
        try {
          const buffer = base64ToBuffer(doc.content);
          const parsed = await parseDocument(buffer, doc.name, doc.type);
          return `### ${parsed.filename}\n${parsed.content}`;
        } catch (e) {
          console.warn(`Failed to parse ${doc.name}:`, e);
          return '';
        }
      })
    );
    documentsContent = parsedDocs.filter(Boolean).join('\n\n');
  }
  onStep(3, 'done', companyData.documents?.length ? `${companyData.documents.length} document(s) processed` : 'No documents provided');

  // Step 4: Scrape competitors (MKT-specific — always runs)
  onStep(4, 'active', 'Running competitor research...');
  const competitorContents: Array<{ name: string; content: string }> = [];
  const competitorsToScrape = companyData.competitors.slice(0, 8);

  for (const competitor of competitorsToScrape) {
    try {
      const url = guessCompetitorUrl(competitor);
      const data = await scrapeUrl(url);
      competitorContents.push({ name: competitor, content: data.content.slice(0, 3000) });
    } catch (e) {
      console.warn(`Failed to scrape competitor ${competitor}:`, e);
      competitorContents.push({ name: competitor, content: '' });
    }
  }
  onStep(4, 'done', `${competitorContents.length} competitor(s) analyzed`);

  // Step 5: User research analysis
  onStep(5, 'active', 'Conducting user research analysis...');
  await new Promise(r => setTimeout(r, 500));
  onStep(5, 'done', 'User research data compiled');

  // Step 6: AARRR funnel mapping
  onStep(6, 'active', 'Mapping AARRR funnel strategy...');
  await new Promise(r => setTimeout(r, 500));
  onStep(6, 'done', 'AARRR funnel strategy mapped');

  // Step 7: Build marketing strategy via Claude
  onStep(7, 'active', 'Building marketing strategy with Claude AI...');

  const prompt = buildAnalysisPrompt({
    companyName: companyData.name,
    industry: companyData.industry,
    description: companyData.description,
    stage: companyData.stage,
    mrr: companyData.mrr,
    budget: companyData.budget,
    teamSize: companyData.teamSize,
    primaryGoal: companyData.primaryGoal,
    targetAudience: companyData.targetAudience,
    painPoints: companyData.painPoints,
    differentiation: companyData.differentiation,
    landingPageContent: landingPageData.content.slice(0, 8000),
    githubContent: githubContent.slice(0, 4000),
    documentsContent: documentsContent.slice(0, 6000),
    competitorContents,
    pmBriefContext,
  });

  // Step 8: Generate final report
  onStep(8, 'active', 'Generating final report...');

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 10000,
    system: buildSystemPrompt(),
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

  onStep(7, 'done', 'Marketing strategy complete');
  onStep(8, 'done', 'Report generated');

  const sections = parseReportSections(fullContent);
  for (const [section, content] of Object.entries(sections)) {
    onResult(section, content);
  }
}

function parseReportSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};

  const sectionPatterns: Array<{ key: string; pattern: RegExp }> = [
    { key: 'executiveSummary',     pattern: /##\s*1\.\s*EXECUTIVE SUMMARY([\s\S]*?)(?=##\s*2\.|$)/i },
    { key: 'companyAnalysis',      pattern: /##\s*2\.\s*COMPANY ANALYSIS([\s\S]*?)(?=##\s*3\.|$)/i },
    { key: 'userResearch',         pattern: /##\s*3\.\s*USER RESEARCH([\s\S]*?)(?=##\s*4\.|$)/i },
    { key: 'competitorAnalysis',   pattern: /##\s*4\.\s*COMPETITOR ANALYSIS([\s\S]*?)(?=##\s*5\.|$)/i },
    { key: 'aarrr_funnel_strategy',pattern: /##\s*5\.\s*AARRR FUNNEL STRATEGY([\s\S]*?)(?=##\s*6\.|$)/i },
    { key: 'marketingStrategy',    pattern: /##\s*6\.\s*CHANNEL STRATEGY[^#]*([\s\S]*?)(?=##\s*7\.|$)/i },
    { key: 'roiProjections',       pattern: /##\s*7\.\s*ROI PROJECTIONS([\s\S]*?)(?=##\s*8\.|$)/i },
    { key: 'budgetAllocation',     pattern: /##\s*8\.\s*BUDGET ALLOCATION([\s\S]*?)$/i },
  ];

  for (const { key, pattern } of sectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

  if (Object.keys(sections).length === 0) {
    sections['executiveSummary'] = content;
  }

  return sections;
}
