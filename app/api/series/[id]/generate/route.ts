import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const seriesId = parseInt(id, 10);

    if (!seriesId || isNaN(seriesId)) {
      return new NextResponse("Invalid series ID", { status: 400 });
    }

    // Send event to Inngest — the function will do the rest
    await inngest.send({
      name: "video/generate",
      data: { seriesId, userId },
    });

    return NextResponse.json({
      success: true,
      message: "Video generation started",
    });
  } catch (error) {
    console.error("[SERIES_GENERATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
