import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_INSTRUCTIONS = `Rewrite the following text so it sounds natural when spoken aloud by a text-to-speech engine.
Rules:
- Expand abbreviations: e.g. → for example, etc. → and so on, vs. → versus, Mr. → Mister, Dr. → Doctor
- Remove: page numbers, figure references (Fig. 1), URLs, email addresses, social media handles
- Convert symbols to words: % → percent, & → and, + → plus, $ → dollars, # → number
- Replace em-dashes and parenthetical asides with commas or natural pauses
- Break sentences longer than 40 words into two sentences
- Do NOT summarize, shorten, or change the meaning
- Output ONLY the rewritten text, no preamble`;

export async function naturalizeText(rawText) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${SYSTEM_INSTRUCTIONS}\n\n${rawText}`,
      },
    ],
  });

  return message.content[0].text;
}
