import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { type Plan } from "@/lib/plans";
import { extractPlanFromUserMetadata, normalizePlanValue } from "@/lib/billing-plan";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();

    // Fetch current DB record.
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("plan, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: "Failed to fetch user plan" },
        { status: 500 }
      );
    }

    // Self-heal missing user rows to avoid blocking billing UI.
    if (!user) {
      const email = clerkUser?.emailAddresses[0]?.emailAddress;
      const name = `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim();

      if (email) {
        const { error: createError } = await supabaseAdmin.from("users").insert({
          user_id: userId,
          email,
          name,
          credits: 0,
          plan: "Free",
        });

        if (createError) {
          return NextResponse.json(
            { error: "Failed to initialize user billing profile" },
            { status: 500 }
          );
        }
      }
    }

    const dbPlan = normalizePlanValue(user?.plan) || "Free";
    const metadataPlan = extractPlanFromUserMetadata(clerkUser);
    const effectivePlan = metadataPlan || dbPlan;

    // If Clerk metadata has a newer plan than DB, persist it for API consistency.
    if (metadataPlan && metadataPlan !== dbPlan) {
      await supabaseAdmin
        .from("users")
        .update({ plan: metadataPlan })
        .eq("user_id", userId);
    }

    const billingData = {
      currentPlan: effectivePlan as Plan,
      memberSince: user?.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : null,
      nextBillingDate: null,
      subscriptionId: null,
      paymentMethod: null,
      dataSource: metadataPlan ? "clerk-metadata" : "supabase",
    };

    return NextResponse.json(billingData);
  } catch (error) {
    console.error("[BILLING_INFO_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch billing information" },
      { status: 500 }
    );
  }
}
