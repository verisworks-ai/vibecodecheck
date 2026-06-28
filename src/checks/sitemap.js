import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkSitemap(origin) {
  const items = [];
  let score = 0;
  const maxScore = 8;

  const paths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml'];
  let found = false;

  for (const p of paths) {
    try {
      const res = await fetchWithTimeout(`${origin}${p}`, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
      if (res.ok) {
        const text = await res.text();
        found = true;
        score += 5;
        items.push({ id: 'sitemap-exists', status: 'PASS', label: `sitemap found at ${p}` });

        const isValidXml = text.includes('<urlset') || text.includes('<sitemapindex');
        if (isValidXml) {
          score += 3;
          items.push({ id: 'sitemap-valid-xml', status: 'PASS', label: 'sitemap XML structure valid' });
        } else {
          items.push({ id: 'sitemap-valid-xml', status: 'FAIL', label: 'sitemap XML structure invalid' });
        }
        break;
      }
    } catch (_) {}
  }

  if (!found) {
    items.push({ id: 'sitemap-exists', status: 'FAIL', label: 'No sitemap.xml found' });
  }

  return { score, maxScore, items };
}
