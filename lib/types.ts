export interface CompanyData {
  // Basics
  name: string;
  industry: string;
  description: string;
  mrr: string;
  budget: string;
  teamSize: string;
  stage: string;
  primaryGoal: string;

  // Data sources
  landingPageUrl: string;
  githubUrl?: string;
  documents?: UploadedDocument[];
  competitors: string[]; // array of competitor names/URLs

  // Additional context
  targetAudience: string;
  painPoints: string;
  differentiation: string;
}

export interface UploadedDocument {
  name: string;
  type: string;
  content: string; // base64 encoded
  size: number;
}

export interface ScrapedData {
  url: string;
  title: string;
  content: string;
  success: boolean;
  error?: string;
}

export interface AnalysisResult {
  executiveSummary: string;
  companyAnalysis: string;
  userResearch: string;
  competitorAnalysis: string;
  marketingStrategy: string;
  budgetAllocation: string;
}

export interface AnalysisStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'done' | 'error';
  subItems?: string[];
}

export interface UsageData {
  inputTokens: number;
  outputTokens: number;
  totalCost: number; // in USD
}

export interface SSEEvent {
  type: 'step' | 'result' | 'complete' | 'error' | 'cost';
  step?: number;
  status?: 'active' | 'done';
  message?: string;
  section?: string;
  content?: string;
  usage?: UsageData;
}

export interface ParsedDocument {
  filename: string;
  content: string;
  type: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: 'philosophy' | 'framework' | 'playbook' | 'rule' | 'case-study' | 'persona';
  content: string;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeStore {
  entries: KnowledgeEntry[];
}
