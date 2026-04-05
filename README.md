# TTS Service

A Node.js backend that extracts text from URLs, PDFs, and ePubs, naturalizes it via Claude, and synthesizes speech using Kokoro TTS via fal.ai.

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```
ANTHROPIC_API_KEY=sk-ant-...   # From console.anthropic.com
FAL_KEY=...                    # From fal.ai dashboard
PORT=3000                      # Optional, defaults to 3000
```

## Running

```bash
# Production
npm start

# Development (with file watching)
npm run dev
```

## API Reference

### GET /health

Returns service status.

```bash
curl http://localhost:3000/health
```

Response:
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### GET /voices

Returns available Kokoro TTS voices.

```bash
curl http://localhost:3000/voices
```

Response:
```json
{
  "american_english": ["af_bella", "af_nova", "af_sky", "am_adam", "am_michael"],
  "british_english": ["bf_alice", "bf_emma", "bm_george", "bm_lewis"]
}
```

---

### POST /extract-url

Extracts an article from a URL, naturalizes the text, and synthesizes speech.

```bash
curl -X POST http://localhost:3000/extract-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article","voice":"af_bella"}'
```

Body:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | yes | Article URL |
| voice | string | no | Kokoro voice ID (default: `af_bella`) |

Response:
```json
{
  "title": "Article Title",
  "siteName": "Example Site",
  "byline": "Author Name",
  "audioUrl": "https://...",
  "naturalText": "Naturalized text...",
  "wordCount": 450
}
```

For long articles (>4500 chars) `audioUrl` will be `undefined` and `audioUrls` (array) will be returned instead.

---

### POST /extract-file

Extracts text from a PDF or ePub file. Does **not** perform TTS — use `/process-chapter` afterwards.

```bash
# PDF
curl -X POST http://localhost:3000/extract-file \
  -F "file=@/path/to/document.pdf"

# ePub
curl -X POST http://localhost:3000/extract-file \
  -F "file=@/path/to/book.epub"
```

Response (PDF):
```json
{
  "filename": "document.pdf",
  "text": "Extracted text...",
  "pageCount": 12
}
```

Response (ePub):
```json
{
  "filename": "book.epub",
  "text": "Full combined text...",
  "chapterCount": 8,
  "chapters": [{ "title": "Chapter 1", "text": "..." }]
}
```

---

### POST /process-chapter

Naturalizes and synthesizes a chapter or arbitrary text block.

```bash
curl -X POST http://localhost:3000/process-chapter \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"chapter-1","text":"Your text here...","voice":"af_nova"}'
```

Body:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | yes | Raw text to process |
| chapterId | string | yes | Unique identifier (used for caching) |
| voice | string | no | Kokoro voice ID (default: `af_bella`) |

Response:
```json
{
  "chapterId": "chapter-1",
  "audioUrl": "https://...",
  "naturalText": "Naturalized text..."
}
```
