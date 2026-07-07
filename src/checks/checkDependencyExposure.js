import { fetchWithTimeout } from '../utils/fetch.js';

const DEP_PATHS = [
  { path: '/package.json',       id: 'pkg-json',       label: 'package.json' },
  { path: '/package-lock.json',  id: 'pkg-lock',       label: 'package-lock.json' },
  { path: '/composer.json',      id: 'composer',       label: 'composer.json' },
  { path: '/requirements.txt',   id: 'requirements',   label: 'requirements.txt' },
  { path: '/Gemfile',            id: 'gemfile',        label: 'Gemfile' },
  { path: '/go.sum',             id: 'go-sum',         label: 'go.sum' },
  { path: '/yarn.lock',          id: 'yarn-lock',      label: 'yarn.lock' },
  { path: '/Pipfile',            id: 'pipfile',        label: 'Pipfile' },
  { path: '/pyproject.toml',     id: 'pyproject',      label: 'pyproject.toml' },
  { path: '/.npmrc',             id: 'npmrc',          label: '.npmrc (may contain auth tokens)' },
];

export async function checkDependencyExposure(origin) {
  const items = [];
  let score = 0;
  const maxScore = 6;
  let exposed = 0;

  const results = await Promise.allSettled(
    DEP_PATHS.map(d => fetchWithTimeout(`${origin}${d.path}`, {
      headers: { 'User-Agent': 'vibecodecheck/1.0' },
    }))
  );

  for (let i = 0; i < DEP_PATHS.length; i++) {
    const r = results[i];
    const { path, id, label } = DEP_PATHS[i];
    if (r.status === 'fulfilled' && r.value.status === 200) {
      const ct = r.value.headers.get('content-type') || '';
      // HTML response = SPA soft-404, skip
      if (ct.includes('text/html')) {
        items.push({ id, status: 'PASS', label: `${label}: not accessible` });
        continue;
      }
      const body = await r.value.text().catch(() => '');
      // Confirm it's actually the dependency file content (not a SPA 200 soft-404)
      const looksReal = body.includes('"dependencies"') || body.includes('"name"') ||
                        body.includes('require(') || body.includes('Flask') ||
                        body.includes('source ') || body.includes('module ');
      if (looksReal) {
        exposed++;
        items.push({ id, status: 'FAIL', label: `${label} publicly accessible — version fingerprinting risk` });
      } else {
        items.push({ id, status: 'PASS', label: `${label}: not accessible` });
      }
    } else {
      items.push({ id, status: 'PASS', label: `${label}: not accessible` });
    }
  }

  score = Math.max(0, maxScore - exposed * 2);
  return { score, maxScore, items };
}
