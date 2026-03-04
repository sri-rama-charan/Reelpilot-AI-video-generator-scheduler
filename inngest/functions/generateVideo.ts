import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase";
import { groq } from "@/lib/groq";
import { deepgramTTS, fonadaTTS } from "@/lib/tts";
import { ALL_VOICES, LANGUAGES } from "@/lib/constants/voices";

export type GenerateVideoEvent = {
  data: {
    seriesId: number;
    userId: string;
    videoId?: number; // pre-created row ID from the generate API route
  };
};

export const generateVideo = inngest.createFunction(
  {
    id: "generate-video",
    name: "Generate Video",
    // Limit concurrency so we don't overwhelm external APIs
    concurrency: { limit: 5 },
  },
  { event: "video/generate" },
  async ({ event, step }) => {
    const { seriesId, userId, videoId } = event.data;

    // Guard: ensure required event data is present
    if (!seriesId || !userId) {
      throw new Error(
        `Invalid event data — seriesId: ${seriesId}, userId: ${userId}. ` +
          `Make sure to trigger this function via the "Generate New Video" button, not manually from Inngest Dev UI.`,
      );
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Fetch Series data from Supabase
    // ─────────────────────────────────────────────────────────────
    const series = await step.run("fetch-series", async () => {
      const { data, error } = await supabaseAdmin
        .from("series")
        .select("*")
        .eq("id", seriesId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        throw new Error(`Series ${seriesId} not found or access denied`);
      }

      return data;
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Generate Video Script using Gemini AI
    // ─────────────────────────────────────────────────────────────
    const script = await step.run("generate-script", async () => {
      const durationSec = parseInt(series.duration, 10) || 60;
      // Scale image count to video length
      const imageCount = durationSec <= 45 ? 4 : durationSec <= 70 ? 5 : 6;

      const prompt = `
You are an expert short-form video scriptwriter. Create a video script based on the details below.

Video Details:
- Niche/Topic: ${series.niche}
- Language: ${series.language}
- Video Style: ${series.video_style}
- Duration: approximately ${durationSec} seconds

Instructions:
- Divide the video into exactly ${imageCount} scenes.
- For each scene, write a short natural voiceover line (2-3 sentences) that sounds great when spoken aloud.
- Together, all scene voiceovers should form a complete, engaging ${durationSec}-second script when read at a normal speaking pace.
- For each scene, also generate a detailed image prompt matching the "${series.video_style}" visual style (include lighting, mood, composition, subject).
- IMPORTANT: Voiceovers must flow naturally from one scene to the next — no bullet points, no lists.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation text.

Required JSON format:
{
  "title": "Short catchy video title (max 60 chars)",
  "scenes": [
    {
      "order": 1,
      "voiceover": "Natural spoken script for this scene (2-3 sentences)",
      "imagePrompt": "Detailed image generation prompt for scene 1 in ${series.video_style} style"
    }
  ]
}
`.trim();

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are an expert short-form video scriptwriter. Always respond with valid JSON only. No markdown, no explanation, just raw JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      });

      const rawText = response.choices[0]?.message?.content ?? "";

      let parsed: {
        title: string;
        scenes: { order: number; voiceover: string; imagePrompt: string }[];
      };

      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new Error(`Groq returned invalid JSON: ${rawText.slice(0, 300)}`);
      }

      if (
        !parsed.title ||
        !Array.isArray(parsed.scenes) ||
        parsed.scenes.length === 0
      ) {
        throw new Error(
          "Groq response missing required fields (title, scenes)",
        );
      }

      // Validate each scene has required fields
      for (const scene of parsed.scenes) {
        if (!scene.voiceover || !scene.imagePrompt) {
          throw new Error(
            `Scene ${scene.order} is missing voiceover or imagePrompt`,
          );
        }
      }

      return parsed;
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Generate Voice using TTS (Deepgram or FonadaLabs)
    // ─────────────────────────────────────────────────────────────
    const voiceAudio = await step.run("generate-voice", async () => {
      // Resolve voice metadata from constants
      const voiceMeta = ALL_VOICES.find((v) => v.modelName === series.voice);
      if (!voiceMeta) throw new Error(`Unknown voice: ${series.voice}`);

      const langMeta = LANGUAGES.find((l) => l.language === series.language);
      const langCode = langMeta?.modelLangCode ?? "en-US";

      // Generate TTS per scene so each segment maps to its image
      const sceneAudios: { order: number; audioUrl: string }[] = [];

      for (const scene of script.scenes.sort((a, b) => a.order - b.order)) {
        let audioBuffer: Buffer;

        if (voiceMeta.model === "deepgram") {
          audioBuffer = await deepgramTTS(scene.voiceover, series.voice);
        } else if (voiceMeta.model === "fonadalab") {
          audioBuffer = await fonadaTTS(
            scene.voiceover,
            series.voice,
            langCode,
          );
        } else {
          throw new Error(`Unsupported TTS provider: ${voiceMeta.model}`);
        }

        // Upload each scene's audio to Supabase Storage
        const filePath = `videos/${userId}/series-${seriesId}/audio/scene-${scene.order}.mp3`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("vidgen-assets")
          .upload(filePath, audioBuffer, {
            contentType: "audio/mpeg",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(
            `Failed to upload audio for scene ${scene.order}: ${uploadError.message}`,
          );
        }

        const { data: urlData } = supabaseAdmin.storage
          .from("vidgen-assets")
          .getPublicUrl(filePath);

        sceneAudios.push({ order: scene.order, audioUrl: urlData.publicUrl });
      }

      // Also concatenate full script for reference / captioning
      const fullScript = script.scenes
        .sort((a, b) => a.order - b.order)
        .map((s) => s.voiceover)
        .join(" ");

      return { sceneAudios, fullScript, provider: voiceMeta.model };
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Generate Captions using Deepgram Transcription
    // ─────────────────────────────────────────────────────────────
    const captions = await step.run("generate-captions", async () => {
      const { createClient } = await import("@deepgram/sdk");
      const dg = createClient(process.env.DEEPGRAM_API_KEY!);

      // Determine language code for Deepgram (default English)
      const langMeta = LANGUAGES.find((l) => l.language === series.language);
      const dgLang = langMeta?.modelLangCode?.split("-")[0] ?? "en"; // "hi", "en", etc.

      // Helper: format seconds → SRT timestamp (HH:MM:SS,mmm)
      const toSrtTime = (secs: number): string => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.round((secs % 1) * 1000);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };

      // Helper: group words into caption lines (~5 words each)
      const groupWords = (
        words: { word: string; start: number; end: number }[],
        wordsPerLine = 5,
      ) => {
        const lines = [];
        for (let i = 0; i < words.length; i += wordsPerLine) {
          const group = words.slice(i, i + wordsPerLine);
          lines.push({
            text: group.map((w) => w.word).join(" "),
            start: group[0].start,
            end: group[group.length - 1].end,
          });
        }
        return lines;
      };

      const sceneTranscriptions: {
        order: number;
        words: { word: string; start: number; end: number }[];
        srt: string;
      }[] = [];

      let globalSrtIndex = 1;
      let globalTimeOffset = 0; // accumulate time across scenes for the full SRT

      for (const sceneAudio of voiceAudio.sceneAudios.sort(
        (a, b) => a.order - b.order,
      )) {
        const { result, error } = await dg.listen.prerecorded.transcribeUrl(
          { url: sceneAudio.audioUrl },
          {
            model: "nova-3",
            smart_format: true,
            language: dgLang,
            punctuate: true,
            words: true, // ← word-level timestamps
          },
        );

        if (error)
          throw new Error(
            `Deepgram error on scene ${sceneAudio.order}: ${error.message}`,
          );

        const words =
          result?.results?.channels?.[0]?.alternatives?.[0]?.words?.map(
            (w) => ({
              word: w.word ?? "",
              start: w.start ?? 0,
              end: w.end ?? 0,
            }),
          ) ?? [];

        // Build per-scene SRT (times are scene-relative)
        const sceneCaptionLines = groupWords(words);
        let sceneSrt = "";
        let localIdx = 1;
        for (const line of sceneCaptionLines) {
          sceneSrt += `${localIdx}\n${toSrtTime(line.start)} --> ${toSrtTime(line.end)}\n${line.text}\n\n`;
          localIdx++;
        }

        // Build global SRT (times shifted by cumulative offset)
        const sceneDuration =
          result?.results?.channels?.[0]?.alternatives?.[0]?.words?.slice(-1)[0]
            ?.end ?? 0;

        for (const line of sceneCaptionLines) {
          const srtBlock = `${globalSrtIndex}\n${toSrtTime(line.start + globalTimeOffset)} --> ${toSrtTime(line.end + globalTimeOffset)}\n${line.text}\n\n`;
          sceneTranscriptions.push({
            order: sceneAudio.order,
            words,
            srt: sceneSrt,
          });
          globalSrtIndex++;
          // Note: global SRT is built separately below
          void srtBlock; // we accumulate below
        }

        globalTimeOffset += sceneDuration;

        sceneTranscriptions.push({
          order: sceneAudio.order,
          words,
          srt: sceneSrt,
        });
      }

      // Deduplicate (we pushed twice above for the global index loop — fix)
      const uniqueScenes = sceneTranscriptions.filter(
        (s, idx, arr) => arr.findIndex((x) => x.order === s.order) === idx,
      );

      // Build a single merged SRT from all scenes with time offsets
      let mergedSrt = "";
      let srtIdx = 1;
      let timeOffset = 0;
      for (const scene of uniqueScenes.sort((a, b) => a.order - b.order)) {
        const captionLines = groupWords(scene.words);
        for (const line of captionLines) {
          mergedSrt += `${srtIdx}\n${toSrtTime(line.start + timeOffset)} --> ${toSrtTime(line.end + timeOffset)}\n${line.text}\n\n`;
          srtIdx++;
        }
        const lastWord = scene.words[scene.words.length - 1];
        timeOffset += lastWord?.end ?? 0;
      }

      return {
        scenes: uniqueScenes,
        mergedSrt: mergedSrt.trim(),
      };
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Generate Images using HuggingFace FLUX.1-schnell (free)
    // Free with a free HF account token — no credit card needed.
    // 300 requests/hour on free tier.
    // ─────────────────────────────────────────────────────────────
    const images = await step.run("generate-images", async () => {
      const hfToken = process.env.HF_TOKEN;
      if (!hfToken) throw new Error("Missing HF_TOKEN environment variable");

      // FLUX.1-schnell: 12B param model, fast (1-4 steps), high quality
      const HF_MODEL_URL =
        "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

      const sceneImages: { order: number; prompt: string; imageUrl: string }[] =
        [];

      for (const scene of script.scenes.sort((a, b) => a.order - b.order)) {
        // HF Inference API: POST with JSON body, returns raw image bytes
        const imgRes = await fetch(HF_MODEL_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true", // wait if model is loading
          },
          body: JSON.stringify({
            inputs: scene.imagePrompt,
            parameters: {
              width: 1024,
              height: 576, // 16:9 for video
              num_inference_steps: 4,
              guidance_scale: 0, // FLUX.1-schnell uses 0 guidance
            },
          }),
        });

        if (!imgRes.ok) {
          const errText = await imgRes.text();
          throw new Error(
            `HuggingFace image generation failed for scene ${scene.order} (${imgRes.status}): ${errText.slice(0, 200)}`,
          );
        }

        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

        // Upload to Supabase Storage
        const filePath = `videos/${userId}/series-${seriesId}/images/scene-${scene.order}.jpg`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("vidgen-assets")
          .upload(filePath, imgBuffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(
            `Failed to upload image for scene ${scene.order}: ${uploadError.message}`,
          );
        }

        const { data: urlData } = supabaseAdmin.storage
          .from("vidgen-assets")
          .getPublicUrl(filePath);

        sceneImages.push({
          order: scene.order,
          prompt: scene.imagePrompt,
          imageUrl: urlData.publicUrl,
        });
      }

      return sceneImages;
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Save all generated assets to Supabase
    // UPDATE the pre-created row instead of inserting a new one
    // ─────────────────────────────────────────────────────────────
    const savedVideo = await step.run("save-to-database", async () => {
      const payload = {
        title: script.title,
        script: voiceAudio.fullScript,
        audio_urls: voiceAudio.sceneAudios, // [{ order, audioUrl }]
        captions_srt: captions.mergedSrt, // full SRT string
        captions_scenes: captions.scenes, // [{ order, srt, words[] }]
        images, // [{ order, prompt, imageUrl }]
        tts_provider: voiceAudio.provider,
        status: "completed",
      };

      if (videoId) {
        // Update the pre-created row
        const { data, error } = await supabaseAdmin
          .from("videos")
          .update(payload)
          .eq("id", videoId)
          .select()
          .single();
        if (error) throw new Error(`Failed to update video: ${error.message}`);
        return data;
      } else {
        // Fallback: insert a new row (triggered manually without pre-created row)
        const { data, error } = await supabaseAdmin
          .from("videos")
          .insert({ series_id: seriesId, user_id: userId, ...payload })
          .select()
          .single();
        if (error) throw new Error(`Failed to insert video: ${error.message}`);
        return data;
      }
    });

    return {
      success: true,
      seriesId,
      videoId: savedVideo?.id,
    };
  },
);
