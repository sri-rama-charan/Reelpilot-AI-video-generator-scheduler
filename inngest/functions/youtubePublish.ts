import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase";

type YoutubeAccount = {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
};

async function refreshYouTubeAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID || "",
      client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`YouTube refresh token failed: ${await res.text()}`);
  }

  const token = await res.json();
  return {
    accessToken: token.access_token as string,
    expiresIn: Number(token.expires_in || 0),
    refreshToken: (token.refresh_token as string | undefined) || refreshToken,
  };
}

async function ensureValidYouTubeToken(userId: string): Promise<string> {
  const { data: account, error } = await supabaseAdmin
    .from("social_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .single<YoutubeAccount>();

  if (error || !account) {
    throw new Error("YouTube account not connected");
  }

  const expiresAtMs = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : null;
  const isExpiredOrNearExpiry =
    expiresAtMs !== null && expiresAtMs <= Date.now() + 60 * 1000;

  if (!isExpiredOrNearExpiry) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new Error("YouTube token expired and no refresh token is available");
  }

  const refreshed = await refreshYouTubeAccessToken(account.refresh_token);
  const expiresAt = refreshed.expiresIn
    ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
    : null;

  const { error: updateError } = await supabaseAdmin
    .from("social_accounts")
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      token_expires_at: expiresAt,
    })
    .eq("user_id", userId)
    .eq("platform", "youtube");

  if (updateError) {
    throw new Error(`Failed to persist refreshed YouTube token: ${updateError.message}`);
  }

  return refreshed.accessToken;
}

async function uploadToYouTube(args: {
  accessToken: string;
  videoBytes: Uint8Array;
  title: string;
  description: string;
  visibility: "private" | "public" | "unlisted";
}) {
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(args.videoBytes.length),
      },
      body: JSON.stringify({
        snippet: {
          title: args.title,
          description: args.description,
          categoryId: "22",
        },
        status: {
          privacyStatus: args.visibility,
        },
      }),
    },
  );

  if (!initRes.ok) {
    throw new Error(`Failed to initialize YouTube upload: ${await initRes.text()}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Missing resumable upload URL from YouTube response");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "video/mp4",
      "Content-Length": String(args.videoBytes.length),
    },
    body: args.videoBytes as unknown as BodyInit,
  });

  if (!uploadRes.ok) {
    throw new Error(`YouTube upload failed: ${await uploadRes.text()}`);
  }

  const payload = await uploadRes.json();
  const youtubeVideoId = payload?.id as string | undefined;
  if (!youtubeVideoId) {
    throw new Error("YouTube upload succeeded but no video ID was returned");
  }

  return youtubeVideoId;
}

export const youtubePublish = inngest.createFunction(
  {
    id: "youtube-publish-video",
    name: "YouTube Publish Video",
    concurrency: { limit: 5 },
  },
  { event: "video/youtube.publish.scheduled" },
  async ({ event, step }) => {
    const { videoId, userId, publishAt } = event.data as {
      videoId: number;
      userId: string;
      publishAt: string;
    };

    const scheduledDate = new Date(publishAt);
    if (!Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()) {
      await step.sleepUntil("wait-until-publish-time", scheduledDate);
    }

    const video = await step.run("fetch-video", async () => {
      const { data, error } = await supabaseAdmin
        .from("videos")
        .select(
          "id, user_id, title, script, video_url, status, youtube_publish_status, youtube_publish_visibility",
        )
        .eq("id", videoId)
        .single();

      if (error || !data) {
        throw new Error(`Video not found: ${videoId}`);
      }
      if (data.user_id !== userId) {
        throw new Error("Unauthorized publish attempt");
      }
      if (data.status !== "completed" || !data.video_url) {
        throw new Error("Video is not ready for publishing");
      }
      if (data.youtube_publish_status === "published") {
        return { ...data, alreadyPublished: true };
      }

      return { ...data, alreadyPublished: false };
    });

    if ((video as { alreadyPublished?: boolean }).alreadyPublished) {
      return { success: true, skipped: true, reason: "Already published" };
    }

    try {
      await step.run("mark-publishing", async () => {
        const { error } = await supabaseAdmin
          .from("videos")
          .update({
            youtube_publish_status: "publishing",
            youtube_publish_error: null,
          })
          .eq("id", videoId)
          .eq("user_id", userId);

        if (error) throw new Error(`Failed to mark publishing: ${error.message}`);
      });

      const accessToken = await step.run("ensure-youtube-token", async () => {
        return ensureValidYouTubeToken(userId);
      });

      const visibility =
        (video.youtube_publish_visibility as "private" | "public" | "unlisted" | null) ||
        "private";

      const youtubeVideoId = await step.run("upload-to-youtube", async () => {
        const response = await fetch(video.video_url as string);
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const videoBytes = new Uint8Array(arrayBuffer);
        if (videoBytes.length === 0) {
          throw new Error("Downloaded video buffer is empty");
        }

        return uploadToYouTube({
          accessToken,
          videoBytes,
          title: (video.title || `VidGen Video #${video.id}`).slice(0, 100),
          description: (video.script || "Created with VidGen").slice(0, 4900),
          visibility,
        });
      });

      const youtubeWatchUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

      await step.run("mark-published", async () => {
        const { error } = await supabaseAdmin
          .from("videos")
          .update({
            youtube_publish_status: "published",
            youtube_video_id: youtubeVideoId,
            youtube_published_at: new Date().toISOString(),
            youtube_publish_error: null,
          })
          .eq("id", videoId)
          .eq("user_id", userId);

        if (error) throw new Error(`Failed to mark published: ${error.message}`);
      });

      return {
        success: true,
        videoId,
        youtubeVideoId,
        youtubeWatchUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publish error";

      await step.run("mark-publish-failed", async () => {
        const { error: updateError } = await supabaseAdmin
          .from("videos")
          .update({
            youtube_publish_status: "failed",
            youtube_publish_error: message.slice(0, 500),
          })
          .eq("id", videoId)
          .eq("user_id", userId);

        if (updateError) {
          console.error("[YOUTUBE_PUBLISH] failed to persist error:", updateError.message);
        }
      });

      return {
        success: false,
        videoId,
        reason: message,
      };
    }
  },
);
