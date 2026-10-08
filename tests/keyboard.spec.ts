import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, VIEWPORTS, open, vpLabel } from './support/browser';
import { countMarkup, pageByRoute, pagesWithMarkup } from './support/pages';
import { templatePages } from './support/templates';

/**
 * Keyboard walkthrough (planning doc 10 §3, doc 08 §8): the skip link, the desktop disclosure menus, the mobile drawer,
 * accordions, carousel controls and the marquee pause button, driven with real key presses. The menu and drawer
 * assertions follow the pattern the site actually implements (src/scripts/megamenu.ts, drawer.ts):
 *   mega-menus: Enter/Space toggle the native button; ArrowDown on a trigger opens the panel and focuses its first link;
 *   ArrowDown/ArrowUp move through the panel links (wrapping); ArrowLeft/ArrowRight move between triggers (wrapping);
 *   Escape closes and returns focus to the trigger; focus leaving the menu closes it; only one panel is open at a time.
 *   drawer: a modal <dialog> opened from the Menu button; focus moves into it and is trapped; Escape or the close button
 *   close it and focus returns to the button; scrolling is locked while it is open.
 */

interface Active {
  tag: string;
  id: string;
  cls: string;
  text: string;
  href: string | null;
  label: string | null;
  inMain: boolean;
  inDrawer: boolean;
  megaIndex: number;
  isTrigger: boolean;
  panelLink: number;
}

async function active(page: Page): Promise<Active> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const items = Array.from(document.querySelectorAll('[data-mega]'));
    const li = a ? items.find((x) => x.contains(a)) : undefined;
    const dlg = document.querySelector('dialog[data-drawer]');
    return {
      tag: a?.tagName.toLowerCase() ?? '',
      id: a?.id ?? '',
      cls: typeof a?.className === 'string' ? a.className : '',
      text: (a?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50),
      href: a?.getAttribute('href') ?? null,
      label: a?.getAttribute('aria-label') ?? null,
      inMain: !!a?.closest('main'),
      inDrawer: !!(dlg && a && dlg.contains(a)),
      megaIndex: li ? items.indexOf(li) : -1,
      isTrigger: !!a?.hasAttribute('data-mega-trigger'),
      panelLink: li && a ? Array.from(li.querySelectorAll('[data-mega-panel] a')).indexOf(a) : -1,
    };
  });
}

const who = (a: Active): string => `${a.tag}${a.cls ? `.${a.cls.split(/\s+/)[0]}` : ''} "${a.text}"`;

// --------------------------------------------------------------------------------------------------------------------
// Skip link
// --------------------------------------------------------------------------------------------------------------------
test.describe('skip link', () => {
  for (const vp of VIEWPORTS) {
    for (const t of templatePages()) {
      test(`${t.label} ${vpLabel(vp)}: first Tab stop, visible, moves focus to <main>`, async ({ page }) => {
        await page.setViewportSize(vp);
        await open(page, t.page);
        await page.keyboard.press('Tab');
        const first = await active(page);
        expect(first.cls, `first Tab stop is ${who(first)}`).toContain('skip-link');
        expect(first.href, 'skip link target').toBe('#main');
        const box = await page.locator('.skip-link').boundingBox();
        expect(box, 'skip link has a box while focused').not.toBeNull();
        expect(box!.y, 'skip link is on screen (top)').toBeGreaterThanOrEqual(0);
        expect(box!.x, 'skip link is on screen (left)').toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height, 'skip link is inside the viewport').toBeLessThanOrEqual(vp.height);
        await page.keyboard.press('Enter');
        await expect.poll(async () => (await active(page)).id, { message: 'focus moves to #main after activating the skip link' }).toBe('main');
        await page.keyboard.press('Tab');
        const next = await active(page);
        expect(next.inMain, `next Tab stop (${who(next)}) is inside <main>, not back in the header`).toBe(true);
      });
    }
  }
});

// --------------------------------------------------------------------------------------------------------------------
// Desktop mega-menus
// --------------------------------------------------------------------------------------------------------------------
test.describe('desktop mega-menus (disclosure pattern)', () => {
  test.use({ viewport: DESKTOP });
  const home = pageByRoute('/');
  const count = countMarkup(home, /<button[^>]*\sdata-mega-trigger[\s>]/);

  test('triggers are buttons with aria-expanded and aria-controls; panels start closed', async ({ page }) => {
    await open(page, home);
    const triggers = page.locator('[data-mega-trigger]');
    expect(await triggers.count(), 'mega-menu triggers').toBe(count);
    for (let i = 0; i < count; i++) {
      const trigger = triggers.nth(i);
      expect(await trigger.evaluate((el) => el.tagName), `trigger ${i + 1} element`).toBe('BUTTON');
      await expect(trigger, `trigger ${i + 1} type`).toHaveAttribute('type', 'button');
      await expect(trigger, `trigger ${i + 1} aria-expanded`).toHaveAttribute('aria-expanded', 'false');
      const controls = await trigger.getAttribute('aria-controls');
      expect(controls, `trigger ${i + 1} aria-controls`).toBeTruthy();
      const panel = page.locator(`#${controls}`);
      await expect(panel, `panel #${controls} exists`).toHaveCount(1);
      await expect(panel, `panel #${controls} is closed`).toBeHidden();
    }
  });

  test('Tab order: skip link, logo, then the menu triggers in order', async ({ page }) => {
    await open(page, home);
    const stops: Active[] = [];
    for (let i = 0; i < 2 + count; i++) {
      await page.keyboard.press('Tab');
      stops.push(await active(page));
    }
    expect(stops[0].cls, 'first stop').toContain('skip-link');
    // promo bar controls may sit before the logo, so look for the triggers as an in-order run
    const triggerStops = stops.filter((s) => s.isTrigger).map((s) => s.megaIndex);
    for (let i = 1; i < triggerStops.length; i++) expect(triggerStops[i], 'triggers are reached in DOM order').toBe(triggerStops[i - 1] + 1);
  });

  for (let i = 0; i < count; i++) {
    test.describe(`menu ${i + 1}`, () => {
      test('Enter and Space open and close the panel', async ({ page }) => {
        await open(page, home);
        const trigger = page.locator('[data-mega-trigger]').nth(i);
        const panel = page.locator('[data-mega-panel]').nth(i);
        await trigger.focus();
        for (const key of ['Enter', 'Space']) {
          await page.keyboard.press(key);
          await expect(trigger, `${key} opens: aria-expanded`).toHaveAttribute('aria-expanded', 'true');
          await expect(panel, `${key} opens: panel visible`).toBeVisible();
          await page.keyboard.press(key);
          await expect(trigger, `${key} again closes: aria-expanded`).toHaveAttribute('aria-expanded', 'false');
          await expect(panel, `${key} again closes: panel hidden`).toBeHidden();
        }
      });

      test('Escape closes the panel and returns focus to the trigger', async ({ page }) => {
        await open(page, home);
        const trigger = page.locator('[data-mega-trigger]').nth(i);
        const panel = page.locator('[data-mega-panel]').nth(i);
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(panel).toBeVisible();
        await page.keyboard.press('Tab');
        const inside = await active(page);
        expect(inside.megaIndex, `Tab from the open trigger moves into its panel (${who(inside)})`).toBe(i);
        expect(inside.isTrigger, 'focus left the trigger').toBe(false);
        await page.keyboard.press('Escape');
        await expect(trigger, 'aria-expanded after Escape').toHaveAttribute('aria-expanded', 'false');
        await expect(panel, 'panel after Escape').toBeHidden();
        const after = await active(page);
        expect(after.isTrigger && after.megaIndex === i, `focus returns to trigger ${i + 1} (is ${who(after)})`).toBe(true);
      });

      test('ArrowDown opens and enters the panel; ArrowDown/ArrowUp cycle its links; Escape returns', async ({ page }) => {
        await open(page, home);
        const trigger = page.locator('[data-mega-trigger]').nth(i);
        const panel = page.locator('[data-mega-panel]').nth(i);
        const linkCount = await panel.locator('a').count();
        expect(linkCount, 'links in the panel').toBeGreaterThan(1);
        await trigger.focus();
        await page.keyboard.press('ArrowDown');
        await expect(trigger, 'ArrowDown opens').toHaveAttribute('aria-expanded', 'true');
        await expect(panel).toBeVisible();
        let a = await active(page);
        expect(a.megaIndex === i && a.panelLink, `focus is on the first panel link (is ${who(a)})`).toBe(0);
        await page.keyboard.press('ArrowDown');
        a = await active(page);
        expect(a.panelLink, 'ArrowDown moves to the next link').toBe(1);
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');
        a = await active(page);
        expect(a.panelLink, 'ArrowUp from the first link wraps to the last').toBe(linkCount - 1);
        await page.keyboard.press('ArrowDown');
        a = await active(page);
        expect(a.panelLink, 'ArrowDown from the last link wraps to the first').toBe(0);
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        a = await active(page);
        expect(a.isTrigger && a.megaIndex === i, `focus returns to the trigger (is ${who(a)})`).toBe(true);
      });

      test('ArrowRight and ArrowLeft move between triggers (wrapping) without opening them', async ({ page }) => {
        await open(page, home);
        const triggers = page.locator('[data-mega-trigger]');
        await triggers.nth(i).focus();
        await page.keyboard.press('ArrowRight');
        let a = await active(page);
        expect(a.isTrigger && a.megaIndex, `ArrowRight moves to the next trigger (is ${who(a)})`).toBe((i + 1) % count);
        await page.keyboard.press('ArrowLeft');
        a = await active(page);
        expect(a.isTrigger && a.megaIndex, 'ArrowLeft moves back').toBe(i);
        await page.keyboard.press('ArrowLeft');
        a = await active(page);
        expect(a.isTrigger && a.megaIndex, 'ArrowLeft from here moves to the previous trigger (wrapping at the start)').toBe((i + count - 1) % count);
        for (let k = 0; k < count; k++) await expect(triggers.nth(k), `trigger ${k + 1} stays closed`).toHaveAttribute('aria-expanded', 'false');
      });

      test('tabbing out of the open menu closes it', async ({ page }) => {
        await open(page, home);
        const trigger = page.locator('[data-mega-trigger]').nth(i);
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        let a = await active(page);
        let guard = 0;
        while (a.megaIndex === i && guard++ < 40) {
          await page.keyboard.press('Tab');
          a = await active(page);
        }
        expect(a.megaIndex, `focus has left menu ${i + 1} (is ${who(a)})`).not.toBe(i);
        await expect(trigger, 'aria-expanded once focus has left').toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('[data-mega-panel]').nth(i), 'panel once focus has left').toBeHidden();
      });
    });
  }

  test('opening one menu closes the others', async ({ page }) => {
    await open(page, home);
    const triggers = page.locator('[data-mega-trigger]');
    await triggers.nth(0).focus();
    await page.keyboard.press('Enter');
    await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await triggers.nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(triggers.nth(0), 'the first menu closes when the second opens').toHaveAttribute('aria-expanded', 'false');
  });
});

// --------------------------------------------------------------------------------------------------------------------
// Mobile / tablet drawer
// --------------------------------------------------------------------------------------------------------------------
for (const vp of [MOBILE, { width: 768, height: 1024 }]) {
  test.describe(`mobile drawer ${vpLabel(vp)}`, () => {
    test.use({ viewport: vp });
    const home = pageByRoute('/');

    const openDrawer = async (page: Page) => {
      await open(page, home);
      const button = page.locator('.menu-btn[data-drawer-open]');
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('dialog[data-drawer]'), 'drawer is open').toHaveJSProperty('open', true);
      return button;
    };

    test('Menu button is a labelled disclosure for the dialog; the desktop nav is not shown', async ({ page }) => {
      await open(page, home);
      const button = page.locator('.menu-btn[data-drawer-open]');
      await expect(button).toBeVisible();
      await expect(button, 'aria-haspopup').toHaveAttribute('aria-haspopup', 'dialog');
      await expect(button, 'aria-controls').toHaveAttribute('aria-controls', 'site-drawer');
      await expect(button, 'aria-expanded').toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('button', { name: 'Menu', exact: true }), 'accessible name "Menu"').toBeVisible();
      await expect(page.locator('.site-nav'), 'desktop navigation is hidden below 1024px').toBeHidden();
    });

    test('opens as a modal dialog from the keyboard and moves focus into it', async ({ page }) => {
      const button = await openDrawer(page);
      const modal = await page.evaluate(() => (document.querySelector('dialog[data-drawer]') as HTMLDialogElement).matches(':modal'));
      expect(modal, 'dialog is modal (opened with showModal)').toBe(true);
      await expect(button, 'aria-expanded').toHaveAttribute('aria-expanded', 'true');
      const a = await active(page);
      expect(a.inDrawer, `focus is inside the dialog (is ${who(a)})`).toBe(true);
      expect(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), 'page scrolling is locked').toBe(true);
      await expect(page.locator('dialog[data-drawer]'), 'dialog has an accessible name').toHaveAttribute('aria-label', /menu/i);
    });

    test('traps focus: Tab and Shift+Tab never leave the dialog and wrap around', async ({ page }) => {
      await openDrawer(page);
      const total = await page.evaluate(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('dialog[data-drawer] a[href], dialog[data-drawer] button:not([disabled]), dialog[data-drawer] summary')).filter(
            (el) => el.offsetParent !== null,
          ).length,
      );
      const forward: Active[] = [];
      for (let k = 0; k < total + 4; k++) {
        await page.keyboard.press('Tab');
        forward.push(await active(page));
      }
      expect(forward.filter((s) => !s.inDrawer).map(who), 'Tab stops outside the dialog').toEqual([]);
      expect(new Set(forward.map(who)).size, 'Tab visits more than one element and wraps').toBeGreaterThan(2);
      const backward: Active[] = [];
      for (let k = 0; k < total + 4; k++) {
        await page.keyboard.press('Shift+Tab');
        backward.push(await active(page));
      }
      expect(backward.filter((s) => !s.inDrawer).map(who), 'Shift+Tab stops outside the dialog').toEqual([]);
    });

    test('Escape closes the dialog, returns focus to the Menu button and unlocks scrolling', async ({ page }) => {
      const button = await openDrawer(page);
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[data-drawer]'), 'dialog closed').toHaveJSProperty('open', false);
      await expect(button, 'aria-expanded').toHaveAttribute('aria-expanded', 'false');
      await expect(button, 'focus returns to the Menu button').toBeFocused();
      expect(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), 'scroll lock released').toBe(false);
    });

    test('the close button closes the dialog and returns focus to the Menu button', async ({ page }) => {
      const button = await openDrawer(page);
      const close = page.locator('dialog[data-drawer] [data-drawer-close]');
      await expect(close, 'close button name').toHaveAttribute('aria-label', /close/i);
      await close.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('dialog[data-drawer]')).toHaveJSProperty('open', false);
      await expect(button, 'focus returns to the Menu button').toBeFocused();
    });

    test('drawer groups expand and collapse from the keyboard (one open at a time)', async ({ page }) => {
      await openDrawer(page);
      const summaries = page.locator('dialog[data-drawer] details.drawer__group > summary');
      expect(await summaries.count(), 'drawer groups').toBeGreaterThan(1);
      const details = page.locator('dialog[data-drawer] details.drawer__group');
      await summaries.nth(0).focus();
      await page.keyboard.press('Enter');
      await expect(details.nth(0), 'Enter opens the first group').toHaveJSProperty('open', true);
      await summaries.nth(1).focus();
      await page.keyboard.press('Space');
      await expect(details.nth(1), 'Space opens the second group').toHaveJSProperty('open', true);
      await expect(details.nth(0), 'the first group closes (exclusive group)').toHaveJSProperty('open', false);
      await page.keyboard.press('Enter');
      await expect(details.nth(1), 'Enter closes the open group').toHaveJSProperty('open', false);
    });
  });
}

// --------------------------------------------------------------------------------------------------------------------
// Accordions
// --------------------------------------------------------------------------------------------------------------------
test.describe('accordions', () => {
  test.use({ viewport: DESKTOP });
  const faqPages = pagesWithMarkup(/class="[^"]*\bfaq__item\b/);
  test('some pages carry FAQ accordions', () => expect(faqPages.length).toBeGreaterThan(0));

  for (const p of faqPages) {
    test(`${p.route}: FAQ items toggle with Enter and Space`, async ({ page }) => {
      await open(page, p);
      const items = page.locator('main details.faq__item');
      const n = await items.count();
      expect(n, 'FAQ items').toBeGreaterThan(0);
      for (const index of new Set([0, n - 1])) {
        const item = items.nth(index);
        const summary = item.locator('> summary');
        await summary.scrollIntoViewIfNeeded();
        await summary.focus();
        const wasOpen = await item.evaluate((el) => (el as HTMLDetailsElement).open);
        await page.keyboard.press('Enter');
        await expect(item, `item ${index + 1}: Enter toggles`).toHaveJSProperty('open', !wasOpen);
        await page.keyboard.press('Space');
        await expect(item, `item ${index + 1}: Space toggles back`).toHaveJSProperty('open', wasOpen);
        await page.keyboard.press('Space');
        await expect(item, `item ${index + 1}: Space toggles again`).toHaveJSProperty('open', !wasOpen);
        if (!wasOpen) {
          await expect(item.locator('.acc__body'), `item ${index + 1}: answer visible when open`).toBeVisible();
        }
        await page.keyboard.press('Enter');
        await expect(item, `item ${index + 1}: Enter closes again`).toHaveJSProperty('open', wasOpen);
      }
    });
  }
});

// --------------------------------------------------------------------------------------------------------------------
// Carousels
// --------------------------------------------------------------------------------------------------------------------
test.describe('carousels', () => {
  // Reduced motion makes carousel.ts scroll instantly, so the assertions do not race a smooth scroll.
  test.use({ reducedMotion: 'reduce' });
  const carouselPages = pagesWithMarkup(/data-carousel(?!-)/);
  test('some pages carry carousels', () => expect(carouselPages.length).toBeGreaterThan(0));

  for (const vp of VIEWPORTS) {
    for (const p of carouselPages) {
      test(`${p.route} ${vpLabel(vp)}: controls are labelled buttons and work from the keyboard`, async ({ page }) => {
        await page.setViewportSize(vp);
        await open(page, p);
        const roots = page.locator('[data-carousel]');
        const n = await roots.count();
        expect(n, 'carousels on the page').toBeGreaterThan(0);
        for (let c = 0; c < n; c++) {
          const root = roots.nth(c);
          const tag = `carousel ${c + 1}`;
          await root.scrollIntoViewIfNeeded();
          await expect(root, `${tag}: aria-roledescription`).toHaveAttribute('aria-roledescription', 'carousel');
          await expect(root, `${tag}: accessible name`).toHaveAttribute('aria-label', /\S/);
          const track = root.locator('[data-carousel-track]');
          await expect(track, `${tag}: track is keyboard focusable`).toHaveAttribute('tabindex', '0');
          await expect(track, `${tag}: track role`).toHaveAttribute('role', 'group');
          await expect(track, `${tag}: track name`).toHaveAttribute('aria-label', /\S/);
          const slides = await track.evaluate((el) => Array.from(el.children).map((s) => ({ role: s.getAttribute('role'), rd: s.getAttribute('aria-roledescription'), label: s.getAttribute('aria-label') })));
          expect(slides.filter((s) => s.role !== 'group' || s.rd !== 'slide' || !s.label).length, `${tag}: every slide is a labelled group`).toBe(0);

          const prev = root.locator('[data-carousel-prev]');
          const next = root.locator('[data-carousel-next]');
          for (const [name, button] of [['previous', prev], ['next', next]] as const) {
            expect(await button.evaluate((el) => el.tagName), `${tag}: ${name} control element`).toBe('BUTTON');
            await expect(button, `${tag}: ${name} button type`).toHaveAttribute('type', 'button');
            await expect(button, `${tag}: ${name} button name`).toHaveAttribute('aria-label', /\S/);
            await expect(button, `${tag}: ${name} button is visible`).toBeVisible();
            const box = await button.boundingBox();
            expect(Math.min(box!.width, box!.height), `${tag}: ${name} button target size`).toBeGreaterThanOrEqual(24);
          }
          const dots = root.locator('[data-carousel-dots] button');
          const dotCount = await dots.count();
          for (let d = 0; d < dotCount; d++) {
            expect(await dots.nth(d).evaluate((el) => (el.getAttribute('aria-label') ?? '').trim().length > 0), `${tag}: dot ${d + 1} has a name`).toBe(true);
          }

          await expect.soft(prev, `${tag}: Previous is disabled on the first slide at load (scrollLeft rests at 4px, carousel.ts only disables it at <= 2px)`).toBeDisabled();
          const scrollLeft = () => track.evaluate((el) => el.scrollLeft);
          if (await next.isEnabled()) {
            const start = await scrollLeft();
            await next.focus();
            await page.keyboard.press('Enter');
            await expect.poll(scrollLeft, { message: `${tag}: Enter on Next scrolls forward` }).toBeGreaterThan(start);
            const moved = await scrollLeft();
            await expect(prev, `${tag}: Previous is enabled after moving`).toBeEnabled();
            await prev.focus();
            await page.keyboard.press('Space');
            await expect.poll(scrollLeft, { message: `${tag}: Space on Previous scrolls back` }).toBeLessThan(moved);
            await track.focus();
            const before = await scrollLeft();
            await page.keyboard.press('ArrowRight');
            await expect.poll(scrollLeft, { message: `${tag}: ArrowRight on the track scrolls forward` }).toBeGreaterThan(before);
            await page.keyboard.press('Home');
            // The track has 4px of padding, so the first slide rests 0-4px from the track's left edge; compare with the slide, not with scrollLeft 0.
            await expect
              .poll(() => track.evaluate((el) => {
                const offset = (el.firstElementChild as HTMLElement).getBoundingClientRect().left - el.getBoundingClientRect().left;
                return offset >= -1 && offset <= 5;
              }), { message: `${tag}: Home on the track brings the first slide back to the start edge` })
              .toBe(true);
            await expect.soft(prev, `${tag}: Previous is disabled again on the first slide (carousel.ts disables it only when scrollLeft <= 2, but the first snap position is the 4px track padding)`).toBeDisabled();
            if (dotCount > 1) {
              await dots.nth(1).focus();
              await page.keyboard.press('Enter');
              await expect
                .poll(() => track.evaluate((el) => {
                  const offset = (el.children[1] as HTMLElement).getBoundingClientRect().left - el.getBoundingClientRect().left;
                  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2; // few slides: the track cannot scroll any further
                  return (offset >= -1 && offset <= 6) || atEnd;
                }), { message: `${tag}: Enter on dot 2 brings slide 2 to the start edge (or scrolls to the end of a short track)` })
                .toBe(true);
              const active = await dots.evaluateAll((all) => all.filter((d) => d.classList.contains('is-active')).map((d) => d.getAttribute('aria-current')));
              expect(active.length, `${tag}: exactly one dot is marked active`).toBe(1);
              expect.soft(['true', 'page', 'step', 'location', 'date', 'time'], `${tag}: the active dot exposes a valid aria-current value (got ${JSON.stringify(active[0])}; an empty string means "false")`).toContain(active[0]);
            }
          } else {
            await expect(prev, `${tag}: all slides fit, so Previous is disabled`).toBeDisabled();
          }
        }
      });
    }
  }
});

// --------------------------------------------------------------------------------------------------------------------
// Marquee pause button (WCAG 2.2.2, design doc M13)
// --------------------------------------------------------------------------------------------------------------------
test.describe('logo marquee pause button', () => {
  test.use({ viewport: DESKTOP, reducedMotion: 'no-preference' });
  const marqueePages = pagesWithMarkup(/data-marquee(?!-)/);
  test('some pages carry the marquee', () => expect(marqueePages.length).toBeGreaterThan(0));

  for (const p of marqueePages) {
    test(`${p.route}: pause/play is a labelled, 44px, keyboard-operable toggle`, async ({ page }) => {
      await open(page, p);
      const roots = page.locator('[data-marquee]');
      for (let r = 0; r < (await roots.count()); r++) {
        const root = roots.nth(r);
        const button = root.locator('[data-marquee-toggle]');
        await button.scrollIntoViewIfNeeded();
        await expect(button, 'pause button is visible').toBeVisible();
        await expect(button, 'initial label').toHaveAttribute('aria-label', /pause/i);
        await expect(button, 'initial aria-pressed').toHaveAttribute('aria-pressed', 'false');
        const box = await button.boundingBox();
        expect(Math.min(box!.width, box!.height), 'pause button target size (>= 44px, doc 07 M13)').toBeGreaterThanOrEqual(44);
        const playState = () => root.locator('.marquee__inner').evaluate((el) => getComputedStyle(el).animationPlayState);
        await button.focus();
        await page.keyboard.press('Enter');
        await expect(button, 'Enter pauses: aria-pressed').toHaveAttribute('aria-pressed', 'true');
        await expect(button, 'Enter pauses: label becomes Play').toHaveAttribute('aria-label', /play/i);
        await expect.poll(playState, { message: 'marquee animation-play-state after pausing' }).toBe('paused');
        await page.keyboard.press('Space');
        await expect(button, 'Space resumes: aria-pressed').toHaveAttribute('aria-pressed', 'false');
        await expect.poll(playState, { message: 'marquee animation-play-state after resuming' }).toBe('running');
      }
    });
  }
});
