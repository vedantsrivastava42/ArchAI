# Vector DB (Qdrant)

## Collection strategy

- **Option A**: One collection `codebase_chunks` with payload `repo_id` (simpler for multi-repo; fits 10–15 users).
- **Option B**: One collection per repo `repo_<uuid>`.

Prefer **Option A** for V0.

## Payload (metadata)

- `repo_id`
- `file_path`
- `symbol_name`
- `symbol_type`
- `chunk_id`
- Optionally `content` for returning snippet without re-reading.

## Dimension

- Match OpenAI `text-embedding-3-large`: **3072**.

## Lifecycle

- Create collection on first index for a repo (or on app startup if using single collection).
