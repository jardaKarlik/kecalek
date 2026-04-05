import "dotenv/config";
import { fal } from "@fal-ai/client";

// @fal-ai/client automaticky načte FAL_KEY z process.env
// fal.config() NENÍ potřeba pokud je FAL_KEY v env

export async function synthesize(text, voice = "af_bella") {
  const result = await fal.subscribe("fal-ai/kokoro/american-english", {
    input: {
      prompt: text,
      voice,
      speed: 1.0,
    },
    logs: false,
  });

  return result.data.audio.url;
}
