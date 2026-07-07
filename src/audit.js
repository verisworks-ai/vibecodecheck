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
import { checkSSLDeep } from './checks/checkSSLDeep.js';
import { checkAuthProtection } from './checks/checkAuthProtection.js';
import { checkPerformance } from './checks/checkPerformance.js';
import { checkErrorPages } from './checks/checkErrorPages.js';
import { checkEmailInfra } from './checks/checkEmailInfra.js';
import { checkDependencyExposure } from './checks/checkDependencyExposure.js';

export async function audit(targetUrl) {
  const base = new URL(targetUrl);
  const origin = base.origin;
  const hostname = base.hostname;

  const results = {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    categories: {},
    score: 0,
    maxScore: 100,
  };

  const [
    robots, sitemap, feed, llms, aiBots, headers, sensitivePaths,
    schema, seoMeta, securityTxt,
    sslDeep, authProtection, performance, errorPages, emailInfra, depExposure,
  ] = await Promise.allSettled([
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
    checkSSLDeep(origin),
    checkAuthProtection(origin),
    checkPerformance(origin),
    checkErrorPages(origin),
    checkEmailInfra(hostname),
    checkDependencyExposure(origin),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { score: 0, maxScore: 0, items: [], error: r.reason?.message });

  results.categories.discoverability = {
    label: 'Discoverability',
    maxScore: 20,
    ...mergeCategory([unwrap(robots), unwrap(sitemap), unwrap(feed), unwrap(emailInfra)], 20),
  };

  results.categories.aiCrawlerAccess = {
    label: 'AI Crawler Access',
    maxScore: 20,
    ...mergeCategory([unwrap(aiBots)], 20),
  };

  results.categories.answerEngineContent = {
    label: 'Answer Engine Content',
    maxScore: 15,
    ...mergeCategory([unwrap(llms), unwrap(schema)], 15),
  };

  results.categories.technicalSeo = {
    label: 'Technical SEO',
    maxScore: 15,
    ...mergeCategory([unwrap(headers), unwrap(seoMeta)], 15),
  };

  results.categories.safetyBoundary = {
    label: 'Safety Boundary',
    maxScore: 15,
    ...mergeCategory([unwrap(sensitivePaths), unwrap(securityTxt), unwrap(depExposure)], 15),
  };

  results.categories.launchReadiness = {
    label: 'Launch Readiness',
    maxScore: 15,
    ...mergeCategory([unwrap(sslDeep), unwrap(authProtection), unwrap(performance), unwrap(errorPages)], 15),
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
