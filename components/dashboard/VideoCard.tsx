"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Film,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Music,
  PlayCircle,
  Download,
} from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Video {
  id: number;
  series_id: number;
  title: string | null;
  script: string | null;
  images: { order: number; prompt: string; imageUrl: string }[] | null;
  audio_urls: { order: number; audioUrl: string }[] | null;
  captions_srt: string | null;
  video_url: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-slate-400 bg-slate-400/10",
  },
  generating: {
    icon: Loader2,
    label: "Generating…",
    className: "text-amber-400 bg-amber-400/10",
    spin: true,
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-emerald-400 bg-emerald-400/10",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-red-400 bg-red-400/10",
  },
};

export function VideoCard({ video }: { video: Video }) {
  const thumbnail = video.images?.[0]?.imageUrl ?? null;
  const statusCfg = STATUS_CONFIG[video.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const sceneCount = video.images?.length ?? 0;
  const hasAudio = (video.audio_urls?.length ?? 0) > 0;
  const isPlayable = video.status === "completed" && !!video.video_url;

  const cardContent = (
    <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:bg-white/8 transition-all duration-300 w-full text-left h-full flex flex-col cursor-pointer">
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-white/5 overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={video.title ?? "Video thumbnail"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-600">
            {video.status === "generating" ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-xs text-indigo-400">Generating…</span>
              </>
            ) : (
              <>
                <Film className="w-8 h-8" />
                <span className="text-xs">No preview</span>
              </>
            )}
          </div>
        )}

        {/* Play overlay on hover if playable */}
        {isPlayable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <PlayCircle className="w-12 h-12 text-white drop-shadow-md" />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.className}`}
          >
            <StatusIcon
              className={`w-3.5 h-3.5 ${"spin" in statusCfg && statusCfg.spin ? "animate-spin" : ""}`}
            />
            {statusCfg.label}
          </span>
        </div>

        {/* Generating overlay shimmer */}
        {video.status === "generating" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
            {video.title ??
              (video.status === "generating"
                ? "Generating title…"
                : "Untitled Video")}
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            {formatDistanceToNow(new Date(video.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Script preview */}
        {video.script && (
          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
            {video.script}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5">
          {sceneCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-xs">
              <Film className="w-3 h-3" />
              {sceneCount} scenes
            </span>
          )}
          {hasAudio && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-xs">
              <Music className="w-3 h-3" />
              Audio ready
            </span>
          )}
        </div>

        {/* Error message */}
        {video.status === "failed" && video.error_message && (
          <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2 leading-relaxed">
            {video.error_message}
          </p>
        )}
      </div>
    </div>
  );

  if (isPlayable) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="focus:outline-none">{cardContent}</button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-white/10">
          <DialogTitle className="sr-only">
            {video.title ?? "Video Player"}
          </DialogTitle>
          {video.video_url && (
            <div className="relative">
              <video
                controls
                autoPlay
                src={video.video_url}
                className="w-full h-auto max-h-[85vh] object-contain bg-black"
              />
              <div className="absolute top-4 right-4 z-50">
                <a
                  href={video.video_url}
                  download={`video-${video.id}.mp4`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors text-sm font-medium border border-white/20"
                  title="Download Video"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return cardContent;
}
