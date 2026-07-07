<p align="center">
  <img src=".github/assets/vibecodecheck-logo.svg" alt="vibecodecheck" width="640">
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

<p align="center">
  <img src=".github/assets/vibecodecheck-hero.svg" alt="vibecodecheck repository overview" width="960">
</p>

# vibecodecheck

검색엔진, AI 크롤러, 보안, 성능을 출시 전에 한 번에 점검하는 공개 URL 감사 도구입니다.

```text
vibecodecheck = pre-launch readiness check for search engines + AI crawlers + security + performance
```

## 한 줄 요약

```text
vibecodecheck = 검색엔진 + AI 크롤러 + 보안 + 성능 런칭 전 준비도 체크
```

## 왜 만들었나

MVP를 출시할 때마다 같은 문제가 반복됐다:

```text
놓친 것                              결과
robots.txt에 Sitemap 지시어 없음     Bing이 콘텐츠를 못 찾음
HEAD / 405 반환                      Bing 크롤러 인덱싱 중단
llms.txt 없음                        Claude, ChatGPT가 사이트를 인용 못 함
GPTBot 차단                          ChatGPT가 사이트 학습 불가
/.env 노출                           누구든 접근하면 자격증명 유출
security.txt 없음                    보안 연구자가 연락처를 못 찾음
SSL 인증서 7일 후 만료               경고 없이 사이트 다운
쿠키 HttpOnly 플래그 없음            XSS로 세션 토큰 탈취 가능
TTFB 1500ms 초과                     페이지 로드 전 사용자 이탈
/api/me 비인증 200 반환              누구나 사용자 데이터 조회 가능
package.json 공개 접근 가능          의존성 버전 지문 노출
SPF / DMARC 없음                     도메인 사칭 피싱 가능
```

고치기 어렵지 않다 — 하지만 뭔가 터지기 전까지는 보이지 않는다. `vibecodecheck`가 런칭 전에 잡아낸다.

## 체크 항목

```text
카테고리               점검 내용                                         점수
─────────────────────────────────────────────────────────────────────────────────
발견 가능성            robots.txt, sitemap.xml, RSS/Atom 피드,            20점
                       SPF / DKIM / DMARC (DNS 기반 이메일 인프라)
AI 크롤러 접근         ClaudeBot, GPTBot, ChatGPT-User, OAI-SearchBot,    20점
                       PerplexityBot, Google-Extended, GrokBot, BraveBot,
                       Amazonbot, Bytespider, cohere-ai,
                       meta-externalagent, Applebot
AI 답변엔진 콘텐츠     llms.txt, llms-full.txt, Schema.org JSON-LD,       15점
                       AEO 스키마 타입, og:title, og:description
기술적 SEO             HTTPS, HEAD 호환성(Bing), 보안 헤더,               15점
                       title/description, canonical, viewport,
                       og:image, twitter:card, noindex 감지
안전 경계              .env·.git/config·/admin·/graphql·OpenAPI/Swagger   15점
                       노출 여부, 번들 시크릿 스캔, security.txt,
                       package.json/requirements.txt/Gemfile 공개 여부
런칭 준비도            SSL 인증서 만료일, HTTP→HTTPS 리다이렉트, HSTS,    15점
                       쿠키 Secure·HttpOnly·SameSite, CORS 정책,
                       비인증 경로 보호, TTFB, gzip/brotli, 캐시 헤더,
                       레이트리밋 헤더, 404/500 에러 처리,
                       스택트레이스·내부 경로 노출 감지
─────────────────────────────────────────────────────────────────────────────────
합계                                                                     100점
```

## 사용법

### CLI

```bash
npx --yes --package=@veris.works/vibecodecheck vibecodecheck https://your-mvp.com
```

```bash
# 마크다운 리포트 저장
npx --yes --package=@veris.works/vibecodecheck vibecodecheck https://your-mvp.com --md

# 특정 파일로 저장
npx --yes --package=@veris.works/vibecodecheck vibecodecheck https://your-mvp.com --out=report.md

# JSON 출력 (CI 파이프라인용)
npx --yes --package=@veris.works/vibecodecheck vibecodecheck https://your-mvp.com --json
```

점수 40 미만 시 exit code `1` — CI 게이트로 활용 가능.

### MCP — Claude Desktop

`claude_desktop_config.json`에 추가:

```json
{
  "mcpServers": {
    "vibecodecheck": {
      "command": "npx",
      "args": ["--yes", "--package=@veris.works/vibecodecheck", "vibecodecheck-mcp"]
    }
  }
}
```

Claude에게 *"내 사이트 런칭 준비됐는지 체크해줘"* 라고 하면 `check_site(url)`을 호출하고 각 항목을 설명해준다.

### MCP — 원격 / 클라우드 에이전트 (codex-hermes 등)

```bash
npx --yes --package=@veris.works/vibecodecheck vibecodecheck-mcp --port=3000
```

MCP 호환 에이전트를 `http://localhost:3000`에 연결. StreamableHTTP transport 사용.

## 출력 예시

```
  VibecodeCheck scanning https://your-mvp.com ...

  VibecodeCheck
  https://your-mvp.com

  Score: 83/100  B — mostly ready

  Discoverability          ██████████ 25/25
  AI Crawler Access        ██████████ 24/25
  Answer Engine Content    ████░░░░░░  8/20
  Technical SEO            ██████████ 15/15
  Safety Boundary          ███████░░░ 11/15

  ❌ Issues (4)
     • No Schema.org JSON-LD found
     • FAQPage schema missing
     • Article schema missing
     • security.txt not found

  ⚠️  Warnings (1)
     • llms-full.txt not found (optional)
```

## 점수 등급

```text
90–100   A — 런칭 준비 완료
75–89    B — 거의 준비됨
60–74    C — 보완 필요
40–59    D — 큰 빈틈 있음
0–39     F — 런칭 불가
```

## 실전 시나리오

### 런칭 전 — 보이지 않는 문제 사전 차단

```bash
npx --yes --package=@veris.works/vibecodecheck vibecodecheck https://my-mvp.com
```

llms.txt 누락, AI 봇 차단, 사이트맵 없음, .env 경로 노출 등을 사용자나 검색엔진이 발견하기 전에 잡아낸다.

### CI에서 — 점수로 게이트

```yaml
- name: VibecodeCheck
  run: npx --yes --package=@veris.works/vibecodecheck vibecodecheck https://staging.my-mvp.com --json
  # 점수 40 미만이면 exit 1
```

### Claude Desktop에서 — 수정 가이드까지

Claude에게: *"https://my-mvp.com 바이브코딩체크 해서 뭐 먼저 고쳐야 하는지 알려줘"*

Claude가 감사를 실행하고 우선순위별 수정 방법을 설명한다.

## 아키텍처

```text
vibecodecheck/
├── bin/vibecodecheck.js      ← CLI 진입점 (npx --yes --package=@veris.works/vibecodecheck vibecodecheck)
├── mcp/server.js             ← MCP 서버: stdio + HTTP (npx --yes --package=@veris.works/vibecodecheck vibecodecheck-mcp)
├── src/
│   ├── audit.js              ← 오케스트레이터 (병렬 Promise.allSettled)
│   ├── checks/               ← 10개 독립 체크 모듈
│   │   ├── aiBots.js         ← AI 크롤러 13종, UA 시뮬레이션
│   │   ├── feed.js           ← RSS/Atom 피드 감지
│   │   ├── headers.js        ← HTTPS, HEAD, 보안 헤더
│   │   ├── llms.js           ← llms.txt + llms-full.txt
│   │   ├── robots.js         ← robots.txt + Sitemap 지시어
│   │   ├── schema.js         ← Schema.org JSON-LD + OG 태그
│   │   ├── securityTxt.js    ← /.well-known/security.txt
│   │   ├── sensitivePaths.js ← .env, .git, /admin 노출 여부
│   │   ├── seoMeta.js        ← title, meta description, canonical, viewport
│   │   └── sitemap.js        ← sitemap.xml / sitemap_index.xml
│   ├── reporters/
│   │   └── markdown.js       ← 콘솔 + 마크다운 출력
│   └── utils/
│       └── fetch.js          ← fetchWithTimeout (10초, AbortController)
```

## 보안

- 모든 fetch에 10초 타임아웃 (AbortController)
- `--out=` 현재 디렉토리로 제한 (경로 순회 차단)
- localhost/사설 IP 스캔 시 경고 출력
- 외부 서비스로 데이터 전송 없음 — 모든 체크 클라이언트 로컬 실행

## 요구사항

Node.js 18+

## 라이선스

MIT — [veris](https://veris.kr) · [hello@veris.kr](mailto:hello@veris.kr)
