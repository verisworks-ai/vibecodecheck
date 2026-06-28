#!/usr/bin/env node
import { audit } from '../src/audit.js';
import { toConsole, toMarkdown } from '../src/reporters/markdown.js';
import { writeFileSync } from 'fs';
import { resolve, basename } from 'path';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http'));
const outputJson = args.includes('--json');
const outputMd = args.includes('--md');
const rawOut = args.find((a) => a.startsWith('--out='))?.replace('--out=', '');

// Restrict --out= to filename only (no path traversal outside cwd)
const mdFile = rawOut ? resolve(process.cwd(), basename(rawOut)) : null;

if (!url) {
  console.error('Usage: vibecodecheck <url> [--json] [--md] [--out=report.md]');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error(`Invalid URL: ${url}`);
  process.exit(1);
}

// Warn on localhost/private URLs — valid for local dev testing, not production audits
if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.startsWith('192.168.')) {
  console.warn(`  ⚠️  Warning: scanning private/local address. Results reflect local environment only.\n`);
}

console.log(`\n  VibecodeCheck scanning ${url} ...\n`);

const result = await audit(url);

if (outputJson) {
  const out = JSON.stringify(result, null, 2);
  if (mdFile) writeFileSync(mdFile.replace('.md', '.json'), out);
  else console.log(out);
}

if (outputMd || mdFile) {
  const md = toMarkdown(result);
  const outPath = mdFile || resolve(process.cwd(), `vibecodecheck-${parsed.hostname}-${Date.now()}.md`);
  writeFileSync(outPath, md);
  console.log(`  Report saved: ${outPath}`);
}

console.log(toConsole(result));
process.exit(result.score < 40 ? 1 : 0);
