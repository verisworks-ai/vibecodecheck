import { fetchWithTimeout } from '../utils/fetch.js';

export async function checkLlms(origin) {
  const items = [];
  let score = 0;
  const maxScore = 10;

  try {
    const res = await fetchWithTimeout(`${origin}/llms.txt`, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
    if (res.ok) {
      const text = await res.text();
      score += 6;
      items.push({ id: 'llms-exists', status: 'PASS', label: 'llms.txt exists (200)' });

      
      try {
        const res2 = await fetchWithTimeout(`${origin}/llms-full.txt`, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
        if (res2.ok) {
          score += 4;
          items.push({ id: 'llms-full-exists', status: 'PASS', label: 'llms-full.txt exists' });
        } else {
          items.push({ id: 'llms-full-exists', status: 'WARN', label: 'llms-full.txt not found (optional)' });
        }
      } catch (_) {
        items.push({ id: 'llms-full-exists', status: 'WARN', label: 'llms-full.txt not found (optional)' });
      }

      const hasCommercial = /commercial/i.test(text);
      if (hasCommercial) {
        items.push({ id: 'llms-commercial-use', status: 'PASS', label: 'llms.txt declares commercial-use policy' });
      } else {
        items.push({ id: 'llms-commercial-use', status: 'WARN', label: 'llms.txt missing commercial-use declaration' });
      }

      // Content quality: H1 title + at least one ## section link
      const hasH1 = /^#\s+\S/m.test(text);
      const hasSections = /^##\s+/m.test(text);
      if (hasH1 && hasSections) {
        items.push({ id: 'llms-content-quality', status: 'PASS', label: 'llms.txt has H1 title and section links' });
      } else if (hasH1) {
        items.push({ id: 'llms-content-quality', status: 'WARN', label: 'llms.txt has H1 but no ## section links — add key page links' });
      } else {
        items.push({ id: 'llms-content-quality', status: 'WARN', label: 'llms.txt missing H1 title — AI models may skip it' });
      }
    } else {
      items.push({ id: 'llms-exists', status: 'FAIL', label: `llms.txt not found (${res.status})` });
    }
  } catch (e) {
    items.push({ id: 'llms-exists', status: 'FAIL', label: `llms.txt fetch failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
