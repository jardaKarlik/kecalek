import { fal } from "@fal-ai/client";

const MAX_CHUNK = 4500;

function splitIntoChunks(text) {
  const sentences = text.split(". ");
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? current + ". " + sentence : sentence;
    if (candidate.length > MAX_CHUNK && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function synthesizeChunk(text, voice) {
  const result = await fal.subscribe("fal-ai/kokoro/american-english", {
    input: { prompt: text, voice, speed: 1.0 },
  });
  return result.data.audio.url;
}

export async function synthesize(text, voice = "af_bella") {
  if (text.length <= MAX_CHUNK) {
    return synthesizeChunk(text, voice);
  }

  const chunks = splitIntoChunks(text);
  const audioUrls = await Promise.all(
    chunks.map((chunk) => synthesizeChunk(chunk, voice))
  );
  return { audioUrls };
}
