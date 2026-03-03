"use client";

import { useState } from "react";
import {
  MoreVertical,
  Play,
  Edit2,
  Trash2,
  Pause,
  PlayCircle,
  Clock,
  Video,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { VIDEO_STYLES } from "@/lib/constants/videoStyles";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Series {
  id: number;
  user_id: string;
  niche: string;
  language: string;
  voice: string;
  background_music: string[];
  video_style: string;
  caption_style: string;
  series_name: string;
  duration: string;
  platform: string;
  publish_time: string;
  created_at: string;
  status: string;
}

export function SeriesCard({ series }: { series: Series }) {
  const router = useRouter();
  const [status, setStatus] = useState(series.status || "active");
  const [isToggling, setIsToggling] = useState(false);

  const styleInfo = VIDEO_STYLES.find((s) => s.id === series.video_style);
  const imageUrl = styleInfo?.image || "/placeholder.jpg"; // Fallback image

  const toggleStatus = async () => {
    try {
      setIsToggling(true);
      const newStatus = status === "active" ? "paused" : "active";

      const res = await fetch(`/api/series/${series.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setStatus(newStatus);
      toast.success(
        `Series ${newStatus === "active" ? "resumed" : "paused"} successfully`,
      );
      router.refresh(); // Refresh the page data as well
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update series status");
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden flex flex-col hover:border-purple-500/50 transition-all duration-300">
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={series.series_name}
            fill
            className="object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500">
            <Video className="w-8 h-8 opacity-50" />
          </div>
        )}

        {/* Top Right Actions */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10"
          >
            <Edit2 className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#121212] border-white/10 text-white"
            >
              <DropdownMenuItem
                className="hover:bg-white/10 cursor-pointer"
                onClick={() =>
                  router.push(`/dashboard/series/${series.id}/edit`)
                }
              >
                <Edit2 className="w-4 h-4 mr-2 text-slate-400" />
                Edit Series
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-white/10 cursor-pointer hover:text-amber-400 text-amber-500"
                onClick={toggleStatus}
                disabled={isToggling}
              >
                {status === "active" ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Automation
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2 text-green-400" />
                    <span className="text-green-500">Resume Automation</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-red-500/20 cursor-pointer hover:text-red-400 text-red-500">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Series
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges Container */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-md backdrop-blur-md border text-xs font-medium shadow-xl w-fit flex items-center gap-1.5 ${
              status === "active"
                ? "bg-green-500/20 border-green-500/30 text-green-400"
                : "bg-amber-500/20 border-amber-500/30 text-amber-400"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-green-400 animate-pulse" : "bg-amber-400"}`}
            ></div>
            {status === "active" ? "Active" : "Paused"}
          </div>

          {/* Platform Badge */}
          <div className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white shadow-xl w-fit">
            {series.platform.charAt(0).toUpperCase() + series.platform.slice(1)}
          </div>
        </div>

        {/* Style Overlay */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md text-[10px] font-medium text-slate-300 uppercase tracking-wider">
          {styleInfo?.name || "Standard Style"}
        </div>
      </div>

      {/* Series Details */}
      <div className="p-5 flex-1 flex flex-col">
        <h3
          className="text-xl font-bold text-white mb-1 truncate"
          title={series.series_name}
        >
          {series.series_name}
        </h3>

        <div className="flex items-center text-xs text-slate-400 mb-6 gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(series.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full bg-transparent border-white/10 hover:bg-white/5 hover:text-white justify-between group/view"
          >
            <span>View Previous Videos</span>
            <Video className="w-4 h-4 text-slate-400 group-hover/view:text-white" />
          </Button>

          <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
            <Play className="w-4 h-4 mr-2 fill-current" />
            Generate New Video
          </Button>
        </div>
      </div>
    </div>
  );
}
