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
    const { plan } = body;

    if (!plan || !["Free", "Basic", "Unlimited"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be: Free, Basic, or Unlimited" },
        { status: 400 }
      );
    }

    // Update user's plan in database
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ plan })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[UPDATE_PLAN]", error);
      
      // Check if it's a column missing error
      if (error.message.includes("column") && error.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Database migration required",
            message: "The 'plan' column doesn't exist in the users table. Please run migration: supabase/migrations/004_add_subscription_plan.sql",
            migrationNeeded: true,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update plan", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plan updated to ${plan}`,
      user: data,
    });
  } catch (error) {
    console.error("[UPDATE_PLAN]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
