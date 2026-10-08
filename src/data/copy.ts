// Shared copy blocks (plan v1.2: messaging framework §1, §4.0, §8, §9 and page-spec shared blocks).
// Pages import these instead of retyping them, so a wording change from review is one edit here.
// Every number inside a block is a registered fact; render footnote markers for the IDs in `facts`.

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
  home: 'We help partners move educated, unemployed youth into paid digital work through certified, mentored training.',
  developmentPartners: 'We help development partners move educated, unemployed youth into paid work through certified, mentored training.',
  governments: 'We help governments move educated, unemployed youth into paid digital work through certified, mentored training.',
  foundations: 'We help funders turn grants into paid digital work for youth through certified, mentored training.',
  universities: 'We help universities move degree holders into paid digital work through certified, mentored training.',
  employers: 'We help employers upskill their teams and find job-ready digital talent through certified, mentored training.',
  investors: 'We help investors back the platform moving emerging-market youth into paid work through certified training.',
  localPartners: 'We help local organizations move young people into paid digital work through certified, mentored training.',
  nuPgd: 'We help degree holders move into digital work through a National University postgraduate diploma.',
};

/** C1 identity-hook headlines — 6 to 12 words, about the reader (CMF). */
export const HEADLINE: Record<Audience, string> = {
  home: 'Turn youth unemployment into digital employment — with evidence.',
  developmentPartners: 'Youth employment results you can report — not just training numbers.',
  governments: 'Turn graduates and digital labs into a national digital workforce.',
  foundations: 'Fund a supported path from learning to earning.',
  universities: 'Help your graduates build job-ready digital skills.',
  employers: 'Upskill your teams for AI — and hire job-ready digital talent.',
  investors: 'Invest in the infrastructure of emerging-market work.',
  localPartners: 'Deliver digital-skills programs that lead to paid work — in your community.',
  nuPgd: 'Build the digital skills employers hire — alongside your degree.',
};

/** C5 opens with empathy for the reader's struggling moment, then ORIGIN, authority and the method signal. */
export const EMPATHY: Record<Audience, string> = {
  home: 'You need more than enrollment numbers: you need credible evidence that young people are moving into paid work.',
  developmentPartners: 'You need more than enrollment numbers: you need credible evidence that young people are moving into paid work.',
  governments: 'You answer for training budgets that must show up as young people in work, not only as seats filled.',
  foundations: "You want your grant to change a young person's income, and you need evidence that it did — not only a count of hours attended.",
  universities: 'You see capable students finish their degrees and still struggle to find work, and you are asked for placement results you cannot yet show.',
  employers: 'You have roles to fill and teams that need AI skills faster than hiring or generic courses can supply them.',
  investors: 'You are weighing a market with real demand for skills, and you need to tell a model that is working from one that is only promised.',
  localPartners: 'You reach young people that central programs miss, often without the curriculum, certification and placement links to finish the job.',
  nuPgd: 'You worked hard for your degree, and the job offers did not follow — and it is hard to know which skills to add next.',
};

export const ORIGIN: CopyBlock = {
  text: 'CodersTrust launched in 2014 in Copenhagen and began developing freelancers in Bangladesh. Our first UNDP program (2015) was in Dhaka’s Korail slum.',
  facts: ['ID-02', 'PR-03a'],
};

export const RCT_HEADLINE: CopyBlock = {
  text: 'A randomized trial by BIGD found CodersTrust’s WSDFM training raised women’s income by 41% for everyone offered a place — and by 54% for women who attended.',
  facts: ['RC-01'],
};

/**
 * C6a positioning statements (CMF C6; doc 04 §1). One sentence per conversion page, in the pattern
 * "For [audience] who need [outcome], CodersTrust [category] that [differentiator]; unlike [alternative], we [proof-backed difference]."
 * Built only from the approved positioning table and existing page copy: no figures and no named competitors; other approaches
 * are described by what they typically focus on, with "provision varies by provider". The NU postgraduate diploma page
 * has no statement: its copy waits for National University sign-off.
 */
export type PositioningKey = Exclude<Audience, 'nuPgd'> | 'youthwide' | 'nationwide' | 'campus' | 'work' | 'superkids';

const UNLIKE_WHOLE_PATH =
  'unlike approaches that typically focus on one part of the path (provision varies by provider), we take responsibility for the whole path to earnings, with outcome evidence that includes a randomized trial by BIGD.';
const UNLIKE_MEASURES =
  'unlike approaches that typically focus on one part of the path (provision varies by provider), we agree success measures before you start, with outcome evidence that includes a randomized trial by BIGD.';

export const POSITIONING: Record<PositioningKey, CopyBlock> = {
  home: {
    text: `For governments, development partners and funders who need educated, unemployed youth in paid digital work, CodersTrust offers an integrated training-to-earnings model that reports results monthly; ${UNLIKE_WHOLE_PATH}`,
    facts: ['RC-01'],
  },
  developmentPartners: {
    text: `For development partners and INGOs who need youth employment results they can report, CodersTrust offers an integrated training-to-earnings model that tracks outcomes after every course; ${UNLIKE_WHOLE_PATH}`,
    facts: ['RC-01'],
  },
  governments: {
    text: `For governments who need educated, unemployed youth in paid digital work through the labs and colleges they already have, CodersTrust offers an integrated training-to-earnings model delivered in phases; ${UNLIKE_WHOLE_PATH}`,
    facts: ['RC-01'],
  },
  foundations: {
    text: `For foundations and CSR funders who need a grant to change a young person’s income, and evidence that it did, CodersTrust offers an integrated training-to-earnings model with a pilot scorecard agreed in co-design; ${UNLIKE_WHOLE_PATH}`,
    facts: ['RC-01', 'PD-11'],
  },
  universities: {
    text: `For universities and colleges who need their degree holders in paid digital work, CodersTrust offers an integrated training-to-earnings model that runs alongside the degree; ${UNLIKE_WHOLE_PATH}`,
    facts: ['RC-01'],
  },
  employers: {
    text: `For employers who need teams with AI skills and job-ready digital talent, CodersTrust offers training custom-developed for each organization and talent through its placement team; ${UNLIKE_MEASURES}`,
    facts: ['RC-01', 'IN-10'],
  },
  investors: {
    text: 'For governments, development partners, foundations and employers who need youth moved into paid digital work, with results that are measured, reported and open to independent evaluation, CodersTrust offers an integrated training-to-earnings model as country programs; unlike approaches that typically focus on one part of the path — training-only programs, self-paced course platforms or freelance marketplaces alone (provision varies by provider) — we take responsibility for the whole path to earnings, working in phases through existing labs and colleges, with outcome evidence that includes a randomized trial by BIGD.',
    facts: ['RC-01'],
  },
  localPartners: {
    text: `For Bangladeshi NGOs, colleges and chambers who need to move young people in their communities into paid digital work, CodersTrust offers an integrated training-to-earnings model delivered through certified local facilitators and existing labs; ${UNLIKE_WHOLE_PATH}`,
    facts: ['RC-01', 'PD-06'],
  },
  youthwide: {
    text: `For development partners and funders who need educated, unemployed youth in paid digital work in South Asia, the Middle East and North Africa, or Sub-Saharan Africa, CodersTrust offers YouthWIDE, the program through which funders deploy its integrated training-to-earnings model in a country; ${UNLIKE_WHOLE_PATH}`,
    facts: ['IN-02', 'RC-01'],
  },
  nationwide: {
    text: `For ministries, agencies and national funders who need educated, unemployed youth in paid digital work, CodersTrust offers NationWIDE, a Bangladesh initiative delivered in phases through existing labs and colleges; ${UNLIKE_WHOLE_PATH}`,
    facts: ['IN-01', 'RC-01'],
  },
  campus: {
    text: `For universities and colleges who need their degree holders to leave with a practical route into digital work, CodersTrust offers JobReady@Campus, certified training that runs in parallel with academic studies; ${UNLIKE_WHOLE_PATH}`,
    facts: ['IN-09', 'RC-01'],
  },
  work: {
    text: `For employers who need teams with the digital capabilities for AI workflows, CodersTrust offers JobReady@Work, training custom-developed for each organization; ${UNLIKE_MEASURES}`,
    facts: ['IN-10', 'RC-01'],
  },
  // SuperKids carries no "unlike … we …" clause (review round 9, Mi3): neither a registered fact nor approved wording in this file
  // supports a comparison with other approaches, so the statement stops at what GV-08 and the page definition already say.
  superkids: {
    text: 'For schools and education partners who want children to build digital skills early, CodersTrust offers SuperKids, a K-12 STEAM program of block coding, robotics and digital art, offered through schools and education partners under agreements with DoICT and NCTB (agreements and targets, not delivered reach).',
    facts: ['GV-08'],
  },
};

export const SCALE: CopyBlock = {
  text: 'We scale in phases, starting from what we have done: government contracts with training scopes ranging from 120+ professionals to 3,120+ digital-lab staff, the curriculum for a national program to train 25,125 women (with 2,500 women trained directly), and 10,000 teachers trained to teach online during COVID-19. Larger programs run hub-and-spoke — up to 10 cohorts in parallel, certified local facilitators and blended delivery in existing labs and colleges.',
  facts: ['GV-10', 'GV-01', 'SC-08', 'PD-06'],
};

export const PRICING: CopyBlock = {
  text: 'Pricing is set per program, and we share an indicative budget in the discovery session. Standard inclusions: outreach and selection, blended training, an AI-ready curriculum, certification exam preparation and the exam fee for each trainee’s track (exam terms set per program), three months of mentoring, placement support, monthly reporting and outcome tracking for 12 months after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where a program needs them.',
  facts: ['PD-02'],
};

export const SPEED: CopyBlock = {
  text: 'For grant-funded pilots: about three weeks from first conversation to agreement, and the first cohort in training 6–8 weeks after signing. Public procurement follows the agency’s own timeline.',
  facts: ['PD-04'],
};

export const SURVEY_EMPLOYMENT: CopyBlock = {
  text: 'Among surveyed completers with paired employment answers, employment rose from 47.4% before training to 77.9% at the October 2026 survey.',
  facts: ['OC-01'],
};

export const WOMEN_INCLUSION: CopyBlock = {
  text: 'Two women-focused programs placed 68–71% of the women who completed them (WSDFM 71%; Women in Online Work, Kosovo, 68%); the Her Power cohort placed 47%.',
  facts: ['PR-01', 'PR-02', 'PR-05'],
};

export const GOVERNANCE: CopyBlock = {
  text: 'CodersTrust lists offices in New York (CT USA, Inc.) and Dhaka (CodersTrust Bangladesh). The contracting entity, legal status and due-diligence documents are confirmed with funders during co-design.',
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
  { name: 'Pilot', size: '1,000–2,500 trainees', duration: '8–14 months (tracking to month 23)', note: 'Prove the model in one country or region.' },
  { name: 'Scale', size: '10,000–25,000 trainees', duration: '12–18 months rolling', note: 'Expand to more cohorts and locations on the pilot’s results.' },
  { name: 'National', size: '100,000+ trainees', duration: '3–5 years', note: 'A design option we plan phase by phase; not yet delivered at this size.' },
] as const;
export const PROGRAM_OPTIONS_FACTS = ['PD-05'];

/** "How it works in 3 steps" (C8d) for funded programs. */
export const STEPS = [
  { title: 'Discover and co-design', text: 'A discovery session sets priority groups, tracks, the indicative budget and the pilot scorecard; each track’s demand and work-entry plan is approved before enrollment.' },
  { title: 'Train and mentor', text: '100 training hours per certification, then three months of milestone-based one-to-one mentoring: profile live, first bids, first client, exam.' },
  { title: 'Place and report', text: 'Placement support, monthly reports and tracer surveys at 3, 6 and 12 months.' },
] as const;
export const STEPS_FACTS = ['PD-19', 'PD-01', 'PD-15', 'PD-08', 'PD-09'];

export const MICRO_COMMITMENT = 'A discovery session is a conversation, not a commitment.';

/** C14 post-decision reinforcement (messaging framework §8). */
export const C14 = {
  validate: { text: 'Organizations that have worked with CodersTrust include UNDP (from 2015), the World Bank Group and BRAC.', facts: ['PA-01'] } as CopyBlock,
  reminder: { text: 'For grant-funded pilots, your first cohort is in training 6–8 weeks after signing, and monthly reports follow from the first cohort.', facts: ['PD-04', 'PD-08'] } as CopyBlock,
  firstAction: 'Your first step: a discovery session. In your enquiry, include two suitable times for a discovery conversation.',
  variants: {
    governments: 'Your agency’s procurement timeline sets the pace; we start with a briefing.',
    investors: 'Your first step: an introduction call. The deck and data room follow under NDA.',
  },
};

/** "What is CodersTrust?" sits in DefinitionBand directly below each hero (GEO definition, not C1 copy). */
export const DEFINITION_HEADING = 'What is CodersTrust?';

export const HOME_META = {
  title: 'CodersTrust — From Learning to Earning for Youth',
  description: 'CodersTrust trains and mentors unemployed youth for paid digital work. Surveyed completers: employment rose from 47.4% to 77.9% (October 2026 survey).',
};

/** Investors page market section (no market-size figures on public pages, D2). */
export const INVESTOR_MARKET: CopyBlock = {
  text: 'Market opportunity: four sectors in emerging markets — skill training, freelance marketplaces and job sites, HR tech and higher-ed EdTech. Market sizing and method are in the investor deck.',
  facts: ['PX-09', 'PX-08', 'PX-05', 'PX-10'],
};

/** C11 on funder-facing pages (Home, development partners, foundations, YouthWIDE, NationWIDE), after the program options. */
export const ACCOUNTABILITY: CopyBlock = {
  text: 'Every pilot is judged on cost per completer and per verified outcome, with thresholds agreed with you before the first cohort starts.',
  facts: ['PD-11'],
};
