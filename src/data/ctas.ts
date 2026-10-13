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
  | 'nationalFunding'
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
  'https://docs.google.com/forms/d/e/1FAIpQLScm4K2bBY83VmcOgYfuMpK9RC91jhULnKFo479dug8strodtA/viewform';

export const CTAS: Record<CtaKey, CtaDef> = {
  discovery: {
    key: 'discovery',
    label: 'Request a Discovery Session',
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
    label: 'Request a Briefing for Your Ministry',
    subject: 'Briefing request — [ministry/agency]',
    body: ['Agency', 'Program/target', 'Contact person', 'Preferred dates'],
  },
  funding: {
    key: 'funding',
    label: 'Explore a Funding Partnership',
    subject: 'Funding partnership — [foundation/company]',
    body: ['Organization', 'Focus regions', 'Interest: platform grant / YouthWIDE cohort', 'Timeline'],
  },
  /** YouthWIDE in Bangladesh (/programs/youthwide/): the secondary CTA for national funders, in place of `funding` (review round 15, F4): districts and priority groups, not a platform grant. */
  nationalFunding: {
    key: 'nationalFunding',
    label: 'Explore Co-Funding YouthWIDE in Bangladesh',
    subject: 'YouthWIDE co-funding in Bangladesh — [organization]',
    body: ['Organization', 'Funding scope (districts, priority groups)', 'Approximate trainees', 'Timeline'],
  },
  investor: {
    key: 'investor',
    label: 'Request an Introduction Call',
    subject: 'Introduction call request — [firm]',
    body: ['Firm', 'Name & role', 'Investment focus', 'Preferred time for an introduction call'],
  },
  campus: {
    key: 'campus',
    label: 'Bring JobReady@Campus to Your Institution',
    subject: 'JobReady@Campus inquiry — [institution]',
    body: ['Institution', 'Number of students', 'Programs of interest'],
  },
  work: {
    key: 'work',
    label: 'Plan a Training Program',
    subject: 'JobReady@Work inquiry — [company]',
    body: ['Company', 'Team size', 'Skills needed', 'Timeline'],
  },
  talent: {
    key: 'talent',
    label: 'Hire JobReady Talent',
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
    label: 'Media Inquiries',
    subject: 'Media inquiry — [outlet]',
    body: ['Outlet', 'Deadline', 'Topic'],
  },
  local: {
    key: 'local',
    label: 'Talk to Our Bangladesh Team',
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
    label: 'Ask About Due Diligence',
    subject: 'Due-diligence inquiry — [organization]',
    body: ['Organization', 'Program or grant under consideration', 'Questions or documents you need', 'Deadline'],
  },
  /** Careers page: applications go to the CodersTrust Bangladesh HR team (address from the legacy careers page). */
  careers: {
    key: 'careers',
    label: 'Send Your CV',
    to: 'career@coderstrustbd.com', // CAREERS_EMAIL (checked below)
    subject: 'Application — [role or "speculative application"]',
    body: ['Name', 'Role you are applying for (or "speculative application")', 'Location', 'Link to your CV or portfolio'],
  },
  /** Mentor applications (About / Mentors): same pattern as `media`, general address. */
  mentor: {
    key: 'mentor',
    label: 'Mentor Application',
    subject: 'Mentor application — [your name]',
    body: ['Name', 'Area of expertise', 'Years of experience', 'LinkedIn or portfolio link', 'Availability'],
  },
  /** SuperKids schools and education partners: the `discovery` conversation with school-specific fields. */
  superkids: {
    key: 'superkids',
    label: 'Request a Discovery Session',
    subject: 'SuperKids discovery session request — [school or organization]',
    body: ['School or organization', 'Location', 'Age groups', 'Approx. number of learners', 'Preferred timeline', 'Two suitable times for a discovery conversation'],
  },
  'nu-pgd': {
    key: 'nu-pgd',
    label: 'Apply Now',
    href: NU_PGD_APPLY_URL,
    // Non-breaking spaces: html-validate (tel-non-breaking) treats every space in a tel: link as a phone-number break.
    // The label shows the number (the same one as the tel: href and the Bangladesh office in src/lib/site.ts), in its non-breaking form.
    secondary: { label: 'Call\u00A0to\u00A0Enroll:\u00A0+880\u00A01958\u2011220802', href: 'tel:+8801958220802' },
  },
};

// The two literal addresses above must equal the site contact data (the CTAS literal stays sandbox-evaluable).
if (CTAS.local.to !== BANGLADESH_HQ.email || CTAS.careers.to !== CAREERS_EMAIL) {
  throw new Error('src/data/ctas.ts: `local`/`careers` recipients are out of step with src/lib/site.ts');
}

export const CTA_KEYS = Object.keys(CTAS) as CtaKey[];
