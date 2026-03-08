import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase";

type Visibility = "private" | "public" | "unlisted";

function isVisibility(value: string): value is Visibility {
  return ["private", "public", "unlisted"].includes(value);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const videoId = Number(id);
    if (!videoId || Number.isNaN(videoId)) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const publishAtRaw = String(body?.publishAt || "");
    const visibilityRaw = String(body?.visibility || "private").toLowerCase();

    if (!publishAtRaw) {
      return NextResponse.json({ error: "publishAt is required" }, { status: 400 });
    }

    const publishAt = new Date(publishAtRaw);
    if (Number.isNaN(publishAt.getTime())) {
      return NextResponse.json({ error: "Invalid publishAt date" }, { status: 400 });
    }

    if (publishAt.getTime() < Date.now() + 60 * 1000) {
      return NextResponse.json(
        { error: "Publish date must be at least 1 minute in the future" },
        { status: 400 },
      );
    }

    if (!isVisibility(visibilityRaw)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }

    const { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("id, user_id, status, title, video_url")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (video.status !== "completed" || !video.video_url) {
      return NextResponse.json(
        { error: "Only completed videos can be scheduled for YouTube publishing" },
        { status: 400 },
      );
    }

    const { data: youtubeAccount } = await supabaseAdmin
      .from("social_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .maybeSingle();

    if (!youtubeAccount) {
      return NextResponse.json(
        {
          error:
            "YouTube account is not connected. Connect YouTube in Settings first.",
        },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("videos")
      .update({
        youtube_publish_status: "scheduled",
        youtube_publish_at: publishAt.toISOString(),
        youtube_publish_visibility: visibilityRaw,
        youtube_publish_error: null,
      })
      .eq("id", videoId)
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to schedule publish: ${updateError.message}` },
        { status: 500 },
      );
    }

    await inngest.send({
      name: "video/youtube.publish.scheduled",
      data: {
        videoId,
        userId,
        publishAt: publishAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      videoId,
      publishAt: publishAt.toISOString(),
      visibility: visibilityRaw,
    });
  } catch (error) {
    console.error("[YOUTUBE_SCHEDULE_POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
