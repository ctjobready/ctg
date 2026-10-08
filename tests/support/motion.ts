/**
 * Browser-side probes for the reduced-motion and no-JS specs. Each function is passed to page.evaluate(), so it
 * must be self-contained (no references to module scope).
 *
 * Reduced motion contract (planning doc 07 §6, doc 10 §1): under prefers-reduced-motion: reduce nothing on the page
 * animates. The site's reset sets animation/transition durations to 0.001ms (not 0, so animationend still fires);
 * that finishes inside the first frame, so "off" means a duration of at most EPS_MS = 1 ms.
 */

export interface MotionReport {
  /** Elements carrying data-reveal (M1). */
  reveal: { total: number; notVisible: string[]; moving: string[] };
  /** Logo marquees (M13): the wrapper carries data-marquee. */
  marquee: { roots: number; moving: string[]; pauseButtonsVisible: string[]; cloneTracksVisible: string[] };
  /** Count-ups (M2): the final text must already be in place. */
  countup: { total: number; wrong: { where: string; actual: string; expected: string }[] };
}

export const EPS_MS = 1;

export function motionProbe(eps: number): MotionReport {
  const describe = (el: Element): string => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const toMs = (list: string): number[] =>
    list.split(',').map((v) => {
      const s = v.trim();
      return s.endsWith('ms') ? parseFloat(s) : s.endsWith('s') ? parseFloat(s) * 1000 : 0;
    });
  /** Declared (computed) animation or transition longer than eps on this element. */
  const declared = (el: Element): string[] => {
    const cs = getComputedStyle(el);
    const out: string[] = [];
    const names = cs.animationName.split(',').map((s) => s.trim());
    const durations = toMs(cs.animationDuration);
    const delays = toMs(cs.animationDelay);
    names.forEach((n, i) => {
      const total = (durations[i % durations.length] ?? 0) + Math.max(0, delays[i % delays.length] ?? 0);
      if (n !== 'none' && total > eps) out.push(`animation "${n}" ${total}ms`);
    });
    if (cs.transitionProperty.trim() !== 'none') {
      const td = toMs(cs.transitionDuration);
      if (td.some((d) => d > eps)) out.push(`transition ${cs.transitionProperty} ${cs.transitionDuration}`);
    }
    return out;
  };
  const running = (el: Element): string[] =>
    el
      .getAnimations({ subtree: false })
      .filter((a) => a.playState === 'running' && ((a.effect?.getComputedTiming().activeDuration as number) > eps || !(a.timeline instanceof DocumentTimeline)))
      .map((a) => `running ${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'animation'}`);

  // --- reveal ---------------------------------------------------------------------------------------------
  const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  const notVisible: string[] = [];
  const moving: string[] = [];
  for (const el of reveals) {
    const cs = getComputedStyle(el);
    const m = cs.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(cs.transform);
    if (parseFloat(cs.opacity) < 1 || cs.visibility === 'hidden' || Math.abs(m.m41) > 0.01 || Math.abs(m.m42) > 0.01) {
      notVisible.push(`${describe(el)} opacity=${cs.opacity} transform=${cs.transform}`);
    }
    const problems = [...declared(el), ...running(el)];
    if (problems.length) moving.push(`${describe(el)}: ${problems.join(', ')}`);
  }

  // --- marquee --------------------------------------------------------------------------------------------
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-marquee]'));
  const marqueeMoving: string[] = [];
  const toggles: string[] = [];
  const clones: string[] = [];
  for (const root of roots) {
    for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
      const problems = [...declared(el), ...running(el)];
      if (problems.length) marqueeMoving.push(`${describe(el)}: ${problems.join(', ')}`);
    }
    for (const b of Array.from(root.querySelectorAll<HTMLElement>('[data-marquee-toggle]'))) {
      if (getComputedStyle(b).display !== 'none' && !b.hidden) toggles.push(describe(b));
    }
    for (const c of Array.from(root.querySelectorAll<HTMLElement>('.marquee__clone'))) {
      if (getComputedStyle(c).display !== 'none') clones.push(describe(c));
    }
  }

  // --- count-up -------------------------------------------------------------------------------------------
  const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-countup]'));
  const wrong: { where: string; actual: string; expected: string }[] = [];
  for (const el of counters) {
    const twin = el.nextElementSibling;
    let expected: string;
    if (twin && twin.classList.contains('sr-only')) {
      expected = (twin.textContent ?? '').trim();
    } else {
      const decimals = Number(el.dataset.decimals ?? 0);
      const n = Number(el.dataset.value);
      const body = el.dataset.grouped === 'true' ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals);
      expected = `${el.dataset.prefix ?? ''}${body}${el.dataset.suffix ?? ''}`;
    }
    const actual = (el.textContent ?? '').trim();
    if (actual !== expected) wrong.push({ where: describe(el), actual, expected });
  }

  return {
    reveal: { total: reveals.length, notVisible, moving },
    marquee: { roots: roots.length, moving: marqueeMoving, pauseButtonsVisible: toggles, cloneTracksVisible: clones },
    countup: { total: counters.length, wrong },
  };
}

export interface GlobalMotionReport {
  /** Elements (or ::before/::after) whose computed animation/transition is longer than eps. */
  declared: string[];
  declaredTotal: number;
  /** Animations seen running while scrolling the page top to bottom. */
  running: string[];
  elements: number;
}

/**
 * Whole-page sweep: every element and its ::before/::after, plus a sampled scroll through the page looking for
 * running animations (scroll-driven ones included).
 */
export async function globalMotionProbe(eps: number): Promise<GlobalMotionReport> {
  const toMs = (list: string): number[] =>
    list.split(',').map((v) => {
      const s = v.trim();
      return s.endsWith('ms') ? parseFloat(s) : s.endsWith('s') ? parseFloat(s) * 1000 : 0;
    });
  const describe = (el: Element, pseudo = ''): string => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}${pseudo}`;
  };
  const declaredList: string[] = [];
  const all = Array.from(document.querySelectorAll('*'));
  for (const el of all) {
    for (const pseudo of ['', '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo || null);
      if (pseudo && cs.content === 'none') continue;
      const out: string[] = [];
      const names = cs.animationName.split(',').map((s) => s.trim());
      const durations = toMs(cs.animationDuration);
      const delays = toMs(cs.animationDelay);
      names.forEach((n, i) => {
        const total = (durations[i % durations.length] ?? 0) + Math.max(0, delays[i % delays.length] ?? 0);
        if (n !== 'none' && total > eps) out.push(`animation "${n}" ${total}ms`);
      });
      if (cs.transitionProperty.trim() !== 'none' && toMs(cs.transitionDuration).some((d) => d > eps)) {
        out.push(`transition ${cs.transitionProperty} ${cs.transitionDuration}`);
      }
      if (out.length) declaredList.push(`${describe(el, pseudo)}: ${out.join(', ')}`);
    }
  }

  const seen = new Set<string>();
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const sample = () => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming();
      const scrollDriven = !(a.timeline instanceof DocumentTimeline);
      if (a.playState !== 'running') continue;
      if (!scrollDriven && !((t?.activeDuration as number) > eps)) continue;
      const target = (a.effect as KeyframeEffect | null)?.target;
      const name = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'animation';
      seen.add(`${target ? describe(target) : '?'}: ${scrollDriven ? 'scroll-driven ' : ''}${name} (${String(t?.activeDuration)}ms)`);
    }
  };
  const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await frame();
    await frame();
    sample();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await frame();
  return { declared: declaredList.slice(0, 40), declaredTotal: declaredList.length, running: [...seen].slice(0, 40), elements: all.length };
}
