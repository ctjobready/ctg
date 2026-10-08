import { expect, type Page } from '@playwright/test';

/**
 * Move the real mouse onto the first or last pin the pointer can actually reach (the pins of Bangladesh, Bhutan and India
 * overlap, so a pin's centre may hit-test to a neighbour) and wait for its tooltip. The coordinates come from one
 * evaluate() right after scrolling the map into view, so nothing can move between the measurement and the hover.
 */
export async function hoverReachablePin(page: Page, which: 'first' | 'last'): Promise<{ cardId: string; reachablePins: number }> {
  await page.locator('.wmap__stage').scrollIntoViewIfNeeded();
  const found = await page.evaluate((w) => {
    const hits = Array.from(document.querySelectorAll<HTMLElement>('.wmap__pins > li'))
      .map((li) => {
        const r = li.querySelector<HTMLElement>('.wmap__pin')!.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return hit && li.contains(hit) ? { x, y, cardId: li.querySelector('.wmap__card')?.id ?? '' } : null;
      })
      .filter((h): h is { x: number; y: number; cardId: string } => h !== null);
    return { target: w === 'first' ? hits[0] : hits[hits.length - 1], count: hits.length };
  }, which);
  expect(found.target, 'a pin the pointer can reach').toBeDefined();
  const target = found.target!;
  await page.mouse.move(target.x, target.y);
  await expect(page.locator(`#${target.cardId}`), 'tooltip of the hovered pin').toBeVisible();
  return { cardId: target.cardId, reachablePins: found.count };
}

/**
 * World-map equivalence contract (R2-M14, planning doc 07 §9, doc 10 §1): every detail a pin or its tooltip exposes must be
 * present in the always-visible location table. The model below is read from the DOM (pins, tooltips, table), so the check
 * does not depend on how the page was generated.
 */

export interface PinModel {
  name: string;
  years: string;
  fields: { label: string; value: string }[];
}
export interface RowModel {
  location: string;
  /** Cell text per column, keyed by the column heading (lower case). */
  cells: Record<string, string>;
  text: string;
}
export interface MapModel {
  pins: PinModel[];
  rows: RowModel[];
  headers: string[];
}

/** Read pins, tooltips and the location table (self-contained: runs in the page). */
export function readMapModel(): MapModel {
  const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
  const headers = Array.from(document.querySelectorAll('.wmap__table thead th')).map((th) => norm(th.textContent).toLowerCase());
  const pins = Array.from(document.querySelectorAll('.wmap__pins > li')).map((li) => {
    const country = li.querySelector('.wmap__country');
    const name = norm(country?.childNodes[0]?.textContent);
    const years = norm(country?.querySelector('span')?.textContent);
    const fields = Array.from(li.querySelectorAll('.wmap__card dl > dt')).map((dt) => ({
      label: norm(dt.textContent),
      value: norm(dt.nextElementSibling?.textContent),
    }));
    return { name, years, fields };
  });
  const rows = Array.from(document.querySelectorAll('.wmap__table tbody tr')).map((tr) => {
    const th = tr.querySelector('th');
    const cells: Record<string, string> = {};
    cells[headers[0] ?? 'location'] = norm(th?.childNodes[0]?.textContent);
    Array.from(tr.querySelectorAll('td')).forEach((td, i) => {
      cells[headers[i + 1] ?? `col${i + 1}`] = norm(td.textContent);
    });
    return { location: norm(th?.childNodes[0]?.textContent), cells, text: norm(tr.textContent) };
  });
  return { pins, rows, headers };
}

/** Details of the tooltip that the table does not carry (empty list = equivalent). */
export function mapEquivalenceGaps(model: MapModel): string[] {
  const gaps: string[] = [];
  const { pins, rows, headers } = model;
  if (pins.length === 0) gaps.push('the map has no pins');
  if (rows.length === 0) gaps.push('the location table has no rows');
  if (pins.length !== rows.length) gaps.push(`pins (${pins.length}) and table rows (${rows.length}) differ in number`);
  const columnFor = (label: string): string | undefined => headers.find((h) => h.includes(label.toLowerCase()));
  for (const pin of pins) {
    const row = rows.find((r) => r.location === pin.name);
    if (!pin.name) {
      gaps.push('a pin tooltip has no location name');
      continue;
    }
    if (!row) {
      gaps.push(`${pin.name}: no table row with this location`);
      continue;
    }
    const yearsColumn = columnFor('years');
    if (pin.years && !(yearsColumn && row.cells[yearsColumn]?.includes(pin.years))) {
      gaps.push(`${pin.name}: years "${pin.years}" missing from the table`);
    }
    for (const f of pin.fields) {
      // The value must be in the row. When a column is named like the tooltip label it must be in that column; a label that
      // has no column of its own (for example tooltip "Note" under a "Partner / note" heading) only needs its value in the row.
      const column = columnFor(f.label);
      if (column) {
        if (!row.cells[column]?.includes(f.value)) gaps.push(`${pin.name}: ${f.label} "${f.value}" missing from the "${column}" cell ("${row.cells[column] ?? ''}")`);
      } else if (!row.text.includes(f.value)) {
        gaps.push(`${pin.name}: ${f.label} "${f.value}" missing from the table row (columns: ${headers.join(' | ')})`);
      }
    }
  }
  return gaps;
}
