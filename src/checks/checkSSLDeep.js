import { fetchWithTimeout } from '../utils/fetch.js';
import tls from 'tls';

function getCertExpiry(hostname) {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const expiry = cert?.valid_to ? new Date(cert.valid_to) : null;
      resolve(expiry);
    });
    socket.on('error', () => resolve(null));
    socket.setTimeout(5000, () => { socket.destroy(); resolve(null); });
  });
}

export async function checkSSLDeep(origin) {
  const items = [];
  let score = 0;
  const maxScore = 10;

  const hostname = new URL(origin).hostname;
  const isHttps = origin.startsWith('https://');

  // 1. HTTP → HTTPS redirect
  if (isHttps) {
    const httpUrl = origin.replace('https://', 'http://');
    try {
      const r = await fetchWithTimeout(httpUrl, {
        headers: { 'User-Agent': 'vibecodecheck/1.0' },
        redirect: 'manual',
      });
      const loc = r.headers.get('location') || '';
      if ((r.status === 301 || r.status === 302 || r.status === 308) && loc.startsWith('https://')) {
        score += 3;
        items.push({ id: 'http-redirect', status: 'PASS', label: `HTTP → HTTPS redirect (${r.status})` });
      } else if (r.status >= 300 && r.status < 400) {
        score += 1;
        items.push({ id: 'http-redirect', status: 'WARN', label: `Redirect exists but target: ${loc.substring(0, 60)}` });
      } else {
        items.push({ id: 'http-redirect', status: 'FAIL', label: `HTTP not redirecting to HTTPS (status ${r.status})` });
      }
    } catch (_) {
      score += 3; // HTTP port closed → HTTPS only, acceptable
      items.push({ id: 'http-redirect', status: 'PASS', label: 'HTTP port closed (HTTPS only)' });
    }
  } else {
    items.push({ id: 'http-redirect', status: 'FAIL', label: 'Site not on HTTPS' });
  }

  // 2. SSL certificate expiry
  if (isHttps) {
    const expiry = await getCertExpiry(hostname);
    if (expiry) {
      const daysLeft = Math.floor((expiry - Date.now()) / 86400000);
      if (daysLeft > 30) {
        score += 4;
        items.push({ id: 'ssl-expiry', status: 'PASS', label: `SSL cert valid: ${daysLeft} days left (expires ${expiry.toISOString().slice(0,10)})` });
      } else if (daysLeft > 0) {
        score += 1;
        items.push({ id: 'ssl-expiry', status: 'WARN', label: `SSL cert expiring soon: ${daysLeft} days left` });
      } else {
        items.push({ id: 'ssl-expiry', status: 'FAIL', label: `SSL cert EXPIRED ${Math.abs(daysLeft)} days ago` });
      }
    } else {
      items.push({ id: 'ssl-expiry', status: 'WARN', label: 'Could not read SSL cert expiry' });
    }
  } else {
    items.push({ id: 'ssl-expiry', status: 'FAIL', label: 'No HTTPS → cert check skipped' });
  }

  // 3. HSTS max-age adequacy
  try {
    const r = await fetchWithTimeout(origin, { headers: { 'User-Agent': 'vibecodecheck/1.0' } });
    const hsts = r.headers.get('strict-transport-security') || '';
    const match = hsts.match(/max-age=(\d+)/i);
    if (match) {
      const days = parseInt(match[1]) / 86400;
      if (days >= 180) {
        score += 3;
        items.push({ id: 'hsts-maxage', status: 'PASS', label: `HSTS max-age: ${Math.round(days)} days` });
      } else {
        score += 1;
        items.push({ id: 'hsts-maxage', status: 'WARN', label: `HSTS max-age too short: ${Math.round(days)} days (recommend ≥180)` });
      }
    } else {
      items.push({ id: 'hsts-maxage', status: 'FAIL', label: 'HSTS header missing or no max-age' });
    }
  } catch (e) {
    items.push({ id: 'hsts-maxage', status: 'FAIL', label: `HSTS check failed: ${e.message}` });
  }

  return { score, maxScore, items };
}
