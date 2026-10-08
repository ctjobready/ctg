import { expect, test } from '@playwright/test';
import { locations } from '../src/data/countries';
import { DESKTOP, MOBILE, attachJson, open, vpLabel } from './support/browser';
import { hoverReachablePin, mapEquivalenceGaps, readMapModel, type MapModel } from './support/map';
import { pagesWithMarkup } from './support/pages';

/**
 * Map equivalence (R2-M14; planning doc 07 §9, doc 10 §1) on every page that renders the world map (found in dist/, not
 * hard-coded; today /impact/global-reach/ and /styleguide/):
 *   - every detail any pin or tooltip exposes (label, years, target group, skills, funder, note) is present in the
 *     always-visible location table, in the matching column;
 *   - the pins are aria-hidden, carry no tabindex or role, are not focus targets (real Tab walk) and are absent from the
 *     accessibility tree;
 *   - the table is visible without JavaScript, at phone and desktop widths.
 */

const mapPages = pagesWithMarkup(/class="wmap[ "]/);

test('a page renders the world map', () => {
  expect(mapPages.length, 'pages in dist/ that contain the world map').toBeGreaterThan(0);
  expect(
    mapPages.map((p) => p.route),
    'the global reach page renders the map',
  ).toContain('/impact/global-reach/');
});

/** Control: the comparison must catch a detail that is missing from the table, otherwise a pass proves nothing. */
test('equivalence check detects a missing detail (control)', () => {
  const model: MapModel = {
    headers: ['location', 'years', 'target group', 'skills', 'funder / note'],
    pins: [{ name: 'Kosovo', years: '2016–2017', fields: [{ label: 'Skills', value: 'Coding' }, { label: 'Funder', value: 'World Bank Group' }, { label: 'Hover colour', value: 'blue' }] }],
    rows: [{ location: 'Kosovo', cells: { location: 'Kosovo', years: '2016–2017', 'target group': 'x', skills: 'Coding', 'funder / note': 'Women in Online Work pilot' }, text: '' }],
  };
  const gaps = mapEquivalenceGaps(model);
  expect(gaps.some((g) => g.includes('World Bank Group')), `funder gap reported: ${gaps.join(' | ')}`).toBe(true);
  expect(gaps.some((g) => g.includes('Hover colour')), 'unknown tooltip field reported').toBe(true);
  expect(mapEquivalenceGaps({ ...model, pins: [{ name: 'Kosovo', years: '2016–2017', fields: [{ label: 'Skills', value: 'Coding' }] }] })).toEqual([]);
});

for (const mp of mapPages) {
  test.describe(`map on ${mp.route}`, () => {
    test.use({ viewport: DESKTOP });

    test('every pin detail is present in the location table', async ({ page }, testInfo) => {
      await open(page, mp);
      const model = await page.evaluate(readMapModel);
      await attachJson(testInfo, 'map', { route: mp.route, pins: model.pins.length, rows: model.rows.length });
      expect(mapEquivalenceGaps(model), 'tooltip details missing from the location table').toEqual([]);
    });

    test('the table carries every location in the source data', async ({ page }) => {
      await open(page, mp);
      const model = await page.evaluate(readMapModel);
      const gaps: string[] = [];
      expect(model.rows.length, 'table rows').toBe(locations.length);
      for (const l of locations) {
        const row = model.rows.find((r) => r.location === l.name);
        if (!row) {
          gaps.push(`${l.name}: no row`);
          continue;
        }
        const text = Object.values(row.cells).join(' | ');
        for (const [field, value] of Object.entries({ years: l.years, targetGroup: l.targetGroup, skills: l.skills, funder: l.funder, note: l.note, region: l.region })) {
          if (value && !(text + ' ' + row.text).includes(value)) gaps.push(`${l.name}: ${field} "${value}" missing from the row`);
        }
      }
      expect(gaps).toEqual([]);
    });

    test('pins are aria-hidden, carry no tabindex or role, and are not in the accessibility tree', async ({ page }) => {
      await open(page, mp);
      const info = await page.evaluate(() => {
        const describe = (el: Element) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : ''}`;
        const pins = Array.from(document.querySelectorAll<HTMLElement>('.wmap__pins > li'));
        const inside = Array.from(document.querySelectorAll<HTMLElement>('.wmap__pins > li, .wmap__pins > li *'));
        const focusable = 'a[href],button,input,select,textarea,summary,iframe,[contenteditable],area[href]';
        return {
          pins: pins.length,
          notAriaHidden: pins.filter((li) => li.getAttribute('aria-hidden') !== 'true').map(describe),
          withTabindex: inside.filter((el) => el.hasAttribute('tabindex')).map(describe),
          withRole: inside.filter((el) => el.hasAttribute('role')).map(describe),
          nativelyFocusable: inside.filter((el) => el.matches(focusable)).map(describe),
          tabIndexProperty: inside.filter((el) => el.tabIndex >= 0).map(describe),
          svgRole: document.querySelector('.wmap__svg')?.getAttribute('role'),
          svgLabel: document.querySelector('.wmap__svg')?.getAttribute('aria-label') ?? '',
        };
      });
      expect(info.pins, 'pins').toBeGreaterThan(0);
      expect.soft(info.notAriaHidden, 'pins without aria-hidden="true"').toEqual([]);
      expect.soft(info.withTabindex, 'pin elements with a tabindex attribute').toEqual([]);
      expect.soft(info.withRole, 'pin elements with a role').toEqual([]);
      expect.soft(info.nativelyFocusable, 'focusable elements inside pins').toEqual([]);
      expect.soft(info.tabIndexProperty, 'pin elements with tabIndex >= 0').toEqual([]);
      expect.soft(info.svgRole, 'the SVG is exposed as one image').toBe('img');
      expect.soft(info.svgLabel, 'the SVG label points to the table').toMatch(/table/i);

      // Accessibility tree: no pin is exposed as a list item, link, button or text, even while a tooltip is showing
      // (the tooltips are visibility:hidden until hovered, so the snapshot is taken with one of them open).
      const pinsLocator = page.locator('.wmap__pins');
      await expect(pinsLocator.getByRole('listitem'), 'list items exposed by pins').toHaveCount(0);
      await expect(pinsLocator.getByRole('link'), 'links exposed by pins').toHaveCount(0);
      await expect(pinsLocator.getByRole('button'), 'buttons exposed by pins').toHaveCount(0);
      await hoverReachablePin(page, 'first');
      const snapshot = await pinsLocator.ariaSnapshot();
      expect(snapshot.trim(), 'accessibility snapshot of the pins container while a tooltip is visible').toBe('');
      // The table, in contrast, is exposed with one row per location plus the header row.
      await expect(page.locator('.wmap').getByRole('table'), 'accessible tables in the map figure').toHaveCount(1);
      await expect(page.locator('.wmap').getByRole('row'), 'accessible table rows').toHaveCount(locations.length + 1);
    });

    test('keyboard Tab never lands on a pin, and reaches the table region when it scrolls', async ({ page }) => {
      await open(page, mp);
      await page.evaluate(() => {
        const figure = document.querySelector('.wmap')!;
        const sentinel = document.createElement('span');
        sentinel.id = 'qa-before-map';
        sentinel.tabIndex = -1;
        figure.before(sentinel);
        sentinel.focus();
      });
      const visited: { inPins: boolean; inFigure: boolean; after: boolean; el: string }[] = [];
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const a = document.activeElement;
          const figure = document.querySelector('.wmap')!;
          return {
            inPins: !!a?.closest('.wmap__pins, .wmap__svg'),
            inFigure: !!a && figure.contains(a),
            after: !!a && !figure.contains(a) && !!(figure.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING),
            el: a ? `${a.tagName.toLowerCase()}${typeof a.className === 'string' && a.className ? `.${a.className.trim().split(/\s+/)[0]}` : ''}` : '(none)',
          };
        });
        visited.push(stop);
        if (stop.after) break;
      }
      expect(visited.filter((v) => v.inPins).map((v) => v.el), 'Tab stops on pins or the SVG').toEqual([]);
      // tablestack.ts gives the table wrapper a tab stop only while it scrolls sideways (a table that fits adds an empty stop);
      // when it does scroll, keyboard users must be able to reach it.
      const scrolls = await page.evaluate(() => {
        const wrapper = document.querySelector<HTMLElement>('.wmap__table')!;
        return wrapper.scrollWidth > wrapper.clientWidth + 1;
      });
      if (scrolls) {
        expect(visited.some((v) => v.inFigure && v.el.includes('wmap__table')), `the scrolling table region is a Tab stop (stops: ${visited.map((v) => v.el).join(', ')})`).toBe(true);
      }
      expect(visited.some((v) => v.after), 'focus moves past the map').toBe(true);
    });
  });

  test.describe(`map on ${mp.route} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });
    for (const vp of [MOBILE, DESKTOP]) {
      test(`the location table is visible and equivalent ${vpLabel(vp)}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await open(page, mp);
        const table = page.locator('.wmap__table table');
        await expect(table, 'location table').toBeVisible();
        const rows = page.locator('.wmap__table tbody tr');
        expect(await rows.count(), 'rows').toBe(locations.length);
        for (let i = 0; i < locations.length; i++) await expect(rows.nth(i), `row ${i + 1}`).toBeVisible();
        const model = await page.evaluate(readMapModel);
        expect(mapEquivalenceGaps(model), 'tooltip details missing from the table (JS off)').toEqual([]);
      });
    }
  });
}
