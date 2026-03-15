# Error handling (user-facing)

Map each case to HTTP status and a clear message.

| Case | HTTP | Message / behavior |
|------|------|--------------------|
| Repo too large | 400 | Limit total files (e.g. 2000); return message explaining limit. |
| Private repo | 402 / 403 | Clone fails → “Private repository; add GITHUB_TOKEN” or similar. |
| Clone failure | 502 | Network or invalid URL → “Clone failed” with short detail. |
| Unsupported files | — | Silently skip; only count supported files in `files_processed`. |
| Indexing failure | — | Set repo status to `failed`; store `error_message`; show on dashboard. |
| Invalid GitHub URL | 400 | “Invalid GitHub repository URL.” |
| Repo not found | 404 | “Repository not found.” |

Use central Express error middleware to map thrown errors or result types to these responses.
