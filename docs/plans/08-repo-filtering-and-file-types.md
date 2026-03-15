# Repo filtering and file types

## Ignore list

Implement in `packages/repo-parser` as blocklist of path segments/names and allowlist of extensions.

**Ignore:**

- node_modules
- build
- dist
- .git
- *.log
- *.env
- *.lock
- Common variants (e.g. out, target, __pycache__)

## Supported extensions

- `.ts`, `.js`, `.java`, `.py`, `.go`
- Optionally: `.tsx`, `.jsx`

All other files are skipped; no parsing. Only supported files count toward `files_processed`.

## Size limit

- Enforce max files per repo (e.g. 2000) to avoid “repo too large”. Return 400 with clear message when exceeded.
