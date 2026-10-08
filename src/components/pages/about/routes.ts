/**
 * Page-local CTA helpers for WP8 pages. Every inquiry route (`local`, `diligence`, `report`, `mentor`,
 * `careers`, ...) comes from the shared CTA library (src/data/ctas.ts, planning/04 §7).
 */
import { CONTACT, COURSES_URL } from '../../../lib/site';
import { cta } from '../../../lib/mailto';
import { CTAS, NU_PGD_APPLY_URL, type CtaKey } from '../../../data/ctas';

export interface LocalCta {
  key: string;
  label: string;
  href: string;
}

const fromLibrary = (key: CtaKey): LocalCta => {
  const c = cta(key);
  return { key, label: c.label, href: c.href };
};

/** `local` — goes to the Bangladesh team (ID-07). */
export const localCta = (): LocalCta => fromLibrary('local');
/** `diligence` — opens a conversation; no ready document set is promised (PD-13b is unverified). */
export const diligenceCta = (): LocalCta => fromLibrary('diligence');
/** `report` — partner edition only (planning/04 §7). */
export const reportCta = (): LocalCta => fromLibrary('report');

export interface ContactRoute {
  id: string;
  /** Who the route is for. */
  who: string;
  /** What the inquiry is for, in one sentence. */
  text: string;
  icon: string;
  cta: LocalCta;
  /** Extra secondary link. */
  secondary?: { label: string; href: string };
}

/** Inquiry routes for /contact/ — every mailto comes from the CTA library (planning/04 §7). */
export const contactRoutes = (): ContactRoute[] => [
  { id: 'discovery', who: 'Development partners and NGOs', text: 'Design a first cohort with us: priority groups, tracks and the pilot scorecard.', icon: 'globe', cta: fromLibrary('discovery') },
  { id: 'briefing', who: 'Governments and ministries', text: 'A briefing on national programs, contract scopes and delivery through existing labs.', icon: 'landmark', cta: fromLibrary('briefing') },
  { id: 'funding', who: 'Foundations and CSR teams', text: 'Explore a funding partnership for a supported path from learning to earning.', icon: 'heart-handshake', cta: fromLibrary('funding') },
  { id: 'investor', who: 'Investors', text: 'The investor deck and an introduction call.', icon: 'trending-up', cta: fromLibrary('investor') },
  { id: 'campus', who: 'Universities and colleges', text: 'Bring industry certifications and placement support to your students.', icon: 'graduation-cap', cta: fromLibrary('campus') },
  { id: 'work', who: 'Employers: train your team', text: 'A training program scoped to your team and the skills your roles need.', icon: 'briefcase', cta: fromLibrary('work') },
  { id: 'talent', who: 'Employers: hire talent', text: 'Job-ready, certified digital talent through the placement team.', icon: 'users', cta: fromLibrary('talent') },
  { id: 'local', who: 'Local partners in Bangladesh', text: 'NGOs, colleges, chambers and associations delivering in their communities. This goes to the Bangladesh team.', icon: 'map-pin', cta: localCta() },
  { id: 'diligence', who: 'Due-diligence teams', text: 'Questions about the contracting entity, safeguarding and the documents a funder needs.', icon: 'shield', cta: diligenceCta(), secondary: { label: 'Read about governance', href: '/about/governance/' } },
  { id: 'report', who: 'Partners reading the evidence', text: 'The partner edition of the Impact Report 2026.', icon: 'file-text', cta: reportCta(), secondary: { label: 'Outcomes 2026', href: '/impact/outcomes-2026/' } },
  { id: 'media', who: 'Journalists and media', text: 'Interviews, background and the press kit.', icon: 'mail', cta: fromLibrary('media'), secondary: { label: 'Press kit', href: '/about/recognition/#press-kit' } },
  {
    id: 'nu-pgd',
    who: 'National University diploma applicants',
    text: 'Apply through the existing application form, or call the admissions team.',
    icon: 'graduation-cap',
    cta: { key: 'nu-pgd', label: CTAS['nu-pgd'].label, href: NU_PGD_APPLY_URL },
    secondary: CTAS['nu-pgd'].secondary,
  },
  { id: 'learners', who: 'Learners looking for courses', text: 'Courses, enrollment and learner support are on JobReady.global.', icon: 'book-open', cta: { key: 'learners', label: 'Go to JobReady.global', href: COURSES_URL } },
];

export const GENERAL_EMAIL = CONTACT.email;

/** "Open in Maps" link for an address (a plain search link: no embedded map, no script). */
export const mapsHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
