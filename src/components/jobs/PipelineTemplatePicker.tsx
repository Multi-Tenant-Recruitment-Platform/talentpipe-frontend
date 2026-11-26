import { Alert, Button, Select, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { pipelineTemplatesApi } from '../../api/pipelineTemplates';
import type { PipelineTemplateSummary } from '../../api/types';

export function PipelineTemplatePicker({
  value,
  onChange,
  error,
}: Readonly<{
  value: string;
  onChange: (template: PipelineTemplateSummary | null) => void;
  error?: string;
}>) {
  const [templates, setTemplates] = useState<PipelineTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    pipelineTemplatesApi
      .list({ includeArchived: false })
      .then((next) => {
        if (active) {
          setTemplates(next.filter((template) => template.status === 'ACTIVE'));
        }
      })
      .catch(() => {
        if (active) {
          setLoadError('We could not load pipeline templates. Try again in a moment.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const selected = templates.find((template) => template.id === value);

  return (
    <>
      <Select
        id="vacancy-recruitmentPipelineId"
        value={value || undefined}
        loading={loading}
        disabled={loading || Boolean(loadError) || templates.length === 0}
        showSearch
        optionFilterProp="label"
        notFoundContent={loading ? <Spin size="small" /> : 'No active templates found'}
        options={templates.map((template) => ({
          value: template.id,
          label: template.name,
        }))}
        placeholder="Choose a pipeline template"
        className="w-full"
        onChange={(next: string | undefined) =>
          onChange(templates.find((template) => template.id === next) ?? null)
        }
        status={error ? 'error' : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'vacancy-recruitmentPipelineId-error' : selected ? 'pipeline-template-defaults' : 'pipeline-template-help'}
      />
      {selected && (
        <Typography.Text id="pipeline-template-defaults" type="secondary" className="mt-1.5 block text-caption">
          Defaults inherited from this template: {selected.defaultAutoThreshold} auto /{' '}
          {selected.defaultManualThreshold} manual / Blind Mode {selected.blindModeEnabled ? 'ON' : 'OFF'}. You can adjust these for this vacancy.
        </Typography.Text>
      )}
      {!selected && !loadError && (
        <Typography.Text id="pipeline-template-help" type="secondary" className="mt-1.5 block text-caption">
          {loading ? 'Loading active templates…' : templates.length === 0
            ? 'No active pipeline templates are available. Create or activate a template before saving a vacancy.'
            : 'Select a template to enable Save draft and Publish vacancy.'}
        </Typography.Text>
      )}
      {loadError && <Alert className="mt-2" type="error" title={loadError}
        action={<Button size="small" onClick={() => {
          setLoading(true);
          setLoadError(null);
          setAttempt((current) => current + 1);
        }}>Retry</Button>} />}
    </>
  );
}
