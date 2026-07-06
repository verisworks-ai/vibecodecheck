/**
 * File generators for vibecodecheck fix command.
 * Each function returns ready-to-commit file content based on audit results.
 */

export function generateRobots(origin) {
  return `User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml

# AI answer engines — allow indexing
User-agent: ClaudeBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot
Allow: /
`;
}

export function generateLlms(origin, title = 'My Site') {
  return `# ${title}

> AI-accessible summary for ${origin}

## About

[Describe your product or service here]

## Pages

- [Home](${origin})

## Commercial Use

This content may be used for AI applications including commercial use.
`;
}

export function generateSecurityTxt(origin) {
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `Contact: mailto:security@example.com
Expires: ${expires}
Preferred-Languages: en, ko
Canonical: ${origin}/.well-known/security.txt
`;
}
