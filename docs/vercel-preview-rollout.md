# Vercel preview rollout

Deploy the portal as two Vercel projects from this monorepo using Preview
deployments of `TeamQueue`. Do not promote this branch to Production: the web
rewrite currently points to the API preview domain.

## Infisical preparation

Project: `36505af8-a3bd-4e08-b422-b93529f597a3`, environment: `staging`.
Create separate folders with the following variables. Both apps must use the
same Supabase project intended for Preview testing.

| Folder | Variables |
| --- | --- |
| `/web` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PORTAL_API_BASE_URL=/portal-api` |
| `/api` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN=https://preview.growth-assist.co.uk` |

Create a Universal Auth machine identity named
`vercel-leadscout-web-preview` with secret read access limited to
`staging:/web`. The web build disables secret imports and personal overrides.
Use the client ID and secret only as Vercel bootstrap variables below.

## Portal API

- New project name: `leadscout-horizons-portal-v2-api`
- Git repository: `Growth-Assist/leadscout-horizons-portal-v2`
- Root directory: `apps/api`
- Framework: Express
- Node.js: `24.x`; leave Build Command and Output Directory overrides disabled.
- Vercel detects the default Express export in `src/app.js`. Do not run
  `npm start` as the build command; the local start script uses a local `.env`.
- Stable preview domain: `portal-api-preview.growth-assist.co.uk`
- Preview environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CORS_ORIGIN=https://preview.growth-assist.co.uk`

The API must point to the Supabase environment containing
`portal_client_qualifier_config`. Do not add the service-role key to the web
project or expose it through a `VITE_` variable.

Create an Infisical Vercel Connection, then a Secret Sync from `staging:/api`
to the new API project's **Preview** environment, branch **TeamQueue**.
Use key schema `{{secretKey}}`, auto-sync enabled and secret deletion enabled.
For this new destination, use overwrite-destination initial behaviour only
after checking the destination contains no unrelated variables to preserve.
Wait for a successful sync before deploying the API.

Keep the project's Production Branch separate from `TeamQueue`. When importing
the repository, do not deploy `TeamQueue` as Production. Create its deployment
as Preview, then assign the stable preview domain to that branch under Domains.
Follow Vercel's displayed DNS instructions and wait for a valid domain status.

Check Deployment Protection: the web rewrite must reach the API without a
Vercel login page. If protection blocks it, configure an exception limited to
the API preview domain (where available), or a server-side automation bypass.
Never expose a protection bypass token through a `VITE_` variable.

Verify the API deployment before deploying the web project:

```text
GET  https://portal-api-preview.growth-assist.co.uk/health
POST https://portal-api-preview.growth-assist.co.uk/api/portal/quick-qualify/runs
```

The health request should return `200`. The unauthenticated Quick Qualify
request should return `401`.

## Portal web

- Root directory: `apps/web`
- Existing project: `leadscout-horizons-portal-v2-web`
- Framework: Vite; Node.js: `24.x`
- Install command: `npm ci`
- Preview build command: `npm run build:vercel`
- Output directory: `dist`
- Stable preview domain: `preview.growth-assist.co.uk`
- Preview environment variable: `VITE_PORTAL_API_BASE_URL=/portal-api`

`apps/web/vercel.json` forwards `/portal-api/*` to the stable API preview
domain before applying the SPA fallback rewrite.

Add these variables to **Preview / TeamQueue** in the web Vercel project:

```text
INFISICAL_CLIENT_ID=<web machine identity client ID>
INFISICAL_CLIENT_SECRET=<web machine identity client secret>
INFISICAL_PROJECT_ID=36505af8-a3bd-4e08-b422-b93529f597a3
INFISICAL_API_URL=https://app.infisical.com/api
INFISICAL_DISABLE_UPDATE_CHECK=true
```

The pinned CLI is installed with npm. `tools/build-vercel.sh` authenticates,
then `tools/build-preview-web.sh` validates public variables, removes machine
credentials, and runs the normal build. No token is written to disk. The
command rejects Vercel Production deployments. If the dashboard build setting
is shared across environments, use a Preview-specific override or retain the
existing Production command via a conditional build command:

```sh
if [ "$VERCEL_ENV" = preview ]; then npm run build:vercel; else npm run build; fi
```

Assign `preview.growth-assist.co.uk` to `TeamQueue`, not the Production branch.
Restrict builds with machine credentials to trusted branches/contributors.
The web CLI call only supplies build-time public values; API runtime values
come from Secret Sync and require redeployment after changes.

## Deployment order

1. Apply and verify any required additive Supabase migrations.
2. Deploy the API project and verify its health and authentication checks.
3. Deploy the web project.
4. Sign in as an UltraICT user and submit Quick Qualify.
5. Confirm the browser calls `/portal-api/api/portal/quick-qualify/runs` and the
   portal API calls `https://ultraict.growth-assist.co.uk/run` server-side.

Changing a Vercel environment variable requires a new deployment.

## Verification

Run web lint, tests and build, plus API lint and tests before pushing. Test the
secret bootstrap independently with `npm test --prefix apps/web -- tools/build-vercel.test.js`.

```sh
curl -i https://portal-api-preview.growth-assist.co.uk/health
curl -i -X POST -H 'Content-Type: application/json' \
  -d '{"website":"https://example.com"}' \
  https://portal-api-preview.growth-assist.co.uk/api/portal/quick-qualify/runs
curl -i https://preview.growth-assist.co.uk/portal-api/health
```

Expect health JSON `{"status":"ok"}` and an unauthenticated qualifier response
of `401` with code `PORTAL_AUTH_REQUIRED`. HTML or a Vercel authentication page
indicates a routing/protection issue, not a successful API health check.

Sign in with an UltraICT test account. Verify `/briefs` remains visible after
loading, filters and brief details work, CSV exports, and Quick Qualify completes
or queues and polls through `/portal-api/api/portal/quick-qualify/runs`.
Use dedicated test records for feedback and bulk-close checks. Confirm the
selected Supabase project already has the required migrations and client
qualifier configuration before testing writes. Check Console and Vercel logs
for runtime errors; do not print credentials or commit HAR files with tokens.

Record both successful deployment IDs and commit SHA. On failure restore only
the affected Preview alias to its previous working deployment; a new API
project has no previous deployment to restore. Secret rotation requires a new
web build and an API redeployment after sync.
