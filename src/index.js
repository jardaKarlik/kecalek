import "dotenv/config";
import { readFile } from "fs/promises";

console.log("ENV check:", {
  anthropic: !!process.env.ANTHROPIC_API_KEY,
  fal: !!process.env.FAL_KEY,
  falPrefix: process.env.FAL_KEY?.slice(0, 8),
});

import express from "express";
import formidable from "formidable";
import { extractArticle } from "./scraper.js";
import { naturalizeText } from "./naturalizer.js";
import { synthesize } from "./tts.js";
import { extractPdf, extractEpub } from "./fileExtractor.js";
import * as cache from "./cache.js";

const app = express();
app.use(express.json());

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

    const naturalText = await naturalizeText(text);
    const audioUrl = await synthesize(naturalText, voice);

    const result = { chapterId, audioUrl, naturalText };
    cache.set(chapterId, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TTS service running on port ${PORT}`);
});
