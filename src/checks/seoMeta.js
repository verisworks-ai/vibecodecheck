import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkSeoMeta(origin) {
  const items = [];
  let score = 0;
  const maxScore = 7;

  try {
    const res = await fetchWithTimeout(origin, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
    if (title && title.length >= 5) {
      score += 2;
      items.push({ id: 'title', status: 'PASS', label: `title: "${title.slice(0, 60)}"` });
    } else {
      items.push({ id: 'title', status: title ? 'WARN' : 'FAIL', label: title ? `title too short: "${title}"` : 'title missing' });
    }

    const descMatch = html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)
      || html.match(/<meta\s[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const desc = descMatch ? descMatch[1].trim() : '';
    if (desc && desc.length >= 10) {
      score += 2;
      items.push({ id: 'meta-description', status: 'PASS', label: `meta description: "${desc.slice(0, 80)}"` });
    } else {
      items.push({ id: 'meta-description', status: 'FAIL', label: 'meta description missing' });
    }

    const hasCanonical = /rel=["']canonical["']/i.test(html);
    if (hasCanonical) {
      score += 2;
      items.push({ id: 'canonical', status: 'PASS', label: 'canonical link present' });
    } else {
      items.push({ id: 'canonical', status: 'FAIL', label: 'canonical link missing' });
    }

    const hasViewport = /name=["']viewport["']/i.test(html);
    if (hasViewport) {
      score += 1;
      items.push({ id: 'viewport', status: 'PASS', label: 'viewport meta present (mobile-friendly)' });
    } else {
      items.push({ id: 'viewport', status: 'FAIL', label: 'viewport meta missing' });
    }

  } catch (e) {
    items.push({ id: 'seo-meta-fetch', status: 'FAIL', label: `SEO meta check failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
