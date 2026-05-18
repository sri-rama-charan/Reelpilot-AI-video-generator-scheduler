import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase";
import { addDays, parse, setHours, setMinutes, isPast } from "date-fns";

export const scheduleDaily = inngest.createFunction(
  {
    id: "schedule-daily-videos",
    name: "Schedule Daily Videos",
    triggers: [{ cron: "0 0 * * *" }],
  },
  async ({ step }) => {
    // 1. Fetch all active series
    const activeSeries = await step.run("fetch-active-series", async () => {
      const { data, error } = await supabaseAdmin
        .from("series")
        .select("*")
        .eq("status", "active");

      if (error) {
        throw new Error(`Failed to fetch active series: ${error.message}`);
      }
      return data || [];
    });

    if (activeSeries.length === 0) {
      return { message: "No active series found" };
    }

    // 2. Schedule a publish job for each active series
    const eventsToDispatch = activeSeries.map((series) => {
      // Parse publish time (e.g. "14:30")
      let targetPublishDate = new Date();
      if (series.publish_time) {
        const parsedTime = parse(series.publish_time, "HH:mm", new Date());
        targetPublishDate = setHours(
          setMinutes(targetPublishDate, parsedTime.getMinutes()),
          parsedTime.getHours(),
        );
      } else {
        // Default to a specific time if not set, e.g. 12:00 PM
        targetPublishDate = setHours(setMinutes(targetPublishDate, 0), 12);
      }

      // If the parsed time for today has already passed (due to timezone differences, etc.),
      // schedule for tomorrow.
      if (isPast(targetPublishDate)) {
        targetPublishDate = addDays(targetPublishDate, 1);
      }

      return {
        name: "video/publish.scheduled",
        data: {
          seriesId: series.id,
          userId: series.user_id,
          targetPublishDate: targetPublishDate.toISOString(),
          skipSleep: false, // Normal cron job obeys time
        },
      };
    });

    if (eventsToDispatch.length > 0) {
      await step.sendEvent("dispatch-daily-series", eventsToDispatch);
    }

    return {
      success: true,
      scheduledCount: eventsToDispatch.length,
    };
  },
);
