# VibecodeCheck

Pre-launch site check for vibe-coded MVPs.

URL 하나로 Google, Bing, Naver, AI 크롤러, 보안 설정을 한 번에 점검한다.

```bash
npx vibecodecheck https://your-mvp.com
```

## What it checks

| Category | Checks |
|---|---|
| Discoverability | robots.txt, sitemap.xml, RSS/feed |
| AI Crawler Access | ClaudeBot, GPTBot, PerplexityBot, OAI-SearchBot, GrokBot, BraveBot |
| Answer Engine Content | llms.txt, llms-full.txt, Schema.org JSON-LD, OG tags |
| Technical SEO | HTTPS, HEAD compatibility (Bing), security headers, meta tags |
| Safety Boundary | Sensitive paths (.env, .git/config), security.txt |

Score: 0–100 across 5 categories.

## Output

```
VibecodeCheck
https://your-mvp.com

Score: 83/100  B — mostly ready

Discoverability          ██████████ 25/25
AI Crawler Access        ██████████ 24/25
Answer Engine Content    ████░░░░░░  8/20
Technical SEO            ██████████ 15/15
Safety Boundary          ███████░░░ 11/15

❌ Issues (2)
   • No Schema.org JSON-LD found
   • security.txt not found

⚠️  Warnings (1)
   • llms-full.txt not found (optional)
```

## Options

```bash
npx vibecodecheck <url>              # console output
npx vibecodecheck <url> --md         # save markdown report (auto-named)
npx vibecodecheck <url> --out=report.md  # save to specific file
npx vibecodecheck <url> --json       # JSON output
```

Exit code `1` when score < 40 (CI-friendly).

## Requirements

Node.js 18+

## License

MIT
