import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { canCreateSeries, getPlanConfig, type Plan } from "@/lib/plans";
import { extractPlanFromUserMetadata, normalizePlanValue } from "@/lib/billing-plan";

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

    // Get user's plan
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError || !userData) {
      console.error("Error fetching user plan:", userError);
      return new NextResponse("Failed to fetch user plan", { status: 500 });
    }

    const dbPlan = normalizePlanValue(userData.plan) || "Free";
    const clerkUser = await currentUser();
    const metadataPlan = extractPlanFromUserMetadata(clerkUser);
    const userPlan = (metadataPlan || dbPlan) as Plan;

    // Keep DB in sync if Clerk metadata already reflects a changed plan.
    if (metadataPlan && metadataPlan !== dbPlan) {
      await supabaseAdmin
        .from("users")
        .update({ plan: metadataPlan })
        .eq("user_id", userId);
    }

    // Count existing series for this user
    const { count, error: countError } = await supabaseAdmin
      .from("series")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("Error counting series:", countError);
      return new NextResponse("Failed to check series limit", { status: 500 });
    }

    // Check if user can create more series
    const currentSeriesCount = count || 0;
    if (!canCreateSeries(userPlan, currentSeriesCount)) {
      const config = getPlanConfig(userPlan);
      return new NextResponse(
        JSON.stringify({
          error: `Series limit reached`,
          message: `Your ${userPlan} plan allows up to ${config.maxSeries} series. Please upgrade your plan to create more.`,
          requiresUpgrade: true,
          plan: userPlan,
          maxSeries: config.maxSeries,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
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
