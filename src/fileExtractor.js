import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { EPub } from "epub2";
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
        const text = await new Promise((resolve, reject) => {
          epub.getChapter(chapter.id, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        // Odstraň HTML tagy
        const clean = text
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim();

        const SKIP_TITLES = [
          "table of contents",
          "contents",
          "index",
          "bibliography",
          "acknowledgements",
          "acknowledgments",
          "about the author",
          "also by",
          "copyright",
          "dedication",
          "cover",
          "title page",
          "half title",
        ];

        const rawTitle = (chapter.title ?? "").toLowerCase().trim();
        // Filtruj POUZE pokud má kapitola explicitní název který matchuje
        // Pokud title chybí nebo je prázdný, kapitolu NEVYNECHÁVEJ
        const shouldSkip = rawTitle.length > 0 &&
          SKIP_TITLES.some(skip => rawTitle === skip || rawTitle.startsWith(skip));

        if (clean.length > 200 && !shouldSkip) {
          chapters.push({
            id: chapter.id,
            title: chapter.title?.trim() || `Chapter ${chapters.length + 1}`,
            text: clean,
          });
        }
      } catch (e) {
        console.warn(`Skipping chapter ${chapter.id}:`, e.message);
      }
    }

    return {
      text: chapters.map((c) => c.text).join("\n\n"),
      chapters,
      chapterCount: chapters.length,
    };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
