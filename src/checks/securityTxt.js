import { fetchWithTimeout } from '../utils/fetch.js';

const PATHS = ['/.well-known/security.txt', '/security.txt'];

export async function checkSecurityTxt(origin) {
  const items = [];
  let score = 0;
  const maxScore = 5;

  let found = false;
  for (const p of PATHS) {
    try {
      const res = await fetchWithTimeout(`${origin}${p}`, {
        headers: { 'User-Agent': 'vibecodecheck/1.0' },
      });
      if (res.ok) {
        found = true;
        const text = await res.text();
        score += 3;
        items.push({ id: 'security-txt-exists', status: 'PASS', label: `security.txt found at ${p}` });

        const hasContact = /^Contact:/im.test(text);
        if (hasContact) {
          score += 1;
          items.push({ id: 'security-txt-contact', status: 'PASS', label: 'security.txt Contact field present' });
        } else {
          items.push({ id: 'security-txt-contact', status: 'FAIL', label: 'security.txt missing Contact field' });
        }

        const hasExpires = /^Expires:/im.test(text);
        if (hasExpires) {
          score += 1;
          items.push({ id: 'security-txt-expires', status: 'PASS', label: 'security.txt Expires field present' });
        } else {
          items.push({ id: 'security-txt-expires', status: 'WARN', label: 'security.txt missing Expires field' });
        }
        break;
      }
    } catch (_) {}
  }

  if (!found) {
    items.push({ id: 'security-txt-exists', status: 'FAIL', label: 'security.txt not found (/.well-known/security.txt recommended)' });
  }

  return { score, maxScore, items };
}
