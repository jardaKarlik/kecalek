import "dotenv/config";
import { fal } from "@fal-ai/client";
import { splitIntoChunks } from "./textUtils.js";

export async function synthesize(text, voice = "af_bella") {
  const chunks = splitIntoChunks(text, 4000);

  if (chunks.length === 1) {
    const result = await fal.subscribe("fal-ai/kokoro/american-english", {
      input: { prompt: chunks[0], voice, speed: 1.0 },
      logs: false,
    });
    const estimatedCost = (chunks[0].length / 1000 * 0.005).toFixed(4);
    console.log(`[tts] Chunk done (~$${estimatedCost} estimated)`);
    return result.data.audio.url;
  }

  // Více chunků — zpracuj paralelně po 3 najednou (rate limiting)
  const audioUrls = [];
  for (let i = 0; i < chunks.length; i += 3) {
    const batch = chunks.slice(i, i + 3);
    console.log(`TTS batch ${Math.floor(i / 3) + 1}/${Math.ceil(chunks.length / 3)} (${batch.length} chunks)`);
    const results = await Promise.all(
      batch.map((chunk) =>
        fal.subscribe("fal-ai/kokoro/american-english", {
          input: { prompt: chunk, voice, speed: 1.0 },
          logs: false,
        })
      )
    );
    const batchCost = batch.reduce((sum, c) => sum + c.length / 1000 * 0.005, 0).toFixed(4);
    console.log(`[tts] Batch done (~$${batchCost} estimated)`);
    audioUrls.push(...results.map((r) => r.data.audio.url));
  }
  return audioUrls;
}
