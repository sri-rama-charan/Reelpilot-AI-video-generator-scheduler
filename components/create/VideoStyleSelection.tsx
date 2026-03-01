"use client";

import Image from "next/image";
import { VIDEO_STYLES } from "@/lib/constants/videoStyles";
import { CheckCircle2 } from "lucide-react";

interface VideoStyleSelectionProps {
  selectedStyle: string | null;
  onSelectStyle: (styleId: string) => void;
}

export function VideoStyleSelection({
  selectedStyle,
  onSelectStyle,
}: VideoStyleSelectionProps) {
  return (
    <div className="flex flex-col h-full flex-1">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Video Style</h2>
        <p className="text-slate-400">
          Select the visual aesthetic for your generated videos. This style will
          dictate the look and feel of all the generated images in your series.
        </p>
      </div>

      <div className="flex-1 w-full flex items-center justify-center min-h-[400px]">
        {/* Horizontal Scroll Container */}
        <div className="w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="flex gap-6 px-4 w-max mx-auto">
            {VIDEO_STYLES.map((style) => {
              const isSelected = selectedStyle === style.id;

              return (
                <div
                  key={style.id}
                  onClick={() => onSelectStyle(style.id)}
                  className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 group ${
                    isSelected ? "scale-105" : "hover:scale-105"
                  }`}
                >
                  {/* Image Card (9:16 Aspect Ratio) */}
                  <div
                    className={`relative w-[200px] sm:w-[240px] aspect-[9/16] rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${
                      isSelected
                        ? "ring-4 ring-indigo-500 shadow-indigo-500/20"
                        : "ring-1 ring-white/10 group-hover:ring-white/30"
                    }`}
                  >
                    <Image
                      src={style.image}
                      alt={style.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 200px, 240px"
                      priority
                    />

                    {/* Dark gradient overlay at bottom for text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-6">
                      <span
                        className={`font-semibold text-lg tracking-wide ${isSelected ? "text-white" : "text-white/80 group-hover:text-white"}`}
                      >
                        {style.name}
                      </span>
                    </div>

                    {/* Checkmark overlay */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 bg-indigo-500 rounded-full p-1 shadow-lg">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
