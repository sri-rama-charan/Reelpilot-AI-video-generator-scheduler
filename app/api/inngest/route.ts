import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { webFunctions } from "@/inngest/functions/web";

const isVercelProduction =
  process.env.VERCEL === "1" && process.env.NODE_ENV === "production";

// In production, Cloud Run is the single Inngest executor.
// Keep Vercel endpoint alive for compatibility, but register no functions.
const functions = isVercelProduction ? [] : webFunctions;

const handlers = serve({
  client: inngest,
  functions,
});

const disabledResponse = () =>
  new Response(
    JSON.stringify({
      error:
        "Inngest execution is disabled on Vercel production. Use Cloud Run /api/inngest endpoint.",
    }),
    {
      status: 410,
      headers: { "content-type": "application/json" },
    },
  );

export const GET = isVercelProduction ? disabledResponse : handlers.GET;
export const POST = isVercelProduction ? disabledResponse : handlers.POST;
export const PUT = isVercelProduction ? disabledResponse : handlers.PUT;
