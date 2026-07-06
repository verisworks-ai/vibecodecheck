import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test seoMeta logic (offline — no fetch)
test('noindex detection catches meta robots', async () => {
  const html = '<meta name="robots" content="noindex, nofollow"><title>Test</title>';
  const noindex = /noindex/i.test(
    (html.match(/<meta\s[^>]*name=["']robots["'][^>]*content=["']([^"']+)/i) || [])[1] || ''
  );
  assert.equal(noindex, true);
});

test('og:image detection', () => {
  const html = '<meta property="og:image" content="https://example.com/img.png">';
  assert.ok(/og:image/i.test(html));
});

test('twitter:card detection', () => {
  const html = '<meta name="twitter:card" content="summary_large_image">';
  assert.ok(/name=["']twitter:card["']/i.test(html));
});

// Test bundle secret patterns
test('OpenAI key pattern matches real key format', () => {
  const re = /\bsk-[A-Za-z0-9]{20,}\b/;
  const fakeKey = 'sk-' + 'a'.repeat(24);
  assert.ok(re.test(fakeKey));
  assert.ok(!re.test('sk-short'));
  assert.ok(!re.test('***')); // not openai
});

test('Stripe live key pattern', () => {
  const re = /\bsk_live_[A-Za-z0-9]{20,}\b/;
  const fakeKey = 'sk_live_' + 'b'.repeat(24);
  assert.ok(re.test(fakeKey));
  assert.ok(!re.test('***'));
});

test('Google AIza key pattern', () => {
  const re = /\bAIza[A-Za-z0-9_-]{35,}/;
  assert.ok(re.test('AIza' + 'c'.repeat(36)));
  assert.ok(re.test('AIza' + 'd'.repeat(40)));
  assert.ok(!re.test('AIza_short'));
});

// Test llms.txt quality checks
test('llms content quality: H1 and sections', () => {
  const text = '# My Site\n\n## Pages\n\n- [Home](https://example.com)';
  assert.ok(/^#\s+\S/m.test(text));
  assert.ok(/^##\s+/m.test(text));
});

test('llms content quality: missing H1', () => {
  const text = '## Pages\n\n- [Home](https://example.com)';
  assert.ok(!/^#\s+\S/m.test(text));
  assert.ok(/^##\s+/m.test(text));
});

// Test AI bot list completeness
test('AI bots list includes new bots', async () => {
  const { readFileSync } = await import('node:fs');
  const content = readFileSync(new URL('../src/checks/aiBots.js', import.meta.url), 'utf8');
  ['Amazonbot', 'Bytespider', 'cohere-ai', 'meta-externalagent', 'Applebot'].forEach((bot) => {
    assert.ok(content.includes(bot), `Missing bot: ${bot}`);
  });
});

// Test sensitive paths list includes new paths
test('sensitive paths includes graphql and swagger', async () => {
  const { readFileSync } = await import('node:fs');
  const content = readFileSync(new URL('../src/checks/sensitivePaths.js', import.meta.url), 'utf8');
  assert.ok(content.includes('/graphql'));
  assert.ok(content.includes('/swagger.json'));
  assert.ok(content.includes('/.env.local'));
});
