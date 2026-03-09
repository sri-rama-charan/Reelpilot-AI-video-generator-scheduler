import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractPlanFromUserMetadata, normalizePlanValue } from "@/lib/billing-plan";
import { type Plan } from "@/lib/plans";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch fresh user data from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json(
        { error: "User not found in Clerk" },
        { status: 404 }
      );
    }

    // Check if user has active subscriptions in Clerk's system
    // Clerk stores subscription info in publicMetadata when using native billing
    let actualPlan: Plan = "Free";

    // Try to extract plan from Clerk metadata
    const metadataPlan = extractPlanFromUserMetadata(clerkUser);
    
    // Check if there are active subscription entitlements
    // This is a fallback if metadata isn't set
    const hasActiveSubscription = clerkUser.publicMetadata?.subscriptionActive === true;
    
    if (metadataPlan) {
      actualPlan = metadataPlan;
    } else if (hasActiveSubscription) {
      // If has active subscription but no plan specified, assume Basic
      actualPlan = "Basic";
    } else {
      // No active subscription = Free plan
      actualPlan = "Free";
    }

    // Fetch current DB plan
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError) {
      console.error("[SYNC_PLAN] DB fetch error:", userError);
      return NextResponse.json(
        { error: "Failed to fetch current plan from database" },
        { status: 500 }
      );
    }

    const dbPlan = normalizePlanValue(user?.plan) || "Free";

    // Update DB if there's a mismatch
    if (dbPlan !== actualPlan) {
      console.log(`[SYNC_PLAN] Syncing plan for user ${userId}: ${dbPlan} -> ${actualPlan}`);
      
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ plan: actualPlan })
        .eq("user_id", userId);

      if (updateError) {
        console.error("[SYNC_PLAN] DB update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update plan in database" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Plan synced successfully",
        previousPlan: dbPlan,
        currentPlan: actualPlan,
        updated: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Plan already in sync",
      currentPlan: actualPlan,
      updated: false,
    });
  } catch (error) {
    console.error("[SYNC_PLAN]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
