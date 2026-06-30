const STATUS_ICON = { PASS: '✅', FAIL: '❌', WARN: '⚠️' };

export function toMarkdown(result) {
  const grade = scoreGrade(result.score);
  const lines = [
    `# VibecodeCheck`,
    `**URL:** ${result.url}`,
    `**Scanned:** ${new Date(result.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST`,
    ``,
    `## Score: ${result.score}/100 — ${grade.label}`,
    ``,
    `| Category | Score | Max |`,
    `|---|---|---|`,
  ];

  for (const [, cat] of Object.entries(result.categories)) {
    lines.push(`| ${cat.label} | ${cat.score ?? 0} | ${cat.maxScore} |`);
  }

  lines.push('');

  for (const [, cat] of Object.entries(result.categories)) {
    lines.push(`### ${cat.label} (${cat.score ?? 0}/${cat.maxScore})`);
    if (cat.error) lines.push(`> Error: ${cat.error}`);
    for (const item of cat.items ?? []) {
      lines.push(`${STATUS_ICON[item.status] ?? '•'} ${item.label}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*VibecodeCheck — MIT open-source. No AI layer used in this scan. npx --yes --package=@veris.works/vibecodecheck vibecodecheck*`);

  return lines.join('\n');
}

export function toConsole(result) {
  const grade = scoreGrade(result.score);
  const lines = [
    '',
    `  VibecodeCheck`,
    `  ${result.url}`,
    '',
    `  Score: ${result.score}/100  ${grade.label}`,
    '',
  ];

  for (const [, cat] of Object.entries(result.categories)) {
    const pct = Math.round(((cat.score ?? 0) / cat.maxScore) * 100);
    const filled = Math.max(0, Math.min(10, Math.round(pct / 10)));
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    lines.push(`  ${cat.label.padEnd(24)} ${bar} ${cat.score ?? 0}/${cat.maxScore}`);
  }

  lines.push('');

  const fails = [];
  const warns = [];
  for (const [, cat] of Object.entries(result.categories)) {
    for (const item of cat.items ?? []) {
      if (item.status === 'FAIL') fails.push(item.label);
      if (item.status === 'WARN') warns.push(item.label);
    }
  }

  if (fails.length) {
    lines.push(`  ❌ Issues (${fails.length})`);
    fails.slice(0, 10).forEach((f) => lines.push(`     • ${f}`));
    lines.push('');
  }
  if (warns.length) {
    lines.push(`  ⚠️  Warnings (${warns.length})`);
    warns.slice(0, 5).forEach((w) => lines.push(`     • ${w}`));
    lines.push('');
  }

  return lines.join('\n');
}

function scoreGrade(score) {
  if (score >= 90) return { label: 'A — launch ready' };
  if (score >= 75) return { label: 'B — mostly ready' };
  if (score >= 60) return { label: 'C — needs work' };
  if (score >= 40) return { label: 'D — significant gaps' };
  return { label: 'F — not ready to launch' };
}
