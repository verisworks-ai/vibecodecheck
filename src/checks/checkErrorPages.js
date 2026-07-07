import { fetchWithTimeout } from '../utils/fetch.js';

const STACK_PATTERNS = [
  /at\s+\S+\s+\(.*:\d+:\d+\)/,           // JS stack trace
  /Traceback \(most recent call last\)/i,  // Python
  /Exception in thread/i,                  // Java
  /System\.NullReferenceException/i,       // .NET
  /Fatal error:/i,                         // PHP
  /\bstacktrace\b/i,
  /\bstack_trace\b/i,
];

const PATH_LEAK_PATTERNS = [
  /\/home\/\w+\//,
  /\/var\/www\//,
  /\/Users\/\w+\//,
  /C:\\Users\\\w+\\/i,
  /node_modules\//,
  /\/app\/src\//,
];

export async function checkErrorPages(origin) {
  const items = [];
  let score = 0;
  const maxScore = 8;

  // 1. 404 handling
  try {
    const r404 = await fetchWithTimeout(
      `${origin}/__vibecodecheck_nonexistent_path_${Date.now()}`,
      { headers: { 'User-Agent': 'vibecodecheck/1.0' } }
    );
    if (r404.status === 404) {
      score += 3;
      items.push({ id: '404-status', status: 'PASS', label: '404 response: proper 404 status code' });

      const body = await r404.text().catch(() => '');
      const hasStackTrace = STACK_PATTERNS.some(p => p.test(body));
      const hasPathLeak = PATH_LEAK_PATTERNS.some(p => p.test(body));

      if (hasStackTrace) {
        items.push({ id: '404-leaks', status: 'FAIL', label: '404 page leaks stack trace (info disclosure)' });
      } else if (hasPathLeak) {
        items.push({ id: '404-leaks', status: 'FAIL', label: '404 page leaks internal file path' });
      } else {
        score += 2;
        items.push({ id: '404-leaks', status: 'PASS', label: '404 page: no stack trace or path leak detected' });
      }
    } else if (r404.status === 200) {
      items.push({ id: '404-status', status: 'WARN', label: `Non-existent path returns 200 (soft 404) — may confuse SEO` });
    } else {
      score += 1;
      items.push({ id: '404-status', status: 'WARN', label: `Non-existent path returns ${r404.status} (not 404)` });
    }
  } catch (e) {
    items.push({ id: '404-status', status: 'FAIL', label: `404 check failed: ${e.message}` });
  }

  // 2. API error detail exposure
  try {
    const rApi = await fetchWithTimeout(
      `${origin}/api/__vibecodecheck_nonexistent_${Date.now()}`,
      {
        headers: {
          'User-Agent': 'vibecodecheck/1.0',
          'Content-Type': 'application/json',
        },
      }
    );
    const apiBody = await rApi.text().catch(() => '');
    const hasStackTrace = STACK_PATTERNS.some(p => p.test(apiBody));
    const hasPathLeak = PATH_LEAK_PATTERNS.some(p => p.test(apiBody));

    if (hasStackTrace || hasPathLeak) {
      items.push({ id: 'api-error-leak', status: 'FAIL', label: 'API error response leaks internal info (stack/path)' });
    } else {
      score += 3;
      items.push({ id: 'api-error-leak', status: 'PASS', label: 'API error response: no stack trace or path leak' });
    }
  } catch (_) {
    score += 3; // /api path not found → not exposing internal errors
    items.push({ id: 'api-error-leak', status: 'PASS', label: '/api path not accessible (no leak surface)' });
  }

  return { score, maxScore, items };
}
