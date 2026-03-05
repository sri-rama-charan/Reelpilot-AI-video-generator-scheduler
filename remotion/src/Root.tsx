import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { VideoCompositionProps } from "./types";

const DEFAULT_PROPS: VideoCompositionProps = {
  scenes: [
    {
      order: 1,
      imageUrl:
        "https://images.unsplash.com/photo-1707343844552-5d9d31a8e99b?w=1024",
      audioUrl: "",
      words: [
        { word: "Hello", start: 0, end: 0.5 },
        { word: "world", start: 0.5, end: 1.0 },
        { word: "this", start: 1.0, end: 1.3 },
        { word: "is", start: 1.3, end: 1.5 },
        { word: "VidGen", start: 1.5, end: 2.5 },
      ],
    },
  ],
  captionStyle: "style-1",
  fps: 30,
  backgroundMusicUrl: "",
  totalDurationInFrames: 45 * 30,
};

/**
 * Calculate the ACTUAL composition duration — sum of capped scene durations.
 *
 * IMPORTANT: This must mirror the per-scene cap logic in VideoComposition.tsx
 * so that durationInFrames == actual rendered content length (no black screen).
 */
function calcActualTotalFrames(props: VideoCompositionProps): number {
  const fps = props.fps ?? 30;
  const minPerScene = fps * 2; // 2s minimum per scene
  const cap = props.totalDurationInFrames ?? Infinity;

  let total = 0;
  const sorted = [...props.scenes].sort((a, b) => a.order - b.order);

  for (const scene of sorted) {
    if (total >= cap) break;
    const lastEnd = scene.words?.length
      ? Math.max(...scene.words.map((w) => w.end))
      : 3;
    const paddingFrames = Math.ceil(0.4 * fps);
    const raw = Math.max(Math.ceil(lastEnd * fps) + paddingFrames, minPerScene);
    const remaining = cap - total;
    const capped = Math.min(raw, Math.max(remaining, minPerScene));
    total += capped;
  }

  return Math.max(total, fps * 3); // at least 3 seconds
}

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={VideoComposition as any}
      durationInFrames={calcActualTotalFrames(DEFAULT_PROPS)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_PROPS as unknown as Record<string, unknown>}
      calculateMetadata={async ({ props }) => {
        const typed = props as unknown as VideoCompositionProps;
        // calculateMetadata drives the actual render length — must be actual content
        return {
          durationInFrames: calcActualTotalFrames(typed),
          props: typed as unknown as Record<string, unknown>,
        };
      }}
    />
  );
};

// Required by Remotion — must be called in the entry point file
registerRoot(RemotionRoot);
