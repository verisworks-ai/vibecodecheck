import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkHeaders(origin) {
  const items = [];
  let score = 0;
  const maxScore = 8;

  try {
    const [getRes, headRes] = await Promise.all([
      fetchWithTimeout(origin, { headers: { 'User-Agent': 'vibecodecheck/1.0' }, redirect: 'follow' }),
      fetchWithTimeout(origin, { method: 'HEAD', headers: { 'User-Agent': 'vibecodecheck/1.0' }, redirect: 'follow' }),
    ]);

    // HTTPS redirect
    const isHttps = origin.startsWith('https://');
    if (isHttps) {
      score += 3;
      items.push({ id: 'https', status: 'PASS', label: 'HTTPS accessible' });
    } else {
      const httpsUrl = origin.replace('http://', 'https://');
      try {
        const r = await fetchWithTimeout(httpsUrl, { headers: { 'User-Agent': 'vibecodecheck/1.0' }, redirect: 'follow' });
        if (r.ok) {
          items.push({ id: 'https', status: 'WARN', label: 'HTTPS accessible but HTTP not redirecting' });
        } else {
          items.push({ id: 'https', status: 'FAIL', label: 'HTTPS not accessible' });
        }
      } catch (_) {
        items.push({ id: 'https', status: 'FAIL', label: 'HTTPS not accessible' });
      }
    }

    // HEAD compatibility
    if (headRes.ok || headRes.status === 301 || headRes.status === 302) {
      score += 2;
      items.push({ id: 'head-compat', status: 'PASS', label: `HEAD / → ${headRes.status}` });
    } else {
      items.push({ id: 'head-compat', status: 'FAIL', label: `HEAD / → ${headRes.status} (may block Bing)` });
    }

    // Security headers
    const h = getRes.headers;
    const secHeaders = [
      ['X-Content-Type-Options', 'x-content-type-options'],
      ['X-Frame-Options', 'x-frame-options'],
      ['Referrer-Policy', 'referrer-policy'],
    ];
    let secScore = 0;
    for (const [label, key] of secHeaders) {
      if (h.get(key)) {
        secScore++;
        items.push({ id: `header-${key}`, status: 'PASS', label: `${label}: ${h.get(key)}` });
      } else {
        items.push({ id: `header-${key}`, status: 'FAIL', label: `${label}: missing` });
      }
    }
    score += Math.round((secScore / secHeaders.length) * 3);

  } catch (e) {
    items.push({ id: 'headers-fetch', status: 'FAIL', label: `Header check failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
