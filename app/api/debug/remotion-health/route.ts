import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const path = await import("path");
    const fs = await import("fs");

    const checks: Record<string, unknown> = {};

    // 1) Can runtime import Remotion modules?
    try {
      await import("remotion");
      checks.remotionModule = "ok";
    } catch (error) {
      checks.remotionModule =
        error instanceof Error ? `failed: ${error.message}` : "failed";
    }

    try {
      await import("@remotion/bundler");
      checks.bundlerModule = "ok";
    } catch (error) {
      checks.bundlerModule =
        error instanceof Error ? `failed: ${error.message}` : "failed";
    }

    try {
      await import("@remotion/renderer");
      checks.rendererModule = "ok";
    } catch (error) {
      checks.rendererModule =
        error instanceof Error ? `failed: ${error.message}` : "failed";
    }

    // 2) Is entrypoint present in deployed artifact?
    const entryPoint = path.default.resolve(process.cwd(), "remotion/src/Root.tsx");
    checks.entryPoint = {
      path: entryPoint,
      exists: fs.default.existsSync(entryPoint),
    };

    // 3) Deep check: bundle + composition resolution (same operation as generation, but tiny)
    let deepCheck: Record<string, unknown> = { ok: false };

    try {
      const { bundle } = await import("@remotion/bundler");
      const { selectComposition } = await import("@remotion/renderer");

      const bundleLocation = await bundle({
        entryPoint,
        webpackOverride: (config) => config,
      });

      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "VideoComposition",
        inputProps: {
          scenes: [
            {
              order: 1,
              imageUrl:
                "https://images.unsplash.com/photo-1707343844552-5d9d31a8e99b?w=1024",
              audioUrl: "",
              words: [{ word: "test", start: 0, end: 0.5 }],
            },
          ],
          captionStyle: "style-1",
          fps: 30,
          backgroundMusicUrl: "",
          totalDurationInFrames: 90,
        },
      });

      deepCheck = {
        ok: true,
        bundleLocation,
        compositionId: composition.id,
        width: composition.width,
        height: composition.height,
      };
    } catch (error) {
      deepCheck = {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown deep check error",
      };
    }

    checks.deepCheck = deepCheck;

    const failed = Object.values(checks).some((value) => {
      if (typeof value === "string") return value.startsWith("failed:");
      if (typeof value === "object" && value && "ok" in value) {
        return (value as { ok: boolean }).ok === false;
      }
      if (typeof value === "object" && value && "exists" in value) {
        return (value as { exists: boolean }).exists === false;
      }
      return false;
    });

    return NextResponse.json(
      {
        status: failed ? "failed" : "ok",
        message: failed
          ? "Remotion runtime is not fully healthy in this deployment"
          : "Remotion runtime looks healthy",
        checks,
      },
      { status: failed ? 500 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
