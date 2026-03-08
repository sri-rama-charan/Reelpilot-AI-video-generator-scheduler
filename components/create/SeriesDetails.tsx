"use client";

import { Youtube, Instagram, Mail, Clock } from "lucide-react";

interface SeriesDetailsProps {
  seriesName: string;
  duration: string;
  platform: string;
  publishTime: string;
  onUpdate: (field: string, value: string) => void;
}

const DURATIONS = [
  { id: "30-50", label: "30 - 50 Seconds" },
  { id: "60-70", label: "60 - 70 Seconds" },
];

const PLATFORMS = [
  {
    id: "youtube",
    label: "YouTube Shorts",
    icon: Youtube,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    hover: "hover:border-red-500/50",
    active: "border-red-500 ring-1 ring-red-500 bg-red-500/10",
  },
  {
    id: "instagram",
    label: "Instagram Reels",
    icon: Instagram,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    hover: "hover:border-pink-500/50",
    active: "border-pink-500 ring-1 ring-pink-500 bg-pink-500/10",
  },
  {
    id: "email",
    label: "Email Campaign",
    icon: Mail,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    hover: "hover:border-blue-500/50",
    active: "border-blue-500 ring-1 ring-blue-500 bg-blue-500/10",
  },
];

export function SeriesDetails({
  seriesName,
  duration,
  platform,
  publishTime,
  onUpdate,
}: SeriesDetailsProps) {
  return (
    <div className="flex flex-col h-full flex-1">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Series Details</h2>
        <p className="text-slate-400">
          Finalize your series configuration and schedule your video generation.
        </p>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full space-y-8 pb-4">
        {/* Series Name */}
        <div className="space-y-4">
          <label className="text-lg font-semibold text-white">
            Series Name
          </label>
          <input
            type="text"
            value={seriesName}
            onChange={(e) => onUpdate("seriesName", e.target.value)}
            placeholder="e.g. Daily Motivation, Scary Stories Vol 1..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-lg"
          />
        </div>

        {/* Duration Selection */}
        <div className="space-y-4">
          <label className="text-lg font-semibold text-white">
            Video Duration
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DURATIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onUpdate("duration", opt.id)}
                className={`py-4 px-6 rounded-xl border text-center font-medium transition-all ${
                  duration === opt.id
                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500"
                    : "bg-black/40 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="space-y-4">
          <label className="text-lg font-semibold text-white">
            Target Platform
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLATFORMS.map((plat) => {
              const isActive = platform === plat.id;
              const Icon = plat.icon;

              return (
                <button
                  key={plat.id}
                  onClick={() => onUpdate("platform", plat.id)}
                  className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
                    isActive
                      ? plat.active
                      : `bg-black/40 ${plat.border} ${plat.hover} hover:bg-white/5`
                  }`}
                >
                  <div
                    className={`p-4 rounded-full mb-3 ${isActive ? plat.bg : "bg-white/5"}`}
                  >
                    <Icon
                      className={`w-8 h-8 ${isActive ? plat.color : "text-slate-400"}`}
                    />
                  </div>
                  <span
                    className={`font-semibold ${isActive ? "text-white" : "text-slate-300"}`}
                  >
                    {plat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Publish Time */}
        <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <label className="text-lg font-semibold text-white">
              Schedule Publish Time
            </label>
          </div>

          <input
            type="time"
            value={publishTime}
            onChange={(e) => onUpdate("publishTime", e.target.value)}
            className="w-full sm:w-auto bg-black border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-xl"
          />

          <p className="text-sm text-slate-400 mt-3 pt-3 border-t border-white/10 italic">
            Note: Videos will be generated 3-6 hours before your scheduled
            publish time to ensure they are ready.
          </p>
        </div>
      </div>
    </div>
  );
}
