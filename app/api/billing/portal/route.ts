import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      portalUrl: `${appUrl}/dashboard/manage-account/billing`,
    });
  } catch (error) {
    console.error("[BILLING_PORTAL_POST]", error);
    return NextResponse.json(
      { error: "Failed to access billing portal" },
      { status: 500 }
    );
  }
}
