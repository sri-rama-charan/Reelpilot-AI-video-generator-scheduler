import { createClient } from "@deepgram/sdk";

if (!process.env.DEEPGRAM_API_KEY) {
  throw new Error("Missing DEEPGRAM_API_KEY environment variable");
}

if (!process.env.FONADA_API_KEY) {
  throw new Error("Missing FONADA_API_KEY environment variable");
}

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Deepgram TTS
// Docs: https://developers.deepgram.com/docs/text-to-speech
// Returns: MP3 buffer
// ─────────────────────────────────────────────────────────────────────────────
export async function deepgramTTS(
  text: string,
  voiceModel: string,
): Promise<Buffer> {
  const response = await deepgram.speak.request(
    { text },
    { model: voiceModel, encoding: "mp3" },
  );

  const stream = await response.getStream();
  if (!stream) throw new Error("Deepgram TTS returned no audio stream");

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0),
  );

  return Buffer.from(dataArray.buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// FonadaLabs TTS
// Docs: https://fonadalabs.ai/docs/text-to-speech
// Endpoint: POST https://api.fonada.ai/tts/generate-audio-large
// 450-char limit per request — we split and concatenate buffers
// ─────────────────────────────────────────────────────────────────────────────
export async function fonadaTTS(
  text: string,
  voiceModel: string,
  langCode: string,
): Promise<Buffer> {
  // Map lang codes → full language names that FonadaLabs expects
  const langNameMap: Record<string, string> = {
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
    "te-IN": "Telugu",
    "ta-IN": "Tamil",
    "en-US": "English",
  };
  const language = langNameMap[langCode] ?? "Hindi";

  // Split text into ≤450-char chunks
  const CHUNK_SIZE = 450;
  const textChunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    textChunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  const buffers: Buffer[] = [];

  for (const chunk of textChunks) {
    const res = await fetch("https://api.fonada.ai/tts/generate-audio-large", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FONADA_API_KEY}`,
      },
      body: JSON.stringify({
        input: chunk, // "input" — confirmed from docs
        voice: voiceModel, // e.g. "Vaanee", "Chitraa"
        language, // e.g. "Hindi", "Telugu"
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`FonadaLabs TTS failed (${res.status}): ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    buffers.push(Buffer.from(arrayBuffer));
  }

  return Buffer.concat(buffers);
}
