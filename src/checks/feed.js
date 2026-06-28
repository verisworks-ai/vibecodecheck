import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkFeed(origin) {
  const items = [];
  let score = 0;
  const maxScore = 7;

  const paths = ['/feed.xml', '/feed', '/rss.xml', '/rss', '/atom.xml', '/blog/feed.xml', '/blog/feed'];
  let found = false;

  for (const p of paths) {
    try {
      const res = await fetchWithTimeout(`${origin}${p}`, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        const text = await res.text();
        const isRss = text.includes('<rss') || text.includes('<feed') || ct.includes('xml');
        if (isRss) {
          found = true;
          score += 7;
          items.push({ id: 'feed-exists', status: 'PASS', label: `RSS/Atom feed found at ${p}` });
          break;
        }
      }
    } catch (_) {}
  }

  if (!found) {
    items.push({ id: 'feed-exists', status: 'FAIL', label: 'No RSS/Atom feed found' });
  }

  return { score, maxScore, items };
}
