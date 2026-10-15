// Shared copy blocks (plan v1.2: messaging framework §1, §4.0, §8, §9 and page-spec shared blocks).
// Pages import these instead of retyping them, so a wording change from review is one edit here.
// Every number inside a block is a registered fact; render footnote markers for the IDs in `facts`.

import { fact } from './facts';

/**
 * WP27: the one eligibility statement for the NU Postgraduate Diploma, NU-01 verbatim ("Honors / Diploma holders with a minimum CGPA of 2.25"). The menu
 * description, the Home program card, the Programs hub card and finder, the FAQs and the course pages state it in these words, so no surface says "degree
 * holders" (a different, wider group) where admissions says honors or diploma holders with a minimum CGPA.
 */
export const NU_ELIGIBILITY: string = fact('NU-01').text;

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
  // WP32 (cycle-9 review): "staged rollout" alone did not say what is live, so the hero adds IN-04's status in one sentence (the Investors page marks the lead data-fact="IN-04"); it is two sentences by design.
  // The two marketplaces are named as two, as IN-04 and tests/wp25s.spec.ts ("named as two") have them: never "the employer and gig-work marketplaces".
  investors: 'Back JobReady’s staged rollout, built on CodersTrust’s training and mentoring programs. Partner portals and AI chat are live; the employer marketplace and the gig-work (Earn) marketplace are in pre-launch.',
  localPartners: 'We help local organizations prepare young people for paid digital work through mentored, certification-focused training.',
  nuPgd: 'We help learners prepare for digital work through a National University postgraduate diploma.',
};

/** C1 identity-hook headlines — 6 to 12 words, about the reader (CMF). */
export const HEADLINE: Record<Audience, string> = {
  home: 'Turn Youth Unemployment into a Digital Workforce — with Evidence',
  developmentPartners: 'Youth Employment Results You Can Report — Not Just Training Numbers',
  governments: 'Build a National Digital Workforce Through Graduates and Digital Labs',
  foundations: 'Fund a Supported Path from Learning to Earning',
  universities: 'Give Your Graduates a Route into Paid Digital Work',
  employers: 'Upskill Your Teams for AI — and Hire Job-Ready Digital Talent',
  investors: 'Invest in the Platform Connecting Emerging-Market Youth to Work',
  localPartners: 'Bring Paid Digital Work Within Reach of Your Community',
  nuPgd: 'Build Practical Digital Skills After Your Degree',
};

/** C5 opens with empathy for the reader's struggling moment, then ORIGIN, authority and the method signal. */
export const EMPATHY: Record<Audience, string> = {
  home: 'You need more than enrollment numbers: you need credible evidence that young people are moving into paid work.',
  developmentPartners: 'You need more than enrollment numbers: you need credible evidence that young people are moving into paid work.',
  governments: 'You answer for training budgets that must show up as young people in work, not only as seats filled.',
  foundations: "You want your grant to change a young person’s income, and you need evidence that it did — not only a count of hours attended.",
  universities: 'You see capable students finish their degrees and still struggle to find work, and you are asked for placement results you cannot yet show.',
  employers: 'You have roles to fill and teams that need AI skills faster than hiring or generic courses can supply them.',
  investors: 'Impact investors need to distinguish a model that is working from one that is only promised.',
  localPartners: 'You reach young people that national programs miss, often without the curriculum, certification and placement links to finish the job.',
  nuPgd: 'You worked hard for your degree, but the job offers did not follow, and it is hard to know which skills to add next.',
};

export const ORIGIN: CopyBlock = {
  text: 'CodersTrust launched in 2014 in Copenhagen and began developing freelancers in Bangladesh. Our first UNDP-supported pilot (2015) was in Dhaka’s Korail settlement.',
  facts: ['ID-02', 'PR-03a'],
};

/**
 * ORIGIN in one line, for the audience pages' Guide band (WP38, cycle-15 review: the two-sentence history was word for word on seven pages). Home keeps ORIGIN whole. The year is ID-02's stat value ("2014") and the
 * count of countries and territories is SC-03's ("15"), so the line cannot drift from the register; the builder throws if either stat changes shape.
 */
function originShort(): CopyBlock {
  const year = fact('ID-02').stat?.value;
  const countries = fact('SC-03').stat?.value;
  if (!year || !/^\d{4}$/.test(year) || !countries || !/^\d+$/.test(countries)) throw new Error('ORIGIN_SHORT: ID-02 or SC-03 no longer has the expected stat value');
  return { text: `Since ${year}, from a Copenhagen launch to programs in ${countries} countries and territories.`, facts: ['ID-02', 'SC-03'] };
}
export const ORIGIN_SHORT: CopyBlock = originShort();

/**
 * ORIGIN_SHORT without the count, for a Guide band that already shows SC-03's tile (Development Partners: "15 countries and territories, including Bangladesh" sits beside it), so the figure is not stated twice in one band.
 * The year is ID-02's stat value, as in ORIGIN_SHORT.
 */
function originLaunch(): CopyBlock {
  const year = fact('ID-02').stat?.value;
  if (!year || !/^\d{4}$/.test(year)) throw new Error('ORIGIN_LAUNCH: ID-02 no longer has a four-digit stat value');
  return { text: `Launched in Copenhagen in ${year}.`, facts: ['ID-02'] };
}
export const ORIGIN_LAUNCH: CopyBlock = originLaunch();

/** H2 of an evidence band headed by the randomized trial; the RC-01 headline sentence is body text below it (ProofBand, EvidenceBand). */
export const TRIAL_BAND_HEADING = 'An Independent Randomized Trial';

export const RCT_HEADLINE: CopyBlock = {
  text: fact('RC-01').headline ?? fact('RC-01').text,
  facts: ['RC-01'],
};

/**
 * Relevance line (review round 14, m2), set directly under the randomized-trial headline on the pages whose offering the trial did not
 * evaluate: /programs/nu-postgraduate-diploma/ (the NU Postgraduate Diploma) and, should a trial band return to them, /partner-with-us/employers/ and
 * /programs/jobready-work/ (JobReady@Work). It restates RC-01's scope (the WSDFM program, women in Dhaka) and adds no figure. The trial stays organizational
 * evidence, not evidence for the offering on the page. scripts/check-facts.mjs pins the sentence on these pages.
 * WP31 (cycle-8 review): the two JobReady@Work pages no longer carry a trial band (they link to the evidence pages), so `work` is not rendered today;
 * the gate still requires the sentence on any proof band either page grows.
 * WP34 (cycle-11 review): the NU Postgraduate Diploma overview no longer carries a trial band either (a one-link strip stands in), so `nuPgd` is not rendered today
 * and the gate treats that page the same way.
 */
export const trialScope = (offering: string): CopyBlock => ({ text: `This trial evaluated WSDFM training for women in Dhaka, not ${offering}.`, facts: ['RC-01'] });
export const TRIAL_SCOPE = {
  work: trialScope('JobReady@Work'),
  nuPgd: trialScope('the NU Postgraduate Diploma'),
};

/**
 * C6a positioning statements (CMF C6; doc 04 §1). Each conversion page's C6 OPENS with its statement (no lead line before it): an audience sentence in the pattern
 * "For [audience] who need [outcome], CodersTrust [category] that [differentiator]." and then the shared closing sentences (UNLIKE_APPROVED).
 * The statement is split into sentences so that none runs past about 50 words (review round 11, F26). The closing
 * sentences are the shared wording on every page that uses it, verbatim; no page swaps in a different "we" clause.
 * WP31 (cycle-8 review): the long "Unlike approaches that typically focus on one part of the path …" sentence, which eight pages repeated, is two plain sentences now.
 * Built only from the approved positioning table and existing page copy: no figures and no named competitors.
 * The NU postgraduate diploma page has no statement: its copy waits for National University sign-off.
 * WP39 (cycle-16 review): the Investors page has none either: its statement restated the hero lead and returned to cohort language on a page about backing the platform, and "How JobReady Builds on Delivery" says how the
 * platform relates to delivery once; scripts/check-facts.mjs exempts that one page (POSITION_EXEMPT_PAGES).
 * WP36: YouthWIDE's statement is the two shared sentences alone, with "YouthWIDE" in place of "We" (its audience and regions are in the hero and the glance right above it); the gate declares it whole for that page.
 * WP40 (cycle-17 review): Local Partners' statement is two sentences that divide the work (the partner mobilizes and hosts; CodersTrust supports delivery, mentoring, placement and reporting), because its audience and outcome
 * are in the hero and the problem band above and the four responsibility cards follow it; the gate declares it whole for that page as well (POSITION_WHOLE_STATEMENT).
 */
export type PositioningKey = Exclude<Audience, 'nuPgd' | 'investors'> | 'youthwide' | 'nationwide' | 'campus' | 'work' | 'superkids';

/**
 * The shared closing of the positioning statements (the slot doc 04 §1 calls [UNLIKE] + [WE]), word for word; scripts/check-facts.mjs declares it independently (UNLIKE_SENTENCE).
 * WP31: two plain sentences in place of the long comparison sentence. It rests on PD-01 (training, mentoring, placement support) and PD-08 (monthly reports).
 */
const UNLIKE_APPROVED =
  'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.';

/** JobReady@Work's closing sentence: what an employer gets from the program itself (all of it from IN-10 and the page's own steps). */
const WORK_POSITIONING =
  'Each program starts with a needs assessment of your roles, is delivered through workshops on tasks from those roles, and is checked against success measures you agree before you start.';

/** Home's closing sentences (WP19, item 13): two plain sentences in place of the long [UNLIKE] sentence; scripts/check-facts.mjs pins them for Home only. */
const HOME_POSITIONING =
  'Many programs cover one step: training, self-paced courses or freelance matching. CodersTrust connects training, mentoring and placement support in one program, and partners receive monthly reports on progress toward paid work.';

export const POSITIONING: Record<PositioningKey, CopyBlock> = {
  home: {
    text: `For funders who need educated, unemployed youth in paid digital work, CodersTrust offers an integrated training-to-earnings model. ${HOME_POSITIONING}`,
    facts: ['PD-08'],
  },
  developmentPartners: {
    text: `For development partners and NGOs who need youth employment results they can report, CodersTrust offers an integrated training-to-earnings model with outcome tracking after each course, as agreed in the program scope. ${UNLIKE_APPROVED}`,
    facts: ['PD-01', 'PD-08'],
  },
  governments: {
    text: `For governments that need educated, unemployed youth in paid digital work through the labs and colleges they already have, CodersTrust offers an integrated training-to-earnings model. ${UNLIKE_APPROVED}`,
    facts: ['PD-01', 'PD-08'],
  },
  foundations: {
    text: `For foundations and CSR funders who need a grant to change a young person’s income, and evidence that it did, CodersTrust offers an integrated training-to-earnings model with a pilot scorecard agreed in co-design. ${UNLIKE_APPROVED}`,
    facts: ['PD-01', 'PD-08', 'PD-11'],
  },
  universities: {
    text: `For universities and colleges that need to prepare their degree holders for paid digital work, CodersTrust offers an integrated training-to-earnings model that runs alongside the degree. ${UNLIKE_APPROVED}`,
    facts: ['PD-01', 'PD-08'],
  },
  employers: {
    // WP20b: employer-specific (the [UNLIKE] sentence describes the youth-cohort model); scripts/check-facts.mjs may pin it for this page only.
    text: 'CodersTrust offers employer training built from a needs assessment, and job-ready digital talent through its placement team. Training is customized to your roles, and hiring starts from your talent request.',
    facts: ['IN-10', 'IN-04'],
  },
  localPartners: {
    // WP40 (cycle-17 review): what each side does, in the words of the four cards under it (Mobilizes and Hosts; Trains and Prepares for Certification; Mentoring and Placement; Monthly Reporting). scripts/check-facts.mjs declares it whole
    // for /partner-with-us/local-partners/ (POSITION_WHOLE_STATEMENT). It rests on PD-06 (certified local facilitators in existing labs and colleges), PD-01 (mentoring, with placement support alongside) and PD-08 (monthly reports).
    text: 'Your organization mobilizes learners and hosts training. CodersTrust supports delivery, mentoring, placement and reporting.',
    facts: ['PD-01', 'PD-06', 'PD-08'],
  },
  youthwide: {
    // WP36 (cycle-13 review): YouthWIDE's hero lead and "at a Glance" rows already say who the program is for and where it runs, so "Our Approach" states only what the program does, in the two shared sentences
    // with the program named as the subject. This is the one page-specific statement of its kind: scripts/check-facts.mjs declares it whole for /programs/youthwide/ (POSITION_WHOLE_STATEMENT).
    text: 'YouthWIDE combines training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.',
    facts: ['PD-01', 'PD-08'],
  },
  nationwide: {
    text: `For ministries, agencies and national funders who need educated, unemployed youth in paid digital work, CodersTrust offers YouthWIDE in Bangladesh, a national initiative. ${UNLIKE_APPROVED}`,
    facts: ['IN-01', 'PD-01', 'PD-08'],
  },
  campus: {
    text: `For universities and colleges who need their degree holders to leave with a practical route into digital work, CodersTrust offers JobReady@Campus, training with industry-certification preparation that runs in parallel with academic studies. ${UNLIKE_APPROVED}`,
    facts: ['IN-09', 'PD-01', 'PD-08'],
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
 * and its C8 band has exactly one card per pain: pain (`name`) → how we relieve it → the registered feature behind it. Both bands read
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
/** The `painId` of the C8 card (IncludesBand) that relieves pain `id` of `pains` (and the pain's name, `relieves`, for a table row that still names its concern). */
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
 * The trial result as ONE sentence (WP32, cycle-9 review: YouthWIDE's evidence band explained the trial twice in a row, in the plain line and again in the RC-01 headline). It names
 * the evaluator and the predecessor program, then the two results RC-01 headlines for women offered a place: the employment effect (RC-02's stat, in percentage points) and the
 * estimated income difference (RC-01's stat). Both figures are read from the register, so the sentence cannot drift from it; it throws if either stat changes shape.
 */
function trialSentence(): CopyBlock {
  const employment = fact('RC-02').stat;
  const income = fact('RC-01').stat;
  if (!employment || !/^\+[\d.]+ pp$/.test(employment.value) || !income || !/^\+\d+%$/.test(income.value)) {
    throw new Error(`TRIAL_SENTENCE: RC-02 or RC-01 no longer has the expected stat: ${JSON.stringify([employment?.value, income?.value])}`);
  }
  const points = employment.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
  return {
    text: `In BIGD’s randomized trial of the predecessor WSDFM program, women offered a place were ${points} more likely to be employed and had an estimated ${income.value.replace(/^\+/, '')} higher monthly income than the control group.`,
    facts: ['RC-01', 'RC-02'],
  };
}
export const TRIAL_SENTENCE: CopyBlock = trialSentence();

/**
 * The trial result as the one line of the Programs hub's evidence band (WP41, cycle-18 review: the hub restated the trial in prose, in the +10.3 pp tile and in a chart): the employment result alone, in plain words, with the
 * predecessor program named; RC-01 and RC-02 state it. The figure is RC-02's stat with its "pp" spelled out, so the sentence cannot drift from the register; it throws if the stat changes shape.
 */
function trialLine(): CopyBlock {
  const employment = fact('RC-02').stat;
  if (!employment || !/^\+[\d.]+ pp$/.test(employment.value)) {
    throw new Error(`TRIAL_LINE: RC-02 no longer has a "+N pp" stat value: ${JSON.stringify(employment?.value)}`);
  }
  const points = employment.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
  return {
    text: `Women offered a place in the predecessor WSDFM program were ${points} more likely to be employed than the control group.`,
    facts: ['RC-01', 'RC-02'],
  };
}
export const TRIAL_LINE: CopyBlock = trialLine();

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
  // WP21: short sentences with named actors (DoICT, the ICT Division, CodersTrust), as in the national-scale FAQ answer (Q2).
  text: 'We scale in phases, starting from what we have done. Government contracts have training scopes ranging from 120+ professionals to 3,120+ digital-lab staff. Her Power, a national program of DoICT, the ICT Division, trained 25,125 women across 130 sub-districts (upazilas). CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,500 women directly. Separately, 10,000 teachers were trained to teach online during COVID-19. Larger programs use existing labs and colleges, certified local facilitators and blended delivery, and can run up to 10 cohorts in parallel.',
  facts: ['GV-10', 'GV-01', 'GV-11', 'SC-08', 'PD-06'],
};

export const PRICING: CopyBlock = {
  text: 'Pricing is set per program, and we share an indicative budget in the discovery session. Standard inclusions: outreach and selection, blended training, an AI-ready curriculum, certification exam preparation (exam fee included), three months of mentoring, placement support, monthly reporting and outcome tracking for 12 months after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where a program needs them. AI-ready curriculum: each track’s AI content and work-entry plan are agreed with you before enrollment; we do not yet publish a track-by-track breakdown.',
  facts: ['PD-02', 'PD-02a'],
};

/** One pricing sentence for the two employer pages and their FAQ answer (WP25s): the budget comes in the discovery session and is confirmed after the needs assessment. */
export const EMPLOYER_PRICING = 'Pricing is set per program; we share an indicative budget in the discovery session and confirm it after the needs assessment.';

/** The hiring route in the closing steps of Employers and JobReady@Work (WP34, cycle-11 review): the steps there are team training, so hiring gets its own short route ("For Hiring"). */
export const EMPLOYER_HIRING_ROUTE = 'We scope your talent request against the experience and credentials available in the candidate pool.';

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
  // WP25s: two readings, not a rise (a rise reads as the training's effect, which a survey of completers does not show).
  text: 'Among surveyed completers, employment was 47.4% before training and 77.9% at the October 2026 survey.',
  facts: ['OC-01'],
};

/**
 * The median-income survey result as two readings (WP35, cycle-12 review). OC-03's register sentence ("median monthly income rose from $82 before training to $245 at the October 2026
 * survey (about 3×)") reads as an effect and a multiple, so a page that states the result prints this display sentence instead; the register sentence itself is unchanged (it backs
 * the published aggregates). Both medians are read from OC-03's stat, so no figure is typed here.
 */
function surveyIncome(): CopyBlock {
  const s = fact('OC-03').stat;
  if (!s?.from) throw new Error('SURVEY_INCOME: OC-03 no longer has a stat with a before-training median');
  return { text: `Among surveyed completers, median monthly income was ${s.value} at the October 2026 survey, against ${s.from} before training.`, facts: ['OC-03'] };
}
export const SURVEY_INCOME: CopyBlock = surveyIncome();

/**
 * The trial's evaluator spelled out (WP35, cycle-12 review: BIGD was not expanded on first mention). The register's RC-01 headline says "by BIGD"; a band that is the first place a page
 * names the evaluator runs the sentence through spellOutBigd(), the way /our-model/ and /our-model/talentleap/ expand it.
 */
export const BIGD_NAME = 'BRAC Institute of Governance and Development (BIGD)';
export const BIGD_FULL = `the ${BIGD_NAME}`;
export const spellOutBigd = (sentence: string): string => sentence.replace('by BIGD', `by ${BIGD_FULL}`);

/**
 * Answer-first opening of /impact/ (WP20d; 40 to 60 words): the randomized trial (a predecessor program) and the survey (surveyed
 * completers), each labeled as what it is. The figures are read from RC-02 and OC-01, never typed. WP25s: the survey is stated as two
 * readings ("was … before training and … at the survey"), not as a rise, which reads as cause; the sentence on what the trial shows and the
 * survey describes is the lead under the H1 (src/pages/impact/index.astro), so it is not repeated here.
 */
function impactAnswer(): CopyBlock {
  const rc = fact('RC-02').stat;
  const oc = fact('OC-01').stat;
  if (!rc || !/^\+[\d.]+ pp$/.test(rc.value) || !oc?.from) throw new Error('IMPACT_ANSWER: RC-02 or OC-01 no longer has the expected stat');
  const points = rc.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
  return {
    text: `A randomized trial of CodersTrust’s predecessor WSDFM program found that women offered a place were ${points} more likely to be employed. Among surveyed completers, employment was ${oc.from} before training and ${oc.value} at the October 2026 survey.`,
    facts: ['RC-02', 'OC-01'],
  };
}
export const IMPACT_ANSWER: CopyBlock = impactAnswer();

export const WOMEN_INCLUSION: CopyBlock = {
  // PR-01, PR-02 and PR-05 are program results, stated plainly.
  text: 'Women-focused programs report their own results: WSDFM 71% in work; Women in Online Work, Kosovo 68% in work; Her Power 372 of 800 tracked women in work (47%), tracked from the 2,500 trained directly by CodersTrust.',
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
  { title: 'Train and Mentor', text: '100 training hours per certification, then three months of milestone-based one-to-one mentoring, with placement support alongside. Mentoring works toward each track’s agreed work-entry goal (for freelance tracks: profile live, first bids, first client).' },
  { title: 'Place and Report', text: 'Placement support, monthly reports and follow-up surveys at 3, 6 and 12 months.' },
] as const;
export const STEPS_FACTS = ['PD-19', 'PD-01', 'PD-15', 'PD-08', 'PD-09'];

/** Home C13 backward-planning line (WP17): the same registered timing as SPEED (PD-04), stated as a plan to work back from. */
export const BACKWARD_PLAN: CopyBlock = {
  text: 'Allow about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Work backward from your intended training start date.',
  facts: ['PD-04'],
};

export const MICRO_COMMITMENT = 'A discovery session is a conversation, not a commitment.';
/** The same reassurance on the Employers page, whose first step may be a hiring request rather than a discovery session (WP36, cycle-13 review). */
export const MICRO_COMMITMENT_EMPLOYERS = 'Your first step is a conversation, not a commitment.';

/**
 * The line over the program options on Home (WP25h), and now on the Universities and JobReady@Campus option bands (WP36, cycle-13 review): the sizes (1,000–2,500 trainees and so on) are
 * options to scope in the discovery session, not a commitment, so a campus reads them as a range to choose from rather than a quantity asked of it.
 */
export const PROGRAM_SIZES_NOTE = 'Program sizes, not a commitment: use the discovery session to choose a starting scope for your goals, country and delivery capacity.';

/**
 * [SESSION-AGENDA] (plan v1.12 round-11 enhancement, v1.13 wording; grounded in PD-04, PD-11, PD-19 and FAQ Q8): what the first conversation
 * covers, as ONE sentence beside the C13 primary CTA: the lead, three items separated by semicolons and a single final period. It is shown
 * on the development-partners page, where the CTA books a discovery session (first item: your country, priority groups and locations), and on the governments page, where the primary CTA is a
 * briefing (first item: your priority groups and locations); see <SessionAgenda>. The foundations page, which offers two funding routes, says what is discussed for each instead (SESSION_AGENDA_ROUTES below),
 * and YouthWIDE's "Choose Your Entry Point" has one line for both of its routes (SESSION_AGENDA_SHARED below).
 * The micro-commitment line stays where it is.
 *
 * "an indicative budget" makes the same claim as [PRICING] and FAQ Q8, so the agenda rests on the same fact, PD-02: `facts` becomes its
 * data-fact marker exactly as [PRICING]'s does, so the agenda, [PRICING] and Q8 stand or fall together.
 */
export const SESSION_AGENDA_LEAD = 'What the discovery session covers:';
/** The lead on the page whose primary CTA is "Request a Briefing" (governments). */
export const SESSION_AGENDA_LEAD_BRIEFING = 'What the briefing covers:';
/** The first item differs by kind (round 12, Mi1: "districts" does not fit the international pages). */
export const SESSION_AGENDA_FIRST_ITEM = 'your country, priority groups and locations';
/** The governments page serves ministries in any country, so its briefing names "locations", not "districts". */
export const SESSION_AGENDA_FIRST_ITEM_GOVERNMENTS = 'your priority groups and locations';
/** The second and third items are shared. WP32 (cycle-9 review): "the follow-up survey schedule" replaces the plan's "the tracer timeline" (scripts/check-facts.mjs pins the same wording). */
export const SESSION_AGENDA_COMMON_ITEMS = ['employer demand and certification tracks', 'an indicative budget, the pilot scorecard and the follow-up survey schedule'] as const;
export const SESSION_AGENDA_FACTS = ['PD-02'];
/**
 * Foundations (WP34, cycle-11 review): funders there choose between a cohort grant and a platform grant, and the discovery-session agenda above is a cohort agenda, so the
 * line says what is discussed for each route. It is still one paragraph with the same PD-02 marker ("budget"); scripts/check-facts.mjs pins the sentence for /partner-with-us/foundations/.
 */
export const SESSION_AGENDA_ROUTES = [
  { lead: 'For a cohort grant,', text: 'we discuss your country, priority groups, tracks, budget and scorecard.' },
  { lead: 'For a platform grant,', text: 'we discuss JobReady’s staged rollout.' },
] as const;
/**
 * YouthWIDE's "Choose Your Entry Point" (WP39, cycle-16 review): the funders' discovery session and the governments' briefing cover the same ground, so the band carries ONE line in place of two near-identical agendas.
 * It keeps the PD-02 marker ("indicative budget"); scripts/check-facts.mjs pins the sentence for /programs/youthwide/ on its own.
 */
export const SESSION_AGENDA_SHARED = 'We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan.';
/**
 * "What the discovery session covers: your country, priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the follow-up survey schedule."
 * or, for the governments briefing: "What the briefing covers: your priority groups and locations; employer demand and certification tracks; …",
 * or, for Foundations: "For a cohort grant, we discuss your country, priority groups, tracks, budget and scorecard. For a platform grant, we discuss JobReady’s staged rollout.",
 * or, for YouthWIDE: "We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan."
 */
export const sessionAgendaText = (kind: 'discovery' | 'governments' | 'foundations' | 'shared' = 'discovery'): string => {
  if (kind === 'shared') return SESSION_AGENDA_SHARED;
  if (kind === 'foundations') return SESSION_AGENDA_ROUTES.map((r) => `${r.lead} ${r.text}`).join(' ');
  const lead = kind === 'discovery' ? SESSION_AGENDA_LEAD : SESSION_AGENDA_LEAD_BRIEFING;
  const first = kind === 'governments' ? SESSION_AGENDA_FIRST_ITEM_GOVERNMENTS : SESSION_AGENDA_FIRST_ITEM;
  return `${lead} ${[first, ...SESSION_AGENDA_COMMON_ITEMS].join('; ')}.`;
};

/** C14 post-decision reinforcement (messaging framework §8). */
export const C14 = {
  validate: { text: 'Organizations that have worked with CodersTrust include UNDP (from 2015), the World Bank Group and BRAC.', facts: ['PA-01'] } as CopyBlock,
  // WP21: one validation line per audience (the closing strip no longer repeats the same three organizations on every partner page); each uses names from one registered partner fact.
  validateFor: {
    foundations: { text: 'Development and NGO partners include the Rockefeller Foundation, DANIDA and Porticus.', facts: ['PA-01'] } as CopyBlock,
    governments: { text: 'Government partners include Bangladesh’s ICT Division, DoICT, Bangladesh Hi-Tech Park Authority, NSDA and BCC.', facts: ['PA-02'] } as CopyBlock,
    universities: { text: 'University partners include National University, the University for Peace (UPEACE) and The City College of New York (CCNY).', facts: ['PA-05'] } as CopyBlock,
    employers: { text: 'Private-sector partners include Grameenphone Academy, Robi, Accenture, BASIS and AWS.', facts: ['PA-03'] } as CopyBlock,
  },
  reminder: { text: 'For grant-funded pilots, we plan for the first cohort to begin training 6–8 weeks after signing, and monthly reports follow from the first cohort.', facts: ['PD-04', 'PD-08'] } as CopyBlock,
  firstAction: 'Your first step: a discovery session. In your inquiry, include two suitable times for a discovery conversation.',
  variants: {
    governments: 'Your agency’s procurement timeline sets the pace; we start with a briefing.',
    investors: 'Your first step: an introduction call.',
    // WP34 (cycle-11 review): the Employers closing band has two routes (team training, hiring); the discovery session is the training route's first step, so the line says so.
    employers: 'For team training, your first step: a discovery session. In your inquiry, include two suitable times for a discovery conversation.',
  },
};

/** "What is CodersTrust?" sits in DefinitionBand directly below each hero (GEO definition, not C1 copy). */
export const DEFINITION_HEADING = 'What Is CodersTrust?';

export const HOME_META = {
  // A colon, not a dash: scripts/check-title-case.mjs lowercases "From" after an em dash, and the title keeps its capital F.
  title: 'CodersTrust: From Learning to Earning for Youth',
  // WP23: at most 155 characters. WP41 (cycle-18 review): it opens with what CodersTrust does (ID-01: it trains and mentors educated, unemployed youth for digital work) and ends with the evidence, instead of leading with the trial abstract.
  description: 'CodersTrust trains and mentors educated, unemployed youth for paid digital work, with evidence from a randomized trial of a predecessor program.',
};

/**
 * The Independent Evidence body on Investors (WP36, cycle-13 review): the trial and the survey in three sentences, the last saying that youth-program outcomes are not platform outcomes. It replaces the
 * band that restated the trial's plain-language reading, the income headline, the +10.3 pp tile, the trial chart and the survey sentence. The figures are read from RC-02 and OC-01, so the sentences
 * cannot drift from the register, and the builder throws if either stat changes shape. The survey sentence reads "was 77.9% at the October 2026 survey, up from 47.4% before training", as Home's survey card and
 * the Impact tile word it: a report by surveyed completers, with the base named and no multiplier.
 */
function investorEvidence(): CopyBlock {
  const rc = fact('RC-02').stat;
  const oc = fact('OC-01').stat;
  if (!rc || !/^\+[\d.]+ pp$/.test(rc.value) || !oc?.from) throw new Error('INVESTOR_EVIDENCE: RC-02 or OC-01 no longer has the expected stat');
  const points = rc.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
  return {
    text: `A randomized trial of CodersTrust’s predecessor WSDFM program found women offered a place were ${points} more likely to be employed. Among surveyed completers, employment was ${oc.value} at the October 2026 survey, up from ${oc.from} before training. Youth-program outcomes are not platform outcomes.`,
    facts: ['RC-02', 'OC-01'],
  };
}
export const INVESTOR_EVIDENCE: CopyBlock = investorEvidence();

/**
 * The two lines of Universities' "Evidence from Our Wider Youth Programs" band (WP38, cycle-15 review): the trial result and the survey's degree share and employment readings, in place of the full evidence band
 * (offered-place and attender income, survey chart, education profile). Figures are read from RC-02, OC-01 and OC-09, so the sentences cannot drift from the register; the builder throws if a stat or the OC-09 phrase
 * changes shape. The survey line names its base ("Among surveyed completers") and reads as OC-01's tile does: "was 77.9% at the October 2026 survey, up from 47.4% before training".
 */
function universityEvidence(): CopyBlock[] {
  const rc = fact('RC-02').stat;
  const oc = fact('OC-01').stat;
  const degree = /(\d+(?:\.\d+)?% hold a bachelor’s degree or higher)/.exec(fact('OC-09').text)?.[1];
  if (!rc || !/^\+[\d.]+ pp$/.test(rc.value) || !oc?.from || !degree) throw new Error('UNIVERSITY_EVIDENCE: RC-02, OC-01 or OC-09 no longer has the expected stat or wording');
  const points = rc.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
  return [
    { text: `A randomized trial of the predecessor WSDFM program found women offered a place were ${points} more likely to be employed.`, facts: ['RC-02'] },
    { text: `Among surveyed completers, ${degree}; employment was ${oc.value} at the October 2026 survey, up from ${oc.from} before training.`, facts: ['OC-09', 'OC-01'] },
  ];
}
export const UNIVERSITY_EVIDENCE: CopyBlock[] = universityEvidence();

/** C11 on funder-facing pages (Home, development partners, foundations, YouthWIDE), after the program options. */
export const ACCOUNTABILITY: CopyBlock = {
  text: 'Every pilot is judged on cost per completer and per verified outcome, with thresholds agreed with you before the first cohort starts.',
  facts: ['PD-11'],
};
