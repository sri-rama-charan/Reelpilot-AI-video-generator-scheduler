import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/user/sync - Force sync current Clerk user to Supabase
 * Useful when webhook may have failed or user record is out of sync
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found in Clerk" }, { status: 404 });
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "No email address found for user" }, { status: 400 });
    }

    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    // Check if user exists by user_id OR email
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, user_id, email, name")
      .or(`user_id.eq.${userId},email.eq.${email}`)
      .maybeSingle();

    let result;

    if (existingUser) {
      // Update existing user
      result = await supabaseAdmin
        .from("users")
        .update({
          user_id: userId,
          email: email,
          name: name || existingUser.name,
        })
        .eq("id", existingUser.id)
        .select()
        .single();
    } else {
      // Create new user with Free plan by default
      result = await supabaseAdmin
        .from("users")
        .insert({
          user_id: userId,
          email: email,
          name: name,
          credits: 0,
          plan: "Free",
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("[USER_SYNC] Error:", result.error);
      return NextResponse.json(
        { error: "Failed to sync user", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: existingUser ? "updated" : "created",
      user: result.data,
    });
  } catch (error) {
    console.error("[USER_SYNC]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/sync - Get current user sync status
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;

    // Check database state
    const { data: dbUser, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Also check if there's a user with this email but different user_id
    let emailMismatchUser = null;
    if (email && (!dbUser || dbUser.email !== email)) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id, user_id, email")
        .eq("email", email)
        .maybeSingle();
      
      if (data && data.user_id !== userId) {
        emailMismatchUser = data;
      }
    }

    return NextResponse.json({
      clerk: {
        userId,
        email,
        name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : null,
      },
      database: {
        found: !!dbUser,
        error: error?.message || null,
        user: dbUser,
      },
      issues: [
        !dbUser && "⚠️ No user record in database - call POST to sync",
        dbUser && dbUser.email !== email && "⚠️ Email mismatch between Clerk and database",
        emailMismatchUser && `⚠️ Another user (${emailMismatchUser.user_id}) has this email`,
      ].filter(Boolean),
      emailMismatchUser,
    });
  } catch (error) {
    console.error("[USER_SYNC_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
