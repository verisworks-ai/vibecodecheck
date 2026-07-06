import { fetchWithTimeout } from '../utils/fetch.js';

const AI_BOTS = [
  { name: 'ClaudeBot', ua: 'ClaudeBot/1.0', category: 'ai-answer' },
  { name: 'GPTBot', ua: 'GPTBot/1.0', category: 'ai-answer' },
  { name: 'ChatGPT-User', ua: 'ChatGPT-User/1.0', category: 'ai-answer' },
  { name: 'OAI-SearchBot', ua: 'OAI-SearchBot/1.0', category: 'ai-search' },
  { name: 'PerplexityBot', ua: 'PerplexityBot/1.0', category: 'ai-search' },
  { name: 'Google-Extended', ua: 'Google-Extended/1.0', category: 'ai-training' },
  { name: 'GrokBot', ua: 'Grok/1.0', category: 'ai-answer' },
  { name: 'BraveBot', ua: 'Brave/1.0', category: 'ai-search' },
  { name: 'Amazonbot', ua: 'Amazonbot/0.1', category: 'ai-answer' },
  { name: 'Bytespider', ua: 'Bytespider/1.0', category: 'ai-training' },
  { name: 'cohere-ai', ua: 'cohere-ai/1.0', category: 'ai-answer' },
  { name: 'meta-externalagent', ua: 'meta-externalagent/1.1', category: 'ai-answer' },
  { name: 'Applebot', ua: 'Applebot/0.1', category: 'ai-search' },
];

export async function checkAiBots(origin) {
  const items = [];
  let passCount = 0;
  const maxScore = 25;

  await Promise.all(
    AI_BOTS.map(async (bot) => {
      try {
        const res = await fetchWithTimeout(origin, {
          headers: { 'User-Agent': bot.ua },
          redirect: 'follow',
        });
        const ok = res.ok || res.status === 301 || res.status === 302;
        if (ok) {
          passCount++;
          items.push({ id: `bot-${bot.name}`, status: 'PASS', label: `${bot.name} → ${res.status}` });
        } else {
          items.push({ id: `bot-${bot.name}`, status: 'FAIL', label: `${bot.name} → ${res.status} (blocked)` });
        }
      } catch (e) {
        items.push({ id: `bot-${bot.name}`, status: 'FAIL', label: `${bot.name} → connection error` });
      }
    })
  );

  const score = Math.round((passCount / AI_BOTS.length) * maxScore);
  return { score, maxScore, items };
}
