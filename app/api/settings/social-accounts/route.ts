import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { canConnectPlatform, type Plan } from "@/lib/plans";

type SocialPlatform = "youtube" | "instagram" | "tiktok";

const PLATFORM_COOKIE_KEY: Record<SocialPlatform, string> = {
  youtube: "oauth_state_youtube",
  instagram: "oauth_state_instagram",
  tiktok: "oauth_state_tiktok",
};

function isSocialPlatform(value: string): value is SocialPlatform {
  return ["youtube", "instagram", "tiktok"].includes(value);
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getConnectability(platform: SocialPlatform) {
  if (platform === "youtube") {
    return {
      enabled: !!process.env.YOUTUBE_CLIENT_ID && !!process.env.YOUTUBE_CLIENT_SECRET,
      missing: [
        !process.env.YOUTUBE_CLIENT_ID && "YOUTUBE_CLIENT_ID",
        !process.env.YOUTUBE_CLIENT_SECRET && "YOUTUBE_CLIENT_SECRET",
      ].filter(Boolean),
    };
  }

  if (platform === "instagram") {
    return {
      enabled: !!process.env.INSTAGRAM_CLIENT_ID && !!process.env.INSTAGRAM_CLIENT_SECRET,
      missing: [
        !process.env.INSTAGRAM_CLIENT_ID && "INSTAGRAM_CLIENT_ID",
        !process.env.INSTAGRAM_CLIENT_SECRET && "INSTAGRAM_CLIENT_SECRET",
      ].filter(Boolean),
    };
  }

  return {
    enabled: !!process.env.TIKTOK_CLIENT_KEY && !!process.env.TIKTOK_CLIENT_SECRET,
    missing: [
      !process.env.TIKTOK_CLIENT_KEY && "TIKTOK_CLIENT_KEY",
      !process.env.TIKTOK_CLIENT_SECRET && "TIKTOK_CLIENT_SECRET",
    ].filter(Boolean),
  };
}

function buildOAuthUrl(platform: SocialPlatform, state: string) {
  const appUrl = getAppUrl();
  const callback = `${appUrl}/api/settings/social-accounts/callback?platform=${platform}`;

  if (platform === "youtube") {
    const scope = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" ");

    return (
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        redirect_uri: callback,
        response_type: "code",
        scope,
        access_type: "offline",
        prompt: "consent",
        state,
      }).toString()
    );
  }

  if (platform === "instagram") {
    const scope = [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "business_management",
    ].join(",");

    return (
      "https://www.facebook.com/v20.0/dialog/oauth?" +
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        redirect_uri: callback,
        response_type: "code",
        scope,
        state,
      }).toString()
    );
  }

  const scope = ["user.info.basic", "video.publish", "video.upload"].join(",");
  return (
    "https://www.tiktok.com/v2/auth/authorize/?" +
    new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      redirect_uri: callback,
      response_type: "code",
      scope,
      state,
    }).toString()
  );
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("social_accounts")
      .select("platform, account_id, account_name, token_expires_at, created_at, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const platforms = ["youtube", "instagram", "tiktok"].map((platform) => {
      const p = platform as SocialPlatform;
      const status = getConnectability(p);
      return {
        platform: p,
        enabled: status.enabled,
        missingEnv: status.missing,
      };
    });

    return NextResponse.json({
      success: true,
      accounts: data || [],
      platforms,
    });
  } catch (error) {
    console.error("[SOCIAL_ACCOUNTS_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const platform = String(body?.platform || "").toLowerCase();

    if (!isSocialPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    // Check user's plan
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json({ error: "Failed to fetch user plan" }, { status: 500 });
    }

    // Check if user's plan allows this platform
    const userPlan = userData.plan as Plan;
    if (!canConnectPlatform(userPlan, platform)) {
      return NextResponse.json(
        {
          error: "Plan restriction",
          message: `Your ${userData.plan} plan does not support ${platform}. Please upgrade to Unlimited to access all platforms.`,
          requiresUpgrade: true,
          plan: userData.plan,
          requestedPlatform: platform,
        },
        { status: 403 }
      );
    }

    const configStatus = getConnectability(platform);
    if (!configStatus.enabled) {
      return NextResponse.json(
        {
          error: `Missing environment variables for ${platform}`,
          missing: configStatus.missing,
        },
        { status: 400 },
      );
    }

    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set(PLATFORM_COOKIE_KEY[platform], state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    const authUrl = buildOAuthUrl(platform, state);

    return NextResponse.json({
      success: true,
      platform,
      authUrl,
    });
  } catch (error) {
    console.error("[SOCIAL_ACCOUNTS_POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
