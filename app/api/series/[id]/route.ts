import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: seriesId } = await params;
    if (!seriesId) {
      return new NextResponse("Series ID is required", { status: 400 });
    }

    const body = await req.json();

    const updatePayload: Record<string, any> = {};

    if ("status" in body) {
      if (body.status !== "active" && body.status !== "paused") {
        return new NextResponse("Invalid status value", { status: 400 });
      }
      updatePayload.status = body.status;
    }

    if ("niche" in body) updatePayload.niche = body.niche;
    if ("language" in body) updatePayload.language = body.language;
    if ("voice" in body) updatePayload.voice = body.voice;
    if ("backgroundMusic" in body)
      updatePayload.background_music = body.backgroundMusic;
    if ("videoStyle" in body) updatePayload.video_style = body.videoStyle;
    if ("captionStyle" in body) updatePayload.caption_style = body.captionStyle;
    if ("seriesName" in body) updatePayload.series_name = body.seriesName;
    if ("duration" in body) updatePayload.duration = body.duration;
    if ("platform" in body) updatePayload.platform = body.platform;
    if ("publishTime" in body) updatePayload.publish_time = body.publishTime;

    if (Object.keys(updatePayload).length === 0) {
      return new NextResponse("No valid fields to update", { status: 400 });
    }

    // Verify ownership
    const { data: existingSeries, error: fetchError } = await supabaseAdmin
      .from("series")
      .select("user_id")
      .eq("id", seriesId)
      .single();

    if (fetchError || !existingSeries) {
      return new NextResponse("Series not found", { status: 404 });
    }

    if (existingSeries.user_id !== userId) {
      return new NextResponse("Unauthorized to update this series", {
        status: 403,
      });
    }

    // Update the series with dynamic payload
    const { data: updatedSeries, error: updateError } = await supabaseAdmin
      .from("series")
      .update(updatePayload)
      .eq("id", seriesId)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase Update Error:", updateError);
      return new NextResponse(`Database error: ${updateError.message}`, {
        status: 500,
      });
    }

    return NextResponse.json(updatedSeries);
  } catch (error) {
    console.error("[SERIES_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
