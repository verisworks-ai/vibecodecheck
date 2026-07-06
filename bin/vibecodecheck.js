#!/usr/bin/env node
import { audit } from '../src/audit.js';
import { toConsole, toMarkdown } from '../src/reporters/markdown.js';
import { writeFileSync } from 'fs';
import { resolve, basename } from 'path';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http'));
const outputJson = args.includes('--json');
const outputMd = args.includes('--md');
const ciMode = args.includes('--ci');
const rawOut = args.find((a) => a.startsWith('--out='))?.replace('--out=', '');
const minScoreArg = args.find((a) => a.startsWith('--min-score='));
const minScore = minScoreArg ? parseInt(minScoreArg.replace('--min-score=', ''), 10) : 40;

// Restrict --out= to filename only (no path traversal outside cwd)
const mdFile = rawOut ? resolve(process.cwd(), basename(rawOut)) : null;

if (!url) {
  console.error('Usage: vibecodecheck <url> [--json] [--md] [--out=report.md] [--ci] [--min-score=N]');
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

if (!outputJson) {
  console.log(`\n  VibecodeCheck scanning ${url} ...\n`);
}

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
  if (!outputJson) console.log(`  Report saved: ${outPath}`);
}

if (ciMode) {
  const passed = result.score >= minScore;
  const out = { score: result.score, minScore, passed, url: result.url };
  console.log(JSON.stringify(out));
  process.exit(passed ? 0 : 1);
}

if (!outputJson) {
  console.log(toConsole(result));
}
process.exit(result.score < minScore ? 1 : 0);
