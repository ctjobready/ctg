# Button

Buttons carry the conversion path: one solid JobReady Blue action per view, with quieter variants around it.

**Consumer provides:** `children` (a short Bangla verb phrase), `variant`, optional `href` (renders an `<a>`), `icon`/`iconEnd`, `onClick`.

- `primary` — the dominant conversion action (hero, checkout). 48px tall, 8px corners, `primary` fill, `on-primary` label. Pair hero CTAs with `iconEnd="arrow-right"`.
- `secondary` — Klein Blue register and newsletter actions (50px tall).
- `outline` — Klein Blue outline on white, e.g. login beside register.
- `promo` — compact cyan action inside `PromoBar` only.
- `enroll` — pale-blue, full-width course-card action; deliberately quieter so commerce grids stay scannable.
- `size="sm"` — 40px for header actions.

Do: one `primary` per viewport region. Hover deepens to `blue-600`; focus shows the `powder-blue` ring.
Don't: add gradients or heavy shadows, or use orange as the main CTA.
