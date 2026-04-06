export function splitIntoChunks(text, maxChars) {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    // Pokud je jedna věta delší než limit, rozděl na slova
    if (sentence.length > maxChars) {
      if (current) { chunks.push(current.trim()); current = ""; }
      const words = sentence.split(" ");
      let wordChunk = "";
      for (const word of words) {
        if ((wordChunk + " " + word).length > maxChars) {
          chunks.push(wordChunk.trim());
          wordChunk = word;
        } else {
          wordChunk += (wordChunk ? " " : "") + word;
        }
      }
      if (wordChunk) current = wordChunk;
      continue;
    }

    if ((current + sentence).length > maxChars) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}
