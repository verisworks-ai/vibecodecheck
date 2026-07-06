import { fetchWithTimeout } from '../utils/fetch.js';

const SENSITIVE_PATHS = [
  { path: '/.env', id: 'env-file', label: '.env file' },
  { path: '/.env.local', id: 'env-local', label: '.env.local file' },
  { path: '/.git/config', id: 'git-config', label: '.git/config' },
  { path: '/.git/HEAD', id: 'git-head', label: '.git/HEAD' },
  { path: '/wp-admin', id: 'wp-admin', label: 'WordPress admin' },
  { path: '/admin', id: 'admin', label: '/admin path' },
  { path: '/api', id: 'api-root', label: '/api root' },
  { path: '/swagger.json', id: 'swagger-json', label: 'Swagger API spec' },
  { path: '/openapi.json', id: 'openapi-json', label: 'OpenAPI spec' },
  { path: '/graphql', id: 'graphql-introspection', label: 'GraphQL endpoint' },
];

// Patterns that indicate a real secret was exposed (not just a placeholder)
const SECRET_PATTERNS = [
  { re: /\bsk-[A-Za-z0-9]{20,}\b/, label: 'OpenAI API key (sk-)' },
  { re: /\bAIza[A-Za-z0-9_-]{35,}/, label: 'Google API key (AIza)' },
  { re: /\bsk_live_[A-Za-z0-9]{20,}\b/, label: 'Stripe live key (sk_live_)' },
  { re: /\bsk_test_[A-Za-z0-9]{20,}\b/, label: 'Stripe test key (sk_test_)' },
  { re: /eyJ[A-Za-z0-9_-]{40,}\.eyJ[A-Za-z0-9_-]{40,}/, label: 'JWT token in HTML' },
  { re: /service_role['":\s]+eyJ[A-Za-z0-9_-]{30,}/, label: 'Supabase service_role key' },
];

export async function checkSensitivePaths(origin) {
  const items = [];
  let score = 0;
  const maxScore = 15;
  const perPath = 1;

  await Promise.all(
    SENSITIVE_PATHS.map(async ({ path, id, label }) => {
      try {
        const res = await fetchWithTimeout(`${origin}${path}`, {
          headers: { 'User-Agent': 'vibecodecheck/1.0' },
          redirect: 'manual',
        });
        const blocked = res.status === 403 || res.status === 404 || res.status === 410;
        if (blocked) {
          score += perPath;
          items.push({ id, status: 'PASS', label: `${label} → ${res.status} (blocked)` });
        } else if (res.status === 301 || res.status === 302) {
          score += Math.floor(perPath / 2);
          items.push({ id, status: 'WARN', label: `${label} → ${res.status} (redirect — verify destination)` });
        } else {
          items.push({ id, status: 'FAIL', label: `${label} → ${res.status} (potentially exposed)` });
        }
      } catch (_) {
        score += perPath;
        items.push({ id, status: 'PASS', label: `${label} → connection refused (blocked)` });
      }
    })
  );

  // Bundle secret scan — inline JS / HTML on the homepage
  try {
    const res = await fetchWithTimeout(origin, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
    const html = await res.text();
    const found = SECRET_PATTERNS.filter(({ re }) => re.test(html));
    if (found.length === 0) {
      score += 5;
      items.push({ id: 'bundle-secrets', status: 'PASS', label: 'No API keys or tokens detected in HTML/inline JS' });
    } else {
      found.forEach(({ label: secretLabel }) => {
        items.push({ id: 'bundle-secrets', status: 'FAIL', label: `Secret exposed in HTML: ${secretLabel}` });
      });
    }
  } catch (_) {
    items.push({ id: 'bundle-secrets', status: 'WARN', label: 'Bundle secret scan failed (fetch error)' });
  }

  score = Math.min(score, maxScore);
  return { score, maxScore, items };
}
