import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const MAX_CHARS = 12000;

export async function translateAndNaturalize(rawText) {
  if (rawText.length <= MAX_CHARS) return _translateChunk(rawText);

  const paragraphs = rawText.split(/\n\n+/);
  const chunks = [];
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > MAX_CHARS) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  console.log(`[translator] Translating ${chunks.length} chunks...`);
  const results = [];
  for (const chunk of chunks) {
    results.push(await _translateChunk(chunk));
  }
  return results.join(" ");
}

async function _translateChunk(text) {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Translate the following text to Czech and rewrite it so it sounds \
completely natural when read aloud by a text-to-speech engine.
Rules:
- Translate accurately, preserving meaning and tone
- Expand abbreviations to Czech spoken form
- Remove page numbers, figure references, URLs
- Convert symbols: % → procent, & → a, $ → dolarů
- Break sentences over 40 words into shorter ones
- Use natural Czech speech patterns
- Output ONLY the translated text, no preamble

TEXT:
${text}`,
    }],
  });
  return msg.content[0].text;
}
