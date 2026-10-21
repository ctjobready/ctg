import { fact, type Fact } from './facts';
import { CONTRACT_FIGURES, CONTRACT_TOTAL_NOTE, HEADLINE, NU_NOT_TRAINED, TRIAL_WOMEN, VALUE_PROPOSITION } from './copy';
import { cta } from '../lib/mailto';

/**
 * The home hero (WP17, hybrid) and the "Results" carousel below it (WP13, WP13b; headed "Results and Programs" until WP53; rendered by src/components/sections/HeroSlider.astro,
 * driven by src/scripts/heroSlider.ts). Every figure is read from the facts register at build time (fact(id).stat, or <Fact> for a register
 * sentence); no number is typed here.
 * HOME_HERO is the stable hero: the page's only h1, one value proposition, one primary action, one text link, the audience links and the three
 * strongest proof cards, always visible. HOME_SLIDES are the carousel slides (WP19, item 7; four since WP53, owner decision 2026-10-16): the trial first, then (WP42, cycle-19 review) the government contracts and the National University partnership,
 * then the Impact Survey 2026 (income, with the timing of first earnings as one body line), then the results by program (named programs).
 * Each slide has one cleared photograph from the registry (src/data/photos.ts, D13 rows in src/data/permissions.json); the hero's is eager, the carousel's lazy.
 * Titles and eyebrows are Title Case (src/lib/titleCase.mjs) and carry no trailing period (WP23). Every carousel slide title is an h2.
 * WP23: the survey slides state their figure in the heading (read from the register, with titleFacts naming the facts); the trial slide gives
 * the offered-place employment and income results; the placement slide lists all four case-study programs.
 * WP25h: the program-results slide is headed "Results by Program" and says each program reports its own records; UNDP YES, Korail is stated
 * with its own measure (67% found a first job within three months, never "in work"; PR-03).
 * WP31 (cycle-8 reviews): the trial slide states the offered-place results only (two sentences); the survey-income slide is headed as what surveyed completers
 * report and had no lead (WP53: it has one body line, OC-05's timing); the last slide was "Find Your Program" (WP53: gone; the last slide is "Results by Program").
 * WP35 (cycle-12 review): the program-results slide no longer lists WSDFM (its 71% in work is program records, and read beside the trial's 63.1% it looked like a second result for the same
 * program; the case card and the case study keep it), so it lists three programs; the survey proof card on the hero says in its caption that the survey is of surveyed completers in Bangladesh
 * (OC-09: 58 of 64 districts). The caption, not the eyebrow, carries it: "Impact Survey 2026 in Bangladesh" wraps to two lines in the three-column range (768 to about 950 px) and pushes that card's figure out of line.
 * WP36 (cycle-13 reviews): the Home page states each figure once. The income slide has one tile (the 78.2% employment result is the hero's survey card), and the reach slide ("Explore Where Our Programs Have Run")
 * carries SC-03's detail line only (the 130,000+ and the 15 countries and territories are the hero's reach card). The program-results slide names the base of every result (Kosovo "(102 of 150)", UNDP YES
 * "of the 350 trained", Her Power "of 800 tracked women"), and the speed slide says "surveyed completers", the term the survey page and the register use.
 * WP38 (cycle-15 review): the reach slide has a figure again, SC-03's "15" with its caption ("countries and territories with CodersTrust programs"), and the speed slide's heading leads with its figure and then names the base.
 * WP39 (cycle-16 review): the income slide is headed "Surveyed Completers Report Higher Income"; the $245 and its "up from $98 before training" comparison are its tile alone (OC-03), not the heading too.
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
 * WP53 (owner decision 2026-10-16, "Trim it": the cycle-27 Claude proposal): the carousel is four slides, not seven. The reach slide ("Programs in 15 Countries and Territories") and the programs slide ("Find Your Program") are deleted (the reach figure
 * stays in the hero's "Proof at a Glance" strip; the Programs menu, the role router and the Programs page cover the programs), and the two Impact Survey slides are one: the income slide ("Surveyed Completers Report Higher Income", with its $245 tile) takes the
 * timing slide's finding as one body line (OC-05 with its defined base; see surveyTiming). The notes above about the speed, reach and programs slides are the history of wording that is gone, or that the survey slide's line inherits.
 * WP54 (cycle-28 reviews, Claude S23 and GLM L1): the survey slide's body line leads with its base ("Of the 172 surveyed completers who first earned during or after training, 58.7% had started earning by six months after finishing the course."),
 * so the slide no longer uses the register's term "surveyed new earners" or defines it in brackets (the Impact tile still does); and the slide shows its income tile directly under the heading, before that line (`statsFirst`).
 * WP54 (cycle-28 review, Grok R2): the trial slide's ">4×" callout reads "Employment effect: more than four times the 2.3-point average across nine vocational-training trials." (it read "More than four times the average employment effect across nine
 * vocational-training trials.", which sat under an income heading without saying what was compared; see trialMultiple).
 * WP62 (cycle-34 reviews): the trial slide's heading ends "per Month" ("Women Offered a Place Earned an Estimated 41% More per Month": RC-01's 41% is a monthly income difference); the hero's reach card ("Reach Since 2014") no longer repeats "since 2014" in its caption (reachCaption).
 * WP64 (cycle-36 reviews): the government slide's heading is "Six Government Contracts and a National University Partnership" (four of six models; it named Bangladesh in the heading of a global page; the body still names the National University); the program-results
 * lead is "Results from the records of four programs." (Impact counts five delivered programs, Albania among them, which has no outcome figure, so "Four delivered programs" read as a contradiction); the trial slide's lead says "about $27 more a month" (it said "about +$27 a month").
 * Order: the randomized trial, the government contracts and the National University, the survey, the results by program.
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
  /**
   * Show the figure tiles directly under the heading, before the lead (WP54, cycle-28 review, GLM L1: on the survey slide the 58.8% sentence came first under "Surveyed Completers Report Higher Income", a heading about income, which invited
   * the percentage to be quoted as the slide's income result). The order is the document order too, not a visual reordering.
   */
  statsFirst?: boolean;
  /** One figure on a Klein-blue band (the evidence proof): a card over the photograph on desktop, under it on phones. */
  proof?: HeroSlideStat;
  links?: HeroSlideLink[];
  /** First slide only: audience links above the heading. */
  audience?: { label: string; href: string }[];
  /** Key of the photograph registry (src/data/photos.ts, photo()). */
  photo: string;
}

/** The before-training figure of a survey fact (stat.from), for a caption such as "the median before training was $98". */
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
 * The trial slide's ">4×" tile is RC-06a's value; its caption (WP50, cycle-25 review) said the multiple in words, "More than four times the average employment effect across nine vocational-training trials.", and stated neither the +10.3 nor
 * the 2.3 (the hero's trial card states the +10.3, the Independent Evaluation page the nine-trial comparison). The caption is the slide's own: RC-06a's tile label and glance label are unchanged. The build stops if the tile stops reading ">4×".
 * WP54 (cycle-28 review, Grok R2): the callout sits under the heading about income, so it names what is compared and the average it is compared with: "Employment effect: more than four times the 2.3-point average across nine vocational-training
 * trials." The average is read from RC-06a's glance label ("... was more than four times the 2.3-point average across nine vocational-training trials"), never typed; it is an average of nine trials, never "typical". The build stops if the label changes shape.
 * WP59 (cycle-31 review, Kimi K3; flagged in earlier cycles too): the callout reads apart from its +10.3 base, so it states it: "Employment effect: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials." The +10.3 is RC-02's
 * value (offeredPoints, the figure the hero's trial card shows), and the build stops unless RC-06a's own text states the same figure ("Women offered a place were 10.3 percentage points more likely to be employed, more than four times the average ..."). The tile and its data-fact (RC-06a) are unchanged.
 * The longer caption is a third line in the card at 1280 px, where the card sits over the photograph (no change to the slide's height), and a third line under the photograph at 390 px, where the photograph gives up that height (the region's height is the tallest slide's, unchanged).
 */
if (fact('RC-06a').stat?.value !== '>4×') throw new Error('heroSlides: RC-06a no longer has the tile value ">4×"; update the caption of the trial slide ("Employment effect: more than four times ...")');
const nineTrialAverage = /more than four times the ([\d.]+-point average across nine vocational-training trials)$/.exec(fact('RC-06a').stat?.glance?.label ?? '')?.[1];
if (!nineTrialAverage) throw new Error('heroSlides: RC-06a’s glance label no longer ends "more than four times the N-point average across nine vocational-training trials"; update the callout of the trial slide');
if (!fact('RC-06a').text.includes(`${offeredPoints} percentage points more likely to be employed`)) throw new Error('heroSlides: RC-06a no longer states the employment effect RC-02 states ("N percentage points more likely to be employed"); update the callout of the trial slide');
const trialMultiple = `Employment effect: +${offeredPoints} percentage points, more than four times the ${nineTrialAverage}.`;
/** Her Power's tracked base and in-work share, read from PR-05 ("372 of 800 tracked women ... in work (47%)"). */
const herPower = /of (\d+) tracked women.*\((\d+)%\)/.exec(fact('PR-05').text);
if (!herPower) throw new Error('heroSlides: PR-05 no longer reads "... of N tracked women ... (P%)"');
/** The count and its base as the register states them ("372 of 800"): the slide's line leads with it (WP58, cycle-30 review, Grok R3), so "47%" is not read as a share of something else. */
const herPowerTracked = fact('PR-05').stat?.value;
if (!herPowerTracked || !/^[\d,]+ of [\d,]+$/.test(herPowerTracked) || !herPowerTracked.endsWith(` of ${herPower[1]}`)) throw new Error('heroSlides: PR-05 stat value no longer reads "N of M" with the base (M) its text names ("... of M tracked women")');
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
 * GV-12 reads "Six government contracts with training and curriculum work scoped for 31,200+ people; official training partner of Bangladesh’s National University for
 * digital career skills and credentials, onboarding 1.5M+ learners" (WP31: the National University relationship is worded as SC-04 words it, on every page).
 * WP47 (cycle-22 review): "work scoped for" where it read "scopes covering", which could be read as people served.
 */
const governmentScope = /^(Six government contracts with training and curriculum work scoped) for ([\d,]+\+ people); official training partner of Bangladesh’s National University (for digital career skills and credentials), (onboarding [\d.]+M\+ learners)$/.exec(fact('GV-12').text);
if (!governmentScope) throw new Error('heroSlides: GV-12 no longer reads "Six government contracts ... work scoped for N+ people; official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding N+ learners"');
/**
 * WP59 (cycle-31 review, GLM L1): "onboarding 1.5M+ learners" (the owner-confirmed wording of GV-12) carried no separation note on Home, as the Universities and Investors pages' notes have ("... the learners being onboarded; they are not learners trained by CodersTrust"; SC-04: "not counted in the delivered reach").
 * The slide keeps the wording and adds the shortest qualifier from that note, in brackets after it: "... onboarding 1.5M+ learners (National University’s learners, not learners trained by CodersTrust)." It rests on SC-04 ("1.5M+ National University learners in the onboarding pipeline"), which the build checks and the lead's data-fact lists.
 */
if (!fact('SC-04').text.startsWith('1.5M+ National University learners in the onboarding pipeline')) throw new Error('heroSlides: SC-04 no longer opens "1.5M+ National University learners in the onboarding pipeline"; update the National University qualifier of the government slide');
// WP60 (cycle-32 reviews, Grok R4 and GPT-6.1 Sol G1): the clause that keeps the 1.5M+ apart from CodersTrust's own learners is NU_NOT_TRAINED (src/data/copy.ts), which the JobReady Platform page's "In the Pipeline" tile reads too. The slide said it in a sentence of its own
// ("They are National University’s own learners, not learners trained by CodersTrust."), no longer in brackets after "onboarding 1.5M+ learners".
// WP61 (cycle-33 review, GPT-6.1 Sol G1): the clause closes the National University sentence ("... CodersTrust is onboarding 1.5M+ learners, the university’s own learners, not learners trained by CodersTrust."), so the slide is three sentences.
/**
 * WP45 (cycle-21 review): the contracts' 31,200+ is contract scope and includes Her Power's national program, so the slide says it in GV-12's own tile note (the glance note the Impact and Governments pages print) instead of the shorter
 * "(contract scope, not people trained)", which left the 25,125 women Her Power trained unsaid. Read from the register, never retyped.
 * WP46 (cycle-22 review): the note now also says "CodersTrust trained 2,500 women directly" (GV-11 and GV-13), so "25,125 women trained" cannot be read as CodersTrust's own count.
 * WP48 (cycle-23 review): the slide packed four things into one passage (the contract scope, the national program, direct delivery and the National University onboarding), so it keeps only the note's first clause, "contract scope, not a count
 * of completers", which is what keeps the 31,200+ true; the rest of the note stays on the Impact and Governments tiles. The clause is read from the note, never retyped, and the build stops if the note stops opening with it.
 * The note itself now reads "The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly." (WP48, cycle-23 review; it was "The total is contract scope, ...;
 * it includes Her Power's national program, which trained 25,125 women; ...").
 */
/*
 * WP57 (cycle-29 review, Grok R2, with Gemini GM1): the slide says the total includes Her Power's national program again, in CONTRACT_TOTAL_NOTE ("The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women
 * trained)."; src/data/copy.ts reads the 25,125 from GV-01 and guards the clause against the register), which the Governments tile prints too. It replaces the WP48/WP52 sentence "This is contract scope, not a count of completers.", which left the 25,125 unsaid.
 */
/**
 * The survey slide's timing line (WP53, owner decision 2026-10-16; reworded in WP54, cycle-28 reviews, Claude S23 and GLM L1): OC-05's finding as one sentence that leads with its base, in the words of OC-05's own text:
 * "Of the 172 surveyed completers who first earned during or after training, 58.7% had started earning by six months after finishing the course."
 * (WP53 had "58.8% of the 170 surveyed new earners (completers who first earned during or after training) had started earning ...", which opened with the percentage and defined the register's term in brackets; this sentence needs no term.)
 * Read from the register, never retyped: the count and the base come from OC-05's text ("Among the 172 surveyed completers who first earned during or after training: ..."), the figure from its stat value, and the closing clause from its stat label,
 * without the label's "(October 2026 survey)" (the slide's eyebrow says "Impact Survey 2026"). The build stops if the text, the value or the label changes shape.
 */
const timing = fact('OC-05');
const timingBase = /^Among the (\d+) (surveyed completers who first earned during or after training):/.exec(timing.text);
const timingClause = /^of the (\d+) surveyed new earners (had started earning by six months after finishing the course) \(October 2026 survey\)$/.exec(timing.stat?.label ?? '');
if (!timingBase || !timingClause || timingBase[1] !== timingClause[1] || !timing.stat || !/^\d+(?:\.\d+)?%$/.test(timing.stat.value)) {
  throw new Error('heroSlides: OC-05 no longer reads "Among the N surveyed completers who first earned during or after training: ..." with a percentage value and the label "of the N surveyed new earners had started earning by six months after finishing the course (October 2026 survey)"; update the timing line of the survey slide');
}
const surveyTiming = `Of the ${timingBase[1]} ${timingBase[2]}, ${timing.stat.value} ${timingClause[2]}.`;
if (!fact('OC-03').stat?.value || !fact('OC-03').stat?.from) throw new Error('heroSlides: OC-03 no longer carries the figure and its before-training comparison the income slide shows');
/** UNDP YES, Korail reports a different measure from the others: the share of the 350 trained who found their first job within three months (PR-03), not the share in work. */
const firstJob = /^of the (\d+) trained found their first job within three months$/.exec(fact('PR-03').stat?.label ?? '');
if (!firstJob) throw new Error('heroSlides: PR-03 label no longer reads "of the N trained found their first job within three months"');
/** Kosovo's base (PR-02's stat value, "102 of 150") closes its line, as Her Power's "of 800 tracked women" and UNDP YES's "of the 350 trained" do (WP36, cycle-13 review: each result names its base). */
const kosovoBase = fact('PR-02').stat?.value;
if (!kosovoBase || !/^\d+ of \d+$/.test(kosovoBase)) throw new Error('heroSlides: PR-02 value no longer reads "N of M"');
/**
 * WSDFM's program-record result, the fourth program on the program-results slide (WP50, cycle-25 review: Impact says "Four Programs" and so does Case Studies). Read from PR-01 as Kosovo's line is: the label ("WSDFM: 71% in work")
 * and the base from its value ("711 of 1,000"). The line carries the Home case card's qualifier ("program records, not trial data", src/components/pages/home/caseStudies.ts), because the first slide is the
 * randomized trial of the same predecessor program (RC-01), and it is kept to one line at 1280 px so the slide does not grow and leave the other slides more than 48 px unused below their content (tests/hero-slider.spec.ts; the "Find Your Program"
 * slide that used to set the carousel's height is gone, WP53, and this slide's copy is now the tallest). The program's full name, which would need a second line, is on the Proof in Practice card below.
 */
const wsdfmShare = /^WSDFM: (\d+%) in work$/.exec(fact('PR-01').stat?.label ?? '')?.[1];
const wsdfmBase = fact('PR-01').stat?.value;
if (!wsdfmShare || !wsdfmBase || !/^[\d,]+ of [\d,]+$/.test(wsdfmBase)) throw new Error('heroSlides: PR-01 no longer has the label "WSDFM: P% in work" and a value "N of M"');
const PR_TEXT = {
  wow: `${fact('PR-02').stat?.label} (${kosovoBase}).`,
  // WP60 (cycle-32 review, Claude S4; owner answer 2026-10-20, "The BIGD study only studied 833"): "(711 of 1,000; program records; trial studied 833)." says how the 711 of 1,000 relates to the trial, whose count is RC-07's 833 (TRIAL_WOMEN, src/data/copy.ts). It replaces "...; program records, not trial data)".
  // The review's form, "...; program records; the trial studied 833).", is 609 px against the 594 px the row has at 1280 px, so it wrapped and made this slide 30 px taller, which left slides 1 to 3 at 57, 57 and 50 px unused (the limit is 48); "the" is the word left out (577 px).
  // Measured at 1280 px, one row: "program records; trial studied 833" 577 px; "program records; the trial had 833" 577 px; "program records; trial: 833 women" 580 px; "program records, not the trial’s 833" 586 px. Wrapped: "program records; the trial studied 833" 609 px; "program records; trial of 833 women" 597 px;
  // "program records; trial studied 833 women" 643 px; "program records, not the 833-woman trial" 642 px. At 390 px every form takes two rows, as the old one did.
  // WP63 (cycle-35 review, Kimi K2): "WSDFM: 711 of 1,000 in work (71%); a separate trial studied 833 women." (it said "WSDFM: 71% in work (711 of 1,000; program records; trial studied 833).", three clauses packed into one parenthesis); the count and the share are PR-01's, the 833 RC-07's.
  // The review's wording, "..., from program records; a separate trial studied 833 women.", is 779 px against the 594 px the row has at 1280 px, so it wrapped and made this slide 30 px taller, which left slides 1 to 3 at 57, 57 and 50 px unused (the limit is 48; measured). "from program records" is the clause left out
  // (this line is 588 px, one row): the slide's eyebrow ("Program Records") and its lead ("..., with results from each program’s records.") already say it for all four lines, and "a separate trial" keeps the 711 of 1,000 apart from the trial. At 390 px every form takes several rows.
  wsdfm: `WSDFM: ${wsdfmBase} in work (${wsdfmShare}); a separate trial studied ${TRIAL_WOMEN} women.`,
  yes: `UNDP YES, Korail: ${fact('PR-03').stat?.value} of the ${firstJob[1]} trained found a first job within three months.`,
  // WP52 (cycle-27 review, Grok M1): "... tracked women in work; 2,500 trained directly." (the parenthesis "(2,500 trained directly)" could be read as 47% of the 2,500: the 800 tracked women are the base of the 47%, and the 2,500 is a separate fact, set apart by
  // the semicolon). The review's wording, "...; 2,500 women trained directly.", is 644 px wide against the 594 px the row has at 1280 px (this line is 579 px; the old one 588), so it wrapped and made the slide taller than "Find Your Program"; "women"
  // is already in "tracked women", so it is left out of the second clause to keep the line on one row (tests/wp51.spec.ts and tests/hero-slider.spec.ts hold the budget).
  // WP58 (cycle-30 review, Grok R3): "Her Power: 372 of 800 tracked in work (47%); 2,500 trained directly." (it said "47% of 800 tracked women in work", which reads as 376 of the 800): the count and its base are PR-05's stat value ("372 of 800"), as the other pages state them, and the
  // percentage is the one in PR-05's text, so nothing is retyped; the build stops if the stat value and the text stop naming the same base. The review's wording, "372 of 800 tracked women in work (47%); 2,500 trained directly.", is 624 px wide against the 594 px the row has at 1280 px, so it wrapped
  // and made this slide 30 px taller, which left slide 1 57 px unused (the limit is 48, tests/hero-slider.spec.ts); "women" is the word left out (558.8 px: the Kosovo and WSDFM lines do not say it either, and the other pages say "tracked women").
  herPower: `Her Power: ${herPowerTracked} tracked in work (${herPower[2]}%); ${herPowerDirect} trained directly.`,
};

/** The survey card's caption: OC-01's tile label. (WP35 added "in Bangladesh"; reverted until the owner confirms the survey's country scope — OC-09 gives districts, not an all-Bangladesh sample.) */
const surveyLabel = fact('OC-01').stat?.label ?? '';
if (!surveyLabel.includes('among surveyed completers')) throw new Error('heroSlides: OC-01 label no longer says "among surveyed completers"; update the hero survey caption');
const surveyCaption = surveyLabel;

/**
 * The reach card's caption (WP62, cycle-34 review, Gemini): SC-16's label without its "since 2014". The card's eyebrow is "Reach Since 2014", so the caption "learners trained through 150,000+ enrollments since 2014. ..." said it twice.
 * Read from the register, never retyped: the build stops if the label stops carrying the phrase (the caption would then be the register's label again, and this strip should be reviewed). SC-16's `text`, `stat.label` and glance wording are unchanged.
 */
const reachLabel = fact('SC-16').stat?.label ?? '';
if (!reachLabel.includes(' since 2014')) throw new Error('heroSlides: SC-16 label no longer says "since 2014"; update the caption of the hero reach card');
const reachCaption = reachLabel.replace(' since 2014', '');

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
    { eyebrow: 'Reach Since 2014', factId: 'SC-16', caption: reachCaption },
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
    // WP62 (cycle-34 review, GPT-6.1 Sol and Kimi): "... Earned an Estimated 41% More per Month": the 41% is a monthly income difference (RC-01: "Their monthly income was an estimated 41% higher"; its tile label: "estimated monthly income gain"), which the heading left unsaid.
    title: `Women Offered a Place Earned an Estimated ${incomeOffered}% More per Month`,
    titleFacts: ['RC-01'],
    // WP63 (cycle-35 review, GLM L4): "..., women offered a place had an estimated 41% higher monthly income than the control group, about +$27 a month." (it said "..., their monthly income was an estimated 41% higher than the control group’s, ...", and "their" had no noun
    // before it in the sentence); the figures are RC-01's and RC-04's, read above, and the heading and the data-facts are unchanged.
    // WP64 (cycle-36 review, GLM): "..., about $27 more a month." (it said "..., about +$27 a month.", a sign without a noun); the figure is still RC-04's (dollarsOffered), and RC-04's own text and tile ("+$27") are unchanged.
    lead: `In the predecessor WSDFM program, women offered a place had an estimated ${incomeOffered}% higher monthly income than the control group, about $${dollarsOffered} more a month.`,
    leadFacts: ['RC-01', 'RC-04'],
    // WP50 (cycle-25 review): the caption no longer repeats the trial's employment result (+10.3 percentage points), which the hero's trial card states; it says the multiple the tile shows.
    // WP54 (cycle-28 review, Grok R2): "Employment effect: more than four times the 2.3-point average across nine vocational-training trials." (see trialMultiple); the tile (">4×") and its data-fact are unchanged.
    proof: {
      factId: 'RC-06a',
      caption: () => trialMultiple,
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
    // WP64 (cycle-36 review; GLM, GPT-6.1 Sol, Grok and Kimi, GLM's reason being global positioning): "... and a National University Partnership" (WP51 had "... and Bangladesh’s National University", which put Bangladesh in the heading of a global page). The body below still names
    // "National University" ("As National University’s official training partner ..."), so the partner is named on the slide; the heading's "Six" is still read from GV-12, and the eyebrow, the body, the links and the data-facts are unchanged.
    title: `${governmentScope[1].split(' ')[0]} Government Contracts and a National University Partnership`,
    titleFacts: ['GV-12'],
    // WP25h: the contracts' scope is stated as scope, and the National University sentence stays as registered. WP45 (cycle-21 review): the scope is stated in GV-12's own note, the wording Impact and Governments print, in place of
    // "(contract scope, not people trained)". WP46 (cycle-22 review): the note says who trained whom ("The total is contract scope, not a count of completers; it includes Her Power's national program, which trained 25,125 women;
    // CodersTrust trained 2,500 women directly."), so the 25,125 is not read as CodersTrust's; and the last sentence names its subject ("CodersTrust is the official training partner of ..."), where it was a fragment.
    // WP48 (cycle-23 review): the body is two sentences, the contract scope in GV-12's words followed by the clause that keeps it true ("... work scoped for 31,200+ people: contract scope, not a count of completers."), then the National University sentence.
    // The 25,125 and the 2,500 are no longer on the slide, so the lead rests on GV-12 alone (the glance note's clause is GV-12's, as are the contracts and the National University sentence).
    // WP52 (cycle-27 reviews, Claude P1 and GLM m1): two sentences for the contracts, "... work scoped for 31,200+ people. This is contract scope, not a count of completers." (it was one sentence joined by a colon), and "CodersTrust is also the official
    // training partner of ..." for the university (the "also" keeps the two facts from reading as one scale; GV-12's "onboarding 1.5M+ learners" wording is unchanged).
    // WP57 (cycle-29 review, Grok R2, with Gemini GM1): the second sentence is CONTRACT_TOTAL_NOTE ("The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained)."), so the lead rests on GV-12 and GV-01.
    // WP58 (cycle-30 review, Gemini GM1): the note's parenthesis says who trained whom, "(25,125 women trained; CodersTrust trained 2,500 directly)", so the lead rests on GV-12, GV-01 and GV-11 (CONTRACT_TOTAL_NOTE.facts).
    // WP59 (cycle-31 review, GLM L1): "... onboarding 1.5M+ learners (National University’s learners, not learners trained by CodersTrust)." (NU_LEARNERS_NOTE); the lead also rests on SC-04, which says the 1.5M+ are National University's learners in the onboarding pipeline.
    // WP60 (cycle-32 review, GPT-6.1 Sol G1; raised by three models): the body is four plain sentences with the same facts (it was three, with a semicolon, a nested parenthesis and a bracketed qualifier): "Six government contracts with training and curriculum work scoped for 30,000+ people, not a
    // count of completers. This includes Her Power’s national program: 25,125 women trained nationally, 2,500 directly by CodersTrust. CodersTrust is also the official training partner of ... onboarding 1.5M+ learners. They are National University’s own learners, not learners trained by CodersTrust."
    // The owner-confirmed words "onboarding 1.5M+ learners" (GV-12) and "work scoped for" (WP47) are unchanged; the two Her Power counts are read as CONTRACT_TOTAL_NOTE reads them (CONTRACT_FIGURES, GV-01 and GV-11 with GV-13), so the lead still rests on GV-12, GV-01, GV-11 and SC-04.
    // The Governments tile, Investors and the JobReady Platform page keep CONTRACT_TOTAL_NOTE as it was. tests/hero-slider.spec.ts holds the height budget.
    // WP61 (cycle-33 review, GPT-6.1 Sol G1; "slide 2 still dense"): three sentences, not four. "Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers." stays word for word (the review's "cover training and
    // curriculum scopes for" is the wording the owner replaced on 2026-10-15, WP47, and tests/wp47.spec.ts keeps off every page). Then "Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly." (the review's sentence; "one of the six"
    // keeps WP57's requirement that the 30,000+ visibly include Her Power, which "This includes Her Power’s national program:" carried), and the National University sentence in one: "As National University’s official training partner for digital career skills and credentials,
    // CodersTrust is onboarding 1.5M+ learners, the university’s own learners, not learners trained by CodersTrust." The words come from GV-12 (governmentScope[3] and [4]) and NU_NOT_TRAINED; "onboarding 1.5M+ learners" is unchanged and every data-fact stays.
    lead: `${governmentScope[1]} for ${governmentScope[2]}, not a count of completers. Her Power, one of the six, trained ${CONTRACT_FIGURES.national} women nationally; CodersTrust trained ${CONTRACT_FIGURES.direct} directly. As National University’s official training partner ${governmentScope[3]}, CodersTrust is ${governmentScope[4]}, the university’s own learners, ${NU_NOT_TRAINED}.`,
    leadFacts: [...CONTRACT_TOTAL_NOTE.facts, 'SC-04'],
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
    // WP39 (cycle-16 review): the heading says the finding and whose it is; the figure and its before-training comparison are the tile's ($245, "up from $98 before training"), so the heading no longer states them a second time.
    title: 'Surveyed Completers Report Higher Income',
    titleFacts: ['OC-03'],
    // WP53 (owner decision 2026-10-16, "trim the carousel"): this is now the carousel's one survey slide. It takes over the finding of the former timing slide ("Most Surveyed New Earners Were Earning by Six Months After the Course") as ONE body line, OC-05's
    // 58.7% with its defined base (see surveyTiming), under the heading and above the income tile. The heading, the eyebrow, the $245 tile and the evidence link are unchanged. The body line is the owner's first choice; a second small tile
    // (the component supports two) was the alternative and is not used. The line was the tile's caption before; it is the lead now, so the slide still states 58.7% once.
    // WP54 (cycle-28 reviews, Claude S23 and GLM L1): the order under the heading is the income tile first ($245, "up from $98 before training"), then the timing sentence, which leads with its base ("Of the 172 surveyed completers who first earned
    // during or after training, 58.7% ..."); the heading is about income, and the percentage under it read as the income result. The tile, the sentence, their data-fact attributes and the eyebrow are unchanged; only the order is (statsFirst).
    lead: surveyTiming,
    leadFacts: ['OC-05'],
    statsFirst: true,
    // WP36 (cycle-13 review): one tile, the income result. The employment result (78.2%) is the hero's survey card directly above the carousel, so the slide does not show it a second time.
    // WP67 (cycle-38 review, GPT-6.1 Sol; GLM and Kimi in cycle 37: a recurring misreading of "up from"): the tile's caption states the before-training median as a plain fact ("... the median before training was $98."), where it said
    // "... up from $98 before training". Same fact (OC-03), no "up from"; the $98 is OC-03's stat.from, read from the register, never typed.
    stats: [
      { factId: 'OC-03', caption: (f) => `median monthly income among surveyed completers; the median before training was ${before(f)}.` },
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
    // WP57b (cycle-29 review, GLM L3): "Four delivered programs, with results from each program’s records." (it said "..., each with its partner, with results from their own records.")
    // WP64 (cycle-36 review, Claude): "Results from the records of four programs." (it said "Four delivered programs, with results from each program’s records.", but Impact counts five delivered programs, Albania among them, and Albania has no outcome figure, so the slide's count looked like an omission).
    // The slide still lists four programs, each from its own program records (the eyebrow says "Program Records"); the lead names no more than the lines below it.
    lead: 'Results from the records of four programs.',
    lines: [
      { text: PR_TEXT.wow, factIds: ['PR-02'] },
      { text: PR_TEXT.wsdfm, factIds: ['PR-01', 'RC-07'] },
      { text: PR_TEXT.yes, factIds: ['PR-03', 'PR-06'] },
      { text: PR_TEXT.herPower, factIds: ['PR-05'] },
    ],
    links: [{ label: 'See the Case Studies', href: '/impact/case-studies/', variant: 'primary' }],
    photo: 'general/yes-trainees-group',
  },
];
