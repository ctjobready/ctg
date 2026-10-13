import type { ImageMetadata } from 'astro';

/**
 * Photographs from the previous coderstrust.global site (WP2). One registry, so every use of a photo carries the same alt text and
 * the same D13 asset id ("legacy-<folder>-<name>", one row each in permissions.json). Files live in src/assets/images/pages/<key>.jpg
 * and go through astro:assets (resized, WebP).
 *
 * Alt text describes what is visible; it names a person only where the old site's own caption did.
 */
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/images/pages/**/*.jpg', { eager: true });

const ALT: Record<string, string> = {
  'general/women-learners-classroom': 'A large group of women learners seated in a training classroom, two of them taking a selfie in the foreground',
  'general/yes-trainees-group': 'Young trainees standing together for a group photograph in a training room, from the UNDP YES (Youth Employment through Skills) program',
  'general/woman-learner-laptop': 'A young woman learner working at a laptop in a training center',
  'general/students-campus-smiling': 'Smiling students seated together at a campus table, one using a laptop',
  'general/office-support-headset': 'A woman wearing a headset working at a laptop in a CodersTrust office',
  'general/computer-lab-rows': 'Rows of computers in a CodersTrust training lab',
  'general/madrasa-students-lesson': 'Students following a lesson in a classroom',
  'general/madrasa-students-class': 'Close-up of students listening in a classroom',
  'general/madrasa-students-hall': 'Rows of students seated in a large hall',
  'general/exam-hall': 'Rows of students sitting an examination in a large hall',
  'general/graduates-caps': 'Graduates in black graduation caps seated in rows at a convocation',
  'general/panel-international-forum': 'Four speakers seated at a panel table at an international forum, with a wood-paneled wall behind them',
  'general/nctb-meeting': 'CodersTrust and NCTB representatives seated around a table at the MoU meeting',
  'general/kosovo-women-screens': 'Women learners at computers in a training room in Kosovo, one in the foreground turned toward the front of the room',
  'general/albania-trainees-group': 'A group of young women and men trainees posing together in a computer room, with a caption reading CodersTrust trainees, World Bank project, Albania',
  'general/kosovo-woman-training': 'A woman learner seated at a computer among other learners in a Women in Online Work training room in Kosovo',
  'general/her-power-laptops-1': 'Women receiving laptops at a Her Power laptop distribution ceremony, in front of the event banner',
  'general/her-power-laptops-2': 'A woman in a yellow coat accepting a laptop box from a participant at a Her Power laptop distribution ceremony',
  'general/her-power-group': 'A group of women in matching purple at a Her Power program event',
  'general/dict-hitech-mou': 'Officials and CodersTrust representatives around a signing table at the agreement with the Hi-Tech Park Authority and DoICT',
  'general/empowering-women-event': 'A large audience seated in a hall under a banner for a CodersTrust Bangladesh women empowerment event',
  'general/nu-affiliation-group': 'CodersTrust and National University officials standing together for a group photograph',
  'general/nu-affiliation-meeting': 'CodersTrust and National University officials gathered around a table in a meeting room',
  'general/lab-women-screen': 'Women learners at computers in a training lab, with a large presentation screen at the front',
  'general/office-meeting': 'A meeting in a CodersTrust office, with the CodersTrust sign on the wall behind the desk',
  'general/un-panel': 'Three speakers seated at a panel table in a United Nations meeting hall',
  'general/team-tshirts': 'Members of the CodersTrust team in black CT t-shirts, smiling and making peace signs',
  'general/office-exterior': 'The CodersTrust office building and entrance in Dhaka',
  'general/learner-mosaic': 'A mosaic of portraits of CodersTrust learners and graduates',
  'general/classroom-girls': 'Girls and women learners working at computers in a bright classroom',
  'general/yes-collage': 'Four photographs of UNDP YES (Youth Employment through Skills) trainees in classrooms and group portraits',
  'superkids/mou-signing': 'Representatives of CodersTrust and a partner school at an MoU signing ceremony in front of a SuperKids backdrop',
  'superkids/mou-signing-pen': 'Two signatories at a table signing an MoU in front of a SuperKids backdrop',
  'superkids/classroom-uniform': 'Students in school uniform at a computer class with a teacher looking on',
  'superkids/students-seated': 'School students seated together in a hall, listening to a session',
  'superkids/robotics-desk': 'Students in school uniform bent over worksheets at their desks during a hands-on STEAM lesson',
  'superkids/robotics-session': 'An instructor presenting the Understanding the Robotics Essentials session to students at a STEAM workshop',
  'superkids/steam-workshop': 'An instructor and a student in school uniform at the Future Innovator STEAM workshop',
  'superkids/circuit-building': 'A SuperKids instructor guiding a student as she builds a small electronics circuit',
  'superkids/student-explains': 'An instructor holding a microphone while a student shows her project at a STEAM workshop',
  'superkids/certificate-ceremony': 'Young learners holding their certificates at a SuperKids certificate-giving ceremony',
  'superkids/art-competition': 'Three winners of a SuperKids art competition holding their trophies and gift bags in front of the event backdrop',
  'superkids/tree-planting': 'Children and organizers planting a sapling in a garden at a SuperKids event',
  'superkids/floor-activity': 'Children seated on the floor at a SuperKids creative activity session',
  'superkids/floor-activity-2': 'Children sitting on colorful mats working on a hands-on activity',
  'superkids/event-audience': 'A woman and a young boy among the audience at a SuperKids event',
  'recognition/davos-sdg-lab': 'A meeting around a conference table at the SDG Lab in Davos',
  'recognition/us-chamber': 'A roundtable meeting at the US Chamber of Commerce',
  'recognition/european-parliament': 'A speaker addressing a European Parliament committee room',
  'recognition/pope-francis': 'A man greeting Pope Francis, with a cardinal standing beside them',
  'recognition/nasdaq-sba': 'People standing at the podium of the Nasdaq closing bell ceremony for the US Small Business Administration',
  'recognition/speaking-students': 'Aziz Ahmad, Chairman and Co-Founder of CodersTrust, addressing a large audience from a stage',
  'recognition/supply-chain-award': 'Four people standing with a framed certificate on a stage, in front of a screen reading 2019 Supply Chain Diversity and Sustainability Excellence Awards',
  'nu-pgd/cybersecurity': 'PGD in Cybersecurity course banner from National University and CodersTrust',
  'nu-pgd/data-analytics': 'PGD in Data Analytics course banner from National University and CodersTrust',
  'nu-pgd/digital-marketing': 'PGD in Digital Marketing course banner from National University and CodersTrust',
  'nu-pgd/ict': 'PGD in Information and Communication Technology course banner from National University and CodersTrust',
  'nu-pgd/students-laptops': 'Students seated together at a table, one smiling toward the camera',
  'impact/her-power-training-lab': 'Women working on laptops in a Her Power training lab',
  'impact/wsdfm-training-group': 'Women trainees and a CodersTrust Bangladesh banner at a WSDFM training session',
  'about/careers-team-falgun-celebration': 'The CodersTrust Bangladesh team gathered at the office entrance for a festival celebration',
  'about/careers-team-picnic': 'A group photo of the CodersTrust Bangladesh team outdoors at a company picnic',
  'superkids/stem-group': 'A large group of children and instructors posing together on colorful floor mats in front of a SuperKids STEM Education banner',
  'superkids/hall-seated': 'Children seated on floor mats in a classroom listening to a SuperKids session, with adults standing at the back',
  'superkids/hall-seated-2': 'Children sitting on colorful mats in a classroom, some resting their chins on their hands as they listen',
  'superkids/mat-activity': 'Children kneeling and sitting on colorful floor mats, working through printed activity sheets together',
  'superkids/plaques-group': 'CodersTrust staff and guests standing together with children holding plaques, in front of a SuperKids event backdrop',
  'superkids/learner-kolika': 'Portrait of Kolika, a SuperKids learner',
  'superkids/learner-zuhaina': 'Portrait of Zuhaina, a SuperKids learner',
  'superkids/learner-nihal': 'Portrait of Nihal, a SuperKids learner',
  'superkids/learner-zaeem': 'Portrait of Zaeem, a SuperKids learner',
  'field/ccny-mou-signing': 'Two signatories seated at a table at the City College of New York and CT USA (CodersTrust) MoU ceremony, with three people applauding behind them',
  'field/team-award-presentation': 'A man in a white polo handing a trophy to a young man in a black CT t-shirt, with CodersTrust team members in white CT polos behind them',
  'field/plaque-presentation': 'A man in a navy suit presenting a framed medal in a red case to a man in a blazer, with three people standing beside them in front of a trophy cabinet',
};

/** Short caption under a photograph in the "In the field" archive: program, event or place, and a year only where the source states it. */
export const CAPTION: Record<string, string> = {
  'superkids/mou-signing': 'MoU signing for the SuperKids STEAM program with a partner school',
  'superkids/mou-signing-pen': 'Signing a SuperKids school MoU',
  'superkids/classroom-uniform': 'SuperKids computer class for school students',
  'superkids/students-seated': 'School students at a SuperKids session',
  'superkids/robotics-desk': 'Hands-on lesson, Future Innovator STEAM workshop',
  'superkids/robotics-session': 'Robotics Essentials session, SuperKids STEAM workshop',
  'superkids/steam-workshop': 'Instructor and student, Future Innovator STEAM workshop',
  'superkids/circuit-building': 'Building a small circuit with an instructor, SuperKids workshop',
  'superkids/student-explains': 'A student presents her project, SuperKids STEAM workshop',
  'superkids/certificate-ceremony': 'SuperKids certificate-giving ceremony',
  'superkids/art-competition': 'Winners of a SuperKids art competition',
  'superkids/tree-planting': 'Planting a sapling at a SuperKids event',
  'superkids/floor-activity': 'SuperKids creative activity session',
  'superkids/floor-activity-2': 'SuperKids hands-on activity',
  'superkids/event-audience': 'Guests at a SuperKids event',
  'superkids/stem-group': 'Children and instructors at a SuperKids STEM Education session',
  'superkids/hall-seated': 'SuperKids session',
  'superkids/hall-seated-2': 'SuperKids session',
  'superkids/mat-activity': 'Activity sheets on the floor mats, SuperKids session',
  'superkids/plaques-group': 'Staff, guests and children at the SuperKids art competition event',
  'superkids/learner-kolika': 'Kolika, SuperKids learner',
  'superkids/learner-zuhaina': 'Zuhaina, SuperKids learner',
  'superkids/learner-nihal': 'Nihal, SuperKids learner',
  'superkids/learner-zaeem': 'Zaeem, SuperKids learner',
  'general/madrasa-students-lesson': 'Madrasah students in a lesson',
  'general/madrasa-students-class': 'Madrasah students listening in class',
  'general/madrasa-students-hall': 'Madrasah students in a large hall',
  'general/exam-hall': 'An examination hall',
  'general/graduates-caps': 'Graduates at a convocation',
  'general/her-power-laptops-1': 'Laptop handover, Her Power distribution ceremony',
  'general/her-power-laptops-2': 'A participant receives a laptop, Her Power distribution ceremony',
  'general/her-power-group': 'Her Power program event',
  'impact/her-power-training-lab': 'Her Power training lab',
  'general/kosovo-women-screens': 'Women learners in a computer room, Kosovo',
  'general/kosovo-woman-training': 'Women in Online Work pilot, Kosovo, 2017',
  'general/albania-trainees-group': 'CodersTrust trainees, World Bank project, Albania',
  'general/yes-trainees-group': 'UNDP YES (Youth Employment through Skills) trainees, Korail',
  'general/yes-collage': 'UNDP YES (Youth Employment through Skills) trainees in class and in group portraits',
  'general/woman-learner-laptop': 'A UNDP YES graduate at her laptop',
  'general/women-learners-classroom': 'Women learners, WSDFM training classroom',
  'general/classroom-girls': 'Girls and women learners, Her Power training classroom',
  'impact/wsdfm-training-group': 'WSDFM training group',
  'general/students-campus-smiling': 'Students on campus',
  'general/lab-women-screen': 'Women learners in a training lab (BRAC STRONG IT project)',
  'general/computer-lab-rows': 'A CodersTrust training lab',
  'general/office-support-headset': 'A support team member, CodersTrust office, Dhaka',
  'general/office-meeting': 'A meeting in the CodersTrust office, Dhaka',
  'general/office-exterior': 'CodersTrust office, Dhaka',
  'general/team-tshirts': 'The CodersTrust team',
  'about/careers-team-falgun-celebration': 'The CodersTrust Bangladesh team at a festival celebration',
  'about/careers-team-picnic': 'The CodersTrust Bangladesh team at a company picnic',
  'nu-pgd/students-laptops': 'Students at a table',
  'general/learner-mosaic': 'CodersTrust learners and graduates',
  'general/dict-hitech-mou': 'Agreement with the Hi-Tech Park Authority and DoICT',
  'general/nctb-meeting': 'MoU meeting with NCTB',
  'general/nu-affiliation-group': 'Affiliation with National University',
  'general/nu-affiliation-meeting': 'Affiliation meeting with National University',
  'field/ccny-mou-signing': 'MoU signing with the City College of New York, 12 April 2024 (date on the ceremony banner)',
  'general/empowering-women-event': 'CodersTrust Bangladesh women empowerment event',
  'general/panel-international-forum': 'Panel at an international forum',
  'general/un-panel': 'Panel at the United Nations',
  'field/team-award-presentation': 'Award presentation at a CodersTrust team event',
  'field/plaque-presentation': 'Presenting a framed medal',
  'recognition/speaking-students': 'Aziz Ahmad addressing an audience',
  'recognition/davos-sdg-lab': 'SDG Lab, Davos',
  'recognition/us-chamber': 'Roundtable at the US Chamber of Commerce',
  'recognition/european-parliament': 'European Parliament committee room',
  'recognition/pope-francis': 'Meeting Pope Francis',
  'recognition/nasdaq-sba': 'Nasdaq closing bell ceremony, US Small Business Administration',
  'recognition/supply-chain-award': 'Supply Chain Diversity and Sustainability Excellence Awards, 2019 (year on the event screen)',
};


export interface Photo {
  src: ImageMetadata;
  alt: string;
  assetId: string;
  /** Short caption (program, event or place; a year only where the source states it). */
  caption?: string;
}

/** Photos that already had a D13 row under another id before the registry (see permissions.json). */
const ASSET_ID: Record<string, string> = {
  'impact/her-power-training-lab': 'case-her-power-training-lab',
  'impact/wsdfm-training-group': 'case-wsdfm-training-group',
  'about/careers-team-falgun-celebration': 'careers-team-falgun',
  'about/careers-team-picnic': 'careers-team-picnic',
};
export const assetIdFor = (key: string) => ASSET_ID[key] ?? `legacy-${key.replace(/\//g, '-')}`;

export function photo(key: string): Photo {
  const file = files[`../assets/images/pages/${key}.jpg`];
  const alt = ALT[key];
  if (!file || !alt) throw new Error(`photos: no file or alt text for "${key}"`);
  return { src: file.default, alt, assetId: assetIdFor(key), ...(CAPTION[key] && { caption: CAPTION[key] }) };
}

/**
 * Hero photograph per page, keyed by the page's `artSeed` (the key the generated hero art took). Hero.astro shows it in the
 * landscape media frame; the heading, lead and buttons stay on the hero's own surface, so text contrast is unchanged.
 */
const HERO: Record<string, string> = {
  home: 'general/women-learners-classroom',
  'programs-hub': 'general/kosovo-woman-training',
  youthwide: 'general/yes-trainees-group',
  'jobready-campus': 'general/students-campus-smiling',
  'jobready-work': 'general/office-meeting',
  nationwide: 'general/madrasa-students-lesson',
  superkids: 'superkids/steam-workshop',
  investors: 'general/lab-women-screen',
  'partner-hub': 'general/woman-learner-laptop',
  'partners-development': 'general/kosovo-women-screens',
  'partners-foundations': 'general/her-power-laptops-1',
  'partners-governments': 'general/dict-hitech-mou',
  'local-partners': 'general/empowering-women-event',
  'partners-employers': 'general/lab-women-screen',
  'partners-universities': 'general/nu-affiliation-group',
  'nu-pgd': 'general/nu-affiliation-meeting',
  'nu-cybersecurity': 'nu-pgd/cybersecurity',
  'nu-data-analytics': 'nu-pgd/data-analytics',
  'nu-digital-marketing': 'nu-pgd/digital-marketing',
  'nu-ict': 'nu-pgd/ict',
  'our-model-hub': 'general/lab-women-screen',
  'about-codertrust': 'general/office-meeting',
  governance: 'general/un-panel',
  careers: 'general/team-tshirts',
  contact: 'general/office-exterior',
  'impact-hub': 'general/her-power-group',
  'case-studies-hub': 'general/classroom-girls',
  'stories-hub': 'general/learner-mosaic',
  'field-hub': 'general/classroom-girls',
};
export const heroPhoto = (seed?: string): Photo | undefined => (seed && HERO[seed] ? photo(HERO[seed]) : undefined);

/** Three pictures for a page's "what success looks like" band (FutureBand), in vignette order. */
const FUTURE: Record<string, [string, string, string]> = {
  'nu-pgd': ['nu-pgd/students-laptops', 'general/students-campus-smiling', 'general/graduates-caps'],
  home: ['general/woman-learner-laptop', 'general/office-support-headset', 'general/lab-women-screen'],
  youthwide: ['general/woman-learner-laptop', 'general/yes-collage', 'general/classroom-girls'],
  'jobready-campus': ['general/graduates-caps', 'general/woman-learner-laptop', 'general/lab-women-screen'],
  'jobready-work': ['general/computer-lab-rows', 'general/woman-learner-laptop', 'general/lab-women-screen'],
  nationwide: ['general/lab-women-screen', 'general/classroom-girls', 'general/dict-hitech-mou'],
  superkids: ['superkids/classroom-uniform', 'superkids/circuit-building', 'superkids/mat-activity'],
  'partners-development': ['general/computer-lab-rows', 'general/yes-collage', 'general/albania-trainees-group'],
  'partners-employers': ['general/office-support-headset', 'general/computer-lab-rows', 'general/classroom-girls'],
  'partners-foundations': ['general/computer-lab-rows', 'general/woman-learner-laptop', 'general/yes-collage'],
  'partners-governments': ['general/woman-learner-laptop', 'general/office-support-headset', 'general/lab-women-screen'],
  'local-partners': ['general/computer-lab-rows', 'general/lab-women-screen', 'general/kosovo-women-screens'],
  'partners-universities': ['general/graduates-caps', 'nu-pgd/students-laptops', 'general/students-campus-smiling'],
};
export const futurePhotos = (page: string): Photo[] => (FUTURE[page] ?? []).map(photo);

/** "In the field" galleries, by page. */
const GALLERY: Record<string, string[]> = {
  superkids: ['superkids/mou-signing', 'superkids/classroom-uniform', 'superkids/robotics-desk', 'superkids/steam-workshop', 'superkids/student-explains', 'superkids/certificate-ceremony', 'superkids/art-competition', 'superkids/plaques-group', 'superkids/tree-planting', 'superkids/mou-signing-pen', 'superkids/stem-group', 'superkids/learner-kolika', 'superkids/learner-zuhaina', 'superkids/learner-nihal', 'superkids/learner-zaeem'],
  nationwide: ['general/madrasa-students-class', 'general/madrasa-students-hall', 'general/exam-hall', 'general/graduates-caps', 'general/madrasa-students-lesson', 'general/dict-hitech-mou'],
  'her-power': ['general/her-power-laptops-1', 'general/her-power-laptops-2', 'general/her-power-group'],
  'wsdfm-women-freelancers': ['general/women-learners-classroom', 'general/classroom-girls'],
  'undp-yes-korail': ['general/yes-trainees-group', 'general/woman-learner-laptop', 'general/yes-collage'],
  'kosovo-women-in-online-work': ['general/kosovo-woman-training', 'general/kosovo-women-screens'],
  'aziz-ahmad': ['recognition/speaking-students', 'recognition/davos-sdg-lab', 'recognition/us-chamber', 'recognition/european-parliament', 'recognition/pope-francis', 'recognition/nasdaq-sba', 'recognition/supply-chain-award'],
  recognition: ['recognition/supply-chain-award', 'recognition/nasdaq-sba', 'recognition/davos-sdg-lab', 'recognition/european-parliament'],
  careers: ['general/office-support-headset', 'general/computer-lab-rows', 'general/office-meeting', 'general/office-exterior'],
};
/** A gallery leaves out the photographs the same page already shows in its hero and its "what success looks like" band. */
export const galleryPhotos = (page: string): Photo[] => {
  const shown = new Set([HERO[page], ...(FUTURE[page] ?? [])].filter(Boolean));
  return (GALLERY[page] ?? []).filter((k) => !shown.has(k)).map(photo);
};

/** Photographs for the case-study cards, keyed by slug (Her Power and WSDFM keep their own, in CaseGrid). */
const CASE_CARD: Record<string, string> = {
  'wsdfm-women-freelancers': 'general/women-learners-classroom',
  'kosovo-women-in-online-work': 'general/kosovo-woman-training',
  'undp-yes-korail': 'general/yes-trainees-group',
};
export const caseCardPhoto = (slug: string): Photo | undefined => (CASE_CARD[slug] ? photo(CASE_CARD[slug]) : undefined);

/** NU Postgraduate Diploma course banners, keyed by course slug. */
export const nuBanner = (slug: string): Photo | undefined => {
  const key = `nu-pgd/${slug}`;
  return ALT[key] ? photo(key) : undefined;
};
