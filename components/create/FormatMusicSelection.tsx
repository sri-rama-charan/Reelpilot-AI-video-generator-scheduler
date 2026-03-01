"use client";

import { useState, useRef, useEffect } from "react";
import { BACKGROUND_MUSIC } from "@/lib/constants/music";
import { Play, Square, Check, Music } from "lucide-react";

interface FormatMusicSelectionProps {
  selectedMusic: string[];
  onSelectMusic: (musicIds: string[]) => void;
}

export function FormatMusicSelection({
  selectedMusic,
  onSelectMusic,
}: FormatMusicSelectionProps) {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = (url: string, trackId: string) => {
    if (playingTrack === trackId) {
      audioRef.current?.pause();
      setPlayingTrack(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audio.play().catch((e) => console.error("Audio playback failed", e));
    audio.onended = () => setPlayingTrack(null);
    audioRef.current = audio;
    setPlayingTrack(trackId);
  };

  const toggleSelection = (trackId: string) => {
    if (selectedMusic.includes(trackId)) {
      onSelectMusic(selectedMusic.filter((id) => id !== trackId));
    } else {
      onSelectMusic([...selectedMusic, trackId]);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Format & Background Music</h2>
        <p className="text-slate-400">
          Select the background music tracks you want to use in your series. You
          can select multiple tracks and they will be randomly assigned to
          generated videos.
        </p>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full">
        {/* We can add Format selection (e.g. 9:16 vs 16:9) in the future here if needed */}

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-400" />
              Available Tracks
            </h3>
            <span className="text-sm text-slate-400">
              {selectedMusic.length} track(s) selected
            </span>
          </div>

          <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1">
            <div className="flex flex-col gap-3">
              {BACKGROUND_MUSIC.map((track) => {
                const isSelected = selectedMusic.includes(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => toggleSelection(track.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between group ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500"
                        : "bg-black/40 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-indigo-500 border-indigo-500"
                            : "border-slate-500 group-hover:border-slate-400"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>

                      {/* Track Info */}
                      <div className="flex flex-col">
                        <span className="font-medium text-white text-lg">
                          {track.name}
                        </span>
                        <span className="text-sm text-slate-400">
                          {track.duration}
                        </span>
                      </div>
                    </div>

                    {/* Play Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay(track.url, track.id);
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                        playingTrack === track.id
                          ? "bg-indigo-500 text-white"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {playingTrack === track.id ? (
                        <Square className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
