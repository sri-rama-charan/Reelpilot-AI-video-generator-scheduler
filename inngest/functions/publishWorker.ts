import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase";
import { subHours, isPast } from "date-fns";
import { generateVideo } from "./generateVideo";

export const publishWorker = inngest.createFunction(
  {
    id: "publish-worker",
    name: "Publish Video Worker",
    concurrency: { limit: 5 },
  },
  { event: "video/publish.scheduled" },
  async ({ event, step }) => {
    const { seriesId, userId, targetPublishDate, skipSleep } = event.data;

    // 1. Sleep until 2 hours before publish time to start generation
    const publishTime = new Date(targetPublishDate);
    const generateTime = subHours(publishTime, 2);

    if (!skipSleep) {
      if (!isPast(generateTime)) {
        await step.sleepUntil("wait-for-generation-time", generateTime);
      }
    }

    // 2. Fetch Series to ensure it's still active
    const series = await step.run("check-series-status", async () => {
      const { data, error } = await supabaseAdmin
        .from("series")
        .select("*")
        .eq("id", seriesId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        throw new Error(`Series ${seriesId} not found`);
      }
      return data;
    });

    if (series.status !== "active" && !skipSleep) {
      // If series was paused between scheduling and now, abort.
      return { success: false, reason: "Series paused" };
    }

    // 3. Generate Video
    // We invoke the generateVideo function and wait for it to complete.
    const generationResult = await step.invoke("generate-video", {
      function: generateVideo,
      data: {
        seriesId,
        userId,
      },
    });

    // Handle failure
    if (!generationResult || !generationResult.videoUrl) {
      throw new Error("Video generation failed or returned no URL");
    }

    const { videoUrl, videoId } = generationResult;

    // 4. Sleep until actual publish time (unless it's a test/skipSleep)
    if (!skipSleep) {
      if (!isPast(publishTime)) {
        await step.sleepUntil("wait-for-publish-time", publishTime);
      }
    }

    // 5. Publish to Platforms
    // Check what platforms the series is configured for
    // Assuming series.platform is a comma-separated string or JSON array
    const rawPlatforms =
      typeof series.platform === "string"
        ? series.platform.toLowerCase()
        : JSON.stringify(series.platform).toLowerCase();

    // Publish to Email
    if (rawPlatforms.includes("email")) {
      await step.run("publish-to-email", async () => {
        // Email sending is already handled natively by step 8 inside generateVideo as "notification".
        // However, if we wanted to decouple it, we'd do the Plunk logic here instead.
        // Since it's already in generateVideo, we'll just log it.
        console.log(
          `[publish-worker] Email notification already handled by generateVideo for ${videoId}`,
        );
      });
    }

    // Publish to YouTube
    if (rawPlatforms.includes("youtube")) {
      await step.run("publish-to-youtube-placeholder", async () => {
        console.log(
          `[publish-worker] PREPARING TO UPLOAD TO YOUTUBE: ${videoUrl}`,
        );
        // TODO: Call Youtube API here
      });
    }

    // Publish to Instagram
    if (rawPlatforms.includes("instagram")) {
      await step.run("publish-to-instagram-placeholder", async () => {
        console.log(
          `[publish-worker] PREPARING TO UPLOAD TO INSTAGRAM REELS: ${videoUrl}`,
        );
        // TODO: Call Instagram API here
      });
    }

    return {
      success: true,
      publishedVideoId: videoId,
      platformsConfigured: rawPlatforms,
    };
  },
);
