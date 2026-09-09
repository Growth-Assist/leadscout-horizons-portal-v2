#!/bin/sh
# Preview only: credentials are used for authentication, never written to disk.
set +x
set -eu

if [ -n "${VERCEL_ENV:-}" ] && [ "$VERCEL_ENV" != preview ]; then
  echo '[build:vercel] This build command only supports Vercel Preview.' >&2
  exit 1
fi

: "${INFISICAL_CLIENT_ID:?INFISICAL_CLIENT_ID is required}"
: "${INFISICAL_CLIENT_SECRET:?INFISICAL_CLIENT_SECRET is required}"
: "${INFISICAL_PROJECT_ID:?INFISICAL_PROJECT_ID is required}"
: "${INFISICAL_API_URL:?INFISICAL_API_URL is required}"
export INFISICAL_DISABLE_UPDATE_CHECK=true

# Use a separate assignment so a failed login cannot be masked by export.
INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --silent --plain)
: "${INFISICAL_TOKEN:?Infisical login returned an empty token}"
export INFISICAL_TOKEN
unset INFISICAL_CLIENT_ID INFISICAL_CLIENT_SECRET

echo '[build:vercel] Infisical authentication succeeded; loading staging /web.'
exec infisical run \
  --projectId="$INFISICAL_PROJECT_ID" \
  --env=staging \
  --path=/web \
  --include-imports=false \
  --secret-overriding=false \
  -- sh tools/build-preview-web.sh
