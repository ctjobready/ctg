import { url } from './url';

/** Self-hosted D-DIN (SIL OFL 1.1) + metric-matched fallback. Emitted inline so font URLs respect the base path. */
export const FONT_PRELOADS = ['fonts/d-din/D-DIN.woff2', 'fonts/d-din/D-DIN-Bold.woff2'] as const;

export function fontFaceCss(): string {
  const f = (file: string) => url('/' + file);
  return `
@font-face{font-family:"D-DIN";font-style:normal;font-weight:400;font-display:swap;src:url("${f('fonts/d-din/D-DIN.woff2')}") format("woff2")}
@font-face{font-family:"D-DIN";font-style:normal;font-weight:700;font-display:swap;src:url("${f('fonts/d-din/D-DIN-Bold.woff2')}") format("woff2")}
@font-face{font-family:"D-DIN";font-style:italic;font-weight:400;font-display:swap;src:url("${f('fonts/d-din/D-DIN-Italic.woff2')}") format("woff2")}
@font-face{font-family:"D-DIN Fallback";font-style:normal;font-weight:400;src:local("Arial"),local("ArialMT");size-adjust:94.38%;ascent-override:88.05%;descent-override:17.91%;line-gap-override:9.11%}
@font-face{font-family:"D-DIN Fallback";font-style:normal;font-weight:700;src:local("Arial Bold"),local("Arial-BoldMT");size-adjust:88.87%;ascent-override:93.5%;descent-override:19.02%;line-gap-override:9.68%}
`.trim();
}
