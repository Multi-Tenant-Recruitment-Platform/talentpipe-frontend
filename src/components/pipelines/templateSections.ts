import type { TemplateField } from '../../dashboard/pipelineTemplate';

export interface TemplateSection {
  id: string;
  index: string;
  title: string;
  summary: string;
}

/** The editor's four sections, in order. The rail and the cards both read this. */
export const TEMPLATE_SECTIONS: TemplateSection[] = [
  {
    id: 'template-details',
    index: '01',
    title: 'Details',
    summary: 'A name job creators will recognise when they pick a pipeline for a new job.',
  },
  {
    id: 'template-stages',
    index: '02',
    title: 'Stages',
    summary:
      'Post application and onboard are fixed. Add the interview rounds this kind of role needs, in the order candidates meet them.',
  },
  {
    id: 'template-thresholds',
    index: '03',
    title: 'Screening thresholds',
    summary: 'Defaults for new jobs. Each job can adjust them when it is created.',
  },
  {
    id: 'template-matching',
    index: '04',
    title: 'Ideal-person matching',
    summary: 'Whether jobs using this template can compare applicants with an ideal-candidate profile.',
  },
];

/** Which section a field lives in — how the rail knows where an error is. */
export function sectionOf(field: TemplateField): string {
  if (field === 'name' || field === 'description') {
    return 'template-details';
  }
  if (field === 'autoThreshold' || field === 'manualThreshold') {
    return 'template-thresholds';
  }
  return 'template-stages';
}
