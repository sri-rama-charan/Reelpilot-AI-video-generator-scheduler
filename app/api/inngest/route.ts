import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { helloWorld } from "@/inngest/functions/helloWorld";
import { generateVideo } from "@/inngest/functions/generateVideo";
import { publishWorker } from "@/inngest/functions/publishWorker";
import { scheduleDaily } from "@/inngest/functions/scheduleDaily";
import { youtubePublish } from "@/inngest/functions/youtubePublish";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    generateVideo,
    publishWorker,
    scheduleDaily,
    youtubePublish,
  ],
});
