import { CONTRACT_FIGURES } from './copy';
import { fact } from './facts';

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
  /**
   * WP39: a link inside the answer. The phrase `text` (it appears once in `a`) is printed as a link to `href`; the FAQ JSON-LD strips the tag, so it carries the same words as the page. (`link` closes an answer
   * as its last sentence; this one sits mid-sentence. Used by the Investors answer that points to "What JobReady Does" and, WP41, the JobReady Platform answer that points to "Rollout Status".)
   */
  inlineLink?: { text: string; href: string };
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
  // Q1 (WP62, cycle-34 review, Sonnet and Gemini): Albania has no outcome figures, so it adds delivery experience, not results (TL-05: CodersTrust took part in Digital Jobs Albania, 2021–2022).
  // WP63 (cycle-35 review, GPT-6.1 Sol G2): two plain sentences, "We test local employer demand first and choose each country’s tracks with local partners. Our outcome evidence comes mainly from Bangladesh, with program results from Kosovo and delivery experience in Albania."
  // (WP62's was "That depends on local demand, which we test first. Our outcome evidence comes mainly from Bangladesh; the Kosovo pilot adds program results from outside it, and Digital Jobs Albania adds delivery experience; we set each country’s tracks with local partners, from local employer demand.").
  // The audience variants below (q1Variant) say their first sentence for their own reader and keep the second sentence and the evidence; YouthWIDE (src/pages/programs/youthwide.astro) prints this answer as it is.
  { id: 'Q1', q: `Will This Work in Our Country?`, a: `We test local employer demand first and choose each country’s tracks with local partners. Our outcome evidence comes mainly from Bangladesh, with program results from Kosovo and delivery experience in Albania.`, evidence: ['IN-02', 'PD-10', 'PR-02', 'TL-05'], audiences: ['development-partners', 'governments', 'universities', 'employers', 'home', 'all'] },
  // Home only (WP19, item 17): the trial's scope, answered from RC-07 (the 200-hour predecessor program for women in Dhaka), PD-01 (100 hours per certification) and the October 2026 survey.
  { id: 'Q15', q: `Does the Trial Apply to Your Program?`, a: `The randomized trial evaluated a 200-hour predecessor program for women in Dhaka, not today’s 100-hour tracks. Results for other programs come from the October 2026 survey of completers and from program records, which are descriptive.`, evidence: ['RC-01', 'RC-07', 'PD-01', 'OC-01', 'OC-02'], audiences: ['home'] },
  { id: 'Q2', q: `Can You Deliver at National Scale?`, a: `Her Power is a national program of DoICT, the ICT Division, to train 25,125 women across 130 sub-districts (upazilas). CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,400 women directly. We scale in phases: larger programs are designed to run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges, and a 100,000+ national program is a design option we plan phase by phase and have not yet delivered.`, evidence: ['GV-01', 'GV-11', 'PD-06', 'PD-05'], audiences: ['development-partners', 'governments', 'foundations', 'investors', 'home', 'all'] },
  // Q3 (WP63, cycle-35 review, GPT-6.1 Sol G1): "Documentary evidence of work and earnings, such as offer letters, payslips, ..." (an offer letter documents work, not earnings; PD-09: "offer letters, payslips and platform or bank records document work and earnings").
  { id: 'Q3', q: `How Do You Prove Outcomes?`, a: `For every cohort, as agreed in the program scope, we plan a baseline at enrollment, follow-up surveys at 3, 6 and 12 months and monthly reports. Documentary evidence of work and earnings, such as offer letters, payslips, platform logs or bank receipts, is collected where available. Independent evaluation is welcome.`, evidence: ['PD-09', 'PD-08', 'RC-01'], audiences: ['development-partners', 'foundations', 'universities', 'home', 'all'] },
  { id: 'Q4', q: `Is There Independent Evidence?`, a: `Yes, for a predecessor program. The BRAC Institute of Governance and Development (BIGD) at BRAC University ran a randomized controlled trial of CodersTrust’s WSDFM program, a 200-hour predecessor of today’s 100-hour tracks, with women in Dhaka trained in 2020. Women offered a place were more likely to be employed than the control group.`, evidence: ['RC-01', 'RC-02', 'RC-07'], audiences: ['development-partners', 'foundations', 'investors', 'all'] },
  { id: 'Q5', q: `Will AI Eliminate the Jobs CodersTrust Trains For?`, a: `Some entry-level tasks in our tracks are vulnerable to automation, so we choose tracks from current employer demand, set per country, and agree each track’s AI content and work-entry plan with you before enrollment. We do not yet publish a track-by-track breakdown.`, evidence: ['PD-02', 'PD-10', 'PD-19'], audiences: ['development-partners', 'investors', 'employers', 'home', 'all'] },
  // WP36 (cycle-13 review): three plain sentences in place of two long ones with parentheses; the same claims and figures.
  // WP48 (cycle-23 review): "we have early delivery experience and" is gone from this answer and from Q6-development-partners below (the review found it unsupported): "For other priority groups, we measure outcomes in each pilot."
  { id: 'Q6', q: `Can You Reach Women and Other Priority Groups?`, a: `For women, yes — women-focused programs report their own results: WSDFM 71% in work; Women in Online Work, Kosovo 68%; Her Power 372 of 800 tracked women in work (47%), tracked from the 2,400 trained directly by CodersTrust. For other priority groups, we measure outcomes in each pilot. The randomized trial studied women aged 18–35 in Dhaka with at least a Secondary School Certificate (SSC), so it does not speak to other groups.`, evidence: ['PR-01', 'PR-02', 'PR-05', 'RC-01'], audiences: ['development-partners', 'all'] },
  { id: 'Q7', q: `How Fast Can We Start?`, a: `Target timing for grant-funded pilots: agreement typically takes about three weeks from first conversation, and the first cohort is typically in training 6–8 weeks after signing. Counting from the first conversation, Week 1 is a discovery session, Week 2 co-design and Week 3 the agreement; public procurement follows the agency’s own timeline.`, evidence: ['PD-04'], audiences: ['governments', 'home', 'all'] },
  // WP43 (cycle-20 review): three sentences, and the inclusions are what a funder weighs ("training, certification exam preparation and the exam fee, three months of mentoring, placement support and 12 months of outcome tracking"),
  // not the whole delivery inventory; "include" keeps the list open (PD-02 lists more), and the separately budgeted items stay.
  // WP45 (cycle-21 review): the inclusion sentence also names "outreach and selection" (PD-02's first inclusion), and Our Model's cost answer is this one (one sentence in both places, not two lists that differ).
  { id: 'Q8', q: `What Does It Cost?`, a: `Pricing is set per program; we share an indicative budget in the discovery session. Supported youth cohorts include outreach and selection, training, certification exam preparation and the exam fee, three months of mentoring, placement support and 12 months of outcome tracking after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.`, evidence: ['PD-02', 'PD-02a'], audiences: ['development-partners', 'governments', 'foundations', 'universities', 'employers', 'home', 'all'] },
  { id: 'Q9', q: `What About Safeguarding and Data Protection?`, a: `Safeguarding and data protection are specified for each program and agreed before enrollment. Each program design covers accessible selection, consent-based data collection, protected records, grievance handling, harassment and fraud response and referral pathways. Guardian consent and supervision apply to anyone under 18, and funders receive data with personal details protected.`, evidence: ['PD-12', 'PD-13'], audiences: ['development-partners', 'governments', 'foundations', 'all'] },
  // WP48 (cycle-23 review): the TalentLEAP sentence ended "... progressive levels as further levels are published." here and in Q10-campus (Universities) (it had ended ", so completers can keep advancing as ...").
  // WP49 (cycle-24 review): the TalentLEAP sentence is gone from both answers: it did not answer the question, which is what stays after funding ends (facilitators, curricula, the alumni network). IN-06 is no longer cited here or in Q10-campus.
  { id: 'Q10', q: `What Happens When Funding Ends?`, a: `Where included in the program scope, what the program builds stays in place: certified local facilitators and localized curricula, and completers join CodersTrust’s alumni network after their three months of mentoring.`, evidence: ['PD-06', 'PD-01'], audiences: ['development-partners', 'governments', 'foundations', 'universities', 'all'] },
  // WP48 (cycle-23 review): the answer names the live modules a partner or employer deals with and the two marketplaces in pre-launch (named as two: tests/wp25s.spec.ts), then says how hiring runs today; the internal tooling (marketing automation,
  // customer relationship management) is left to the JobReady Platform page, whose "Rollout Status" table keeps the full list (WP49, cycle-24 review: its "What Is Live Today" callout, which repeated the table, is gone).
  { id: 'Q11', q: `Is the JobReady Platform Live?`, a: `Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch. Hiring currently runs through CodersTrust’s placement team.`, evidence: ['IN-04'], audiences: ['investors', 'employers', 'all'] },
  { id: 'Q12', q: `Do Your Candidates Only Freelance?`, a: `No — salaried jobs remain the largest pathway; freelancing and business ownership grew the most in relative terms. Among surveyed completers, salaried employment rose from 39.0% before training to 54.4% at the October 2026 survey, freelancing from 6.0% to 13.6% and business ownership from 3.0% to 10.3%.`, evidence: ['OC-04'], audiences: ['employers', 'all'] },
  { id: 'Q13', q: `Who Are Your Typical Learners?`, a: `Mostly university graduates from across Bangladesh, some of them already working before training. Among surveyed completers, 85.0% hold a bachelor’s degree or higher, 68.2% were aged 15–35 and 63.0% live outside Dhaka, across 58 of the country’s 64 districts; 48.0% were working before training.`, evidence: ['OC-09', 'OC-01'], audiences: ['universities', 'all'] },
  // WP46 (cycle-22 review): the comparison is with a self-paced course alone, not a claim about every course platform.
  { id: 'Q14', q: `How Is CodersTrust Different from an Online Course Platform?`, a: `Compared with a self-paced course alone, supported CodersTrust cohorts add mentoring, certification exam preparation and placement support, agreed in each program’s scope. Every supported TalentLEAP cohort pairs 100 training hours per certification with three months of milestone-based mentoring, certification exam preparation (exam fee included), placement support and outcome tracking for 12 months.`, evidence: ['PD-01', 'PD-02', 'PD-02a'], audiences: ['all'] },
  // Page-specific variants (not in the Q1–Q14 bank, so never listed in `all`).
  { id: 'Q8-employer', q: `What Does It Cost?`, a: `Pricing is set per program; we share an indicative budget in the discovery session and confirm it after the needs assessment. Standard inclusions are a needs assessment, a customized curriculum, interactive workshops, progress evaluation and post-training support; certification exam preparation and talent sourcing are scoped separately where needed.`, evidence: ['PD-02', 'IN-10'], audiences: ['variants'] },
  // WP36 (cycle-13 review): the cost (Q8) and safeguarding (Q9) answers were printed word for word on four to six route pages. The partner hub FAQ keeps the full answers; a route page gives one line and a link to where
  // the full answer lives. They are page-level variants (never listed in `all`, so the hub still shows Q8 and Q9 in full), and the FAQ JSON-LD carries the same words as the page, link label included.
  { id: 'Q8-route', q: `What Does It Cost?`, a: `Pricing is set per program; we share an indicative budget in the discovery session.`, link: { label: 'See what a partnership includes', href: '/partner-with-us/#faqs' }, evidence: ['PD-02'], audiences: ['variants'] },
  // WP46 (cycle-22 review): Our Model's cost answer was the shared Q8, word for word the partner hub's inclusion answer. It is now the one-line route answer, and its link names what the hub answer lists (a supported cohort's inclusions).
  { id: 'Q8-model', q: `What Does It Cost?`, a: `Pricing is set per program; we share an indicative budget in the discovery session.`, link: { label: 'See what a supported cohort includes', href: '/partner-with-us/#faqs' }, evidence: ['PD-02'], audiences: ['variants'] },
  // WP49 (cycle-24 review): the Governments page's action is a ministry briefing, so its one-line cost answer says "in the briefing" (a page-level variant like Q8-model; the shared Q8 and Q8-route keep "discovery session" where that is the first step).
  { id: 'Q8-government', q: `What Does It Cost?`, a: `Pricing is set per program; we share an indicative budget in the briefing.`, link: { label: 'See what a partnership includes', href: '/partner-with-us/#faqs' }, evidence: ['PD-02'], audiences: ['variants'] },
  { id: 'Q9-route', q: `What About Safeguarding and Data Protection?`, a: `Safeguarding and data protection are specified for each program and agreed before enrollment.`, link: { label: 'See how we handle them', href: '/about/governance/' }, evidence: ['PD-12'], audiences: ['variants'] },
  { id: 'Q1-local', q: `Will This Work in Our District?`, a: `Each cohort is designed around the young people your organization reaches, your facilities and local demand. Tracks, facilitator training, safeguarding and reporting are agreed before enrollment.`, evidence: ['PD-06', 'PD-09'], audiences: ['variants'] },
  // WP33 (cycle-10 review): the Governments page has a steps band after its FAQ that shows the sequence, so this answer does not count the weeks out again. WP40 (cycle-17 review): YouthWIDE's "What Happens Next" shows the sequence too, so it uses Q7-model; the shared Q7 (the count) stays in the bank, and no route page prints it.
  // WP50 (cycle-25 review): the Governments answer is the procurement sentence alone. Its second sentence (the grant-funded pilot timing: about three weeks to agreement, 6–8 weeks from signing to training) mixed another route's timing into a procurement answer;
  // the shared Q7 and Q7-model keep that timing, and no "after contracting" claim is made here (it is not registered: PD-04 gives the pilot timing and says procurement follows the agency's own timeline).
  { id: 'Q7-government', q: `How Fast Can We Start?`, a: `Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.`, evidence: ['PD-04'], audiences: ['variants'] },
  // WP37 (cycle-14 review): the Our Model page says the same timeline once, in two sentences, instead of the shared answer's second sentence that counts Week 1 to 3 out again. WP40 (cycle-17 review): YouthWIDE uses this variant too.
  { id: 'Q7-model', q: `How Fast Can We Start?`, a: `Target timing for grant-funded pilots: about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Public procurement follows the agency’s own timeline.`, evidence: ['PD-04'], audiences: ['variants'] },
  // WP37 (cycle-14 review): Development Partners shows the three program results in Proof in Practice just above its FAQ, so its answer points there instead of stating them again. The bank's shared Q6 keeps the figures (no page shows it today).
  // WP51 (cycle-26 review): the question is "Can You Reach Women and Other Priority Groups?" (it was "Can It Reach Women and Marginalized Groups?"): the answer covers women and then priority groups; the shared Q6 asks the same question.
  { id: 'Q6-development-partners', q: `Can You Reach Women and Other Priority Groups?`, a: `Our women-focused programs report work outcomes; see Proof in Practice above. For other priority groups, we measure outcomes in each pilot. The randomized trial studied women aged 18–35 in Dhaka with at least a Secondary School Certificate (SSC), so it does not speak to other groups.`, evidence: ['PR-01', 'PR-02', 'PR-05', 'RC-01'], audiences: ['variants'] },
  // WP50 (cycle-25 review): Home's reporting answer is two plain sentences (the scorecard, then what partners receive), not the shared Q3, which reads as a governance answer (baseline, surveys, reports, documentary evidence, the scope clause).
  // Home uses this variant in place of Q3 (src/pages/index.astro); the shared Q3 stays in the bank (the hub's full list) and on the pages that print it (Development Partners, Foundations). It rests on PD-11 (the scorecard agreed before delivery),
  // PD-08 (monthly reports, follow-up survey results at 3, 6 and 12 months, independent evaluation welcome) and PD-09 (the follow-up surveys).
  { id: 'Q3-home', q: `How Do You Prove Outcomes?`, a: `A scorecard is agreed for every cohort before delivery. As agreed in the program scope, partners receive monthly reports and follow-up surveys at 3, 6 and 12 months, and independent evaluation is welcome.`, evidence: ['PD-11', 'PD-08', 'PD-09'], audiences: ['variants'] },
  { id: 'Q3-institution', q: `How Do You Prove Outcomes?`, a: `Baseline at enrollment, follow-up surveys at 3, 6 and 12 months, and documentary evidence of earnings where available; independent evaluation is welcome. Offer letters document job offers; payslips document employment earnings; platform logs or bank receipts document freelance earnings where available. Your institution receives monthly reports on enrollment, completion, certification, placements and first earnings.`, evidence: ['PD-09', 'PD-08', 'RC-01'], audiences: ['variants'] },
];

// WP24a: audience-specific variants of bank questions (never listed in `all`). Q1's first sentence names the reader's own setting; the rest of the answer is the bank's.
const bankAnswer = (id: string): Faq => {
  const f = faqs.find((x) => x.id === id);
  if (!f) throw new Error(`faqs: bank question ${id} is missing`);
  return f;
};
// WP67 (cycle-38 review, Gemini): PD-05's national tier ("National 100,000+ trainees"), for the Governments scale answer below; read from the register, never retyped, and the build stops if the register stops saying it.
const NATIONAL_SIZE = /National Design Option (\d[\d,]*\+) trainees/.exec(fact('PD-05').text)?.[1]; // WP69: the option is named "National Design Option" (owner item 3)
if (!NATIONAL_SIZE) throw new Error('faqs: PD-05 no longer reads "National Design Option N+ trainees"; update the Governments scale answer');
// WP63 (cycle-35 review, GPT-6.1 Sol G2): the bank answer's first sentence names what is tested and who chooses the tracks; each variant says it for its own reader and keeps the second sentence (the evidence statement) as it is.
const Q1_OPENING = 'We test local employer demand first and choose each country’s tracks with local partners.';
const q1Variant = (id: string, opening: string): Faq => {
  const q1 = bankAnswer('Q1');
  if (!q1.a.startsWith(Q1_OPENING)) throw new Error('faqs: Q1 no longer opens with its bank sentence; update the audience variants');
  return { ...q1, id, a: opening + q1.a.slice(Q1_OPENING.length), audiences: ['variants'] };
};
faqs.push(
  q1Variant('Q1-development-partners', 'We test local employer demand in your portfolio countries first and choose each country’s tracks with local partners.'),
  q1Variant('Q1-government', 'We test local employer demand, lab access and facilitator supply first and choose each country’s tracks with local partners.'),
  q1Variant('Q1-campus', 'We test local employer demand for your graduates’ skills and your campus labs first, and choose each country’s tracks with local partners.'),
  // Employers (WP32, cycle-9 review): the bank answer is about youth-program evidence and country tracks, which does not answer an employer. This answer repeats the Employers page's own statements
  // (the needs assessment, IN-10; the candidate-pool scope of talent requests, which its positioning statement rests on IN-10 and IN-04 for), so it claims nothing the page does not already say.
  // WP69 (owner item 1, 2026-10-21): the question is "Will This Work for Our Roles?" on this page (the answer below is about roles, not countries); the shared Q1 keeps "Will This Work in Our Country?" for the other audiences.
  {
    ...bankAnswer('Q1'),
    id: 'Q1-employer',
    q: `Will This Work for Our Roles?`,
    a: `We start with a needs assessment of your roles, tasks and required tools. For hiring, talent requests are scoped against the experience and credentials available in the candidate pool.`,
    evidence: ['IN-10', 'IN-04'],
    audiences: ['variants'],
  },
  // Governments: the national-scale answer. WP37 (cycle-14 review): the Her Power results and the contract scopes are in Results at a Glance and the table, so the answer stated only the phased approach and the design option, and closed on a link to the table
  // ("See the contract scopes above."). WP67 (cycle-38 review, Gemini): a question about national scale is answered with the delivered national program, so the answer gives Her Power's two counts again, in three short sentences (the FAQ cap, tests/wp30c.spec.ts), and the link
  // sentence is gone (it would be a fourth): "We scale in phases. Her Power, a national program, trained 25,125 women; CodersTrust provided the curriculum and trained 2,500 directly. A 100,000+ program is a design option we have not yet delivered."
  // The counts are the register's (CONTRACT_FIGURES: GV-01's 25,125 and GV-11's 2,500, which GV-13 holds too) and the 100,000+ is PD-05's national tier, all read, never retyped; CodersTrust's role is GV-11's "curriculum" and "trained directly", worded "provided the curriculum"
  // as the bank answer, the Investors answer and the Her Power case study word it, not "built".
  {
    ...bankAnswer('Q2'),
    id: 'Q2-government',
    // WP83 (owner answer 2026-10-23): Her Power's 25,125 is the national program's target, so the answer says "Her Power is a national program to train 25,125 women" (it said "..., a national program, trained 25,125 women;").
    a: `We scale in phases. Her Power is a national program to train ${CONTRACT_FIGURES.national} women; CodersTrust provided the curriculum and trained ${CONTRACT_FIGURES.direct} directly. A ${NATIONAL_SIZE} program is a design option we have not yet delivered.`,
    evidence: ['GV-01', 'GV-11', 'PD-05'],
    audiences: ['variants'],
  },
  // Investors (WP25s): the national-scale answer leads with CodersTrust's own role in Her Power (GV-11) before the national total (GV-01), which is the program's, not CodersTrust's.
  // WP33 (cycle-10 review): the bank answer's closing 41-word sentence is two sentences here (the same two claims, no "phase by phase" repeat of "in phases"). FAQ answers are at most three
  // sentences (tests/wp30c.spec.ts), so the two Her Power statements, each already a short clause, are one sentence joined by a semicolon.
  (() => {
    const q2 = bankAnswer('Q2');
    const national = 'Her Power is a national program of DoICT, the ICT Division, to train 25,125 women across 130 sub-districts (upazilas). CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,400 women directly.';
    const scale = 'We scale in phases: larger programs are designed to run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges, and a 100,000+ national program is a design option we plan phase by phase and have not yet delivered.';
    if (!q2.a.includes(national) || !q2.a.includes(scale)) throw new Error('faqs: Q2 no longer has the Her Power and scale sentences; update the investors variant');
    return {
      ...q2,
      id: 'Q2-investor',
      a: q2.a
        .replace(national, 'In Her Power, a national program of DoICT, the ICT Division, CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,400 women directly; the national program’s target is to train 25,125 women across 130 sub-districts (upazilas).')
        .replace(scale, 'We scale in phases: larger programs are designed to run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges. A 100,000+ national program is a design option we have not yet delivered.'),
      audiences: ['variants'] as Faq['audiences'],
    };
  })(),
  // Investors (WP39, cycle-16 review): "What JobReady Does", the band directly above the questions, lists what is live, what is in pre-launch and what is planned; the shared Q11 listed the same status a third time, so the
  // Investors answer points to that band (its words are the link). The shared Q11 stays as it is where it is asked elsewhere (Employers, JobReady@Work, the JobReady platform page).
  { ...bankAnswer('Q11'), id: 'Q11-investor', a: `Partly. See What JobReady Does above for the live, pre-launch and planned capabilities.`, inlineLink: { text: 'What JobReady Does', href: '#features' }, audiences: ['variants'] },
  // JobReady Platform (WP41, cycle-18 review): the "Rollout Status" band directly above its questions has the table (WP49, cycle-24 review: and no longer a "What Is Live Today" callout beside it), so the answer points to it (its words are the link, to the
  // band's id) and does not list the status a second time, as for Investors just above. The shared Q11 stays as it is where it is asked elsewhere (Employers, JobReady@Work).
  { ...bankAnswer('Q11'), id: 'Q11-platform', a: `Partly. See Rollout Status above for live, pre-launch and planned capabilities.`, inlineLink: { text: 'Rollout Status', href: '#status' }, audiences: ['variants'] },
  // Universities: "what happens when funding ends", in campus terms, from the bank answer's own content (facilitators, curricula, the alumni network) and the campus delivery model (campus labs as blended-learning centers).
  {
    id: 'Q10-campus',
    q: `What Happens After the First Cohort?`,
    a: `Where included in the program scope, what the program builds stays on your campus: certified local facilitators, localized curricula and campus labs that serve as blended-learning centers. Completers join CodersTrust’s alumni network after their three months of mentoring.`,
    evidence: ['PD-06', 'PD-01'],
    audiences: ['variants'],
  },
);

/** The questions tagged for one audience, in bank order (`faqsFor('all')` is the full Q1–Q14 list). */
export function faqsFor(audience: FaqAudience): Faq[] {
  return faqs.filter((f) => f.audiences.includes(audience));
}
