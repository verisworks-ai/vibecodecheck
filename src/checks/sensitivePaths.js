import { fetchWithTimeout } from '../utils/fetch.js';

const SENSITIVE_PATHS = [
  { path: '/.env', id: 'env-file', label: '.env file' },
  { path: '/.git/config', id: 'git-config', label: '.git/config' },
  { path: '/.git/HEAD', id: 'git-head', label: '.git/HEAD' },
  { path: '/wp-admin', id: 'wp-admin', label: 'WordPress admin' },
  { path: '/admin', id: 'admin', label: '/admin path' },
  { path: '/api', id: 'api-root', label: '/api root' },
];

export async function checkSensitivePaths(origin) {
  const items = [];
  let score = 0;
  const maxScore = 10;
  const perPath = Math.floor(maxScore / SENSITIVE_PATHS.length);

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
          items.push({ id, status: 'WARN', label: `${label} → ${res.status} (redirect — check destination)` });
        } else {
          items.push({ id, status: 'FAIL', label: `${label} → ${res.status} (potentially exposed)` });
        }
      } catch (_) {
        score += perPath;
        items.push({ id, status: 'PASS', label: `${label} → connection refused (blocked)` });
      }
    })
  );

  score = Math.min(score, maxScore);
  return { score, maxScore, items };
}
