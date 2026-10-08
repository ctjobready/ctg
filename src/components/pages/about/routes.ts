/**
 * Page-local CTA definitions for WP8 pages. The shared CTA library (src/data/ctas.ts) has no `local`
 * or `diligence` key yet and its `report` label predates the partner-edition decision (planning/04 §7,
 * D9). These helpers build the same kind of prefilled mailto links with the shared builders, so
 * nothing about the library's behavior is duplicated. Request for the shared library: add `local`,
 * `diligence` and the §7 `report` wording.
 */
import { BANGLADESH_HQ, CONTACT, COURSES_URL } from '../../../lib/site';
import { bodyTemplate, cta, mailto } from '../../../lib/mailto';
import { NU_PGD_APPLY_URL, type CtaKey } from '../../../data/ctas';

export interface LocalCta {
  key: string;
  label: string;
  href: string;
}

function build(key: string, label: string, subject: string, body: string[], to?: string): LocalCta {
  return { key, label, href: mailto({ to, subject, body: bodyTemplate(body) }) };
}

/** `local` — goes to the Bangladesh team (ID-07). */
export const localCta = (): LocalCta =>
  build(
    'local',
    'Talk to our Bangladesh team',
    'Local partnership enquiry — [organization]',
    ['Organization', 'Type (NGO, college, chamber, association)', 'District', 'Groups you work with', 'Facilities (labs, classrooms)', 'Best times to talk'],
    BANGLADESH_HQ.email,
  );

/** `diligence` — opens a conversation; no ready document set is promised (PD-13b is unverified). */
export const diligenceCta = (): LocalCta =>
  build('diligence', 'Ask about due diligence', 'Due-diligence enquiry — [organization]', [
    'Organization',
    'Program or grant under consideration',
    'Questions or documents you need',
    'Deadline',
  ]);

/** `report` — partner edition only (planning/04 §7). */
export const reportCta = (): LocalCta =>
  build('report', 'Request the Impact Report 2026 (partner edition)', 'Impact Report 2026 (partner edition) request', ['Name', 'Organization', 'Purpose']);

/** Mentor applications (P29): same mailto pattern as the `media` key. */
export const mentorCta = (): LocalCta =>
  build('mentor', 'Mentor application', 'Mentor application — [your name]', [
    'Name',
    'Area of expertise',
    'Years of experience',
    'LinkedIn or portfolio link',
    'Availability',
  ]);

/** Careers: the HR address published on the legacy careers pages. */
export const CAREERS_EMAIL = 'career@coderstrustbd.com';
export const careersCta = (label = 'Send your CV'): LocalCta =>
  build(
    'careers',
    label,
    'Application — [role or "speculative application"]',
    ['Name', 'Role you are applying for (or "speculative application")', 'Location', 'Link to your CV or portfolio'],
    CAREERS_EMAIL,
  );

const fromLibrary = (key: CtaKey): LocalCta => {
  const c = cta(key);
  return { key, label: c.label, href: c.href };
};

export interface ContactRoute {
  id: string;
  /** Who the route is for. */
  who: string;
  /** What the enquiry is for, in one sentence. */
  text: string;
  icon: string;
  cta: LocalCta;
  /** Extra secondary link. */
  secondary?: { label: string; href: string };
}

/** Enquiry routes for /contact/ — every mailto comes from the CTA library (planning/04 §7). */
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
    cta: { key: 'nu-pgd', label: 'Apply now', href: NU_PGD_APPLY_URL },
    secondary: { label: 'Call to enroll', href: 'tel:+8801958220802' },
  },
  { id: 'learners', who: 'Learners looking for courses', text: 'Courses, enrollment and learner support are on JobReady.global.', icon: 'book-open', cta: { key: 'learners', label: 'Go to JobReady.global', href: COURSES_URL } },
];

export const GENERAL_EMAIL = CONTACT.email;

/** "Open in Maps" link for an address (a plain search link: no embedded map, no script). */
export const mapsHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
