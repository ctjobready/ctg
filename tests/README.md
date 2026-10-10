# Browser QA suite

Playwright specs for the built site: accessibility, reduced motion, no-JS rendering, console hygiene, map equivalence,
keyboard behaviour, focus-not-obscured, the home CTA, cross-browser smoke and (opt-in) screenshots.

```bash
npm run build                      # staging defaults (BASE_PATH=/ctg); the specs walk dist/ for the page list
npm run test:e2e                   # whole suite, chromium
npm run test:a11y                  # axe on every page at 390x844 and 1280x800
npm run test:smoke                 # cross-browser smoke + home CTA (all three projects)
npm run test:screens               # SCREENS=1: full-page screenshots to .work/qa/screens/<width>/<slug>.png
```

`playwright.config.ts` starts `astro preview --port 4341 --ignore-lock` and reuses a server that is already listening
(never reused when `CI` is set). `--ignore-lock` keeps the preview in the foreground; Astro 7 otherwise detaches it when
it detects an AI agent, which Playwright reads as "server exited early".

| Variable | Meaning |
|---|---|
| `CHROMIUM_PATH` | run the `chromium` project with this binary instead of Playwright's own download |
| `FIREFOX_PATH`, `WEBKIT_PATH` | same for the `firefox` / `webkit` projects |
| `BASE_PATH` | base path the site was built with (default `/ctg`); the suite refuses to run against a build with another base |
| `PORT`, `DIST_DIR`, `QA_DIR` | preview port (4341), build output (`dist`), report folder (`.work/qa`) |
| `SCREENS=1` | enable `screenshots.spec.ts` |

## Specs

| Spec | Projects | What it proves |
|---|---|---|
| `a11y.spec.ts` | chromium | axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa), 0 violations, every page at 390x844 and 1280x800, plus open mega-menus, open drawer and a visible map tooltip |
| `reduced-motion.spec.ts` | chromium | `reducedMotion: 'reduce'`: no running or declared animation/transition longer than 1 ms on reveal, marquee and count-up elements (and nowhere else), final count-up values in place; includes a positive control |
| `no-js.spec.ts` | chromium | JavaScript off: content visible, no reveal left hidden, stats final, nav reachable through the noscript nav, hover/focus menus and footer, location table visible; extra: no dead JS-only controls left visible; extra: the mobile sticky CTA bar is not displayed (with a JS-on positive control) |
| `console.spec.ts` | chromium | 0 console errors, 0 uncaught exceptions, 0 failed same-origin requests on every page, also while driving the menus, drawer, accordions, carousels, marquee and copy button |
| `map.spec.ts` | chromium | every pin/tooltip detail is in the always-visible table; pins are `aria-hidden`, not focusable, absent from the accessibility tree; table visible without JS |
| `keyboard.spec.ts` | chromium | skip link, disclosure menus, drawer dialog and focus trap, accordions, carousel controls, marquee pause button |
| `focus-obscured.spec.ts` | chromium | WCAG 2.4.11: Tab (80 stops), Shift+Tab (40 stops) and in-page/footnote anchors on one page per template, 390 and 1280 wide; extra: footnote markers must have a box tall enough for a focus ring |
| `anchor-jumps.spec.ts` | chromium | footnote markers, their back-links and "On this page" links on Outcomes 2026, the independent evaluation and TalentLEAP, at 390 and 1280 wide, under smooth scrolling and reduced motion: the first, a middle and the last of each land with the target's top below the sticky header on the first jump, nowhere covered, and nothing scrolls again afterwards (the check that catches a `content-visibility: auto` band or an animated FAQ answer leaving the first scroll short); extra: the last marker, when it sits in a closed FAQ answer, is reached through its back-link |
| `print.spec.ts` | chromium | print media emulation on the two evidence pages (and Home at phone width): chrome and calls to action gone, H1, BLUF, chart data tables, footnotes and sources kept, black on white, nothing waiting for a scroll, the canonical URL in a footer line; `page.pdf` is written under the test's output folder (never into the repository) and, where `pdftotext` is installed, its text must carry the H1, the first footnote and the canonical URL |
| `home-cta.spec.ts` | all | the home hero CTA is fully above the fold at 390x844 and 1280x800; extra: the mobile sticky CTA bar is hidden at scrollY=0 on every landing page |
| `smoke.spec.ts` | all | every page loads (200), has a visible h1, no console errors / page errors / failed same-origin requests |
| `screenshots.spec.ts` | chromium, `SCREENS=1` | core pages at 390, 768, 1200 and 1440 px (tall pages captured in slices and stitched) |

Reports: `.work/qa/a11y-summary.{json,md}` (axe results by rule and by page), `failures.{json,md}`, `notes.json`,
`run-summary.json`, `playwright-report/` (HTML) and `playwright-results.json`. The suite never retries a test and never
disables an axe rule; a failing check is a finding.

The page list comes from `dist/**/index.html` plus `404.html`, minus redirect stubs (a meta refresh in `<head>`).
