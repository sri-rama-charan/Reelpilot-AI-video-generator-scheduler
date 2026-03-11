import { helloWorld } from "@/inngest/functions/helloWorld";
import { generateVideo } from "@/inngest/functions/generateVideo";
import { publishWorker } from "@/inngest/functions/publishWorker";
import { scheduleDaily } from "@/inngest/functions/scheduleDaily";
import { youtubePublish } from "@/inngest/functions/youtubePublish";

export const workerFunctions = [
  helloWorld,
  generateVideo,
  publishWorker,
  scheduleDaily,
  youtubePublish,
];
