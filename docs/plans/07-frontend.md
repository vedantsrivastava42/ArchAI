# Frontend (Next.js) — `apps/web`

## Principle: Mantine-first, minimal code

**Heavily depend on [Mantine](https://mantine.dev/core/package/).** For every UI need, use the same or similar component from `@mantine/core` (and `@mantine/hooks` where useful). Plug and use — no custom components when a Mantine one exists. Goal: as few lines of code as possible.

## Stack

- Next.js 14+ App Router, TypeScript.
- **@mantine/core** + **@mantine/hooks** for all UI (see map below).
- TanStack Query for server state.
- For code-in-response only: **@mantine/code-highlight** or Mantine **Code** / **CodeHighlight** (Typography) if it fits; otherwise minimal use of `react-syntax-highlighter` inside a Mantine **Paper** or **Box**.
- Theme: Mantine theme; **dark mode default**; minimal and modern.

## UI need → Mantine component (plug and use)

| Need | Mantine component |
|------|--------------------|
| Layout + nav | **AppShell**, **Navbar**, **Anchor** (links) |
| Hero / title | **Title**, **Text** |
| Repo URL input | **TextInput** |
| Submit / actions | **Button** |
| Repo info + status | **Card**, **Badge** (e.g. status) |
| Indexing progress | **Progress** |
| Tabs (e.g. Overview vs Chat) | **Tabs** |
| Chat container / messages | **Stack**, **ScrollArea**, **Paper** (message bubbles) |
| Chat input | **Textarea** + **Button** (or **TextInput** with rightSection send icon) |
| File references | **Badge** or **Anchor** (links) |
| Code blocks in answers | **CodeHighlight** or **Code** (Typography) — prefer Mantine; avoid extra wrapper code |
| Loading | **Loader** |
| Errors / empty states | **Alert** |
| Spacing / layout | **Container**, **Flex**, **Group**, **Stack**, **Space** |

Use these as-is; avoid custom wrappers. Less code = prefer single component over composition when it meets the need.

## Pages

**`/` (Home)**

- **Title** + **Text** for hero.
- **TextInput** for repo URL; **Button** “Analyze”.
- On submit: `POST /api/repos` (mutation); redirect to `/repos/[id]`.

**`/repos/[id]` (Dashboard)**

- **AppShell** (navbar: **Anchor** Home, repo name).
- **Card** for repo info; **Badge** for status; **Progress** when `indexing`; poll status every 2–3 s.
- **Tabs** optional (e.g. Overview | Chat). Chat: **Stack** of messages (**Paper** per message), **Textarea** + **Button** send.

**Chat UI**

- Repo panel: **Card** (left or top).
- Messages: **ScrollArea** + **Stack** of **Paper** (user vs assistant); **Badge**/ **Anchor** for file refs; **CodeHighlight** or **Code** for code.
- Send: **Textarea** + **Button** → `POST /api/repos/:id/chat`; append user then assistant message.

## State

- TanStack Query only: `useMutation` (submit repo, send chat), `useQuery` (repo details, status polling). No extra state layer; keep components thin.

## Summary

Use Mantine for layout, inputs, feedback, and typography so that most of the UI is `import { … } from '@mantine/core'` and minimal JSX. Fewer lines, fewer custom components.
