import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { error: socialError } = await supabaseAdmin
      .from("social_accounts")
      .delete()
      .eq("user_id", userId);

    if (socialError) {
      return NextResponse.json({ error: socialError.message }, { status: 500 });
    }

    const { error: seriesError } = await supabaseAdmin
      .from("series")
      .delete()
      .eq("user_id", userId);

    if (seriesError) {
      return NextResponse.json({ error: seriesError.message }, { status: 500 });
    }

    const { error: userError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("user_id", userId);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey) {
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!clerkRes.ok) {
        const clerkErr = await clerkRes.text();
        return NextResponse.json(
          {
            error: `Local data deleted, but failed to delete Clerk user: ${clerkErr}`,
            localDataDeleted: true,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("[SETTINGS_ACCOUNT_DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
