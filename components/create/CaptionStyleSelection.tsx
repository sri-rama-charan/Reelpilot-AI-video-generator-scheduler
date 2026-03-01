"use client";

import { CAPTION_STYLES } from "@/lib/constants/captions";
import { AnimatedCaption } from "@/components/create/AnimatedCaption";
import { CheckCircle2 } from "lucide-react";

interface CaptionStyleSelectionProps {
  selectedCaption: string | null;
  onSelectCaption: (captionId: string) => void;
}

export function CaptionStyleSelection({
  selectedCaption,
  onSelectCaption,
}: CaptionStyleSelectionProps) {
  // Demo text to showcase the animation
  const demoText = "Create viral videos in seconds with AI";

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Caption Style</h2>
        <p className="text-slate-400">
          Select how you want the subtitles to appear on your video. These
          animated captions are optimized to keep your audience engaged.
        </p>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-h-[500px] p-2">
          {CAPTION_STYLES.map((style) => {
            const isSelected = selectedCaption === style.id;

            return (
              <div
                key={style.id}
                onClick={() => onSelectCaption(style.id)}
                className={`relative flex flex-col p-6 rounded-2xl border cursor-pointer transition-all duration-300 group h-[220px] ${
                  isSelected
                    ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]"
                    : "bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/30"
                }`}
              >
                {/* Header Info */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3
                      className={`text-lg font-bold text-white mb-1 ${isSelected ? "text-indigo-300" : ""}`}
                    >
                      {style.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {style.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  )}
                </div>

                {/* Live Preview Box - giving it a dark background to show off text shadows/colors */}
                <div className="flex-1 mt-auto bg-black/60 rounded-xl overflow-hidden relative flex items-center justify-center p-4 border border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>

                  {/* The actual reusable animated component */}
                  <AnimatedCaption
                    text={demoText}
                    styleConfig={style}
                    animationType={style.id} // pass the ID to trigger the specific framer variants
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
