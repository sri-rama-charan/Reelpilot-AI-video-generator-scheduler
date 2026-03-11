import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const videoId = Number(id);
    if (!videoId || Number.isNaN(videoId)) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    const { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("id, user_id, series_id, status")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (video.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed videos can be retried" },
        { status: 400 },
      );
    }

    // Reset progress fields and mark as generating before requeueing.
    const { error: resetError } = await supabaseAdmin
      .from("videos")
      .update({
        status: "generating",
        error_message: null,
        youtube_publish_status: null,
        youtube_publish_at: null,
        youtube_publish_visibility: null,
        youtube_publish_error: null,
      })
      .eq("id", videoId)
      .eq("user_id", userId);

    if (resetError) {
      return NextResponse.json(
        { error: `Failed to reset video: ${resetError.message}` },
        { status: 500 },
      );
    }

    try {
      await inngest.send({
        name: "video/generate",
        data: {
          seriesId: video.series_id,
          userId,
          videoId,
        },
      });
    } catch (sendError) {
      const sendMessage =
        sendError instanceof Error ? sendError.message : "Failed to queue video";

      await supabaseAdmin
        .from("videos")
        .update({ status: "failed", error_message: `Queue error: ${sendMessage}` })
        .eq("id", videoId)
        .eq("user_id", userId);

      return NextResponse.json(
        { error: `Failed to queue retry: ${sendMessage}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Video generation retried",
      videoId,
    });
  } catch (error) {
    console.error("[VIDEO_RETRY_POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
