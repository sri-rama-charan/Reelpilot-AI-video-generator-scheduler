import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      niche,
      language,
      voice,
      backgroundMusic,
      videoStyle,
      captionStyle,
      seriesName,
      duration,
      platform,
      publishTime,
    } = body;

    if (
      !niche ||
      !language ||
      !voice ||
      !backgroundMusic ||
      !videoStyle ||
      !captionStyle ||
      !seriesName ||
      !duration ||
      !platform ||
      !publishTime
    ) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("series")
      .insert({
        user_id: userId,
        niche,
        language,
        voice,
        background_music: backgroundMusic,
        video_style: videoStyle,
        caption_style: captionStyle,
        series_name: seriesName,
        duration,
        platform,
        publish_time: publishTime,
        status: "active",
      })
      .select();

    if (error) {
      console.error("Supabase Error:", error);
      return new NextResponse(`Database error: ${error.message}`, {
        status: 500,
      });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("[SERIES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
