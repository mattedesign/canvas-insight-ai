# Inngest App (Vercel) - Minimal Scaffold

This folder contains a minimal Inngest app you can deploy to Vercel for high‑throughput, low‑latency orchestration.

What it does
- Listens for events emitted by Supabase Edge Functions:
  - ux-analysis/pipeline.started (single image)
  - group-ux-analysis/pipeline.started (group)
- Invokes your existing Supabase orchestrators with the Service Role key:
  - ux-orchestrator
  - group-ux-orchestrator

Environment variables (set in Vercel)
- SUPABASE_URL = https://sdcmbfdtafkzpimwjpij.supabase.co
- SUPABASE_SERVICE_ROLE_KEY = <copy from Supabase project settings>

Notes
- The INNGEST_EVENT_KEY is used on the emitting side (your Supabase functions already have it). The Vercel app doesn’t need it to consume events.
- Keep Supabase orchestrators JWT-protected (verify_jwt = true); using the Service Role client here is appropriate.

Deploy steps (Vercel)
1) Create a new Vercel project (Node/Next runtime is fine).
2) Add this file structure under the project:
   - api/inngest.ts   (from this folder)
3) Add the two env vars above in Vercel Project Settings → Environment Variables.
4) In Inngest dashboard, connect this Vercel project as an app; deploy.
5) Trigger analysis from your app with dispatchMode = "inngest" (default). Events will be ingested and handlers will invoke Supabase orchestrators.

Troubleshooting
- If handlers run but orchestrators fail: verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.
- If no handlers trigger: verify Inngest app is deployed and receiving events (event key is already configured on Supabase side).
