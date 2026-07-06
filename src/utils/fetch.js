const DEFAULT_TIMEOUT = 10_000;
const MAX_BODY_BYTES = 2_000_000; // 2MB cap — prevent memory exhaustion on large pages

export async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function readBodyWithLimit(res, maxBytes = MAX_BODY_BYTES) {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel();
      chunks.push(value.slice(0, maxBytes - (total - value.byteLength)));
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(
    chunks.reduce((a, b) => { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }, new Uint8Array(0))
  );
}
