#!/usr/bin/env node
// Reads the repo-root .env file and writes backend/env.local.json,
// the format `sam local start-api --env-vars` expects. The "Parameters"
// key applies to every Lambda function in template.yaml.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const rootEnvPath = path.resolve(backendDir, '..', '.env');
const outputPath = path.resolve(backendDir, 'env.local.json');

const envVars = {};

if (existsSync(rootEnvPath)) {
  const contents = readFileSync(rootEnvPath, 'utf-8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    envVars[key] = value;
  }
} else {
  console.warn(`No .env file found at ${rootEnvPath} - using empty environment.`);
}

writeFileSync(outputPath, JSON.stringify({ Parameters: envVars }, null, 2) + '\n');
console.log(`Wrote ${Object.keys(envVars).length} env var(s) to ${outputPath}`);
