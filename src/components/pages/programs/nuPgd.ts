import { getCollection } from 'astro:content';
import { CTAS } from '../../../data/ctas';

/**
 * NU Postgraduate Diploma content, read from the `nu-pgd` collection (legacy-page content, NU sign-off pending).
 * The admissions fact set (duration, schedule, fee, eligibility, delivery mode, internship terms, award,
 * application route) is NOT approved, so none of those fields are ever read or rendered here: only titles,
 * module names, role titles and a few legacy FAQs are used. No `Offer` is ever emitted in JSON-LD.
 * WP76 (owner answer 2026-10-22: the diploma has FOUR courses): Cyber Security and Data Analytics join Digital Marketing and ICT, from CodersTrust's own course pages (the NUCYBER26 and NUDATA26 sources in src/data/facts.ts).
 * Every per-course map below has all four slugs; `nuCourses` stops the build if a course in the collection lacks one.
 */
export interface NuCourse {
  slug: string;
  title: string;
  modules: string[];
  roles: string[];
  faqs: { q: string; a: string }[];
}

export const NU_PATH = '/programs/nu-postgraduate-diploma/';
/** Schedule, intake and location are not in the published admissions facts; one wording on all three NU pages states who confirms them. */
export const NU_SCHEDULE_NOTE = 'Admissions confirms intake dates and schedule with each applicant.';
export const NU_LOCATION_NOTE = 'Admissions confirms the teaching location with each applicant.';
/** WP44 (cycle-21 review): the FAQ answer states the schedule and the location in one sentence (the rows keep NU_SCHEDULE_NOTE and NU_LOCATION_NOTE). */
export const NU_ADMISSIONS_NOTE = 'Admissions confirms intake dates, schedule and teaching location with each applicant.';
export const NU_NAME = 'National University Postgraduate Diploma';
/** WP21: one name for each NU track on every surface (menu, footer, <title>, H1, cards, breadcrumbs). Official module titles are untouched. */
export const NU_COURSE_NAME: Record<string, string> = {
  'digital-marketing': 'NU Postgraduate Diploma in Digital Marketing',
  ict: 'NU Postgraduate Diploma in ICT',
  'cyber-security': 'NU Postgraduate Diploma in Cybersecurity', // WP96: the course name is spelled "Cybersecurity" (the URL slug stays cyber-security)
  'data-analytics': 'NU Postgraduate Diploma in Data Analytics',
};
/** The four courses in the order every surface lists them (the overview's cards, the menus, "Also Consider"): the two long-standing courses first, then the two added in WP76. */
export const NU_COURSE_ORDER: readonly string[] = ['digital-marketing', 'ict', 'cyber-security', 'data-analytics'];
/** Each course as a phrase in a sentence: "digital marketing, ICT, cyber security and data analytics" (the overview's "Choose Your Course" lead and the Programs hub card name all four this way). */
export const NU_COURSE_SUBJECT: Record<string, string> = {
  'digital-marketing': 'digital marketing',
  ict: 'ICT',
  'cyber-security': 'cybersecurity',
  'data-analytics': 'data analytics',
};
/** Standalone Google Form (never embedded) and the secondary phone route, both from the CTA library. */
export const NU_APPLY = { label: CTAS['nu-pgd'].label, href: CTAS['nu-pgd'].href as string };
export const NU_CALL = CTAS['nu-pgd'].secondary as { label: string; href: string };
/** The number in the call label ("Call to Enroll: +880 1958-220802"), for sentences that name it on their own. */
export const NU_CALL_NUMBER = NU_CALL.label.replace(/^[^:]*:\s*/, '');
/** "Call +880 1958-220802" as link text: a non-breaking space after "Call" keeps the whole phone link on one line (html-validate tel-non-breaking). */
export const NU_CALL_TEXT = NU_CALL.label;

/**
 * (Retired in WP20a: course pages now answer from their module names, see nuModuleFaqs; the legacy answers are generic and are no longer shown.)
 * Legacy FAQ indexes that describe the course itself. They exclude the unapproved admissions facts (duration, eligibility, mode, award,
 * internship terms) and every answer that promises an outcome or a service: the digital-marketing answers on readiness for real-world
 * challenges and on career roles, and the ICT answers on skills gained, career benefit ("enhancing your employability") and
 * "personalized support from experienced instructors". They return only with the approved NU admissions fact set (confirm list #16).
 */
const SAFE_FAQS: Record<string, number[]> = {
  'digital-marketing': [0],
  ict: [1],
  'cyber-security': [],
  'data-analytics': [],
};

/**
 * Short, claim-light summary per course, written from the module names. (WP46: the "Why This Course" points are gone with the "What You Will Work On" band, which restated the module list.)
 * WP76: `prefer` is the question that points a reader to THIS course ("Prefer programming, databases and networks?"), asked on the other three course pages' "Also Consider" band, which names this course after it ("... The NU
 * Postgraduate Diploma in ICT is the course for those modules."; it was `alsoConsider`, the two-course sentence each page said about the other). `studyLead` is the line under "What You Study": the last module differs by course.
 */
export const NU_COURSE_COPY: Record<string, { short: string; lead: string; description: string; topics: string[]; titleTag: string; prefer: string; studyLead: string }> = {
  'digital-marketing': {
    short: 'Practical digital marketing: SEO, social media, advertising and analytics.',
    lead: 'Practical digital marketing skills, from SEO and social media to advertising and analytics, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in digital marketing, delivered by CodersTrust: SEO, social media, advertising and analytics.',
    topics: ['SEO and analytics', 'Social media marketing', 'E-commerce'],
    titleTag: 'NU Postgraduate Diploma in Digital Marketing',
    prefer: 'Prefer SEO, social media and advertising?',
    studyLead: 'Modules, in order. The final module combines internship, project work and a seminar; internship arrangements are confirmed with admissions.',
  },
  ict: {
    short: 'Practical information and communication technology (ICT): programming, databases, networks, mobile and web development.',
    lead: 'Practical information and communication technology (ICT) skills, from programming and databases to networks, mobile apps and web design, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in ICT, delivered by CodersTrust: programming, databases, networks, mobile and web development.',
    topics: ['Programming and databases', 'Networks and troubleshooting', 'Mobile and web development'],
    titleTag: 'NU Postgraduate Diploma in ICT',
    prefer: 'Prefer programming, databases and networks?',
    studyLead: 'Modules, in order. The final module combines internship, project work and a seminar; internship arrangements are confirmed with admissions.',
  },
  // WP76: from CodersTrust's own course page (NUCYBER26): the ten subjects, the description's topics (cyber criminology, cryptography and data security, network and communication security, cyber security laws and policies, cybercrime investigation and digital forensics, digital privacy,
  // cyber risk management, cyber terrorism, financial cybercrime) and the final "Capstone Project/Internship" module. Everything below is worded from the module names; no outcome, role or service is promised.
  'cyber-security': {
    short: 'Cybersecurity: cryptography, network security, digital forensics, cyber law and risk management.',
    lead: 'Cybersecurity knowledge, from cryptography and network security to digital forensics and cyber law, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in cybersecurity, delivered by CodersTrust: cryptography, network security, digital forensics and cyber law.',
    topics: ['Cryptography and network security', 'Digital forensics and investigation', 'Cyber law and risk management'],
    titleTag: 'NU Postgraduate Diploma in Cybersecurity',
    prefer: 'Prefer cryptography, network security and digital forensics?',
    studyLead: 'Modules, in order. The final module is a capstone project or internship.',
  },
  // WP76: from CodersTrust's own course page (NUDATA26): the ten subjects and the final "Special Topics in Data Analytics" module (a thesis or experimental project report, supervised). The page's description also names spreadsheets and dashboards, which no module title carries, so the copy
  // below names only what the module list does (analytics tools, databases, data visualization, machine learning, data governance and ethics).
  'data-analytics': {
    short: 'Practical data analytics: analytics tools, databases, data visualization and machine learning.',
    lead: 'Practical data analytics skills, from analytics tools and databases to data visualization and machine learning, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in data analytics, delivered by CodersTrust: analytics tools, databases, visualization and machine learning.',
    topics: ['Analytics tools and databases', 'Data visualization', 'Machine learning and data governance'],
    titleTag: 'NU Postgraduate Diploma in Data Analytics',
    prefer: 'Prefer analytics tools, data visualization and machine learning?',
    studyLead: 'Modules, in order. The final module is a special-topics thesis or project report.',
  },
};

function list(body: string, heading: string): string[] {
  const block = body.split(/\n## /).find((s) => s.startsWith(heading));
  return block ? block.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()) : [];
}

/**
 * "Related Career Areas" (WP18b). The legacy "Career opportunities" list cannot be grouped cleanly under the courses' own module names:
 * only some roles follow from a module (an SEO role from the SEO module), the rest (Entrepreneur, Freelancer, Business Analyst,
 * Network Engineer, ...) follow from no single module, and a mapping beyond the module list would be invented. So the list stays flat,
 * split into single titles ("A or B", "A & B"), and drops the senior titles (Director, Manager, Architect), which a postgraduate
 * diploma does not lead to by itself. The text of every kept title is the legacy text, unchanged.
 */
const SENIOR_TITLE = /\b(Director|Manager|Architect)\b/;
/**
 * Titles that no module of the course leads to (WP20a): Digital Marketing has no web design or development module and none on starting a business or
 * freelancing; ICT has no analytics or business-analysis module. The remaining titles each follow from a module name.
 * WP76: Cyber Security has no module on general IT support or operations or on auditing (the course's own "Career Opportunity" list also names IT Support Executive, Network Support Associate, IT Operations Associate and IT Audit Assistant);
 * Data Analytics has none on management information systems or on starting a business (MIS Executive, Entrepreneur). The sector-specific analyst titles stay: the course's own description names business, finance, marketing and research as where its skills apply.
 */
const NO_MODULE: Record<string, RegExp> = {
  'digital-marketing': /^(Web Developer|Web Designer|Entrepreneur|Freelancer)$/,
  ict: /^(Data Analyst|System Analyst|Business Analyst)$/,
  'cyber-security': /^(IT Support Executive|Network Support Associate|IT Operations Associate|IT Audit Assistant)$/,
  'data-analytics': /^(MIS Executive|Entrepreneur)$/,
};
/**
 * WP77 (owner direction 2026-10-14: less is more): at most eight titles per course, the ones the course's own modules most directly lead to. The titles are the legacy text (no title is added),
 * and each kept list keeps the legacy order. Cyber Security: 15 became 8; Data Analytics: 14 became 8. Digital Marketing (4) and ICT (8) were already within the limit and are not listed.
 */
const CHIP_TITLES: Record<string, string[]> = {
  // Network and Communication Security, Cryptography and Data Security, Cyber Crime Investigation and Digital Forensics, Cyber Risk Management, Cyber Economic Crime, Social Media and Digital Privacy
  'cyber-security': [
    'Junior Cyber Security Analyst',
    'Information Security Analyst',
    'Network Security Assistant',
    'Digital Forensics Assistant',
    'Cybercrime Investigation Assistant',
    'Junior Cyber Risk Analyst',
    'Fraud Investigation Assistant',
    'Data Privacy Assistant',
  ],
  // Data Analytics: Tools and Techniques, Database Systems, Data Visualization, Data Analysis and Software Application, Fundamentals of Data Analytics, Professional Development & Freelancing
  'data-analytics': [
    'Data Analyst',
    'Junior Data Analyst',
    'Business Intelligence Analyst',
    'Reporting Analyst',
    'Performance Analyst',
    'Data Visualization Analyst',
    'Database Reporting Assistant',
    'Freelance Data Analyst',
  ],
};
export function relatedCareerAreas(raw: string[], slug?: string): string[] {
  const drop = slug ? NO_MODULE[slug] : undefined;
  const keep = slug ? CHIP_TITLES[slug] : undefined;
  return raw
    .flatMap((r) => r.split(/\s+or\s+|\s+&\s+(?=[A-Z][a-z])/))
    .map((r) => r.trim())
    .filter((r) => r && !SENIOR_TITLE.test(r) && !(drop && drop.test(r)) && (!keep || keep.includes(r)));
}

/**
 * WP25s: the modules named in "What Will I Be Able to Do After This Course?". Each is one of the course's own module titles (a title that is not in
 * the course's list fails the build), so the answer names concrete subjects and promises nothing beyond the module list.
 * WP39 (cycle-16 review): the answer says each module in plain words (`words`, the subject of the registered module title: "WordPress Design (Practical)" is "WordPress design", "Database Management Systems" is "databases"),
 * so the sentence reads "Build practical work in WordPress design, content marketing, SEO and analytics, followed by the final internship, project work and seminar module." instead of a list of module titles.
 */
const ANSWER_MODULES: Record<string, { module: string; words: string }[]> = {
  'digital-marketing': [
    { module: 'WordPress Design (Practical)', words: 'WordPress design' },
    { module: 'Content Marketing (Practical)', words: 'content marketing' },
    { module: 'Search Engine Optimization (SEO) (Practical)', words: 'SEO' },
    { module: 'Web & Google Analytics (Practical)', words: 'analytics' },
  ],
  ict: [
    { module: 'Java Programming', words: 'programming' },
    { module: 'Database Management Systems', words: 'databases' },
    { module: 'Computer Networks Maintenance', words: 'networks' },
    { module: 'Mobile Application Development', words: 'mobile applications' },
  ],
  'cyber-security': [
    { module: 'Cryptography and Data Security', words: 'cryptography' },
    { module: 'Network and Communication Security', words: 'network security' },
    { module: 'Cyber Crime Investigation and Digital Forensics', words: 'digital forensics' },
    { module: 'Cyber Risk Management and Crime Prevention', words: 'cyber risk management' },
  ],
  'data-analytics': [
    { module: 'Data Analytics: Tools and Techniques', words: 'analytics tools' },
    { module: 'Database Systems', words: 'databases' },
    { module: 'Data Visualization', words: 'data visualization' },
    { module: 'Fundamentals of Machine Learning', words: 'machine learning' },
  ],
};
/**
 * WP76: the frame of that answer, per course: the verb (the two long-standing courses keep "Build practical work in ..."; the two added courses say "Build a foundation in ...", the Cyber Security page's own words for what the programme gives: "a strong foundation for further learning and career
 * development in this field"; the Data Analytics page says "Build a foundation for further learning in business intelligence and advanced analytics"), the closing clause (the last module differs: an internship, project work and seminar; a capstone project or internship; a special-topics thesis or project report)
 * and the pattern of that last module's title, which must still be in the module list.
 * "then apply it in the final capstone project or internship" is the Cyber Security page's own account of that module ("allows students to apply their knowledge to real-world situations"); the Data Analytics page says the same of project work.
 */
const ANSWER_FRAME: Record<string, { lead: string; closing: string; finalModule: RegExp }> = {
  'digital-marketing': { lead: 'Build practical work in', closing: 'followed by the final internship, project work and seminar module', finalModule: /^Internship/i },
  ict: { lead: 'Build practical work in', closing: 'followed by the final internship, project work and seminar module', finalModule: /^Internship/i },
  'cyber-security': { lead: 'Build a foundation in', closing: 'then apply it in the final capstone project or internship', finalModule: /^Capstone Project/i },
  'data-analytics': { lead: 'Build a foundation in', closing: 'then apply it in the final special-topics thesis or project report', finalModule: /^Special Topics/i },
};
/** "a, b, c and d" */
const andList = (items: string[]) => `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * WP49 (cycle-24 review): "Is This the Right Course for Me?" said the same sentence on both course pages ("It is right for you if you meet that and want a digital career."). It now says what the course teaches, in the words of its own
 * modules ("Choose ICT if you want to study programming, databases, networks and mobile or web development."; the topics are the ones NU_COURSE_COPY names for the course). Each topic lists the modules it draws on; a module that is not in the course's own list
 * fails the build (as ANSWER_MODULES does), so the sentence cannot say more than the module list does. The eligibility sentence (NU-01) stays in the answer, before it.
 */
const FIT_TOPICS: Record<string, { name: string; topics: { modules: string[]; words: string }[] }> = {
  'digital-marketing': {
    name: 'Digital Marketing',
    topics: [
      { modules: ['Search Engine Optimization (SEO) (Practical)'], words: 'SEO' },
      { modules: ['Social Media Marketing'], words: 'social media' },
      { modules: ['Google Ads and PPC'], words: 'advertising' },
      { modules: ['Web & Google Analytics (Practical)'], words: 'analytics' },
    ],
  },
  ict: {
    name: 'ICT',
    topics: [
      { modules: ['Java Programming'], words: 'programming' },
      { modules: ['Database Management Systems'], words: 'databases' },
      { modules: ['Computer Networks Maintenance'], words: 'networks' },
      { modules: ['Mobile Application Development', 'Web Application & Web Site Design'], words: 'mobile or web development' },
    ],
  },
  // WP76: "Choose Cyber Security if you want to study cryptography, network security, digital forensics and cyber law." / "Choose Data Analytics if you want to study analytics tools, databases, data visualization and machine learning."
  'cyber-security': {
    name: 'Cybersecurity',
    topics: [
      { modules: ['Cryptography and Data Security'], words: 'cryptography' },
      { modules: ['Network and Communication Security'], words: 'network security' },
      { modules: ['Cyber Crime Investigation and Digital Forensics'], words: 'digital forensics' },
      { modules: ['Cyber Security Laws, Policies and Strategies'], words: 'cyber law' },
    ],
  },
  'data-analytics': {
    name: 'Data Analytics',
    topics: [
      { modules: ['Data Analytics: Tools and Techniques'], words: 'analytics tools' },
      { modules: ['Database Systems'], words: 'databases' },
      { modules: ['Data Visualization'], words: 'data visualization' },
      { modules: ['Fundamentals of Machine Learning'], words: 'machine learning' },
    ],
  },
};

/** The course's own "right for me" sentence: "Choose ICT if you want to study programming, databases, networks and mobile or web development." */
export function nuFitSentence(c: NuCourse): string {
  const fit = FIT_TOPICS[c.slug];
  if (!fit) throw new Error(`nuFitSentence: no fit topics for ${c.slug}`);
  for (const t of fit.topics) for (const m of t.modules) if (!c.modules.includes(m)) throw new Error(`nuFitSentence: "${m}" is not a module of ${c.slug}`);
  return `Choose ${fit.name} if you want to study ${andList(fit.topics.map((t) => t.words))}.`;
}

/** Course-page questions, answered from the course's module names only (no outcome, role or service claim). */
export function nuModuleFaqs(c: NuCourse): { q: string; html: string }[] {
  const names = c.modules.map((m) => esc(m));
  const last = names[names.length - 1];
  const picked = ANSWER_MODULES[c.slug];
  const frame = ANSWER_FRAME[c.slug];
  if (!picked || !frame) throw new Error(`nuModuleFaqs: no answer modules for ${c.slug}`);
  for (const m of picked) if (!c.modules.includes(m.module)) throw new Error(`nuModuleFaqs: "${m.module}" is not a module of ${c.slug}`);
  if (!frame.finalModule.test(c.modules[c.modules.length - 1] ?? '')) throw new Error(`nuModuleFaqs: ${c.slug} no longer ends with its final module (${frame.finalModule})`);
  return [
    { q: 'What Will I Study?', html: `${c.modules.length} modules: ${names.slice(0, -1).join('; ')}; and ${last.toLowerCase().startsWith('internship') ? 'a final module of ' + last.toLowerCase() : last}.` },
    { q: 'What Will I Be Able to Do After This Course?', html: `${frame.lead} ${andList(picked.map((m) => m.words))}, ${frame.closing}. Your next step depends on your experience, portfolio and local market.` },
  ];
}
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function nuOverview() {
  const all = await getCollection('nuPgd');
  const overview = all.find((e) => e.data.kind === 'overview');
  if (!overview) throw new Error('nu-pgd overview entry missing');
  return overview;
}

export async function nuCourses(): Promise<NuCourse[]> {
  const all = await getCollection('nuPgd');
  const courseEntries = all.filter((e) => e.data.kind === 'course');
  // WP76: the diploma has four courses; each has its name, copy, answer frame and fit topics, and a place in NU_COURSE_ORDER. A course in the collection without them (or one of them without its course) stops the build.
  const slugs = courseEntries.map((e) => e.data.slug).sort();
  const wanted = [...NU_COURSE_ORDER].sort();
  if (slugs.join() !== wanted.join()) throw new Error(`nuCourses: the nu-pgd collection has courses [${slugs.join(', ')}] but NU_COURSE_ORDER lists [${wanted.join(', ')}]`);
  for (const slug of slugs) for (const [name, map] of [['NU_COURSE_NAME', NU_COURSE_NAME], ['NU_COURSE_COPY', NU_COURSE_COPY], ['ANSWER_MODULES', ANSWER_MODULES], ['ANSWER_FRAME', ANSWER_FRAME], ['FIT_TOPICS', FIT_TOPICS]] as const) {
    if (!(slug in map)) throw new Error(`nuCourses: ${name} has no entry for ${slug}`);
  }
  return courseEntries
    .slice()
    .sort((a, b) => NU_COURSE_ORDER.indexOf(a.data.slug) - NU_COURSE_ORDER.indexOf(b.data.slug))
    .map((e) => {
      const keep = SAFE_FAQS[e.data.slug] ?? [];
      return {
        slug: e.data.slug,
        title: NU_COURSE_NAME[e.data.slug] ?? e.data.title,
        modules: (e.data.modules ?? []).map((m) => (/^Internship/i.test(m) ? 'Internship, project work and seminar' : m)),
        roles: relatedCareerAreas(list(e.body ?? '', 'Career opportunities'), e.data.slug),
        faqs: (e.data.faqs ?? []).filter((_, i) => keep.includes(i)),
      };
    });
}

