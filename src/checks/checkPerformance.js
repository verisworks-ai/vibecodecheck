import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkPerformance(origin) {
  const items = [];
  let score = 0;
  const maxScore = 10;

  try {
    // 1. TTFB — 3-sample average
    const times = [];
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      try {
        await fetchWithTimeout(origin, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
        times.push(Date.now() - t0);
      } catch (_) {}
    }
    if (times.length > 0) {
      const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      if (avgMs < 600) {
        score += 3;
        items.push({ id: 'ttfb', status: 'PASS', label: `TTFB avg: ${avgMs}ms (good)` });
      } else if (avgMs < 1500) {
        score += 1;
        items.push({ id: 'ttfb', status: 'WARN', label: `TTFB avg: ${avgMs}ms (slow, target <600ms)` });
      } else {
        items.push({ id: 'ttfb', status: 'FAIL', label: `TTFB avg: ${avgMs}ms (very slow, target <600ms)` });
      }
    }

    const res = await fetchWithTimeout(origin, {
      headers: {
        'User-Agent': 'vibecodecheck/1.0',
        'Accept-Encoding': 'gzip, br, deflate',
      },
    });

    // 2. Compression
    const encoding = res.headers.get('content-encoding') || '';
    if (encoding.includes('br')) {
      score += 3;
      items.push({ id: 'compression', status: 'PASS', label: 'Brotli compression enabled' });
    } else if (encoding.includes('gzip')) {
      score += 2;
      items.push({ id: 'compression', status: 'PASS', label: 'Gzip compression enabled' });
    } else {
      items.push({ id: 'compression', status: 'FAIL', label: 'No compression (gzip/br missing) — larger payloads' });
    }

    // 3. Cache-Control
    const cc = res.headers.get('cache-control') || '';
    if (cc && !cc.includes('no-store')) {
      score += 2;
      items.push({ id: 'cache-control', status: 'PASS', label: `Cache-Control: ${cc.substring(0, 60)}` });
    } else if (cc.includes('no-store')) {
      score += 1;
      items.push({ id: 'cache-control', status: 'WARN', label: 'Cache-Control: no-store (intentional or missing caching)' });
    } else {
      items.push({ id: 'cache-control', status: 'FAIL', label: 'Cache-Control header missing' });
    }

    // 4. Rate limiting headers
    const rateLimitHeaders = ['x-ratelimit-limit', 'ratelimit-limit', 'x-rate-limit-limit', 'retry-after'];
    const hasRL = rateLimitHeaders.some(h => res.headers.get(h));
    if (hasRL) {
      score += 2;
      items.push({ id: 'rate-limit', status: 'PASS', label: 'Rate-limit headers present' });
    } else {
      items.push({ id: 'rate-limit', status: 'WARN', label: 'No rate-limit headers detected on homepage' });
    }

  } catch (e) {
    items.push({ id: 'perf-fetch', status: 'FAIL', label: `Performance check failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
