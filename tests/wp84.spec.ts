import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { CONTRACT_TOTAL_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP84 behaviors (owner answer 2026-10-24: keep "130,000+ learners trained" and "150,000+ enrollments", but say what the courseware share is; WP87 (owner decisions 2026-10-24) kept the total "150,000+" and changed the composition to the live counts, 112,926 direct and 40,152 courseware (25,125 + 15,027); the items below pin the WP87 figures; CLR review, Sonnet Max run 2, findings 1 and 2).
 * Retrospective coverage (the owner exempted this project from test-first work). Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp84.spec.ts --project=chromium`:
 * WP85 (owner update 2026-10-24: the government achieved 100% of Her Power's 25,125-trainee target) reworded the Her Power parts below; the items pin the WP85 wording:
 *   - 1: SC-02 (text and detail) calls the 40,152 "reached through CodersTrust curriculum and courseware", not "through CodersTrust courseware": the 25,125 women Her Power trained nationally with CodersTrust's curriculum plus UNDP FutureNation's
 *     15,027 course learners (25,125 + 15,027 = 40,152; 112,926 + 40,152 - 2,400 = 150,678); the headline figures are 130,000+ learners trained and 150,000+ enrollments; Investors prints the relabeled note and no page prints the old wording;
 *   - 2: the shared contract-scope note under the 30,000+ ends "Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people." on every page that prints it (Investors, Impact,
 *     Governments, JobReady Platform), tied to SC-02; Home's government slide, which words the contract scope itself, is unchanged;
 *   - 3: the Her Power case study reads "... reach is a separate measure: Her Power (DoICT, ICT Division) is a national program that trained 25,125 women ..., meeting its target." (one colon), from GV-01's text;
 *   - the changed regions fit at 1280 and 390 (nothing scrolls sideways).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const toInt = (s: string | undefined) => Number((s ?? '').replace(/[^\d]/g, ''));

/** Every built page (redirect stubs excluded) with its HTML. */
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The visible text of a built page (no scripts or styles), entities decoded. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );

// WP91 (triage A1): the detail's wording is the triage's ("came through", not "reached through"); the figures are unchanged.
const NEW_DETAIL = 'Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments.';
const OVERLAP = 'Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.';
const FULL_NOTE = `The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly). ${OVERLAP}`;
// WP86 (CLR run 3, Minor 2): Governments and the JobReady Platform print the first sentence alone (CONTRACT_TOTAL_NOTE_SHORT).
const SHORT_NOTE = 'The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).';

test.describe('WP84: the register says what the courseware share is', () => {
  test('SC-02’s text keeps "reached through CodersTrust curriculum and courseware" and names the two programs; its detail (WP91) says the 40,152 came through them', () => {
    const sc02 = fact('SC-02');
    expect(sc02.stat?.detail).toBe(NEW_DETAIL);
    // WP90: the register text keeps the full breakdown; only the detail is shortened
    expect(sc02.text).toBe('150,000+ enrollments since 2014 — 112,926 through direct training across 45 programs and 40,152 reached through CodersTrust curriculum and courseware (the 25,125 women Her Power trained nationally with CodersTrust’s curriculum, including the 2,400 CodersTrust also trained directly, and UNDP FutureNation’s 15,027 course learners)');
    expect(`${sc02.text} ${sc02.stat?.detail}`).not.toMatch(/4[01],\d{3} through CodersTrust courseware/);
  });

  test('the breakdown closes against the register: GV-01’s 25,125 plus SC-14’s 15,027 is the 40,152, and 112,926 plus 40,152 less the 2,400 counted twice is 150,678, which covers the 150,000+ (WP87)', () => {
    const detail = fact('SC-02').stat?.detail ?? '';
    // WP91 (triage A1): the detail reads "..., 112,926 were direct. Another 40,152 came through ..."
    const share = toInt(/Another ([\d,]+) came through/.exec(detail)?.[1]);
    const direct = toInt(/, ([\d,]+) were direct/.exec(detail)?.[1]);
    const herPower = toInt(fact('GV-01').stat?.value);
    const futureNation = fact('SC-14').stat?.numeric;
    expect(herPower).toBe(25125);
    expect(futureNation).toBe(15027);
    // WP90 (triage A1): the detail names Her Power's figure and UNDP FutureNation's figure, not the longer curriculum clause.
    expect(detail).toContain(`Her Power’s ${fact('GV-01').stat?.value} and UNDP FutureNation’s ${futureNation?.toLocaleString('en-US')}.`);
    expect(share).toBe(herPower + (futureNation ?? 0));
    expect(share).toBe(40152);
    expect(direct).toBe(112926);
    // WP87 (owner decisions 2026-10-24): Her Power's 2,400 directly trained women are inside the 25,125, so they are counted once; the de-duplicated total (the owner's sheet: 150,678) still covers the "150,000+"
    expect(direct + share - 2400).toBe(150678);
    expect(direct + share - 2400).toBeGreaterThanOrEqual(fact('SC-02').stat?.numeric ?? Number.NaN);
  });

  test('the headline figures: 130,000+ learners trained (SC-01, unchanged) and 150,000+ enrollments (SC-02, SC-16; WP87)', () => {
    expect(fact('SC-01').stat?.value).toBe('130,000+');
    expect(fact('SC-01').stat?.label).toBe('learners trained since 2014');
    expect(fact('SC-02').stat?.value).toBe('150,000+');
    expect(fact('SC-02').stat?.label).toBe('enrollments since 2014');
    expect(fact('SC-16').stat?.value).toBe('130,000+');
    expect(fact('SC-16').stat?.glance?.note).toBe('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
  });

  test('no built page prints the old wording, and every 40,152 on a built page is "reached through" or "came through CodersTrust curriculum and courseware"', () => {
    const old: string[] = [];
    const bare: string[] = [];
    const seen: string[] = [];
    for (const p of builtPages()) {
      const text = visible(p.html);
      if (/4[01],\d{3} through (?:CodersTrust )?courseware/.test(text) || /1[01]\d,\d{3} direct enrollments; 4[01],\d{3}/.test(text)) old.push(p.route);
      for (const m of text.matchAll(/40,152/g)) {
        seen.push(p.route);
        // WP91 (triage A1): the Investors detail says "came through"; every other 40,152 says "reached through"
        const around = text.slice(m.index ?? 0, (m.index ?? 0) + 80);
        if (!around.startsWith('40,152 reached through CodersTrust curriculum and courseware') && !around.startsWith('40,152 came through CodersTrust curriculum and courseware')) bare.push(`${p.route}: "${text.slice(m.index ?? 0, (m.index ?? 0) + 80)}"`);
      }
    }
    expect(old).toEqual([]);
    expect(bare).toEqual([]);
    expect([...new Set(seen)]).toEqual(['/partner-with-us/investors/']);
  });
});

test.describe('WP84: Investors', () => {
  test.use({ viewport: DESKTOP });

  test('A Record Built Since 2014 keeps the 130,000+ and 150,000+ tiles and prints the relabeled note, tied to SC-02, SC-03, GV-01 and SC-14', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const tiles = compact(await page.locator('#guide .ig__tiles').textContent());
    expect(tiles).toContain('130,000+');
    expect(tiles).toContain('150,000+');
    const notes = page.locator('#guide .ig__notes');
    await expect(notes).toHaveText(`${NEW_DETAIL} Most delivery has been in Bangladesh.`);
    expect(await notes.getAttribute('data-fact')).toBe('SC-02 SC-03 GV-01 SC-14');
  });

  test('Beyond Delivered Reach: the 30,000+ tile’s note says the 25,125 is the same group already counted in the 150,000+ enrollments', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const tile = page.locator('#reach .ir__tile');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.textContent())).toContain('30,000+');
    const note = tile.locator('.ir__note');
    // WP94 (triage A4): Investors ends with the pointer sentence, not the full overlap sentence.
    await expect(note).toHaveText(FULL_NOTE.replace(OVERLAP, 'Her Power’s 25,125 are already counted in the 150,000+ enrollments above, not additional people.'));
    expect(await note.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-02');
  });
});

test.describe('WP84: the shared contract-scope note', () => {
  test('CONTRACT_TOTAL_NOTE ends with the overlap sentence, reads the 25,125 from GV-01 and the 150,000+ from SC-02, and cites SC-02', () => {
    expect(CONTRACT_TOTAL_NOTE.text).toBe(FULL_NOTE);
    expect(CONTRACT_TOTAL_NOTE.facts).toEqual(['GV-12', 'GV-01', 'GV-11', 'SC-02']);
    expect(CONTRACT_TOTAL_NOTE.text).toContain(`Her Power’s ${fact('GV-01').stat?.value} is the same group counted in the ${fact('SC-02').stat?.value} enrollments through CodersTrust’s curriculum`);
  });

  test('every page that prints the overlap sentence prints the whole note (Impact); Investors words it as a pointer back (WP94); no other page words it', () => {
    const pages = builtPages().filter((p) => visible(p.html).includes(OVERLAP)).map((p) => p.route).sort();
    expect(pages).toEqual(['/impact/']);
    for (const p of builtPages().filter((q) => pages.includes(q.route))) expect(visible(p.html), p.route).toContain(FULL_NOTE);
    const investors = builtPages().find((q) => q.route === '/partner-with-us/investors/');
    expect(visible(investors?.html ?? ''), 'investors').toContain('Her Power’s 25,125 are already counted in the 150,000+ enrollments above, not additional people.');
  });

  test('Impact prints the whole note tied to SC-02; Governments and JobReady Platform print the first sentence, tied to their own facts', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'impact/');
    const tile = page.locator('#glance [data-fact~="GV-12"]').first();
    expect(compact(await tile.textContent())).toContain(FULL_NOTE);
    expect((await tile.getAttribute('data-fact')) ?? '').toContain('SC-02');
    await open(page, 'partner-with-us/governments/');
    const gov = page.locator('#glance li', { hasText: '30,000+' });
    expect(compact(await gov.locator('.pg__note').textContent())).toBe(SHORT_NOTE);
    expect(await gov.locator('a.pg__tile').getAttribute('data-fact')).toBe('GV-12 SC-06 GV-01 GV-11');
    await open(page, 'our-model/jobready-platform/');
    const jr = page.locator('#why .jr__whynote');
    expect(compact(await jr.textContent())).toBe(SHORT_NOTE);
    expect(await jr.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11');
  });

  test('Home’s government slide is unchanged: its own contract-scope sentences, no overlap sentence, data-fact still GV-12 GV-01 GV-11 SC-04', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    const lead = page.locator('[data-hs-slide]').nth(1).locator('.hs__lead');
    expect(compact(await lead.textContent())).toContain('Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly.');
    expect(compact(await lead.textContent())).not.toContain('same group counted');
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
  });
});

test.describe('WP84: the Her Power case study sentence has one colon', () => {
  test('GV-01 reads "Her Power (DoICT, ICT Division) is a national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target"', () => {
    expect(fact('GV-01').text).toBe('Her Power (DoICT, ICT Division) is a national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target');
    expect(fact('GV-01').stat?.value).toBe('25,125');
  });

  test('"The national program’s reach is a separate measure: Her Power (DoICT, ICT Division) is a national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target. The 2,400 women CodersTrust trained directly are among them."', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'impact/case-studies/her-power/');
    const para = compact(await page.locator('.hp__scale p').textContent());
    expect(para).toBe(
      'The in-work figure above covers 800 tracked women from the 2,400 that CodersTrust trained directly. The national program’s reach is a separate measure: Her Power (DoICT, ICT Division) is a national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target. The 2,400 women CodersTrust trained directly are among them.',
    );
    expect(para.split(':').length - 1, 'one colon in the paragraph').toBe(1);
    expect(await page.locator('.hp__scale').getAttribute('data-fact')).toBe('GV-01');
  });

  test('the old "(DoICT, ICT Division): a national program" wording is on no built page', () => {
    expect(builtPages().filter((p) => visible(p.html).includes('(DoICT, ICT Division): a national program')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('WP84: the changed regions fit', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px nothing scrolls sideways and the notes stay inside the viewport (Investors, Impact, Governments, JobReady Platform, Her Power)`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['partner-with-us/investors/', 'impact/', 'partner-with-us/governments/', 'our-model/jobready-platform/', 'impact/case-studies/her-power/']) {
        await open(page, route);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
      await open(page, 'partner-with-us/investors/');
      for (const sel of ['#guide .ig__notes', '#reach .ir__note']) {
        const box = await page.locator(sel).boundingBox();
        expect(box, sel).not.toBeNull();
        expect(box!.x, `${sel} left edge`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${sel} right edge at ${vp.width}px`).toBeLessThanOrEqual(vp.width);
      }
    });
  }
});
