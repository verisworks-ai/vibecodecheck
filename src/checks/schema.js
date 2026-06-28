import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkSchema(origin) {
  const items = [];
  let score = 0;
  const maxScore = 10;

  try {
    const res = await fetchWithTimeout(origin, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
    const html = await res.text();

    const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const types = new Set();

    for (const m of ldMatches) {
      try {
        const d = JSON.parse(m[1]);
        const t = d['@type'];
        if (t) (Array.isArray(t) ? t : [t]).forEach((x) => types.add(x));
      } catch (_) {}
    }

    if (types.size > 0) {
      score += 3;
      items.push({ id: 'schema-exists', status: 'PASS', label: `Schema.org types: ${[...types].join(', ')}` });
    } else {
      items.push({ id: 'schema-exists', status: 'FAIL', label: 'No Schema.org JSON-LD found' });
    }

    const VALUE_TYPES = [
      ['FAQPage', 'faq-schema'],
      ['Article', 'article-schema'],
      ['BreadcrumbList', 'breadcrumb-schema'],
    ];

    for (const [type, id] of VALUE_TYPES) {
      if (types.has(type)) {
        score += 2;
        items.push({ id, status: 'PASS', label: `${type} schema present` });
      } else {
        items.push({ id, status: 'FAIL', label: `${type} schema missing` });
      }
    }

    // og tags basic
    const hasOgTitle = /og:title/i.test(html);
    const hasOgDesc = /og:description/i.test(html);
    if (hasOgTitle) {
      score += 1;
      items.push({ id: 'og-title', status: 'PASS', label: 'og:title present' });
    } else {
      items.push({ id: 'og-title', status: 'FAIL', label: 'og:title missing' });
    }
    if (hasOgDesc) {
      score += 1;
      items.push({ id: 'og-description', status: 'PASS', label: 'og:description present' });
    } else {
      items.push({ id: 'og-description', status: 'FAIL', label: 'og:description missing' });
    }

  } catch (e) {
    items.push({ id: 'schema-fetch', status: 'FAIL', label: `Schema check failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
