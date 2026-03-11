import express from "express";
import { serve } from "inngest/express";
import { inngest } from "../../lib/inngest";
import { workerFunctions } from "../functions/worker";

const app = express();

// Inngest's Express adapter expects parsed JSON request bodies.
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "vidgen-inngest-worker" });
});

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: workerFunctions,
  }),
);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`Inngest worker listening on port ${port}`);
});
