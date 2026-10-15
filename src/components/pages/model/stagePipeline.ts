/**
 * The five steps of the TalentLEAP stage pipeline, in the three stages they belong to (Learn, Earn, Prosper). One source for the visible pipeline (StagePipeline.astro, on Our Model and on TalentLEAP) and for the
 * TalentLEAP page's structured data (its "How TalentLEAP Works" list), which restated the same wording by hand until WP50.
 * WP50 (cycle-25 review): the last step's second sentence is "Further TalentLEAP levels are planned." (it was "Progressive levels are planned beyond the first published level."). IN-06 and IN-08: Competent is the one published level;
 * Proficient and Expert are planned.
 */
export interface PipelineStep {
  name: string;
  icon: string;
  text: string;
}
export interface PipelineGroup {
  stage: 'Learn' | 'Earn' | 'Prosper';
  steps: PipelineStep[];
}

export const STAGE_GROUPS: PipelineGroup[] = [
  {
    stage: 'Learn',
    steps: [
      { name: 'Assess', icon: 'clipboard-check', text: 'A readiness assessment routes each applicant to a career or foundation track.' },
      { name: 'Learn', icon: 'graduation-cap', text: 'Skill units on a track set from employer demand, with hands-on labs.' },
      { name: 'Prepare for Certification', icon: 'award', text: 'Certification exam preparation, exam fee included.' },
    ],
  },
  { stage: 'Earn', steps: [{ name: 'Earn', icon: 'briefcase', text: 'Milestone-based mentoring and placement support toward the track’s work-entry goal.' }] },
  {
    stage: 'Prosper',
    steps: [{ name: 'Prosper', icon: 'trending-up', text: 'Career paths, continuing development and the alumni network. Further TalentLEAP levels are planned.' }],
  },
];

/** The steps in order, with their names and texts alone: the TalentLEAP page's structured data. */
export const STAGE_STEPS: { name: string; text: string }[] = STAGE_GROUPS.flatMap((g) => g.steps.map(({ name, text }) => ({ name, text })));
