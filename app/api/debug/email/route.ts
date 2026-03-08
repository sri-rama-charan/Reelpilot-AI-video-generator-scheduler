import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Debug endpoint to check email notification configuration
 * GET /api/debug/email - Check if user is properly synced and Plunk is configured
 * POST /api/debug/email - Send a test email
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Check 1: Resend API key configured
    const rawResendKey = process.env.RESEND_API_KEY ?? "";
    const normalizedResendKey = rawResendKey
      .replace(/\s+/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/^['"]|['"]$/g, "");
    const hasResendKey = !!normalizedResendKey;
    const resendKeyPreview = hasResendKey
      ? `${normalizedResendKey.slice(0, 8)}...`
      : "NOT SET";

    // Check 2: User record in database
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, user_id, email, name, created_at")
      .eq("user_id", userId)
      .single();

    // Check 3: App URL configured
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "NOT SET";

    // Check 4: Also look for any user with this clerk ID in case of mismatch
    const { data: allUserMatches } = await supabaseAdmin
      .from("users")
      .select("id, user_id, email")
      .or(`user_id.eq.${userId}`);

    return NextResponse.json({
      status: "ok",
      clerkUserId: userId,
      checks: {
        resendApiKey: {
          configured: hasResendKey,
          preview: resendKeyPreview,
          format: hasResendKey
            ? normalizedResendKey.startsWith("re_")
              ? "valid"
              : "invalid"
            : "missing",
          normalized: rawResendKey !== normalizedResendKey,
          hasHiddenChars: /[\u200B-\u200D\uFEFF]/.test(rawResendKey),
          length: normalizedResendKey.length,
        },
        userRecord: {
          found: !!userData,
          error: userError?.message || null,
          data: userData || null,
        },
        allMatchingUsers: allUserMatches || [],
        appUrl: {
          configured: appUrl !== "NOT SET",
          value: appUrl,
        },
      },
      recommendations: [
        !hasResendKey && "RESEND_API_KEY is not set - emails cannot be sent",
        !userData && "⚠️ No user record found - visit /dashboard to sync your account",
        userData && !userData.email && "⚠️ User exists but has no email address",
        appUrl === "NOT SET" && "⚠️ NEXT_PUBLIC_APP_URL not set - email links may not work",
      ].filter(Boolean),
    });
  } catch (error) {
    console.error("[DEBUG_EMAIL_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Fetch user
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .eq("user_id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found in database", details: userError },
        { status: 404 }
      );
    }

    if (!userData.email) {
      return NextResponse.json(
        { error: "User has no email address" },
        { status: 400 }
      );
    }

    const rawResendKey = process.env.RESEND_API_KEY ?? "";
    const resendKey = rawResendKey
      .replace(/\s+/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/^['"]|['"]$/g, "");
    if (!resendKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!resendKey.startsWith("re_")) {
      return NextResponse.json(
        { error: "RESEND_API_KEY must start with re_..." },
        { status: 400 }
      );
    }

    // Send test email
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    const testHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 12px;">
        <h2 style="color: #111827; text-align: center;">Test Email from ReelPilot 🧪</h2>
        <p style="color: #374151; font-size: 16px;">
          Hi ${userData.name || "Creator"},<br/><br/>
          This is a test email to verify your email notification setup is working correctly.
        </p>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          If you received this, your email notifications are properly configured!
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `;

    console.log(`[debug-email] Sending test email to ${userData.email}`);

    const result = await resend.emails.send({
      from: "onboarding@resend.dev", // Resend's test sender
      to: userData.email,
      subject: "ReelPilot Test Email",
      html: testHtml,
    });

    console.log(`[debug-email] Resend response:`, JSON.stringify(result));

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${userData.email}`,
      resendResponse: result,
    });
  } catch (error) {
    console.error("[DEBUG_EMAIL_POST]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
