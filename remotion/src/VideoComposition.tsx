import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import type { VideoCompositionProps } from "./types";
import { Scene } from "./Scene";

/**
 * Calculates how long a scene SHOULD be to hit our target total duration.
 * We enforce this minimum so fast TTS doesn't collapse a 50s video into 15s.
 */
function getSceneDurationInFrames(
  words: { end: number }[],
  fps: number,
  minFallbackFrames: number,
): number {
  if (!words || words.length === 0) return minFallbackFrames;

  // Audio length based on the last word timestamp
  const lastEnd = Math.max(...words.map((w) => w.end));
  // Provide ~0.4s padding so audio transition sounds natural
  const paddingFrames = Math.ceil(0.4 * fps);
  const audioFrames = Math.ceil(lastEnd * fps) + paddingFrames;

  // The scene runs naturally to match the voiceover length! No more huge silent gaps.
  return audioFrames;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  scenes,
  captionStyle,
  backgroundMusicUrl,
  totalDurationInFrames, // e.g. 50s * 30fps = 1500
}) => {
  const { fps } = useVideoConfig();
  const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

  const cap = totalDurationInFrames ?? Infinity;
  // Fallback minimum scene length if we have no words
  const minPerScene = fps * 3;

  // Pre-compute offsets + capped durations before JSX (Remotion lint: no mutation)
  type SceneWithOffset = {
    scene: (typeof sortedScenes)[0];
    from: number;
    durationInFrames: number;
  };

  const scenesWithOffsets = sortedScenes.reduce<SceneWithOffset[]>(
    (acc, scene) => {
      const prev = acc[acc.length - 1];
      const from = prev ? prev.from + prev.durationInFrames : 0;

      // Stop adding scenes if we've already hit the cap
      if (from >= cap) return acc;

      const raw = getSceneDurationInFrames(scene.words, fps, minPerScene);
      const remaining = cap - from;

      // Cap this scene so we don't go over totalDurationInFrames (safeguard)
      const durationInFrames = Math.min(raw, Math.max(remaining, fps * 2));

      return [...acc, { scene, from, durationInFrames }];
    },
    [],
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* ── Scene sequence ──────────────────────────────────────────── */}
      {scenesWithOffsets.map(({ scene, from, durationInFrames }, i) => (
        <Sequence
          key={scene.order}
          from={from}
          durationInFrames={durationInFrames}
        >
          <AbsoluteFill>
            <Scene scene={scene} sceneIndex={i} captionStyle={captionStyle} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* ── Background music: looping at 20% volume ─────────────────── */}
      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.2} loop />
      ) : null}
    </AbsoluteFill>
  );
};
