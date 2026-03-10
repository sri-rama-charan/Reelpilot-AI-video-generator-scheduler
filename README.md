# VidGen

Short-form reel generation SaaS built with Next.js, Inngest, Supabase, and Remotion.

## Deployment Architecture

- `Vercel`: frontend + app API routes
- `Cloud Run`: dedicated Inngest worker for heavy render jobs

This repo now splits Inngest registration:

- `app/api/inngest/route.ts`: lightweight web functions only
- `inngest/worker/server.ts`: background/render worker functions for Cloud Run

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

Add both app and worker sync URLs in Inngest Cloud:

- Vercel app sync URL: `https://<your-vercel-domain>/api/inngest`
- Worker sync URL: `https://<your-cloud-run-domain>/api/inngest`

This allows web-safe functions to remain on Vercel while render jobs execute on Cloud Run.
