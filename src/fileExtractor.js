import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { EPub } from "epub2";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

export async function extractPdf(buffer) {
  const data = await pdfParse(buffer);
  return {
    text: data.text.trim(),
    pageCount: data.numpages,
  };
}

export async function extractEpub(buffer) {
  // epub2 requires a file path, so write buffer to a temp file
  const tmpPath = join(tmpdir(), `epub-${randomBytes(8).toString("hex")}.epub`);
  await writeFile(tmpPath, buffer);

  try {
    const epub = await EPub.createAsync(tmpPath);
    const chapters = [];

    for (const chapter of epub.flow) {
      try {
        const getChapter = promisify(epub.getChapter.bind(epub));
        const html = await getChapter(chapter.id);
        // Strip HTML tags for plain text
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
        if (text.length > 50) {
          chapters.push({ title: chapter.title || "", text });
        }
      } catch {
        // Skip unreadable chapters
      }
    }

    const text = chapters.map((c) => c.text).join("\n\n");
    return { text, chapterCount: chapters.length, chapters };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
