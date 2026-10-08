import type { Page } from '@playwright/test';

/**
 * Probes for the "focus not obscured" check (WCAG 2.2 SC 2.4.11, planning doc 10 §3, doc 07 §9).
 * `probeFocus` runs inside the page (page.evaluate), so it is self-contained.
 *
 * "Obscured" means: a sample point of the focused element that lies inside the viewport is hit-tested to an element that
 * belongs to sticky or fixed UI (the header, the PromoBar if it ever sticks, the mobile CTA bar, the back-to-top
 * button, a toast, a sticky table header or column) and is not the focused element or one of its descendants.
 * Sample points are the centre of the visible part of the element plus its four corners (inset 2px).
 *   - centre covered by sticky/fixed UI            -> FAIL (kind "obscured")
 *   - element has no part inside the viewport      -> FAIL (kind "offscreen")
 *   - only a corner covered by sticky/fixed UI     -> recorded as "partial" (not a failure: 2.4.11 AA allows partial overlap)
 *   - covered by something that is not sticky/fixed (for example a transparent stretched-link overlay) -> noted, not failed
 */

export interface FocusStop {
  kind: 'ok' | 'none' | 'offscreen' | 'obscured' | 'hidden-control';
  el: string;
  text: string;
  /** Visible rectangle of the element inside the viewport. */
  visible?: { x: number; y: number; w: number; h: number };
  /** Sticky/fixed element covering the centre point (when kind is "obscured"). */
  centerCoveredBy?: string;
  /** Corners covered by sticky/fixed UI (informational). */
  partial: string[];
  /** Things other than sticky/fixed UI that hit-test above the element (informational). */
  otherOverlays: string[];
  focusVisible: boolean;
  /** An outline is drawn on the element or one of its nearest ancestors (stretched-link cards draw it on the card). */
  indicator: boolean;
  scrollY: number;
}

export interface TargetStop {
  found: boolean;
  id: string;
  /** Distance of the target's top edge from the top of the viewport. */
  top: number;
  /** Height of the sticky header (it covers the top `headerHeight` px whenever it is shown). */
  headerHeight: number;
  /** Sticky/fixed element covering the target's top-left probe point, if any. */
  coveredBy?: string;
  /** Sticky/fixed element covering the centre of the target's visible part, if any. */
  centerCoveredBy?: string;
  /** Hash navigation moved focus to the target (focusable targets such as footnotes). */
  focused: boolean;
  scrollY: number;
  maxScroll: number;
}

type ProbeArg = { mode: 'focus' } | { mode: 'target'; hash: string };

/** Runs in the page. Waits for scrolling and finite transitions to finish, then inspects the focused element or a hash target. */
export async function probeFocus(arg: ProbeArg): Promise<FocusStop | TargetStop> {
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const settle = async (): Promise<void> => {
    // Scroll position must stay unchanged for a wall-clock interval (not a frame count: frames stall on a busy machine).
    const started = performance.now();
    const origin = `${window.scrollX}:${window.scrollY}`;
    let last = origin;
    let lastChange = started;
    let moved = false;
    while (performance.now() - started < 4000) {
      await frame();
      const now = `${window.scrollX}:${window.scrollY}`;
      if (now !== last) {
        last = now;
        lastChange = performance.now();
      }
      if (now !== origin) moved = true;
      if (performance.now() - lastChange >= (moved ? 150 : 220)) break;
    }
    const pending = document.getAnimations().filter((a) => {
      const end = a.effect?.getComputedTiming().endTime;
      return a.timeline instanceof DocumentTimeline && typeof end === 'number' && Number.isFinite(end) && a.playState === 'running';
    });
    await Promise.race([Promise.allSettled(pending.map((a) => a.finished)), new Promise((resolve) => setTimeout(resolve, 700))]);
    await frame();
  };
  const describe = (el: Element): string => {
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`;
  };
  /** Nearest sticky/fixed ancestor-or-self of `top` that does not contain `subject` (i.e. real overlaying UI). */
  const stickyCover = (top: Element | null, subject: Element): string | undefined => {
    for (let n: Element | null = top; n && n !== document.documentElement; n = n.parentElement) {
      const pos = getComputedStyle(n).position;
      if ((pos === 'fixed' || pos === 'sticky') && !n.contains(subject)) return describe(n);
    }
    return undefined;
  };

  await settle();

  // ---------------------------------------------------------------------------------------------- target of a link
  if (arg.mode === 'target') {
    const id = decodeURIComponent(arg.hash.replace(/^#/, ''));
    const target = document.getElementById(id);
    const scrollY = Math.round(window.scrollY);
    const maxScroll = Math.round(document.documentElement.scrollHeight - window.innerHeight);
    if (!target) return { found: false, id, top: 0, headerHeight: 0, focused: false, scrollY, maxScroll };
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 0;
    const r = target.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const coverOf = (x: number, y: number): string | undefined => {
      const top = document.elementFromPoint(x, y);
      if (!top || top === target || target.contains(top)) return undefined;
      return stickyCover(top, target);
    };
    const coveredBy = coverOf(clamp(r.left + Math.min(8, r.width / 2), 1, vw - 1), clamp(r.top + 2, 1, vh - 1));
    const cx = clamp((Math.max(r.left, 0) + Math.min(r.right, vw)) / 2, 1, vw - 1);
    const cy = clamp((Math.max(r.top, 0) + Math.min(r.bottom, vh)) / 2, 1, vh - 1);
    return { found: true, id, top: Math.round(r.top), headerHeight, coveredBy, centerCoveredBy: coverOf(cx, cy), focused: document.activeElement === target, scrollY, maxScroll };
  }

  // ---------------------------------------------------------------------------------------------- the focused element
  const el = document.activeElement as HTMLElement | null;
  const base = { partial: [] as string[], otherOverlays: [] as string[], focusVisible: false, indicator: false, scrollY: Math.round(window.scrollY) };
  if (!el || el === document.body || el === document.documentElement) return { kind: 'none', el: '(none)', text: '', ...base };

  const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const rects = Array.from(el.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
  const rect = rects.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const focusVisible = el.matches(':focus-visible');
  const hasOutline = (n: Element) => {
    const s = getComputedStyle(n);
    return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  };
  let indicator = false;
  for (let n: Element | null = el, depth = 0; n && depth < 5; n = n.parentElement, depth++) {
    if (hasOutline(n)) {
      indicator = true;
      break;
    }
  }
  // Visually hidden controls (sr-only inputs) draw their indicator on a sibling; nothing to hit-test.
  if (rect.width <= 2 && rect.height <= 2) return { kind: 'hidden-control', el: describe(el), text: label, ...base, focusVisible, indicator };
  if (cs.visibility === 'hidden') return { kind: 'hidden-control', el: describe(el), text: label, ...base, focusVisible, indicator };

  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const x0 = Math.max(rect.left, 0);
  const y0 = Math.max(rect.top, 0);
  // Some inline links have a zero-height box (the footnote markers sit in a line-height: 0 <sup>); treat them as 1px tall.
  const x1 = Math.min(Math.max(rect.right, rect.left + 1), vw);
  const y1 = Math.min(Math.max(rect.bottom, rect.top + 1), vh);
  if (x1 - x0 < 0.5 || y1 - y0 < 0.5) {
    return { kind: 'offscreen', el: describe(el), text: label, ...base, focusVisible, indicator };
  }
  const inset = Math.max(0, Math.min(2, (x1 - x0) / 2 - 0.5, (y1 - y0) / 2 - 0.5));
  const points: [string, number, number][] = [
    ['center', (x0 + x1) / 2, (y0 + y1) / 2],
    ['top-left', x0 + inset, y0 + inset],
    ['top-right', x1 - inset - 0.01, y0 + inset],
    ['bottom-left', x0 + inset, y1 - inset - 0.01],
    ['bottom-right', x1 - inset - 0.01, y1 - inset - 0.01],
  ];
  let centerCoveredBy: string | undefined;
  for (const [name, x, y] of points) {
    const top = document.elementFromPoint(x, y);
    if (!top || el === top || el.contains(top)) continue;
    const sticky = stickyCover(top, el);
    if (sticky) {
      if (name === 'center') centerCoveredBy = sticky;
      else base.partial.push(`${name} by ${sticky}`);
    } else {
      base.otherOverlays.push(`${name} by ${describe(top)}`);
    }
  }
  return {
    kind: centerCoveredBy ? 'obscured' : 'ok',
    el: describe(el),
    text: label,
    visible: { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) },
    centerCoveredBy,
    partial: base.partial,
    otherOverlays: base.otherOverlays,
    focusVisible,
    indicator,
    scrollY: base.scrollY,
  };
}

/** Inspect the element that currently has focus. */
export const inspectFocus = (page: Page): Promise<FocusStop> => page.evaluate(probeFocus, { mode: 'focus' as const }) as Promise<FocusStop>;

/** Inspect the target of a just-followed in-page link. */
export const inspectTarget = (page: Page, hash: string): Promise<TargetStop> => page.evaluate(probeFocus, { mode: 'target' as const, hash }) as Promise<TargetStop>;
