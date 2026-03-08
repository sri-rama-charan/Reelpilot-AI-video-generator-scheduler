import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { auth } from "@clerk/nextjs/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const seriesIdObj = await params;
    const seriesId = parseInt(seriesIdObj.id);

    // Dispatch the publish scheduled event directly, but with skipSleep: true
    // This will immediately fire off the video generation, wait for it, and then simulate publishing
    await inngest.send({
      name: "video/publish.scheduled",
      data: {
        seriesId,
        userId,
        targetPublishDate: new Date().toISOString(),
        skipSleep: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Workflow payload dispatched successfully",
    });
  } catch (error) {
    console.error("[TEST_WORKFLOW_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
