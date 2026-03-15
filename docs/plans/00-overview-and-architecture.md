# Overview and architecture

## Current state

Workspace is **empty**. Full project will be created from scratch.

## High-level flow

```mermaid
flowchart LR
  subgraph frontend [Frontend]
    Home[Home]
    Dashboard[Dashboard]
    Chat[Chat UI]
  end
  subgraph backend [Backend API]
    RepoAPI[POST /api/repos]
    StatusAPI[GET repos/:id/status]
    ChatAPI[POST repos/:id/chat]
  end
  subgraph pipeline [Indexing Pipeline]
    Clone[RepoService clone]
    Parse[ParserService AST]
    Chunk[ChunkService]
    Embed[EmbeddingService]
    Vector[VectorService]
  end
  subgraph chat [Chat Pipeline]
    EmbedQ[Embed query]
    Search[Vector search]
    LLM[LLMService Claude]
  end
  Home --> RepoAPI
  RepoAPI --> Clone --> Parse --> Chunk --> Embed --> Vector
  Dashboard --> StatusAPI
  Chat --> ChatAPI --> EmbedQ --> Search --> LLM
  LLM --> Chat
```

## How pieces connect

- **User** submits a GitHub URL on the **Home** page → **Backend** creates a repo record and runs the **indexing pipeline** (clone → parse → chunk → embed → vector).
- **Dashboard** polls repo **status** and shows progress; when ready, **Chat** sends questions to **Chat API** → **retriever** (embed + vector search) → **LLM** → answer with file references.

See [10-implementation-order.md](10-implementation-order.md) for the suggested build order.
