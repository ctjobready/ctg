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
  { id: 'discovery', who: 'Development Partners and NGOs', text: 'Design a first cohort with us: priority groups, tracks and the pilot scorecard.', icon: 'globe', cta: fromLibrary('discovery') },
  { id: 'briefing', who: 'Governments and Ministries', text: 'A briefing on national programs, contract scopes and delivery through existing labs.', icon: 'landmark', cta: fromLibrary('briefing') },
  { id: 'funding', who: 'Foundations and CSR Teams', text: 'Explore a funding partnership for a supported path from learning to earning.', icon: 'heart-handshake', cta: fromLibrary('funding') },
  { id: 'investor', who: 'Impact Investors', text: 'An introduction call; the deck and data room follow under NDA.', icon: 'trending-up', cta: fromLibrary('investor') },
  { id: 'campus', who: 'Universities and Colleges', text: 'Bring industry-certification preparation and placement support to your students.', icon: 'graduation-cap', cta: fromLibrary('campus') },
  { id: 'work', who: 'Employers: Train Your Team', text: 'A training program scoped to your team and the skills your roles need.', icon: 'briefcase', cta: fromLibrary('work') },
  { id: 'talent', who: 'Employers: Hire Talent', text: 'Connect with job-ready digital talent through the placement team.', icon: 'users', cta: fromLibrary('talent') },
  // WP36 (cycle-13 review): schools and education partners had no route of their own; this reuses SuperKids' inquiry (same address and prefilled subject), so no new address or form.
  { id: 'schools', who: 'Schools and Education Partners', text: 'Explore coding, robotics and digital art for your learners.', icon: 'school', cta: fromLibrary('superkids') },
  { id: 'local', who: 'Local Partners in Bangladesh', text: 'NGOs, colleges, chambers and associations delivering in their communities. This goes to the Bangladesh team.', icon: 'map-pin', cta: localCta() },
  { id: 'diligence', who: 'Due-Diligence Teams', text: 'Questions about the contracting entity, safeguarding and the documents a funder needs.', icon: 'shield', cta: diligenceCta(), secondary: { label: 'Read about governance', href: '/about/governance/' } },
  { id: 'report', who: 'Partners reading the evidence', text: 'The partner edition of the Impact Report 2026.', icon: 'file-text', cta: reportCta(), secondary: { label: 'Impact Survey 2026', href: '/impact/outcomes-2026/' } },
  { id: 'media', who: 'Journalists and Media', text: 'Interviews, background and the press kit.', icon: 'mail', cta: fromLibrary('media'), secondary: { label: 'Press Kit', href: '/about/recognition/#press-kit' } },
  {
    id: 'nu-pgd',
    who: 'NU Postgraduate Diploma Applicants',
    text: 'Apply through the application form, or call the admissions team.',
    icon: 'graduation-cap',
    cta: { key: 'nu-pgd', label: CTAS['nu-pgd'].label, href: NU_PGD_APPLY_URL },
    secondary: CTAS['nu-pgd'].secondary,
  },
  { id: 'learners', who: 'Learners Looking for Courses', text: 'Courses, enrollment and learner support are on JobReady.global.', icon: 'book-open', cta: { key: 'learners', label: 'Go to JobReady.global', href: COURSES_URL } },
  // a withheld CTA (empty href, see ctaWithheld in src/lib/mailto.ts) has no route
].filter((r) => r.cta.href);

export const GENERAL_EMAIL = CONTACT.email;

/** "Open in Maps" link for an address (a plain search link: no embedded map, no script). */
export const mapsHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
