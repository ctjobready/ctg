/**
 * CTA library (planning/04 §7, Decision D3). All inquiry CTAs are prefilled mailto links to
 * contact@coderstrust.global (the `local` key goes to the Bangladesh team, ID-07, and `careers` to the
 * Bangladesh HR address); build hrefs with `ctaHref(key)` from `lib/mailto.ts`.
 *
 * Keep the `CTAS` object literal self-contained (string literals only, plus NU_PGD_APPLY_URL and
 * CTA_RECIPIENT): scripts/lib/dist.mjs evaluates exactly that literal in a sandbox to learn the subjects and
 * body fields that the link check compares every mailto: on the built site against. The guard below the
 * object keeps the two literal addresses in step with src/lib/site.ts.
 */
import { BANGLADESH_HQ, CAREERS_EMAIL, CONTACT } from '../lib/site';

export type CtaKey =
  | 'discovery'
  | 'briefing'
  | 'funding'
  | 'investor'
  | 'campus'
  | 'work'
  | 'talent'
  | 'report'
  | 'media'
  | 'local'
  | 'diligence'
  | 'careers'
  | 'mentor'
  | 'superkids'
  | 'nu-pgd';

export interface CtaDef {
  key: CtaKey;
  /** Button label (outcome-framed). */
  label: string;
  /** Recipient when it is not the general address (`local` goes to the Bangladesh team). */
  to?: string;
  /** Prefilled subject. "[…]" marks the part the sender completes. Absent for non-mailto CTAs. */
  subject?: string;
  /** One field per line in the prefilled body. */
  body?: string[];
  /** Non-mailto destination (NU PGD Google Form). */
  href?: string;
  /** Optional secondary action shown beside the CTA. */
  secondary?: { label: string; href: string };
}

export const CTA_RECIPIENT = CONTACT.email;

/** Existing NU Postgraduate Diploma application form. */
export const NU_PGD_APPLY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdN0J_VMgh0FYMTTx9DNRVYn840X0XGTVwhVzmjC6YsmJf1rg/viewform';

export const CTAS: Record<CtaKey, CtaDef> = {
  discovery: {
    key: 'discovery',
    label: 'Book a discovery session',
    subject: 'Discovery session request — [your organization]',
    body: [
      'Organization',
      'Country/region',
      'Priority groups',
      'Approx. number of trainees',
      'Preferred timeline',
      'Two suitable times for a discovery conversation',
    ],
  },
  briefing: {
    key: 'briefing',
    label: 'Request a briefing for your ministry',
    subject: 'Briefing request — [ministry/agency]',
    body: ['Agency', 'Program/target', 'Contact person', 'Preferred dates'],
  },
  funding: {
    key: 'funding',
    label: 'Explore a funding partnership',
    subject: 'Funding partnership — [foundation/company]',
    body: ['Organization', 'Focus regions', 'Interest: platform grant / YouthWIDE cohort', 'Timeline'],
  },
  investor: {
    key: 'investor',
    label: 'Request the investor deck',
    subject: 'Investor deck request — [firm]',
    body: ['Firm', 'Name & role', 'Investment focus', 'Preferred time for an introduction call'],
  },
  campus: {
    key: 'campus',
    label: 'Bring JobReady@Campus to your institution',
    subject: 'JobReady@Campus inquiry — [institution]',
    body: ['Institution', 'Number of students', 'Programs of interest'],
  },
  work: {
    key: 'work',
    label: 'Plan a training program',
    subject: 'JobReady@Work inquiry — [company]',
    body: ['Company', 'Team size', 'Skills needed', 'Timeline'],
  },
  talent: {
    key: 'talent',
    label: 'Hire JobReady talent',
    subject: 'Talent request — [company]',
    body: ['Company', 'Roles', 'Number of hires', 'Location/remote'],
  },
  /** Withheld while REPORT_EDITION_READY is false (src/lib/site.ts): `cta('report')` then returns an empty href and nothing renders. */
  report: {
    key: 'report',
    label: 'Request the Impact Report 2026 (partner edition)',
    subject: 'Impact Report 2026 (partner edition) request',
    body: ['Name', 'Organization', 'Purpose'],
  },
  media: {
    key: 'media',
    label: 'Media inquiries',
    subject: 'Media inquiry — [outlet]',
    body: ['Outlet', 'Deadline', 'Topic'],
  },
  local: {
    key: 'local',
    label: 'Talk to our Bangladesh team',
    to: 'hello@coderstrustbd.com', // BANGLADESH_HQ.email (checked below)
    subject: 'Local partnership inquiry — [organization]',
    body: [
      'Organization',
      'Type (NGO, college, chamber, association)',
      'District',
      'Groups you work with',
      'Facilities (labs, classrooms)',
      'Best times to talk',
    ],
  },
  /** Opens a conversation; no ready document set is promised (PD-13b is unverified, `U`). */
  diligence: {
    key: 'diligence',
    label: 'Ask about due diligence',
    subject: 'Due-diligence inquiry — [organization]',
    body: ['Organization', 'Program or grant under consideration', 'Questions or documents you need', 'Deadline'],
  },
  /** Careers page: applications go to the CodersTrust Bangladesh HR team (address from the legacy careers page). */
  careers: {
    key: 'careers',
    label: 'Send your CV',
    to: 'career@coderstrustbd.com', // CAREERS_EMAIL (checked below)
    subject: 'Application — [role or "speculative application"]',
    body: ['Name', 'Role you are applying for (or "speculative application")', 'Location', 'Link to your CV or portfolio'],
  },
  /** Mentor applications (About / Mentors): same pattern as `media`, general address. */
  mentor: {
    key: 'mentor',
    label: 'Mentor application',
    subject: 'Mentor application — [your name]',
    body: ['Name', 'Area of expertise', 'Years of experience', 'LinkedIn or portfolio link', 'Availability'],
  },
  /** SuperKids schools and education partners: the `discovery` conversation with school-specific fields. */
  superkids: {
    key: 'superkids',
    label: 'Book a discovery session',
    subject: 'SuperKids discovery session request — [school or organization]',
    body: ['School or organization', 'Location', 'Age groups', 'Approx. number of learners', 'Preferred timeline', 'Two suitable times for a discovery conversation'],
  },
  'nu-pgd': {
    key: 'nu-pgd',
    label: 'Apply now',
    href: NU_PGD_APPLY_URL,
    // Non-breaking spaces: html-validate (tel-non-breaking) treats every space in a tel: link as a phone-number break.
    secondary: { label: 'Call to enroll', href: 'tel:+8801958220802' },
  },
};

// The two literal addresses above must equal the site contact data (the CTAS literal stays sandbox-evaluable).
if (CTAS.local.to !== BANGLADESH_HQ.email || CTAS.careers.to !== CAREERS_EMAIL) {
  throw new Error('src/data/ctas.ts: `local`/`careers` recipients are out of step with src/lib/site.ts');
}

export const CTA_KEYS = Object.keys(CTAS) as CtaKey[];
