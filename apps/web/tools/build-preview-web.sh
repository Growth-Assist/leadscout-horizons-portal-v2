#!/bin/sh
set +x
set -eu

: "${VITE_SUPABASE_URL:?VITE_SUPABASE_URL is required}"
: "${VITE_SUPABASE_ANON_KEY:?VITE_SUPABASE_ANON_KEY is required}"
if [ "${VITE_PORTAL_API_BASE_URL:-}" != /portal-api ]; then
  echo '[build:vercel] VITE_PORTAL_API_BASE_URL must be /portal-api.' >&2
  exit 1
fi

# Keep machine credentials out of Vite and its plugins.
unset INFISICAL_TOKEN INFISICAL_CLIENT_ID INFISICAL_CLIENT_SECRET
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] || [ -n "${VITE_SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo '[build:vercel] Remove the service-role key from the web environment.' >&2
  exit 1
fi
exec npm run build
