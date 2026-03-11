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

// ─── Pause payload ─────────────────────────────────────────────────────────────

export interface PausePayload {
  status: 'paused';
  pause_reason: string;
  paused_at: string; // ISO string
}

// ─── Strategy types ────────────────────────────────────────────────────────────

export type StrategyStatus = 'active' | 'completed' | 'abandoned';

export interface Strategy {
  id: string;
  company_id: string;
  report_id?: string;
  name: string;
  description?: string;
  status: StrategyStatus;
  started_at: string;
  completed_at?: string;
  results?: string;
  created_at: string;
}

// ─── Supabase / Dashboard types ───────────────────────────────────────────────

export type CompanyStatus = 'active' | 'monitoring' | 'completed' | 'paused' | 'proposal_sent' | 'offer_accepted';

export interface CompanyRecord {
  id: string;
  name: string;
  industry: string;
  description: string;
  stage: string;
  mrr: string;
  budget: string;
  team_size: string;
  primary_goal: string;
  landing_page_url: string;
  github_url?: string;
  competitors: string[];
  target_audience: string;
  pain_points: string;
  differentiation: string;
  status: CompanyStatus;
  pause_reason?: string;
  paused_at?: string;
  created_at: string;
  updated_at: string;
  last_analyzed_at?: string;
  // joined from reports (latest)
  latest_report?: ReportRecord;
  report_count?: number;
  // joined active strategy
  active_strategy?: Strategy;
  // joined active proposal
  active_proposal?: Proposal;
}

// ─── Proposal types ────────────────────────────────────────────────────────────

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'closed';

export interface KPI {
  name: string;
  target: string;
  unit: string;
}

export interface KPIActual {
  name: string;
  target: string;
  unit: string;
  actual: string;   // what really happened
  note?: string;    // optional context
}

export interface Proposal {
  id: string;
  company_id: string;
  report_id?: string;
  strategy_id?: string;
  direction_budget?: string;
  direction_premium?: string;
  user_input?: string;
  chosen_direction?: string;
  strategy_plan?: string;
  proposal_content?: string;
  proposed_price?: number;
  actual_price?: number;
  execution_budget_min?: number;
  execution_budget_max?: number;
  currency: string;
  kpis: KPI[];
  kpi_actuals: KPIActual[];
  results?: string;
  results_report?: string;
  status: ProposalStatus;
  sent_at?: string;
  accepted_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportRecord {
  id: string;
  company_id: string;
  executive_summary: string;
  company_analysis: string;
  user_research: string;
  competitor_analysis: string;
  marketing_strategy: string;
  budget_allocation: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  created_at: string;
}
