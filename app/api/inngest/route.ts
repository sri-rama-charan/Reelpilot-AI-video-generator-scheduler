import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { webFunctions } from "@/inngest/functions/web";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: webFunctions,
});
