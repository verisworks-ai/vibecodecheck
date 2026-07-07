import { fetchWithTimeout } from '../utils/fetch.js';

const AUTH_PATHS = [
  '/api/me', '/api/user', '/api/profile', '/api/account',
  '/api/users', '/api/admin', '/dashboard', '/account',
];

export async function checkAuthProtection(origin) {
  const items = [];
  let score = 0;
  const maxScore = 12;

  try {
    const res = await fetchWithTimeout(origin, {
      headers: { 'User-Agent': 'vibecodecheck/1.0' },
    });

    // 1. Cookie security attributes
    const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
    const rawCookies = res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [];
    const cookies = setCookieHeaders.length ? setCookieHeaders : rawCookies;

    if (cookies.length === 0) {
      score += 2;
      items.push({ id: 'cookie-attrs', status: 'PASS', label: 'No Set-Cookie on homepage (none to audit)' });
    } else {
      let cookieIssues = [];
      for (const c of cookies) {
        const cl = c.toLowerCase();
        if (!cl.includes('httponly')) cookieIssues.push('HttpOnly missing');
        if (!cl.includes('secure')) cookieIssues.push('Secure missing');
        if (!cl.includes('samesite')) cookieIssues.push('SameSite missing');
      }
      if (cookieIssues.length === 0) {
        score += 2;
        items.push({ id: 'cookie-attrs', status: 'PASS', label: `Cookies: Secure + HttpOnly + SameSite present` });
      } else {
        const uniq = [...new Set(cookieIssues)];
        items.push({ id: 'cookie-attrs', status: 'FAIL', label: `Cookie flags missing: ${uniq.join(', ')}` });
      }
    }

    // 2. CORS policy
    const corsOrigin = res.headers.get('access-control-allow-origin') || '';
    const corsCredentials = res.headers.get('access-control-allow-credentials') || '';
    if (corsOrigin === '*' && corsCredentials.toLowerCase() === 'true') {
      items.push({ id: 'cors-policy', status: 'FAIL', label: 'CORS: Allow-Origin:* + Allow-Credentials:true (high risk)' });
    } else if (corsOrigin === '*') {
      score += 1;
      items.push({ id: 'cors-policy', status: 'WARN', label: 'CORS: Allow-Origin:* (acceptable for public APIs)' });
    } else if (corsOrigin) {
      score += 2;
      items.push({ id: 'cors-policy', status: 'PASS', label: `CORS origin restricted: ${corsOrigin.substring(0, 60)}` });
    } else {
      score += 2;
      items.push({ id: 'cors-policy', status: 'PASS', label: 'CORS: no wildcard on homepage' });
    }

  } catch (e) {
    items.push({ id: 'auth-fetch', status: 'FAIL', label: `Auth check failed: ${e.message}` });
  }

  // 3. Unprotected auth paths (200 with body on unauthenticated request)
  const pathResults = await Promise.allSettled(
    AUTH_PATHS.map(p => fetchWithTimeout(`${origin}${p}`, {
      headers: { 'User-Agent': 'vibecodecheck/1.0' },
    }))
  );

  let exposedPaths = [];
  for (let i = 0; i < AUTH_PATHS.length; i++) {
    const r = pathResults[i];
    if (r.status === 'fulfilled') {
      const res = r.value;
      if (res.status === 200) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('json') || ct.includes('text/html')) {
          const body = await res.text().catch(() => '');
          // flag if response looks like real data (has json keys or user data patterns)
          if (body.length > 50 && (body.includes('"id"') || body.includes('"email"') || body.includes('"user"'))) {
            exposedPaths.push(AUTH_PATHS[i]);
          }
        }
      }
    }
  }

  if (exposedPaths.length === 0) {
    score += 8;
    items.push({ id: 'auth-paths', status: 'PASS', label: 'Auth-sensitive paths: all returning non-200 or empty without auth' });
  } else {
    items.push({ id: 'auth-paths', status: 'FAIL', label: `Unprotected paths returning data: ${exposedPaths.join(', ')}` });
  }

  return { score, maxScore, items };
}
