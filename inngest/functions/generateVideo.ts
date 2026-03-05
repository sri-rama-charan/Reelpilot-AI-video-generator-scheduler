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
    concurrency: { limit: 5 },
    onFailure: async ({ error, event }) => {
      // In Inngest onFailure, the original event is nested:
      // event.data.event.data contains the original trigger payload
      const originalData = (
        event.data as unknown as {
          event: { data: { videoId?: number } };
        }
      ).event?.data;

      const failedVideoId = originalData?.videoId;
      if (failedVideoId) {
        await supabaseAdmin
          .from("videos")
          .update({
            status: "failed",
            error_message: error.message?.slice(0, 500) ?? "Generation failed",
          })
          .eq("id", failedVideoId);
      }
    },
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
      // Parse duration boundaries from string like "30-50" -> min:30, max:50
      let minDurationSec = 30;
      let maxDurationSec = 45;
      const durationMatch = series.duration?.match(/\d+/g);
      if (durationMatch) {
        if (durationMatch.length === 1) {
          minDurationSec = Math.max(15, Number(durationMatch[0]) - 10);
          maxDurationSec = Number(durationMatch[0]);
        } else if (durationMatch.length >= 2) {
          minDurationSec = Number(durationMatch[0]);
          maxDurationSec = Number(durationMatch[1]);
        }
      }

      // Determine dynamic scene count depending on duration and topic complexity
      const minScenes = Math.max(3, Math.floor(minDurationSec / 10));
      const maxScenes = Math.max(minScenes + 1, Math.floor(maxDurationSec / 6));

      // Unique run ID so Groq doesn't return a cached/identical response
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Calculate target word count
      const minTotalWords = Math.floor(minDurationSec * 2.5); // ~150 wpm
      const maxTotalWords = Math.floor(maxDurationSec * 2.5);

      const prompt = `
You are an expert short-form video scriptwriter. Create a highly engaging and informative video script based on the details below.

Video Details:
- Niche/Topic: ${series.niche}
- Language: ${series.language}
- Video Style: ${series.video_style}
- Target Duration: Between ${minDurationSec} and ${maxDurationSec} seconds
- Run ID: ${runId} (use this to ensure unique output)

Content & Length Instructions:
1. FULL COVERAGE: Do not cut the topic short. Provide all necessary information to fully satisfy the viewer's curiosity.
2. WORD COUNT (CRITICAL): To guarantee a length of ${minDurationSec}-${maxDurationSec} seconds, your total combined voiceover MUST be between ${minTotalWords} and ${maxTotalWords} words. (Do NOT generate scripts shorter than ${minTotalWords} words!).
3. DYNAMIC SCENES: Divide the script into however many scenes the topic requires to flow well, but choose a number between ${minScenes} and ${maxScenes} scenes.
4. PACING (CRITICAL): Each scene's voiceover MUST be at least 25 words long. Do not write short 1-sentence scenes. This forces the images to stay on screen for a comfortable duration.
5. UNIQUENESS: The angle, hook, and delivery must be completely new.

Output Requirements:
- Each scene must have an "order" (1, 2, 3...), a "voiceover", and an "imagePrompt".
- Each image prompt must describe a DISTINCT, VISUALLY DIFFERENT scene.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences.

Required JSON format:
{
  "title": "Short catchy title",
  "scenes": [
    {
      "order": 1,
      "voiceover": "Write a long, detailed paragraph here containing at least 25 words answering the topic. It must be detailed enough to keep the viewer engaged for several seconds...",
      "imagePrompt": "Detailed visual description..."
    }
  ]
}
`.trim();

      let parsed: {
        title: string;
        scenes: { order: number; voiceover: string; imagePrompt: string }[];
      } | null = null;
      let lastError = "";

      // Retry loop to enforce strict word count minimums
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert short-form video scriptwriter. Always respond with valid JSON only. Keep voiceovers highly detailed to hit the exact word count requested.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7, // Lower temperature to improve instruction following (word counts)
            response_format: { type: "json_object" },
          });

          const rawText = response.choices[0]?.message?.content ?? "";
          let tempParsed;
          try {
            tempParsed = JSON.parse(rawText);
          } catch {
            throw new Error(
              `Groq returned invalid JSON: ${rawText.slice(0, 300)}`,
            );
          }

          if (
            !tempParsed.title ||
            !Array.isArray(tempParsed.scenes) ||
            tempParsed.scenes.length === 0
          ) {
            throw new Error(
              "Groq response missing required fields (title, scenes)",
            );
          }

          // Validate required fields
          for (const scene of tempParsed.scenes) {
            if (!scene.voiceover || !scene.imagePrompt) {
              throw new Error(
                `Scene ${scene.order} is missing voiceover or imagePrompt`,
              );
            }
          }

          // Validate strict word count
          const totalGeneratedWords = tempParsed.scenes.reduce(
            (acc: number, s: any) =>
              acc + (s.voiceover.split(/\s+/).length || 0),
            0,
          );

          if (totalGeneratedWords < minTotalWords) {
            lastError = `Generated script was too short (${totalGeneratedWords} words) vs minimum required (${minTotalWords} words).`;
            if (attempt < 3) {
              console.log(
                `[step-2] Attempt ${attempt}: Word count too low (${totalGeneratedWords} < ${minTotalWords}). Retrying...`,
              );
              continue; // Retry
            } else {
              throw new Error(lastError); // Explode on 3rd attempt
            }
          }

          parsed = tempParsed;
          break; // Success
        } catch (e: any) {
          console.error(`[step-2] Attempt ${attempt} failed: ${e.message}`);
          lastError = e.message;
          if (attempt === 3) throw e;
        }
      }

      if (!parsed) {
        throw new Error(
          `Failed to generate valid script after 3 attempts. Last error: ${lastError}`,
        );
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
              // Random seed per scene = different image each generation run
              seed: Math.floor(Math.random() * 2147483647),
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

    // ─────────────────────────────────────────────────────────────
    // STEP 7: Render final MP4 using Remotion
    // Runs inside the Inngest worker — no AWS needed.
    // Uses @remotion/renderer which bundles its own FFmpeg.
    // ─────────────────────────────────────────────────────────────
    const renderResult = await step.run("render-video", async () => {
      const { bundle } = await import("@remotion/bundler");
      const { renderMedia, selectComposition } =
        await import("@remotion/renderer");
      const path = await import("path");
      const os = await import("os");
      const fs = await import("fs");

      // The final video ID (pre-created or just inserted)
      const finalVideoId = videoId ?? savedVideo?.id;
      if (!finalVideoId) throw new Error("No video ID to attach render to");

      // --- 1. Build scene input props from previous steps ---
      const sceneInputs = script.scenes
        .sort((a, b) => a.order - b.order)
        .map((scene) => {
          const audioEntry = voiceAudio.sceneAudios.find(
            (a) => a.order === scene.order,
          );
          const captionEntry = captions.scenes.find(
            (c: { order: number }) => c.order === scene.order,
          );
          const imageEntry = images.find((img) => img.order === scene.order);

          return {
            order: scene.order,
            imageUrl: imageEntry?.imageUrl ?? "",
            audioUrl: audioEntry?.audioUrl ?? "",
            words: captionEntry?.words ?? [],
          };
        });

      // --- 2. Bundle the Remotion composition ---
      const entryPoint = path.default.resolve(
        process.cwd(),
        "remotion/src/Root.tsx",
      );
      console.log("[step-7] Bundling Remotion composition...");
      const bundleLocation = await bundle({
        entryPoint,
        webpackOverride: (config) => config,
      });

      // --- 3. Resolve composition with actual input props ---
      // Resolve background music URL from series.background_music array
      const { BACKGROUND_MUSIC } = await import("@/lib/constants/music");
      const musicId = Array.isArray(series.background_music)
        ? series.background_music[0]
        : series.background_music;
      const musicEntry = BACKGROUND_MUSIC.find((m) => m.id === musicId);
      const backgroundMusicUrl = musicEntry?.url ?? "";

      // The cap is used purely as a safety mechanism, real duration driven by audio length
      let maxDurationSec = 45;
      const durationMatch = series.duration?.match(/\d+/g);
      if (durationMatch) {
        maxDurationSec = Math.max(...durationMatch.map(Number));
      }

      // Add a 5 second leeway to the hard cap so it doesn't arbitrarily cut off late scenes
      const totalDurationInFrames = (maxDurationSec + 5) * 30; // hard cap

      const inputProps = {
        scenes: sceneInputs,
        captionStyle: series.caption_style ?? "style-1",
        fps: 30,
        backgroundMusicUrl,
        totalDurationInFrames,
      };

      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "VideoComposition",
        inputProps,
      });

      // --- 4. Render to a temp file ---
      const tmpDir = os.default.tmpdir();
      const outputPath = path.default.join(
        tmpDir,
        `vidgen-${finalVideoId}-${Date.now()}.mp4`,
      );

      console.log(`[step-7] Rendering to ${outputPath}...`);
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation: outputPath,
        inputProps,
        onProgress: ({ progress }) => {
          console.log(
            `[step-7] Render progress: ${Math.round(progress * 100)}%`,
          );
        },
      });

      // --- 5. Upload MP4 to Supabase Storage ---
      const fileBuffer = fs.default.readFileSync(outputPath);
      const storagePath = `videos/${userId}/series-${seriesId}/final-${finalVideoId}.mp4`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("vidgen-assets")
        .upload(storagePath, fileBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      // Clean up temp file
      fs.default.unlinkSync(outputPath);

      if (uploadError) {
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("vidgen-assets")
        .getPublicUrl(storagePath);

      // --- 6. Save video_url back to the videos row ---
      await supabaseAdmin
        .from("videos")
        .update({ video_url: urlData.publicUrl, status: "completed" })
        .eq("id", finalVideoId);

      console.log(`[step-7] Video rendered and saved: ${urlData.publicUrl}`);
      return { videoUrl: urlData.publicUrl };
    });

    return {
      success: true,
      seriesId,
      videoId: savedVideo?.id,
      videoUrl: renderResult.videoUrl,
    };
  },
);
