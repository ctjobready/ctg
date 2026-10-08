// Generated from planning/05-facts-register.md. Wording is canonical; do not edit without updating the register.
export type CaveatClass = 'S' | 'R' | 'P' | 'E' | 'X';
export interface Source { id: string; label: string; citation: string; url?: string }
export interface StatDisplay { value: string; numeric?: number; decimals?: number; prefix?: string; suffix?: string; from?: string; label: string }
export interface Fact {
  id: string;
  group: 'identity' | 'scale' | 'outcomes' | 'rct' | 'programs' | 'government' | 'partners' | 'design' | 'initiatives' | 'context';
  text: string;
  stat?: StatDisplay;
  caveat?: CaveatClass;
  base?: string;
  note?: string;
  sourceIds: string[];
  rules?: string;
}

export const CAVEATS: Record<CaveatClass, string> = {
  S: `Impact Survey 2026, responding completers (not a random sample); self-reported; before-training status recalled; descriptive, not causal.`,
  R: `BIGD randomized controlled trial of the WSDFM program (women aged 18–35, Dhaka, trained 2020; n = 599 at follow-up, Nov–Dec 2021).`,
  P: `Gross placement among program graduates; not net of what would have happened without training.`,
  E: `CodersTrust estimate/projection, not an official statistic or commitment.`,
  X: `External statistic; cite the named source and year.`,
};

export const sources: Record<string, Source> = {
  IR26: { id: 'IR26', label: 'CodersTrust Impact Report 2026', citation: `CodersTrust Impact Report 2026 (7 Oct 2026), drawing on the CodersTrust Impact Survey, October 2026 (responding alumni).` },
  GD26: { id: 'GD26', label: 'CodersTrust JobReady Platform and YouthWIDE Program', citation: `CodersTrust JobReady Platform and YouthWIDE Program grant deck (8 Oct 2026).` },
  ID26: { id: 'ID26', label: 'CodersTrust Global – Investor Full Deck', citation: `CodersTrust Global – Investor Full Deck (13 Sep 2026); non-financial thesis and traction items only.` },
  BIGD22: { id: 'BIGD22', label: 'BIGD Impact Evaluation Report of the WSDFM Program', citation: `BRAC Institute of Governance and Development (BRAC University), Impact Evaluation Report of the WSDFM Program, May 2022 (randomized controlled trial).` },
  ILOSTAT26: { id: 'ILOSTAT26', label: 'ILOSTAT / ILO GET Youth 2026', citation: `ILOSTAT (UNE_TUNE_SEX_AGE_EDU_NB_A) and ILO, Global Employment Trends for Youth 2026.`, url: 'https://ilostat.ilo.org' },
  BBSLFS24: { id: 'BBSLFS24', label: 'BBS Labour Force Survey 2024', citation: `Bangladesh Bureau of Statistics, Labour Force Survey 2024.` },
  BIDS23: { id: 'BIDS23', label: 'BIDS 2023 tracer study', citation: `Bangladesh Institute of Development Studies (BIDS), 2023 tracer of National University graduates.` },
  WB19NU: { id: 'WB19NU', label: 'World Bank 2019 NU tracer', citation: `World Bank, 2019 tracer study of National University graduates.` },
  MANPOWER26: { id: 'MANPOWER26', label: 'ManpowerGroup Global Talent Shortage Survey 2026', citation: `ManpowerGroup Global Talent Shortage Survey 2026 (39,063 employers, 41 countries).` },
  WEF25: { id: 'WEF25', label: 'WEF Future of Jobs Report 2025', citation: `World Economic Forum, Future of Jobs Report 2025.`, url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/' },
  PWC26: { id: 'PWC26', label: 'PwC 2026 Global AI Jobs Barometer', citation: `PwC, 2026 Global AI Jobs Barometer (to verify).` },
  WB23: { id: 'WB23', label: 'World Bank, Working Without Borders', citation: `World Bank, Working Without Borders, 2023.` },
  MCKENZIE17: { id: 'MCKENZIE17', label: 'McKenzie (2017)', citation: `McKenzie, D. (2017), World Bank Research Observer.` },
  HOSSAIN22: { id: 'HOSSAIN22', label: 'Hossain et al., PLOS One 2022', citation: `Hossain et al., PLOS One, 2022 (census 2001–2011).` },
  BBSCENSUS22: { id: 'BBSCENSUS22', label: 'BBS Census 2022', citation: `Bangladesh Bureau of Statistics, Population and Housing Census 2022.` },
  IDMC25: { id: 'IDMC25', label: 'IDMC 2025', citation: `Internal Displacement Monitoring Centre (IDMC), 2025.`, url: 'https://www.internal-displacement.org' },
  UNDPCHTDF: { id: 'UNDPCHTDF', label: 'UNDP/CHTDF', citation: `UNDP Chittagong Hill Tracts Development Facility (CHTDF); BBS.` },
  AYEO26: { id: 'AYEO26', label: 'Africa Youth Employment Outlook 2026', citation: `Africa Youth Employment Outlook 2026.` },
  DHZ25: { id: 'DHZ25', label: 'Demirci, Hannane & Zhu (2025)', citation: `Believed: Demirci, Hannane & Zhu, "Who Is AI Replacing?", Management Science, 2025 — citation to verify.` },
  HOLONIQ: { id: 'HOLONIQ', label: 'HolonIQ South Asia EdTech 100', citation: `HolonIQ South Asia EdTech 100 (STEAM category).`, url: 'https://www.holoniq.com' },
  UNDPIF15: { id: 'UNDPIF15', label: 'UNDP Innovation Facility 2015', citation: `UNDP Innovation Facility, 2015 review of the Korail pilot (40 students).` },
};

type Row = Omit<Fact, 'id' | 'group'>;
const OC_BASES = `Bases: employment 321, income change 277, earnings timing 170.`;
const oc = (b: string) => `${OC_BASES} This figure: ${b}`;

const rows: [string, Fact['group'], Row][] = [
  // A. Identity
  ['ID-01', 'identity', { text: `CodersTrust is a workforce-development organization that turns educated, unemployed youth in emerging markets into job-ready digital professionals — and connects them to local, remote and global work.`, sourceIds: ['GD26', 'IR26'], note: `Entity definition (BLUF, use verbatim on Home, About, schema). Synthesized from GD26 s1–2, IR26 s1; ≤ 30 words.` }],
  ['ID-02', 'identity', { text: `Founded 2014; launched in Copenhagen, Denmark, in the presence of Sir Richard Branson and investor Morten Lund (co-founder of Skype).`, stat: { value: '2014', numeric: 2014, decimals: 0, label: 'founded; launched in Copenhagen, Denmark' }, sourceIds: ['ID26'], rules: `"in the presence of" — do not say "backed by Branson"` }],
  ['ID-03', 'identity', { text: `Founders: Aziz Ahmad (Co-founder & Chairman; Bangladeshi-American entrepreneur) and Ferdinand Kjærulff (Co-founder; Danish, former military captain).`, sourceIds: ['ID26'] }],
  ['ID-04', 'identity', { text: `To transform and empower underprivileged and marginalized people, especially youth and women, with education and work opportunities, to make them financially independent.`, sourceIds: ['GD26', 'ID26'], note: `Mission (verbatim).` }],
  ['ID-05', 'identity', { text: `By 2032, to be among the top three digital education and employment platforms globally, focused on developing and emerging markets — offering localized digital education and training, job-ready skilled workers and knowledge-based employment for the next billion global youth.`, sourceIds: ['GD26'], note: `Vision (verbatim, light punctuation).` }],
  ['ID-06', 'identity', { text: `Tagline / cycle: Learn. Earn. Prosper. (TalentLEAP: competency development → employment → career advancement)`, sourceIds: ['GD26', 'ID26'] }],
  ['ID-07', 'identity', { text: `Offices: CT USA, Inc., 40 Wall Street, Suite 2004, New York, NY 10005, USA · +1 212 344 4111 · contact@coderstrust.global. Bangladesh office & phone (+880 1958-220802, hello@coderstrustbd.com) — address to be taken from the WordPress export.`, sourceIds: ['IR26', 'GD26'], note: `Bangladesh address to be confirmed before production cutover.` }],
  ['ID-08', 'identity', { text: `12 years of programs (2014–2026).`, stat: { value: '12 years', numeric: 12, decimals: 0, suffix: ' years', label: 'of programs, 2014–2026' }, sourceIds: ['GD26'], rules: `Use "since 2014" in evergreen copy; "12 years" only with the year visible.` }],
  // B. Scale
  ['SC-01', 'scale', { text: `130,000+ youth trained since 2014`, stat: { value: '130,000+', numeric: 130000, decimals: 0, suffix: '+', label: 'youth trained since 2014' }, sourceIds: ['IR26', 'GD26'], note: `Unique youth across direct training and CodersTrust courseware.` }],
  ['SC-02', 'scale', { text: `150,000+ enrollments since 2014 — 111,268 through direct training across 45 programs and 40,043 through CodersTrust courseware`, stat: { value: '150,000+', numeric: 150000, decimals: 0, suffix: '+', label: 'enrollments since 2014' }, sourceIds: ['IR26', 'GD26'], note: `One person can enroll more than once.` }],
  ['SC-03', 'scale', { text: `Programs in 15 countries across Asia, Africa, Europe and the Americas; Bangladesh since 2014 plus 14 international programs`, stat: { value: '15', numeric: 15, decimals: 0, label: 'countries with CodersTrust programs' }, sourceIds: ['IR26', 'GD26'], note: `Map lists program locations (Somalia entry includes the Somaliland program). No overall year range is stated: IR26 summarizes international programs as 2015–2018, but the investor deck lists Denmark (2014) and Albania (2021–2022).` }],
  ['SC-04', 'scale', { text: `1.5M+ National University learners being onboarded; CodersTrust is NU's official training partner for digital career skills and credentials and delivers NU postgraduate diploma courses`, stat: { value: '1.5M+', numeric: 1.5, decimals: 1, suffix: 'M+', label: 'National University learners being onboarded' }, sourceIds: ['IR26', 'GD26'], rules: `"being onboarded" — never "trained"` }],
  ['SC-05', 'scale', { text: `National University: the world's second-largest university by enrollment — 3M+ students in 2,250+ affiliated colleges`, stat: { value: '3M+', numeric: 3, decimals: 0, suffix: 'M+', label: 'students at National University' }, sourceIds: ['IR26'], note: `IR26 s22 (3M; 2,257 colleges). IR26 s34 says 3.5M+/2,300+; use the lower, sourced figure.` }],
  ['SC-06', 'scale', { text: `31,200+ people covered by six government contracts`, stat: { value: '31,200+', numeric: 31200, decimals: 0, suffix: '+', label: 'people covered by six government contracts' }, sourceIds: ['GD26'], note: `Direct delivery and curriculum reach differ (see GV-*).` }],
  ['SC-07', 'scale', { text: `65,000+ enrollments funded by NGOs and governments`, stat: { value: '65,000+', numeric: 65000, decimals: 0, suffix: '+', label: 'enrollments funded by NGOs and governments' }, sourceIds: ['IR26'] }],
  ['SC-08', 'scale', { text: `14,000+ youth trained on CodersTrust's own funding and 10,000 teachers trained to teach online during COVID-19`, stat: { value: '14,000+', numeric: 14000, decimals: 0, suffix: '+', label: 'youth trained on CodersTrust\'s own funding' }, sourceIds: ['IR26'] }],
  ['SC-09', 'scale', { text: `150+ skill courses and certifications delivered; 150+ instructors and mentors`, stat: { value: '150+', numeric: 150, decimals: 0, suffix: '+', label: 'skill courses and certifications delivered' }, sourceIds: ['IR26'] }],
  ['SC-10', 'scale', { text: `500+ industry certifications, digital-skills courses, university postgraduate programs and CPD courses mapped to 50+ high-demand digital roles across eight domains`, stat: { value: '500+', numeric: 500, decimals: 0, suffix: '+', label: 'certifications and courses mapped to 50+ digital roles' }, sourceIds: ['GD26', 'ID26'], note: `Catalogue/career-path scope, not delivery count; not every track in every country.` }],
  ['SC-11', 'scale', { text: `20+ NGO and government partners`, stat: { value: '20+', numeric: 20, decimals: 0, suffix: '+', label: 'NGO and government partners' }, sourceIds: ['IR26'] }],
  ['SC-12', 'scale', { text: `600K+ social media followers`, stat: { value: '600K+', numeric: 600, decimals: 0, suffix: 'K+', label: 'social media followers' }, sourceIds: ['IR26'], note: `ID26 shows 680K+/1M+; use IR26.` }],
  ['SC-13', 'scale', { text: `$5M+ impact investment received`, stat: { value: '$5M+', numeric: 5, decimals: 0, prefix: '$', suffix: 'M+', label: 'impact investment received' }, sourceIds: ['IR26', 'GD26'], note: `Allowed (traction, not financials).` }],
  ['SC-14', 'scale', { text: `~15,000 enrollments in six CodersTrust-designed courses on UNDP's FutureNation platform`, stat: { value: '~15,000', numeric: 14918, decimals: 0, prefix: '~', label: 'enrollments in six courses on UNDP\'s FutureNation platform' }, sourceIds: ['IR26'], note: `Exact figure 14,918. Ratings as displayed on the platform.` }],
  ['SC-15', 'scale', { text: `23,000+ enrollments through Grameenphone Academy courses`, stat: { value: '23,000+', numeric: 23014, decimals: 0, suffix: '+', label: 'enrollments through Grameenphone Academy courses' }, sourceIds: ['IR26'], note: `Exact figure 23,014.` }],
  // C. Outcomes
  ['OC-01', 'outcomes', { text: `Employment among surveyed completers rose from 47.4% before training to 77.9% today — a +30.5 percentage-point gain`, stat: { value: '77.9%', numeric: 77.9, decimals: 1, suffix: '%', from: '47.4%', label: 'employed today, up from 47.4% before training' }, caveat: 'S', base: oc(`321 paired completers; net of 5.9% who exited work`), sourceIds: ['IR26', 'GD26'] }],
  ['OC-02', 'outcomes', { text: `72.3% of 2014–2023 learners with no prior income now earn`, stat: { value: '72.3%', numeric: 72.3, decimals: 1, suffix: '%', label: 'of learners with no prior income now earn' }, caveat: 'S', base: oc(`ten-year completion cohort`), sourceIds: ['IR26'] }],
  ['OC-03', 'outcomes', { text: `Median monthly income tripled: $82 → $245 (3.00×, +200%); 72.2% report higher income`, stat: { value: '$245', numeric: 245, decimals: 0, prefix: '$', from: '$82', label: 'median monthly income, up from $82 (3×)' }, caveat: 'S', base: oc(`277 (income change)`), sourceIds: ['IR26'], rules: `Ratio of medians — never say "average"` }],
  ['OC-04', 'outcomes', { text: `Freelancing 2.3× (6.2% → 14.0%); business ownership 3.8× (2.8% → 10.6%); salaried jobs 1.4× (38.3% → 53.3%)`, stat: { value: '2.3×', numeric: 2.3, decimals: 1, suffix: '×', from: '6.2%', label: 'growth in freelancing among surveyed completers' }, caveat: 'S', base: oc(`321`), sourceIds: ['IR26'] }],
  ['OC-05', 'outcomes', { text: `58.8% started earning within six months; 77.1% within a year; 90.6% within two years; 23.5% during the course`, stat: { value: '58.8%', numeric: 58.8, decimals: 1, suffix: '%', label: 'started earning within six months' }, caveat: 'S', base: oc(`170 who first earned during/after training`), sourceIds: ['IR26'] }],
  ['OC-06', 'outcomes', { text: `92.7% rate instructors good or better; 86.9% rate their overall experience good or better; 71.6% give a recommendation score of 7+ out of 10 (43.3% give a perfect 10)`, stat: { value: '92.7%', numeric: 92.7, decimals: 1, suffix: '%', label: 'rate instructors good or better' }, caveat: 'S', base: oc(`responding completers`), sourceIds: ['IR26'], rules: `Not an NPS — never call it one` }],
  ['OC-07', 'outcomes', { text: `11.9% earn mainly from abroad (7.1% foreign clients as freelancers; 4.7% jobs abroad); 78.0% name work as their main income source`, stat: { value: '11.9%', numeric: 11.9, decimals: 1, suffix: '%', label: 'earn mainly from abroad' }, caveat: 'S', base: OC_BASES, sourceIds: ['IR26', 'GD26'] }],
  ['OC-08', 'outcomes', { text: `59.5% report a specific career or education outcome; 37.4% gained a new income source`, stat: { value: '59.5%', numeric: 59.5, decimals: 1, suffix: '%', label: 'report a specific career or education outcome' }, caveat: 'S', base: oc(`321`), sourceIds: ['IR26'] }],
  ['OC-09', 'outcomes', { text: `Learner profile: 84.6% hold a bachelor's degree or higher; 68.7% aged 15–35; 19.9% women; 62.9% live outside Dhaka; 58 of 64 districts; 16.0% rural`, stat: { value: '84.6%', numeric: 84.6, decimals: 1, suffix: '%', label: 'hold a bachelor\'s degree or higher' }, caveat: 'S', base: oc(`respondents`), sourceIds: ['IR26'] }],
  // D. RCT
  ['RC-01', 'rct', { text: `A randomized controlled trial found CodersTrust training raised women's monthly income by 53% and employment by 28% (women who attended training vs the control group)`, stat: { value: '+53%', numeric: 53, decimals: 0, prefix: '+', suffix: '%', label: 'monthly income for women who attended training (randomized trial)' }, caveat: 'R', sourceIds: ['BIGD22', 'IR26', 'GD26'], note: `BIGD22 Table 4.` }],
  ['RC-02', 'rct', { text: `For everyone offered a place (intent-to-treat): income +41%, employment +20%`, stat: { value: '+41%', numeric: 41, decimals: 0, prefix: '+', suffix: '%', label: 'income for everyone offered a place (intent-to-treat)' }, caveat: 'R', sourceIds: ['BIGD22', 'GD26'] }],
  ['RC-03', 'rct', { text: `Freelancing rate 3.6× and freelance income 3.2× the control group (attenders); hours worked +48%`, stat: { value: '3.6×', numeric: 3.6, decimals: 1, suffix: '×', label: 'freelancing rate vs the control group' }, caveat: 'R', sourceIds: ['BIGD22', 'IR26'], note: `BIGD22 Table 5.` }],
  ['RC-04', 'rct', { text: `In absolute terms: about +$35 a month on a control-group mean of about $66 (BDT 86 = $1, Nov–Dec 2021)`, stat: { value: '+$35', numeric: 35, decimals: 0, prefix: '+$', label: 'a month, on a control-group mean of about $66' }, caveat: 'R', sourceIds: ['GD26'] }],
  ['RC-05', 'rct', { text: `Household effects (attenders vs control mean): spending +41%, savings +33%, 39% fewer took a loan, "never felt stressed last month" +78%`, caveat: 'R', sourceIds: ['IR26', 'GD26'] }],
  ['RC-06', 'rct', { text: `Context (external): a World Bank review of nine randomized trials of vocational training found only three with significant employment impacts`, caveat: 'X', sourceIds: ['MCKENZIE17', 'GD26'] }],
  ['RC-07', 'rct', { text: `Trial design: 833 women at baseline (425 treatment, 408 control); 599 surveyed at follow-up; 200 hours over 4 months + 3 months of mentoring; trained in 2020, moving online during COVID-19; all headline effects significant at the 1% level (offered-place employment at 5%)`, caveat: 'R', sourceIds: ['BIGD22', 'GD26'], rules: `Causal language ("raised", "caused") is allowed only for RC facts. Survey facts use "rose", "reported", "among surveyed completers".` }],
  // E. Programs
  ['PR-01', 'programs', { text: `WSDFM (Women's Skill Development for Freelancing Marketplace), commissioned by Porticus: 711 of 1,000 women placed (71%); independently evaluated by BIGD (RCT)`, stat: { value: '711 of 1,000', numeric: 711, decimals: 0, suffix: ' of 1,000', label: 'women placed (71%) in WSDFM' }, caveat: 'P', sourceIds: ['IR26', 'GD26'] }],
  ['PR-02', 'programs', { text: `Women in Online Work (WoW), Kosovo, for the World Bank Group, 2017: 102 of 150 women placed (68%); 78 graduates earned about $25,000 online; 56 won online contracts (~180 jobs); 10+ founded IT ventures; online workers earned about 2× Kosovo's average hourly rate`, stat: { value: '102 of 150', numeric: 102, decimals: 0, suffix: ' of 150', label: 'women placed (68%) in Kosovo' }, caveat: 'P', sourceIds: ['IR26', 'GD26'] }],
  ['PR-03', 'programs', { text: `UNDP YES (Youth Employment through Skills), Korail slum, Dhaka, with UNDP, the Government of Bangladesh and Swanirvar Bangladesh, 2017: 350 trained; 97.5% graduated; 67% found their first job within 3 months; average earnings $100+ and rising`, stat: { value: '67%', numeric: 67, decimals: 0, suffix: '%', label: 'found their first job within 3 months' }, caveat: 'P', sourceIds: ['IR26', 'GD26', 'UNDPIF15'], note: `UNDP Innovation Facility 2015 review: "successfully met and surpassed targets" (2015 Korail pilot, 40 students).` }],
  ['PR-04', 'programs', { text: `BRAC STRONG-IT, funded by BRAC, online during COVID-19: 476 of 850 youth placed (56%); 20.85% placed during the course`, stat: { value: '476 of 850', numeric: 476, decimals: 0, suffix: ' of 850', label: 'youth placed (56%) in BRAC STRONG-IT' }, caveat: 'P', sourceIds: ['IR26'] }],
  ['PR-05', 'programs', { text: `Her Power (ICT Division / DoICT) — training component: 372 of 800 women placed (47%); 18.62% placed during the course`, stat: { value: '372 of 800', numeric: 372, decimals: 0, suffix: ' of 800', label: 'women placed (47%) in Her Power training' }, caveat: 'P', sourceIds: ['IR26'] }],
  // F. Government
  ['GV-01', 'government', { text: `Her Power (DoICT, ICT Division): curriculum, training manuals and mentorship guidelines for a program to train 25,125 women across 130 upazilas; Training of Trainers; 2,400 women trained as freelancers (2023–2025); 54,609 manuals and guidelines published and distributed`, stat: { value: '54,609', numeric: 54609, decimals: 0, label: 'manuals and guidelines published and distributed' }, sourceIds: ['ID26', 'IR26'] }],
  ['GV-02', 'government', { text: `EDGE — Enhancing Digital Government and Economy (PMIS, University of Dhaka, with BCC): 1,000 youth in digital and 4IR technologies`, sourceIds: ['ID26', 'IR26'] }],
  ['GV-03', 'government', { text: `SKIT incubator training (Bangladesh Hi-Tech Park Authority): 1,000 people in high-demand IT skills (Barishal)`, sourceIds: ['ID26', 'IR26'] }],
  ['GV-04', 'government', { text: `NHRDF (implemented by NSDA): training service provider — initial 200 trainees, scope 1,000+`, sourceIds: ['IR26', 'GD26'] }],
  ['GV-05', 'government', { text: `Digital Lab Establishment Project (Phase II): LMS and operation training for 3,120+ staff`, sourceIds: ['IR26'] }],
  ['GV-06', 'government', { text: `Ministry of Power, Energy and Mineral Resources (via Bangladesh Petroleum Institute): ICT, networking and cybersecurity for 120+ professionals`, sourceIds: ['IR26'] }],
  ['GV-07', 'government', { text: `Third-gender inclusion: program with the Bangladesh Computer Council (BCC) and Bandhu Welfare Society to provide digital-skills training to 5,000 third-gender people`, sourceIds: ['IR26', 'GD26'], rules: `Phrase as "program to train"; current enrollment status to be confirmed with CodersTrust.` }],
  ['GV-08', 'government', { text: `SuperKids: agreements with DoICT (primary-school STEM and robotics, target reach 20M+ students via 9,000+ digital labs) and NCTB (competency-based experiential learning)`, sourceIds: ['ID26'], rules: `Phrase as agreements/targets.` }],
  ['GV-09', 'government', { text: `9,000+ government digital labs in Bangladesh usable as blended-learning centers`, stat: { value: '9,000+', numeric: 9000, decimals: 0, suffix: '+', label: 'government digital labs usable as learning centers' }, sourceIds: ['GD26'] }],
  // G. Partners
  ['PA-01', 'partners', { text: `Development & NGO partners include UNDP, the World Bank Group, the World Food Programme, the Rockefeller Foundation, DANIDA, BRAC, Porticus, CARE, iDE, PKSF and Save the Children`, sourceIds: ['GD26'] }],
  ['PA-02', 'partners', { text: `Government partners include Bangladesh's ICT Division, DoICT, Bangladesh Hi-Tech Park Authority, NSDA and BCC`, sourceIds: ['GD26'] }],
  ['PA-03', 'partners', { text: `Private-sector partners include Grameenphone Academy, Robi, Accenture, BASIS and AWS`, sourceIds: ['GD26'] }],
  ['PA-04', 'partners', { text: `Logo rule: logos show program relationships (funder, client, curriculum customer, delivery or industry partner), 2014–2026 — not endorsements. Caption: "Organizations we have worked with, 2014–2026."`, sourceIds: ['GD26'] }],
  ['PA-05', 'partners', { text: `University partners: National University (official training partner; PGD courses); University for Peace (UPEACE), the UN-mandated university (academic cooperation, next-generation digital skills); The City College of New York (CCNY), flagship of CUNY (job-ready certifications with CCNY's Center for Worker Education; 20,000+ students and recent graduates to benefit)`, sourceIds: ['IR26'] }],
  ['PA-06', 'partners', { text: `AWS Authorized Training Partner`, sourceIds: ['ID26'] }],
  ['PA-07', 'partners', { text: `Partnership with AIvolve Leadership Dynamics GmbH (Switzerland) for AI leadership and AI-transformation programs`, sourceIds: ['ID26'] }],
  ['PA-08', 'partners', { text: `HolonIQ South Asia EdTech 100 (STEAM category), two years running`, sourceIds: ['IR26', 'HOLONIQ'], note: `Listing years (believed 2023 and 2024) to be confirmed with CodersTrust.` }],
  ['PA-09', 'partners', { text: `Media coverage since 2014: Forbes ("5 Companies Making A Splash For A Better World", 2014), The Wall Street Journal ("Startup Aims to Boost Number of Qualified IT Workers", 2014), TechCrunch ("Building Code To Break Poverty In Bangladesh", 2014), Tech in Asia (2015), Gulf News (2014), USA Today (2014), The Times of India (2016), World Bank blog on Kosovo's women in online work (2016). No BBC logo (no documented item).`, sourceIds: ['GD26'] }],
  ['PA-10', 'partners', { text: `Endorsement: "Technology is only a tool and it takes operators to use the tool and to keep the tool working. CodersTrust and the partnerships we've heard about today [are] necessary to build the skills of the future — the skills that will lead Bangladesh into middle-income country status and beyond." — James Gardiner, Foreign Service Officer, U.S. Department of State, at CodersTrust's Next Generation Skills launch, Bangladesh National Museum, 14 June 2023`, sourceIds: ['IR26'], note: `Bracketed insertion for grammar.` }],
  // H. Design
  ['PD-01', 'design', { text: `100 training hours per certification (50 h lectures + 50 h hands-on labs) over 3–6 months, then 3 months of one-to-one mentoring into first income`, stat: { value: '100', numeric: 100, decimals: 0, label: 'training hours per certification' }, sourceIds: ['GD26'] }],
  ['PD-02', 'design', { text: `Every program includes: outreach and selection · blended training · AI-ready curriculum · certification exam preparation and exam fees · three months of mentoring · placement support · monthly reporting · outcome tracking for 12 months after each course`, sourceIds: ['GD26'] }],
  ['PD-03', 'design', { text: `Certifications by track: Meta Blueprint / Google Ads (digital marketing), Adobe Certified Professional (design, video), QuickBooks Online ProAdvisor (digital accounting), PCEP (Python), CWP (web)`, sourceIds: ['GD26'] }],
  ['PD-04', 'design', { text: `First cohort in training 6–8 weeks after signing; about three weeks from first conversation to agreement (Discovery wk 1 → Co-design wk 2 → Agreement wk 3)`, stat: { value: '6–8 weeks', label: 'from signing to first cohort in training' }, sourceIds: ['GD26'] }],
  ['PD-05', 'design', { text: `Program options (no prices — Decision D7): Pilot 1,000–2,500 trainees, 8–14 months (tracking to month 23); Scale 10,000–25,000 trainees, 12–18 months rolling; National 100,000+ trainees, 3–5 years`, sourceIds: ['GD26'] }],
  ['PD-06', 'design', { text: `Up to 10 certification cohorts in parallel from about month 5; classes of 20 (labs) and 40 (lectures)`, sourceIds: ['GD26'] }],
  ['PD-07', 'design', { text: `Connectivity-light: runs on 1.5 Mbps; 720p lessons downloadable for offline viewing`, sourceIds: ['GD26'] }],
  ['PD-08', 'design', { text: `Funders receive monthly: enrollment & attendance, completion & certification, placements & first earnings, tracer results (3/6/12 months), women and priority-group shares, trainee satisfaction; independent evaluation welcome`, sourceIds: ['GD26'] }],
  ['PD-09', 'design', { text: `Results documented with baseline at enrollment, tracers at 3/6/12 months, payslips/offer letters, platform logs and bank receipts for freelancers`, sourceIds: ['GD26'] }],
  ['PD-10', 'design', { text: `Entry-level menu (set per country from employer demand): digital marketing · graphic design · video editing · web design & development · digital accounting · Python programming · data analysis`, sourceIds: ['GD26'] }],
  // I. Initiatives
  ['IN-01', 'initiatives', { text: `NationWIDE (Nationwide Workforce Inclusion for Digital Economy): Bangladesh initiative that aims to train 2 million vulnerable youth for digital employment by 2030`, stat: { value: '2 million', numeric: 2, decimals: 0, suffix: ' million', label: 'vulnerable youth NationWIDE aims to train by 2030' }, sourceIds: ['IR26', 'GD26'], rules: `Target, not achievement` }],
  ['IN-02', 'initiatives', { text: `YouthWIDE (Youth Workforce Inclusion for Digital Economy): the program through which funders deploy the CodersTrust model in a country — South Asia, MENA and Sub-Saharan Africa; Bangladesh is the evidence-rich reference implementation`, sourceIds: ['GD26'] }],
  ['IN-03', 'initiatives', { text: `Priority groups: unemployed graduates · madrasah youth · climate-vulnerable coastal youth · indigenous communities · third-gender people; women are a priority in every group`, sourceIds: ['GD26'], rules: `Sizes overlap; never add them up` }],
  ['IN-04', 'initiatives', { text: `JobReady is CodersTrust's AI-native digital education and employment platform (DEEP): it trains youth, connects them to work, supplies employers with job-ready talent and gives institutions a digital delivery platform. Modules are rolling out in stages: partner portals, marketing automation, CRM and AI chat are live; the employer and gig-work (Earn) marketplace is in pre-launch`, sourceIds: ['GD26'], rules: `Say "built to bring together", never "already offers all"` }],
  ['IN-05', 'initiatives', { text: `Ambition: 1.5M+ learners and professionals on JobReady in FY28, 3M+ by FY32`, stat: { value: '3M+', numeric: 3, decimals: 0, suffix: 'M+', label: 'learners and professionals on JobReady by FY32 (ambition)' }, caveat: 'E', sourceIds: ['GD26'], rules: `Company projection, not a commitment` }],
  ['IN-06', 'initiatives', { text: `TalentLEAP: CodersTrust's competency-based talent development model — individual skill units within graduated competency models (Dreyfus model of skill acquisition), aligned with industry expectations; the basis for AI-driven personalized and adaptive learning`, sourceIds: ['ID26', 'GD26'] }],
  // J. Context
  ['PX-01', 'context', { text: `About 62 million young people with higher-secondary education or more (HSC+) are not in employment, education or training across South Asia, MENA and Sub-Saharan Africa`, stat: { value: '62 million', numeric: 62, decimals: 0, suffix: ' million', label: 'educated young people not in work or training' }, caveat: 'E', sourceIds: ['ILOSTAT26', 'GD26'], note: `CodersTrust estimate from ILOSTAT/ILO GET Youth 2026 (35% of 177M NEETs; range 61–78M).` }],
  ['PX-02', 'context', { text: `19M+ university-educated people are unemployed across these regions`, stat: { value: '19M+', numeric: 19, decimals: 0, suffix: 'M+', label: 'university-educated people unemployed' }, caveat: 'X', sourceIds: ['ILOSTAT26', 'GD26'], note: `ILOSTAT (UNE_TUNE_SEX_AGE_EDU_NB_A), latest year 2019–2025 (floor).` }],
  ['PX-03', 'context', { text: `In Bangladesh, graduate unemployment is 13.5% vs 2.0% for SSC holders`, stat: { value: '13.5%', numeric: 13.5, decimals: 1, suffix: '%', label: 'graduate unemployment in Bangladesh, vs 2.0% for SSC holders' }, caveat: 'X', sourceIds: ['BBSLFS24', 'GD26', 'IR26'] }],
  ['PX-04', 'context', { text: `48% of a 2021 National University graduate cohort were still jobless two years on; 97% said their college offered no employment support`, stat: { value: '48%', numeric: 48, decimals: 0, suffix: '%', label: 'of 2021 NU graduates still jobless two years on' }, caveat: 'X', sourceIds: ['BIDS23', 'WB19NU', 'IR26'] }],
  ['PX-05', 'context', { text: `72% of employers report difficulty finding the talent they need; AI skills are now the hardest to find`, stat: { value: '72%', numeric: 72, decimals: 0, suffix: '%', label: 'of employers report difficulty finding talent' }, caveat: 'X', sourceIds: ['MANPOWER26', 'ID26', 'GD26'] }],
  ['PX-06', 'context', { text: `AI is closing entry-level doors: online freelance postings fell about 30% in writing, 21% in software and web development, and 17% in design`, caveat: 'X', sourceIds: ['DHZ25', 'IR26', 'GD26'], note: `Original study citation to verify (believed: Demirci, Hannane & Zhu, "Who Is AI Replacing?", Management Science, 2025).` }],
  ['PX-07', 'context', { text: `…while AI is a net job creator: AI and information processing are expected to create 11M jobs and displace 9M by 2030; across all trends 170M created vs 92M displaced`, caveat: 'X', sourceIds: ['WEF25', 'GD26'] }],
  ['PX-08', 'context', { text: `Jobs requiring AI skills grew +69% vs +9% for all jobs, with a 62% wage premium`, caveat: 'X', sourceIds: ['PWC26', 'GD26'], note: `Verify before publication.` }],
  ['PX-09', 'context', { text: `154M–435M people do online gig work worldwide; postings on the largest platform grew 130% in Sub-Saharan Africa (2016–2020) vs 14% in North America`, caveat: 'X', sourceIds: ['WB23', 'GD26'] }],
  ['PX-10', 'context', { text: `257M young people worldwide are NEET (2025); global youth unemployment 13.4%, 3.4× the adult rate`, stat: { value: '257M', numeric: 257, decimals: 0, suffix: 'M', label: 'young people worldwide are NEET (2025)' }, caveat: 'X', sourceIds: ['ILOSTAT26', 'ID26'] }],
  ['PX-11', 'context', { text: `Bangladesh's 19 coastal districts hold 44.8M people (28% of the population); net out-migration of 20–24-year-olds reached 64.9% in Jhalokathi; Cyclone Amphan displaced 2.5M people`, caveat: 'X', sourceIds: ['BBSCENSUS22', 'HOSSAIN22', 'IDMC25', 'IR26'] }],
  ['PX-12', 'context', { text: `50,000+ madrasahs (one-third of the education system); 75% of 5M+ madrasah students unemployed or under-employed (study estimate); only 14% of madrasahs have a computer lab; 94–97% of those surveyed want training`, caveat: 'X', sourceIds: ['IR26', 'GD26'] }],
  ['PX-13', 'context', { text: `54+ indigenous ethnic groups; <30% of indigenous children complete secondary school; only 3% hold salaried jobs or businesses in the Chittagong Hill Tracts`, caveat: 'X', sourceIds: ['UNDPCHTDF', 'IR26'] }],
  ['PX-14', 'context', { text: `Third-gender population estimated at 200,000–1.5 million (independent estimates; official estimate 10,000)`, caveat: 'X', sourceIds: ['IR26'] }],
  ['PX-15', 'context', { text: `10M+ young Africans enter the labor market each year vs ~3M formal jobs`, stat: { value: '10M+', numeric: 10, decimals: 0, suffix: 'M+', label: 'young Africans enter the labor market each year' }, caveat: 'X', sourceIds: ['AYEO26', 'GD26'] }],
];

export const facts: Record<string, Fact> = Object.fromEntries(
  rows.map(([id, group, r]) => [id, { id, group, ...r } as Fact]),
);

export function fact(id: string): Fact {
  const f = facts[id];
  if (!f) throw new Error(`Unknown fact ${id}`);
  return f;
}
export function factsByGroup(group: Fact['group']): Fact[] {
  return Object.values(facts).filter((f) => f.group === group);
}
