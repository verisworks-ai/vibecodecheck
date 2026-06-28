import { checkRobots } from './checks/robots.js';
import { checkSitemap } from './checks/sitemap.js';
import { checkFeed } from './checks/feed.js';
import { checkLlms } from './checks/llms.js';
import { checkAiBots } from './checks/aiBots.js';
import { checkHeaders } from './checks/headers.js';
import { checkSensitivePaths } from './checks/sensitivePaths.js';
import { checkSchema } from './checks/schema.js';
import { checkSeoMeta } from './checks/seoMeta.js';
import { checkSecurityTxt } from './checks/securityTxt.js';

export async function audit(targetUrl) {
  const base = new URL(targetUrl);
  const origin = base.origin;

  const results = {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    categories: {},
    score: 0,
    maxScore: 100,
  };

  const [robots, sitemap, feed, llms, aiBots, headers, sensitivePaths, schema, seoMeta, securityTxt] =
    await Promise.allSettled([
      checkRobots(origin),
      checkSitemap(origin),
      checkFeed(origin),
      checkLlms(origin),
      checkAiBots(origin),
      checkHeaders(origin),
      checkSensitivePaths(origin),
      checkSchema(origin),
      checkSeoMeta(origin),
      checkSecurityTxt(origin),
    ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { score: 0, maxScore: 0, items: [], error: r.reason?.message });

  results.categories.discoverability = {
    label: 'Discoverability',
    maxScore: 25,
    ...mergeCategory([unwrap(robots), unwrap(sitemap), unwrap(feed)], 25),
  };

  results.categories.aiCrawlerAccess = {
    label: 'AI Crawler Access',
    maxScore: 25,
    ...unwrap(aiBots),
  };

  results.categories.answerEngineContent = {
    label: 'Answer Engine Content',
    maxScore: 20,
    ...mergeCategory([unwrap(llms), unwrap(schema)], 20),
  };

  results.categories.technicalSeo = {
    label: 'Technical SEO',
    maxScore: 15,
    ...mergeCategory([unwrap(headers), unwrap(seoMeta)], 15),
  };

  results.categories.safetyBoundary = {
    label: 'Safety Boundary',
    maxScore: 15,
    ...mergeCategory([unwrap(sensitivePaths), unwrap(securityTxt)], 15),
  };

  results.score = Object.values(results.categories).reduce((s, c) => s + (c.score || 0), 0);

  return results;
}

function mergeCategory(checks, maxScore) {
  const allItems = checks.flatMap((c) => c.items || []);
  const rawScore = checks.reduce((s, c) => s + (c.score || 0), 0);
  const rawMax = checks.reduce((s, c) => s + (c.maxScore || 0), 0);
  const score = rawMax > 0 ? Math.round((rawScore / rawMax) * maxScore) : 0;
  return { score, items: allItems };
}
