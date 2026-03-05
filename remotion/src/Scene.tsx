import {
  Audio,
  Img,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import type { SceneData } from "./types";
import { Caption } from "./Caption";

// 4 animation types — cycle by scene index
type AnimationType = "fadeZoom" | "slideLeft" | "slideRight" | "slideUp";

function getAnimation(index: number): AnimationType {
  const types: AnimationType[] = [
    "fadeZoom",
    "slideLeft",
    "slideRight",
    "slideUp",
  ];
  return types[index % types.length];
}

interface SceneProps {
  scene: SceneData;
  sceneIndex: number;
  captionStyle: string;
}

export const Scene: React.FC<SceneProps> = ({
  scene,
  sceneIndex,
  captionStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animType = getAnimation(sceneIndex);
  const ENTER_DURATION = 18; // frames for enter transition

  // ── Spring progress for entrance ───────────────────────────────────────────
  const progress = spring({
    frame,
    fps,
    config: { damping: 80, stiffness: 200, mass: 0.8 },
    durationInFrames: ENTER_DURATION,
  });

  // ── Per-animation transforms ────────────────────────────────────────────────
  let opacity = 1;
  let transform = "";

  if (animType === "fadeZoom") {
    opacity = interpolate(frame, [0, ENTER_DURATION], [0, 1], {
      extrapolateRight: "clamp",
    });
    const scale = interpolate(frame, [0, ENTER_DURATION], [1.06, 1.0], {
      extrapolateRight: "clamp",
    });
    // Also add a slow continuous zoom throughout the scene
    const slowZoom = interpolate(frame, [0, 999], [1.0, 1.08], {
      extrapolateRight: "clamp",
    });
    transform = `scale(${scale * slowZoom})`;
  } else if (animType === "slideLeft") {
    opacity = interpolate(frame, [0, 10], [0, 1], {
      extrapolateRight: "clamp",
    });
    const x = interpolate(progress, [0, 1], [-80, 0]);
    transform = `translateX(${x}px)`;
  } else if (animType === "slideRight") {
    opacity = interpolate(frame, [0, 10], [0, 1], {
      extrapolateRight: "clamp",
    });
    const x = interpolate(progress, [0, 1], [80, 0]);
    transform = `translateX(${x}px)`;
  } else if (animType === "slideUp") {
    opacity = interpolate(frame, [0, 10], [0, 1], {
      extrapolateRight: "clamp",
    });
    const y = interpolate(progress, [0, 1], [60, 0]);
    transform = `translateY(${y}px)`;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* Scene image with animation */}
      <Img
        src={scene.imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity,
          transform,
          willChange: "transform, opacity",
        }}
      />

      {/* Dark vignette overlay to make captions readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Caption overlay */}
      {scene.words.length > 0 && (
        <Caption
          words={scene.words}
          fps={fps}
          captionStyle={captionStyle}
          sceneOffsetFrames={frame}
        />
      )}

      {/* Scene audio */}
      <Audio src={scene.audioUrl} />
    </div>
  );
};
