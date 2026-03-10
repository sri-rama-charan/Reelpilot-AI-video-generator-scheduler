import { helloWorld } from "@/inngest/functions/helloWorld";
import { generateVideo } from "@/inngest/functions/generateVideo";
import { publishWorker } from "@/inngest/functions/publishWorker";
import { scheduleDaily } from "@/inngest/functions/scheduleDaily";
import { youtubePublish } from "@/inngest/functions/youtubePublish";

// Lightweight functions can stay on Vercel.
export const webFunctions = [helloWorld];

// Heavy/background functions run on the dedicated worker service.
export const workerFunctions = [
  generateVideo,
  publishWorker,
  scheduleDaily,
  youtubePublish,
];
