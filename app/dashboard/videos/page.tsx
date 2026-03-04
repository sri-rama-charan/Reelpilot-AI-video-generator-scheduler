"use client";

import { useEffect, useState, useCallback } from "react";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { Film, RefreshCw } from "lucide-react";

interface Video {
  id: number;
  series_id: number;
  title: string | null;
  script: string | null;
  images: { order: number; prompt: string; imageUrl: string }[] | null;
  audio_urls: { order: number; audioUrl: string }[] | null;
  captions_srt: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) setVideos(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Poll every 5 seconds while any video is still generating
  useEffect(() => {
    const hasInProgress = videos.some(
      (v) => v.status === "generating" || v.status === "pending",
    );
    if (!hasInProgress) return;

    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, [videos, fetchVideos]);

  const generatingCount = videos.filter(
    (v) => v.status === "generating" || v.status === "pending",
  ).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Videos</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {videos.length === 0
              ? "No videos yet — generate one from a Series"
              : `${videos.length} video${videos.length !== 1 ? "s" : ""} total`}
            {generatingCount > 0 && (
              <span className="ml-2 text-amber-400">
                · {generatingCount} generating
              </span>
            )}
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchVideos}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 animate-pulse"
            >
              <div className="aspect-video bg-white/10" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">
            No videos yet
          </h3>
          <p className="text-slate-500 text-sm max-w-xs">
            Go to a Series and click{" "}
            <span className="text-indigo-400">Generate New Video</span> to
            create your first video.
          </p>
        </div>
      )}

      {/* Video grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
