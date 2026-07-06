#!/usr/bin/env node
import { audit } from '../src/audit.js';
import { generateRobots, generateLlms, generateSecurityTxt } from '../src/fixer.js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http'));
const rawOut = args.find((a) => a.startsWith('--out='))?.replace('--out=', '') || 'public';
const dryRun = args.includes('--dry-run');

if (!url) {
  console.error('Usage: vibecodecheck-fix <url> [--out=public] [--dry-run]');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error(`Invalid URL: ${url}`);
  process.exit(1);
}

console.error(`\n  VibecodeCheck Fix — scanning ${url} ...\n`);
const result = await audit(url);

const failedIds = new Set(
  Object.values(result.categories)
    .flatMap((c) => c.items || [])
    .filter((i) => i.status === 'FAIL')
    .map((i) => i.id)
);

const origin = parsed.origin;
const outDir = resolve(process.cwd(), rawOut);
if (!dryRun) mkdirSync(outDir, { recursive: true });

const fixes = [];

if (failedIds.has('robots-exists')) {
  const content = generateRobots(origin);
  if (!dryRun) writeFileSync(resolve(outDir, 'robots.txt'), content);
  fixes.push('robots.txt');
}

if (failedIds.has('llms-exists')) {
  const content = generateLlms(origin);
  if (!dryRun) writeFileSync(resolve(outDir, 'llms.txt'), content);
  fixes.push('llms.txt');
}

if (failedIds.has('security-txt-exists')) {
  const wkDir = resolve(outDir, '.well-known');
  if (!dryRun) mkdirSync(wkDir, { recursive: true });
  const content = generateSecurityTxt(origin);
  if (!dryRun) writeFileSync(resolve(wkDir, 'security.txt'), content);
  fixes.push('.well-known/security.txt');
}

if (fixes.length === 0) {
  console.log(`  ✅ Nothing to fix (score: ${result.score}/100)\n`);
} else {
  const prefix = dryRun ? '[dry-run] would write' : 'written';
  fixes.forEach((f) => console.log(`  📝 ${prefix}: ${rawOut}/${f}`));
  console.log(`\n  ${fixes.length} file(s) ${dryRun ? 'ready' : 'written'}. Deploy to your static server root.\n`);
}
