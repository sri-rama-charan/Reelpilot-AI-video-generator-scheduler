# VidGen

Short-form reel generation SaaS built with Next.js, Inngest, Supabase, and Remotion.

## Deployment Architecture

- `Vercel`: frontend + app API routes
- `Cloud Run`: dedicated Inngest worker for heavy render jobs

This repo now uses Cloud Run as the production Inngest execution endpoint:

- `app/api/inngest/route.ts`: local development compatibility endpoint
- `inngest/worker/server.ts`: production/background/render worker functions

## Local Development

Run the app:

```bash
npm run dev
```

Run the worker locally:

```bash
npm run worker:dev
```

## Cloud Run Worker Deploy

Build and deploy only the worker image using `Dockerfile.worker`:

```bash
gcloud builds submit --tag gcr.io/<GCP_PROJECT_ID>/vidgen-worker -f Dockerfile.worker
gcloud run deploy vidgen-worker \
	--image gcr.io/<GCP_PROJECT_ID>/vidgen-worker \
	--platform managed \
	--region <REGION> \
	--allow-unauthenticated \
	--memory 4Gi \
	--cpu 2 \
	--timeout 3600 \
	--concurrency 1
```

Set the same required env vars on Cloud Run that your generation function needs (`SUPABASE_*`, `CLERK_*`, `GROQ_API_KEY`, `DEEPGRAM_API_KEY`, etc.).

## Inngest Setup

Use only the worker sync URL in Inngest Cloud for production:

- Worker sync URL: `https://<your-cloud-run-domain>/api/inngest`

Do not keep the Vercel `/api/inngest` URL registered in production, otherwise jobs may execute in a serverless environment that lacks video-render dependencies.
