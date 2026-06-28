import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkRobots(origin) {
  const items = [];
  let score = 0;
  const maxScore = 10;

  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
    if (res.ok) {
      score += 4;
      items.push({ id: 'robots-exists', status: 'PASS', label: 'robots.txt exists (200)' });
      const text = await res.text();

      const hasSitemap = /^Sitemap:/im.test(text);
      if (hasSitemap) {
        score += 3;
        items.push({ id: 'robots-sitemap-directive', status: 'PASS', label: 'robots.txt Sitemap directive present' });
      } else {
        items.push({ id: 'robots-sitemap-directive', status: 'FAIL', label: 'robots.txt missing Sitemap directive' });
      }

      const allowsAll = /^User-agent:\s*\*\s*\nAllow:\s*\/\s*$/im.test(text) || /Allow: \//.test(text);
      if (allowsAll) {
        score += 3;
        items.push({ id: 'robots-allow-all', status: 'PASS', label: 'robots.txt allows crawlers (Allow: /)' });
      } else {
        items.push({ id: 'robots-allow-all', status: 'WARN', label: 'robots.txt does not have explicit Allow: /' });
      }
    } else {
      items.push({ id: 'robots-exists', status: 'FAIL', label: `robots.txt not found (${res.status})` });
    }
  } catch (e) {
    items.push({ id: 'robots-exists', status: 'FAIL', label: `robots.txt fetch failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
