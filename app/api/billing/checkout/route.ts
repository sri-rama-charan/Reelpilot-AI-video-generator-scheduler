import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan, billingPeriod } = body;

    if (!plan || !["Free", "Basic", "Unlimited"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    if (plan !== "Free" && (!billingPeriod || !["monthly", "annual"].includes(billingPeriod))) {
      return NextResponse.json(
        { error: "Invalid billing period" },
        { status: 400 }
      );
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Failed to fetch user plan" },
        { status: 500 }
      );
    }

    // Idempotent no-op for repeated selection clicks.
    if (user.plan === plan) {
      return NextResponse.json({
        success: true,
        message: `Already on ${plan} plan`,
        newPlan: plan,
      });
    }

    if (plan === "Free") {
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ plan: "Free" })
        .eq("user_id", userId);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to downgrade plan" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Plan downgraded to Free",
        newPlan: "Free",
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      success: true,
      message: "Redirecting to billing portal",
      checkoutUrl: `${appUrl}/dashboard/manage-account/billing/plans`,
    });
  } catch (error) {
    console.error("[BILLING_CHECKOUT_POST]", error);
    return NextResponse.json(
      { error: "Failed to initiate checkout" },
      { status: 500 }
    );
  }
}
