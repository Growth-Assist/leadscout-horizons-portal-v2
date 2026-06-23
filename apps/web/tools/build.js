#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    console.error(`[build] Failed to run ${command}:`, result.error.message);
  }

  return result.status ?? 1;
};

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(buildDir, '..');
process.chdir(appRoot);

const requireFromApp = createRequire(path.join(appRoot, 'package.json'));
const generateLlmsScript = path.join(buildDir, 'generate-llms.js');
const viteEntry = requireFromApp.resolve('vite');
const { build: viteBuild } = await import(pathToFileURL(viteEntry).href);

console.log('[build] Generating llms.txt');
run(process.execPath, [generateLlmsScript]);

console.log('[build] Running vite build');
try {
  await viteBuild();
} catch (error) {
  console.error('[build] Vite build failed:', error);
  process.exit(1);
}
