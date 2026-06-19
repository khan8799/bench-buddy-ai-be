# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Development server with hot-reload (ts-node-dev)
npm run build     # Compile TypeScript → dist/
npm start         # Production server (requires build first)
npm test          # Jest test runner
npm run lint      # ESLint on src/ (note: .eslintrc not present — must create one first)
```

Generate sample Excel data (one-time seed):
```bash
npx ts-node scripts/generate-sample-excel.ts
```

Run a single test file:
```bash
npx jest src/path/to/file.test.ts
```

## Environment Setup

Copy `.env.example` to `.env` and set at minimum:

- `AI_PROVIDER` — `openai` or `anthropic`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` depending on provider
- `EXCEL_FILE_PATH` — path to the `.xlsx` Q&A knowledge base (default: `./data/bench-buddy.xlsx`)

Key RAG tuning variables: `TOP_K_MATCHES` (default 3), `MIN_SIMILARITY_THRESHOLD` (default 0.25).

## Architecture

**Domain**: RAG-powered Q&A over an Excel knowledge base, targeting HR/bench allocation questions.

**Request flow**:
```
POST /api/chat
  → Zod validation (ChatRequestSchema, 2–2000 chars)
  → ChatController
  → RagService.answer()
      ├─ ExcelService: load + cache rows from .xlsx
      ├─ AIService.getEmbedding(): embed all rows (cached) + embed query
      ├─ cosine similarity (src/utils/similarity.ts) → top-K above threshold
      └─ AIService.generateAnswer(): structured JSON response
  → { answer, confidence, matchedQuestion, additionalInfo }
```

**Key layers**:

- [src/config/index.ts](src/config/index.ts) — All environment variables are read and validated here at startup. Add new env vars here.
- [src/services/rag.service.ts](src/services/rag.service.ts) — Orchestrates the full RAG pipeline; owns in-memory embedding cache.
- [src/services/excel.service.ts](src/services/excel.service.ts) — Parses XLSX with flexible column aliases (`Question`/`Q`/`query`, `Answer`/`A`/`response`, `Category`/`cat`/`type`). In-memory cache lives here.
- [src/services/ai/](src/services/ai/) — `IAIService` interface with two provider implementations:
  - **OpenAIService**: real embeddings (`text-embedding-3-small`) + GPT chat with JSON response format
  - **AnthropicService**: TF-IDF pseudo-embeddings (Anthropic has no embeddings API) + Claude chat
  - Provider selected at startup via `AI_PROVIDER` env var in [src/services/ai/ai.factory.ts](src/services/ai/ai.factory.ts)
- [src/types/index.ts](src/types/index.ts) — All shared interfaces (`ExcelRow`, `ScoredRow`, `ChatResponseData`, `IAIService`).
- [src/errors/](src/errors/) — `AppError` hierarchy (`ValidationError`, `NotFoundError`, `ExternalServiceError`) + Express error handler middleware.

**Other endpoints**: `GET /api/health`, `DELETE /api/chat/cache` (clears embedding + Excel cache).

## Important Notes

- The Excel file is loaded and embedded on first request; use `DELETE /api/chat/cache` to force reload after updating the `.xlsx`.
- When Anthropic is the provider, similarity quality is lower because embeddings are TF-IDF-based, not semantic vectors.
- TypeScript strict mode is on — `noUnusedLocals`, `noUnusedParameters`, and `noImplicitReturns` are enforced.
- No `.eslintrc` exists despite the lint script; the script will fail until one is added.
