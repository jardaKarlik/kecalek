import sdk from "microsoft-cognitiveservices-speech-sdk";
import { splitIntoChunks } from "./textUtils.js";

export async function synthesizeCzech(text, voice = "cs-CZ-AntoninNeural") {
  const chunks = splitIntoChunks(text, 4000);
  if (chunks.length === 1) return _azureSpeak(chunks[0], voice);

  const urls = [];
  for (let i = 0; i < chunks.length; i += 2) {
    const batch = chunks.slice(i, i + 2);
    console.log(`Azure TTS batch ${Math.floor(i / 2) + 1}/${Math.ceil(chunks.length / 2)}`);
    const results = await Promise.all(batch.map((c) => _azureSpeak(c, voice)));
    urls.push(...results);
  }
  return urls;
}

async function _azureSpeak(text, voice) {
  return new Promise((resolve, reject) => {
    const config = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_TTS_KEY,
      process.env.AZURE_TTS_REGION ?? "westeurope"
    );
    config.speechSynthesisVoiceName = voice;
    config.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

    const synth = new sdk.SpeechSynthesizer(config, null);
    synth.speakTextAsync(
      text,
      (result) => {
        synth.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const b64 = Buffer.from(result.audioData).toString("base64");
          resolve(`data:audio/mp3;base64,${b64}`);
        } else {
          reject(new Error(`Azure TTS: ${result.errorDetails}`));
        }
      },
      (err) => { synth.close(); reject(new Error(err)); }
    );
  });
}
