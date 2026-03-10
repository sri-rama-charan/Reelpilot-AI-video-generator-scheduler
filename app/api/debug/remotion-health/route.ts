import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      status: "moved",
      message:
        "Remotion health checks now belong on the Cloud Run worker, not the Vercel app.",
    },
    { status: 410 },
  );
}
