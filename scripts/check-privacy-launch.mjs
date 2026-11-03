#!/usr/bin/env node
/**
 * Privacy launch gate (WP161-A; adversarial review of 2 November 2026, B-4, owner answer: the legal-basis sentence now, the other two at cutover).
 *
 * The built /privacy-policy/ must state, before the site goes live:
 *   · an email retention period: one sentence that names emails or inquiries, says they are kept, stored, retained or deleted, and gives a
 *     period with its unit ("Inquiry emails are kept for 12 months and then deleted.");
 *   · an international-transfer sentence: one sentence that says where data is processed, stored or hosted, or that it is transferred, and names
 *     a place or says the data leaves the visitor's country ("The host’s servers are in the United States; if you visit from elsewhere, your IP
 *     address is processed there.").
 * Both depend on facts the owner supplies at cutover (the mail provider and its retention, register confirm #30; the host's server location), so
 * this check runs only in the cutover gate `edge-release` (scripts/run-gate.mjs), never in `build` or `production-release`, which stay green until then.
 *
 *   node scripts/check-privacy-launch.mjs [--dist dist]
 *
 * Exit 0 when both statements are present, 1 when either is missing (each missing one is named), 2 when the page is not in the build.
 * The page's <main> text is read sentence by sentence (block elements separate sentences), so a period in one paragraph and the word "email"
 * in another never add up to a statement.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { REPO_ROOT, first, parseArgs, parseHtml, visibleText } from './lib/dist.mjs';

const NUMBER = String.raw`(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eighteen|twenty(?:-four)?|thirty(?:-six)?)`;
const PERIOD = new RegExp(String.raw`\b${NUMBER}[\s-]+(?:day|week|month|year)s?\b`, 'i');
const EMAIL = /\b(?:e-?mails?|inquir(?:y|ies)|messages?)\b/i;
const KEPT = /\b(?:keep|keeps|kept|retain|retains|retained|store|stores|stored|hold|holds|held|delete|deletes|deleted|erase|erased)\b/i;
const WHERE = /\b(?:processed|stored|hosted|located|transferred|transfers?|servers?)\b/i;
const PLACE = /\b(?:outside (?:your|the|of)|another country|other countries|internationally|abroad|cross-border|United States|European Union|European Economic Area|EEA|United Kingdom)\b|\bU\.S\./i;

/** The policy's sentences: <main> text, one block per line, each line split after a full stop, question mark or exclamation mark. */
export function sentences(html) {
  const doc = parseHtml(html);
  const { text } = visibleText(first(doc, 'main') ?? doc);
  return text.split('\n').flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z“"])/)).map((s) => s.trim()).filter(Boolean);
}
export const retentionSentence = (list) => list.find((s) => EMAIL.test(s) && KEPT.test(s) && PERIOD.test(s));
export const transferSentence = (list) => list.find((s) => WHERE.test(s) && PLACE.test(s));

const { opts } = parseArgs(process.argv.slice(2));
const dist = resolve(typeof opts.dist === 'string' ? opts.dist : process.env.DIST_DIR || join(REPO_ROOT, 'dist'));
const file = join(dist, 'privacy-policy', 'index.html');
if (!existsSync(file)) {
  console.error(`check-privacy-launch: ${file} is not in the build; run the build first.`);
  process.exit(2);
}
const list = sentences(readFileSync(file, 'utf8'));
const retention = retentionSentence(list);
const transfer = transferSentence(list);
console.log(`check-privacy-launch: /privacy-policy/ read (${list.length} sentences)`);
console.log(retention ? `  ok   email retention period: "${retention}"` : '  FAIL email retention period: no sentence says how long inquiry emails are kept (for example "Inquiry emails are kept for N months and then deleted.")');
console.log(transfer ? `  ok   international transfer: "${transfer}"` : '  FAIL international transfer: no sentence says where visitor data is processed or that it leaves the visitor’s country (for example "The host’s servers are in the United States; …")');
if (!retention || !transfer) {
  console.log('check-privacy-launch: FAILED — the Privacy Policy is not ready for launch (the owner supplies both facts at cutover; src/pages/privacy-policy/index.astro)');
  process.exit(1);
}
console.log('check-privacy-launch: OK — both launch statements are in the Privacy Policy');
