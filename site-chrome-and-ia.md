# CodersTrust site: chrome, sitemap and cross-links (review round 5)

Source: `dist/` of origin/main 3794f5a (Merge WP12), rendered locally from the read-only build. Each of the 97 real pages was byte-compared with its live staging HTML at https://ctjobready.github.io/ctg/ : all identical (one deploy, Last-Modified Tue, 13 Oct 2026 09:18:59 GMT). Desktop menus were hover-tested at 1280 px; the mobile drawer was opened with its Menu button at 390 px.

## (a) Site chrome

### Announcement bar
- Present on 96 of 97 crawled pages (home included); distinct texts: 2.
- Label: "Announcement"
- Text: Impact Survey 2026: among surveyed completers, employment rose from 47.4% before training to 77.9% at the October 2026 survey.
- CTA: [button: See the Findings] → /ctg/impact/outcomes-2026/
- Dismiss control: "Dismiss announcement" (dismissal is stored per visitor, so the bar reappears in a fresh browser).

### Header utility links and logo
- Logo: CodersTrust — home → /ctg/
- Courses (opens jobready.global) → https://jobready.global/ (site-header__util)
- Start a Partnership → /ctg/contact/ (btn btn--outline btn--sm site-header__cta)
- Mobile menu button label: "Menu" (shown below the desktop breakpoint; visible at 390 px: true)

### Primary menu, desktop (nav.site-nav)
Mega menus are display:none until hovered or focused. Hover test result per top item:
- About: opens on hover = true (display block, 6 links visible, aria-expanded true)
- Our Model: opens on hover = true (display block, 3 links visible, aria-expanded true)
- Programs: opens on hover = true (display block, 5 links visible, aria-expanded true)
- Impact: opens on hover = true (display block, 7 links visible, aria-expanded true)
- Partner with Us: opens on hover = true (display block, 7 links visible, aria-expanded true)

- About (About menu)
  - Our Story → /ctg/about/ — How CodersTrust began and where it is heading.
  - Leadership & Team → /ctg/about/team/ — Founders, advisors and the executive team.
  - Instructors & Mentors → /ctg/about/mentors/ — The practitioners who teach and mentor learners.
  - Recognition & Media → /ctg/about/recognition/ — Awards, endorsements and press coverage.
  - Careers → /ctg/careers/ — Working at CodersTrust and how to apply.
  - Contact → /ctg/contact/ — Offices, email and phone.
  - Featured panel "Featured: From Learning to Earning, for Youth": Since 2014 | From Learning to Earning, for Youth — A workforce-development organization for the next generation of digital professionals. — CTA [button: Read Our Story] → /ctg/about/
- Our Model (Our Model menu)
  - How It Works → /ctg/our-model/ — From partner goals to employed program completers, end to end.
  - TalentLEAP → /ctg/our-model/talentleap/ — Our competency-based talent model.
  - JobReady Platform → /ctg/our-model/jobready-platform/ — Our learning and work platform, rolling out in stages.
  - Featured panel "Featured: Learn, then Earn, then Prosper": The Cycle | Learn → Earn → Prosper | cycle: Learn → Earn → Prosper — Competency development, then employment, then career advancement. — CTA [button: See How It Works] → /ctg/our-model/
- Programs (Programs menu)
  - YouthWIDE → /ctg/programs/youthwide/ — Youth digital employment: a Bangladesh national initiative and country cohorts.
  - JobReady@Campus → /ctg/programs/jobready-campus/ — Universities and colleges.
  - JobReady@Work → /ctg/programs/jobready-work/ — Corporate training and talent.
  - NU Postgraduate Diploma → /ctg/nu-postgraduate-diploma/ — Digital Marketing and ICT diplomas.
  - SuperKids → /ctg/programs/superkids/ — K-12 STEAM, robotics and coding.
  - Featured panel "Featured: Start with a Pilot": Start Small | Start with a Pilot — Launch a first cohort, measure results, then scale. — CTA [button: Explore YouthWIDE] → /ctg/programs/youthwide/
- Impact (Impact menu)
  - Impact Overview → /ctg/impact/ — Headline outcomes and the evidence ladder.
  - Outcomes 2026 → /ctg/impact/outcomes-2026/ — Findings from the Impact Survey 2026.
  - Independent Evaluation (RCT) → /ctg/impact/independent-evaluation/ — The BIGD randomized trial.
  - Case Studies → /ctg/impact/case-studies/ — Four programs with partners, in depth.
  - Success Stories → /ctg/impact/stories/ — Learners in their own words.
  - Global Reach → /ctg/impact/global-reach/ — Where our programs have run.
  - In the Field → /ctg/impact/in-the-field/ — Photographs from programs and events.
  - Featured panel "Featured: of surveyed completers employed": Impact Survey 2026 | 47.4% → 77.9% | of surveyed completers employed — Before training and at the October 2026 survey. — CTA [button: See the Findings] → /ctg/impact/outcomes-2026/
- Partner with Us (Partner with Us menu)
  - Development Partners & NGOs → /ctg/partner-with-us/development-partners/ — Evidence-led delivery for your portfolio.
  - Governments → /ctg/partner-with-us/governments/ — National programs for youth employment.
  - Foundations & CSR → /ctg/partner-with-us/foundations/ — Fund outcomes you can verify.
  - Investors → /ctg/investors/ — Thesis and traction.
  - Local Partners → /ctg/partner-with-us/local-partners/ — NGOs, colleges and chambers delivering locally.
  - Universities → /ctg/partner-with-us/universities/ — Make graduates job-ready.
  - Employers → /ctg/partner-with-us/employers/ — Train your team or hire talent.
  - Featured panel "Featured: Book a Discovery Session": A Conversation, Not a Commitment | Book a Discovery Session — Tell us your goals; we will outline a first cohort. — CTA [button: Book a Discovery Session] → mailto:contact@coderstrust.global?subject=Discovery%20session%20request%20%E2%80%94%20%5Byour%20organization%5D&body=Hello%20CodersTrust%20team%2C%0D%0A%0D%0AOrganization%3A%20%0D%0ACountry%2Fregion%3A%20%0D%0APriority%20groups%3A%20%0D%0AApprox.%20number%20of%20trainees%3A%20%0D%0APreferred%20timeline%3A%20%0D%0ATwo%20suitable%20times%20for%20a%20discovery%20conversation%3A%20%0D%0A%0D%0AThank%20you.
- News → /ctg/news/

Desktop primary nav text is identical on all crawled pages (97 pages, 1 distinct signature(s)).

### Primary menu, mobile drawer (nav.drawer__nav, opened at 390 px)
- Drawer visible after tapping Menu: true (drawer display block, visibility visible).
- About
  - Our Story → /ctg/about/
  - Leadership & Team → /ctg/about/team/
  - Instructors & Mentors → /ctg/about/mentors/
  - Recognition & Media → /ctg/about/recognition/
  - Careers → /ctg/careers/
  - Contact → /ctg/contact/
- Our Model
  - How It Works → /ctg/our-model/
  - TalentLEAP → /ctg/our-model/talentleap/
  - JobReady Platform → /ctg/our-model/jobready-platform/
- Programs
  - Programs Overview → /ctg/programs/
  - YouthWIDE → /ctg/programs/youthwide/
  - JobReady@Campus → /ctg/programs/jobready-campus/
  - JobReady@Work → /ctg/programs/jobready-work/
  - NU Postgraduate Diploma → /ctg/nu-postgraduate-diploma/
  - SuperKids → /ctg/programs/superkids/
- Impact
  - Impact Overview → /ctg/impact/
  - Outcomes 2026 → /ctg/impact/outcomes-2026/
  - Independent Evaluation (RCT) → /ctg/impact/independent-evaluation/
  - Case Studies → /ctg/impact/case-studies/
  - Success Stories → /ctg/impact/stories/
  - Global Reach → /ctg/impact/global-reach/
  - In the Field → /ctg/impact/in-the-field/
- Partner with Us
  - Partner with Us Overview → /ctg/partner-with-us/
  - Development Partners & NGOs → /ctg/partner-with-us/development-partners/
  - Governments → /ctg/partner-with-us/governments/
  - Foundations & CSR → /ctg/partner-with-us/foundations/
  - Investors → /ctg/investors/
  - Local Partners → /ctg/partner-with-us/local-partners/
  - Universities → /ctg/partner-with-us/universities/
  - Employers → /ctg/partner-with-us/employers/
- Top-level drawer links:
  - News → /ctg/news/
  - Courses (opens jobready.global) → https://jobready.global/

### Desktop vs mobile differences
- Programs: only on desktop: none; only on mobile: /ctg/programs/
- Partner with Us: only on desktop: none; only on mobile: /ctg/partner-with-us/
- Top-level groups desktop: About | Our Model | Programs | Impact | Partner with Us | News
- Top-level groups mobile: About | Our Model | Programs | Impact | Partner with Us
- Groups with differences: 2

### Footer
- Brand: CodersTrust is a workforce-development organization that trains and mentors educated, unemployed and underemployed youth in emerging markets for digital work and connects them to local, remote and global work.
- Tagline: Learn. Earn. Prosper.
- Social: Facebook (opens facebook.com) → https://www.facebook.com/coderstrustbangladesh; LinkedIn (opens linkedin.com) → https://www.linkedin.com/company/coderstrust-bangladesh; YouTube (opens youtube.com) → https://www.youtube.com/@CodersTrustBangladesh
- Column "About" → /ctg/about/
  - Our Story → /ctg/about/
  - Leadership & Team → /ctg/about/team/
  - Instructors & Mentors → /ctg/about/mentors/
  - Recognition & Media → /ctg/about/recognition/
  - Careers → /ctg/careers/
  - Contact → /ctg/contact/
- Column "Programs" → /ctg/programs/
  - YouthWIDE → /ctg/programs/youthwide/
  - JobReady@Campus → /ctg/programs/jobready-campus/
  - JobReady@Work → /ctg/programs/jobready-work/
  - NU Postgraduate Diploma → /ctg/nu-postgraduate-diploma/
  - SuperKids → /ctg/programs/superkids/
- Column "Impact" → /ctg/impact/
  - Impact Overview → /ctg/impact/
  - Outcomes 2026 → /ctg/impact/outcomes-2026/
  - Independent Evaluation (RCT) → /ctg/impact/independent-evaluation/
  - Case Studies → /ctg/impact/case-studies/
  - Success Stories → /ctg/impact/stories/
  - Global Reach → /ctg/impact/global-reach/
  - In the Field → /ctg/impact/in-the-field/
- Column "Partner with Us" → /ctg/partner-with-us/
  - Development Partners & NGOs → /ctg/partner-with-us/development-partners/
  - Governments → /ctg/partner-with-us/governments/
  - Foundations & CSR → /ctg/partner-with-us/foundations/
  - Investors → /ctg/investors/
  - Local Partners → /ctg/partner-with-us/local-partners/
  - Universities → /ctg/partner-with-us/universities/
  - Employers → /ctg/partner-with-us/employers/
- Offices:
  - CT USA, Inc. · New York: 40 Wall Street, Suite 2004, New York, NY 10005, USA; contact@coderstrust.global · +1 212 344 4111
  - CodersTrust Bangladesh · Dhaka: BSCIC Electronics Complex, Level 4, Mirpur (11 No Bus Stand), Dhaka 1216, Bangladesh; hello@coderstrustbd.com · +880 1958‑220802
- Bottom: © 2026 CodersTrust
  - Privacy → /ctg/privacy-policy/
  - Accessibility → /ctg/accessibility/
  - JobReady.global (opens jobready.global) → https://jobready.global/
- Footer text identical on all crawled pages (1 distinct signature(s)).

## (b) Sitemap (every real page, with H1 and H2 outline)

### Home
- / | H1: Turn Youth Unemployment into Digital Employment — with Evidence. | H2: What Is CodersTrust? ; What Brings You Here? ; For Too Many Graduates, a Degree Is Not Turning into a Job. ; Every Year of Waiting Costs a Cohort. ; Imagine the Next 12 Months. ; We’ve Built This Path Since 2014. ; One Path from Learning to Earning ; An Independent Randomized Trial ; Proof in Practice ; Latest News ; What You Get — and What It Means for Your Outcomes ; Questions Partners Ask ; Compare the Approaches. ; Choose Where to Start. ; Start with a Pilot. Decide on Evidence. ; Let’s Design Your First Cohort. ; What Happens After You Say Yes
### About
- /about/ | H1: About CodersTrust | H2: Built Since 2014 ; Why We Exist, and Where We Are Heading ; Where We Are Today ; From a Copenhagen Launch to National Programs ; The People Who Started It ; Four Principles Behind Every Program ; Seven Sustainable Development Goals ; Recognized by Peers, Covered by the Press ; Talk to the Team
- /about/governance/ | H1: Governance and Accountability | H2: Where to Find Us ; Who Leads CodersTrust ; How People Are Protected ; How Results Are Evidenced and Records Are Kept ; Judged by Independent Evaluators, and by You ; Questions on Safeguarding, Evidence and Funding ; What We Confirm with You in Co-Design ; Ask About Due Diligence ; From Your Question to a Clarification Call
- /about/mentors/ | H1: Instructors and Mentors | H2: Meet Some of Our Mentors ; Become a Mentor
- /about/recognition/ | H1: Recognition and Media | H2: HolonIQ South Asia EdTech 100 ; Honors Received by Aziz Ahmad ; Media Coverage, 2014 to 2016 ; In Their Words ; Where CodersTrust Has Taken Part ; Awards and Forums in Photographs ; Press Kit ; Working on a Story About Youth Employment?
- /about/team/ | H1: Leadership and Team | H2: Founders and Chair ; Advisors ; Executive Team ; Bangladesh Leadership
- /about/team/abdul-karim/ | H1: Abdul Karim | H2: More of the Team
- /about/team/asad-zaman/ | H1: Asad Zaman | H2: More of the Team
- /about/team/aziz-ahmad/ | H1: Aziz Ahmad | H2: Events, Forums and Awards ; Related News
- /about/team/fahim-sheikh/ | H1: Md. Fahim Sheikh | H2: More of the Team
- /about/team/faruque-hossain/ | H1: Faruque Hossain | H2: More of the Team
- /about/team/ferdinand-kjaerulff/ | H1: Ferdinand Kjærulff | H2: More of the Team
- /about/team/hazrat-ali-nahid/ | H1: Md. Hazrat Ali Nahid | H2: More of the Team
- /about/team/mahdee-zaman/ | H1: Mahdee Zaman | H2: More of the Team
- /about/team/mahzabin-akter/ | H1: Mahzabin Akter | H2: More of the Team
- /about/team/rezaul-karim-khan/ | H1: Rezaul Karim Khan | H2: More of the Team
- /about/team/shafqat-ullah/ | H1: Shafqat Ullah | H2: More of the Team
- /about/team/shamsul-haque/ | H1: Md. Shamsul Haque | H2: More of the Team
- /about/team/zahurul-islam/ | H1: Md. Zahurul Islam | H2: More of the Team
### Our Model
- /our-model/ | H1: How the CodersTrust Model Works | H2: One Integrated Path, from Assessment to Career ; How a Program Is Delivered ; Quality Assurance ; Safeguarding and Data Are Agreed per Program ; The Mechanism and the Platform ; Talk to Us About a First Cohort.
- /our-model/jobready-platform/ | H1: JobReady: CodersTrust’s Digital Education and Employment Platform | H2: Four Jobs, One Platform ; Rollout Status ; AI-Native Roadmap: What the Platform Is Designed to Do ; Questions About the Platform ; Fund the Platform’s Next Stage.
- /our-model/talentleap/ | H1: What Is TalentLEAP? CodersTrust’s Competency-Based Talent Development Model | H2: At a Glance ; How TalentLEAP Works ; Example: The Digital Marketing Career Path ; What Makes TalentLEAP Different ; Results from CodersTrust Programs ; Questions About TalentLEAP ; See How TalentLEAP Would Run in Your Program.
### Programs (incl. NU diploma)
- /nu-postgraduate-diploma/ | H1: Build the Digital Skills Employers Are Hiring for — After Your Degree. | H2: What Is the NU Postgraduate Diploma? ; A Degree Alone Is Not Producing Job Offers. ; Employers Are Asking for Different Skills. ; What You Can Take from the Diploma ; Delivered with National University ; The National University Postgraduate Diploma ; An Independent Randomized Trial ; How It Works in Three Steps ; Questions Applicants Ask ; Fees, Schedule and Eligibility Are Confirmed with Admissions. ; Talk to Admissions Before You Decide. ; Ready to Apply? ; What Happens Next
- /nu-postgraduate-diploma/digital-marketing/ | H1: Postgraduate Diploma in Digital Marketing | H2: For Degree Holders Who Want a Digital Career ; What You Study ; What CodersTrust Training Has Achieved ; Questions About This Course ; Apply for the Postgraduate Diploma in Digital Marketing.
- /nu-postgraduate-diploma/ict/ | H1: Postgraduate Diploma in Information & Communication Technology | H2: For Degree Holders Who Want a Digital Career ; What You Study ; What CodersTrust Training Has Achieved ; Questions About This Course ; Apply for the Postgraduate Diploma in Information & Communication Technology.
- /programs/ | H1: CodersTrust Programs | H2: What Is CodersTrust? ; Choose the Program That Fits You. ; Train, Mentor, Place and Report. ; An Independent Randomized Trial ; Not Sure Which Fits?
- /programs/jobready-campus/ | H1: Give Your Students a Practical Route into Digital Work. | H2: What Is JobReady@Campus? ; For Too Many Graduates, a Degree Is Not Turning into a Job. ; Globally, Employers Report Difficulty Finding Talent ; What Your Students Leave With ; Universities Partner with CodersTrust. ; Partnership Context ; Skills Training That Runs Beside the Academic Program ; An Independent Randomized Trial ; Proof in Practice ; Each Feature Maps to What Institutions Ask For. ; How It Works in Three Steps ; Questions Institutions Ask ; Compare the Approaches. ; Two Ways to Start a Campus Program ; Start with a Pilot. Decide on Evidence. ; Bring Industry Skills to Your Campus. ; What Happens Next
- /programs/jobready-work/ | H1: Build the Digital Capabilities Your Teams Need Now. | H2: What Is JobReady@Work? ; You Cannot Find the Digital Talent You Need. ; AI Is Changing the Skills Your Teams Need. ; What Changes for Your Team ; Employers and Partners We Work With ; A Program Built Around Your Roles ; Each Feature Maps to What Employers Ask For. ; How It Works in Three Steps ; Questions Employers Ask ; A Training Program for Your Team, and Talent When You Need It ; An Independent Randomized Trial ; Proof in Practice ; Start with a Pilot Team. Decide on Evidence. ; Tell Us About Your Team and Your Roles. ; What Happens Next
- /programs/superkids/ | H1: Help Young Learners Explore Coding, Creativity and Robotics. | H2: What Is SuperKids? ; Digital and AI Skills Are in Growing Demand. ; A Classroom with Coding, Robotics and Digital Art ; Public-Sector Agreements and a Private-Sector Partner ; How SuperKids Runs ; What Has Been Delivered, and What Is Only Agreed ; Inside SuperKids Classrooms and Events ; Questions Schools and Partners Ask ; Options Are Shaped with You in a Discovery Session. ; Bring SuperKids to Your School or Program. ; What Happens Next
- /programs/youthwide/ | H1: Prepare Educated Youth for Paid Digital Work. | H2: What Is YouthWIDE? ; For Too Many Graduates, a Degree Is Not Turning into a Job. ; Every Training Cycle Without Placement Tracking Repeats the Result. ; What a National Program Can Look Like ; A Track Record with Bangladesh’s Government ; Delivered Through the Labs and Colleges You Already Have ; Educated Young People Are Not in Work, Across Three Regions. ; Every Cohort That Trains but Does Not Lead to Work Spends the Budget for a Fraction of the Result. ; What Your Reports Will Show ; We Have Built This Path Since 2014. ; One Delivery Model, from Selection to Paid Work ; An Independent Randomized Trial ; Proof in Practice ; Each Feature Maps to What Funders and Agencies Ask For. ; Five Phases from Agreement to Parallel Cohorts ; A Sample Monthly Report, and What Your Reports Show over Time ; Classrooms, Examinations and Graduation Days ; Questions Funders and Agencies Ask ; Safeguarding, Governance and Reporting ; Compare the Approaches. ; Three Ways to Start, Sized to Your Goals ; Start with a Pilot. Decide on Evidence. ; Governments: Start with a Briefing That Fits Your Timeline. ; Funders: Talk to Us About a First Cohort. ; What Happens Next for Governments ; What Happens Next for Funders
### Impact
- /impact/ | H1: Impact and Evidence | H2: The Evidence Ladder: Four Kinds of Evidence ; Independent Evidence and Survey Results ; Four Programs, in Depth ; Go Deeper ; Contribution to the Sustainable Development Goals
- /impact/case-studies/ | H1: Case Studies: Four Programs, Results with Their Bases | H2: Read the Case Studies ; Women-Focused Programs, Side by Side ; Talk to Us About a First Cohort.
- /impact/case-studies/her-power/ | H1: Her Power: Women’s Digital Skills with the ICT Division | H2: Why This Program ; Challenges ; What CodersTrust Did ; What Happened ; A Learner Story ; From the Program ; Where the Model Runs Next ; Talk to Us About a First Cohort.
- /impact/case-studies/kosovo-women-in-online-work/ | H1: Women in Online Work, Kosovo: A 2017 Pilot with the World Bank Group | H2: Why This Program ; Challenges ; What CodersTrust Did ; What Happened ; A Learner Story ; Where the Model Runs Next ; Talk to Us About a First Cohort.
- /impact/case-studies/undp-yes-korail/ | H1: UNDP YES: Korail Youth into Freelance Work, 2017 | H2: Why This Program ; Challenges ; What CodersTrust Did ; What Happened ; A Learner Story ; From the Program ; Where the Model Runs Next ; Talk to Us About a First Cohort.
- /impact/case-studies/wsdfm-women-freelancers/ | H1: WSDFM: Women’s Skills for Freelancing, Evaluated by a Randomized Trial | H2: Why This Program ; Challenges ; What CodersTrust Did ; What Happened ; A Learner Story ; Where the Model Runs Next ; Talk to Us About a First Cohort.
- /impact/global-reach/ | H1: Global Reach: Where CodersTrust Programs Have Run | H2: Where Programs Have Run ; Selected Programs in Bangladesh ; Talk to Us About a First Cohort.
- /impact/in-the-field/ | H1: In the Field | H2: SuperKids: STEAM Learning for School Students ; Classes and Campuses: Madrasah Learners, Examinations and Graduates ; Women’s Programs: Her Power, Kosovo, Albania and WSDFM ; UNDP YES and Learner Communities ; JobReady: Campuses, Labs and Workplaces ; Leadership, Recognition and Events ; Partnerships and MoU Signings ; Recognition and Advocacy ; Partners, Programs and Events,2026 ; Partners, Programs and Events,2025 ; Partners, Programs and Events,2024 ; Partners, Programs and Events,2023 ; Partners, Programs and Events,2021–2022 ; Talk to Us About a First Cohort.
- /impact/independent-evaluation/ | H1: A Randomized Trial of CodersTrust’s Training for Women in Dhaka | H2: The Short Answer ; Evidence-and-Fit Brief ; How the Trial Worked ; What the Trial Found ; Freelancing by Classes Attended ; What It Means for Funders ; Context: How This Compares ; Questions About the Evidence ; Talk to Us About a First Cohort.
- /impact/outcomes-2026/ | H1: Impact Survey 2026: What Happened After Training | H2: Evidence Ladder and How to Read This Report ; Summary ; Who Responded ; Employment ; Speed to Earnings ; Income: Three Separate Measures ; Career Outcomes ; Main Income Source ; Learner Experience ; Completers with No Prior Income ; Methodology & Limitations ; Download the Data
- /impact/stories/ | H1: Success Stories: Learners in Their Own Words | H2: What Learners Report ; Talk to Us About a First Cohort.
### Partner with Us
- /partner-with-us/ | H1: Partner with CodersTrust | H2: Who Are You Partnering As? ; From First Conversation to First Cohort ; What Funders Receive Every Month ; Know Who You Are Contracting With ; Partner FAQs ; Let’s Find the Right Partnership.
- /partner-with-us/development-partners/ | H1: Youth Employment Results You Can Report — Not Just Training Numbers. | H2: What Is CodersTrust? ; Enrollment Targets Are Met. Employment Lags. ; Every Cohort That Trains but Does Not Lead to Work Spends the Budget for a Fraction of the Result. ; What Your Next Reporting Cycle Could Show ; We’ve Built This Path Since 2014. ; How YouthWIDE Works ; An Independent Randomized Trial ; Program Results, with the Case Studies Behind Them ; What You Get, and What It Means for Your Outcomes ; Questions Partners Ask ; Compare the Approaches. ; Choose Where to Start. ; Start with a Pilot. Decide on Evidence. ; Let’s Design Your First Cohort. ; What Happens After You Say Yes
- /partner-with-us/employers/ | H1: Upskill Your Teams for AI — and Hire Job-Ready Digital Talent. | H2: What Is CodersTrust? ; The Talent You Need Is Hard to Find. ; AI Is Changing the Skills Your Teams Need. ; What Changes for Your Team ; We’ve Built This Path Since 2014. ; JobReady@Work: Built Around Your Roles ; What You Get, and What It Means for Your Business ; Questions Employers Ask ; Compare the Approaches. ; Choose How to Work with Us. ; An Independent Randomized Trial ; Start with a Pilot Team. Decide on Evidence. ; Let’s Plan Your First Team Program. ; What Happens After You Say Yes
- /partner-with-us/foundations/ | H1: Fund a Supported Path from Learning to Earning. | H2: What Is CodersTrust? ; Grants Buy Hours. You Want Earnings. ; Every Year of Delay Is a Cohort Without a Path. ; What a Funded Cohort Could Show ; We’ve Built This Path Since 2014. ; Two Ways to Fund the Path ; An Independent Randomized Trial ; Program Results, with the Case Studies Behind Them ; What You Get, and What It Means for Your Grant ; Questions Funders Ask ; Compare the Approaches. ; Choose Where to Start. ; Start with a Pilot. Decide on Evidence. ; Let’s Explore a Funding Partnership. ; What Happens After You Say Yes
- /partner-with-us/governments/ | H1: Turn Graduates and Digital Labs into a National Digital Workforce. | H2: What Is CodersTrust? ; In Bangladesh, Graduate Unemployment Is 13.5%. ; Every Training Cycle Without Placement Tracking Repeats the Same Result. ; What Your Next Budget Cycle Could Show ; We’ve Built This Path Since 2014. ; A National Delivery Model, Built on Labs That Already Exist ; An Independent Randomized Trial ; Six Government Contracts, Scope by Scope ; The Her Power Cohort, Beside Two Other Women-Focused Programs ; What You Get, and What It Means for Your Agency ; Questions Ministries Ask ; Compare the Approaches. ; Choose Where to Start. ; Phased Rollout, with Review Gates ; Let’s Plan a First Phase with Your Ministry. ; What Happens After You Say Yes
- /partner-with-us/local-partners/ | H1: Deliver Digital-Skills Programs That Lead to Paid Work — in Your Community. | H2: What Is CodersTrust? ; Local Organizations Reach the Young People Central Programs Miss. ; Cohorts That Train but Do Not Place Cost Community Trust. ; Imagine a Cohort in Your Community. ; Delivered with a Bangladesh Team Beside You ; How a Local Partnership Works ; An Independent Randomized Trial ; Women-Focused Programs in Practice ; What You Get, and What It Means for Your Community ; How It Works in Three Steps ; Questions Local Partners Ask ; Approaches to Getting into Digital Work, and Their Trade-Offs ; Three Ways to Partner with Us ; Start with a Pilot Cohort. Decide on Evidence. ; Let’s Plan Your First Local Cohort. ; What Happens After You Say Yes
- /partner-with-us/universities/ | H1: Help Your Graduates Build Job-Ready Digital Skills. | H2: What Is CodersTrust? ; For Too Many Graduates, a Degree Is Not Turning into a Job. ; Globally, Employers Report Difficulty Finding Talent ; What Your Students Leave With ; We’ve Built This Path Since 2014. ; JobReady@Campus: Training Alongside the Degree ; An Independent Randomized Trial ; What You Get, and What It Means for Your Students ; Questions Universities Ask ; Compare the Approaches. ; Choose Where to Start. ; Start with a Pilot. Decide on Evidence. ; Let’s Bring JobReady@Campus to Your Students. ; What Happens After You Say Yes
### Investors
- /investors/ | H1: Invest in the Infrastructure of Emerging-Market Work. | H2: What Is CodersTrust? ; Skills and Work Are Not Meeting. ; The Vision: A Top-Three Platform for Emerging-Market Work ; A Record Built Since 2014, with Institutions That Reach Youth ; A Multi-Sided Model: Learn, Earn, Prosper ; An Independent Randomized Trial ; Proof in Practice ; What the Platform Does — and What It Means ; Questions Investors Ask ; Compare the Approaches. ; What You Receive ; Start with a Conversation, Not a Commitment. ; Let’s Talk About Backing the Platform. ; What Happens After You Ask
### Other top-level pages
- /accessibility/ | H1: Accessibility Statement | H2: Our Target ; What We Have Done ; The World Map ; Known Limitations ; Tell Us About a Barrier
- /careers/ | H1: Work with Us at CodersTrust | H2: A Mission You Can Measure ; What to Expect ; Where We Work ; Send a Speculative Application ; From CV to Offer ; Everyone Is Equal Here
- /contact/ | H1: Let’s Talk. | H2: Who Are You Writing As? ; Where We Work From ; What Happens Next
- /privacy-policy/ | H1: Privacy Policy | H2: In Short ; Every Service Involved ; Hosting and Server Logs ; Email Inquiries ; National University Applications ; Links to Other Sites ; Video ; Your Browser Storage ; Your Rights ; Children ; Changes and Contact
- /styleguide/ | H1: Styleguide | H2: Color Tokens ; Typography ; Buttons, Badges, Icons, Logo ; Turn Youth Unemployment into Digital Employment — at Scale. ; Inner-Page H1 with the Display-4xl Scale ; Cards ; Proof: Stats, Stories, Testimonials, Partners ; Data and Charts ; Structure: Accordion, Timeline, Steps, Model ; Band Variants ; White Band ; Airy Blue Band ; Ice Cyan Band ; Klein Impact Band ; Never Two Dark Bands in a Row ; Deep Ink Band ; CTA Band: One Primary Action ; CTA Band on Klein ; Motion and Micro-Interactions ; Facts UI ; CMF Section Bands ; Turn Youth Unemployment into Digital Employment — at Scale. ; What Is CodersTrust? ; What Brings You Here? ; For Too Many Graduates, a Degree Is Not Turning into a Job. ; Every Year of Waiting Costs a Cohort. ; Imagine the Next 12 Months. ; We’ve Built This Path Since 2014. ; One Path from Learning to Earning ; Built Around Outcomes, Not Attendance ; An Independent Randomized Trial ; Proof in Practice ; Questions Partners Ask ; Approaches to Getting into Digital Work, and Their Trade-Offs ; Three Ways to Start, Sized to Your Goals ; You Decide on Evidence, Not Promises. ; Talk to Us About a First Cohort. ; What Happens Next ; Latest News ; Partner Logos, Press and World Map
### News index
- /news/ | H1: News from CodersTrust | H2: Browse by Topic
### News posts
- /news/1000-trainees-enhancing-digital-government-economy-edge/ | H1: 1000 Trainees | Enhancing Digital Government & Economy (EDGE) | H2: OBJECTIVE ; SCOPE ; Working on Youth Employment? ; More News
- /news/1000-trainees-sheikh-kamal-ict-incubator-training/ | H1: 1000 People to Be Trained on High Demand IT Skills | Sheikh Kamal ICT Incubator Training | H2: OBJECTIVE ; SCOPE ; Working on Youth Employment? ; More News
- /news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/ | H1: 25,000+ Trainees | CodersTrust Signs Contract with Her Power: Empowerment of Women Through ICT Frontier Initiative | H2: OBJECTIVE ; SCOPE ; Working on Youth Employment? ; More News
- /news/a-proud-milestone-for-coderstrust/ | H1: A Proud Milestone for CodersTrust! | H2: U.S. Embassy Dhaka and CodersTrust Celebrate a Successful “Great American Treasure Hunt” Marking America’s 250th Anniversary ; Working on Youth Employment? ; More News
- /news/aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day/ | H1: Enhanced Technology Skills Can Ensure Peace, Says Aziz Ahmad | H2: Working on Youth Employment? ; More News
- /news/aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador/ | H1: Aziz Ahmad, Co-Founder and Global Chairman of CodersTrust, Appointed as Global UPEACE Ambassador | H2: Working on Youth Employment? ; More News
- /news/aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states/ | H1: Bangladeshi Philanthropist Aziz Ahmad Honored with NYNJMSDC Partnership Award in the United States | H2: Working on Youth Employment? ; More News
- /news/celebrating-america-week-with-the-u-s-embassy-dhaka/ | H1: Celebrating America Week with the U.S. Embassy Dhaka | H2: Working on Youth Employment? ; More News
- /news/coderstrust-and-basis-asset-collaborate-to-build-bangladeshs-it-future/ | H1: CodersTrust and BASIS-ASSET Collaborate to Build Bangladesh’s IT Future | H2: Working on Youth Employment? ; More News
- /news/coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment/ | H1: CodersTrust and DoICT Shaping a Smart Future Through Trainer Empowerment | H2: Empowering the Digital Workforce: CodersTrust Bangladesh Successfully Concludes Training of Trainers (ToT) Program in Collaboration with DoICT ; Working on Youth Employment? ; More News
- /news/coderstrust-attends-wsis20-forum-high-level-event/ | H1: CodersTrust Attends WSIS+20 Forum High-Level Event | H2: Working on Youth Employment? ; More News
- /news/coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide/ | H1: CodersTrust Bangladesh and Ostitto Join Forces to Bridge the Digital Divide | H2: Working on Youth Employment? ; More News
- /news/coderstrust-bangladesh-partners-with-us-based-remoteintegrity-llc-to-expand-global-career-opportunities/ | H1: CodersTrust Bangladesh Partners with US-Based RemoteIntegrity, to Expand Global Career Opportunities | H2: Working on Youth Employment? ; More News
- /news/coderstrust-bangladesh-signs-strategic-mou-with-base-study-concern-to-enhance-global-education-opportunities/ | H1: CodersTrust Bangladesh Signs Strategic MoU with Base Study Concern to Enhance Global Education Opportunities | H2: Working on Youth Employment? ; More News
- /news/coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners/ | H1: CodersTrust Brings Discovery Education, the Global Leader of STEM Education, to Bangladeshi Schools and Learners | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation/ | H1: CodersTrust Chairman and Co-Founder Aziz Ahmad Encourages RMSTU Graduates to Build Global Careers | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-and-co-founder-aziz-ahmad-participates-in-u-s-energy-security-panel/ | H1: CodersTrust Chairman and Co-Founder Aziz Ahmad Participates in U.S. Energy Security Panel | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-aziz-ahmad-meets-bangladesh-foreign-affairs-minister-khalilur-rahman/ | H1: CodersTrust Chairman Aziz Ahmad Meets Bangladesh Foreign Affairs Minister Khalilur Rahman | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership/ | H1: CodersTrust Chairman Aziz Ahmad Visits City College Downtown to Explore Global Partnership | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c/ | H1: CodersTrust Chairman Mr. Aziz Ahmad Joins BCIU Roundtable in Washington, DC | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-mr-aziz-ahmad-leads-delegation-to-u-s-embassy-to-discuss-youth-empowerment/ | H1: CodersTrust Chairman Mr. Aziz Ahmad Leads Delegation to U.S. Embassy to Discuss Youth Empowerment | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii/ | H1: CodersTrust Chairman Mr. Aziz Ahmad Receives SDG Lifetime Achievement Award from the UNGSII Foundation | H2: Working on Youth Employment? ; More News
- /news/coderstrust-chairman-mr-aziz-ahmad-speaks-on-cybersecurity-artificial-intelligence-at-united-nations-general-assembly-unga-2025/ | H1: CodersTrust Chairman Mr. Aziz Ahmad Speaks on Cybersecurity & Artificial Intelligence at UNGA 2025 | H2: Working on Youth Employment? ; More News
- /news/coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia/ | H1: CodersTrust Earns Recognition Among Top 100 EdTech Companies in South Asia | H2: Working on Youth Employment? ; More News
- /news/coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad/ | H1: Aziz Ahmad Joins the Jahangirnagar University MoU Signing | H2: Working on Youth Employment? ; More News
- /news/coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration/ | H1: CodersTrust Partners Up with University for Peace (UPEACE) to Offer Next Generation Skills Training for Global Development and Peace in the Digital Era | H2: About CodersTrust ; About University for Peace ; Working on Youth Employment? ; More News
- /news/coderstrust-leedo-join-to-expands-ict-education-to-street-children/ | H1: CodersTrust and LEEDO Collaborate to Extend ICT Education to Street Children, Empowering the Underprivileged | H2: Working on Youth Employment? ; More News
- /news/coderstrust-organizes-career-carnival-for-students-and-affiliates/ | H1: CodersTrust Organizes Career Carnival for Students and Affiliates | H2: Working on Youth Employment? ; More News
- /news/coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia/ | H1: CodersTrust Provides Corporate Training to Akij Group, One of the Largest Conglomerates of South Asia | H2: Akij Group Receives Training on Modern Corporate Skills, Digital Marketing and Soft Skills ; Working on Youth Employment? ; More News
- /news/coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100/ | H1: CodersTrust Recognized Among HolonIQ’s 2024 South Asia EdTech 100 | H2: Working on Youth Employment? ; More News
- /news/coderstrust-seals-groundbreaking-mou-with-nctb-paving-the-way-for-competency-based-learning-opportunities/ | H1: CodersTrust Seals Groundbreaking MoU with NCTB, Paving the Way for Competency-Based Learning Opportunities | H2: CodersTrust and Bangladesh’s National Curriculum and Textbook Board Forge a Partnership to Develop World-Class Competency-Based Experiential Learning Programs for 25 Million Students Countrywide. ; Working on Youth Employment? ; More News
- /news/coderstrust-students-invited-to-join-upeaces-young-leaders-for-peace-summer-programme-2026/ | H1: CodersTrust Students Invited to Join UPEACE’s “Young Leaders for Peace” Summer Programme 2026 | H2: About the Program ; Program Details ; Why This Matters ; A Pathway to Global Leadership ; Take the Next Step ; More Photographs ; Working on Youth Employment? ; More News
- /news/coderstrust-teaching-you-freelancing-the-right-way/ | H1: CodersTrust Revolutionizes Training for Freelancing Career: Teaching You the Right Way to Succeed | H2: Working on Youth Employment? ; More News
- /news/coderstrust-visited-bimstec-headquarter/ | H1: CodersTrust Visited BIMSTEC Headquarters: Highlights Potential for Science, Technology, and Innovation Cooperation | H2: Working on Youth Employment? ; More News
- /news/empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation/ | H1: Empowering Women in Digital Economy: Certificate Giving Ceremony by CodersTrust with Joyeeta Foundation | H2: Working on Youth Employment? ; More News
- /news/gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform/ | H1: Gardiner Emphasizes on Skill Development and Access to US Digital Platform for Bangladesh | H2: Working on Youth Employment? ; More News
- /news/harnessing-socio-technology-for-positive-impact-and-unity-globally/ | H1: Harnessing Socio-Technology for Positive Impact and Unity Globally | H2: CodersTrust Creates Digital Spaces That Actively Contribute to Building and Sustaining Harmony by Transforming Conflicts on a Global Scale ; Working on Youth Employment? ; More News
- /news/mou-signed-between-bangladesh-petroleum-institute-bpi-and-coderstrust/ | H1: MoU Signed Between Bangladesh Petroleum Institute (BPI) and CodersTrust | H2: Working on Youth Employment? ; More News
- /news/mou-signing-ceremony-between-north-south-university-coderstrust/ | H1: MoU Signing Ceremony Between North South University & CodersTrust | H2: Working on Youth Employment? ; More News
- /news/the-future-building-a-digital-factory-for-bangladesh/ | H1: The Future: Building a Digital Factory for Bangladesh | H2: Working on Youth Employment? ; More News
- /news/the-man-behind-coderstrust-who-never-forgot-his-roots/ | H1: The Man Behind CodersTrust Who Never Forgot His Roots | H2: For CodersTrust Chairman Aziz Ahmad, True Wealth Lies in Changing Lives ; Working on Youth Employment? ; More News
- /news/why-we-call-it-a-digital-factory/ | H1: Why We Call It a Digital Factory | H2: Working on Youth Employment? ; More News

## (c) Internal page links from <main>, non-news pages (deduplicated, self-links removed)

- / → /partner-with-us/development-partners/, /partner-with-us/governments/, /partner-with-us/foundations/, /impact/, /investors/, /partner-with-us/local-partners/, /partner-with-us/universities/, /partner-with-us/employers/, /nu-postgraduate-diploma/, /about/governance/, /our-model/talentleap/, /about/team/, /our-model/, /impact/outcomes-2026/, /impact/independent-evaluation/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/her-power/, /news/coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership/, /news/aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador/, /news/the-man-behind-coderstrust-who-never-forgot-his-roots/, /news/, /programs/youthwide/, /programs/jobready-campus/, /programs/jobready-work/, /programs/superkids/, /partner-with-us/
- /about/ → /, /impact/, /about/team/, /about/team/aziz-ahmad/, /about/team/ferdinand-kjaerulff/, /our-model/, /impact/independent-evaluation/, /about/governance/, /about/recognition/
- /about/governance/ → /, /about/, /about/team/aziz-ahmad/, /about/team/shamsul-haque/, /about/team/, /impact/independent-evaluation/, /impact/
- /about/mentors/ → /, /about/, /our-model/talentleap/
- /about/recognition/ → /, /about/, /news/, /news/aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador/, /news/coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii/, /news/aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states/, /about/team/aziz-ahmad/, /news/aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day/, /news/coderstrust-attends-wsis20-forum-high-level-event/, /news/coderstrust-chairman-mr-aziz-ahmad-speaks-on-cybersecurity-artificial-intelligence-at-united-nations-general-assembly-unga-2025/, /news/coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c/, /impact/  [assets: /press-kit/coderstrust-wordmark.svg, /press-kit/coderstrust-wordmark.png, /press-kit/coderstrust-wordmark-white.svg, /press-kit/coderstrust-wordmark-white.png, /press-kit/coderstrust-monogram.svg, /press-kit/coderstrust-monogram.png]
- /about/team/ → /, /about/, /about/team/aziz-ahmad/, /about/team/ferdinand-kjaerulff/, /about/team/faruque-hossain/, /about/team/abdul-karim/, /about/team/shamsul-haque/, /about/team/mahdee-zaman/, /about/team/shafqat-ullah/, /about/team/asad-zaman/, /about/team/rezaul-karim-khan/, /about/team/hazrat-ali-nahid/, /about/team/fahim-sheikh/, /about/team/zahurul-islam/, /about/team/mahzabin-akter/, /about/governance/
- /about/team/abdul-karim/ → /, /about/, /about/team/, /about/team/faruque-hossain/, /about/team/aziz-ahmad/, /about/team/ferdinand-kjaerulff/
- /about/team/asad-zaman/ → /, /about/, /about/team/, /about/team/shamsul-haque/, /about/team/mahdee-zaman/, /about/team/shafqat-ullah/
- /about/team/aziz-ahmad/ → /, /about/, /about/team/, /news/coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership/, /news/aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador/, /news/the-man-behind-coderstrust-who-never-forgot-his-roots/, /news/
- /about/team/fahim-sheikh/ → /, /about/, /about/team/, /about/team/hazrat-ali-nahid/, /about/team/zahurul-islam/, /about/team/mahzabin-akter/
- /about/team/faruque-hossain/ → /, /about/, /about/team/, /about/team/abdul-karim/, /about/team/aziz-ahmad/, /about/team/ferdinand-kjaerulff/
- /about/team/ferdinand-kjaerulff/ → /, /about/, /about/team/, /about/team/aziz-ahmad/, /about/team/shamsul-haque/, /about/team/faruque-hossain/
- /about/team/hazrat-ali-nahid/ → /, /about/, /about/team/, /about/team/fahim-sheikh/, /about/team/zahurul-islam/, /about/team/mahzabin-akter/
- /about/team/mahdee-zaman/ → /, /about/, /about/team/, /about/team/shamsul-haque/, /about/team/shafqat-ullah/, /about/team/asad-zaman/
- /about/team/mahzabin-akter/ → /, /about/, /about/team/, /about/team/hazrat-ali-nahid/, /about/team/fahim-sheikh/, /about/team/zahurul-islam/
- /about/team/rezaul-karim-khan/ → /, /about/, /about/team/, /about/team/shamsul-haque/, /about/team/mahdee-zaman/, /about/team/shafqat-ullah/
- /about/team/shafqat-ullah/ → /, /about/, /about/team/, /about/team/shamsul-haque/, /about/team/mahdee-zaman/, /about/team/asad-zaman/
- /about/team/shamsul-haque/ → /, /about/, /about/team/, /about/team/mahdee-zaman/, /about/team/shafqat-ullah/, /about/team/asad-zaman/
- /about/team/zahurul-islam/ → /, /about/, /about/team/, /about/team/hazrat-ali-nahid/, /about/team/fahim-sheikh/, /about/team/mahzabin-akter/
- /our-model/ → /, /impact/, /our-model/talentleap/, /about/governance/, /our-model/jobready-platform/
- /our-model/jobready-platform/ → /, /our-model/, /our-model/talentleap/
- /our-model/talentleap/ → /, /our-model/, /impact/outcomes-2026/, /impact/independent-evaluation/
- /nu-postgraduate-diploma/ → /, /nu-postgraduate-diploma/digital-marketing/, /nu-postgraduate-diploma/ict/, /impact/outcomes-2026/
- /nu-postgraduate-diploma/digital-marketing/ → /, /nu-postgraduate-diploma/, /about/mentors/, /impact/outcomes-2026/
- /nu-postgraduate-diploma/ict/ → /, /nu-postgraduate-diploma/, /about/mentors/, /impact/outcomes-2026/
- /programs/ → /, /programs/youthwide/, /programs/jobready-campus/, /programs/jobready-work/, /nu-postgraduate-diploma/, /programs/superkids/, /impact/, /impact/independent-evaluation/
- /programs/jobready-campus/ → /, /programs/, /our-model/talentleap/, /impact/outcomes-2026/, /impact/independent-evaluation/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/her-power/, /impact/
- /programs/jobready-work/ → /, /programs/, /our-model/talentleap/, /impact/outcomes-2026/, /impact/independent-evaluation/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/her-power/
- /programs/superkids/ → /, /programs/, /our-model/talentleap/
- /programs/youthwide/ → /, /programs/, /our-model/talentleap/, /our-model/, /impact/outcomes-2026/, /impact/independent-evaluation/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/her-power/, /about/governance/, /impact/
- /impact/ → /, /impact/independent-evaluation/, /impact/outcomes-2026/, /impact/case-studies/, /impact/stories/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/undp-yes-korail/, /impact/case-studies/her-power/, /impact/global-reach/, /impact/in-the-field/
- /impact/case-studies/ → /, /impact/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/undp-yes-korail/, /impact/case-studies/her-power/
- /impact/case-studies/her-power/ → /, /impact/, /impact/case-studies/, /programs/youthwide/
- /impact/case-studies/kosovo-women-in-online-work/ → /, /impact/, /impact/case-studies/, /programs/youthwide/
- /impact/case-studies/undp-yes-korail/ → /, /impact/, /impact/case-studies/, /programs/youthwide/
- /impact/case-studies/wsdfm-women-freelancers/ → /, /impact/, /impact/case-studies/, /impact/independent-evaluation/, /programs/youthwide/
- /impact/global-reach/ → /, /impact/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/undp-yes-korail/, /impact/case-studies/her-power/, /impact/case-studies/
- /impact/in-the-field/ → /, /impact/, /news/, /impact/case-studies/
- /impact/independent-evaluation/ → /, /impact/, /partner-with-us/, /impact/outcomes-2026/
- /impact/outcomes-2026/ → /, /impact/  [assets: /data/outcomes-2026-aggregates.csv]
- /impact/stories/ → /, /impact/
- /partner-with-us/ → /, /partner-with-us/development-partners/, /partner-with-us/governments/, /partner-with-us/foundations/, /investors/, /partner-with-us/local-partners/, /partner-with-us/universities/, /partner-with-us/employers/, /contact/, /programs/youthwide/, /about/governance/, /impact/
- /partner-with-us/development-partners/ → /, /partner-with-us/, /our-model/talentleap/, /our-model/, /impact/outcomes-2026/, /impact/independent-evaluation/, /about/governance/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/her-power/, /impact/
- /partner-with-us/employers/ → /, /partner-with-us/, /our-model/talentleap/, /programs/jobready-work/, /impact/independent-evaluation/, /impact/outcomes-2026/
- /partner-with-us/foundations/ → /, /partner-with-us/, /our-model/talentleap/, /our-model/jobready-platform/, /impact/independent-evaluation/, /impact/outcomes-2026/, /about/governance/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/her-power/
- /partner-with-us/governments/ → /, /partner-with-us/, /our-model/talentleap/, /programs/youthwide/, /impact/independent-evaluation/, /impact/outcomes-2026/, /impact/case-studies/her-power/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /about/governance/
- /partner-with-us/local-partners/ → /, /partner-with-us/, /our-model/talentleap/, /our-model/, /impact/outcomes-2026/, /impact/independent-evaluation/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/her-power/
- /partner-with-us/universities/ → /, /partner-with-us/, /our-model/talentleap/, /programs/jobready-campus/, /impact/independent-evaluation/, /impact/outcomes-2026/, /impact/
- /investors/ → /, /our-model/talentleap/, /about/team/aziz-ahmad/, /about/team/ferdinand-kjaerulff/, /about/team/shamsul-haque/, /about/team/mahdee-zaman/, /about/team/shafqat-ullah/, /about/team/asad-zaman/, /about/team/rezaul-karim-khan/, /our-model/, /impact/outcomes-2026/, /impact/independent-evaluation/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/her-power/, /about/team/
- /accessibility/ → /, /impact/global-reach/
- /careers/ → /
- /contact/ → /, /about/governance/, /about/recognition/
- /privacy-policy/ → /, /about/governance/
- /styleguide/ → /, /impact/outcomes-2026/, /impact/, /impact/case-studies/, /contact/, /partner-with-us/development-partners/, /partner-with-us/governments/, /partner-with-us/foundations/, /investors/, /partner-with-us/local-partners/, /partner-with-us/universities/, /partner-with-us/employers/, /programs/, /our-model/, /news/, /about/team/, /nu-postgraduate-diploma/, /impact/stories/, /our-model/talentleap/, /impact/independent-evaluation/, /impact/case-studies/wsdfm-women-freelancers/, /impact/case-studies/kosovo-women-in-online-work/, /impact/case-studies/undp-yes-korail/, /impact/case-studies/her-power/, /partner-with-us/, /news/coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership/, /news/aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador/, /news/the-man-behind-coderstrust-who-never-forgot-his-roots/
- /news/ → /, /news/coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership/, /news/coderstrust-chairman-aziz-ahmad-meets-bangladesh-foreign-affairs-minister-khalilur-rahman/, /news/celebrating-america-week-with-the-u-s-embassy-dhaka/, /news/aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador/, /news/the-man-behind-coderstrust-who-never-forgot-his-roots/, /news/a-proud-milestone-for-coderstrust/, /news/coderstrust-bangladesh-partners-with-us-based-remoteintegrity-llc-to-expand-global-career-opportunities/, /news/why-we-call-it-a-digital-factory/, /news/the-future-building-a-digital-factory-for-bangladesh/, /news/coderstrust-students-invited-to-join-upeaces-young-leaders-for-peace-summer-programme-2026/, /news/coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation/, /news/coderstrust-and-basis-asset-collaborate-to-build-bangladeshs-it-future/, /news/coderstrust-chairman-and-co-founder-aziz-ahmad-participates-in-u-s-energy-security-panel/, /news/coderstrust-bangladesh-signs-strategic-mou-with-base-study-concern-to-enhance-global-education-opportunities/, /news/mou-signed-between-bangladesh-petroleum-institute-bpi-and-coderstrust/, /news/coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c/, /news/coderstrust-chairman-mr-aziz-ahmad-speaks-on-cybersecurity-artificial-intelligence-at-united-nations-general-assembly-unga-2025/, /news/coderstrust-chairman-mr-aziz-ahmad-leads-delegation-to-u-s-embassy-to-discuss-youth-empowerment/, /news/coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii/, /news/coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100/, /news/mou-signing-ceremony-between-north-south-university-coderstrust/, /news/coderstrust-organizes-career-carnival-for-students-and-affiliates/, /news/coderstrust-attends-wsis20-forum-high-level-event/, /news/empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation/, /news/coderstrust-seals-groundbreaking-mou-with-nctb-paving-the-way-for-competency-based-learning-opportunities/, /news/harnessing-socio-technology-for-positive-impact-and-unity-globally/, /news/coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia/, /news/coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment/, /news/coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide/, /news/coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad/, /news/coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia/, /news/coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners/, /news/coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration/, /news/aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day/, /news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/, /news/coderstrust-visited-bimstec-headquarter/, /news/1000-trainees-enhancing-digital-government-economy-edge/, /news/1000-trainees-sheikh-kamal-ict-incubator-training/, /news/gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform/, /news/aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states/, /news/coderstrust-leedo-join-to-expands-ict-education-to-street-children/, /news/coderstrust-teaching-you-freelancing-the-right-way/

