# Bench Buddy AI — Backend

RAG-powered Q&A backend for bench allocation and HR policy questions.  
Built with **Node.js · Express · TypeScript · OpenAI / Anthropic Claude**.

---

## Table of Contents

1. [Architecture overview](#architecture-overview)
2. [Folder structure](#folder-structure)
3. [API flow](#api-flow)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Environment variables](#environment-variables)
7. [Generating sample Excel data](#generating-sample-excel-data)
8. [Running locally](#running-locally)
9. [API reference](#api-reference)
10. [Swapping AI providers](#swapping-ai-providers)
11. [Excel column mapping](#excel-column-mapping)

---

## Architecture overview

```
Frontend (React)
     │  POST /api/chat  { message }
     ▼
┌──────────────────────────────────────────────────────────┐
│                    Express App                           │
│  requestLogger → validate (Zod) → ChatController        │
│                        │                                 │
│                   RagService                             │
│            ┌──────────┴──────────┐                       │
│       ExcelService           AIService                   │
│   (load + cache rows)   (embeddings + chat LLM)         │
│            └──────────┬──────────┘                       │
│               Cosine similarity                          │
│               Top-K retrieval                            │
│               Prompt construction                        │
│               LLM response (JSON)                        │
└──────────────────────────────────────────────────────────┘
```

---

## Folder structure

```
bench-buddy-ai-be/
├── data/
│   └── bench-buddy.xlsx          ← your Q&A knowledge base
├── scripts/
│   └── generate-sample-excel.ts  ← one-time seed script
├── src/
│   ├── config/
│   │   └── index.ts              ← all env config, validated at startup
│   ├── controllers/
│   │   └── chat.controller.ts    ← request/response handling
│   ├── dtos/
│   │   └── chat.dto.ts           ← Zod input validation schema
│   ├── errors/
│   │   ├── AppError.ts           ← typed error hierarchy
│   │   └── errorHandler.ts       ← centralised Express error middleware
│   ├── middleware/
│   │   ├── requestLogger.ts      ← per-request timing log
│   │   └── validate.ts           ← Zod validation middleware factory
│   ├── routes/
│   │   ├── index.ts              ← /api router
│   │   └── chat.routes.ts        ← /api/chat routes
│   ├── services/
│   │   ├── ai/
│   │   │   ├── ai.factory.ts     ← selects OpenAI or Anthropic at startup
│   │   │   ├── openai.service.ts ← embeddings + GPT chat
│   │   │   └── anthropic.service.ts ← Claude chat + pseudo-embeddings
│   │   ├── excel.service.ts      ← XLSX parsing + in-memory cache
│   │   └── rag.service.ts        ← orchestrates the full RAG pipeline
│   ├── types/
│   │   └── index.ts              ← shared TypeScript interfaces
│   ├── utils/
│   │   ├── asyncHandler.ts       ← wraps async routes for Express
│   │   ├── logger.ts             ← Winston logger (dev: coloured, prod: JSON)
│   │   └── similarity.ts         ← cosine similarity implementation
│   ├── app.ts                    ← Express app factory
│   └── server.ts                 ← process entry point
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## API flow

```
POST /api/chat  { "message": "How does bench allocation work?" }

1. Zod validates the request body
2. ExcelService loads (or returns cached) rows from bench-buddy.xlsx
3. AIService embeds every row (Question + Answer text) → cached vectors
4. AIService embeds the user's message
5. Cosine similarity is computed between the user vector and all row vectors
6. Top-K rows above the MIN_SIMILARITY_THRESHOLD are selected as context
7. A structured prompt is built: system instructions + context block + user question
8. LLM returns a JSON object: answer, confidence, matchedQuestion, additionalInfo
9. Response is returned to the frontend
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 LTS or 20 LTS |
| npm | 9+ |
| OpenAI API key **or** Anthropic API key | — |

---

## Installation

```bash
# 1. Enter the project directory
cd bench-buddy-ai-be

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env
```

---

## Environment variables

Open `.env` and set:

```env
# Required — choose one provider
AI_PROVIDER=openai           # or: anthropic
OPENAI_API_KEY=sk-...        # needed when AI_PROVIDER=openai
ANTHROPIC_API_KEY=sk-ant-... # needed when AI_PROVIDER=anthropic

# Optional tuning
PORT=3001
CORS_ORIGIN=http://localhost:3000
CHAT_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
ANTHROPIC_MODEL=claude-sonnet-4-6
TOP_K_MATCHES=3
MIN_SIMILARITY_THRESHOLD=0.25
EXCEL_FILE_PATH=./data/bench-buddy.xlsx
```

---

## Generating sample Excel data

If you don't have an `.xlsx` file yet, run this once to create `data/bench-buddy.xlsx` with 10 sample bench-policy Q&A pairs:

```bash
npx ts-node scripts/generate-sample-excel.ts
```

Then replace / extend the file with your real data.

### Excel format

| Column | Required | Description |
|--------|----------|-------------|
| `Question` | Yes | The question text |
| `Answer` | Yes | The answer text |
| `Category` | No | Topic grouping (e.g. "Bench Policy") |

Column headers are case-insensitive. Aliases are accepted:  
- Question: `question`, `q`, `query`  
- Answer: `answer`, `a`, `response`  
- Category: `category`, `cat`, `type`

---

## Running locally

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build
npm start
```

Server starts on `http://localhost:3001` by default.

---

## API reference

### `GET /api/health`

Returns service status.

```json
{ "success": true, "message": "Bench Buddy AI is running." }
```

---

### `POST /api/chat`

Ask a question.

**Request**
```json
{ "message": "How does bench allocation work?" }
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "answer": "Bench allocation is the process of assigning available employees...",
    "confidence": 92,
    "matchedQuestion": "How does bench allocation work?",
    "additionalInfo": "Employees on the bench are expected to engage in training..."
  }
}
```

**Error 400 — validation**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": { "message": ["message must be at least 2 characters"] }
}
```

**Error 422 — no relevant match found**
```json
{
  "success": false,
  "error": "I could not find relevant information in the knowledge base..."
}
```

---

### `DELETE /api/chat/cache`

Clears the in-memory embedding + Excel cache. Call this after updating `bench-buddy.xlsx` at runtime.

```json
{ "success": true, "message": "Cache cleared." }
```

---

## Swapping AI providers

Edit `.env`:

```env
# Switch to Anthropic Claude
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

> **Note:** Anthropic does not offer a native embeddings API. When using the Anthropic provider, the backend falls back to a lightweight TF-IDF word-frequency vector for similarity. For production-quality semantic search with Claude, set `AI_PROVIDER=openai` for embeddings and override only the chat step — or integrate a dedicated embedding service.
