// Turns client/.env into src/environments/environment.ts.
//
// The Angular builder has no .env support — it only offers `define` and
// `fileReplacements`, both of which want their values hard-coded in
// angular.json. Generating the environment file keeps .env as the single
// source of truth while the app still imports a plain, typed module.
//
// Run via the `start` / `build` / `watch` / `test` package scripts. They chain
// this with `&&` rather than using pre* hooks, because pnpm's
// enable-pre-post-scripts defaults to false and the hooks would never fire.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(projectRoot, '.env');
const outputPath = resolve(projectRoot, 'src/environments/environment.ts');

// API_BASE_URL is deliberately optional. Left blank, the app issues relative
// /api/v1 requests that `ng serve` proxies to the Go server (proxy.conf.json),
// so the browser only ever sees one origin on port 4200.
const REQUIRED_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

function fail(message) {
  console.error(`\n[generate-env] ${message}\n`);
  process.exit(1);
}

function parseEnv(contents) {
  const values = {};

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    // Strip a single matching pair of surrounding quotes.
    if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'"))) {
      if (value.at(-1) === value[0]) {
        value = value.slice(1, -1);
      }
    }

    values[key] = value;
  }

  return values;
}

let contents;
try {
  contents = readFileSync(envPath, 'utf8');
} catch {
  fail(`No .env found at ${envPath}. Copy .env.example to .env and fill it in.`);
}

const env = parseEnv(contents);

const missing = REQUIRED_KEYS.filter((key) => !env[key]);
if (missing.length > 0) {
  fail(`.env is missing: ${missing.join(', ')}. See .env.example for the expected keys.`);
}

// Trailing slashes would produce double-slashed request URLs downstream.
const supabaseUrl = env['SUPABASE_URL'].replace(/\/+$/, '');
const apiBaseUrl = (env['API_BASE_URL'] ?? '').replace(/\/+$/, '');

const file = `// GENERATED FILE — do not edit.
// Written by scripts/generate-env.mjs from client/.env. Change .env instead.
export const environment = {
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabaseAnonKey: ${JSON.stringify(env['SUPABASE_ANON_KEY'])},
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
} as const;
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, file, 'utf8');

console.log(
  `[generate-env] wrote src/environments/environment.ts (supabase: ${supabaseUrl}, api: ${
    apiBaseUrl || 'same origin via the ng serve proxy'
  })`,
);
