import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function extractArticle(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let html;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
    });
    html = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article || !article.textContent || article.textContent.length < 200) {
    throw new Error("Could not extract article content");
  }

  const cleanText = article.textContent
    .replace(/[ \t]+/g, " ")
    .replace(/(\r?\n){3,}/g, "\n\n")
    .trim();

  return {
    title: article.title,
    text: cleanText,
    siteName: article.siteName,
    byline: article.byline,
    length: cleanText.length,
  };
}
