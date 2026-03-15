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

/** Per-category score and optional detected/missing items for Project Intelligence Report */
export interface IntelligenceBreakdownItem {
  score: number;
  max: number;
  detected?: string[];
  missing?: string[];
}

/** Confidence level for advanced feature detection (integration verification) */
export type FeatureConfidence = "signal" | "partial" | "full";

/** Evidence for a single advanced feature (dependency + import + usage) */
export interface FeatureEvidenceItem {
  name: string;
  confidence: FeatureConfidence;
  evidence: {
    dependency?: string;
    import?: string[];
    usage?: string[];
  };
}

/** Project tier from total score */
export type ProjectIntelligenceTier =
  | "Production Ready"
  | "Advanced Project"
  | "Intermediate Project"
  | "Basic Project";

/** Project Intelligence Report: scores, breakdown, scalability, domain, suggestions */
export interface ProjectIntelligenceReport {
  totalScore: number;
  tier: ProjectIntelligenceTier;
  breakdown: {
    architecture: IntelligenceBreakdownItem;
    backendApis: IntelligenceBreakdownItem;
    dataModeling: IntelligenceBreakdownItem;
    devOps: IntelligenceBreakdownItem;
    advancedFeatures: IntelligenceBreakdownItem;
    aiIntegrations: IntelligenceBreakdownItem;
    codebaseScale: IntelligenceBreakdownItem;
  };
  scale: {
    apiCount: number;
    moduleCount: number;
    modelCount: number;
  };
  scalabilityEstimate?: string;
  scalabilityReasoning?: string;
  scalingRecommendations?: string[];
  scalingTechnologies?: string[];
  domain?: string;
  domainSuggestions?: string[];
  strengths?: string[];
  suggestedNextFeatures?: string[];
  /** Per-feature confidence and evidence for Advanced Features (integration verification) */
  advancedFeaturesEvidence?: FeatureEvidenceItem[];
  /** High engineering effort features detected (e.g. Redis caching, Message queue, Modular architecture) */
  effortIndicators?: string[];
}

/** LLM-categorized group of APIs by feature (e.g. Course, Profile, Payment) */
export interface ApiRouteGroup {
  feature: string;
  routes: ApiRoute[];
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
  /** Routes grouped by feature via LLM (for APIs tab when present) */
  apiRoutesByFeature?: ApiRouteGroup[];
  /** Project Intelligence Report (score, breakdown, scalability, domain, suggestions) */
  intelligence?: ProjectIntelligenceReport;
}
