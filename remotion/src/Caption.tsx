import React from "react";
import type { WordTimestamp } from "./types";

interface CaptionGroup {
  text: string;
  startFrame: number;
  endFrame: number;
}

function buildGroups(
  words: WordTimestamp[],
  fps: number,
  wordsPerGroup = 3,
): CaptionGroup[] {
  const groups: CaptionGroup[] = [];
  for (let i = 0; i < words.length; i += wordsPerGroup) {
    const slice = words.slice(i, i + wordsPerGroup);
    groups.push({
      text: slice.map((w) => w.word).join(" "),
      startFrame: Math.floor(slice[0].start * fps),
      endFrame: Math.ceil(slice[slice.length - 1].end * fps),
    });
  }
  return groups;
}

// ── Caption style map ────────────────────────────────────────────────────────
// Matches CAPTION_STYLES ids from lib/constants/captions.ts
const STYLE_MAP: Record<
  string,
  { text: React.CSSProperties; wrapper?: React.CSSProperties }
> = {
  // style-1: Classic Bounce — white bold with black stroke (default TikTok look)
  "style-1": {
    text: {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontWeight: 900,
      fontSize: 68,
      color: "#ffffff",
      WebkitTextStroke: "4px #000000",
      textShadow: "0 4px 12px rgba(0,0,0,0.95)",
      textTransform: "uppercase",
      letterSpacing: "1px",
    },
  },
  // style-2: Hormozi Pop — bold yellow text (Alex Hormozi branding)
  "style-2": {
    text: {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontWeight: 900,
      fontSize: 68,
      color: "#FFD700",
      WebkitTextStroke: "4px #000000",
      textShadow: "3px 3px 0px #000000",
      textTransform: "uppercase",
    },
  },
  // style-3: Neon Glow — cyan cyberpunk glow
  "style-3": {
    text: {
      fontFamily: "Courier New, monospace",
      fontWeight: 700,
      fontSize: 60,
      color: "#22d3ee",
      textShadow:
        "0 0 8px #22d3ee, 0 0 20px #22d3ee, 0 0 40px #06b6d4, 0 0 80px #0891b2",
      letterSpacing: "2px",
    },
  },
  // style-4: Elegant Serif — amber/cream fade for storytelling
  "style-4": {
    text: {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontWeight: 500,
      fontSize: 56,
      color: "#fefce8",
      textShadow: "0 2px 20px rgba(0,0,0,0.8)",
      letterSpacing: "0.5px",
    },
  },
  // style-5: Retro Pixel — green monospace typewriter
  "style-5": {
    text: {
      fontFamily: "Courier New, monospace",
      fontWeight: 700,
      fontSize: 58,
      color: "#4ade80",
      textShadow: "2px 2px 0px rgba(0,0,0,1)",
      textTransform: "uppercase",
      letterSpacing: "3px",
    },
  },
  // style-6: Minimalist Fade — clean semi-transparent pill background
  "style-6": {
    text: {
      fontFamily: "Arial, sans-serif",
      fontWeight: 400,
      fontSize: 52,
      color: "rgba(255,255,255,0.92)",
      letterSpacing: "0.2px",
    },
    wrapper: {
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: 12,
      padding: "10px 32px",
      backdropFilter: "blur(4px)",
    },
  },
  // Fallback
  default: {
    text: {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontWeight: 900,
      fontSize: 68,
      color: "#ffffff",
      WebkitTextStroke: "4px #000000",
      textShadow: "0 4px 12px rgba(0,0,0,0.95)",
      textTransform: "uppercase",
    },
  },
};

interface CaptionProps {
  words: WordTimestamp[];
  fps: number;
  captionStyle: string;
  sceneOffsetFrames: number;
}

export const Caption: React.FC<CaptionProps> = ({
  words,
  fps,
  captionStyle,
  sceneOffsetFrames,
}) => {
  const groups = buildGroups(words, fps);
  const styleEntry = STYLE_MAP[captionStyle] ?? STYLE_MAP.default;

  const activeGroup = groups.find(
    (g) => sceneOffsetFrames >= g.startFrame && sceneOffsetFrames <= g.endFrame,
  );

  if (!activeGroup) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 60px",
        zIndex: 10,
      }}
    >
      <span
        style={{
          ...(styleEntry.wrapper ?? {}),
          ...styleEntry.text,
          display: "inline-block",
          textAlign: "center",
          maxWidth: 960,
          lineHeight: 1.15,
        }}
      >
        {activeGroup.text}
      </span>
    </div>
  );
};
