export type FaqAudience = 'governments' | 'development-partners' | 'foundations' | 'universities' | 'employers' | 'investors' | 'home' | 'variants' | 'all';
export interface Faq {
  id: string;
  q: string;
  a: string;
  /**
   * WP36: a closing link that is the answer's last sentence (label "See what a partnership includes", printed with its full stop inside the link); the page prints it as an inline link, and the FAQ JSON-LD
   * carries its label as plain text, so the structured data says what the page says (scripts/validate-jsonld.mjs). Used by the one-line route answers (Q8-route, Q9-route).
   */
  link?: { label: string; href: string };
  /** Fact IDs behind the answer (also written to data-fact for the status gate). */
  evidence: string[];
  /** Subset of `evidence` whose footnote markers are shown after the answer (survey, RCT, program-data and external figures). */
  /**
   * Pages whose 9b list (planning/04 §4.1–4.6) includes the question; `home` = Q1, Q2, Q3, Q5, Q7, Q8;
   * `all` = the partner hub's complete Q1–Q14 list. `variants` = page-specific rewordings of a bank question (ids ending in -employer or -local), never listed in `all`.
   */
  audiences: FaqAudience[];
}

// Objection bank (planning/04 §5, Q1–Q14): answers and evidence IDs are the authoritative copy; first sentence = BLUF.
export const faqs: Faq[] = [
  { id: 'Q1', q: `Will This Work in Our Country?`, a: `That depends on local demand, which we test first. Our outcome evidence comes mainly from Bangladesh, and the Kosovo pilot adds program results from outside it; we set each country’s tracks with local partners, from local employer demand.`, evidence: ['IN-02', 'PD-10', 'PR-02'], audiences: ['development-partners', 'governments', 'universities', 'employers', 'home', 'all'] },
  // Home only (WP19, item 17): the trial's scope, answered from RC-07 (the 200-hour predecessor program for women in Dhaka), PD-01 (100 hours per certification) and the October 2026 survey.
  { id: 'Q15', q: `Does the Trial Apply to Your Program?`, a: `The randomized trial evaluated a 200-hour predecessor program for women in Dhaka, so it is evidence about that program, not a measurement of today’s 100-hour tracks. Results for later programs come from the October 2026 survey of completers and from program records, which are descriptive: they show what happened, not what would have happened without the program.`, evidence: ['RC-01', 'RC-07', 'PD-01', 'OC-01', 'OC-02'], audiences: ['home'] },
  { id: 'Q2', q: `Can You Deliver at National Scale?`, a: `Her Power, a national program of DoICT, the ICT Division, trained 25,125 women across 130 sub-districts (upazilas). CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,500 women directly. We scale in phases: larger programs run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges, and a 100,000+ national program is a design option we plan phase by phase and have not yet delivered.`, evidence: ['GV-01', 'GV-11', 'PD-06', 'PD-05'], audiences: ['development-partners', 'governments', 'foundations', 'investors', 'home', 'all'] },
  { id: 'Q3', q: `How Do You Prove Outcomes?`, a: `For every cohort, as agreed in the program scope, we plan a baseline at enrollment, follow-up surveys at 3, 6 and 12 months and monthly reports. Documentary evidence of earnings, such as offer letters, payslips, platform logs or bank receipts, is collected where available. Independent evaluation is welcome.`, evidence: ['PD-09', 'PD-08', 'RC-01'], audiences: ['development-partners', 'foundations', 'universities', 'home', 'all'] },
  { id: 'Q4', q: `Is There Independent Evidence?`, a: `Yes — a randomized controlled trial by BIGD (BRAC University) of CodersTrust’s WSDFM program studied women in Dhaka trained in 2020, on a 200-hour predecessor of today’s 100-hour track. It found that women offered a place were more likely to be employed than the control group; the trial surveyed 599 women at follow-up (report published May 2022).`, evidence: ['RC-01', 'RC-02', 'RC-07'], audiences: ['development-partners', 'foundations', 'investors', 'all'] },
  { id: 'Q5', q: `Will AI Eliminate the Jobs CodersTrust Trains For?`, a: `Some entry-level tasks in our tracks are vulnerable to automation, so we choose tracks from current employer demand, set per country, and agree each track’s AI content and work-entry plan with you before enrollment. We do not yet publish a track-by-track breakdown.`, evidence: ['PD-02', 'PD-10', 'PD-19'], audiences: ['development-partners', 'investors', 'employers', 'home', 'all'] },
  // WP36 (cycle-13 review): three plain sentences in place of two long ones with parentheses; the same claims and figures.
  { id: 'Q6', q: `Can It Reach Women and Marginalized Groups?`, a: `For women, yes — women-focused programs report their own results: WSDFM 71% in work; Women in Online Work, Kosovo 68%; Her Power 372 of 800 tracked women in work (47%), tracked from the 2,500 trained directly by CodersTrust. For other priority groups, we have early delivery experience and measure outcomes in each pilot. The randomized trial studied women aged 18–35 in Dhaka with at least a Secondary School Certificate (SSC), so it does not speak to other groups.`, evidence: ['PR-01', 'PR-02', 'PR-05', 'RC-01'], audiences: ['development-partners', 'all'] },
  { id: 'Q7', q: `How Fast Can We Start?`, a: `For grant-funded pilots, agreement typically takes about three weeks from first conversation, and the first cohort is typically in training 6–8 weeks after signing. Counting from the first conversation, Week 1 is a discovery session, Week 2 co-design and Week 3 the agreement; public procurement follows the agency’s own timeline.`, evidence: ['PD-04'], audiences: ['governments', 'home', 'all'] },
  { id: 'Q8', q: `What Does It Cost?`, a: `Pricing is set per program, and we share an indicative budget in the discovery session. Standard inclusions are outreach and selection, blended training, an AI-ready curriculum, certification exam preparation (exam fee included), three months of mentoring, placement support, monthly reports and outcome tracking for 12 months after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.`, evidence: ['PD-02', 'PD-02a'], audiences: ['development-partners', 'governments', 'foundations', 'universities', 'employers', 'home', 'all'] },
  { id: 'Q9', q: `What About Safeguarding and Data Protection?`, a: `Safeguarding and data protection are specified for each program and agreed before enrollment. Each program design covers accessible selection, consent-based data collection, protected records, grievance handling, harassment and fraud response and referral pathways. Guardian consent and supervision apply to anyone under 18, and funders receive data with personal details protected.`, evidence: ['PD-12', 'PD-13'], audiences: ['development-partners', 'governments', 'foundations', 'all'] },
  { id: 'Q10', q: `What Happens When Funding Ends?`, a: `Where included in the program scope, what the program builds stays in place: certified local facilitators and localized curricula, and completers join CodersTrust’s alumni network after their three months of mentoring. TalentLEAP is designed to organize skills into career paths with progressive levels, so completers can keep advancing as further levels are published.`, evidence: ['PD-06', 'PD-01', 'IN-06'], audiences: ['development-partners', 'governments', 'foundations', 'universities', 'all'] },
  { id: 'Q11', q: `Is the JobReady Platform Live?`, a: `Partly — modules are rolling out in stages. Live today: partner portals, marketing automation, CRM and AI chat. In pre-launch: the employer marketplace and the gig-work (Earn) marketplace, so placement also runs through CodersTrust’s placement team and marketplaces such as Upwork and Fiverr.`, evidence: ['IN-04'], audiences: ['investors', 'employers', 'all'] },
  { id: 'Q12', q: `Do Your Candidates Only Freelance?`, a: `No — salaried jobs remain the largest pathway; freelancing and business ownership grew the most in relative terms. Among surveyed completers, salaried employment rose from 38.3% before training to 53.3% at the October 2026 survey, freelancing from 6.2% to 14.0% and business ownership from 2.8% to 10.6%.`, evidence: ['OC-04'], audiences: ['employers', 'all'] },
  { id: 'Q13', q: `Who Are Your Typical Learners?`, a: `Mostly university graduates from across Bangladesh, some of them already working before training. Among surveyed completers, 84.6% hold a bachelor’s degree or higher, 68.7% were aged 15–35 and 62.9% live outside Dhaka, across 58 of the country’s 64 districts; 47.4% were working before training.`, evidence: ['OC-09', 'OC-01'], audiences: ['universities', 'all'] },
  { id: 'Q14', q: `How Is CodersTrust Different from an Online Course Platform?`, a: `Self-paced course platforms focus on content access; our programs add mentoring, certification exam preparation and placement support, agreed in each program’s scope. Every supported TalentLEAP cohort pairs 100 training hours per certification with three months of milestone-based mentoring, certification exam preparation (exam fee included), placement support and outcome tracking for 12 months.`, evidence: ['PD-01', 'PD-02', 'PD-02a'], audiences: ['all'] },
  // Page-specific variants (not in the Q1–Q14 bank, so never listed in `all`).
  { id: 'Q8-employer', q: `What Does It Cost?`, a: `Pricing is set per program; we share an indicative budget in the discovery session and confirm it after the needs assessment. Standard inclusions are a needs assessment, a customized curriculum, interactive workshops, progress evaluation and post-training support; certification exam preparation and talent sourcing are scoped separately where needed.`, evidence: ['PD-02', 'IN-10'], audiences: ['variants'] },
  // WP36 (cycle-13 review): the cost (Q8) and safeguarding (Q9) answers were printed word for word on four to six route pages. The partner hub FAQ keeps the full answers; a route page gives one line and a link to where
  // the full answer lives. They are page-level variants (never listed in `all`, so the hub still shows Q8 and Q9 in full), and the FAQ JSON-LD carries the same words as the page, link label included.
  { id: 'Q8-route', q: `What Does It Cost?`, a: `Pricing is set per program; we share an indicative budget in the discovery session.`, link: { label: 'See what a partnership includes', href: '/partner-with-us/#faqs' }, evidence: ['PD-02'], audiences: ['variants'] },
  { id: 'Q9-route', q: `What About Safeguarding and Data Protection?`, a: `Safeguarding and data protection are specified for each program and agreed before enrollment.`, link: { label: 'See how we handle them', href: '/about/governance/' }, evidence: ['PD-12'], audiences: ['variants'] },
  { id: 'Q1-local', q: `Will This Work in Our District?`, a: `Each cohort is designed around the young people your organization reaches, your facilities and local demand. Tracks, facilitator training, safeguarding and reporting are agreed before enrollment.`, evidence: ['PD-06', 'PD-09'], audiences: ['variants'] },
  // WP33 (cycle-10 review): the Governments page has a steps band after its FAQ that shows the sequence, so this answer does not count the weeks out again; Q7 keeps the count for the pages without one.
  { id: 'Q7-government', q: `How Fast Can We Start?`, a: `Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry. For grant-funded pilots, agreement typically takes about three weeks from first conversation, and the first cohort is typically in training 6–8 weeks after signing.`, evidence: ['PD-04'], audiences: ['variants'] },
  { id: 'Q3-institution', q: `How Do You Prove Outcomes?`, a: `Baseline at enrollment, follow-up surveys at 3, 6 and 12 months, and documentary evidence of earnings where available; independent evaluation is welcome. Offer letters document job offers; payslips document employment earnings; platform logs or bank receipts document freelance earnings where available. Your institution receives monthly reports on enrollment, completion, certification, placements and first earnings.`, evidence: ['PD-09', 'PD-08', 'RC-01'], audiences: ['variants'] },
];

// WP24a: audience-specific variants of bank questions (never listed in `all`). Q1's first sentence names the reader's own setting; the rest of the answer is the bank's.
const bankAnswer = (id: string): Faq => {
  const f = faqs.find((x) => x.id === id);
  if (!f) throw new Error(`faqs: bank question ${id} is missing`);
  return f;
};
const Q1_OPENING = 'That depends on local demand, which we test first.';
const q1Variant = (id: string, opening: string): Faq => {
  const q1 = bankAnswer('Q1');
  if (!q1.a.startsWith(Q1_OPENING)) throw new Error('faqs: Q1 no longer opens with its bank sentence; update the audience variants');
  return { ...q1, id, a: opening + q1.a.slice(Q1_OPENING.length), audiences: ['variants'] };
};
faqs.push(
  q1Variant('Q1-development-partners', 'That depends on local demand in your portfolio countries, which we test first.'),
  q1Variant('Q1-government', 'That depends on local demand and on lab access and facilitator supply, which we test first.'),
  q1Variant('Q1-campus', 'That depends on local demand for your graduates’ skills and on your campus labs, which we test first.'),
  // Employers (WP32, cycle-9 review): the bank answer is about youth-program evidence and country tracks, which does not answer an employer. This answer repeats the Employers page's own statements
  // (the needs assessment, IN-10; the candidate-pool scope of talent requests, which its positioning statement rests on IN-10 and IN-04 for), so it claims nothing the page does not already say.
  {
    ...bankAnswer('Q1'),
    id: 'Q1-employer',
    a: `We start with a needs assessment of your roles, tasks and required tools. For hiring, talent requests are scoped against the experience and credentials available in the candidate pool.`,
    evidence: ['IN-10', 'IN-04'],
    audiences: ['variants'],
  },
  // Governments: the national-scale answer points to the contracts table, where each contract's scope is set out.
  { ...bankAnswer('Q2'), id: 'Q2-government', a: `Six government contracts have training scopes ranging from 120+ professionals to 3,120+ digital-lab staff; the contracts table on this page sets out each one. Her Power, a national program of DoICT, the ICT Division, trained 25,125 women across 130 sub-districts (upazilas), and CodersTrust trained 2,500 women directly. We scale in phases, and a 100,000+ national program is a design option we have not yet delivered.`, evidence: ['GV-10', 'GV-01', 'GV-13', 'PD-05'], audiences: ['variants'] },
  // Investors (WP25s): the national-scale answer leads with CodersTrust's own role in Her Power (GV-11) before the national total (GV-01), which is the program's, not CodersTrust's.
  // WP33 (cycle-10 review): the bank answer's closing 41-word sentence is two sentences here (the same two claims, no "phase by phase" repeat of "in phases"). FAQ answers are at most three
  // sentences (tests/wp30c.spec.ts), so the two Her Power statements, each already a short clause, are one sentence joined by a semicolon.
  (() => {
    const q2 = bankAnswer('Q2');
    const national = 'Her Power, a national program of DoICT, the ICT Division, trained 25,125 women across 130 sub-districts (upazilas). CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,500 women directly.';
    const scale = 'We scale in phases: larger programs run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges, and a 100,000+ national program is a design option we plan phase by phase and have not yet delivered.';
    if (!q2.a.includes(national) || !q2.a.includes(scale)) throw new Error('faqs: Q2 no longer has the Her Power and scale sentences; update the investors variant');
    return {
      ...q2,
      id: 'Q2-investor',
      a: q2.a
        .replace(national, 'In Her Power, a national program of DoICT, the ICT Division, CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,500 women directly; the national program trained 25,125 women across 130 sub-districts (upazilas).')
        .replace(scale, 'We scale in phases: larger programs run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges. A 100,000+ national program is a design option we have not yet delivered.'),
      audiences: ['variants'] as Faq['audiences'],
    };
  })(),
  // Universities: "what happens when funding ends", in campus terms, from the bank answer's own content (facilitators, curricula, the alumni network) and the campus delivery model (campus labs as blended-learning centers).
  {
    id: 'Q10-campus',
    q: `What Happens After the First Cohort?`,
    a: `Where included in the program scope, what the program builds stays on your campus: certified local facilitators, localized curricula and campus labs that serve as blended-learning centers. Completers join CodersTrust’s alumni network after their three months of mentoring, and TalentLEAP is designed to organize skills into career paths with progressive levels, so they can keep advancing.`,
    evidence: ['PD-06', 'PD-01', 'IN-06'],
    audiences: ['variants'],
  },
);

/** The questions tagged for one audience, in bank order (`faqsFor('all')` is the full Q1–Q14 list). */
export function faqsFor(audience: FaqAudience): Faq[] {
  return faqs.filter((f) => f.audiences.includes(audience));
}
