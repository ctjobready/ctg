JobReady is a Bangla-first career launchpad: bright, energetic and oriented toward progress. Every screen points toward a skill, a certificate, a job or more income. Build with confident blue on white, airy sky-blue bands, large dark headlines and real learner proof. Stay practical and motivational — never corporate, luxury or "generic SaaS".

## Content fundamentals

- **Write in Bangla first.** Headlines, body, CTAs and metadata are Bangla; English survives only as concise category labels ("Artificial Intelligence", "Digital Marketing", "Web Design").
- **Lead with outcomes.** Frame copy around the result: a skill, a certificate, a job, higher income. One concise supporting paragraph under each headline — not three.
- **Address the learner directly** in the imperative: "এখনই ভর্তি হোন" (Enrol now), "ফ্রি ক্লাস দেখুন" (Watch a free class).
- **Proof is specific and human:** a learner name, their role, one outcome sentence. Numbers appear as large figures with a short label ("১০,০০০+ শিক্ষার্থী").
- **No emoji.** Energy comes from colour, type scale and imagery.
- **Let Bangla wrap.** Keep long paragraphs at a comfortable measure; let headings wrap before reducing their size.

## Visual foundations

### Colour

- **Canvas is white.** Use `surface` for header, nav, cards and forms; `surface-container-low` (Airy Blue) for soft section bands, badges and hover fills; `surface-container` (Ice Cyan) for info callouts; `surface-variant` for subdued neutral bands. Light mode only — never default to a dark layout. `inverse-surface` is reserved for footers or deliberate high-contrast moments.
- **`primary` (JobReady Blue) carries trust and interaction:** main CTAs, links, active states, progress, icons, prices and stats. Hover with `blue-600`, press with `blue-700`.
- **`secondary` (Klein Blue) anchors structure:** section headings, register/newsletter actions, footer headings. Press with `klein-600`. Keep the split: Blue = the action, Klein = the frame.
- **`tertiary` (Career Orange) is a spark, not a surface:** star ratings, sale markers, one promotional accent per view. Never set text in it on white.
- **`cyan` is for the top promo-bar CTA** and fresh informational highlights only.
- Text: `on-surface` for headlines and priority text, `on-surface-variant` for body and navigation, `outline` for quiet metadata only, `surface-container-highest` for disabled.
- States use their own families — `success`/`success-subtle`/`success-strong`, `warning`/`warning-subtle`/`warning-strong`, `error`/`error-container`/`on-error-container`, `info`/`info-subtle`. Always pair a status colour with a word or icon. Never invent one-off colours.
- **Hero ground is a radial gradient** from `hero-gradient-center` to `hero-gradient-edge` — cool and luminous. Never a flat saturated blue block.
- **Contrast flags (source values kept exact in Light):** white on `primary` is 3.72:1 and `primary` text on white the same — fine for bold/24px+ labels, prices and stats, short of AA for 16px regular text; use `blue-600` for small links. `on-cyan` (white on cyan) is 2.1:1 as shipped. `outline` is 3.3:1: metadata only. Input borders (`surface-container-highest`) are 2.1:1.
- **Accessible (AA) theme** fixes every flagged pair without changing the palette's character: `primary` and `promo-strip` move to the Blue 600 value (5.34:1 under white), `on-cyan` becomes Ink Slate (6.85:1), `outline` darkens to 5.4:1, input borders reach 3.3:1, and orange and green marks reach 3:1+. Use it for any product surface that must meet WCAG 2.1 AA; the Light theme matches the live site.

### Type

- One family, `--font-sans`: D-DIN for Latin and numerals with Hind Siliguri for Bangla. The token intent for builds without D-DIN is `--font-intent` (Roboto + Hind Siliguri).
- Weights: 400 body, 500 small headings and buttons, 600 section headings, 700 display.
- Display and large headings use negative tracking (-1px; -0.5px at `heading-xl`) to keep long Bangla headlines compact. Body is neutral.
- Map: hero → `display-5xl`; major section → `display-4xl` or `heading-3xl`; widget → `heading-2xl`; card titles → `heading-l`; author names → `heading-m`; lead/quotes → `body-l`; default body, nav, labels, buttons → `body-base`; metadata, badges, captions → `body-xs`.
- Step down per breakpoint as each style's usage note says (e.g. `display-5xl` 44 → 36 → 32px). The existing homepage hero H1 renders at `heading-3xl` on desktop and 32/40 on mobile — match that only when recreating it exactly.

### Spacing & layout

- 4px base (`space-unit`); work mainly in `space-sm` (8), `space-gutter` (20) and `space-lg` (32).
- Content sits in a centred container of `content-max` (1200px) with a `space-gutter` (20px) minimum side gutter; header/utility rows may extend to `header-max` (1320px).
- Default gap between items is `space-gutter`. Separate major bands by 40–80px (`space-section-mobile`, `space-section-desktop`).
- Category cards pad 35px 30px 25px; course metadata groups pad 12–16px.
- Hero: two columns — copy, CTA and stats left; portrait right — stacking below `bp-tablet`. Page rhythm: eyebrow → headline → one paragraph → primary action → proof.
- Grids: 3 columns desktop, 2 at `bp-tablet`, 1 at `bp-mobile`. Carousels stay horizontally scrollable, one card per view on mobile; never squeeze commerce metadata.
- Validate at 390, 768 and 1200px.

### Shape, elevation, borders

- `radius-default` (8px) for buttons, inputs, category and course cards. `radius-md`/`radius-lg` only for roomy dashboard and account cards. `radius-pill` for badges, the eyebrow and search; `radius-full` for arrows and dots. `radius-sm` for the promo button and newsletter field.
- Elevation is soft and blue-tinted: `shadow-card` on white cards; `shadow-header` only when the header is scrolled. No glossy gradients, thick drop shadows or glassmorphism.
- Input borders are `surface-container-highest`; dividers `outline-variant`.

### States & focus

- Hover deepens blue (`primary` → `blue-600`) with a short colour transition; a slight grow is allowed on hero CTAs.
- Focus: a solid `primary` border/outline plus the 2px `powder-blue` ring (`shadow-focus`). Never remove focus styling.
- Category card hover/active fills with `primary` and turns the title white.

### Imagery

- Human and outcome-oriented: bright hero and course art for acquisition, learner photography (often grayscale) for proof.
- Partner logos and country lists sit in a quiet, lower-contrast strip — never louder than the enrolment CTA.

## Iconography

- Simple line icons at a consistent stroke: 40px above category labels, 16–20px in metadata rows, a right arrow on hero CTAs, blue search icon in the search field.
- The source's icon files were not supplied. The component previews use generic stroke icons (arrow, search, menu, cart, book, clock, video, play, chevrons) as stand-ins — replace them with JobReady's own set.
- No emoji or illustrative glyphs as icons.

## Logo

No logo file was supplied. Set "JobReady" in plain `secondary` text until the real mark is added to an `assets/Logos` group; never redraw it.

## Components

Buttons (`Button`), badges (`Badge`), `CategoryCard`, `CourseCard`, navigation (`PromoBar`, `SiteHeader`), forms (`SearchField`, `TextField`, `NewsletterForm`), proof and outcomes (`Stat`, `ProgressBar`, `SuccessStoryCard`, `Testimonial`, `PartnerStrip`), carousel controls (`CarouselControls`) and the `Hero` composition. Keep testimonials, stats and partner proof quieter than the primary enrolment CTA.
