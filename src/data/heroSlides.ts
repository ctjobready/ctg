import { fact, type Fact } from './facts';
import { HEADLINE, NU_ELIGIBILITY, VALUE_PROPOSITION, defineNewEarners } from './copy';
import { navGroups, type NavLink } from './nav';
import { cta } from '../lib/mailto';

/**
 * The home hero (WP17, hybrid) and the "Results and Programs" carousel below it (WP13, WP13b; rendered by src/components/sections/HeroSlider.astro,
 * driven by src/scripts/heroSlider.ts). Every figure is read from the facts register at build time (fact(id).stat, or <Fact> for a register
 * sentence); no number is typed here.
 * HOME_HERO is the stable hero: the page's only h1, one value proposition, one primary action, one text link, the audience links and the three
 * strongest proof cards, always visible. HOME_SLIDES are the carousel slides (WP19, item 7): the trial first, then (WP42, cycle-19 review) the government contracts and the National University partnership, then survey income,
 * program results (named programs), speed to earning, reach, and the programs (employment programs first, SuperKids last).
 * Each slide has one cleared photograph from the registry (src/data/photos.ts, D13 rows in src/data/permissions.json); the hero's is eager, the carousel's lazy.
 * Titles and eyebrows are Title Case (src/lib/titleCase.mjs) and carry no trailing period (WP23). Every carousel slide title is an h2.
 * WP23: the survey slides state their figure in the heading (read from the register, with titleFacts naming the facts); the trial slide gives
 * the offered-place employment and income results; the placement slide lists all four case-study programs.
 * WP25h: the program-results slide is headed "Results by Program" and says each program reports its own records; UNDP YES, Korail is stated
 * with its own measure (67% found a first job within three months, never "in work"; PR-03).
 * WP31 (cycle-8 reviews): the trial slide states the offered-place results only (two sentences); the survey-income slide is headed as what surveyed completers
 * report and has no lead; the last slide is "Find Your Program".
 * WP35 (cycle-12 review): the program-results slide no longer lists WSDFM (its 71% in work is program records, and read beside the trial's 63.1% it looked like a second result for the same
 * program; the case card and the case study keep it), so it lists three programs; the survey proof card on the hero says in its caption that the survey is of surveyed completers in Bangladesh
 * (OC-09: 58 of 64 districts). The caption, not the eyebrow, carries it: "Impact Survey 2026 in Bangladesh" wraps to two lines in the three-column range (768 to about 950 px) and pushes that card's figure out of line.
 * WP36 (cycle-13 reviews): the Home page states each figure once. The income slide has one tile (the 77.9% employment result is the hero's survey card), and the reach slide ("Explore Where Our Programs Have Run")
 * carries SC-03's detail line only (the 130,000+ and the 15 countries and territories are the hero's reach card). The program-results slide names the base of every result (Kosovo "(102 of 150)", UNDP YES
 * "of the 350 trained", Her Power "of 800 tracked women"), and the speed slide says "surveyed completers", the term the survey page and the register use.
 * WP38 (cycle-15 review): the reach slide has a figure again, SC-03's "15" with its caption ("countries and territories with CodersTrust programs"), and the speed slide's heading leads with its figure and then names the base.
 * WP39 (cycle-16 review): the income slide is headed "Surveyed Completers Report Higher Income"; the $245 and its "up from $82 before training" comparison are its tile alone (OC-03), not the heading too.
 * WP43 (cycle-20 review): the speed slide ("First Earnings Within Six Months") has no lead: it repeated the heading and the tile, so the slide is the heading, the 58.8% tile with its full base and the link.
 * WP45 (cycle-21 review): the trial slide leads with the trial's income result ("Women Offered a Place Earned an Estimated 41% More", RC-01 and RC-04), since the hero card, the announcement bar and the ">4×" tile state the employment result; the
 * government slide states the contract scope in GV-12's own note (it includes Her Power's 25,125 women trained); the speed slide is "Most First Earnings Came Within Six Months" (a majority, not a promise); the reach slide is
 * "Programs in 15 Countries and Territories" (the figure in the heading, so no tile repeats it).
 * WP46 (cycle-22 review, owner answer 2026-10-15): the speed slide's six months are counted from the end of the course: "Most First Earnings Came Within Six Months of the Course Ending" (the tile caption is OC-05's label).
 * WP48 (cycle-23 review): the speed slide is "Most Had Started Earning by Six Months After the Course" (OC-05 is cumulative and includes those who first earned during the course; "by", not "within ... of the course ending").
 * WP48 (cycle-23 review): the government slide's body is two sentences, the contract scope in GV-12's words ("... work scoped for 31,200+ people: contract scope, not a count of completers.") and the National University sentence; Her Power's 25,125 women and
 * the 2,500 CodersTrust trained directly stay on the Impact and Governments tiles (GV-12's glance note) and are no longer on the slide.
 * WP50 (cycle-25 review): the program-results slide lists four programs again ("Four programs, each with its partner, ...", as Impact and Case Studies say "Four Programs"): WSDFM's line (PR-01) is back, between Kosovo and UNDP YES, with the
 * qualifier "program records, not trial data" that the Home case card uses, so its 71% is not read as a second result of the randomized trial of the predecessor program.
 * WP50 (cycle-25 review): the trial slide's heading is "Women Offered a Place Earned an Estimated 41% More" again, with the qualifier in the slide's eyebrow ("Randomized Trial of a Predecessor Program") and in the lead; the ">4×" tile's caption says
 * the multiple in words ("More than four times the average employment effect across nine vocational-training trials."), without the +10.3 the hero's trial card states. Both are the slide's own text: RC-06a's labels are unchanged.
 * The hero's Randomized Trial card says "10.3 more were in work than in the control group" (RC-02's figure, as in the "+10.3" above it), where it said "about 10 more" (RC-02 rounded).
 * WP51 (cycle-26 review): the speed slide's heading names its subgroup: "Most Surveyed New Earners Were Earning by Six Months After the Course" (OC-05's label calls the 170 "surveyed new earners"; the heading dropped the subgroup).
 * WP51 (cycle-26 review, Grok): the government slide is "Six Government Contracts and Bangladesh’s National University" (GV-12's own name for the partner; "a National University Partnership" read as any university), and Her Power's line on the
 * program-results slide carries its base: "Her Power: 47% of 800 tracked women in work (2,500 trained directly)." (PR-05's "from the 2,500 trained directly by CodersTrust", shortened to keep the line on one row at 1280 px).
 * WP52 (cycle-27 reviews): the speed slide's caption defines the term it uses, "surveyed new earners (completers who first earned during or after training)" (defineNewEarners in copy.ts); the government slide's body is "... work scoped for 31,200+ people.
 * This is contract scope, not a count of completers. CodersTrust is also the official training partner of ..." (three sentences); the program-results lead is "Four delivered programs, each with its partner, ...". The hero's value proposition
 * (VALUE_PROPOSITION.home) begins "We help ...".
 */

export interface HeroSlideStat {
  /** Register fact whose stat (value and label) the figure shows. */
  factId: string;
  /** Caption under the figure, built from the register; the register's own label when omitted. */
  caption?: (f: Fact) => string;
}

export interface HeroSlideLink {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface HeroSlide {
  id: string;
  eyebrow?: string;
  /** The heading: the page's h1 on the first slide, an h2 on the others. */
  title: string;
  /** Fact IDs whose figures the heading states, or the finding it rests on ("Report Higher Income" rests on OC-03) (data-fact on the heading). */
  titleFacts?: string[];
  lead?: string;
  /** Fact IDs the lead states (data-fact on the lead paragraph). */
  leadFacts?: string[];
  /** A register sentence, rendered with <Fact>, in place of the lead. */
  fact?: { id: string; field: 'text' | 'headline' };
  /** One line per item under the lead (a short list of named results); each line names the register facts it states. */
  lines?: { text: string; factIds: string[] }[];
  /** Figures in white tiles under the lead. */
  stats?: HeroSlideStat[];
  /** One figure on a Klein-blue band (the evidence proof): a card over the photograph on desktop, under it on phones. */
  proof?: HeroSlideStat;
  /** Program links, in a grid. */
  programs?: NavLink[];
  links?: HeroSlideLink[];
  /** First slide only: audience links above the heading. */
  audience?: { label: string; href: string }[];
  /** Key of the photograph registry (src/data/photos.ts, photo()). */
  photo: string;
}

/** Program links, in slide order. Labels and one-line descriptors are the navigation's own (src/data/nav.ts), so the two stay in step. */
const PROGRAM_HREFS = ['/programs/youthwide/', '/programs/jobready-campus/', '/programs/jobready-work/', '/programs/nu-postgraduate-diploma/', '/programs/superkids/'] as const;

function navLink(href: string): NavLink {
  const item = navGroups.flatMap((g) => g.items).find((i) => i.href === href);
  if (!item) throw new Error(`heroSlides: no navigation entry for ${href}`);
  return item;
}

/** Slide 7 names the NU Postgraduate Diploma for individual learners and states admissions' eligibility sentence (NU-01) as the menu does (WP27); the menu's lead-in is "Eligibility:", the slide's is its audience. */
const NU_SLIDE_HREF = '/programs/nu-postgraduate-diploma/';
function slideLink(href: string): NavLink {
  const item = navLink(href);
  return href === NU_SLIDE_HREF ? { ...item, description: `For individual learners: ${NU_ELIGIBILITY}.`, factIds: ['NU-01'] } : item;
}

/** The before-training figure of a survey fact (stat.from), for a caption such as "up from 47.4% before training". */
function before(f: Fact): string {
  const from = f.stat?.from;
  if (!from) throw new Error(`heroSlides: ${f.id} has no stat.from`);
  return from;
}

const discovery = cta('discovery');

/** The trial's employment effect, read from the register so no figure is typed here. */
const offeredPoints = fact('RC-02').stat?.numeric;
const hours = /was (\d+) hours/.exec(fact('RC-07').text)?.[1];
/** The trial's estimated income difference for all women offered a place (RC-01's tile), stated before the attenders' figure. */
const incomeOffered = fact('RC-01').stat?.numeric;
/** The same women's estimated gain in dollars a month (RC-04's tile, "+$27"), stated beside the percentage on the first slide. */
const dollarsOffered = fact('RC-04').stat?.numeric;
if (offeredPoints === undefined || !hours || incomeOffered === undefined || dollarsOffered === undefined) throw new Error('heroSlides: RC-01, RC-02, RC-04 or RC-07 no longer carries the figure a slide reads');
/**
 * The trial slide's ">4×" tile is RC-06a's value; its caption (WP50, cycle-25 review) says the multiple in words, "More than four times the average employment effect across nine vocational-training trials.", and states neither the +10.3 nor
 * the 2.3 (the hero's trial card states the +10.3, the Independent Evaluation page the nine-trial comparison). The caption is the slide's own: RC-06a's tile label and glance label are unchanged. The build stops if the tile stops reading ">4×".
 */
if (fact('RC-06a').stat?.value !== '>4×') throw new Error('heroSlides: RC-06a no longer has the tile value ">4×"; update the caption of the trial slide ("More than four times ...")');
/** Her Power's tracked base and in-work share, read from PR-05 ("372 of 800 tracked women ... in work (47%)"). */
const herPower = /of (\d+) tracked women.*\((\d+)%\)/.exec(fact('PR-05').text);
if (!herPower) throw new Error('heroSlides: PR-05 no longer reads "... of N tracked women ... (P%)"');
/**
 * WP51 (cycle-26 review, Grok M1): Her Power's line on the program-results slide carries the base the Impact and Governments tiles state, in PR-05's words ("tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%"):
 * "... tracked women in work (2,500 trained directly)." The number is read from the label, never retyped; the build stops if the label stops reading that way. The fuller wording ("..., from the 2,500 trained directly by CodersTrust.", or the
 * case cards' "among the 2,500 women CodersTrust trained directly", WP47) takes a second line at 1280 px, which makes this slide 18 px taller than "Find Your Program" and leaves the other slides 57 px unused (the limit is 48,
 * tests/hero-slider.spec.ts); the UNDP YES line already takes two lines, and the WSDFM line is one line at 1280, so shortening its parenthesis would not have helped.
 * WP52 (cycle-27 review, Grok M1): the base is set apart by a semicolon, "... tracked women in work; 2,500 trained directly." (see PR_TEXT.herPower), so the parenthesis cannot be read as 47% of the 2,500; same number, same guard, same one row.
 */
const herPowerDirect = /^tracked women, from the ([\d,]+) trained directly by CodersTrust, in work: \d+%$/.exec(fact('PR-05').stat?.label ?? '')?.[1];
if (!herPowerDirect) throw new Error('heroSlides: PR-05 label no longer reads "tracked women, from the N trained directly by CodersTrust, in work: P%"');
/**
 * The reach slide's one line (WP36): SC-03's own detail, "Bangladesh plus 14 other countries and territories; most delivery has been in Bangladesh." The 130,000+ is the hero's reach card, so the slide does not state it again.
 * WP45 (cycle-21 review): the heading states the figure ("Programs in 15 Countries and Territories", SC-03's stat value, never typed here), so the slide no longer carries SC-03's tile as well: the same "15" would sit twice in the same few lines.
 */
const reachDetail = fact('SC-03').stat?.detail;
if (!reachDetail || !/^Bangladesh plus \d+ other countries and territories; most delivery has been in Bangladesh\.$/.test(reachDetail)) throw new Error('heroSlides: SC-03 detail no longer reads "Bangladesh plus N other countries and territories; most delivery has been in Bangladesh."');
const reachCount = fact('SC-03').stat?.value;
if (!reachCount || !/^\d+$/.test(reachCount)) throw new Error('heroSlides: SC-03 value no longer reads as a plain count of countries and territories');
/**
 * GV-12 reads "Six government contracts with training and curriculum work scoped for 31,200+ people; official training partner of Bangladesh’s National University for
 * digital career skills and credentials, onboarding 1.5M+ learners" (WP31: the National University relationship is worded as SC-04 words it, on every page).
 * WP47 (cycle-22 review): "work scoped for" where it read "scopes covering", which could be read as people served.
 */
const governmentScope = /^(Six government contracts with training and curriculum work scoped) for ([\d,]+\+ people); (official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding [\d.]+M\+ learners)$/.exec(fact('GV-12').text);
if (!governmentScope) throw new Error('heroSlides: GV-12 no longer reads "Six government contracts ... work scoped for N+ people; official training partner of ... onboarding N+ learners"');
/**
 * WP45 (cycle-21 review): the contracts' 31,200+ is contract scope and includes Her Power's national program, so the slide says it in GV-12's own tile note (the glance note the Impact and Governments pages print) instead of the shorter
 * "(contract scope, not people trained)", which left the 25,125 women Her Power trained unsaid. Read from the register, never retyped.
 * WP46 (cycle-22 review): the note now also says "CodersTrust trained 2,500 women directly" (GV-11 and GV-13), so "25,125 women trained" cannot be read as CodersTrust's own count.
 * WP48 (cycle-23 review): the slide packed four things into one passage (the contract scope, the national program, direct delivery and the National University onboarding), so it keeps only the note's first clause, "contract scope, not a count
 * of completers", which is what keeps the 31,200+ true; the rest of the note stays on the Impact and Governments tiles. The clause is read from the note, never retyped, and the build stops if the note stops opening with it.
 * The note itself now reads "The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly." (WP48, cycle-23 review; it was "The total is contract scope, ...;
 * it includes Her Power's national program, which trained 25,125 women; ...").
 */
const governmentNote = fact('GV-12').stat?.glance?.note;
const contractScope = /^The figure is (contract scope, not a count of completers)\./.exec(governmentNote ?? '')?.[1];
if (!contractScope) throw new Error('heroSlides: GV-12 glance note no longer opens "The figure is contract scope, not a count of completers. ..."');
if (!fact('OC-05').stat?.value) throw new Error('heroSlides: OC-05 no longer carries the figure the speed slide shows (its tile; the heading does not state it, WP41)');
if (!fact('OC-03').stat?.value || !fact('OC-03').stat?.from) throw new Error('heroSlides: OC-03 no longer carries the figure and its before-training comparison the income slide shows');
/** UNDP YES, Korail reports a different measure from the others: the share of the 350 trained who found their first job within three months (PR-03), not the share in work. */
const firstJob = /^of the (\d+) trained found their first job within three months$/.exec(fact('PR-03').stat?.label ?? '');
if (!firstJob) throw new Error('heroSlides: PR-03 label no longer reads "of the N trained found their first job within three months"');
/** Kosovo's base (PR-02's stat value, "102 of 150") closes its line, as Her Power's "of 800 tracked women" and UNDP YES's "of the 350 trained" do (WP36, cycle-13 review: each result names its base). */
const kosovoBase = fact('PR-02').stat?.value;
if (!kosovoBase || !/^\d+ of \d+$/.test(kosovoBase)) throw new Error('heroSlides: PR-02 value no longer reads "N of M"');
/**
 * WSDFM's program-record result, the fourth program on the program-results slide (WP50, cycle-25 review: Impact says "Four Programs" and so does Case Studies). Read from PR-01 as Kosovo's line is: the label ("WSDFM: 71% in work")
 * and the base from its value ("711 of 1,000"). The line carries the Home case card's qualifier ("program records, not trial data", src/components/pages/home/caseStudies.ts), because the slide before the program results is the
 * randomized trial of the same predecessor program (RC-01), and it is kept to one line at 1280 px: the slide may not be taller than "Find Your Program", or every other slide leaves more than 48 px unused below its content
 * (tests/hero-slider.spec.ts). The program's full name, which would need a second line, is on the Proof in Practice card below.
 */
const wsdfmLabel = fact('PR-01').stat?.label ?? '';
const wsdfmBase = fact('PR-01').stat?.value;
if (!/^WSDFM: \d+% in work$/.test(wsdfmLabel) || !wsdfmBase || !/^[\d,]+ of [\d,]+$/.test(wsdfmBase)) throw new Error('heroSlides: PR-01 no longer has the label "WSDFM: P% in work" and a value "N of M"');
const PR_TEXT = {
  wow: `${fact('PR-02').stat?.label} (${kosovoBase}).`,
  wsdfm: `${wsdfmLabel} (${wsdfmBase}; program records, not trial data).`,
  yes: `UNDP YES, Korail: ${fact('PR-03').stat?.value} of the ${firstJob[1]} trained found a first job within three months.`,
  // WP52 (cycle-27 review, Grok M1): "... tracked women in work; 2,500 trained directly." (the parenthesis "(2,500 trained directly)" could be read as 47% of the 2,500: the 800 tracked women are the base of the 47%, and the 2,500 is a separate fact, set apart by
  // the semicolon). The review's wording, "...; 2,500 women trained directly.", is 644 px wide against the 594 px the row has at 1280 px (this line is 579 px; the old one 588), so it wrapped and made the slide taller than "Find Your Program"; "women"
  // is already in "tracked women", so it is left out of the second clause to keep the line on one row (tests/wp51.spec.ts and tests/hero-slider.spec.ts hold the budget).
  herPower: `Her Power: ${herPower[2]}% of ${herPower[1]} tracked women in work; ${herPowerDirect} trained directly.`,
};

/** The survey card's caption: OC-01's tile label. (WP35 added "in Bangladesh"; reverted until the owner confirms the survey's country scope — OC-09 gives districts, not an all-Bangladesh sample.) */
const surveyLabel = fact('OC-01').stat?.label ?? '';
if (!surveyLabel.includes('among surveyed completers')) throw new Error('heroSlides: OC-01 label no longer says "among surveyed completers"; update the hero survey caption');
const surveyCaption = surveyLabel;

/** The stable home hero. */
export const HOME_HERO = {
  title: HEADLINE.home,
  lead: VALUE_PROPOSITION.home,
  audience: [
    { label: 'Development Partners', href: '/partner-with-us/development-partners/' },
    { label: 'Governments', href: '/partner-with-us/governments/' },
    { label: 'Foundations', href: '/partner-with-us/foundations/' },
    { label: 'Investors', href: '/partner-with-us/investors/' },
  ],
  primary: { label: discovery.label, href: discovery.href },
  secondary: { label: 'See the Evidence', href: '/impact/' },
  photo: 'general/kosovo-woman-training', // WP30b: a training room in Kosovo (owner direction 2026-10-14); the carousel below it keeps its own photographs
  /** The three proof cards: the trial, the survey, the scale. A card's own `value` and `caption` replace the register's stat value and label. */
  proof: [
    {
      eyebrow: 'Randomized Trial',
      factId: 'RC-02',
      value: `+${offeredPoints}`,
      unit: 'percentage points',
      // WP50 (cycle-25 review): "10.3 more", RC-02's own figure, which is the "+10.3" directly above the caption (it read "about 10 more", RC-02 rounded; the Independent Evaluation page's [PLAIN-LINE] keeps the rounded reading).
      // scripts/check-facts.mjs derives this caption on its own ([PROOF-CARD]).
      caption: `For every 100 women offered a place in a ${hours}-hour predecessor program, ${offeredPoints} more were in work than in the control group.`,
    },
    { eyebrow: 'Impact Survey 2026', factId: 'OC-01', caption: surveyCaption },
    { eyebrow: 'Reach Since 2014', factId: 'SC-16' },
  ] as { eyebrow: string; factId: string; value?: string; unit?: string; caption?: string }[],
};

export const HOME_SLIDES: HeroSlide[] = [
  {
    id: 'evidence',
    // WP50 (cycle-25 review): the eyebrow carries the qualifier ("Randomized Trial of a Predecessor Program"; it was "Independent Evaluation"), so the heading can be short again. It is this slide's own text (the pill is not the shared evidence tag).
    eyebrow: 'Randomized Trial of a Predecessor Program',
    // WP45 (cycle-21 review): Home states the trial's employment result three times already (the hero's Randomized Trial card, the announcement bar, the ">4×" tile on this slide), so the slide's own finding is the trial's income result
    // (RC-01: an estimated 41% higher, RC-04: about +$27 a month), worded as the register words it, with the predecessor program still named in the sentence (the heading and the figures are the offered-place women's, not today's tracks').
    // WP48 (cycle-23 review, the third reviewer to raise it): the heading named the predecessor program ("... in a Predecessor Program Earned an Estimated 41% More"), where only the lead below it did.
    // WP50 (cycle-25 review): two reviewers wanted it shorter and three had wanted the qualifier, so the heading is "Women Offered a Place Earned an Estimated 41% More" and the qualifier sits in the eyebrow directly above it and in the lead below it ("In the predecessor WSDFM program, ...").
    title: `Women Offered a Place Earned an Estimated ${incomeOffered}% More`,
    titleFacts: ['RC-01'],
    lead: `In the predecessor WSDFM program, their monthly income was an estimated ${incomeOffered}% higher than the control group’s, about +$${dollarsOffered} a month.`,
    leadFacts: ['RC-01', 'RC-04'],
    // WP50 (cycle-25 review): the caption no longer repeats the trial's employment result (+10.3 percentage points), which the hero's trial card states; it says the multiple the tile shows.
    proof: {
      factId: 'RC-06a',
      caption: () => 'More than four times the average employment effect across nine vocational-training trials.',
    },
    links: [{ label: 'See the Trial', href: '/impact/independent-evaluation/', variant: 'primary' }],
    photo: 'general/classroom-girls',
  },
  {
    id: 'government-trust',
    eyebrow: 'Government and University Partners',
    // WP42 (cycle-19 review): second, after the trial and before the survey, because most readers never reach slide 6: the trial, then government scale, then the survey and the program results. Wording unchanged.
    // WP41 (cycle-18 review): the heading counts the contracts ("Six", read from GV-12's own wording, never typed) and says "a" National University partnership, as the Governments page counts "Six Government Contracts".
    // WP51 (cycle-26 review, Grok m5): "... and Bangladesh’s National University" (five reviewers questioned "a National University Partnership", which Grok read as any university): GV-12 names the partner as "Bangladesh’s National University".
    title: `${governmentScope[1].split(' ')[0]} Government Contracts and Bangladesh’s National University`,
    titleFacts: ['GV-12'],
    // WP25h: the contracts' scope is stated as scope, and the National University sentence stays as registered. WP45 (cycle-21 review): the scope is stated in GV-12's own note, the wording Impact and Governments print, in place of
    // "(contract scope, not people trained)". WP46 (cycle-22 review): the note says who trained whom ("The total is contract scope, not a count of completers; it includes Her Power's national program, which trained 25,125 women;
    // CodersTrust trained 2,500 women directly."), so the 25,125 is not read as CodersTrust's; and the last sentence names its subject ("CodersTrust is the official training partner of ..."), where it was a fragment.
    // WP48 (cycle-23 review): the body is two sentences, the contract scope in GV-12's words followed by the clause that keeps it true ("... work scoped for 31,200+ people: contract scope, not a count of completers."), then the National University sentence.
    // The 25,125 and the 2,500 are no longer on the slide, so the lead rests on GV-12 alone (the glance note's clause is GV-12's, as are the contracts and the National University sentence).
    // WP52 (cycle-27 reviews, Claude P1 and GLM m1): two sentences for the contracts, "... work scoped for 31,200+ people. This is contract scope, not a count of completers." (it was one sentence joined by a colon), and "CodersTrust is also the official
    // training partner of ..." for the university (the "also" keeps the two facts from reading as one scale; GV-12's "onboarding 1.5M+ learners" wording is unchanged).
    lead: `${governmentScope[1]} for ${governmentScope[2]}. This is ${contractScope}. CodersTrust is also the ${governmentScope[3]}.`,
    leadFacts: ['GV-12'],
    // WP32 (cycle-9 review): the slide covers the contracts and the National University partnership, so it links both audience pages (the carousel renders every link as a text link, side by side).
    links: [
      { label: 'For Governments', href: '/partner-with-us/governments/', variant: 'primary' },
      { label: 'For Universities', href: '/partner-with-us/universities/', variant: 'secondary' },
    ],
    photo: 'general/nu-affiliation-group',
  },
  {
    id: 'outcomes',
    eyebrow: 'Impact Survey 2026',
    // WP31: said as what surveyed completers report, not as a before-and-after effect.
    // WP39 (cycle-16 review): the heading says the finding and whose it is; the figure and its before-training comparison are the tile's ($245, "up from $82 before training"), so the heading no longer states them a second time.
    title: 'Surveyed Completers Report Higher Income',
    titleFacts: ['OC-03'],
    // No lead (WP31): the heading says whose finding this is, and the tile's caption says it again.
    // WP36 (cycle-13 review): one tile, the income result. The employment result (77.9%) is the hero's survey card directly above the carousel, so the slide does not show it a second time.
    stats: [
      { factId: 'OC-03', caption: (f) => `median monthly income among surveyed completers, up from ${before(f)} before training` },
    ],
    links: [{ label: 'Read the Impact Survey 2026', href: '/impact/outcomes-2026/', variant: 'primary' }],
    photo: 'general/woman-learner-laptop',
  },
  {
    id: 'placement',
    eyebrow: 'Program Records',
    title: 'Results by Program',
    // WP50 (cycle-25 review): four programs, in the order of the Impact page and the case studies (Kosovo first). WP35 had left WSDFM out (read beside the trial's 63.1% its 71% looked like a second result for the same program); its line is back
    // with the case card's qualifier, "program records, not trial data".
    // WP52 (cycle-27 review, Kimi M1): "Four delivered programs, ..." (it said "Four programs, ...", which clashed with the Programs page's "four partner programs ... and the NU Postgraduate Diploma", a different four; these are the delivered programs whose own records give the results).
    // The review's wording ended "... from their own program records."; that is 683 px against the 626 px the lead has at 1280 px (the old line was 610 px), so it wrapped and made this the tallest slide, 14 px taller than "Find Your Program", which left every
    // other slide 55 px unused (the limit is 48, tests/hero-slider.spec.ts). "Program" is left out of "records" (615 px; the eyebrow says "Program Records" and the WSDFM line says "program records, not trial data").
    lead: 'Four delivered programs, each with its partner, with results from their own records.',
    lines: [
      { text: PR_TEXT.wow, factIds: ['PR-02'] },
      { text: PR_TEXT.wsdfm, factIds: ['PR-01'] },
      { text: PR_TEXT.yes, factIds: ['PR-03', 'PR-06'] },
      { text: PR_TEXT.herPower, factIds: ['PR-05'] },
    ],
    links: [{ label: 'See the Case Studies', href: '/impact/case-studies/', variant: 'primary' }],
    photo: 'general/yes-trainees-group',
  },
  {
    id: 'fast-to-earning',
    eyebrow: 'Impact Survey 2026',
    // WP36 and WP38 (cycle-13 and cycle-15 reviews) worded the heading as the figure plus its base ("58.8% of Completers Who Started Earning Began Within Six Months"). WP41 (cycle-18 reviews): the heading is the finding alone,
    // "First Earnings Within Six Months", with no percentage; the tile carries the 58.8% with its base (the 170 surveyed completers who first earned during or after training), and the eyebrow ("Impact Survey 2026") and the tile
    // name the surveyed completers. WP43 (cycle-20 review): no lead; the sentence under the heading ("Among surveyed completers who first earned during or after training, most started within six months.") said what the heading
    // and the tile already say, so the slide is its heading, the tile with its full base, and the evidence link.
    // WP45 (cycle-21 review): "Most First Earnings Came Within Six Months" says it is a majority of the survey's first earnings (58.8% of the 170 surveyed completers who first earned during or after training), not a promise that earnings begin within six months.
    // WP46 (cycle-22 review, owner answer 2026-10-15): the six months are counted from the END of the course, so the heading says so ("... of the Course Ending"); the tile's caption (OC-05's label) says "of finishing the course".
    // WP48 (cycle-23 review, a logic error WP46 introduced): OC-05 is cumulative and includes the 23.5% who first earned DURING the course, who cannot have started "within six months of the course ending"; the heading says what the figure counts,
    // "Most Had Started Earning by Six Months After the Course", and the tile's caption (OC-05's label) says "had started earning by six months after finishing the course".
    // WP51 (cycle-26 review): the heading names the subgroup, in the register's own term for it (OC-05's label: "the 170 surveyed new earners"): "Most Surveyed New Earners Were Earning by Six Months After the Course" (still cumulative: "by ... after").
    title: 'Most Surveyed New Earners Were Earning by Six Months After the Course',
    titleFacts: ['OC-05'],
    // WP52 (cycle-27 review): the caption defines the term where the 58.8% appears ("... of the 170 surveyed new earners (completers who first earned during or after training) had started earning by six months after finishing the course (October 2026 survey)"),
    // so the figure is not read as a share of all completers. The caption is OC-05's label with the definition inserted (defineNewEarners); the register's label is unchanged.
    stats: [{ factId: 'OC-05', caption: (f) => defineNewEarners(f.stat?.label ?? '') }],
    links: [{ label: 'See When Completers First Earn', href: '/impact/outcomes-2026/', variant: 'primary' }],
    photo: 'general/lab-women-screen',
  },
  {
    id: 'scale',
    eyebrow: 'Reach at Scale', // WP30c (cycle-7 review, GLM): the slide states reach (people trained), which is an output, not impact
    // WP36 (cycle-13 review): the hero's "Reach Since 2014" card states the 130,000+ and the 15 countries and territories, so this slide points to where the programs ran and carries SC-03's detail line only.
    // WP45 (cycle-21 review): the heading states the finding and its figure ("Programs in 15 Countries and Territories", SC-03), so the SC-03 tile of WP38 is gone: it said the same "15" a second time.
    title: `Programs in ${reachCount} Countries and Territories`,
    titleFacts: ['SC-03'],
    lead: reachDetail,
    leadFacts: ['SC-03'],
    links: [{ label: 'Explore Global Reach', href: '/impact/global-reach/', variant: 'primary' }],
    photo: 'general/albania-trainees-group', // WP21: a photograph from one of the programs abroad; the madrasah photograph is no longer a placement for this slide
  },
  {
    id: 'programs',
    eyebrow: 'Our Programs',
    title: 'Find Your Program',
    // No lead: the title and the five program links say it, and a lead would make this the tallest slide by more than the layout test allows (WP19).
    programs: PROGRAM_HREFS.map(slideLink),
    links: [{ label: 'Explore Programs', href: '/programs/', variant: 'primary' }],
    photo: 'general/computer-lab-rows',
  },
];
