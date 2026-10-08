/// <reference types="astro/client" />

/** Injected by astro.config.mjs (vite.define): "staging" | "production". */
declare const __SITE_ENV__: 'staging' | 'production';

declare namespace App {
  interface Locals {
    /** Per-page footnote collector (see src/lib/footnotes.ts). */
    footnotes?: import('./lib/footnotes').Footnotes;
  }
}
