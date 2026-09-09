// @vitest-environment node
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, expect, it } from 'vitest';

let dir;
let env;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'portal-build-test-'));
  env = {
    PATH: `${dir}:/usr/bin:/bin`,
    VERCEL_ENV: 'preview',
    INFISICAL_CLIENT_ID: 'test-id',
    INFISICAL_CLIENT_SECRET: 'test-secret',
    INFISICAL_PROJECT_ID: 'test-project',
    INFISICAL_API_URL: 'https://app.infisical.com/api'
  };
  writeFileSync(join(dir, 'infisical'), `#!/bin/sh
if [ "$1" = login ]; then
  [ -z "\${FAIL_LOGIN:-}" ] || exit 7
  printf '%s' 'test-token'
  exit 0
fi
[ "$2" = '--projectId=test-project' ] || exit 8
[ "$3" = '--env=staging' ] || exit 8
[ "$4" = '--path=/web' ] || exit 8
[ "$5" = '--include-imports=false' ] || exit 8
[ "$6" = '--secret-overriding=false' ] || exit 8
[ "$INFISICAL_TOKEN" = test-token ] || exit 9
[ -z "\${INFISICAL_CLIENT_SECRET:-}" ] || exit 9
export VITE_SUPABASE_URL=https://example.supabase.co
export VITE_SUPABASE_ANON_KEY=public-test-key
export VITE_PORTAL_API_BASE_URL=/portal-api
shift 7
exec "$@"
`, { mode: 0o700 });
  writeFileSync(join(dir, 'npm'), `#!/bin/sh
[ -z "\${INFISICAL_TOKEN:-}" ] || exit 10
[ -z "\${INFISICAL_CLIENT_SECRET:-}" ] || exit 10
[ "$1 $2" = 'run build' ] || exit 11
echo 'mock Vite build completed'
`, { mode: 0o700 });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const run = () => spawnSync('sh', ['tools/build-vercel.sh'], { env, encoding: 'utf8' });

it('injects staging web values and strips credentials before building', () => {
  const result = run();
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('mock Vite build completed');
  expect(result.stdout + result.stderr).not.toMatch(/test-secret|test-token/);
});

it('fails before authentication when bootstrap credentials are missing', () => {
  delete env.INFISICAL_CLIENT_SECRET;
  const result = run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('INFISICAL_CLIENT_SECRET is required');
});

it('propagates authentication failure without starting the build', () => {
  env.FAIL_LOGIN = '1';
  const result = run();
  expect(result.status).toBe(7);
  expect(result.stdout).not.toContain('completed');
});

it('rejects Production deployment', () => {
  env.VERCEL_ENV = 'production';
  expect(run().status).not.toBe(0);
});

it('rejects private Supabase credentials in the web environment', () => {
  env.SUPABASE_SERVICE_ROLE_KEY = 'private-test-key';
  const result = run();
  expect(result.status).not.toBe(0);
  expect(result.stdout + result.stderr).not.toContain('private-test-key');
  expect(result.stderr).toContain('Remove the service-role key');
});
