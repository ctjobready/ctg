// Shared copy blocks (plan v1.2: messaging framework §1, §4.0, §8, §9 and page-spec shared blocks).
// Pages import these instead of retyping them, so a wording change from review is one edit here.
// Every number inside a block is a registered fact; render footnote markers for the IDs in `facts`.

import { fact, sources } from './facts';

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
  // WP48 (cycle-23 review): "unemployed and underemployed", as ID-01 has the group (16 words, one over the CMF guideline above; no gate enforces it and the audience lines below run longer).
  // WP52 (cycle-27 review): "We help ..." (it began "Help ...", an instruction with no subject), as the audience lines below begin; 17 words, two over the guideline.
  home: 'We help educated, unemployed and underemployed youth reach paid digital work through training, mentoring and placement support.',
  // WP63 rework RW1 (coordinator, extending Grok R1): the Development Partners and Governments lines name the group as ID-01 and the Home line do, "educated, unemployed and underemployed youth" (the Governments line is also that page's meta description: 144 characters, within 155).
  developmentPartners: 'We help development partners prepare educated, unemployed and underemployed youth for paid work through mentored, certification-focused training.',
  governments: 'We help governments prepare educated, unemployed and underemployed youth for paid digital work through mentored, certification-focused training.',
  foundations: 'We help funders back mentored, certification-focused training that prepares youth for paid digital work.',
  universities: 'We help universities and colleges prepare students for paid work through mentored, certification-focused training.',
  employers: 'We help employers upskill their teams for AI and digital work, and connect them to job-ready digital talent through our placement team.',
  // WP32 (cycle-9 review): "staged rollout" alone did not say what is live, so the hero adds IN-04's status in one sentence (the Investors page marks the lead data-fact="IN-04"); it is two sentences by design.
  // The two marketplaces are named as two, as IN-04 and tests/wp25s.spec.ts ("named as two") have them: never "the employer and gig-work marketplaces".
  investors: 'Back JobReady’s staged rollout, built on CodersTrust’s training and mentoring programs. Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.',
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
// WP44 (cycle-21 review): Development Partners' guide band has no empathy line (it opens with the launch line), so its key is gone. WP47 (owner decision 2026-10-15): nor does Home's, so `home` is gone too.
// WP49 (cycle-24 review): nor does Local Partners': its line ("You reach young people that national programs miss, ...") was the third statement of an unqualified comparison with national programs, and the paragraph after it already names the Bangladesh team.
// WP50 (cycle-25 review): nor do Foundations ("You want your grant to change a young person’s income, and you need evidence that it did — not only a count of hours attended.") and the Universities partner page: each line restated the problem band just above its
// track-record band, which now opens with the origin line. `universities` stays because JobReady@Campus states the sentence once, as its problem band's lead (tests/wp25s.spec.ts); the Universities partner page does not read it.
// WP52 (cycle-27 reviews, Grok M2 and m1, and Gemini m6 for Governments): nor do Governments ("You answer for training budgets that must produce young people in work, not only seats filled.") and Investors ("Impact investors need to see what is proven and
// what is still being built."): each line restated the problem band above its track-record band, which now starts with the origin line (Governments) or its record (Investors), as Local Partners' and Foundations' do.
// WP61 (cycle-33 reviews, GPT-6.1 Sol G2 and Kimi K1; flagged in many cycles): nor do Employers and JobReady@Work ("You have roles to fill and teams that need AI skills for their daily work."): their track-record bands open with the origin line (Employers) or the credentials list
// (JobReady@Work, which prints no origin line). `universities` and `nuPgd` remain.
export const EMPATHY: Record<Exclude<Audience, 'developmentPartners' | 'home' | 'localPartners' | 'foundations' | 'governments' | 'investors' | 'employers'>, string> = {
  // WP52 (cycle-27 review): "Help students prepare for paid digital work and build placement evidence from your campus cohorts." (it said "You see capable students finish their degrees and still struggle to find work, and you are asked for placement results you cannot yet show.",
  // which assumed the institution has no results to show). JobReady@Campus's problem band reads it as its lead; its heading, "Capable Students Still Struggle to Find Work", speaks of students, not of the reader, and stays.
  universities: 'Help students prepare for paid digital work and build placement evidence from your campus cohorts.',
  nuPgd: 'You worked hard for your degree, but the job offers did not follow, and it is hard to know which skills to add next.',
};

export const ORIGIN: CopyBlock = {
  // WP48 (cycle-23 review): "began training freelancers", where it read "began developing freelancers" (Home's Our Track Record band; the About timeline keeps its own wording).
  text: 'CodersTrust launched in 2014 in Copenhagen and began training freelancers in Bangladesh. Our first UNDP-supported pilot (2015) was in Dhaka’s Korail settlement.',
  facts: ['ID-02', 'PR-03a'],
};

/**
 * ORIGIN in one line, for the audience pages' Guide band (WP38, cycle-15 review: the two-sentence history was word for word on seven pages). Home keeps ORIGIN whole. The year is ID-02's stat value ("2014") and the
 * count of countries and territories is SC-03's stat value, so the line cannot drift from the register; the builder throws if either stat changes shape.
 * WP58 (cycle-30 reviews, Claude S1 and GPT-6.1 Sol G1, applied to this line too): "..., from a Copenhagen launch to work in 16 countries and territories." (it said "to programs in ..."): the count is where CodersTrust has worked, as SC-03 says.
 */
function originShort(): CopyBlock {
  const year = fact('ID-02').stat?.value;
  const countries = fact('SC-03').stat?.value;
  if (!year || !/^\d{4}$/.test(year) || !countries || !/^\d+$/.test(countries)) throw new Error('ORIGIN_SHORT: ID-02 or SC-03 no longer has the expected stat value');
  return { text: `Since ${year}, from a Copenhagen launch to work in ${countries} countries and territories.`, facts: ['ID-02', 'SC-03'] };
}
export const ORIGIN_SHORT: CopyBlock = originShort();

/**
 * WP55 (owner decision 2026-10-17, "Show both"): wherever the Kosovo program records ("102 of 150", PR-02) are shown, this one short line shows the World Bank's own figure beside them: "World Bank: 77 trainees won at least one
 * online contract." The count is PR-02b's stat value, so the line cannot drift from the register; the builder throws if the value stops being a plain count. It names its source in its first words and never replaces the program records.
 */
function wbKosovo(): CopyBlock {
  const n = fact('PR-02b').stat?.value;
  if (!n || !/^\d+$/.test(n)) throw new Error('WB_KOSOVO: PR-02b no longer has a plain count as its stat value');
  return { text: `World Bank: ${n} trainees won at least one online contract.`, facts: ['PR-02b'] };
}
export const WB_KOSOVO: CopyBlock = wbKosovo();
/**
 * WP57 (cycle-29 review, Gemini GM4; owner decision 7, "show both"): the program-records half of the same pair, for a card that shows no figure of its own: "Program records: 102 of 150 women in work." Home's "Proof in Practice" card
 * showed only WB_KOSOVO (the records were in the results slide, far above it); it now reads this line and then WB_KOSOVO, so the card shows both. The count is PR-02's stat value and the phrase is the register's own
 * ("102 of 150 women in work (68%)"), so the line cannot drift from the register; the builder throws if either stops reading that way. It names its source in its first words, as WB_KOSOVO does.
 * The figure's spaces are no-break spaces, so "102 of 150" is never split across two lines in the card (on a phone the balanced line would break after "102").
 */
function kosovoRecords(): CopyBlock {
  const r = fact('PR-02');
  const n = r.stat?.value;
  const m = n && /^(\d+) of (\d+)$/.exec(n);
  if (!m || !r.text.includes(`${m[1]} of the ${m[2]} women trained were in work`)) throw new Error('KOSOVO_RECORDS: PR-02 no longer reads "N of the M women trained were in work"');
  // WP71 (owner direction, dated program records): the years are TL-04's span, read from the register. WP80 (item 3): the base reads "of the 150 women trained".
  const years = fact('TL-04').stat?.value;
  if (!years || !/^\d{4}\u2013\d{4}$/.test(years)) throw new Error('KOSOVO_RECORDS: TL-04 stat value no longer reads "YYYY\u2013YYYY"');
  const base = `${m[1]}\u00a0of\u00a0the\u00a0${m[2]}`;
  return { text: `Program records, ${years}: ${base} women trained were in work.`, facts: ['PR-02', 'TL-04'] };
}
export const KOSOVO_RECORDS: CopyBlock = kosovoRecords();
/**
 * WP63 (cycle-35 review, Gemini M4): the same kind of line for the WSDFM card of Home's "Proof in Practice" band, which had no outcome line while the Kosovo card has its program records. The count is PR-01's stat value and the percentage is the one in its label
 * ("WSDFM: 71% of enrolled women in work"); the builder throws if either stops reading that way or the register stops saying "N of the M women enrolled were in work (P%)". It names its source in its first words, so the figure is not read as trial data
 * (the trial studied 833 women, TRIAL_WOMEN; the carousel's fourth slide says so beside the same figure). The figure's spaces are no-break spaces, as KOSOVO_RECORDS' are.
 * WP76 (owner answer 2026-10-22: "the 1,000 are the women enrolled"): the line names the base, "Program records: 711 of the 1,000 women enrolled were in work (71%)." (it said "711 of 1,000 women in work (71%)").
 */
function wsdfmRecords(): CopyBlock {
  const r = fact('PR-01');
  const count = /^([\d,]+) of ([\d,]+)$/.exec(r.stat?.value ?? '');
  const pct = /^WSDFM: (\d+%) of enrolled women in work$/.exec(r.stat?.label ?? '')?.[1];
  if (!count || !pct || !r.text.includes(`${count[1]} of the ${count[2]} women enrolled were in work (${pct})`)) throw new Error('WSDFM_RECORDS: PR-01 no longer reads "N of the M women enrolled were in work (P%)"');
  const base = `${count[1]} of the ${count[2]}`.replace(/ /g, '\u00a0');
  return { text: `Program records: ${base} women enrolled were in work (${pct}).`, facts: ['PR-01'] };
}
export const WSDFM_RECORDS: CopyBlock = wsdfmRecords();

/**
 * WP57 (cycle-29 review, Grok R2, with Gemini GM1): the 31,200+ (GV-12) must visibly include Her Power's national 25,125 (GV-01), so Home's government slide and the Governments glance tile say it in the wording GV-12's glance note had in WP35
 * (cycle-12 review): "The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained)." The 25,125 is GV-01's stat value, never retyped, and the builder throws if the register stops saying
 * that the figure is "contract scope, not a count of completers" (the clause that keeps the 31,200+ true). Impact keeps the register's own, longer note, which adds that CodersTrust trained 2,500 women directly.
 * WP58 (cycle-30 review, Gemini GM1): "(25,125 women trained)" beside the contract-scope total read as CodersTrust's own training, so the parenthesis says who trained how many: "(25,125 women trained; CodersTrust trained 2,500 directly)". The 2,500 is the count
 * GV-11's text states ("... 2,500 women trained directly; ..."), read from it, never retyped; GV-13 holds the same figure as its stat value, and the builder throws if the two stop agreeing or the register stops saying "women trained directly".
 * WP83 (owner answer 2026-10-23: "Her Power's 25,125 is the national program's TARGET, not a count of women trained"): GV-01 says "a national program to train 25,125 women", and the note says the total "includes Her Power’s national target of 25,125 women
 * (CodersTrust trained 2,400 directly)". The builder throws if GV-01 stops saying "a national program to train N women", so the target cannot slip back into "trained".
 * WP83 (owner, 2026-10-23: "CodersTrust trained 2,400 women directly in Her Power, not 2,500"; source: the owner's "CT - JobReady Platform" sheet, Ex-Trainees Data): the count CodersTrust trained directly is 2,400 in the register (GV-11's text, GV-13's value), read from there as before; it was 2,500.
 * WP85 (owner update 2026-10-24: a CodersTrust team member confirmed that the government achieved 100% of Her Power's 25,125-trainee target): the target wording of WP83 is replaced. GV-01 says "a national program that trained N women, meeting its target",
 * and the note says "it includes Her Power’s national program, which trained N women (CodersTrust trained 2,400 directly)". The builder throws if GV-01 stops saying "a national program that trained N women", so the figure cannot slip back into a target.
 */
function contractFigures(): { national: string; direct: string } {
  const n = fact('GV-01').stat?.value;
  if (!n || !/^[\d,]+$/.test(n)) throw new Error('CONTRACT_TOTAL_NOTE: GV-01 no longer has a plain count as its stat value');
  if (!fact('GV-01').text.includes(`a national program that trained ${n} women`)) throw new Error('CONTRACT_TOTAL_NOTE: GV-01 no longer says "a national program that trained N women" (the owner confirmed on 2026-10-24 that the program met its target)');
  if (!/contract scope, not a count of completers/.test(fact('GV-12').stat?.glance?.note ?? '')) throw new Error('CONTRACT_TOTAL_NOTE: the GV-12 glance note no longer says "contract scope, not a count of completers"');
  const direct = /(\d[\d,]*) women trained directly/.exec(fact('GV-11').text)?.[1];
  if (!direct || direct !== fact('GV-13').stat?.value) throw new Error('CONTRACT_TOTAL_NOTE: GV-11 no longer says "N women trained directly" with the count that GV-13 holds as its stat value');
  return { national: n, direct };
}
/**
 * WP60 (cycle-32 review, GPT-6.1 Sol G1): the two Her Power counts the note states, with the same guards, for the sentence Home's government slide builds in plainer words ("... 25,125 women trained nationally, 2,500 directly by CodersTrust.", src/data/heroSlides.ts);
 * the note below is unchanged and still read by the Governments tile, Investors and the JobReady Platform page.
 */
export const CONTRACT_FIGURES = contractFigures();
/**
 * WP84 (owner answer 2026-10-24: keep "130,000+ learners trained" and "150,000+ enrollments", but relabel the courseware share; CLR review, Sonnet Max run 2, finding 1): the 30,000+ contract scope includes Her Power's 25,125, and the 150,000+ enrollments
 * count the same 25,125 as curriculum reach (SC-02's detail: 40,043 reached through CodersTrust curriculum and courseware = Her Power's curriculum for its national target of 25,125 women + UNDP FutureNation's 14,918 course learners), so the note adds a second sentence that
 * stops a reader adding the two: "Her Power’s 25,125 is the same curriculum reach counted in the 150,000+ enrollments, not additional people." The 25,125 is GV-01's stat value and the 150,000+ is SC-02's, both read here, never retyped;
 * the builder throws if SC-02's detail stops saying the courseware share is Her Power's curriculum for the same national target. The note stays ONE shared source: Investors, Impact, Governments and the JobReady Platform page all print it.
 * WP85 (owner update 2026-10-24): SC-02's detail now names "the 25,125 women Her Power trained nationally with CodersTrust’s curriculum", and the sentence reads "Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people."
 * WP87 (owner decisions 2026-10-24, items 18 to 21): the sentence keeps "150,000+" (the owner restored it after trying "nearly" and "~"): Her Power's 2,400 directly trained women are inside the national 25,125 and counted once, and the de-duplicated total is 150,678 (112,926 direct + 40,152 courseware - 2,400).
 */
function overlapSentence(n: string): { text: string; fact: string } {
  const enrollments = fact('SC-02').stat?.value;
  if (!enrollments || !/^[\d,]+\+$/.test(enrollments)) throw new Error('CONTRACT_TOTAL_NOTE: SC-02 no longer has a plain "N+" count as its stat value');
  // WP90 (triage A1): SC-02's detail now names "Her Power’s N" (the shortened breakdown); the guard reads that form.
  if (!(fact('SC-02').stat?.detail ?? '').includes(`Her Power’s ${n} and`)) throw new Error('CONTRACT_TOTAL_NOTE: the SC-02 detail no longer says the courseware share includes "Her Power’s N and" (the overlap with the 30,000+ contract scope)');
  return { text: `Her Power’s ${n} is the same group counted in the ${enrollments} enrollments through CodersTrust’s curriculum, not additional people.`, fact: 'SC-02' };
}
/**
 * WP86 (CLR review, Sonnet Max run 3, Minor 2): the overlap sentence is printed only where the 150,000+ is printed (Investors and Impact, the full form). Governments and the JobReady Platform page show the short form, the first sentence alone, with no SC-02 in its facts.
 */
function contractTotalNote(withOverlap: boolean): CopyBlock {
  const { national: n, direct } = CONTRACT_FIGURES;
  const first = `The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained ${n} women (CodersTrust trained ${direct} directly).`;
  if (!withOverlap) return { text: first, facts: ['GV-12', 'GV-01', 'GV-11'] };
  const overlap = overlapSentence(n);
  return { text: `${first} ${overlap.text}`, facts: ['GV-12', 'GV-01', 'GV-11', overlap.fact] };
}
export const CONTRACT_TOTAL_NOTE: CopyBlock = contractTotalNote(true);
export const CONTRACT_TOTAL_NOTE_SHORT: CopyBlock = contractTotalNote(false);

/**
 * WP60 (cycle-32 review, Grok R4): the clause that keeps National University's 1.5M+ apart from CodersTrust's own learners, in one place. Home's government slide closes "... onboarding 1.5M+ learners (National University’s learners, not learners trained by CodersTrust)."
 * (heroSlides.ts, WP59), and the JobReady Platform page's "In the Pipeline" tile reads "National University learners in the onboarding pipeline, not learners trained by CodersTrust" (SC-04's own label plus this clause), so the two cannot drift apart.
 * The Universities and Campus pages say it in their band lead ("... they are not learners trained by CodersTrust.") and Investors by "Separately, and not counted in the delivered reach", so SC-04's own label stays as the register has it.
 */
export const NU_NOT_TRAINED = 'not learners trained by CodersTrust';
/**
 * WP87 (CLR review, Opus XHigh run 1, Minor): the National University partnership is worded with its scope on every page ("... official training partner for digital career skills and credentials since 2023"); the NU Postgraduate Diploma page had dropped it, so it read as an exclusive, university-wide partnership.
 * One sentence, read from SC-04 ("CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023"), for Governments and the diploma page; the build stops if SC-04 stops saying it.
 */
const nuPartnershipStatement = (): string => {
  const m = /CodersTrust has been NU’s (official training partner for digital career skills and credentials since \d{4})/.exec(fact('SC-04').text);
  if (!m) throw new Error('NU_PARTNERSHIP_STATEMENT: SC-04 no longer says "CodersTrust has been NU’s official training partner for digital career skills and credentials since YYYY"');
  return `CodersTrust has been National University’s ${m[1]}.`;
};
export const NU_PARTNERSHIP_STATEMENT: string = nuPartnershipStatement();

/**
 * WP60 (cycle-32 review, Claude S3): the clause that makes the 2 million 2030 aim (IN-01) conditional. It was typed once, in the Programs hub card; IN-01's register text does not carry it, so it is kept here and every page that states the aim reads it from here:
 * the Programs hub card, YouthWIDE's "Designed for Three Regions" row and its 2030 aim tile, the Impact "Where We Are Heading" tile and the About timeline. It is not a figure and not an outcome; it says the aim depends on commitments that are not CodersTrust's to give.
 */
export const AIM_DEPENDENCY = 'depending on government and donor commitments';

/**
 * WP60 (cycle-32 review, Claude S4; owner answer 2026-10-20: "711 of 1000 is correct. The BIGD study only studied 833."): WSDFM's program records (PR-01: 711 of 1,000 women in work) and the randomized trial of the predecessor program (RC-07) are two different counts,
 * and the pages that show them side by side say so. The trial's count is the 833 that RC-07's text states ("Trial design: 833 women at baseline (425 treatment, 408 control) ..."), read from it, never retyped; it is the trial's whole sample, the 408 women who
 * were not offered a place included, so no page says that the 833 are "of" the 1,000 trainees. The builder throws if RC-07 stops saying "N women at baseline".
 */
function trialWomen(): string {
  const n = /(\d[\d,]*) women at baseline/.exec(fact('RC-07').text)?.[1];
  if (!n) throw new Error('TRIAL_WOMEN: RC-07 no longer says "N women at baseline"');
  return n;
}
export const TRIAL_WOMEN: string = trialWomen();

/**
 * WP82 (owner item, 2026-10-23): the women offered a place in the randomized trial are 425 of the 833 (RC-07's "425 treatment"), read from RC-07, never retyped. The builder throws if RC-07 stops saying "N treatment".
 */
function trialOffered(): string {
  const n = /(\d[\d,]*) treatment/.exec(fact('RC-07').text)?.[1];
  if (!n) throw new Error('TRIAL_OFFERED: RC-07 no longer says "N treatment"');
  return n;
}
export const TRIAL_OFFERED: string = trialOffered();

/**
 * WP81 (owner item, 2026-10-23): WSDFM's program records cover the 1,000 women enrolled, and the women offered a place in the randomized trial were among them (BIGD report p. 19), so the two are different evidence, not different people. The 1,000 is PR-01's value ("711 of 1,000"), read from it, never retyped.
 */
function wsdfmEnrolled(): string {
  const n = /^[\d,]+ of ([\d,]+)$/.exec(fact('PR-01').stat?.value ?? '')?.[1];
  if (!n) throw new Error('WSDFM_ENROLLED: PR-01 stat value no longer reads "N of M"');
  return n;
}
export const WSDFM_ENROLLED: string = wsdfmEnrolled();

/**
 * WP62 (cycle-34 review, rework R3): the short note under a WSDFM program-record tile that says how the records relate to the trial ("Program records, separate from the randomized trial of the predecessor program, which studied 833 women.", 15 words).
 * WP81: "separate from" is gone, because the trial's women were among the 1,000; the note now reads "Program records, not trial results; the women offered a place in the randomized trial (833 women studied) were among these 1,000."
 * It is the Impact page's tile note (WP60), moved here so Foundations' WSDFM tile says it with the same string; the tile's data-fact names RC-07 beside PR-01 (the 833 is RC-07's, TRIAL_WOMEN).
 * WP65 (cycle-37 review): Foundations' glance no longer carries the WSDFM tile (its fourth tile is UNDP YES, Korail), so the Impact page's tile is the note's one user; the Proof in Practice caption (CASE_CARD_LABELS) says the same thing in its own words.
 */
export const WSDFM_NOT_TRIAL_NOTE: string = `Program records, not trial results; the ${TRIAL_OFFERED} women offered a place in the randomized trial were among these ${WSDFM_ENROLLED}.`;
/**
 * WP86 (coordinator item 5): the short form of WSDFM_NOT_TRIAL_NOTE for the case-study card caption (CASE_CARD_LABELS: Development Partners, Foundations, Local Partners and YouthWIDE), where the full note does not fit under the figure.
 * It replaces the caption's "(not trial results; the trial studied 833 women)", so the cards and the Impact tile say the same thing about the trial (RC-07's 425 offered a place; the 1,000 are program records).
 */
export const WSDFM_NOT_TRIAL_SHORT: string = `not trial results; the trial’s ${TRIAL_OFFERED} women offered a place were among these ${WSDFM_ENROLLED}`;

/**
 * WP57b (cycle-29 review, GLM L8; owner direction): the identity sentences of ID-11 as the site renders them. The register's ID-11 ends "Additional country and regional offices are planned in the next few years."; the About page and llms.txt say
 * "Additional country and regional offices are planned." (no time frame). ID-11 is an owner statement (OWNERHQ) shared with the two sentences before it, so the register entry is unchanged and only what renders changes; the builder throws if ID-11 stops
 * ending with that clause, so a change to the register is noticed here.
 */
function identity(): CopyBlock {
  const t = fact('ID-11').text;
  const tail = ' are planned in the next few years.';
  if (!t.endsWith(tail)) throw new Error('IDENTITY: ID-11 no longer ends "... are planned in the next few years."');
  return { text: `${t.slice(0, -tail.length)} are planned.`, facts: ['ID-11'] };
}
export const IDENTITY: CopyBlock = identity();

/**
 * WP57b (owner decision 2026-10-19, "name publisher + year"; no footnotes): the external statistics name their publisher and year inside the sentence, "(Publisher, Year)", wherever they are shown: the 62 million (PX-01) and the 19M+ (PX-02) problem
 * figures, the 72% of employers (PX-05) and the AI-skills growth (PX-08). WP58 (cycle-30 reviews, Claude S5 and Kimi K2) adds the freelancing-platform study (PX-06). Each note is taken only from the registered source of its fact (src/data/facts.ts `sources`, the planning register's sources table), and the builder throws if that source stops
 * naming the publisher and the year it quotes, so no publisher or year is invented:
 *  - PX-01 is a CodersTrust estimate computed from ILOSTAT and ILO data (source PX01CALC: "CodersTrust analysis of ILOSTAT and ILO, Global Employment Trends for Youth 2026"), not an ILO statistic, so it says so: "(CodersTrust estimate from ILO data, 2026)";
 *  - PX-02 is ILOSTAT's (source ILOSTAT26: "latest year per country, 2019–2025"): "(ILOSTAT, 2019–2025)";
 *  - PX-05 is ManpowerGroup's Global Talent Shortage Survey 2026: "(ManpowerGroup, 2026)";
 *  - PX-06 is Demirci, Hannane & Zhu, "Who Is AI Replacing?", Management Science 71(10), 2025 (source DHZ25): "(Demirci, Hannane & Zhu, 2025)";
 *  - PX-08 is PwC's 2026 Global AI Jobs Barometer (15 June 2026): "(PwC, 2026)".
 * WP59 (cycle-31 review, GPT-6.1 Sol G5) adds the Bangladesh graduate-unemployment rate (PX-03, the Local Partners and NU Postgraduate Diploma tiles):
 *  - PX-03 is the Bangladesh Bureau of Statistics' Labour Force Survey 2024 (source BBSLFS24: "Bangladesh Bureau of Statistics (BBS), Labour Force Survey 2024."): "(BBS Labour Force Survey, 2024)".
 * WP64 (cycle-36 review, Kimi) adds the Bangladesh government digital labs (GV-09, the YouthWIDE and Local Partners tiles), by publisher alone, because its source states no year:
 *  - GV-09 is the Department of ICT's count of the ICTD Digital Lab's labs (source DOICTLAB: "Department of ICT (DoICT), ICT Division, ICTD Digital Lab, “About”: digital labs in a total of 9,001 educational institutions ..."): "(Department of ICT count)". The tile's note,
 *    the register's own detail line ("In Bangladesh; lab access and seats are confirmed per program."), already says where the labs are and that access is confirmed per program.
 *    WP64 rework RW1 (coordinator): the note goes directly after "government digital labs" (`after`), not at the end of the label, so the attribution covers the count and not "that could host blended learning", which is CodersTrust's own judgment (the first version, "... blended learning (Department of ICT)",
 *    could be read as DoICT saying the labs could host blended learning). The build stops if a text carrying the note no longer contains that phrase.
 * FactCard, FactStat, ProblemSection's re-worded tiles, Home's cost-of-waiting card (freelancePostingsFinding, src/components/sections/copyText.ts) and the Investors thesis sentence add the note through withSourceNote; the register's wording (labels and text) is unchanged. Page titles and meta descriptions do not carry it.
 */
const SOURCE_NOTES: Record<string, { note: string; registered: string[]; textHas?: string; after?: string }> = {
  'PX-01': { note: 'CodersTrust estimate from ILO data, 2026', registered: ['CodersTrust analysis of ILOSTAT and ILO', '2026'], textHas: 'estimated' },
  'PX-02': { note: 'ILOSTAT, 2019–2025', registered: ['ILOSTAT', '2019–2025'] },
  'PX-03': { note: 'BBS Labour Force Survey, 2024', registered: ['BBS', 'Labour Force Survey', '2024'] },
  'PX-05': { note: 'ManpowerGroup, 2026', registered: ['ManpowerGroup', '2026'] },
  'PX-06': { note: 'Demirci, Hannane & Zhu, 2025', registered: ['Demirci, Hannane & Zhu', '2025'] },
  'PX-08': { note: 'PwC, 2026', registered: ['PwC', '2026'] },
  // `after`: the phrase the note attaches to; it goes directly after it, inside the text, not at the end (RW1: the count is DoICT's, "could host blended learning" is not)
  'GV-09': { note: 'Department of ICT count', registered: ['Department of ICT (DoICT)', '9,001'], after: 'government digital labs' },
};
function sourceNotes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, spec] of Object.entries(SOURCE_NOTES)) {
    const f = fact(id);
    const cited = f.sourceIds.map((sid) => sources[sid]?.citation ?? '').join(' ');
    for (const needle of spec.registered) if (!cited.includes(needle)) throw new Error(`SOURCE_NOTE ${id}: its registered source no longer says "${needle}" (${cited})`);
    if (spec.textHas && !f.text.includes(spec.textHas)) throw new Error(`SOURCE_NOTE ${id}: the register no longer says "${spec.textHas}", which its note ("${spec.note}") relies on`);
    out[id] = `(${spec.note})`;
  }
  return out;
}
/** "(Publisher, Year)" by fact id, for the external statistics (the labs figure, GV-09, names its publisher alone and says it is the publisher's count: its source states no year). */
export const SOURCE_NOTE: Record<string, string> = sourceNotes();
/** A label or sentence with its source note inside it ("... in 2026 (ManpowerGroup, 2026)"); text of any other fact is returned as it is. */
// A label that already ends in a parenthesis (PX-01's "(range 61–78 million)") takes the note inside it, "(range 61–78 million; CodersTrust estimate from ILO data, 2026)", not as a second parenthesis.
// A note with an `after` phrase (GV-09: "government digital labs (Department of ICT count) that could host blended learning") goes directly after that phrase; a text without it stops the build, since the note would then have nothing to attach to.
export const withSourceNote = (id: string, text: string): string => {
  const note = SOURCE_NOTE[id];
  if (!note) return text;
  const after = SOURCE_NOTES[id]?.after;
  if (after) {
    const at = text.indexOf(after);
    if (at < 0) throw new Error(`withSourceNote ${id}: the text "${text}" no longer contains "${after}", which its source note ${note} attaches to`);
    const cut = at + after.length;
    return `${text.slice(0, cut)} ${note}${text.slice(cut)}`;
  }
  return text.endsWith(')') ? `${text.slice(0, -1)}; ${note.slice(1)}` : `${text} ${note}`;
};
// WP51 (cycle-26 reviews, Kimi P2 and Grok m1): ORIGIN_LAUNCH ("Launched in Copenhagen in 2014.", the line for a band that shows SC-03's tile) is gone: Development Partners and Investors print ORIGIN_SHORT like Governments and Foundations.

/**
 * WP52 (cycle-27 review): OC-05's labels call the 172 "surveyed new earners", a term the Outcomes 2026 page defines once (WP49), so the 58.7% read away from that definition (Home's speed slide, the Impact tile) could be taken for a
 * share of all completers. Those two surfaces define the term in place: "... of the 172 surveyed new earners (completers who first earned during or after training) had started earning by six months after finishing the course ...".
 * The definition is the words of OC-05's own text ("Among the 172 surveyed completers who first earned during or after training"); the label is the register's, with the definition inserted after the term, never retyped. The build
 * stops if the register's text or the label stops reading that way. The register's labels (OC-05's stat and glance) are unchanged, so the Outcomes page keeps its short labels beside its one definition.
 */
const NEW_EARNERS_TERM = 'surveyed new earners';
const NEW_EARNERS_DEFINITION = 'completers who first earned during or after training';
export function defineNewEarners(label: string): string {
  if (!fact('OC-05').text.includes(NEW_EARNERS_DEFINITION)) throw new Error(`defineNewEarners: OC-05's text no longer says "${NEW_EARNERS_DEFINITION}"`);
  if (!label.includes(NEW_EARNERS_TERM)) throw new Error(`defineNewEarners: the label "${label}" no longer says "${NEW_EARNERS_TERM}"`);
  return label.replace(NEW_EARNERS_TERM, `${NEW_EARNERS_TERM} (${NEW_EARNERS_DEFINITION})`);
}

/**
 * WP64 (cycle-36 review, Grok; the WP62 treatment of Home's reach card and the hub's "Why Partner" tile, now shared): a tile that sits under a heading or beside a label that already says "since 2014" ("Reach Since 2014" on the Programs hub, "Since 2014" on Investors,
 * "Delivered Since 2014" on JobReady Platform) drops the phrase from its own label, so the period is said once: SC-01's "learners trained since 2014" reads "learners trained", SC-02's "enrollments since 2014" reads "enrollments". The label is read from the register,
 * never retyped, and the build stops if it stops ending "since 2014" (the page would then need review). A page-level override: the register's labels are unchanged, so every other page that shows them still reads "since 2014".
 */
const SINCE_2014 = ' since 2014';
export function withoutSince2014(label: string): string {
  if (!label.endsWith(SINCE_2014)) throw new Error(`withoutSince2014: the label "${label}" no longer ends "${SINCE_2014}"; update the tile that drops it`);
  return label.slice(0, -SINCE_2014.length);
}

/**
 * WP64 rework RW2 (coordinator): the same rule for the audience bands whose HEADING says the period ("We’ve Built This Path Since 2014" on Development Partners, Governments, Foundations, Universities and Employers, and (WP67) on YouthWIDE,
 * "A Record Built Since 2014" on Investors). Under such a heading the band says it once:
 *  - a tile whose register label ends "since 2014" (SC-01, "learners trained since 2014") shows it without the phrase (statLabelUnder);
 *  - the origin line (ORIGIN_SHORT, "Since 2014, from a Copenhagen launch to work in 16 countries and territories.") drops its "Since 2014," lead-in, which only repeats the heading, and keeps the founding fact and the reach: "From a Copenhagen launch to work in 16 countries and territories." (originShortUnder).
 * Both read the heading, so a band whose heading does not carry the year (Careers' "Why Join CodersTrust", Local Partners' "Delivered with a Bangladesh Team Beside You") keeps the year in its tile and prints the whole line. Page-level: the register's labels and ORIGIN_SHORT are unchanged, and the build stops if the
 * line stops opening "Since 2014, from " (it is read from ID-02 and SC-03; a changed founding year would otherwise leave the headings and the line saying different things).
 */
export const headingStatesSince2014 = (heading: string): boolean => /\bsince 2014\b/i.test(heading);
/** The label a stat tile shows under `heading`: the register's label without " since 2014" when the heading states the period and the label ends with it; otherwise `undefined` (the tile keeps the register's own label). */
export function statLabelUnder(heading: string, label: string | undefined): string | undefined {
  return label !== undefined && headingStatesSince2014(heading) && label.endsWith(SINCE_2014) ? withoutSince2014(label) : undefined;
}
/** The band's origin line under `heading`: ORIGIN_SHORT as it is, or without its "Since 2014," lead-in when the heading already says it. */
export function originShortUnder(heading: string): CopyBlock {
  if (!headingStatesSince2014(heading)) return ORIGIN_SHORT;
  const lead = 'Since 2014, from ';
  if (!ORIGIN_SHORT.text.startsWith(lead)) throw new Error(`originShortUnder: ORIGIN_SHORT no longer opens "${lead}" ("${ORIGIN_SHORT.text}"); update the band lines that drop the repeated year`);
  return { ...ORIGIN_SHORT, text: `From ${ORIGIN_SHORT.text.slice(lead.length)}` };
}

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
 * WP39 (cycle-16 review): the Investors page has none either: its statement restated the hero lead and returned to cohort language on a page about backing the platform, and "How JobReady Builds on Delivery" said how the
 * platform relates to delivery once (WP43, cycle-20 review, removed that one-sentence band: the evidence block and "What JobReady Does" say it); scripts/check-facts.mjs exempts that one page (POSITION_EXEMPT_PAGES).
 * WP36: YouthWIDE's statement is the two shared sentences alone, with "YouthWIDE" in place of "We" (its audience and regions are in the hero and the glance right above it); the gate declares it whole for that page.
 * WP40 (cycle-17 review): Local Partners' statement is two sentences that divide the work (the partner mobilizes and hosts; CodersTrust supports delivery, mentoring, placement and reporting), because its audience and outcome
 * are in the hero and the problem band above and the four responsibility cards follow it; the gate declares it whole for that page as well (POSITION_WHOLE_STATEMENT).
 * WP42 (cycle-19 reviews): Development Partners and Governments state what the model does in the two shared sentences alone (their audience and outcome are in the hero, the problem band and the glance above), each with its reader
 * as the one changed word ("Partners receive monthly reports and outcome tracking after each course, as agreed in the program scope"; "Your agency receives monthly reports on progress toward paid work"); the gate declares both whole.
 * WP43 (cycle-20 review): JobReady@Campus' statement is two sentences too, with the program as the subject ("JobReady@Campus combines certification exam preparation, mentoring and placement support in campus labs alongside
 * academic studies. Institutions receive monthly reports on progress toward paid work, as agreed in the program scope."); the gate declares it whole as well.
 * SuperKids' statement is two plain sentences, what the program offers and what the agreements are (the gate asks nothing of its wording: it carries no comparison clause).
 */
export type PositioningKey = Exclude<Audience, 'nuPgd' | 'investors'> | 'youthwide' | 'nationwide' | 'campus' | 'work' | 'superkids';

/**
 * The shared closing of the positioning statements (the slot doc 04 §1 calls [UNLIKE] + [WE]), word for word; scripts/check-facts.mjs declares it independently (UNLIKE_SENTENCE).
 * WP31: two plain sentences in place of the long comparison sentence. It rests on PD-01 (training, mentoring, placement support) and PD-08 (monthly reports).
 */
const UNLIKE_APPROVED =
  'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.';

/**
 * Home's closing sentence (WP19, item 13: two plain sentences in place of the long [UNLIKE] sentence; scripts/check-facts.mjs pins it for Home only).
 * WP50 (cycle-25 review): the first of the two ("Many programs cover one step: training, self-paced courses or freelance matching.") is gone; the sentence that names what CodersTrust connects stays.
 * WP51 (cycle-26 review): the monthly reports are scoped as every other reporting statement on the site is ("..., as agreed in the program scope"); scripts/check-facts.mjs declares the sentence independently (POSITION_EMPLOYER_CLOSING['/']).
 * WP60 (cycle-32 review, Gemini GM7; raised in nearly every cycle): Home's "Our Approach" is ONE sentence that keeps the audience, "CodersTrust connects training, mentoring and placement support for educated, unemployed youth, with monthly reports on progress toward paid work, as agreed
 * in the program scope." (it was two sentences: "For funders who need educated, unemployed youth in paid digital work, CodersTrust offers an integrated training-to-earnings model." and "CodersTrust connects training, mentoring and placement support in one program, and partners
 * receive monthly reports on progress toward paid work, as agreed in the program scope."). scripts/check-facts.mjs declares it whole for Home (POSITION_WHOLE_STATEMENT['/']), independently of this file, so a change to it has to be made twice on purpose.
 * WP63 (cycle-35 review, Grok R1): the audience is "educated, unemployed and underemployed youth", the group ID-01 and the hero's value proposition name ("... for educated, unemployed and underemployed youth, with monthly reports ..."); the declaration in scripts/check-facts.mjs changed with it.
 */
const HOME_POSITIONING =
  'CodersTrust connects training, mentoring and placement support for educated, unemployed and underemployed youth, with monthly reports on progress toward paid work, as agreed in the program scope.';

export const POSITIONING: Record<PositioningKey, CopyBlock> = {
  home: {
    text: HOME_POSITIONING,
    facts: ['PD-08'],
  },
  developmentPartners: {
    // WP42 (cycle-19 review): the hero, the problem band and the glance above say who the page is for and what they need, so "Our Approach" states what the model does, in the two shared sentences with the tracking said as the page's
    // cards say it ("outcome tracking after each course, as agreed in the program scope"). scripts/check-facts.mjs declares it whole for /partner-with-us/development-partners/ (POSITION_WHOLE_STATEMENT). It rests on PD-01
    // (training, mentoring, placement support), PD-08 (monthly reports) and PD-09 (follow-up surveys at 3, 6 and 12 months).
    text: 'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports and outcome tracking after each course, as agreed in the program scope.',
    facts: ['PD-01', 'PD-08', 'PD-09'],
  },
  governments: {
    // WP42 (cycle-19 review): as Development Partners: the two shared sentences, the reader named in the second ("Your agency receives monthly reports on progress toward paid work"). Declared whole for /partner-with-us/governments/
    // (POSITION_WHOLE_STATEMENT); it rests on PD-01 and PD-08.
    text: 'We combine training, mentoring and placement support in existing labs and colleges. Your agency receives monthly reports on progress toward paid work, as agreed in the program scope.',
    facts: ['PD-01', 'PD-08'],
  },
  foundations: {
    // WP44 (cycle-21 review): the hero and the Funding Route chooser already say who the page is for, so "Our Approach" states what the two grants fund and what they agree, in two sentences. scripts/check-facts.mjs declares it whole
    // for /partner-with-us/foundations/ (POSITION_WHOLE_STATEMENT). It rests on IN-04 (the platform grant), PD-01 (training, mentoring, placement support), PD-08 (monthly reports) and PD-11 (the pilot scorecard agreed in co-design).
    text: 'Fund a YouthWIDE cohort or JobReady’s platform infrastructure. For cohort grants, we agree a pilot scorecard and combine training, mentoring and placement support, with monthly progress reports.',
    facts: ['IN-04', 'PD-01', 'PD-08', 'PD-11'],
  },
  universities: {
    // WP44 (cycle-21 review): as JobReady@Campus: the program is the subject, and the institution's reports are scoped as the program scope says. scripts/check-facts.mjs declares it whole for /partner-with-us/universities/ (POSITION_WHOLE_STATEMENT).
    // It rests on IN-09 (training in parallel with academic studies, in on-campus labs), PD-01 (mentoring, placement support) and PD-08 (monthly reports).
    text: 'JobReady@Campus combines training, mentoring and placement support in campus labs alongside academic studies. Your institution receives monthly reports on progress toward paid work, as agreed in the program scope.',
    facts: ['IN-09', 'PD-01', 'PD-08'],
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
  // No page uses this statement today (the YouthWIDE page's is `youthwide`, above). WP45 (cycle-21 review): it no longer calls the Bangladesh initiative "a national initiative" (IN-01 is an initiative that aims to train 2 million vulnerable youth by 2030).
  nationwide: {
    text: `For ministries, agencies and national funders who need educated, unemployed and underemployed youth in paid digital work, CodersTrust offers YouthWIDE in Bangladesh. ${UNLIKE_APPROVED}`,
    facts: ['IN-01', 'PD-01', 'PD-08'],
  },
  campus: {
    // WP43 (cycle-20 review): the audience sentence ("For universities and colleges who need ...") restated the hero lead and the glance above it, so "Our Approach" states what the program does and what the institution receives, in two
    // sentences, with the program as the subject (as YouthWIDE's does) and the reporting scoped as the Development Partners and Governments statements scope it ("as agreed in the program scope"; PD-08 states the reports for
    // funders and the page's cards state them for the institution, in the program scope). scripts/check-facts.mjs declares it whole for /programs/jobready-campus/ (POSITION_WHOLE_STATEMENT). It rests on IN-09 (training in parallel
    // with academic studies, in on-campus labs, with preparation for industry-recognized certifications), PD-01 (mentoring, placement support) and PD-08 (monthly reports).
    text: 'JobReady@Campus combines certification exam preparation, mentoring and placement support in campus labs alongside academic studies. Institutions receive monthly reports on progress toward paid work, as agreed in the program scope.',
    facts: ['IN-09', 'PD-01', 'PD-08'],
  },
  work: {
    // WP18b: an employer-specific statement in place of [UNLIKE] (which is about youth programs).
    // WP61 (cycle-33 review, GPT-6.1 Sol G3): the two sentences (an audience sentence, then "Each program starts with a needs assessment of your roles, is delivered through workshops on tasks from those roles, and is checked against success measures you agree before
    // you start.") repeated the four cards under the statement (Scope, Deliver, Measure, Support), so "Our Approach" is one sentence that names the range the cards detail, from IN-10 (needs assessment, workshops, progress evaluation). scripts/check-facts.mjs declares it whole for
    // /programs/jobready-work/ (POSITION_WHOLE_STATEMENT), independently of this file, so a change to it has to be made twice on purpose.
    text: 'JobReady@Work builds training around your roles, from needs assessment to workshops and progress evaluation.',
    facts: ['IN-10'],
  },
  // SuperKids carries no "unlike … we …" clause (review round 9, Mi3): neither a registered fact nor approved wording in this file
  // supports a comparison with other approaches, so the statement stops at what GV-08 and the page definition already say.
  // WP42 (cycle-19 review): two plain sentences in place of one long qualified one: what the program offers, and that the two agreements set targets (GV-08: "target reach 20M+ students"), not delivered reach.
  superkids: {
    text: 'SuperKids offers block coding, robotics and digital art through schools and education partners. DoICT and NCTB agreements set targets, not delivered reach.',
    facts: ['GV-08'],
  },
};

/**
 * Ranked C2b pains for the three bespoke conversion pages (review round 14, M4): Home and YouthWIDE (a funder audience) and the
 * local-partners page. Each page's C2 band lists them as P1 to P3 (`name` as the heading, `text` under it, in the reader's own words)
 * and its C8 band has exactly one card per pain: pain (`name`) → how we relieve it → the registered feature behind it (WP57, cycle-29 review: YouthWIDE's C8 band is gone, so its pains stand in C2 alone). Both bands read
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
// WP54 (cycle-28 review, GPT-6.1 Sol G3): P3 says training is "often" measured by enrollment (it said "still", an unhedged generalization about all training).
// WP61 (cycle-33 review, GPT-6.1 Sol G4): P1 is what CodersTrust adds, not a deficit presumed of the partner (it was "Missing curriculum, trainers and certification": "You reach the young people, but a ready curriculum, trained facilitators and a route to industry certification are
// often out of reach."). It rests on the same register facts as the "Certified Facilitators and a Local Curriculum" card it still maps to (PD-06, PD-02: certified local facilitators, a localized curriculum, preparation for industry certification).
export const LOCAL_PARTNER_PAINS: Pain[] = [
  { id: 'P1', name: 'Curriculum and certification take time to build', text: 'A ready curriculum, trained facilitators and a route to industry certification take time and specialist support to build.' },
  { id: 'P2', name: 'Missing work-entry connections', text: 'Training that stops at the classroom door leaves completers without links to employers, clients and platforms.' },
  { id: 'P3', name: 'Reporting and accountability demands', text: 'Funders ask who is earning, but training is often measured by enrollment, not earnings.' },
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
 * The trial's evaluator spelled out (WP35, cycle-12 review: BIGD was not expanded on first mention). The register's RC-01 headline says "by BIGD"; a band that is the first place a page
 * names the evaluator runs the sentence through spellOutBigd(), the way /our-model/ and /our-model/talentleap/ expand it.
 * WP54 (cycle-28 review, GPT-6.1 Sol G8): About, Governance, the WSDFM case study and YouthWIDE (TRIAL_SENTENCE, below) spell it out at their first mention too. These four constants moved here from further down this file,
 * because TRIAL_SENTENCE is built when the module loads and reads BIGD_FULL.
 */
export const BIGD_INSTITUTE = 'BRAC Institute of Governance and Development';
export const BIGD_NAME = `${BIGD_INSTITUTE} (BIGD)`;
export const BIGD_FULL = `the ${BIGD_NAME}`;
export const spellOutBigd = (sentence: string): string => sentence.replace('by BIGD', `by ${BIGD_FULL}`);

/**
 * The trial result as ONE sentence (WP32, cycle-9 review: YouthWIDE's evidence band explained the trial twice in a row, in the plain line and again in the RC-01 headline). It names
 * the evaluator and the predecessor program, then the two results RC-01 headlines for women offered a place: the employment effect (RC-02's stat, in percentage points) and the
 * estimated income difference (RC-01's stat). Both figures are read from the register, so the sentence cannot drift from it; it throws if either stat changes shape.
 * WP54 (cycle-28 review, GPT-6.1 Sol G8): it is where YouthWIDE first names the evaluator, so it spells it out: "In the randomized trial of the predecessor WSDFM program by the BRAC Institute of Governance and Development (BIGD), ..."
 * (it said "In BIGD’s randomized trial of the predecessor WSDFM program, ...").
 */
function trialSentence(): CopyBlock {
  const employment = fact('RC-02').stat;
  const income = fact('RC-01').stat;
  if (!employment || !/^\+[\d.]+ pp$/.test(employment.value) || !income || !/^\+\d+%$/.test(income.value)) {
    throw new Error(`TRIAL_SENTENCE: RC-02 or RC-01 no longer has the expected stat: ${JSON.stringify([employment?.value, income?.value])}`);
  }
  const points = employment.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
  return {
    text: `In the randomized trial of the predecessor WSDFM program by ${BIGD_FULL}, women offered a place were ${points} more likely to be employed and had an estimated ${income.value.replace(/^\+/, '')} higher monthly income than the control group.`,
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
 * count of other locations is SC-03's count less Bangladesh, so it is derived, not typed.
 * WP58 (cycle-30 reviews, Claude S1 and GPT-6.1 Sol G1, applied to this line too): "... CodersTrust has also worked in 15 other countries and territories." (it said "programs have also run in ..."), as SC-03 says where CodersTrust has worked. No page prints this block today.
 */
function trainedReach(): CopyBlock {
  const sc01 = fact('SC-01');
  const sc03 = fact('SC-03');
  if (sc03.stat?.numeric === undefined) throw new Error('TRAINED_REACH: SC-03 has no numeric stat');
  const others = sc03.stat.numeric - 1;
  return {
    text: `${sc01.text}, most of them in Bangladesh; CodersTrust has also worked in ${others} other countries and territories.`,
    facts: ['SC-01', 'SC-03'],
  };
}
export const TRAINED_REACH: CopyBlock = trainedReach();

export const SCALE: CopyBlock = {
  // WP21: short sentences with named actors (DoICT, the ICT Division, CodersTrust), as in the national-scale FAQ answer (Q2).
  text: 'We scale in phases, starting from what we have done. Government contracts have training scopes ranging from 120+ professionals to 3,120+ digital-lab staff. Her Power, a national program of DoICT, the ICT Division, trained 25,125 women across 130 sub-districts (upazilas), meeting its target. CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,400 women directly. Separately, 10,000 teachers were trained to teach online during COVID-19. Larger programs use existing labs and colleges, certified local facilitators and blended delivery, and can run up to 10 cohorts in parallel.',
  facts: ['GV-10', 'GV-01', 'GV-11', 'SC-08', 'PD-06'],
};

export const PRICING: CopyBlock = {
  text: 'Pricing is set per program, and we share an indicative budget in the discovery session. Standard inclusions: outreach and selection, blended training, an AI-ready curriculum, certification exam preparation (exam fee included), three months of mentoring, placement support, monthly reporting and outcome tracking for 12 months after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where a program needs them. AI-ready curriculum: each track’s AI content and work-entry plan are agreed with you before enrollment; we do not yet publish a track-by-track breakdown.',
  facts: ['PD-02', 'PD-02a'],
};

// WP50 (cycle-25 review): EMPLOYER_PRICING ("Pricing is set per program; we share an indicative budget in the discovery session and confirm it after the needs assessment.", WP25s) is gone. The two employer pages printed it a second time in
// their options band, so the sentence is now said once on each page, in the "What Does It Cost?" answer (Q8-employer in faqs.ts).

/** The hiring route in the closing steps of Employers and JobReady@Work (WP34, cycle-11 review): the steps there are team training, so hiring gets its own short route ("For Hiring"). */
export const EMPLOYER_HIRING_ROUTE = 'We scope your talent request against the experience and credentials available in the candidate pool.';

/**
 * The hiring route's two steps, in the same step component as the training route's (WP46, cycle-22 review: Employers; WP47: JobReady@Work mirrors them, with the same wording and component). Both sentences are wording the pages
 * already had: "Discovery" is the scoping sentence above (IN-04) and "Introductions" is the placement-team sentence of the "Hire Talent" band's lead and of the "Talent Through the Placement Team" option.
 */
export const EMPLOYER_HIRING_STEPS = [
  { title: 'Discovery', text: EMPLOYER_HIRING_ROUTE },
  { title: 'Introductions', text: 'Job-ready candidates are introduced through CodersTrust’s placement team.' },
];

// WP46 (cycle-22 review): SPEED, the grant-pilot urgency line, is gone: the call-to-action bands of Development Partners and Foundations no longer repeat the timing that the Next Steps band directly below them shows as steps (PD-04).

/** C13 urgency line for the universities page: a university's start follows its academic calendar, so it makes no grant-pilot timing claim (PD-04 is for grant-funded pilots). */
export const SPEED_UNIVERSITIES: CopyBlock = {
  text: 'Timing follows your academic calendar: tracks and campus labs are agreed in co-design before the first cohort starts.',
  facts: [],
};

export const SURVEY_EMPLOYMENT: CopyBlock = {
  // WP25s: two readings, not a rise (a rise reads as the training's effect, which a survey of completers does not show).
  text: 'Among surveyed completers, employment was 48.0% before training and 78.2% at the October 2026 survey.',
  facts: ['OC-01'],
};

/**
 * The median-income survey result as two readings (WP35, cycle-12 review). OC-03's register sentence ("median monthly income rose from $98 before training to $245 at the October 2026
 * survey (2.5×)") reads as an effect and a multiple, so a page that states the result prints this display sentence instead; the register sentence itself is unchanged (it backs
 * the published aggregates). Both medians are read from OC-03's stat, so no figure is typed here.
 */
function surveyIncome(): CopyBlock {
  const s = fact('OC-03').stat;
  if (!s?.from) throw new Error('SURVEY_INCOME: OC-03 no longer has a stat with a before-training median');
  return { text: `Among surveyed completers, median monthly income was ${s.value} at the October 2026 survey, against ${s.from} before training.`, facts: ['OC-03'] };
}
export const SURVEY_INCOME: CopyBlock = surveyIncome();

/**
 * The evidence ladder's first rung (WP48, cycle-23 review, item 34: it was "Independent Evaluation by the BRAC Institute of Governance and Development (BIGD)" in the matrix on /impact/ and
 * "Randomized Trial (BIGD)" in the compact ladder). Every rendering of the ladder (the matrix, its cards variant and the compact ladder) reads this one name, so they cannot drift.
 * The name uses the abbreviation, so the rung's "What It Shows" text spells the evaluator out (BIGD_INSTITUTE), once, on /impact/.
 * WP49 (cycle-24 review, item 14): the name is "Independent Evaluation (BIGD)", not "Independent Randomized Trial (BIGD)": the rung's evidence tag already says "Randomized Trial", so the type was printed twice.
 */
export const TRIAL_RUNG_NAME = 'Independent Evaluation (BIGD)';

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
  text: 'Women-focused programs report their own results: WSDFM 71% in work; Women in Online Work, Kosovo 68% in work; Her Power 372 of 800 tracked women in work (47%), tracked from the 2,400 trained directly by CodersTrust.',
  facts: ['PR-01', 'PR-02', 'PR-05'],
};

/**
 * The two contracting entities as the register names them (ID-07, PD-13), in one phrase. The Governance hero (GOVERNANCE below), the due-diligence rows (DueDiligenceView, ContractingPanel) and the Investors
 * offer band's due-diligence line read it, so the names cannot drift (WP49, cycle-24 review).
 */
export const CONTRACTING_ENTITIES = 'CT USA, Inc. in the United States or CodersTrust Bangladesh Ltd. in Bangladesh';

export const GOVERNANCE: CopyBlock = {
  text: `CodersTrust contracts through ${CONTRACTING_ENTITIES}; the contracting entity depends on the program’s country and the funder’s requirements. Legal status and due-diligence arrangements for a specific program are confirmed with the funder during co-design.`,
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
/**
 * WP63 (cycle-35 review, Grok R4): the five measures of the pilot scorecard as Title Case labels, in one place. Home's scorecard (src/components/ui/PilotScorecard.astro) shows them as its five items, and YouthWIDE's "Managed Rollout" list prints the same labels
 * (it printed "First paid work", "Sustained work" and "Cost per completer and per verified outcome" in sentence case). The order and the words are PD-11's ("completion, certification, first paid work, sustained work, ... cost per completer and per verified outcome");
 * the builder throws if the register stops naming one of them.
 */
export const SCORECARD_LABELS = ['Completion', 'Certification', 'First Paid Work', 'Sustained Work', 'Cost per Completer and per Verified Outcome'] as const;
for (const label of SCORECARD_LABELS) {
  if (!fact('PD-11').text.toLowerCase().includes(label.toLowerCase())) throw new Error(`SCORECARD_LABELS: PD-11 no longer names "${label.toLowerCase()}"`);
}

export const PROGRAM_OPTIONS = [
  { name: 'Multi-Cohort Pilot Program', size: '1,000–2,500 trainees', duration: '8–14 months (tracking to month 23)', note: 'Prove the model in one country or region.' },
  { name: 'Scale', size: '10,000–25,000 trainees', duration: '12–18 months rolling', note: 'Expand to more cohorts and locations on the pilot’s results.' },
  { name: 'National Design Option', size: '100,000+ trainees', duration: '3–5 years', note: 'A design option we plan phase by phase; not yet delivered at this size.' }, // WP69 (owner item 3): was "National"
] as const;
export const PROGRAM_OPTIONS_FACTS = ['PD-05'];

/**
 * "How it works in three steps" (C8d) for funded programs.
 * WP54 (cycle-28 review, Claude S25): the work-entry plan is "agreed before enrollment", as every other page says it (Employers, the FAQ answer on AI); it said "approved", which left open who approves.
 */
export const STEPS = [
  { title: 'Discover and Co-Design', text: 'A discovery session sets priority groups, tracks, the indicative budget and the pilot scorecard; each track’s demand and work-entry plan is agreed before enrollment.' },
  { title: 'Train and Mentor', text: '100 training hours per certification, then three months of milestone-based one-to-one mentoring, with placement support alongside. Mentoring works toward each track’s agreed work-entry goal (for freelance tracks: profile live, first bids, first client).' },
  { title: 'Place and Report', text: 'Placement support, monthly reports and follow-up surveys at 3, 6 and 12 months.' },
] as const;
export const STEPS_FACTS = ['PD-19', 'PD-01', 'PD-15', 'PD-08', 'PD-09'];

export const MICRO_COMMITMENT = 'A discovery session is a conversation, not a commitment.';
/** The same reassurance on the Employers page, whose first step may be a hiring request rather than a discovery session (WP36, cycle-13 review). */
export const MICRO_COMMITMENT_EMPLOYERS = 'Your first step is a conversation, not a commitment.';
/**
 * WP59 (cycle-31 review, GPT-6.1 Sol G2): what a discovery session does, in the one sentence the Impact pages' closing bands and TalentLEAP's next step print. "A discovery session agrees your priority groups, tracks and the pilot scorecard." (WP58, K5) made the first call sound like a
 * commitment; the session "explores" what the visitor brings. It stands beside MICRO_COMMITMENT, which says the session is not a commitment.
 */
export const DISCOVERY_SESSION_LINE = 'A discovery session explores your goals, priority groups and possible program scope.';
/** The closing bands' text link to the Impact page (WP59, cycle-31 review, Gemini GM1): Title Case, as the other text links are ("See the Evidence", "Read the Trial Results"). */
export const READ_THE_EVIDENCE = 'Read the Evidence';

/**
 * The line over the program options on Home (WP25h), and now on the Universities and JobReady@Campus option bands (WP36, cycle-13 review): the sizes (1,000–2,500 trainees and so on) are
 * options to scope in the discovery session, not a commitment, so a campus reads them as a range to choose from rather than a quantity asked of it.
 * WP47 (cycle-22 review): a full sentence with its subject ("These are program sizes, not commitments: ..."), where it was a fragment that began with a noun phrase.
 */
export const PROGRAM_SIZES_NOTE = 'These are program sizes, not commitments: in the discovery session you choose a starting scope for your goals, country and delivery capacity.';
/**
 * The same note on the Governments page, whose first step is a briefing for the ministry, not a discovery session (WP49, cycle-24 review: the page's cost answer and its "Choose Where to Start" lead said "discovery session"
 * beside a "Request a Briefing" button). The page's cost answer says "in the briefing" too (faqs.ts, Q8-government).
 */
export const PROGRAM_SIZES_NOTE_BRIEFING = 'These are program sizes, not commitments: in the briefing you choose a starting scope for your goals, country and delivery capacity.';

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

/**
 * The heading of the C14 next-steps band on every audience and program page that has one (WP49, cycle-24 review: "What Happens After You Say Yes" presumed a commitment; YouthWIDE already said "What Happens Next").
 * The framework's own label for the band ("C14 What happens after you say yes") stays an internal name.
 */
export const NEXT_STEPS_TITLE = 'What Happens Next';
/** The eyebrow over the C12 risk-reversal bands (WP49, cycle-24 review: "Low Risk" read as a blanket assurance; the bands say how a rollout is paced and reviewed). */
export const RISK_EYEBROW = 'Managed Rollout';
/**
 * The eyebrow over a page's FAQ band, the default of FAQBand, FaqSection and FaqBlock (WP54, cycle-28 review, GLM L9: "Objections, Answered" printed the sales framework's own label for the band, C9 "Objection handling"; the band is a list of questions).
 * A page may still pass its own eyebrow ("Questions" on Governance, "Partner Questions" on Our Model, "Fit and Objections" on Investors).
 */
export const FAQ_EYEBROW = 'Questions, Answered';

/** C14 post-decision reinforcement (messaging framework §8). */
export const C14 = {
  // WP50 (cycle-25 review): Development Partners and Governments print no closing validation line any more (their Track Record band's logo strip names the same organizations: UNDP, the World Bank Group and BRAC; the Bangladesh government bodies),
  // so `validate` (the development-partner line, "Organizations that have worked with CodersTrust include UNDP (from 2015), the World Bank Group and BRAC.", PA-01) and `validateFor.governments` ("Government partners include Bangladesh’s ICT
  // Division, DoICT, Bangladesh Hi-Tech Park Authority, NSDA and BCC.", PA-02) are gone. Foundations, Universities and Employers kept theirs.
  // WP51 (cycle-26 reviews): Universities' line ("University partners include National University, the University for Peace (UPEACE) and The City College of New York (CCNY).", PA-05) is gone by the same rule: the page already names
  // the three universities above its closing strip (the National University Partnership band's University Partners tile, and the Track Record band's logo alt text). Foundations' line is not deleted but MOVED, unchanged: it is the second statement
  // of the Foundations Track Record band, directly after the BIGD line (the page passes `C14.validateFor.foundations` to PartnerGuideBand's `statements`), and no longer closes the page under "What Happens Next".
  // WP54 (cycle-28 review, Kimi K2): Employers' line ("Private-sector partners include Grameenphone Academy, Robi, Accenture, BASIS and AWS.", PA-03) is gone by the same rule: the Track Record band's logo strip names the same organizations,
  // so the page ends on its first-action line alone.
  // WP21: one validation line per audience (the closing strip no longer repeats the same three organizations on every partner page); each uses names from one registered partner fact.
  validateFor: {
    // WP46 (cycle-22 review): "Development and NGO partners include ..." mislabeled the foundations among these names, so the line says "Organizations that have worked with CodersTrust"; the names are still from PA-01.
    foundations: { text: 'Organizations that have worked with CodersTrust include the Rockefeller Foundation, DANIDA and Porticus.', facts: ['PA-01'] } as CopyBlock,
  },
  reminder: { text: 'Target timing for grant-funded pilots: the first cohort begins training 6–8 weeks after signing, and monthly reports follow from the first cohort.', facts: ['PD-04', 'PD-08'] } as CopyBlock,
  firstAction: 'Your first step: a discovery session. In your inquiry, include two suitable times for a discovery conversation.',
  // WP49 (cycle-24 review): Home's closing band prints the same action under a "Your First Step" label, so the line there does not say "Your first step" again (the audience pages' reinforcement strip has no such label and keeps `firstAction`).
  firstActionLabeled: 'A discovery session. In your inquiry, include two suitable times.',
  variants: {
    governments: 'Your agency’s procurement timeline sets the pace; we start with a briefing.',
    investors: 'Your first step: an introduction call.',
    // WP34 (cycle-11 review): the Employers closing band has two routes (team training, hiring), so the line names the route it is for.
    // WP54 (cycle-28 review, Kimi K5): the first step is a discovery session on both routes (the hiring route's first step is "Discovery" too, EMPLOYER_HIRING_STEPS), so the line says "for team training or hiring" and, like Home's labeled line, asks for "two suitable times".
    employers: 'Your first step, for team training or hiring: a discovery session. In your inquiry, include two suitable times.',
  },
};

/** "What is CodersTrust?" sits in DefinitionBand directly below each hero (GEO definition, not C1 copy). */
export const DEFINITION_HEADING = 'What Is CodersTrust?';

export const HOME_META = {
  // A colon, not a dash: scripts/check-title-case.mjs lowercases "From" after an em dash, and the title keeps its capital F.
  title: 'CodersTrust: From Learning to Earning for Youth',
  // WP23: at most 155 characters. WP41 (cycle-18 review): it opens with what CodersTrust does (ID-01: it trains and mentors educated, unemployed youth for digital work) and ends with the evidence, instead of leading with the trial abstract.
  // WP63 rework RW1: this description still says "educated, unemployed youth": with ID-01's full group ("educated, unemployed and underemployed youth") it would be 162 characters, over the 155 limit, and no word can go without changing what it says. Reported, not truncated.
  description: 'CodersTrust trains and mentors educated, unemployed youth for paid digital work, with evidence from a randomized trial of a predecessor program.',
};

/**
 * The trial's employment result and the survey's employment readings as the short evidence lines word them (Investors, Local Partners): read from RC-02 (the trial's stat, "+10.3 pp", in words) and OC-01
 * (the survey tile's value and its before-training reading), so no figure is typed on a page and a line cannot drift from the register. Throws, naming the caller, if either stat changes shape.
 */
function trialAndSurveyReadings(who: string): { points: string; employment: string; before: string } {
  const rc = fact('RC-02').stat;
  const oc = fact('OC-01').stat;
  if (!rc || !/^\+[\d.]+ pp$/.test(rc.value) || !oc?.from) throw new Error(`${who}: RC-02 or OC-01 no longer has the expected stat`);
  return { points: rc.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points'), employment: oc.value, before: oc.from };
}

/** The trial line of a strip that links the evidence pages (Local Partners): the predecessor program is named, the result is RC-02's, and the line makes no claim about the page's own offer. */
const predecessorTrialLine = (points: string): CopyBlock => ({
  text: `A randomized trial of the predecessor WSDFM program found women offered a place were ${points} more likely to be employed.`,
  facts: ['RC-02'],
});

/**
 * The Independent Evidence body on Investors (WP36, cycle-13 review): the trial and the survey in three sentences, the last saying that youth-program outcomes are not platform outcomes. It replaces the
 * band that restated the trial's plain-language reading, the income headline, the +10.3 pp tile, the trial chart and the survey sentence. The figures are read from RC-02 and OC-01, so the sentences
 * cannot drift from the register, and the builder throws if either stat changes shape. The survey sentence reads "was 78.2% at the October 2026 survey, up from 48.0% before training", as Home's survey card and
 * the Impact tile word it: a report by surveyed completers, with the base named and no multiplier.
 */
function investorEvidence(): CopyBlock {
  const { points, employment, before } = trialAndSurveyReadings('INVESTOR_EVIDENCE');
  return {
    text: `A randomized trial of CodersTrust’s predecessor WSDFM program found women offered a place were ${points} more likely to be employed. Among surveyed completers, employment was ${employment} at the October 2026 survey, up from ${before} before training. Youth-program outcomes are not platform outcomes.`,
    facts: ['RC-02', 'OC-01'],
  };
}
export const INVESTOR_EVIDENCE: CopyBlock = investorEvidence();

/**
 * The institutions Investors' track-record band names (WP43, cycle-20 review): ONE short paragraph, by type (governments, development partners, universities, private-sector partners), in place of four relationship lists
 * and the founders and leadership entries. Each sentence is the register's own pattern ("Government partners include ...", PA-02; "Development and NGO partners include ...", PA-01; "University partners: ...", PA-05;
 * "Private-sector partners include ...", PA-03) with a short selection of the names that fact lists (at most three for a type), so "include" keeps every list open exactly as the register words it; the full lists stay in the
 * register and on the pages that show the logos. A relationship qualifier travels with its name: National University is "(official training partner)" and The City College of New York is "a memorandum of understanding (MOU)
 * partner since 2024" (PA-05 words the relationship so; SC-04, in the band "Contracts, Pipeline and Recognition", says in full that CodersTrust is National University's official training partner). DoICT is spelled out where the
 * page first names it (the Her Power answer below says "DoICT"; the expansion is the confirmed one, F30). The builder throws if the register stops naming one of these institutions or changes one of those two relationships, so
 * the paragraph cannot outlive the facts it rests on.
 * WP65 (cycle-37 review, GLM; Sonnet in cycles 34 and 36): AWS is named by the status PA-06 registers, "CodersTrust is an AWS Authorized Training Partner", rather than listed as a private-sector partner beside Grameenphone Academy and Accenture
 * ("Private-sector partners include Grameenphone Academy, Accenture and AWS."); the sentence therefore rests on PA-06 as well as PA-03, and the builder throws if PA-06 stops reading "AWS Authorized Training Partner". PA-03 and PA-06 are unchanged.
 */
function investorPartners(): CopyBlock {
  const named = (id: string, ...needles: string[]) => {
    const text = fact(id).text;
    for (const needle of needles) if (!text.includes(needle)) throw new Error(`INVESTOR_PARTNERS: ${id} no longer names "${needle}"; update the Investors partner paragraph`);
  };
  named('PA-02', 'Bangladesh’s ICT Division', 'DoICT', 'Bangladesh Hi-Tech Park Authority');
  named('PA-01', 'UNDP', 'the World Bank Group', 'the World Food Programme');
  named('PA-05', 'National University (official training partner', 'The City College of New York (CCNY), a memorandum of understanding (MOU) partner since 2024');
  named('PA-03', 'Grameenphone Academy', 'Accenture');
  named('PA-06', 'AWS Authorized Training Partner');
  return {
    text: [
      'Government partners include Bangladesh’s ICT Division, the Department of ICT (DoICT) and the Bangladesh Hi-Tech Park Authority.',
      'Development partners include UNDP, the World Bank Group and the World Food Programme.',
      'University partners include National University (official training partner) and The City College of New York, a memorandum of understanding (MOU) partner since 2024.',
      'Private-sector partners include Grameenphone Academy and Accenture, and CodersTrust is an AWS Authorized Training Partner.',
    ].join(' '),
    facts: ['PA-02', 'PA-01', 'PA-05', 'PA-03', 'PA-06'],
  };
}
export const INVESTOR_PARTNERS: CopyBlock = investorPartners();

/**
 * The two lines of Local Partners' evidence strip (WP42, cycle-19 review), in place of the full trial-and-survey band (the +41% and +54% income results, the 52.8% / 63.1% employment chart and its table, the survey chart and the
 * median income): the trial result and the survey's employment readings, worded as the survey tile words them ("was 78.2% at the October 2026 survey, up from 48.0% before training"; the survey line names its base, "Among
 * surveyed completers"). The program-result cards and the two evidence links stay on the page. Figures are read from RC-02 and OC-01, so the lines cannot drift from the register.
 * (WP38 had a strip like it on Universities, with the degree share; WP43, cycle-20 review, removed that strip, so Local Partners' is the one page that states the trial and the survey as two lines.)
 */
function localPartnerEvidence(): CopyBlock[] {
  const { points, employment, before } = trialAndSurveyReadings('LOCAL_PARTNER_EVIDENCE');
  return [predecessorTrialLine(points), { text: `Among surveyed completers, employment was ${employment} at the October 2026 survey, up from ${before} before training.`, facts: ['OC-01'] }];
}
export const LOCAL_PARTNER_EVIDENCE: CopyBlock[] = localPartnerEvidence();

/** C11 on funder-facing pages (Home, development partners, foundations, YouthWIDE), after the program options. */
export const ACCOUNTABILITY: CopyBlock = {
  text: 'Every pilot is judged on cost per completer and per verified outcome, with thresholds agreed with you before the first cohort starts.',
  facts: ['PD-11'],
};
