import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { helloWorld } from "@/inngest/functions/helloWorld";
import { generateVideo } from "@/inngest/functions/generateVideo";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [helloWorld, generateVideo],
});
