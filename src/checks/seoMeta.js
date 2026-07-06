import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkSeoMeta(origin) {
  const items = [];
  let score = 0;
  const maxScore = 12;

  try {
    const res = await fetchWithTimeout(origin, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
    const html = await res.text();
    const xRobots = res.headers.get('x-robots-tag') || '';

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

    const hasOgImage = /og:image/i.test(html);
    if (hasOgImage) {
      score += 2;
      items.push({ id: 'og-image', status: 'PASS', label: 'og:image present (social share preview)' });
    } else {
      items.push({ id: 'og-image', status: 'WARN', label: 'og:image missing — social share previews will be blank' });
    }

    const hasTwitterCard = /name=["']twitter:card["']/i.test(html) || /name=["']twitter:title["']/i.test(html);
    if (hasTwitterCard) {
      score += 1;
      items.push({ id: 'twitter-card', status: 'PASS', label: 'twitter:card meta present' });
    } else {
      items.push({ id: 'twitter-card', status: 'WARN', label: 'twitter:card missing — X/Twitter previews degraded' });
    }

    // noindex detection — Vercel preview leak guard
    const metaRobotsMatch = html.match(/<meta\s[^>]*name=["']robots["'][^>]*content=["']([^"']+)/i)
      || html.match(/<meta\s[^>]*content=["']([^"']+)["'][^>]*name=["']robots["']/i);
    const metaRobotsContent = metaRobotsMatch ? metaRobotsMatch[1].toLowerCase() : '';
    const hasNoindex = metaRobotsContent.includes('noindex') || /noindex/i.test(xRobots);
    if (hasNoindex) {
      items.push({ id: 'noindex', status: 'FAIL', label: `noindex detected — page blocked from search (${xRobots ? 'X-Robots-Tag' : 'meta robots'})` });
    } else {
      score += 2;
      items.push({ id: 'noindex', status: 'PASS', label: 'no noindex directive — page indexable' });
    }

  } catch (e) {
    items.push({ id: 'seo-meta-fetch', status: 'FAIL', label: `SEO meta check failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
