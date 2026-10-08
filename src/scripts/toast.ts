/** M18 — copy-to-clipboard buttons ([data-copy]) + a polite toast region. */
const region = document.getElementById('toast-region');

export function showToast(message: string, ms = 2600): void {
  if (!region) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  region.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  window.setTimeout(() => {
    t.classList.remove('is-in');
    t.classList.add('is-out');
    window.setTimeout(() => t.remove(), 300);
  }, ms);
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = (document as unknown as { execCommand: (c: string) => boolean }).execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

document.addEventListener('click', async (e) => {
  const btn = (e.target as Element).closest<HTMLElement>('[data-copy]');
  if (!btn) return;
  const ok = await copy(btn.dataset.copy ?? '');
  showToast(ok ? (btn.dataset.copyMessage ?? 'Copied') : 'Copy failed — please select and copy manually');
});

document.addEventListener('ct:toast', (e) => showToast(String((e as CustomEvent).detail ?? '')));
