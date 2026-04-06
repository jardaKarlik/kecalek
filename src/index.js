import "dotenv/config";
import { readFile } from "fs/promises";

console.log("ENV check:", {
  anthropic: !!process.env.ANTHROPIC_API_KEY,
  fal: !!process.env.FAL_KEY,
  falPrefix: process.env.FAL_KEY?.slice(0, 8),
});

import express from "express";
import multer from "multer";
import formidable from "formidable";
import { extractArticle } from "./scraper.js";
import { naturalizeText } from "./naturalizer.js";
import { synthesize } from "./tts.js";
import { extractPdf, extractEpub } from "./fileExtractor.js";
import * as cache from "./cache.js";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const upload = multer({ storage: multer.memoryStorage() });

const bookSessions = new Map();
// session: { id, filename, chapters, voice, processed: Map<index, {audioUrl, naturalText}> }

const VOICES = {
  american_english: ["af_bella", "af_nova", "af_sky", "am_adam", "am_michael"],
  british_english: ["bf_alice", "bf_emma", "bm_george", "bm_lewis"],
};

// GET /health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /voices
app.get("/voices", (_req, res) => {
  res.json(VOICES);
});

// POST /extract-url
app.post("/extract-url", async (req, res) => {
  const { url, voice } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    if (cache.has(url)) {
      return res.json(cache.get(url));
    }

    const { title, text, siteName, byline } = await extractArticle(url);
    const naturalText = await naturalizeText(text);
    const audioUrl = await synthesize(naturalText, voice);

    const result = {
      title,
      siteName,
      byline,
      audioUrl,
      naturalText,
      wordCount: naturalText.split(/\s+/).length,
    };

    cache.set(url, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /extract-file
app.post("/extract-file", (req, res) => {
  const form = formidable({ keepExtensions: true });
  form.parse(req, async (err, _fields, files) => {
    if (err) return res.status(400).json({ error: "Failed to parse form" });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const buffer = await readFile(file.filepath);
      const mime = file.mimetype || "";
      const name = file.originalFilename || "";
      const isPdf = mime.includes("pdf") || name.endsWith(".pdf");
      const isEpub = mime.includes("epub") || name.endsWith(".epub");

      if (isPdf) {
        const { text, pageCount } = await extractPdf(buffer);
        return res.json({ filename: name, text, pageCount });
      }

      if (isEpub) {
        const { text, chapterCount, chapters } = await extractEpub(buffer);
        return res.json({ filename: name, text, chapterCount, chapters });
      }

      res.status(400).json({ error: "Unsupported file type. Use PDF or ePub." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// POST /process-chapter
app.post("/process-chapter", async (req, res) => {
  const { text, chapterId, voice } = req.body;
  if (!text || !chapterId)
    return res.status(400).json({ error: "text and chapterId are required" });

  try {
    if (cache.has(chapterId)) {
      return res.json(cache.get(chapterId));
    }

    console.log(`[${chapterId}] Text length: ${text.length} chars`);
    console.log(`[${chapterId}] Naturalizing...`);
    const naturalText = await naturalizeText(text);
    console.log(`[${chapterId}] Synthesizing...`);
    const audioUrl = await synthesize(naturalText, voice);

    const result = { chapterId, audioUrl, naturalText };
    cache.set(chapterId, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /process-file — extrakce + naturalizace + TTS v jednom requestu
app.post("/process-file", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const voice = req.body.voice || "af_bella";
    const chapterIndex = parseInt(req.body.chapterIndex ?? "0");

    if (!file) return res.status(400).json({ error: "No file uploaded" });
    console.log(`[process-file] ${file.originalname} (${Math.round(file.size / 1024)}KB)`);

    // 1. Extrakce
    let extracted;
    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      extracted = await extractPdf(file.buffer);
    } else {
      extracted = await extractEpub(file.buffer);
    }

    console.log(`[process-file] ${extracted.chapterCount ?? 1} chapters found`);

    // 2. Vezmi jen jednu kapitolu (nebo celý PDF po částech)
    let textToProcess;
    let chapterTitle;

    if (extracted.chapters && extracted.chapters.length > 0) {
      const chapter = extracted.chapters[chapterIndex];
      if (!chapter) {
        return res.status(400).json({ error: `Chapter ${chapterIndex} not found` });
      }
      textToProcess = chapter.text;
      chapterTitle = chapter.title;
      console.log(`[process-file] Processing chapter ${chapterIndex}: "${chapterTitle}" (${textToProcess.length} chars)`);
    } else {
      // PDF — vezmi prvních 15000 znaků jako první "kapitolu"
      const CHUNK_SIZE = 15000;
      const start = chapterIndex * CHUNK_SIZE;
      textToProcess = extracted.text.slice(start, start + CHUNK_SIZE);
      chapterTitle = `Part ${chapterIndex + 1}`;
    }

    // 3. Naturalizace
    console.log(`[process-file] Naturalizing ${textToProcess.length} chars...`);
    const naturalText = await naturalizeText(textToProcess);
    console.log(`[process-file] Naturalized: ${naturalText.length} chars`);

    // 4. TTS
    console.log(`[process-file] Synthesizing...`);
    const audioUrl = await synthesize(naturalText, voice);

    res.json({
      filename: file.originalname,
      chapterIndex,
      chapterTitle,
      totalChapters: extracted.chapters?.length ?? Math.ceil(extracted.text.length / 15000),
      audioUrl,
      naturalText,
    });
  } catch (err) {
    console.error("[process-file] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /book/load — extrakce kapitol, uloží session, vrátí metadata (bez TTS)
app.post("/book/load", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const voice = req.body.voice || "af_bella";
    if (!file) return res.status(400).json({ error: "No file" });

    let extracted;
    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      extracted = await extractPdf(file.buffer);
      // PDF nemá chapters — vytvoř je ze segmentů
      if (!extracted.chapters) {
        const CHUNK_SIZE = 15000;
        const chunks = [];
        for (let i = 0; i < extracted.text.length; i += CHUNK_SIZE) {
          chunks.push({ id: String(i), title: `Part ${chunks.length + 1}`, text: extracted.text.slice(i, i + CHUNK_SIZE) });
        }
        extracted.chapters = chunks;
      }
    } else {
      extracted = await extractEpub(file.buffer);
    }

    const sessionId = Date.now().toString();
    bookSessions.set(sessionId, {
      id: sessionId,
      filename: file.originalname,
      chapters: extracted.chapters,
      voice,
      processed: new Map(),
      _processing: null,
    });

    console.log(`[book/load] Session ${sessionId}: ${extracted.chapters.length} chapters`);

    res.json({
      sessionId,
      filename: file.originalname,
      totalChapters: extracted.chapters.length,
      chapters: extracted.chapters.map((c, i) => ({
        index: i,
        title: c.title,
        length: c.text.length,
      })),
    });
  } catch (err) {
    console.error("[book/load]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /book/:sessionId/chapter/:index — zpracuje kapitolu, cachuje, spustí pre-fetch další
app.get("/book/:sessionId/chapter/:index", async (req, res) => {
  const { sessionId, index } = req.params;
  const chapterIndex = parseInt(index);
  const session = bookSessions.get(sessionId);

  if (!session) return res.status(404).json({ error: "Session not found" });

  const chapter = session.chapters[chapterIndex];
  if (!chapter) return res.status(404).json({ error: "Chapter not found" });

  // Cache hit
  if (session.processed.has(chapterIndex)) {
    console.log(`[book] Cache hit: chapter ${chapterIndex}`);
    const cached = session.processed.get(chapterIndex);
    _preProcessNext(session, chapterIndex + 1);
    return res.json({
      ...cached,
      chapterIndex,
      chapterTitle: chapter.title,
      totalChapters: session.chapters.length,
      filename: session.filename,
    });
  }

  console.log(`[book] Processing chapter ${chapterIndex}: "${chapter.title}" (${chapter.text.length} chars)`);
  try {
    const naturalText = await naturalizeText(chapter.text);
    const audioUrl = await synthesize(naturalText, session.voice);
    const result = { audioUrl, naturalText };
    session.processed.set(chapterIndex, result);

    _preProcessNext(session, chapterIndex + 1);

    res.json({
      ...result,
      chapterIndex,
      chapterTitle: chapter.title,
      totalChapters: session.chapters.length,
      filename: session.filename,
    });
  } catch (err) {
    console.error(`[book] Error chapter ${chapterIndex}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

async function _preProcessNext(session, nextIndex) {
  if (nextIndex >= session.chapters.length) return;
  if (session.processed.has(nextIndex)) return;
  if (session._processing === nextIndex) return;

  session._processing = nextIndex;
  const chapter = session.chapters[nextIndex];
  console.log(`[book] Pre-processing chapter ${nextIndex} on background...`);
  try {
    const naturalText = await naturalizeText(chapter.text);
    const audioUrl = await synthesize(naturalText, session.voice);
    session.processed.set(nextIndex, { audioUrl, naturalText });
    console.log(`[book] Pre-processed chapter ${nextIndex} ✓`);
  } catch (err) {
    console.warn(`[book] Pre-processing failed for chapter ${nextIndex}:`, err.message);
  } finally {
    session._processing = null;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TTS service running on port ${PORT}`);
});
