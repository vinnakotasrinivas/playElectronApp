# Enterprise Doc QA

Electron desktop capstone: **Generative AI + RAG + Agentic workflow** for querying enterprise documents. Switch between **Groq** and **Gemini** for chat; embeddings stay local so the vector index is provider-agnostic.

## Features

1. Project foundation (Electron + env config)
2. Upload / ask UI with IPC
3. Document ingestion: PDF, TXT, CSV, Excel
4. Chunking with overlap + metadata
5. Local embeddings (`@xenova/transformers`) + JSON vector store
6. Similarity retrieval + grounded LLM answers
7. Agent pipeline: Planner → Retriever → Reasoner → Validator

## Setup

```bash
npm install
```

Copy env template and add keys (do not commit `.env`):

```bash
copy .env.example .env
```

Edit `.env`:

```
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

Get keys from:

- [Groq Console](https://console.groq.com/)
- [Google AI Studio](https://aistudio.google.com/)

## Run

```bash
npm start
```

Optional DevTools:

```bash
set ELECTRON_DEVTOOLS=1 && npm start
```

## How to use

1. Choose **Groq** or **Gemini** in the header.
2. Click **Upload document** and pick a PDF/TXT/CSV/Excel file.
3. Wait for chunking + embedding (first run downloads the embedding model).
4. Ask a natural language question and review answer, sources, and agent steps.

## Architecture

- `electron/` — main process, preload bridge, IPC
- `renderer/` — UI
- `src/ingestion/` — parsers + chunker
- `src/rag/` — embeddings, vector store, retrieval
- `src/providers/` — Groq / Gemini factory
- `src/agents/` — planner, reasoner, validator, orchestrator

## Debug tips

| Symptom | Likely cause |
| --- | --- |
| Blank window | Wrong `loadFile` path in `electron/main.js` |
| `docQA is undefined` | Preload not loading / `contextIsolation` misconfigured |
| Upload OK but empty PDF text | Scanned/image PDF (OCR out of scope) |
| First upload hangs | Embedding model downloading |
| 401 / missing key | `.env` empty or app not restarted after edit |
| No retrieval hits | Ask before any successful ingest |

## License

MIT
