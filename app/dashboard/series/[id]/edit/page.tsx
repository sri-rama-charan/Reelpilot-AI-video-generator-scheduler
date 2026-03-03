import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { SeriesForm } from "@/components/create/SeriesForm";
import { redirect } from "next/navigation";

interface EditSeriesPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: EditSeriesPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Await the params
  const { id } = await params;

  // Fetch the existing series
  const { data: series, error } = await supabaseAdmin
    .from("series")
    .select("*")
    .eq("id", id)
    .single();

  // Redirect if not found or if the series doesn't belong to the user
  if (error || !series || series.user_id !== userId) {
    console.error("Failed to load series for editing:", error);
    redirect("/dashboard");
  }

  // Map the DB record back to the SeriesConfig format
  // Adjust the casing to match what the SeriesForm expects
  const initialConfig = {
    niche: series.niche,
    language: series.language,
    voice: series.voice,
    backgroundMusic: series.background_music,
    videoStyle: series.video_style,
    captionStyle: series.caption_style,
    seriesName: series.series_name,
    duration: series.duration,
    platform: series.platform,
    publishTime: series.publish_time,
  };

  return (
    <SeriesForm
      mode="edit"
      seriesId={series.id}
      initialConfig={initialConfig}
    />
  );
}
