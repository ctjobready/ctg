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
  | 'fundingYouthwide'
  | 'fundingPlatform'
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
  | 'role'
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

/** Existing NU Post Graduate Diploma application form. */
export const NU_PGD_APPLY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScm4K2bBY83VmcOgYfuMpK9RC91jhULnKFo479dug8strodtA/viewform';

export const CTAS: Record<CtaKey, CtaDef> = {
  discovery: {
    key: 'discovery',
    label: 'Request a Discovery Session',
    subject: 'Discovery session request — [your organization]',
    // WP166-A (marketing review R7-01, owner approval of 21 November 2026): the email behind the site's main button asks who is writing and for the time zone of the two
    // times, and folds the cohort questions (priority groups, trainees, timeline) into one optional line, so a reader who is not yet a cohort buyer can still send it.
    body: [
      'Organization',
      'Your name and role',
      'Country/region',
      'What you want to achieve (groups, numbers and timeline, if known)',
      'Two suitable times for a discovery session (with your time zone)',
    ],
  },
  // WP166-A (R7-30): every template that asks for two times asks for the time zone too, and every template has a line for the sender (Governments has "Contact person",
  // Investors "Name and role"; the others gain "Your name and role" after their first field).
  briefing: {
    key: 'briefing',
    label: 'Request a Briefing for Your Ministry',
    subject: 'Briefing request — [ministry/agency]',
    body: ['Ministry or agency', 'Country', 'Priority groups and locations', 'Target number of trainees', 'Contact person', 'Two suitable times for a briefing (with your time zone)'], // WP161-A (adversarial review A-31): the fields the Governments page's agenda names
  },
  funding: {
    key: 'funding',
    // WP166-A (R7-23): a verb that says what happens (the button opens an email), not the browsing verb "Explore".
    label: 'Discuss a Funding Partnership',
    subject: 'Funding partnership — [foundation/company]',
    body: ['Organization', 'Your name and role', 'Focus regions', 'Interest: platform grant / YouthWIDE cohort', 'Timeline', 'Two suitable times for a discovery session (with your time zone)'],
  },
  /** WP27: the two funding routes on /partner-with-us/foundations/ (hero text links), each with its own prefilled subject so the team sees which route the sender means. */
  fundingYouthwide: {
    key: 'fundingYouthwide',
    label: 'Discuss a YouthWIDE Cohort Grant',
    subject: 'YouthWIDE cohort grant — [foundation/company]',
    body: ['Organization', 'Your name and role', 'Focus regions', 'Priority groups', 'Timeline', 'Two suitable times for a discovery session (with your time zone)'],
  },
  fundingPlatform: {
    key: 'fundingPlatform',
    label: 'Discuss a JobReady Platform Grant',
    subject: 'JobReady platform grant — [foundation/company]',
    body: ['Organization', 'Your name and role', 'Questions about the platform grant', 'Timeline', 'Two suitable times for a discovery session (with your time zone)'],
  },
  /** YouthWIDE in Bangladesh (/programs/youthwide/): the secondary CTA for national funders, in place of `funding` (review round 15, F4): districts and priority groups, not a platform grant. */
  nationalFunding: {
    key: 'nationalFunding',
    label: 'Explore Co-Funding YouthWIDE in Bangladesh',
    subject: 'YouthWIDE co-funding in Bangladesh — [organization]',
    body: ['Organization', 'Your name and role', 'Funding scope (districts, priority groups)', 'Approximate trainees', 'Timeline', 'Two suitable times for a discovery session (with your time zone)'],
  },
  investor: {
    key: 'investor',
    label: 'Request an Introduction Call',
    subject: 'Introduction call request — [firm]',
    body: ['Firm', 'Name and role', 'Impact focus', 'Two suitable times for an introduction call (with your time zone)'],
  },
  campus: {
    key: 'campus',
    label: 'Bring JobReady@Campus to Your Institution',
    subject: 'JobReady@Campus inquiry — [institution]',
    body: ['Institution', 'Your name and role', 'Country', 'Students you have in mind (approximate number)', 'Programs of interest', 'Two suitable times for a discovery session (with your time zone)'], // WP161-A (adversarial review A-31)
  },
  work: {
    key: 'work',
    label: 'Plan Your First Team Program',
    subject: 'JobReady@Work inquiry — [company]',
    body: ['Company', 'Your name and role', 'Team size', 'Skills needed', 'Timeline', 'Two suitable times for a discovery session (with your time zone)'],
  },
  talent: {
    key: 'talent',
    label: 'Hire JobReady Talent',
    subject: 'Talent request — [company]',
    body: ['Company', 'Your name and role', 'Roles', 'Number of hires', 'Location/remote', 'Two suitable times for a discovery session (with your time zone)'],
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
    // WP166-A (R7-24): a verb first, as every other email button.
    label: 'Send a Media Inquiry',
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
      'Your name and role',
      'Type (NGO, college, chamber, association)',
      'District',
      'Groups you work with',
      'Facilities (labs, classrooms)',
      'Two suitable times for a discovery session (with your time zone)',
    ],
  },
  /** Opens a conversation; no ready document set is promised (PD-13b is unverified, `U`). */
  diligence: {
    key: 'diligence',
    label: 'Ask About Due Diligence',
    subject: 'Due-diligence inquiry — [organization]',
    body: ['Organization', 'Program, grant or contract under consideration', 'Questions or documents you need', 'Deadline'], // WP161-A (adversarial review A-31): a contract too (governments, employers)
  },
  /** Careers page: applications go to the CodersTrust Bangladesh HR team (address from the legacy careers page). */
  careers: {
    key: 'careers',
    // WP166-A (R7-25, R7-27): the button asks for what the page asks for (a resume), in American usage ("speculative application" is British), and the email
    // takes an attached file or a link. WP168-A: the open roles have their own button (`role`, below); this one stays for a resume sent without a listed role.
    label: 'Send Your Resume',
    to: 'career@coderstrustbd.com', // CAREERS_EMAIL (checked below)
    subject: 'Resume — [your name]',
    body: ['Name', 'Area of work you are interested in', 'Location', 'Resume attached (or link to your resume or portfolio)'],
  },
  /**
   * WP168-A (owner decision of 24 November 2026): "Apply for This Role" on each /careers/<slug>/ page, to the same HR address. The subject names the role
   * (roleApplyHref() in src/lib/mailto.ts puts the role title in place of "[role title]"), and the body asks for what the old job posts asked applicants to
   * give in the email (availability for joining and interviews, minimum desired compensation, the location applied for, contact information), plus the resume.
   */
  role: {
    key: 'role',
    label: 'Apply for This Role',
    to: 'career@coderstrustbd.com', // CAREERS_EMAIL (checked below)
    subject: 'Application: [role title]',
    body: [
      'Name',
      'Earliest availability for joining',
      'Earliest availability for interviews',
      'Interview availability time windows',
      'Minimum desired compensation (monthly salary in BDT)',
      'Job location applying for',
      'Contact information',
      'Resume attached (or link to your resume or portfolio)',
    ],
  },
  /** Mentor applications (About / Mentors): same pattern as `media`, general address. */
  mentor: {
    key: 'mentor',
    // WP166-A (R1-37, R7-24): a verb first, in the words of the Mentors page's closing heading ("Become a Mentor").
    label: 'Apply to Become a Mentor',
    subject: 'Mentor application — [your name]',
    body: ['Name', 'Area of expertise', 'Years of experience', 'LinkedIn or portfolio link', 'Availability'],
  },
  /** SuperKids schools and education partners: the `discovery` conversation with school-specific fields. */
  superkids: {
    key: 'superkids',
    label: 'Request a Discovery Session',
    subject: 'SuperKids discovery session request — [school or organization]',
    body: ['School or organization', 'Your name and role', 'Location', 'Age groups', 'Approx. number of learners', 'Preferred timeline', 'Two suitable times for a discovery session (with your time zone)'],
  },
  'nu-pgd': {
    key: 'nu-pgd',
    label: 'Apply Now',
    href: NU_PGD_APPLY_URL,
    // Non-breaking spaces: html-validate (tel-non-breaking) treats every space in a tel: link as a phone-number break.
    // The label shows the number (the same one as the tel: href and the Bangladesh office in src/lib/site.ts), in its non-breaking form.
    secondary: { label: 'Call\u00A0Admissions:\u00A0+880\u00A01958\u2011220802', href: 'tel:+8801958220802' },
  },
};

// The two literal addresses above must equal the site contact data (the CTAS literal stays sandbox-evaluable).
if (CTAS.local.to !== BANGLADESH_HQ.email || CTAS.careers.to !== CAREERS_EMAIL || CTAS.role.to !== CAREERS_EMAIL) {
  throw new Error('src/data/ctas.ts: `local`/`careers`/`role` recipients are out of step with src/lib/site.ts');
}

export const CTA_KEYS = Object.keys(CTAS) as CtaKey[];
