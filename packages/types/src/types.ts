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
}
