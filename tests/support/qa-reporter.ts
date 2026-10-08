import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { QA_DIR } from './env';
import { inventory } from './pages';

/**
 * Collects the JSON attachments the specs name "qa:<kind>" and writes the QA artifacts into .work/qa/:
 *   a11y-summary.json / a11y-summary.md   axe results grouped by rule and by page
 *   failures.json / failures.md           every failing check with its message
 *   notes.json                            non-failing observations (console warnings, partly covered focus targets, ...)
 *   run-summary.json                      counts, duration, page inventory
 */

interface A11yNode {
  target: string;
  html: string;
  summary: string;
}
interface A11yViolation {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: A11yNode[];
}
interface A11yEntry {
  project: string;
  route: string;
  viewport: string;
  state?: string;
  violations: A11yViolation[];
  incomplete: { id: string; nodes: number }[];
  passes: number;
  axeVersion?: string;
}
interface Failure {
  project: string;
  file: string;
  title: string;
  status: string;
  message: string;
}

const ansi = /\u001b\[[0-9;]*m/g;
const clean = (text: string | undefined): string => (text ?? '').replace(ansi, '').trim();
const oneLine = (text: string, max = 160): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

export default class QaReporter implements Reporter {
  private readonly a11y: A11yEntry[] = [];
  private readonly failures: Failure[] = [];
  private readonly notes: Record<string, unknown[]> = {};
  private readonly counts = { passed: 0, failed: 0, skipped: 0, timedOut: 0, interrupted: 0 };
  private readonly started = Date.now();
  private total = 0;
  private workers = 0;

  onBegin(config: FullConfig, suite: Suite): void {
    this.total = suite.allTests().length;
    this.workers = config.workers;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? 'unknown';
    for (const attachment of result.attachments) {
      if (!attachment.name.startsWith('qa:') || !attachment.body) continue;
      const kind = attachment.name.slice(3);
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(attachment.body.toString('utf8')) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (kind === 'a11y') this.a11y.push({ project, ...(data as unknown as Omit<A11yEntry, 'project'>) });
      else (this.notes[kind] ??= []).push({ project, test: test.titlePath().slice(3).join(' › '), ...data });
    }
    switch (result.status) {
      case 'passed':
        this.counts.passed++;
        break;
      case 'skipped':
        this.counts.skipped++;
        break;
      case 'timedOut':
        this.counts.timedOut++;
        break;
      case 'interrupted':
        this.counts.interrupted++;
        break;
      default:
        this.counts.failed++;
    }
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.failures.push({
        project,
        file: test.location.file.split('/tests/').pop() ?? test.location.file,
        title: test.titlePath().slice(3).join(' › '),
        status: result.status,
        // Soft assertions produce several errors per test: keep each one's head (first 12 lines), up to six of them.
        message: (result.errors.length ? result.errors : result.error ? [result.error] : [])
          .slice(0, 6)
          .map((e) => clean(e.message).split('\n').slice(0, 12).join('\n'))
          .join('\n---\n'),
      });
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    // `playwright test --list` (or a run that filtered everything out) must not overwrite earlier artifacts.
    if (this.counts.passed + this.counts.failed + this.counts.timedOut + this.counts.interrupted === 0) return;
    mkdirSync(QA_DIR, { recursive: true });
    const durationMs = Date.now() - this.started;
    this.writeA11y();
    this.writeFailures();
    if (Object.keys(this.notes).length) writeFileSync(join(QA_DIR, 'notes.json'), JSON.stringify(this.notes, null, 2));
    let inv: { pages: number; stubsSkipped: number } | undefined;
    try {
      const i = inventory();
      inv = { pages: i.pages.length, stubsSkipped: i.stubs.length };
    } catch {
      /* no dist/ — nothing to report */
    }
    writeFileSync(
      join(QA_DIR, 'run-summary.json'),
      JSON.stringify(
        { status: result.status, startedAt: new Date(this.started).toISOString(), durationSeconds: Math.round(durationMs / 1000), workers: this.workers, tests: this.total, ...this.counts, inventory: inv },
        null,
        2,
      ),
    );
    // eslint-disable-next-line no-console
    console.log(`\nQA artifacts written to ${QA_DIR} (a11y-summary.md, failures.md, run-summary.json)`);
  }

  private writeA11y(): void {
    if (!this.a11y.length) return;
    const entries = [...this.a11y].sort((a, b) => a.route.localeCompare(b.route) || a.viewport.localeCompare(b.viewport));
    const rules = new Map<string, { v: A11yViolation; hits: { entry: A11yEntry; nodes: A11yNode[] }[]; nodeCount: number }>();
    for (const entry of entries) {
      for (const v of entry.violations) {
        const slot = rules.get(v.id) ?? { v, hits: [], nodeCount: 0 };
        slot.hits.push({ entry, nodes: v.nodes });
        slot.nodeCount += v.nodes.length;
        rules.set(v.id, slot);
      }
    }
    const byRule = [...rules.values()]
      .sort((a, b) => b.nodeCount - a.nodeCount)
      .map(({ v, hits, nodeCount }) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags,
        nodeCount,
        pageCount: new Set(hits.map((h) => h.entry.route)).size,
        occurrences: hits.map((h) => ({ route: h.entry.route, viewport: h.entry.viewport, state: h.entry.state, nodes: h.nodes })),
      }));
    const pagesWithViolations = new Set(entries.filter((e) => e.violations.length).map((e) => e.route));
    const incomplete = new Map<string, { nodes: number; pages: Set<string> }>();
    for (const e of entries) {
      for (const i of e.incomplete) {
        const slot = incomplete.get(i.id) ?? { nodes: 0, pages: new Set<string>() };
        slot.nodes += i.nodes;
        slot.pages.add(e.route);
        incomplete.set(i.id, slot);
      }
    }
    const summary = {
      generatedAt: new Date().toISOString(),
      axeVersion: entries[0]?.axeVersion,
      checks: entries.length,
      pagesChecked: new Set(entries.map((e) => e.route)).size,
      checksWithViolations: entries.filter((e) => e.violations.length).length,
      pagesWithViolations: pagesWithViolations.size,
      violatedRules: byRule.length,
      violatingNodes: byRule.reduce((n, r) => n + r.nodeCount, 0),
      byRule,
      needsReview: [...incomplete.entries()].map(([id, s]) => ({ id, nodes: s.nodes, pages: s.pages.size })).sort((a, b) => b.nodes - a.nodes),
      entries: entries.map((e) => ({ route: e.route, viewport: e.viewport, state: e.state, violations: e.violations.length, passes: e.passes })),
    };
    writeFileSync(join(QA_DIR, 'a11y-summary.json'), JSON.stringify(summary, null, 2));

    const md: string[] = [];
    md.push('# Accessibility summary (axe-core, WCAG 2.0/2.1/2.2 A + AA)', '');
    md.push(`Generated ${summary.generatedAt}. axe-core ${summary.axeVersion ?? '?'}. Tags: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa. No rules disabled.`, '');
    md.push(`- Checks run: **${summary.checks}** across **${summary.pagesChecked}** pages`);
    md.push(`- Checks with violations: **${summary.checksWithViolations}** (pages affected: ${summary.pagesWithViolations})`);
    md.push(`- Violated rules: **${summary.violatedRules}**, violating nodes: **${summary.violatingNodes}**`, '');
    if (!byRule.length) md.push('**0 violations.**', '');
    if (byRule.length) {
      md.push('## By rule', '');
      for (const r of byRule) {
        md.push(`### \`${r.id}\` (${r.impact ?? 'n/a'}) — ${r.nodeCount} nodes on ${r.pageCount} pages`, '');
        md.push(`${r.help} — [rule docs](${r.helpUrl}); tags: ${r.tags.join(', ')}`, '');
        md.push('| Page | Viewport | Nodes | Elements (first 3) |', '|---|---|---:|---|');
        for (const o of r.occurrences) {
          const first = o.nodes.slice(0, 3).map((n) => `\`${oneLine(n.target, 90)}\``).join('<br>');
          md.push(`| ${o.route}${o.state ? ` (${o.state})` : ''} | ${o.viewport} | ${o.nodes.length} | ${first} |`);
        }
        const sample = byRule.find((x) => x.id === r.id)?.occurrences[0]?.nodes[0];
        if (sample) md.push('', `Example: \`${oneLine(sample.html, 200)}\` — ${oneLine(sample.summary.split('\n').slice(1).join(' '), 220)}`);
        md.push('');
      }
      md.push('## By page', '', '| Page | State | Viewport | Violations |', '|---|---|---|---|');
      for (const e of entries.filter((x) => x.violations.length)) {
        md.push(`| ${e.route} | ${e.state ?? 'static'} | ${e.viewport} | ${e.violations.map((v) => `${v.id} ×${v.nodes.length}`).join(', ')} |`);
      }
      md.push('');
    }
    if (summary.needsReview.length) {
      md.push('## Needs manual review (axe "incomplete", not failures)', '', '| Rule | Nodes | Pages |', '|---|---:|---:|');
      for (const i of summary.needsReview) md.push(`| ${i.id} | ${i.nodes} | ${i.pages} |`);
      md.push('');
    }
    writeFileSync(join(QA_DIR, 'a11y-summary.md'), md.join('\n'));
  }

  private writeFailures(): void {
    writeFileSync(join(QA_DIR, 'failures.json'), JSON.stringify(this.failures, null, 2));
    const md: string[] = ['# Failing checks', '', `Total: **${this.failures.length}**`, ''];
    const byFile = new Map<string, Failure[]>();
    for (const f of this.failures) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
    for (const [file, list] of byFile) {
      md.push(`## ${file} (${list.length})`, '');
      for (const f of list) {
        md.push(`### [${f.project}] ${f.title}`, '', '```', f.message || '(no message)', '```', '');
      }
    }
    writeFileSync(join(QA_DIR, 'failures.md'), md.join('\n'));
  }
}
