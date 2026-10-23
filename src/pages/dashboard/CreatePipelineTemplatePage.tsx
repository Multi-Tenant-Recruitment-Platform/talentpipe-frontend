import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelineTemplatesApi } from '../../api/pipelineTemplates';
import { TemplateForm } from '../../components/pipelines/TemplateForm';
import { emptyTemplateValues, toTemplateRequest, type TemplateFormValues } from '../../dashboard/pipelineTemplate';
import { useTakenTemplateNames } from '../../dashboard/usePipelineTemplates';

/**
 * A new pipeline template (PT-1 → PT-5). Saving lands on the template's own
 * page — the proof it exists, and where an admin reads back what they built.
 */
export function CreatePipelineTemplatePage() {
  const navigate = useNavigate();
  const takenNames = useTakenTemplateNames();
  // Once, on mount: the form owns the values from here.
  const [initialValues] = useState(emptyTemplateValues);

  async function create(values: TemplateFormValues) {
    const created = await pipelineTemplatesApi.create(toTemplateRequest(values));
    navigate(`/dashboard/pipeline-templates/${created.id}`, {
      replace: true,
      state: { notice: { tone: 'success', text: `Template “${created.name}” created.` } },
    });
  }

  return (
    <TemplateForm
      mode="create"
      initialValues={initialValues}
      takenNames={takenNames}
      exitTo="/dashboard/pipeline-templates"
      exitLabel="Back to templates"
      onSubmit={create}
    />
  );
}
