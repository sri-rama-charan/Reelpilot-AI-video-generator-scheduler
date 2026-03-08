import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

function settingsRedirect(status: "connected" | "error", message: string, platform?: string) {
  const url = new URL(`${getAppUrl()}/dashboard/settings`);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  if (platform) url.searchParams.set("platform", platform);
  return NextResponse.redirect(url.toString());
}

async function exchangeYoutubeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`YouTube token exchange failed: ${await res.text()}`);
  }

  const token = await res.json();

  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );

  if (!channelRes.ok) {
    throw new Error(`YouTube profile fetch failed: ${await channelRes.text()}`);
  }

  const channelData = await channelRes.json();
  const channel = channelData?.items?.[0];

  return {
    accessToken: token.access_token as string,
    refreshToken: (token.refresh_token as string | undefined) || null,
    expiresIn: Number(token.expires_in || 0),
    scope: token.scope as string | undefined,
    accountId: (channel?.id as string | undefined) || null,
    accountName: (channel?.snippet?.title as string | undefined) || "YouTube Account",
    metadata: {
      thumbnail: channel?.snippet?.thumbnails?.default?.url || null,
      raw: channel || null,
    },
  };
}

async function exchangeInstagramCode(code: string, redirectUri: string) {
  const tokenRes = await fetch(
    "https://graph.facebook.com/v20.0/oauth/access_token?" +
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    { method: "GET" },
  );

  if (!tokenRes.ok) {
    throw new Error(`Instagram token exchange failed: ${await tokenRes.text()}`);
  }

  const token = await tokenRes.json();

  const profileRes = await fetch(
    "https://graph.facebook.com/v20.0/me?" +
      new URLSearchParams({
        fields: "id,name",
        access_token: token.access_token,
      }).toString(),
    { method: "GET" },
  );

  if (!profileRes.ok) {
    throw new Error(`Instagram profile fetch failed: ${await profileRes.text()}`);
  }

  const profile = await profileRes.json();

  return {
    accessToken: token.access_token as string,
    refreshToken: (token.refresh_token as string | undefined) || null,
    expiresIn: Number(token.expires_in || 0),
    scope: token.scope as string | undefined,
    accountId: (profile?.id as string | undefined) || null,
    accountName: (profile?.name as string | undefined) || "Instagram Account",
    metadata: {
      raw: profile || null,
    },
  };
}

async function exchangeTikTokCode(code: string, redirectUri: string) {
  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`TikTok token exchange failed: ${await tokenRes.text()}`);
  }

  const tokenData = await tokenRes.json();
  const token = tokenData?.data || tokenData;

  const userRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    },
  );

  if (!userRes.ok) {
    throw new Error(`TikTok profile fetch failed: ${await userRes.text()}`);
  }

  const userData = await userRes.json();
  const user = userData?.data?.user || userData?.data || null;

  return {
    accessToken: token.access_token as string,
    refreshToken: (token.refresh_token as string | undefined) || null,
    expiresIn: Number(token.expires_in || 0),
    scope: token.scope as string | undefined,
    accountId: (token?.open_id as string | undefined) || (user?.open_id as string | undefined) || null,
    accountName: (user?.display_name as string | undefined) || "TikTok Account",
    metadata: {
      avatarUrl: user?.avatar_url || null,
      raw: user || null,
    },
  };
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return settingsRedirect("error", "Sign in required to connect account");
    }

    const url = new URL(req.url);
    const platformParam = (url.searchParams.get("platform") || "").toLowerCase();
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error") || url.searchParams.get("error_description");

    if (!isSocialPlatform(platformParam)) {
      return settingsRedirect("error", "Unsupported social platform");
    }

    if (oauthError) {
      return settingsRedirect("error", oauthError, platformParam);
    }

    if (!code || !state) {
      return settingsRedirect("error", "Missing OAuth code/state", platformParam);
    }

    const cookieStore = await cookies();
    const expectedState = cookieStore.get(PLATFORM_COOKIE_KEY[platformParam])?.value;
    cookieStore.delete(PLATFORM_COOKIE_KEY[platformParam]);

    if (!expectedState || expectedState !== state) {
      return settingsRedirect("error", "Invalid OAuth state. Please retry connect.", platformParam);
    }

    const callbackUrl = `${getAppUrl()}/api/settings/social-accounts/callback?platform=${platformParam}`;

    const tokenPayload =
      platformParam === "youtube"
        ? await exchangeYoutubeCode(code, callbackUrl)
        : platformParam === "instagram"
          ? await exchangeInstagramCode(code, callbackUrl)
          : await exchangeTikTokCode(code, callbackUrl);

    const expiresAt = tokenPayload.expiresIn
      ? new Date(Date.now() + tokenPayload.expiresIn * 1000).toISOString()
      : null;

    const { error } = await supabaseAdmin.from("social_accounts").upsert(
      {
        user_id: userId,
        platform: platformParam,
        account_id: tokenPayload.accountId,
        account_name: tokenPayload.accountName,
        access_token: tokenPayload.accessToken,
        refresh_token: tokenPayload.refreshToken,
        token_expires_at: expiresAt,
        scope: tokenPayload.scope || null,
        metadata: tokenPayload.metadata,
      },
      { onConflict: "user_id,platform" },
    );

    if (error) {
      return settingsRedirect("error", `Failed to save account: ${error.message}`, platformParam);
    }

    return settingsRedirect("connected", "Account connected successfully", platformParam);
  } catch (error) {
    console.error("[SOCIAL_CALLBACK_GET]", error);
    return settingsRedirect(
      "error",
      error instanceof Error ? error.message.slice(0, 180) : "OAuth failed",
    );
  }
}
