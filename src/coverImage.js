import { fal } from "@fal-ai/client";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function generateCoverImage(chapterText, bookTitle) {
  try {
    const promptResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `Based on this book excerpt, write a short visual prompt \
for an AI image generator. Atmospheric, artistic, no text in image. Max 40 words.
Book: "${bookTitle}"
Excerpt: ${chapterText.slice(0, 400)}`,
      }],
    });
    const imagePrompt = promptResponse.content[0].text.trim();
    console.log(`[cover] Prompt: ${imagePrompt}`);

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: imagePrompt,
        image_size: "square_hd",
        num_inference_steps: 4,
        num_images: 1,
      },
      logs: false,
    });
    console.log(`[cover] Generated (flux/schnell ~$0.003)`);
    return result.data.images[0].url;
  } catch (err) {
    console.warn("[cover] Failed:", err.message);
    return null;
  }
}
