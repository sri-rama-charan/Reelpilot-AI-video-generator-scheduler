import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if plan column exists by trying to select it
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("user_id, email, name, plan, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError) {
      // Check if it's a column missing error
      if (userError.message.includes("column") && userError.message.includes("does not exist")) {
        return NextResponse.json({
          status: "migration_needed",
          message: "The 'plan' column doesn't exist in the users table",
          migration: "supabase/migrations/004_add_subscription_plan.sql",
          instructions: [
            "1. Go to your Supabase Dashboard",
            "2. Navigate to SQL Editor",
            "3. Copy the contents of supabase/migrations/004_add_subscription_plan.sql",
            "4. Paste and run the SQL",
            "5. Refresh this page",
          ],
          error: userError.message,
        });
      }

      return NextResponse.json(
        { error: "Failed to check database", details: userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({
        status: "user_not_found",
        message: "User record not found in database",
        userId,
      });
    }

    return NextResponse.json({
      status: "ok",
      message: "Database schema is up to date",
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        plan: user.plan || "Free",
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("[CHECK_DB]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
