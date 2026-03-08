import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type SocialPlatform = "youtube" | "instagram" | "tiktok";

function isSocialPlatform(value: string): value is SocialPlatform {
  return ["youtube", "instagram", "tiktok"].includes(value);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { platform } = await params;
    const normalized = platform.toLowerCase();

    if (!isSocialPlatform(normalized)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("social_accounts")
      .delete()
      .eq("user_id", userId)
      .eq("platform", normalized);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, platform: normalized });
  } catch (error) {
    console.error("[SOCIAL_ACCOUNTS_DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
