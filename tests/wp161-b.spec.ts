import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP161-B (group B: team, recognition, news posts, evidence pages, permissions). Fable adversarial review of 2 November 2026, packages 3, 4 and 8
 * (scratchpad adv2/CONSOLIDATED.md, section 2), and the owner answers of 2 November 2026 (WP160-A items 1 to 4; WP160-C items 1 and 2).
 * Test-first: run `npm run build`, then `PORT=4913 npx playwright test tests/wp161-b.spec.ts --project=chromium`. The tests read the built files and the
 * permissions register; none opens a browser.
 *   A-10  Faruque Hossain is the former Executive Chairman of the NSDA (role line and bio; the Team page and the cross-cards that render the role).
 *   A-11  Recognition: the Morten Lund note says what the 2014 coverage got wrong (co-founder of CodersTrust and of Skype; he was an early Skype investor).
 *   A-12  Recognition and Home: "World Bank pages", not "World Bank coverage" (register PA-13's own wording).
 *   A-13  Contact: the hero lead says the NU application form and JobReady.global open their own sites.
 *   A-14  In the Field: SuperKids is "for young learners".
 *   A-15 to A-25  News archive posts (Package 4): exact old → new strings.
 *   A-41  Independent Evaluation: the classes band says attendance was not randomly assigned.
 *   A-42  Home results slide: not applied. "Her Power (2023–2025): …" wraps and breaks the hero-slider height budget, so the row stays undated (accepted, noted in src/data/heroSlides.ts).
 *   A-43  Impact evidence ladder: the "Program Record" rung names the partner's own reports too.
 *   O1    (owner 2026-11-02) Aziz Ahmad: the NOVA Award's issuer, "chaired" the chamber, the 2019 award is Con Edison's Minority Business Entrepreneur of the Year award (to UTC Associates).
 *   O2    (owner 2026-11-02) Md. Shamsul Haque: "a former Additional Secretary, Ministry of Foreign Affairs of Bangladesh", everywhere.
 *   O3    (owner 2026-11-02) Ferdinand Kjærulff: "passed away in 2023" (the month is unconfirmed); his Person JSON-LD keeps a deathDate and no employer.
 *   O4    (owner 2026-11-02) Permissions: LEEDO, the school in "The Man Behind CodersTrust" and Melissa Mannis are cleared by OWNER-2026-11-02-CONSENT.
 *   O5    (owner 2026-11-02) UPEACE post: one update sentence after "Eligible students…"; the photographs stay.
 *   O6    (owner 2026-11-02) WSIS+20 post: the two trophy photographs carry neutral italic captions.
 *   D     Owner date rule: Package 3, 4 and 8 pages move to 2026-11-02 or later; pages changed for the owner answers move to 2026-11-03 (`date +%F`) or later.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const main = (rel: string) => visible(mainRaw(rel));
const h1 = (rel: string) => visible(/<h1[\s\S]*?<\/h1>/.exec(html(rel))?.[0] ?? '');
const dateModifieds = (rel: string) => [...html(rel).matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1]);
/** Built pages (redirect stubs excluded) whose visible text contains the needle. */
const pagesWithText = (needle: string) => listPages().filter((p) => visible(readFileSync(p.file, 'utf8')).includes(needle)).map((p) => p.route);
/** Built pages (redirect stubs excluded) whose raw HTML (text, attributes, meta, JSON-LD) contains the needle. */
const pagesWithRaw = (needle: string) => listPages().filter((p) => decode(readFileSync(p.file, 'utf8')).includes(needle)).map((p) => p.route);

const WP159_DAY = '2026-11-02';
const OWNER_DAY = '2026-11-03'; // `date +%F` on the day the owner answers of 2 November were applied

const TEAM = 'about/team/index.html';
const FARUQUE = 'about/team/faruque-hossain/index.html';
const ABDUL_KARIM = 'about/team/abdul-karim/index.html';
const FERDINAND = 'about/team/ferdinand-kjaerulff/index.html';
const AZIZ = 'about/team/aziz-ahmad/index.html';
const SHAMSUL = 'about/team/shamsul-haque/index.html';
const RECOGNITION = 'about/recognition/index.html';
const HOME = 'index.html';
const CONTACT = 'contact/index.html';
const IN_THE_FIELD = 'impact/in-the-field/index.html';
const NEWS_PHOTOS = 'impact/in-the-field/news-photos/index.html';
const EVALUATION = 'impact/independent-evaluation/index.html';
const IMPACT = 'impact/index.html';
const NEWS_INDEX = 'news/index.html';
const post = (slug: string) => `news/${slug}/index.html`;

const AKIJ = post('coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia');
const KAMAL = post('1000-trainees-sheikh-kamal-ict-incubator-training');
const EDGE = post('1000-trainees-enhancing-digital-government-economy-edge');
const HER_POWER = post('25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative');
const JAHANGIRNAGAR = post('coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad');
const ENERGY = post('coderstrust-chairman-and-co-founder-aziz-ahmad-participates-in-u-s-energy-security-panel');
const TOP100 = post('coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia');
const WSIS = post('coderstrust-attends-wsis20-forum-high-level-event');
const LEEDO = post('coderstrust-leedo-join-to-expands-ict-education-to-street-children');
const DIGITAL_FACTORY = post('why-we-call-it-a-digital-factory');
const PRESS_FREEDOM = post('aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day');
const MAN_BEHIND = post('the-man-behind-coderstrust-who-never-forgot-his-roots');
const AMERICA_WEEK = post('celebrating-america-week-with-the-u-s-embassy-dhaka');
const BASIS = post('coderstrust-and-basis-asset-collaborate-to-build-bangladeshs-it-future');
const DISCOVERY = post('coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners');
const UNGA = post('coderstrust-chairman-mr-aziz-ahmad-speaks-on-cybersecurity-artificial-intelligence-at-united-nations-general-assembly-unga-2025');
const EMBASSY = post('coderstrust-chairman-mr-aziz-ahmad-leads-delegation-to-u-s-embassy-to-discuss-youth-empowerment');
const HOLONIQ = post('coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100');
const RMSTU = post('coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation');
const FUTURE = post('the-future-building-a-digital-factory-for-bangladesh');
const OSTITTO = post('coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide');
const UPEACE = post('coderstrust-students-invited-to-join-upeaces-young-leaders-for-peace-summer-programme-2026');

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Package 3: team and recognition
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-10 Faruque Hossain: former Executive Chairman of the NSDA', () => {
  const ROLE = 'Advisor; former Executive Chairman, National Skills Development Authority';
  test('his profile shows the role line and the bio sentence; the JSON-LD jobTitle matches', () => {
    const t = main(FARUQUE);
    expect(t).toContain(ROLE);
    expect(t).toContain('He is the former Executive Chairman of the National Skills Development Authority (NSDA) of Bangladesh.');
    expect(html(FARUQUE)).toContain(`"jobTitle":"${ROLE}"`);
  });

  test('the Team page and the Abdul Karim and Ferdinand Kjærulff cross-cards render the new role', () => {
    for (const page of [TEAM, ABDUL_KARIM, FERDINAND]) expect(main(page), page).toContain(ROLE);
  });

  test('no built page calls him the former Chairman of the NSDA', () => {
    expect(pagesWithRaw('former Chairman, National Skills Development Authority')).toEqual([]);
    expect(pagesWithRaw('former Chairman of the National Skills Development Authority')).toEqual([]);
  });
});

test.describe('A-11 Recognition: the Morten Lund note', () => {
  test('says the 2014 coverage called him a co-founder of CodersTrust and of Skype, and that he was an early Skype investor', () => {
    const t = main(RECOGNITION);
    expect(t).toContain(
      'Some 2014 coverage described Morten Lund as a co-founder of CodersTrust and of Skype; he was an early Skype investor, and CodersTrust’s founders are Aziz Ahmad and Ferdinand Kjærulff.',
    );
    expect(t).not.toContain('as a co-founder of CodersTrust. CodersTrust’s founders');
  });
});

test.describe('A-12 "World Bank pages", not "World Bank coverage"', () => {
  test('Recognition: the On This Page label and the section heading read "World Bank Pages on Our Work in Kosovo and Albania"', () => {
    const raw = mainRaw(RECOGNITION);
    expect(raw).toMatch(/<a[^>]*href="#world-bank"[^>]*>\s*World Bank Pages on Our Work in Kosovo and Albania\s*<\/a>/);
    expect(raw).toMatch(/<h2[^>]*id="wb-h"[^>]*>[\s\S]*?World Bank Pages on Our Work in Kosovo and Albania[\s\S]*?<\/h2>/);
    expect(visible(raw)).not.toContain('Coverage of Our Work in Kosovo and Albania');
  });

  test('Recognition: the link line opens "World Bank pages that name CodersTrust:"', () => {
    const t = main(RECOGNITION);
    expect(t).toMatch(/World Bank pages that name CodersTrust: Kosovo \(/);
  });

  test('Home: the pointer sentence names the World Bank pages', () => {
    expect(main(HOME)).toContain('Early press coverage, 2014–2016, and the World Bank pages on our work in Kosovo and Albania are on the Recognition and Media page.');
  });

  test('no built page says "World Bank coverage"', () => {
    expect(pagesWithText('World Bank coverage')).toEqual([]);
  });
});

test.describe('A-13 Contact hero lead', () => {
  test('says the inquiry buttons open a prefilled email and the NU application form and JobReady.global open their own sites', () => {
    const t = main(CONTACT);
    expect(t).toContain(
      'Choose the route that fits you. The inquiry buttons open a prefilled email to the CodersTrust team; the NU application form and JobReady.global open their own sites.',
    );
    expect(t).not.toContain('Each inquiry button opens a prefilled email');
  });
});

test.describe('A-14 In the Field: SuperKids is for young learners', () => {
  test('the SuperKids section lead says "for young learners"', () => {
    const t = main(IN_THE_FIELD);
    expect(t).toContain('SuperKids is CodersTrust’s school STEAM and digital-skills program for young learners.');
    expect(t).not.toContain('digital-skills program for children');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Package 4: news archive posts
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-15 Akij Group: no "largest conglomerate" title and no $14 billion figure', () => {
  test('the H1 is "CodersTrust Provides Corporate Training to Akij Group" and the body says "a conglomerate based in Bangladesh"', () => {
    expect(h1(AKIJ)).toBe('CodersTrust Provides Corporate Training to Akij Group');
    const t = main(AKIJ);
    expect(t).toMatch(/Akij Group of Companies( \(opens [^)]+\))?, a conglomerate based in Bangladesh\./);
    expect(t).not.toContain('$14 billion');
  });

  test('the News index lists the new title, and no page carries the old one', () => {
    expect(main(NEWS_INDEX)).toContain('CodersTrust Provides Corporate Training to Akij Group');
    expect(pagesWithRaw('One of the Largest Conglomerates of South Asia')).toEqual([]);
  });
});

test.describe('A-16 Sheikh Kamal: the body names the training center', () => {
  test('"... in high-demand IT skills at the Sheikh Kamal IT Training and Incubation Center in Barishal."', () => {
    expect(main(KAMAL)).toContain('CodersTrust will provide training to 1,000 people in high-demand IT skills at the Sheikh Kamal IT Training and Incubation Center in Barishal.');
  });
});

test.describe('A-17 the ICT Division, not an "ICT and Telecommunication Ministry" or a "Ministry of ICT"', () => {
  test('EDGE: the caption and the alt text say "Bangladesh Computer Council (BCC), under the ICT Division, Bangladesh"', () => {
    expect(main(EDGE)).toContain('Bangladesh Computer Council (BCC), under the ICT Division, Bangladesh');
    // The first body image repeats the cover (coverInBody), so the page shows it once, as the hero with coverAlt and this caption; the body image's own alt is not rendered, so the source is checked.
    const src = readFileSync('src/content/news/1000-trainees-enhancing-digital-government-economy-edge.md', 'utf8');
    expect(src).toMatch(/!\[[^\]]*Bangladesh Computer Council \(BCC\), under the ICT Division, Bangladesh\]\(/);
    expect(src).not.toContain('ICT and Telecommunication Ministry');
  });

  test('Her Power: the caption says "DoICT), under the ICT Division, Bangladesh"', () => {
    expect(main(HER_POWER)).toContain('Department of Information and Communication Technology (DoICT), under the ICT Division, Bangladesh');
  });

  test('Jahangirnagar: "under the ICT Division." and "the ICT Division’s decision"', () => {
    const t = main(JAHANGIRNAGAR);
    expect(t).toContain('the Department of ICT (DoICT), under the ICT Division.');
    expect(t).toContain('the ICT Division’s decision');
  });

  test('no built page names an "ICT and Telecommunication Ministry", a "Ministry of ICT" or the "ICT Ministry"', () => {
    for (const s of ['ICT and Telecommunication Ministry', 'Ministry of ICT', 'ICT Ministry']) expect(pagesWithRaw(s), s).toEqual([]);
  });
});

test.describe('A-18 U.S. energy security panel: "Attends"', () => {
  test('the H1 and the News index say "Attends U.S. Energy Security Panel"', () => {
    expect(h1(ENERGY)).toBe('CodersTrust Chairman and Co-Founder Aziz Ahmad Attends U.S. Energy Security Panel');
    expect(main(NEWS_INDEX)).toContain('CodersTrust Chairman and Co-Founder Aziz Ahmad Attends U.S. Energy Security Panel');
    expect(pagesWithText('Participates in U.S. Energy Security Panel')).toEqual([]);
  });
});

test.describe('A-19 Top 100 EdTech: "have worked with CodersTrust"', () => {
  test('the organizations "have worked with CodersTrust"; no "trust CodersTrust for skill-oriented training"', () => {
    const t = main(TOP100);
    expect(t).toContain('CARE and Grameenphone have worked with CodersTrust.');
    expect(t).not.toContain('skill-oriented training and workforce development');
  });
});

test.describe('A-20 WSIS+20: no "Technological Achievements and Global Recognition program" standfirst', () => {
  test('the standfirst line is gone and the first paragraph still states participation', () => {
    const t = main(WSIS);
    expect(t).not.toContain('Technological Achievements and Global Recognition');
    expect(t).toContain('CodersTrust participated in the WSIS+20 Forum High-Level Event in Geneva, held May 27 to 31, 2024.');
  });
});

test.describe('A-21 LEEDO: the shelter is named without its neighbourhood', () => {
  test('"... at the LEEDO Peace Home in Dhaka." and no "Bosila"', () => {
    const t = main(LEEDO);
    expect(t).toContain('a dedicated computer lab has been established at the LEEDO Peace Home in Dhaka.');
    expect(pagesWithRaw('Bosila')).toEqual([]);
  });
});

test.describe('A-22 Digital Factory: the Bangladesh vision and aim are framed as Bangladesh’s', () => {
  test('"Our vision for Bangladesh is to make it a Digital Factory" and "In Bangladesh, our aim is to ensure"', () => {
    const t = main(DIGITAL_FACTORY);
    expect(t).toContain('Our vision for Bangladesh is to make it a Digital Factory—not a factory');
    expect(t).toContain('In Bangladesh, our aim is to ensure that every motivated young person—regardless');
    expect(t).not.toContain('Our vision is to transform Bangladesh');
    expect(t).not.toContain('Our mission is to ensure');
  });
});

test.describe('A-23 first-person superlatives are gone from seven archived posts', () => {
  const ROWS: Array<[string, string, string]> = [
    [PRESS_FREEDOM, 'Aziz Ahmad is a technology entrepreneur and speaker.', 'globally renowned technology innovator'],
    [PRESS_FREEDOM, 'The seminar heard about the work of his organization, CodersTrust.', 'lauded Ahmad'],
    [MAN_BEHIND, 'the personal life of the technology entrepreneur,', 'globally recognized technology leader'],
    [AMERICA_WEEK, 'None of this happens without our Chairman, Aziz Ahmad, whose work continues', 'visionary Chairman'],
    [BASIS, 'CodersTrust continues to work on digital skills, creating new opportunities', 'continues to lead the technological revolution'],
    [DISCOVERY, 'CodersTrust, a global EdTech company, is set to offer', 'a leading global EdTech company'],
    [LEEDO, 'CodersTrust, an EdTech company, has embarked', 'a prominent EdTech company'],
  ];
  for (const [page, now, before] of ROWS) {
    test(`${page.split('/')[1].slice(0, 60)}: "${now.slice(0, 50)}…"`, () => {
      const t = main(page);
      expect(t).toContain(now);
      expect(t).not.toContain(before);
    });
  }
});

test.describe('A-24 "Co-Founder", not "Co-founder", in six archived posts', () => {
  const ROWS: Array<[string, string]> = [
    [UNGA, 'CodersTrust Chairman and Co-Founder Mr. Aziz Ahmad participated'],
    [EMBASSY, 'CodersTrust Chairman and Co-Founder Mr. Aziz Ahmad led a seven-member delegation'],
    [HOLONIQ, 'said Aziz Ahmad, Co-Founder of CodersTrust.'],
    [ENERGY, 'CodersTrust Chairman and Co-Founder Aziz Ahmad attended the panel'],
    [RMSTU, 'CodersTrust Chairman and Co-Founder Aziz Ahmad is honored'],
    [FUTURE, 'Looking ahead, Chairman and Co-Founder Aziz Ahmad shared'],
  ];
  for (const [page, now] of ROWS) {
    test(`${page.split('/')[1].slice(0, 60)}: "${now.slice(0, 50)}…"`, () => {
      const t = main(page);
      expect(t).toContain(now);
      expect(t).not.toContain('Co-founder');
    });
  }
});

test.describe('A-25 HolonIQ: Nguyen Anh Tuan, Co-Founder and CEO of Boston Global Forum', () => {
  test('the name order and title follow the forum’s own listing', () => {
    const t = main(HOLONIQ);
    expect(t).toContain('Mr. Nguyen Anh Tuan, Co-Founder and CEO of Boston Global Forum, added');
    expect(t).not.toContain('Tuan Nguyen Anh');
    expect(t).not.toContain('Founder and President of Boston Global Forum');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Package 8: evidence pages
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-41 Independent Evaluation: attendance was not randomly assigned', () => {
  test('"In this study, freelancing was higher among women who attended more classes (attendance was not randomly assigned)."', () => {
    const t = main(EVALUATION);
    expect(t).toContain('In this study, freelancing was higher among women who attended more classes (attendance was not randomly assigned).');
    expect(t).not.toContain('attended more classes.');
  });
});

test.describe('A-42 Home results slide: Her Power stays undated (the width budget)', () => {
  // WP161-B: "Her Power (2023–2025): …" was applied and built; it wrapped at 1280 px and left slide 1 with 57 px unused (tests/hero-slider.spec.ts allows 48),
  // so, as the review row says, the row stays undated and is recorded as accepted rather than shortening the owner's wording.
  test('the program-record line reads "Her Power: … tracked in work (…%); … trained directly." and the source records why', () => {
    const t = main(HOME);
    expect(t).toMatch(/Her Power: [\d,]+ of [\d,]+ tracked in work \(\d+%\); [\d,]+ trained directly\./);
    expect(t).not.toContain('Her Power (2023–2025):');
    expect(readFileSync('src/data/heroSlides.ts', 'utf8')).toMatch(/WP161-B \(Fable review A-42[^\n]*stays undated \(accepted\)/);
  });
});

test.describe('A-43 Impact evidence ladder: the Program Record rung', () => {
  test('names "CodersTrust program records or the partner’s own reports"', () => {
    expect(main(IMPACT)).toContain(
      'What each named program recorded (in work, or a first job within three months), from CodersTrust program records or the partner’s own reports.',
    );
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Owner answers of 2 November 2026 (WP160-A items 1 to 4; WP160-C items 1 and 2)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('O1 Aziz Ahmad: the awards named by their issuers; "chaired" the chamber', () => {
  test('the NOVA Award sentence names the World Green Energy Symposium and says "chaired"', () => {
    const t = main(AZIZ);
    expect(t).toContain(
      'He received the World Green Energy Symposium’s NOVA Award in 2022 for his contribution to the green technology industry and chaired the U.S.-Bangladesh Global Chamber of Commerce.',
    );
    expect(t).not.toContain('chairs the U.S.-Bangladesh Global Chamber of Commerce');
  });

  test('the UTC Associates sentence names the 2019 Con Edison award and the 2022 NYNJMSDC award', () => {
    expect(main(AZIZ)).toContain(
      'UTC Associates, a technology consulting company that he leads, received Con Edison’s Minority Business Entrepreneur of the Year award in 2019 and the NYNJMSDC Partnership Award from the New York & New Jersey Minority Supplier Development Council on October 20, 2022.',
    );
  });

  test('the 2019 award photograph: the caption and the alt text name Con Edison’s award for UTC Associates', () => {
    const raw = mainRaw(AZIZ);
    const fig = /<figure[^>]*>(?:(?!<\/figure>)[\s\S])*?data-asset="legacy-recognition-supply-chain-award"[\s\S]*?<\/figure>/.exec(raw)?.[0] ?? '';
    expect(fig, 'the award photograph is in the gallery').not.toBe('');
    expect(visible(/<figcaption[\s\S]*?<\/figcaption>/.exec(fig)?.[0] ?? '')).toBe('Aziz Ahmad receiving Con Edison’s Minority Business Entrepreneur of the Year award for UTC Associates, 2019');
    const alt = decode(/<img[^>]*\balt="([^"]*)"/.exec(fig)?.[1] ?? '');
    expect(alt).toContain('Con Edison’s Minority Business Entrepreneur of the Year award for UTC Associates');
    expect(alt).toContain('framed certificate'); // what the photograph shows (the four men stand in front of the stage, not on it)
  });

  test('"Supply Chain Diversity and Sustainability Excellence Award" is on no built page (text, attributes or JSON-LD)', () => {
    expect(pagesWithRaw('Supply Chain Diversity and Sustainability Excellence Award')).toEqual([]);
  });
});

test.describe('O2 Md. Shamsul Haque: former Additional Secretary, Ministry of Foreign Affairs of Bangladesh', () => {
  test('his bio uses the owner’s title', () => {
    expect(main(SHAMSUL)).toContain('Md. Shamsul Haque is the CEO of CodersTrust Bangladesh and a former Additional Secretary, Ministry of Foreign Affairs of Bangladesh.');
  });

  test('the America Week, Ostitto and Akij posts use the same title', () => {
    expect(main(AMERICA_WEEK)).toContain('CEO Md. Shamsul Haque, former Additional Secretary, Ministry of Foreign Affairs of Bangladesh, and his team');
    expect(main(OSTITTO)).toContain('Mr. Shamsul Haque, CEO of CodersTrust Bangladesh and former Additional Secretary, Ministry of Foreign Affairs of Bangladesh, emphasized');
    expect(main(AKIJ)).toContain('Md. Shamsul Haque, CEO of CodersTrust Bangladesh and former Additional Secretary, Ministry of Foreign Affairs of Bangladesh.');
  });

  test('"Additional Foreign Secretary" is on no built page', () => {
    expect(pagesWithRaw('Additional Foreign Secretary')).toEqual([]);
  });
});

test.describe('O3 Ferdinand Kjærulff: passed away in 2023', () => {
  test('the bio says "passed away in 2023", without a month', () => {
    const t = main(FERDINAND);
    expect(t).toContain('Ferdinand passed away in 2023 after living with cancer.');
    expect(pagesWithRaw('February 2023')).toEqual([]);
  });

  test('his Person JSON-LD keeps a deathDate of 2023 and names no current employer', () => {
    const person = [...html(FERDINAND).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap((m) => {
        const j = JSON.parse(m[1]);
        return (Array.isArray(j) ? j : j['@graph'] ?? [j]) as Array<Record<string, unknown>>;
      })
      .find((n) => n['@type'] === 'Person' && String(n['@id'] ?? '').endsWith('/about/team/ferdinand-kjaerulff/#person'));
    expect(person, 'the profile has its Person node').toBeTruthy();
    expect(person?.deathDate).toBe('2023');
    expect(person?.worksFor).toBeUndefined();
  });
});

test.describe('O4 permissions: written consent on file (OWNER-2026-11-02-CONSENT)', () => {
  const rows = JSON.parse(readFileSync('src/data/permissions.json', 'utf8')) as Array<{ assetId: string; clearanceId: string | null; status: string; sensitiveGroup: boolean }>;
  const ASSETS = [
    // the LEEDO Peace Home photographs (the archived post and News Photographs)
    ['news-coderstrust-leedo-join-to-expands-ict-education-to-street-children', [LEEDO, NEWS_PHOTOS]],
    // the school shown in "The Man Behind CodersTrust Who Never Forgot His Roots"
    ['news-the-man-behind-coderstrust-who-never-forgot-his-roots', [MAN_BEHIND]],
    // Melissa Mannis's quote, title and portrait on Recognition
    ['endorsement-melissa-mannis', [RECOGNITION]],
  ] as const;
  for (const [assetId, pages] of ASSETS) {
    test(`${assetId}: one cleared row with clearanceId OWNER-2026-11-02-CONSENT, sensitiveGroup kept, and the asset still renders`, () => {
      const matching = rows.filter((r) => r.assetId === assetId);
      expect(matching).toHaveLength(1);
      expect(matching[0].status).toBe('cleared');
      expect(matching[0].clearanceId).toBe('OWNER-2026-11-02-CONSENT');
      expect(matching[0].sensitiveGroup).toBe(false); // the flag the row carried before (2026-11-02), kept
      for (const page of pages) expect(html(page), page).toContain(`data-asset="${assetId}"`);
    });
  }
});

test.describe('O5 UPEACE post: a CodersTrust alumna attended', () => {
  test('the update sentence follows the "Eligible students…" paragraph, and no learner is named', () => {
    const raw = mainRaw(UPEACE);
    expect(raw).toMatch(
      /<p>Eligible students within the CodersTrust network were encouraged to take this step toward shaping a better, more peaceful world\.<\/p>\s*<p>Update: A CodersTrust alumna attended the June 2026 program on a scholarship\.<\/p>/,
    );
    expect(visible(raw).split('alumna').length - 1).toBe(1);
  });

  test('the photographs stay: the hero, the activity photograph, the five gallery photographs and the News Photographs entry', () => {
    const raw = mainRaw(UPEACE);
    for (const f of ['upace-students.', 'upace-students-2.', 'upace-students-5.', 'upace-students-6.', 'upace-students-7.', 'upace-students-8.', 'upeace-students-activity.']) expect(raw, f).toContain(f);
    expect(html(NEWS_PHOTOS)).toContain('data-asset="news-coderstrust-students-invited-to-join-upeaces-young-leaders-for-peace-summer-programme-2026"');
  });
});

test.describe('O6 WSIS+20 post: neutral captions under the two trophy photographs', () => {
  const CAPTIONS: Array<[string, string, string]> = [
    ['wsis-3', 'Two men holding a golden trophy at the WSIS+20 Forum High-Level Event', 'Attendees with a trophy at the WSIS+20 Forum High-Level Event, Geneva, May 2024'],
    ['wsis-4', 'A man and a woman posing with a golden trophy at the WSIS+20 Forum', 'An award presentation on stage at the WSIS+20 Forum High-Level Event, Geneva, May 2024'],
  ];
  for (const [file, alt, caption] of CAPTIONS) {
    test(`${file}: the italic caption line "${caption}" sits directly under the photograph, whose alt text is unchanged`, () => {
      const raw = mainRaw(WSIS).replace(/&#x2B;|&#43;/g, '+');
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(raw).toMatch(new RegExp(`<p><img[^>]*alt="${esc(alt)}"[^>]*${esc(file)}\\.[^>]*></p>\\s*<p><em>${esc(caption)}</em></p>`));
    });
  }

  test('no caption or text implies a CodersTrust award', () => {
    const t = main(WSIS);
    expect(t).not.toMatch(/CodersTrust (won|receives|received|wins)/i);
    expect(t).not.toContain('Global Recognition');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// D Owner date rule
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('D Owner date rule', () => {
  const allAtLeast = (page: string, day: string) => {
    const dates = dateModifieds(page);
    expect(dates.length, `${page} has a dateModified`).toBeGreaterThan(0);
    for (const d of dates) expect(d >= day, `${page} dateModified ${d} (expected ${day} or later)`).toBe(true);
  };

  test('Package 3, 4 and 8 pages with their own date are 2026-11-02 or later (every dateModified in their JSON-LD)', () => {
    for (const page of [
      RECOGNITION, FARUQUE, ABDUL_KARIM, IN_THE_FIELD, EVALUATION, IMPACT,
      KAMAL, EDGE, HER_POWER, JAHANGIRNAGAR, ENERGY, TOP100, LEEDO, DIGITAL_FACTORY, PRESS_FREEDOM, MAN_BEHIND, BASIS, DISCOVERY, UNGA, EMBASSY, HOLONIQ, RMSTU, FUTURE,
    ]) allAtLeast(page, WP159_DAY);
  });

  test('pages changed for the owner answers are 2026-11-03 or later (every dateModified in their JSON-LD)', () => {
    for (const page of [AZIZ, SHAMSUL, FERDINAND, AKIJ, AMERICA_WEEK, OSTITTO, WSIS, UPEACE]) allAtLeast(page, OWNER_DAY);
  });

  test('the team profiles changed here have their own dateModified entries, not the build date', () => {
    const src = readFileSync('src/pages/about/team/[slug].astro', 'utf8');
    const modified = (slug: string) => new RegExp(`'${slug}': '(\\d{4}-\\d{2}-\\d{2})'`).exec(src)?.[1] ?? '';
    expect(modified('faruque-hossain') >= WP159_DAY, 'faruque-hossain').toBe(true);
    expect(modified('abdul-karim') >= WP159_DAY, 'abdul-karim').toBe(true);
    for (const slug of ['aziz-ahmad', 'shamsul-haque', 'ferdinand-kjaerulff']) expect(modified(slug) >= OWNER_DAY, slug).toBe(true);
  });

  test('the news posts changed here carry their own updated date in front matter', () => {
    const updated = (slug: string) => /^updated: (\S+)$/m.exec(readFileSync(`src/content/news/${slug}.md`, 'utf8'))?.[1] ?? '';
    const slugOf = (rel: string) => rel.split('/')[1];
    for (const page of [KAMAL, EDGE, HER_POWER, JAHANGIRNAGAR, ENERGY, TOP100, LEEDO, DIGITAL_FACTORY, PRESS_FREEDOM, MAN_BEHIND, BASIS, DISCOVERY, UNGA, EMBASSY, HOLONIQ, RMSTU, FUTURE]) {
      expect(updated(slugOf(page)) >= WP159_DAY, slugOf(page)).toBe(true);
    }
    for (const page of [AKIJ, AMERICA_WEEK, OSTITTO, WSIS, UPEACE]) expect(updated(slugOf(page)) >= OWNER_DAY, slugOf(page)).toBe(true);
  });
});
