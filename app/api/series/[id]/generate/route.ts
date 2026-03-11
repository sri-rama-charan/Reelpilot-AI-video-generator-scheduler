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
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const seriesId = parseInt(id, 10);
    if (!seriesId || isNaN(seriesId))
      return new NextResponse("Invalid series ID", { status: 400 });

    // Insert a "generating" row immediately so the UI shows it right away
    const { data: video, error: insertError } = await supabaseAdmin
      .from("videos")
      .insert({
        series_id: seriesId,
        user_id: userId,
        status: "generating",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[SERIES_GENERATE] Supabase insert error:", insertError);
      return new NextResponse("Failed to create video record", { status: 500 });
    }

    // Trigger Inngest with the pre-created video ID so it can UPDATE instead of INSERT
    try {
      await inngest.send({
        name: "video/generate",
        data: { seriesId, userId, videoId: video.id },
      });
    } catch (sendError) {
      const sendMessage =
        sendError instanceof Error ? sendError.message : "Failed to queue video";

      // Don't leave rows stuck in "generating" if queueing fails.
      await supabaseAdmin
        .from("videos")
        .update({ status: "failed", error_message: `Queue error: ${sendMessage}` })
        .eq("id", video.id)
        .eq("user_id", userId);

      console.error("[SERIES_GENERATE] Inngest send error:", sendError);
      return NextResponse.json(
        { error: `Failed to queue video generation: ${sendMessage}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, videoId: video.id });
  } catch (error) {
    console.error("[SERIES_GENERATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
