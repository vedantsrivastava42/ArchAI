// Chunk types
export type SymbolType = "function" | "class" | "method";

export interface Chunk {
  id: string;
  repoId: string;
  filePath: string;
  language: string;
  symbolType: SymbolType;
  symbolName: string;
  content: string;
}

// Repo types
export type RepoStatus = "pending" | "indexing" | "ready" | "failed";

export interface Repo {
  id: string;
  github_url: string;
  name: string;
  default_branch: string;
  status: RepoStatus;
  error_message: string | null;
  files_processed: number;
  created_at: Date;
  updated_at: Date;
}

// API types (POST /api/repos, GET /api/repos/:id, POST /api/repos/:id/chat)
export interface SubmitRepoRequest {
  url: string;
}
export interface SubmitRepoResponse {
  repoId: string;
  status: string;
}

export interface RepoStatusResponse {
  id: string;
  github_url: string;
  name: string;
  status: string;
  error_message: string | null;
  files_processed: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}
export interface ChatReference {
  filePath: string;
  symbolName?: string;
}
export interface ChatResponse {
  answer: string;
  references?: ChatReference[];
  /** When present, chat was holistic; render as bullet list instead of prose */
  overview?: string[];
}

/** 10-section technical report (paragraph-style) from detailed analysis */
export interface DetailedReport {
  projectOverview?: string;
  coreProblemAndDomain?: string;
  featureBreakdown?: string;
  systemArchitecture?: string;
  componentResponsibilities?: string;
  apiSurface?: string;
  dataModelAndStorage?: string;
  externalIntegrations?: string;
  requestLifecycle?: string;
  advancedEngineeringDecisions?: string;
}

/** Extracted API route: method + path (e.g. GET /api/repos/:id) */
export interface ApiRoute {
  method: string;
  path: string;
}

/** Stored in repos.report after index-time holistic pipeline (bullets only) */
export interface RepoReport {
  purpose?: string[];
  features?: string[];
  keyApis?: string[];
  architecture?: string[];
  /** Fallback: flat list if no sections parsed */
  overview?: string[];
  /** Deep technical report (10 sections) */
  detailed?: DetailedReport;
  /** Extracted routes from code (for APIs tab and count) */
  apiRoutes?: ApiRoute[];
}
