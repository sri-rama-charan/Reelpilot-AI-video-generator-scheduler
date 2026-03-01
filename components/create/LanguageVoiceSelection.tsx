"use client";

import { useState, useRef, useEffect } from "react";
import { LANGUAGES, ALL_VOICES } from "@/lib/constants/voices";
import { Play, Square, CheckCircle2 } from "lucide-react";

interface LanguageVoiceSelectionProps {
  selectedLanguage: string | null;
  selectedVoice: string | null;
  onSelectLanguage: (lang: string) => void;
  onSelectVoice: (voice: string) => void;
}

export function LanguageVoiceSelection({
  selectedLanguage,
  selectedVoice,
  onSelectLanguage,
  onSelectVoice,
}: LanguageVoiceSelectionProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = (previewUrl: string, voiceName: string) => {
    if (playingVoice === voiceName) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`/${previewUrl}`);
    audio.play().catch((e) => console.error("Audio playback failed", e));
    audio.onended = () => setPlayingVoice(null);
    audioRef.current = audio;
    setPlayingVoice(voiceName);
  };

  const currentLangData = LANGUAGES.find(
    (l) => l.language === selectedLanguage,
  );
  const availableVoices = currentLangData
    ? ALL_VOICES.filter((v) => v.model === currentLangData.modelName)
    : [];

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">Language & Voice</h2>
        <p className="text-slate-400">
          Select the language and the AI voice model for your series.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Left Side: Language Selection */}
        <div className="flex flex-col bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            Select Language
          </h3>
          <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-h-[400px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.language}
                  onClick={() => {
                    onSelectLanguage(lang.language);
                    onSelectVoice(""); // Reset voice when language changes
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                    selectedLanguage === lang.language
                      ? "bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500"
                      : "bg-black/40 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.countryFlag}</span>
                    <span className="font-medium text-white">
                      {lang.language}
                    </span>
                  </div>
                  {selectedLanguage === lang.language && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Voice Selection */}
        <div className="flex flex-col bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            Select Voice
          </h3>

          {!selectedLanguage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <span className="text-2xl">🗣️</span>
              </div>
              <p className="text-slate-400">
                Please select a language first to see available voices.
              </p>
            </div>
          ) : availableVoices.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              No voices available for this language yet.
            </div>
          ) : (
            <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-h-[400px]">
              <div className="flex flex-col gap-3">
                {availableVoices.map((voice) => (
                  <div
                    key={voice.modelName}
                    onClick={() => onSelectVoice(voice.modelName)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                      selectedVoice === voice.modelName
                        ? "bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500"
                        : "bg-black/40 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg text-white capitalize">
                          {voice.modelName.replace(/-/g, " ")}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${voice.gender === "female" ? "bg-pink-500/20 text-pink-300" : "bg-blue-500/20 text-blue-300"}`}
                        >
                          {voice.gender}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400 uppercase tracking-wider">
                        {voice.model}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(voice.preview, voice.modelName);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          playingVoice === voice.modelName
                            ? "bg-indigo-500 text-white"
                            : "bg-white/10 text-white hover:bg-white/25"
                        }`}
                      >
                        {playingVoice === voice.modelName ? (
                          <Square className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current translate-x-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
