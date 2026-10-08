import { prefersReducedMotion } from './util';

/** M2 — count to the final value in 1.2s (ease-out). Final text is already in the HTML. */
interface Spec {
  el: HTMLElement;
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouped: boolean;
}

const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-countup]'));

function fmt(s: Spec, n: number): string {
  const body = s.grouped
    ? n.toLocaleString('en-US', { minimumFractionDigits: s.decimals, maximumFractionDigits: s.decimals })
    : n.toFixed(s.decimals);
  return s.prefix + body + s.suffix;
}

if (nodes.length && !prefersReducedMotion() && 'IntersectionObserver' in window) {
  const specs = new Map<Element, Spec>();
  for (const el of nodes) {
    const target = Number(el.dataset.value);
    if (!Number.isFinite(target)) continue;
    const spec: Spec = {
      el,
      prefix: el.dataset.prefix ?? '',
      suffix: el.dataset.suffix ?? '',
      target,
      decimals: Number(el.dataset.decimals ?? 0),
      grouped: el.dataset.grouped === 'true',
    };
    specs.set(el, spec);
    el.textContent = fmt(spec, 0); // width is reserved in ch, so no layout shift
  }

  const run = (s: Spec) => {
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      s.el.textContent = fmt(s, s.target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else s.el.textContent = fmt(s, s.target);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const s = specs.get(e.target);
        if (s) run(s);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.4 },
  );
  specs.forEach((_s, el) => io.observe(el));
  // Never leave a half-counted number in print.
  addEventListener('beforeprint', () => specs.forEach((s) => (s.el.textContent = fmt(s, s.target))));
}
