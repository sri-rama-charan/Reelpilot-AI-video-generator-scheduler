import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase";
import { groq } from "@/lib/groq";
import { deepgramTTS, fonadaTTS } from "@/lib/tts";
import { ALL_VOICES, LANGUAGES } from "@/lib/constants/voices";

export type GenerateVideoEvent = {
  data: {
    seriesId: number;
    userId: string;
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
    const { seriesId, userId } = event.data;

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
    // STEP 4: Generate Captions
    // ─────────────────────────────────────────────────────────────
    const captions = await step.run("generate-captions", async () => {
      // TODO: Call caption/transcription model (e.g. Whisper) with voiceAudio.audioUrl
      console.log(
        `[placeholder] Generating captions with style: ${series.caption_style}`,
      );
      return {
        srtContent:
          "1\n00:00:00,000 --> 00:00:05,000\nPlaceholder caption text",
        words: [],
      };
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Generate Images from AI prompts
    // ─────────────────────────────────────────────────────────────
    const images = await step.run("generate-images", async () => {
      // TODO: Call image generation API (e.g. Stable Diffusion / Flux) for each scene
      console.log(`[placeholder] Generating ${script.scenes.length} images`);
      return script.scenes.map((scene, i) => ({
        order: scene.order,
        prompt: scene.imagePrompt,
        imageUrl: `https://placeholder.image/frame-${i + 1}.jpg`,
      }));
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Save everything to database
    // ─────────────────────────────────────────────────────────────
    const savedVideo = await step.run("save-to-database", async () => {
      // TODO: Save the completed video record to Supabase `videos` table
      console.log(
        `[placeholder] Saving video for series ${seriesId} to database`,
      );
      const { data, error } = await supabaseAdmin
        .from("videos")
        .insert({
          series_id: seriesId,
          user_id: userId,
          title: script.title,
          script: voiceAudio.fullScript,
          audio_urls: voiceAudio.sceneAudios,
          captions: captions.srtContent,
          images: images.map((img) => img.imageUrl),
          status: "completed",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save video: ${error.message}`);
      }

      return data;
    });

    return {
      success: true,
      seriesId,
      videoId: savedVideo?.id,
    };
  },
);
