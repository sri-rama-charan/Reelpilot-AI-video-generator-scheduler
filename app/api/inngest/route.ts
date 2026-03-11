import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { webFunctions } from "@/inngest/functions/web";

const isVercelProduction =
  process.env.VERCEL === "1" && process.env.NODE_ENV === "production";

// In production, Cloud Run is the single Inngest executor.
// Keep Vercel endpoint alive for compatibility, but register no functions.
const functions = isVercelProduction ? [] : webFunctions;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
