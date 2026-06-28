#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { audit } from '../src/audit.js';
import http from 'http';

const args = process.argv.slice(2);
const portArg = args.find((a) => a.startsWith('--port='));
const PORT = portArg ? parseInt(portArg.replace('--port=', ''), 10) : null;

function createServer() {
  const server = new Server(
    { name: 'vibecodecheck', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'check_site',
        description:
          'Run VibecodeCheck pre-launch audit on a URL. ' +
          'Checks SEO, AEO, GEO, AI crawler access (ClaudeBot, GPTBot, PerplexityBot, etc.), ' +
          'llms.txt, sitemap, security headers, security.txt, sensitive path exposure, and Schema.org. ' +
          'Returns a 0-100 score with per-category breakdown and actionable issues.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL to audit, e.g. https://my-mvp.com',
            },
          },
          required: ['url'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'check_site') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const { url } = request.params.arguments;

    try {
      new URL(url);
    } catch {
      return {
        content: [{ type: 'text', text: `Invalid URL: ${url}` }],
        isError: true,
      };
    }

    let result;
    try {
      result = await audit(url);
    } catch (e) {
      return {
        content: [{ type: 'text', text: `Audit failed: ${e.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: formatResult(result) }],
    };
  });

  return server;
}

if (PORT) {
  // HTTP mode — for remote/cloud agents (codex-hermes, etc.)
  const httpServer = http.createServer(async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(PORT, () => {
    process.stderr.write(`VibecodeCheck MCP server running on http://localhost:${PORT}\n`);
  });
} else {
  // Stdio mode — for Claude Desktop local use
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function formatResult(result) {
  const grade = scoreGrade(result.score);
  const lines = [
    `## VibecodeCheck — ${result.url}`,
    `Scanned: ${new Date(result.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST`,
    ``,
    `**Score: ${result.score}/100 — ${grade}**`,
    ``,
  ];

  for (const [, cat] of Object.entries(result.categories)) {
    const pct = Math.round(((cat.score ?? 0) / cat.maxScore) * 100);
    lines.push(`**${cat.label}**: ${cat.score ?? 0}/${cat.maxScore} (${pct}%)`);
    if (cat.error) lines.push(`  ⚠️ Error: ${cat.error}`);
    for (const item of cat.items ?? []) {
      const icon = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : '⚠️';
      lines.push(`  ${icon} ${item.label}`);
    }
    lines.push('');
  }

  const fails = [];
  const warns = [];
  for (const [, cat] of Object.entries(result.categories)) {
    for (const item of cat.items ?? []) {
      if (item.status === 'FAIL') fails.push(item.label);
      if (item.status === 'WARN') warns.push(item.label);
    }
  }

  if (fails.length) {
    lines.push(`### Issues to fix (${fails.length})`);
    fails.forEach((f) => lines.push(`- ${f}`));
    lines.push('');
  }
  if (warns.length) {
    lines.push(`### Warnings (${warns.length})`);
    warns.forEach((w) => lines.push(`- ${w}`));
    lines.push('');
  }

  return lines.join('\n');
}

function scoreGrade(score) {
  if (score >= 90) return 'A — launch ready';
  if (score >= 75) return 'B — mostly ready';
  if (score >= 60) return 'C — needs work';
  if (score >= 40) return 'D — significant gaps';
  return 'F — not ready to launch';
}
