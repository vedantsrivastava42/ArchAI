# Packages (detailed)

## 5.1 `packages/types`

- **Exports**: Chunk type (id, repoId, filePath, language, symbolType, symbolName, content); Repo type; API request/response types (SubmitRepo, RepoStatus, ChatRequest, ChatResponse with `answer` and `references`). Use shared types for both server and (if needed) web.

## 5.2 `packages/repo-parser`

- **Clone**: Use `simple-git` to clone into a temp dir (e.g. `os.tmpdir()`/subdir).
- **File tree**: Walk directory; return list of paths relative to repo root.
- **Filter**: Ignore list (node_modules, build, dist, .git, *.log, *.env, *.lock, etc.); allow only extensions: `.ts`, `.js`, `.java`, `.py`, `.go` (and optionally `.tsx`, `.jsx`). Enforce max files/repo (e.g. 2000) to avoid “repo too large”. See [08-repo-filtering-and-file-types.md](08-repo-filtering-and-file-types.md).
- **API**: e.g. `cloneAndListFiles(url: string): Promise<{ basePath: string, files: string[] }>`; caller is responsible for cleaning up temp dir after indexing.

## 5.3 `packages/indexer`

- **Parsing**: Tree-sitter; **V0: TypeScript/JS only** (`tree-sitter-typescript` / `tree-sitter-javascript`). Per file, extract functions (declarations, methods) and classes.
- **Chunk output**: Array of objects matching Chunk type; one chunk per function/method/class; `content` = full snippet; `symbolType`: `"function"` | `"class"` | `"method"`.
- **Embedding**: Call OpenAI Embeddings API (`text-embedding-3-large`); batch in groups of ~100 to respect rate limits.
- **Vector storage**: For each repo, ensure a Qdrant collection exists (e.g. collection name = `repo_<repoId>` or one collection with payload `repo_id`). Upsert points: vector + payload `{ repoId, filePath, symbolName, symbolType }` (and chunk id). See [06-vector-db.md](06-vector-db.md).
- **Orchestration**: Single function `indexRepo(repoId, clonePath, files): Promise<void>` that: parse all files → chunks → embed → vector upsert; report progress via callback or DB (e.g. `files_processed`).

## 5.4 `packages/retriever`

- **Input**: `repoId`, `query`, `topK = 5`.
- **Steps**: Embed query (OpenAI same model); Qdrant search with filter `repo_id = repoId`; return list of chunks (with filePath, symbolName, symbolType, content).
- **Output**: Typed chunk array for LLM context.

## 5.5 `packages/llm`

- **Input**: `query`, `chunks` (array with filePath + content), optional `history`.
- **Prompt**: System: “You are an expert software engineer analyzing a codebase. Use only the provided context. Explain clearly and reference file paths.” Context: for each chunk, “FILE: <path>\nCODE:\n<content>”. Then “User question:\n<question>”.
- **API**: Claude (e.g. `@anthropic-ai/sdk`); model e.g. `claude-3-5-sonnet` or latest; stream optional for V0 (can be non-stream for simplicity).
- **Output**: `{ answer: string, references?: Array<{ filePath, symbolName }> }`. References can be parsed from response or passed from retriever chunks.
