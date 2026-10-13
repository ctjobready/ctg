// Shared copy blocks (plan v1.2: messaging framework §1, §4.0, §8, §9 and page-spec shared blocks).
// Pages import these instead of retyping them, so a wording change from review is one edit here.
// Every number inside a block is a registered fact; render footnote markers for the IDs in `facts`.

import { fact } from './facts';

export interface CopyBlock {
  text: string;
  /** Fact IDs whose footnote markers accompany the block. */
  facts: string[];
}

export type Audience =
  | 'home'
  | 'developmentPartners'
  | 'governments'
  | 'foundations'
  | 'universities'
  | 'employers'
  | 'investors'
  | 'localPartners'
  | 'nuPgd';

/** C1 value propositions — one sentence, at most 15 words (CMF). */
export const VALUE_PROPOSITION: Record<Audience, string> = {
  home: 'Help educated, unemployed youth reach paid digital work through training, mentoring and placement support.',
  developmentPartners: 'We help development partners prepare educated, unemployed youth for paid work through mentored, certification-focused training.',
  governments: 'We help governments prepare educated, unemployed youth for paid digital work through mentored, certification-focused training.',
  foundations: 'We help funders back mentored, certification-focused training that prepares youth for paid digital work.',
  universities: 'We help universities and colleges prepare students for paid work through mentored, certification-focused training.',
  employers: 'We help employers upskill their teams for AI and digital work, and connect them to job-ready digital talent through our placement team.',
  investors: 'We help investors back JobReady’s staged rollout, built on CodersTrust’s training and mentoring programs for emerging-market youth.',
  localPartners: 'We help local organizations prepare young people for paid digital work through mentored, certification-focused training.',
  nuPgd: 'We help degree holders prepare for digital work through a National University postgraduate diploma.',
};

/** C1 identity-hook headlines — 6 to 12 words, about the reader (CMF). */
export const HEADLINE: Record<Audience, string> = {
  home: 'Turn Youth Unemployment into Digital Employment — with Evidence.',
  developmentPartners: 'Youth Employment Results You Can Report — Not Just Training Numbers.',
  governments: 'Build a National Digital Workforce from Graduates and Digital Labs.',
  foundations: 'Fund a Supported Path from Learning to Earning.',
  universities: 'Help Your Graduates Build Job-Ready Digital Skills.',
  employers: 'Upskill Your Teams for AI — and Hire Job-Ready Digital Talent.',
  investors: 'Invest in the Platform Connecting Emerging-Market Youth to Work.',
  localPartners: 'Deliver Digital-Skills Programs That Lead to Paid Work — in Your Community.',
  nuPgd: 'Build Practical Digital Skills After Your Degree.',
};

/** C5 opens with empathy for the reader's struggling moment, then ORIGIN, authority and the method signal. */
export const EMPATHY: Record<Audience, string> = {
  home: 'You need more than enrollment numbers: you need credible evidence that young people are moving into paid work.',
  developmentPartners: 'You need more than enrollment numbers: you need credible evidence that young people are moving into paid work.',
  governments: 'You answer for training budgets that must show up as young people in work, not only as seats filled.',
  foundations: "You want your grant to change a young person’s income, and you need evidence that it did — not only a count of hours attended.",
  universities: 'You see capable students finish their degrees and still struggle to find work, and you are asked for placement results you cannot yet show.',
  employers: 'You have roles to fill and teams that need AI skills faster than hiring or generic courses can supply them.',
  investors: 'Investors weighing a market with real demand for skills need to distinguish a model that is working from one that is only promised.',
  localPartners: 'You reach young people that central programs miss, often without the curriculum, certification and placement links to finish the job.',
  nuPgd: 'You worked hard for your degree, and the job offers did not follow — and it is hard to know which skills to add next.',
};

export const ORIGIN: CopyBlock = {
  text: 'CodersTrust launched in 2014 in Copenhagen and began developing freelancers in Bangladesh. Our first UNDP-supported pilot (2015) was in Dhaka’s Korail settlement.',
  facts: ['ID-02', 'PR-03a'],
};

/** H2 of an evidence band headed by the randomized trial; the RC-01 headline sentence is body text below it (ProofBand, EvidenceBand). */
export const TRIAL_BAND_HEADING = 'An Independent Randomized Trial';

export const RCT_HEADLINE: CopyBlock = {
  text: fact('RC-01').headline ?? fact('RC-01').text,
  facts: ['RC-01'],
};

/**
 * Relevance line (review round 14, m2), set directly under the randomized-trial headline on the pages whose offering the trial did not
 * evaluate: /partner-with-us/employers/ and /programs/jobready-work/ (JobReady@Work) and /programs/nu-postgraduate-diploma/ (the NU Postgraduate
 * Diploma). It restates RC-01's scope (the WSDFM program, women in Dhaka) and adds no figure. The trial stays organizational evidence, not
 * evidence for the offering on the page. scripts/check-facts.mjs pins the sentence on these three pages.
 */
export const trialScope = (offering: string): CopyBlock => ({ text: `This trial evaluated WSDFM training for women in Dhaka, not ${offering}.`, facts: ['RC-01'] });
export const TRIAL_SCOPE = {
  work: trialScope('JobReady@Work'),
  nuPgd: trialScope('the NU Postgraduate Diploma'),
};

/**
 * C6a positioning statements (CMF C6; doc 04 §1). Each conversion page's C6 OPENS with its statement (no lead line before it), in the pattern
 * "For [audience] who need [outcome], CodersTrust [category] that [differentiator]. Unlike [alternative], we [proof-backed difference]."
 * The pattern is split at its semicolon into two sentences so that neither runs past about 50 words (review round 11, F26). The closing
 * clause is the approved [UNLIKE] wording of doc 04 §1 on every page, verbatim; no page swaps in a different "we" clause.
 * Built only from the approved positioning table and existing page copy: no figures and no named competitors; other approaches
 * are described by what they typically focus on, with "provision varies by provider". The NU postgraduate diploma page
 * has no statement: its copy waits for National University sign-off.
 */
export type PositioningKey = Exclude<Audience, 'nuPgd'> | 'youthwide' | 'nationwide' | 'campus' | 'work' | 'superkids';

/** The approved [UNLIKE] + [WE] wording (doc 04 §1), word for word. */
const UNLIKE_APPROVED =
  'Unlike approaches that typically focus on one part of the path — training-only programs, self-paced course platforms or freelance marketplaces alone (provision varies by provider) — we design, deliver and track the whole path to earnings, working in phases through existing labs and colleges, with outcome evidence that includes a randomized trial by BIGD.';

/** JobReady@Work's closing sentence: what an employer gets from the program itself (all of it from IN-10 and the page's own steps). */
const WORK_POSITIONING =
  'Each program starts with a needs assessment of your roles, is delivered through workshops on tasks from those roles, and is checked against success measures you agree before you start.';

/** Home's closing sentences (WP19, item 13): two plain sentences in place of the long [UNLIKE] sentence; scripts/check-facts.mjs pins them for Home only. */
const HOME_POSITIONING =
  'Most programs cover one step: training, self-paced courses or freelance matching. CodersTrust connects training, mentoring and placement support in one program, and partners receive monthly reports on progress toward paid work.';

export const POSITIONING: Record<PositioningKey, CopyBlock> = {
  home: {
    text: `For funders who need educated, unemployed youth in paid digital work, CodersTrust offers an integrated training-to-earnings model. ${HOME_POSITIONING}`,
    facts: ['PD-08'],
  },
  developmentPartners: {
    text: `For development partners and INGOs who need youth employment results they can report, CodersTrust offers an integrated training-to-earnings model that tracks outcomes after every course. ${UNLIKE_APPROVED}`,
    facts: ['RC-01'],
  },
  governments: {
    text: `For governments who need educated, unemployed youth in paid digital work through the labs and colleges they already have, CodersTrust offers an integrated training-to-earnings model. ${UNLIKE_APPROVED}`,
    facts: ['RC-01'],
  },
  foundations: {
    text: `For foundations and CSR funders who need a grant to change a young person’s income, and evidence that it did, CodersTrust offers an integrated training-to-earnings model with a pilot scorecard agreed in co-design. ${UNLIKE_APPROVED}`,
    facts: ['RC-01', 'PD-11'],
  },
  universities: {
    text: `For universities and colleges who need their degree holders in paid digital work, CodersTrust offers an integrated training-to-earnings model that runs alongside the degree. ${UNLIKE_APPROVED}`,
    facts: ['RC-01'],
  },
  employers: {
    // WP20b: employer-specific (the [UNLIKE] sentence describes the youth-cohort model); scripts/check-facts.mjs may pin it for this page only.
    text: 'CodersTrust offers employer training built from a needs assessment, and job-ready digital talent through its placement team. Training is customized to your roles; talent requests are scoped against the experience and credentials available in the candidate pool.',
    facts: ['IN-10', 'IN-04'],
  },
  investors: {
    text: `For impact and growth investors weighing a platform for emerging-market youth employment, CodersTrust offers JobReady, a platform rolling out in stages on top of its training and mentoring programs. Its results are measured, reported and open to independent evaluation. ${UNLIKE_APPROVED}`,
    facts: ['RC-01'],
  },
  localPartners: {
    text: `For Bangladeshi NGOs, colleges and chambers who need to move young people in their communities into paid digital work, CodersTrust offers an integrated training-to-earnings model delivered through certified local facilitators and existing labs. ${UNLIKE_APPROVED}`,
    facts: ['RC-01', 'PD-06'],
  },
  youthwide: {
    text: `For development partners and funders who need educated, unemployed youth in paid digital work in South Asia, the Middle East and North Africa, or Sub-Saharan Africa, CodersTrust offers YouthWIDE, the program through which funders deploy its integrated training-to-earnings model in a country. ${UNLIKE_APPROVED}`,
    facts: ['IN-02', 'RC-01'],
  },
  nationwide: {
    text: `For ministries, agencies and national funders who need educated, unemployed youth in paid digital work, CodersTrust offers YouthWIDE in Bangladesh, a national initiative. ${UNLIKE_APPROVED}`,
    facts: ['IN-01', 'RC-01'],
  },
  campus: {
    text: `For universities and colleges who need their degree holders to leave with a practical route into digital work, CodersTrust offers JobReady@Campus, training with industry-certification preparation that runs in parallel with academic studies. ${UNLIKE_APPROVED}`,
    facts: ['IN-09', 'RC-01'],
  },
  work: {
    // WP18b: an employer-specific closing sentence in place of [UNLIKE] (which is about youth programs); scripts/check-facts.mjs pins it for this page only.
    text: `For employers who need teams ready to use AI in their daily work, CodersTrust offers JobReady@Work, training custom-developed for each organization. ${WORK_POSITIONING}`,
    facts: ['IN-10'],
  },
  // SuperKids carries no "unlike … we …" clause (review round 9, Mi3): neither a registered fact nor approved wording in this file
  // supports a comparison with other approaches, so the statement stops at what GV-08 and the page definition already say.
  superkids: {
    text: 'For schools and education partners who want children to build digital skills early, CodersTrust offers SuperKids, a K-12 STEAM program of block coding, robotics and digital art, offered through schools and education partners under agreements with DoICT and NCTB (agreements and targets, not delivered reach).',
    facts: ['GV-08'],
  },
};

/**
 * Ranked C2b pains for the three bespoke conversion pages (review round 14, M4): Home and YouthWIDE (a funder audience) and the
 * local-partners page. Each page's C2 band lists them as P1 to P3 (`name` as the heading, `text` under it, in the reader's own words)
 * and its C8 table has exactly one row per pain: pain (`name`) → how we relieve it → the registered feature behind it. Both bands read
 * this list, so the wording cannot drift between them; scripts/check-facts.mjs checks the one-to-one map from the built pages
 * (`data-pain` in C2, `data-relieves` in C8). The pains carry no figure; `facts` ties one to the register fact it rests on.
 */
export type PainId = 'P1' | 'P2' | 'P3';
export interface Pain {
  id: PainId;
  name: string;
  text: string;
  facts?: string[];
}
export const FUNDER_PAINS: Pain[] = [
  { id: 'P1', name: 'Trained youth who never reach paid work', text: 'A course ends, and the way into a job, a freelance client or a business of their own is left to the learner.' },
  { id: 'P2', name: 'Results you cannot verify or report', text: 'Enrollment is easy to count. Showing who started earning, to a board or an evaluator, is much harder.' },
  { id: 'P3', name: 'Skills that age fast as AI changes entry-level work', text: 'AI is shifting which entry-level skills employers ask for, so last year’s course list can miss this year’s demand.', facts: ['PX-06'] },
];
export const LOCAL_PARTNER_PAINS: Pain[] = [
  { id: 'P1', name: 'Missing curriculum, trainers and certification', text: 'You reach the young people, but a ready curriculum, trained facilitators and a route to industry certification are often out of reach.' },
  { id: 'P2', name: 'Missing work-entry connections', text: 'Training that stops at the classroom door leaves completers without links to employers, clients and platforms.' },
  { id: 'P3', name: 'Reporting and accountability demands', text: 'Funders ask who is earning, but training is still measured by enrollment, not earnings.' },
];
/** A pain as the C2 list (GainsPains) takes it. */
export const painForList = (p: Pain) => ({ id: p.id, q: p.name, text: p.text, facts: p.facts });
/** The `painId` and `relieves` fields of the C8 row (FeaturesTable) that relieves pain `id` of `pains`. */
export const painForRow = (pains: Pain[], id: PainId) => {
  const p = pains.find((x) => x.id === id);
  if (!p) throw new Error(`painForRow: no pain ${id}`);
  return { painId: p.id, relieves: p.name };
};

/**
 * [PLAIN-LINE] (plan v1.10 enhancement; RC-02): the plain-language reading of the employment effect in percentage points (not the relative
 * +20% of RC-01), used directly after the randomized-trial lead on Home C7 and the development-partners C7, and in the independent-evaluation BLUF.
 * Both numbers are derived from RC-02's stat, so the sentence cannot drift from the register: "+10.3 percentage points" is the stat value with
 * its "pp" spelled out, and "about 10" is that value rounded to a whole number of women per 100.
 */
function plainLine(): CopyBlock {
  const s = fact('RC-02').stat;
  if (!s || s.numeric === undefined || !/^\+[\d.]+ pp$/.test(s.value)) {
    throw new Error(`PLAIN_LINE: RC-02 no longer has a "+N pp" stat value with a numeric part: ${JSON.stringify(s)}`);
  }
  const points = s.value.replace(/ pp$/, ' percentage points');
  return {
    text: `For every 100 women offered a place, about ${Math.round(s.numeric)} more were in work at follow-up than among 100 comparable women in the control group (${points}).`,
    facts: ['RC-02'],
  };
}
export const PLAIN_LINE: CopyBlock = plainLine();

/**
 * Employment at follow-up in the randomized trial, read from RC-02's text ("than the control group (52.8%)"), so the Home C7
 * comparison chart never retypes a figure. The women offered a place are the control rate plus RC-02's stat (+10.3 pp). It throws
 * if the text stops reading that way.
 */
export interface RctComparison {
  control: number;
  offered: number;
  /** RC-02's stat value, e.g. "+10.3 pp". */
  delta: string;
}
function rctComparison(): RctComparison {
  const rc02 = fact('RC-02');
  const m = rc02.text.match(/than the control group \((\d+(?:\.\d+)?)%\)/);
  if (!m || !rc02.stat || rc02.stat.numeric === undefined) {
    throw new Error(`RCT_COMPARISON: RC-02's text no longer states "than the control group (X%)": "${rc02.text}"`);
  }
  const control = Number(m[1]);
  return { control, offered: Math.round((control + rc02.stat.numeric) * 10) / 10, delta: rc02.stat.value };
}
export const RCT_COMPARISON: RctComparison = rctComparison();

/**
 * SC-01 and SC-03 stated apart (review round 13, M3): the 130,000+ trained is mostly in Bangladesh, and the international programs are
 * a smaller share (no enrollment figures are given here). Used wherever the two figures sit side by side (the C5 guide bands). The
 * count of other locations is SC-03's 15 less Bangladesh, so it is derived, not typed.
 */
function trainedReach(): CopyBlock {
  const sc01 = fact('SC-01');
  const sc03 = fact('SC-03');
  if (sc03.stat?.numeric === undefined) throw new Error('TRAINED_REACH: SC-03 has no numeric stat');
  const others = sc03.stat.numeric - 1;
  return {
    text: `${sc01.text}, most of them in Bangladesh; programs have also run in ${others} other countries and territories.`,
    facts: ['SC-01', 'SC-03'],
  };
}
export const TRAINED_REACH: CopyBlock = trainedReach();

export const SCALE: CopyBlock = {
  text: 'We scale in phases, starting from what we have done: government contracts with training scopes ranging from 120+ professionals to 3,120+ digital-lab staff, and a national program that trained 25,125 women across 130 sub-districts (upazilas), for which CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,500 women directly; separately, 10,000 teachers were trained to teach online during COVID-19. Larger programs use existing labs and colleges, certified local facilitators and blended delivery, with up to 10 cohorts running in parallel.',
  facts: ['GV-10', 'GV-01', 'GV-11', 'SC-08', 'PD-06'],
};

export const PRICING: CopyBlock = {
  text: 'Pricing is set per program, and we share an indicative budget in the discovery session. Standard inclusions: outreach and selection, blended training, an AI-ready curriculum, certification exam preparation (exam fee included), three months of mentoring, placement support, monthly reporting and outcome tracking for 12 months after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where a program needs them. AI-ready curriculum: each track’s AI content and work-entry plan are agreed with you before enrollment; we do not yet publish a track-by-track breakdown.',
  facts: ['PD-02', 'PD-02a'],
};

export const SPEED: CopyBlock = {
  text: 'For grant-funded pilots: about three weeks from first conversation to agreement, and the first cohort in training 6–8 weeks after signing. Public procurement follows the agency’s own timeline.',
  facts: ['PD-04'],
};

/** C13 urgency line for the universities page: a university's start follows its academic calendar, so it makes no grant-pilot timing claim (PD-04 is for grant-funded pilots). */
export const SPEED_UNIVERSITIES: CopyBlock = {
  text: 'Timing follows your academic calendar: tracks and campus labs are agreed in co-design before the first cohort starts.',
  facts: [],
};

export const SURVEY_EMPLOYMENT: CopyBlock = {
  text: 'Among surveyed completers, employment rose from 47.4% before training to 77.9% at the October 2026 survey.',
  facts: ['OC-01'],
};

export const WOMEN_INCLUSION: CopyBlock = {
  // PR-01, PR-02 and PR-05 are program results, stated plainly.
  text: 'Women-focused programs report their own results: WSDFM 71% in work; Women in Online Work, Kosovo 68% in work; Her Power 372 of 800 tracked women, from the 2,500 trained directly by CodersTrust, in work (47%).',
  facts: ['PR-01', 'PR-02', 'PR-05'],
};

export const GOVERNANCE: CopyBlock = {
  text: 'CodersTrust contracts through CT USA, Inc. in the United States or CodersTrust Bangladesh Ltd. in Bangladesh; the contracting entity depends on the program’s country and the funder’s requirements. Legal-status and due-diligence documents for a specific program are confirmed with the funder during co-design.',
  facts: ['ID-07', 'PD-13'],
};

export const SAFEGUARDING: CopyBlock = {
  text: 'Each program design specifies consent, protected records, grievance handling, harassment and fraud response, referral pathways and arrangements for participants under 18. These are agreed and documented before enrollment.',
  facts: ['PD-12'],
};

export const SCORECARD: CopyBlock = {
  text: 'A pilot scorecard is agreed in co-design: completion, certification, first paid work, sustained work (for example, earnings in at least three of six months above an agreed minimum), and cost per completer and per verified outcome. Missed thresholds trigger a corrective plan, expansion is the funder’s decision, and independent evaluation is welcome.',
  facts: ['PD-11'],
};

export const PROGRAM_OPTIONS = [
  { name: 'Multi-Cohort Pilot Program', size: '1,000–2,500 trainees', duration: '8–14 months (tracking to month 23)', note: 'Prove the model in one country or region.' },
  { name: 'Scale', size: '10,000–25,000 trainees', duration: '12–18 months rolling', note: 'Expand to more cohorts and locations on the pilot’s results.' },
  { name: 'National', size: '100,000+ trainees', duration: '3–5 years', note: 'A design option we plan phase by phase; not yet delivered at this size.' },
] as const;
export const PROGRAM_OPTIONS_FACTS = ['PD-05'];

/** "How it works in three steps" (C8d) for funded programs. */
export const STEPS = [
  { title: 'Discover and Co-Design', text: 'A discovery session sets priority groups, tracks, the indicative budget and the pilot scorecard; each track’s demand and work-entry plan is approved before enrollment.' },
  { title: 'Train and Mentor', text: '100 training hours per certification, then three months of milestone-based one-to-one mentoring, with placement support alongside, toward each track’s agreed work-entry goal (for freelance tracks: profile live, first bids, first client).' },
  { title: 'Place and Report', text: 'Placement support, monthly reports and tracer surveys at 3, 6 and 12 months.' },
] as const;
export const STEPS_FACTS = ['PD-19', 'PD-01', 'PD-15', 'PD-08', 'PD-09'];

/** Home C13 backward-planning line (WP17): the same registered timing as SPEED (PD-04), stated as a plan to work back from. */
export const BACKWARD_PLAN: CopyBlock = {
  text: 'Allow about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Work backward from your intended training start date.',
  facts: ['PD-04'],
};

export const MICRO_COMMITMENT = 'A discovery session is a conversation, not a commitment.';

/**
 * [SESSION-AGENDA] (plan v1.12 round-11 enhancement, v1.13 wording; grounded in PD-04, PD-11, PD-19 and FAQ Q8): what the first conversation
 * covers, as ONE sentence beside the C13 primary CTA: the lead, three items separated by semicolons and a single final period. It is shown
 * on the development-partners and foundations pages and on YouthWIDE, where the CTA books a discovery session (first item: your country,
 * priority groups and locations), and on the governments page and YouthWIDE in Bangladesh, where the primary CTA is a briefing (first item: your priority
 * groups and districts); see <SessionAgenda>. The micro-commitment line stays where it is.
 *
 * "an indicative budget" makes the same claim as [PRICING] and FAQ Q8, so the agenda rests on the same fact, PD-02: `facts` becomes its
 * data-fact marker exactly as [PRICING]'s does, so the agenda, [PRICING] and Q8 stand or fall together.
 */
export const SESSION_AGENDA_LEAD = 'What the discovery session covers:';
/** The lead on the pages whose primary CTA is "Request a Briefing" (governments, YouthWIDE in Bangladesh). */
export const SESSION_AGENDA_LEAD_BRIEFING = 'What the briefing covers:';
/** The first item differs by kind (round 12, Mi1: "districts" does not fit the international pages). */
export const SESSION_AGENDA_FIRST_ITEM = 'your country, priority groups and locations';
export const SESSION_AGENDA_FIRST_ITEM_BRIEFING = 'your priority groups and districts';
/** The governments page serves ministries in any country, so its briefing names "locations"; "districts" stays on YouthWIDE in Bangladesh (Bangladesh's national program). */
export const SESSION_AGENDA_FIRST_ITEM_GOVERNMENTS = 'your priority groups and locations';
/** The second and third items are shared. */
export const SESSION_AGENDA_COMMON_ITEMS = ['employer demand and certification tracks', 'an indicative budget, the pilot scorecard and the tracer timeline'] as const;
export const SESSION_AGENDA_FACTS = ['PD-02'];
/**
 * "What the discovery session covers: your country, priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the tracer timeline."
 * or, for the YouthWIDE Bangladesh briefing: "What the briefing covers: your priority groups and districts; employer demand and certification tracks; …",
 * or, for the governments briefing: "What the briefing covers: your priority groups and locations; employer demand and certification tracks; …".
 */
export const sessionAgendaText = (kind: 'discovery' | 'briefing' | 'governments' = 'discovery'): string => {
  const lead = kind === 'discovery' ? SESSION_AGENDA_LEAD : SESSION_AGENDA_LEAD_BRIEFING;
  const first = kind === 'governments' ? SESSION_AGENDA_FIRST_ITEM_GOVERNMENTS : kind === 'briefing' ? SESSION_AGENDA_FIRST_ITEM_BRIEFING : SESSION_AGENDA_FIRST_ITEM;
  return `${lead} ${[first, ...SESSION_AGENDA_COMMON_ITEMS].join('; ')}.`;
};

/** C14 post-decision reinforcement (messaging framework §8). */
export const C14 = {
  validate: { text: 'Organizations that have worked with CodersTrust include UNDP (from 2015), the World Bank Group and BRAC.', facts: ['PA-01'] } as CopyBlock,
  reminder: { text: 'For grant-funded pilots, we plan for the first cohort to begin training 6–8 weeks after signing, and monthly reports follow from the first cohort.', facts: ['PD-04', 'PD-08'] } as CopyBlock,
  firstAction: 'Your first step: a discovery session. In your inquiry, include two suitable times for a discovery conversation.',
  variants: {
    governments: 'Your agency’s procurement timeline sets the pace; we start with a briefing.',
    investors: 'Your first step: an introduction call.',
  },
};

/** "What is CodersTrust?" sits in DefinitionBand directly below each hero (GEO definition, not C1 copy). */
export const DEFINITION_HEADING = 'What Is CodersTrust?';

export const HOME_META = {
  // A colon, not a dash: scripts/check-title-case.mjs lowercases "From" after an em dash, and the title keeps its capital F.
  title: 'CodersTrust: From Learning to Earning for Youth',
  description: 'A randomized trial of a predecessor program found women offered a place were 10.3 percentage points more likely to be employed. We prepare youth for work.',
};

/** Investors page market section (no market-size figures on public pages, D2). */
export const INVESTOR_MARKET: CopyBlock = {
  text: 'Market opportunity: four sectors in emerging markets — skill training, freelance marketplaces and job sites, HR tech and higher-ed EdTech.',
  facts: ['PX-08', 'PX-05'],
};

/** C11 on funder-facing pages (Home, development partners, foundations, YouthWIDE), after the program options. */
export const ACCOUNTABILITY: CopyBlock = {
  text: 'Every pilot is judged on cost per completer and per verified outcome, with thresholds agreed with you before the first cohort starts.',
  facts: ['PD-11'],
};
