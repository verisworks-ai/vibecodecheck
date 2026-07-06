# KakaoMCP registration notes

This package exposes `vibecodecheck` as a public URL audit MCP server over stdio and HTTP.

## Repository

```text
https://github.com/verisworks-ai/vibecodecheck
```

## PlayMCP Git source build form

```text
MCP 서버 이름        vibecodecheck
                     ※ Kubernetes/DNS 리소스 이름이라 한글 불가. 소문자 영문으로 입력.
설명                 공개 URL 출시 전 점검 MCP 서버입니다. 검색엔진·AI 크롤러 접근성, robots.txt, sitemap, llms.txt, 구조화 데이터, 보안 헤더와 민감 경로 노출을 점검하고 0~100점 준비도 리포트를 반환합니다.
Git URL              https://github.com/verisworks-ai/vibecodecheck.git
브랜치 / ref         main
Dockerfile 경로      Dockerfile
PAT                  입력하지 않음 (public repository)
```

## PlayMCP 대표 아이콘

```text
권장 파일            assets/playmcp-icon/vibecodecheck_playmcp_icon_600.png
규격                 600x600 PNG, RGBA 투명 배경
예비 파일            assets/playmcp-icon/vibecodecheck_playmcp_icon_640.png
검수 미리보기        reports/playmcp-icon/vibecodecheck_playmcp_icon_600_checker.png
패키지               reports/playmcp-icon/vibecodecheck_playmcp_icon_pack.zip
```

아이콘 의미:

```text
방패                 공개 사이트 출시 전 안전 점검
체크                 통과/준비도 리포트
서비스 그래프        MCP와 URL·크롤러·검색엔진 연결성
초록 포인트          veris 계열의 검증/신뢰 톤
```

Container runtime:

```text
PORT=3000 node mcp/server.js
```

## Install / run command

```bash
npx --yes --package=@veris.works/vibecodecheck vibecodecheck-mcp
```

## MCP server command

### Stdio

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

### HTTP / StreamableHTTP

```bash
npx --yes --package=@veris.works/vibecodecheck vibecodecheck-mcp --port=3000
# Docker/Kubernetes: PORT=3000 node mcp/server.js
```

Connect MCP clients to:

```text
http://localhost:3000
```

## Primary tools

```text
check_site              Audit a public URL before launch
```

`check_site` returns a 0-100 score and category breakdown for:

```text
Discoverability         robots.txt and sitemap readiness
AI crawler access       13 AI/search crawler user-agent probes
Answer engine content   llms.txt, llms-full.txt, Schema.org, AEO schema, RSS/feed hints
Technical SEO           title, meta description, canonical, Open Graph, Twitter card, noindex
Safety boundary         security headers, security.txt, sensitive path exposure, bundle secret scan
```

## Safety model

```text
Read-only public URL inspection
No authenticated integrations
No browser session access
No credential collection
No destructive operations
Uses outbound GET/HEAD requests to the submitted public URL and common public metadata paths
```

MCP tool annotations:

```text
readOnlyHint: true
idempotentHint: false
openWorldHint: true
destructiveHint: false
```

`idempotentHint` is `false` because results depend on live network state and target-site changes, although the tool itself is read-only.

## Suggested catalog description

```text
Pre-launch URL audit MCP for vibe-coded MVPs. It checks whether search engines and AI answer engines can read a public site, including robots.txt, sitemap, llms.txt, AI crawler access, Schema.org, security headers, security.txt, and sensitive path exposure, then returns a scored readiness report.
```

## Clean-room verification before submission

```bash
npm view @veris.works/vibecodecheck name version bin --json
npx --yes --package=@veris.works/vibecodecheck vibecodecheck https://example.com --json
npx --yes --package=@veris.works/vibecodecheck vibecodecheck-mcp
```

Then run `tools/list` in the target MCP client and verify `check_site` appears with the read-only/open-world annotations.

## Local repository verification

```bash
npm install
node bin/vibecodecheck.js https://example.com --json
node /tmp/vibecodecheck-mcp-smoke.mjs
PORT=3333 node mcp/server.js
node /tmp/vibecodecheck-mcp-http-smoke.mjs
npm pack --dry-run --json
```
