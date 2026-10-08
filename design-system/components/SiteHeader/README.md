# SiteHeader

Two-tier acquisition header: `PromoBar`, then a white row with menu, logo, navigation, pill search, cart and login/register.

**Consumer provides:** `logo` (the real mark — until supplied it renders the name in `secondary` text), `links`, `promo`, `cartCount`, labels, `scrolled`.

- White background; add `shadow-header` only when `scrolled`.
- Nav links are `on-surface-variant`, turning `primary` with an underline on hover/current.
- Container max width is `header-max` (1320px).
- Mobile: centre the logo on its own row, move search below it, keep menu and cart visible, collapse nav behind the menu.
