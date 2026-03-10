import express from "express";
import { serve } from "inngest/express";
import { inngest } from "../../lib/inngest";
import { workerFunctions } from "../functions/registry";

const app = express();

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
