# Vercel preview rollout

The portal is deployed as two Vercel projects from this monorepo.

## Portal API

- Root directory: `apps/api`
- Framework: Express
- Stable preview domain: `portal-api-preview.growth-assist.co.uk`
- Preview environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CORS_ORIGIN=https://preview.growth-assist.co.uk`

The API must point to the Supabase environment containing
`portal_client_qualifier_config`. Do not add the service-role key to the web
project or expose it through a `VITE_` variable.

Verify the API deployment before deploying the web project:

```text
GET  https://portal-api-preview.growth-assist.co.uk/health
POST https://portal-api-preview.growth-assist.co.uk/api/portal/quick-qualify/runs
```

The health request should return `200`. The unauthenticated Quick Qualify
request should return `401`.

## Portal web

- Root directory: `apps/web`
- Build command: `npm run build`
- Output directory: `dist`
- Stable preview domain: `preview.growth-assist.co.uk`
- Preview environment variable: `VITE_PORTAL_API_BASE_URL=/portal-api`

`apps/web/vercel.json` forwards `/portal-api/*` to the stable API preview
domain before applying the SPA fallback rewrite.

## Deployment order

1. Apply and verify any required additive Supabase migrations.
2. Deploy the API project and verify its health and authentication checks.
3. Deploy the web project.
4. Sign in as an UltraICT user and submit Quick Qualify.
5. Confirm the browser calls `/portal-api/api/portal/quick-qualify/runs` and the
   portal API calls `https://ultraict.growth-assist.co.uk/run` server-side.

Changing a Vercel environment variable requires a new deployment.
