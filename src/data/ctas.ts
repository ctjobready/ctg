/**
 * CTA library (planning/04 §7, Decision D3). All enquiry CTAs are prefilled mailto links to
 * contact@coderstrust.global (the `local` key goes to the Bangladesh team, ID-07); build hrefs with
 * `ctaHref(key)` from `lib/mailto.ts`.
 */
import { BANGLADESH_HQ, CONTACT } from '../lib/site';

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
    subject: 'JobReady@Campus enquiry — [institution]',
    body: ['Institution', 'Number of students', 'Programs of interest'],
  },
  work: {
    key: 'work',
    label: 'Plan a training program',
    subject: 'JobReady@Work enquiry — [company]',
    body: ['Company', 'Team size', 'Skills needed', 'Timeline'],
  },
  talent: {
    key: 'talent',
    label: 'Hire JobReady talent',
    subject: 'Talent request — [company]',
    body: ['Company', 'Roles', 'Number of hires', 'Location/remote'],
  },
  report: {
    key: 'report',
    label: 'Request the Impact Report 2026 (partner edition)',
    subject: 'Impact Report 2026 (partner edition) request',
    body: ['Name', 'Organization', 'Purpose'],
  },
  media: {
    key: 'media',
    label: 'Media enquiries',
    subject: 'Media enquiry — [outlet]',
    body: ['Outlet', 'Deadline', 'Topic'],
  },
  local: {
    key: 'local',
    label: 'Talk to our Bangladesh team',
    to: BANGLADESH_HQ.email,
    subject: 'Local partnership enquiry — [organization]',
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
    subject: 'Due-diligence enquiry — [organization]',
    body: ['Organization', 'Program or grant under consideration', 'Questions or documents you need', 'Deadline'],
  },
  'nu-pgd': {
    key: 'nu-pgd',
    label: 'Apply now',
    href: NU_PGD_APPLY_URL,
    secondary: { label: 'Call to enroll', href: 'tel:+8801958220802' },
  },
};

export const CTA_KEYS = Object.keys(CTAS) as CtaKey[];
