# CourseCard

The commerce card used in course carousels and grids: image, sale badge, metadata, price, then the enrolment action.

**Consumer provides:** `title`, `image` (+`imageAlt`), optional `discount`, `meta` (class count, duration, delivery mode — each `{icon,label}`), `price`, optional `oldPrice`, `href`/`onEnroll`, `actionLabel`.

- Order is fixed: metadata before price; the action closes the card.
- `price` is the large `primary` figure; `oldPrice` is small, struck-through `outline` — always subordinate.
- `radius-default`, `shadow-card`, 16px body padding; the `enroll` button spans the full width.
- In carousels show one card per view on mobile; never squeeze the metadata row.
