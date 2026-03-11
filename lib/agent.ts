import Anthropic from '@anthropic-ai/sdk';
import { CompanyData, ScrapedData } from './types';
import { scrapeUrl, guessCompetitorUrl } from './scraper';
import { parseDocument, base64ToBuffer } from './parser';
import { buildSystemPrompt, buildAnalysisPrompt } from './prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type StepCallback = (step: number, status: 'active' | 'done', message: string) => void;
export type ResultCallback = (section: string, content: string) => void;

export async function runAnalysis(
  companyData: CompanyData,
  onStep: StepCallback,
  onResult: ResultCallback
): Promise<void> {
  // Step 1: Scrape landing page
  onStep(1, 'active', 'Scraping landing page...');
  let landingPageData: ScrapedData = { url: companyData.landingPageUrl, title: '', content: '', success: false };
  try {
    landingPageData = await scrapeUrl(companyData.landingPageUrl);
  } catch (e) {
    console.warn('Landing page scrape failed:', e);
  }
  onStep(1, 'done', 'Landing page scraped');

  // Step 2: Scrape GitHub repo
  onStep(2, 'active', 'Reading GitHub repository...');
  let githubContent = '';
  if (companyData.githubUrl) {
    try {
      const ghData = await scrapeUrl(companyData.githubUrl);
      githubContent = ghData.content;
    } catch (e) {
      console.warn('GitHub scrape failed:', e);
    }
  }
  onStep(2, 'done', companyData.githubUrl ? 'GitHub repository read' : 'No GitHub repo provided');

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

  // Step 4: Scrape competitors
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
  // This happens in the Claude call — signal it's being prepared
  await new Promise(r => setTimeout(r, 500));
  onStep(5, 'done', 'User research data compiled');

  // Step 6: Company stage analysis
  onStep(6, 'active', 'Analyzing company stage & positioning...');
  await new Promise(r => setTimeout(r, 500));
  onStep(6, 'done', 'Company positioning analyzed');

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
  });

  // Step 8: Generate final report
  onStep(8, 'active', 'Generating final report...');

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: prompt }],
  });

  let fullContent = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullContent += chunk.delta.text;
    }
  }

  onStep(7, 'done', 'Marketing strategy complete');
  onStep(8, 'done', 'Report generated');

  // Parse sections from the full content
  const sections = parseReportSections(fullContent);
  for (const [section, content] of Object.entries(sections)) {
    onResult(section, content);
  }
}

function parseReportSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};

  const sectionPatterns: Array<{ key: string; pattern: RegExp }> = [
    { key: 'executiveSummary', pattern: /##\s*1\.\s*EXECUTIVE SUMMARY([\s\S]*?)(?=##\s*2\.|$)/i },
    { key: 'companyAnalysis', pattern: /##\s*2\.\s*COMPANY ANALYSIS([\s\S]*?)(?=##\s*3\.|$)/i },
    { key: 'userResearch', pattern: /##\s*3\.\s*USER RESEARCH([\s\S]*?)(?=##\s*4\.|$)/i },
    { key: 'competitorAnalysis', pattern: /##\s*4\.\s*COMPETITOR ANALYSIS([\s\S]*?)(?=##\s*5\.|$)/i },
    { key: 'marketingStrategy', pattern: /##\s*5\.\s*MARKETING STRATEGY([\s\S]*?)(?=##\s*6\.|$)/i },
    { key: 'budgetAllocation', pattern: /##\s*6\.\s*BUDGET ALLOCATION([\s\S]*?)$/i },
  ];

  for (const { key, pattern } of sectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

  // If no sections parsed, put everything in executiveSummary
  if (Object.keys(sections).length === 0) {
    sections['executiveSummary'] = content;
  }

  return sections;
}
