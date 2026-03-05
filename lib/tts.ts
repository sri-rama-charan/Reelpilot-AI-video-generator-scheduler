// ─────────────────────────────────────────────────────────────────────────────
// Deepgram TTS  (direct REST — no SDK to avoid fetch compatibility issues)
// POST https://api.deepgram.com/v1/speak?model=<voice>
// Returns: MP3 buffer
// ─────────────────────────────────────────────────────────────────────────────
export async function deepgramTTS(
  text: string,
  voiceModel: string,
): Promise<Buffer> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPGRAM_API_KEY");

  const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voiceModel)}&encoding=mp3`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Deepgram TTS failed (${res.status}): ${err.slice(0, 200)}`,
    );
  }

  return Buffer.from(await res.arrayBuffer());
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
