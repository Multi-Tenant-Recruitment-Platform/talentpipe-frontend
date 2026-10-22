import type { TemplateField } from '../../dashboard/pipelineTemplate';

/**
 * The ids that tie a template field's label, control and error together — the
 * same contract as `vacancyFieldIds.ts`, in its own module for fast refresh.
 */

export const templateFieldId = (field: TemplateField) => `template-${field.replace(/:/g, '-')}`;
export const templateErrorId = (field: TemplateField) => `${templateFieldId(field)}-error`;
export const templateHintId = (field: TemplateField) => `${templateFieldId(field)}-hint`;

/** Wires a control to its label, and to its error while it has one, else its hint. */
export function templateFieldAria(field: TemplateField, error?: string, hasHint = false) {
  return {
    id: templateFieldId(field),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? templateErrorId(field) : hasHint ? templateHintId(field) : undefined,
  } as const;
}

/** The list's search box — where focus lands when the row acted on has left the view. */
export const TEMPLATE_SEARCH_ID = 'template-search';

/** A template's ⋮ trigger on the list. */
export const templateMoreButtonId = (templateId: string) => `template-more-${templateId}`;

export const roundMoveButtonId = (key: string, direction: 'up' | 'down') => `template-round-${key}-${direction}`;
export const roundRemoveButtonId = (key: string) => `template-round-${key}-remove`;
export const ADD_ROUND_BUTTON_ID = 'template-add-round';
export const ADD_SCREENING_BUTTON_ID = 'template-add-screening';
export const REMOVE_SCREENING_BUTTON_ID = 'template-remove-screening';
