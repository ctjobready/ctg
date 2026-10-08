/** Shared helpers for the progressive-enhancement scripts. */
export const prefersReducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (el) => !el.hasAttribute('hidden') && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden',
  );
}

export function onReady(fn: () => void): void {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}
