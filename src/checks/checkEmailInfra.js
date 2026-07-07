import dns from 'dns/promises';

export async function checkEmailInfra(hostname) {
  const items = [];
  let score = 0;
  const maxScore = 8;

  // SPF
  try {
    const txt = await dns.resolveTxt(hostname);
    const spf = txt.find(r => r.join('').startsWith('v=spf1'));
    if (spf) {
      score += 3;
      items.push({ id: 'spf', status: 'PASS', label: `SPF: ${spf.join('').substring(0, 70)}` });
    } else {
      items.push({ id: 'spf', status: 'FAIL', label: 'SPF record missing — phishing risk for email from this domain' });
    }
  } catch (_) {
    items.push({ id: 'spf', status: 'WARN', label: 'SPF check failed (DNS error or no TXT records)' });
  }

  // DMARC
  try {
    const txt = await dns.resolveTxt(`_dmarc.${hostname}`);
    const dmarc = txt.find(r => r.join('').startsWith('v=DMARC1'));
    if (dmarc) {
      const val = dmarc.join('');
      const policy = val.match(/p=(\w+)/i)?.[1] || 'none';
      if (policy === 'reject' || policy === 'quarantine') {
        score += 3;
        items.push({ id: 'dmarc', status: 'PASS', label: `DMARC: p=${policy} (enforced)` });
      } else {
        score += 1;
        items.push({ id: 'dmarc', status: 'WARN', label: `DMARC: p=none (monitoring only, not enforced)` });
      }
    } else {
      items.push({ id: 'dmarc', status: 'FAIL', label: 'DMARC record missing — email spoofing risk' });
    }
  } catch (_) {
    items.push({ id: 'dmarc', status: 'FAIL', label: 'DMARC record missing or DNS error' });
  }

  // DKIM (check common selectors)
  const selectors = ['default', 'google', 'mail', 'dkim', 'k1', 'selector1', 'selector2'];
  let dkimFound = false;
  for (const sel of selectors) {
    try {
      await dns.resolveTxt(`${sel}._domainkey.${hostname}`);
      dkimFound = true;
      score += 2;
      items.push({ id: 'dkim', status: 'PASS', label: `DKIM key found at ${sel}._domainkey.${hostname}` });
      break;
    } catch (_) {}
  }
  if (!dkimFound) {
    items.push({ id: 'dkim', status: 'WARN', label: 'DKIM key not found (checked common selectors — may use custom)' });
  }

  return { score, maxScore, items };
}
