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
  if (!apiKey) throw new Error("Missing DEEPGRAM_API_KEY environment variable");

  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate TTS for empty text");
  }

  const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voiceModel)}&encoding=mp3`;

  let lastError: Error | null = null;

  // Retry up to 3 times for transient failures
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
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

      const buffer = Buffer.from(await res.arrayBuffer());

      if (buffer.length === 0) {
        throw new Error("Deepgram returned empty audio buffer");
      }

      return buffer;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[DeepgramTTS] Attempt ${attempt} failed:`, lastError.message);

      if (attempt < 3) {
        // Wait before retry (exponential backoff)
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error("Deepgram TTS failed after 3 attempts");
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
  const apiKey = process.env.FONADA_API_KEY;
  if (!apiKey) throw new Error("Missing FONADA_API_KEY environment variable");

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

  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    let lastError: Error | null = null;

    // Retry up to 3 times for transient failures
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("https://api.fonada.ai/tts/generate-audio-large", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: chunk,
            voice: voiceModel,
            language,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`FonadaLabs TTS failed (${res.status}): ${errText.slice(0, 200)}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          throw new Error("FonadaLabs returned empty audio buffer");
        }

        buffers.push(Buffer.from(arrayBuffer));
        break; // Success, exit retry loop
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[FonadaTTS] Chunk ${i + 1}/${textChunks.length} attempt ${attempt} failed:`, lastError.message);

        if (attempt < 3) {
          // Wait before retry (exponential backoff)
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    if (buffers.length <= i) {
      // All retries failed for this chunk
      throw lastError || new Error(`FonadaLabs TTS failed for chunk ${i + 1}`);
    }
  }

  return Buffer.concat(buffers);
}
