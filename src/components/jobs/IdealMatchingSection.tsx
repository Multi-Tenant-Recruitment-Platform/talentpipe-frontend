import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Col, Input, InputNumber, Progress, Segmented, Switch, Typography } from 'antd';
import { useState } from 'react';
import type { MatchingCategory, MatchingRequirement } from '../../api/types';
import {
  CATEGORY_LABELS,
  DEGREE_TYPE_SUGGESTIONS,
  evenOutWeights,
  isDegreeLevel,
  matchingProblems,
  newItem,
  REQUIREMENT_LABELS,
  sameName,
  seedMatching,
  suggestionsFor,
  totalWeight,
  type IdealMatchingDraft,
  type MatchingItemDraft,
  type RequirementsSource,
} from '../../dashboard/idealMatching';
import { createsVacancy } from '../../dashboard/jobVacancy';
import { CompanyChipListEditor } from '../dashboard/CompanyChipListEditor';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';
import type { VacancySectionProps } from './sectionProps';
import { vacancyGroupId, vacancyLabelId } from './vacancyFieldIds';

/**
 * Section 07: the ideal candidate AI screening scores applicants against.
 *
 * <p>Each technical skill, each tool and relevant experience take a share of
 * one 100%. Skills and tools also say must-have or preferred. Education and
 * certifications sit outside the 100%: degree types and nice-to-have
 * certifications are context for screening, never a score of their own.</p>
 *
 * <p>Switching matching on the first time fills the rows from Candidate
 * Requirements, so nothing is typed twice. Later additions there show as
 * suggestions; a row taken off stays off until someone adds it again.</p>
 *
 * <p>Only where the vacancy's pipeline template offers it. A draft can be
 * saved with the weights unfinished; Publish needs exactly 100%.</p>
 */
export function IdealMatchingSection({ values, errors, set, mode }: Readonly<VacancySectionProps>) {
  const draft = values.idealMatching;
  if (draft === null) {
    return null;
  }

  if (!values.idealMatchingAvailable) {
    const noTemplate = createsVacancy(mode) && values.pipelineTemplateId === '';
    return (
      <Col span={24}>
        <Alert tone="info">
          {noTemplate
            ? 'Choose a pipeline template first. Ideal candidate matching is available when the template offers it.'
            : 'This vacancy’s pipeline template doesn’t offer ideal candidate matching, so AI screening uses its general criteria. An admin can turn it on for the template.'}
        </Alert>
      </Col>
    );
  }

  const source: RequirementsSource = {
    requiredSkills: values.requiredSkills,
    preferredSkills: values.preferredSkills,
    toolsAndTechnologies: values.toolsAndTechnologies,
    minimumExperienceYears: values.minimumExperienceYears,
    certifications: values.certifications,
  };
  const update = (next: IdealMatchingDraft) => set('idealMatching', next);
  // Rule-breaking rows show at once; shortfalls wait until Publish has been tried.
  const problems = matchingProblems(draft, Boolean(errors.idealMatching));

  return (
    <Col span={24}>
      <div id={vacancyGroupId('idealMatching')} role="group" aria-labelledby={vacancyLabelId('idealMatching')}>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-canvas p-4">
          <div className="min-w-0">
            <span id={vacancyLabelId('idealMatching')} className="block font-medium text-slate-900">
              Use ideal candidate matching
            </span>
            <Typography.Text type="secondary" className="text-small">
              Score applicants against weighted skills, tools and experience. Off, AI screening uses its general
              criteria.
            </Typography.Text>
          </div>
          <Switch
            aria-label="Use ideal candidate matching"
            checked={draft.enabled}
            onChange={(on) => update(on ? seedMatching(draft, source) : { ...draft, enabled: false })}
          />
        </div>

        {errors.idealMatching && <FieldError id="vacancy-idealMatching-error">{errors.idealMatching}</FieldError>}

        {draft.enabled && (
          <div className="mt-4 flex flex-col gap-4">
            <WeightMeter draft={draft} onEvenOut={() => update({ ...draft, items: evenOutWeights(draft.items) })} />

            <WeightedGroup
              category="TECHNICAL_SKILL"
              draft={draft}
              source={source}
              rowProblems={problems.rows}
              onChange={update}
              emptyText="No technical skills weighted yet. Add them from Candidate requirements, or type one below."
            />
            <WeightedGroup
              category="TOOL"
              draft={draft}
              source={source}
              rowProblems={problems.rows}
              onChange={update}
              emptyText="No tools weighted yet — Docker, Git, AWS, Kubernetes, Jenkins, Azure."
            />
            <ExperienceGroup
              draft={draft}
              minimumYears={values.minimumExperienceYears}
              rowProblems={problems.rows}
              onChange={update}
            />

            <Unweighted
              draft={draft}
              education={values.education}
              requirementCertifications={values.certifications}
              onChange={update}
            />
          </div>
        )}
      </div>
    </Col>
  );
}

/* --- The 100% ------------------------------------------------------------ */

function WeightMeter({ draft, onEvenOut }: Readonly<{ draft: IdealMatchingDraft; onEvenOut: () => void }>) {
  const total = totalWeight(draft.items);
  let message: string;
  let tone: 'exact' | 'under' | 'over';
  if (total === 100) {
    message = 'The weights total 100%.';
    tone = 'exact';
  } else if (total < 100) {
    message = `${100 - total}% left to share.`;
    tone = 'under';
  } else {
    message = `${total - 100}% over — lower some weights.`;
    tone = 'over';
  }
  const colour = { exact: 'text-success-text', under: 'text-slate-600', over: 'text-error-text' }[tone];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-slate-900">Total weight</span>
          <span className="tabular-nums text-slate-900" aria-live="polite">
            <strong>{total}%</strong> of 100%
          </span>
        </div>
        <Progress
          percent={Math.min(total, 100)}
          showInfo={false}
          status={tone === 'over' ? 'exception' : tone === 'exact' ? 'success' : 'normal'}
          aria-label={`Total weight ${total}% of 100%`}
          className="m-0"
        />
        <span className={`text-caption ${colour}`}>{message}</span>
      </div>
      <Button variant="secondary" size="sm" onClick={onEvenOut} disabled={draft.items.length === 0}>
        Even out weights
      </Button>
    </div>
  );
}

/* --- Skills and tools ---------------------------------------------------- */

function WeightedGroup({
  category,
  draft,
  source,
  rowProblems,
  onChange,
  emptyText,
}: Readonly<{
  category: 'TECHNICAL_SKILL' | 'TOOL';
  draft: IdealMatchingDraft;
  source: RequirementsSource;
  rowProblems: Record<string, string>;
  onChange: (next: IdealMatchingDraft) => void;
  emptyText: string;
}>) {
  const rows = draft.items.filter((item) => item.category === category);
  const suggestions = suggestionsFor(source, draft, category);
  const noun = category === 'TOOL' ? 'tool' : 'skill';
  const headingId = `matching-${category}-heading`;

  const add = (name: string, requirement?: MatchingRequirement) =>
    onChange({ ...draft, items: [...draft.items, newItem(category, name, requirement)] });

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 id={headingId} className="m-0 text-body font-semibold text-slate-900">
          {CATEGORY_LABELS[category]}
        </h3>
        <span className="text-caption text-slate-500">
          {rows.length === 1 ? '1 item' : `${rows.length} items`} · {totalWeight(rows)}%
        </span>
      </div>

      {rows.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((item) => (
            <WeightedRow
              key={item.key}
              item={item}
              problem={rowProblems[item.key]}
              onChange={(next) =>
                onChange({ ...draft, items: draft.items.map((row) => (row.key === item.key ? next : row)) })
              }
              onRemove={() => onChange({ ...draft, items: draft.items.filter((row) => row.key !== item.key) })}
            />
          ))}
        </ul>
      ) : (
        <Typography.Text type="secondary" className="block text-small">
          {emptyText}
        </Typography.Text>
      )}

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-caption text-slate-500">Also in candidate requirements:</span>
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.name}
              variant="ghost"
              size="sm"
              onClick={() => add(suggestion.name, suggestion.requirement)}
              icon={<PlusOutlined aria-hidden className="me-1 text-[12px]" />}
              aria-label={`Add ${suggestion.name}`}
            >
              {suggestion.name}
            </Button>
          ))}
        </div>
      )}

      <AddRow noun={noun} taken={draft.items.map((item) => item.name)} onAdd={(name) => add(name)} />
    </section>
  );
}

function WeightedRow({
  item,
  problem,
  onChange,
  onRemove,
}: Readonly<{
  item: MatchingItemDraft;
  problem?: string;
  onChange: (next: MatchingItemDraft) => void;
  onRemove: () => void;
}>) {
  const errorId = `${item.key}-error`;
  return (
    <li>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto_auto]">
        <span className="min-w-0 truncate font-medium text-slate-900" title={item.name}>
          {item.name}
        </span>
        <InputNumber
          aria-label={`Weight for ${item.name}`}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? errorId : undefined}
          value={item.weight}
          min={1}
          max={100}
          precision={0}
          suffix="%"
          placeholder="0"
          className="w-full max-sm:col-span-1"
          onChange={(next) => onChange({ ...item, weight: typeof next === 'number' ? next : null })}
        />
        {item.requirement !== null && (
          <Segmented<MatchingRequirement>
            aria-label={`${item.name}: must-have or preferred`}
            size="small"
            value={item.requirement}
            options={(['MUST_HAVE', 'PREFERRED'] as const).map((value) => ({
              value,
              label: REQUIREMENT_LABELS[value],
            }))}
            onChange={(next) => onChange({ ...item, requirement: next })}
          />
        )}
        <Button variant="ghost" size="sm" onClick={onRemove} icon={<DeleteOutlined aria-hidden className="text-[14px]" />}>
          <span className="sr-only">Remove {item.name}</span>
        </Button>
      </div>
      {problem && <FieldError id={errorId}>{problem}</FieldError>}
    </li>
  );
}

function AddRow({
  noun,
  taken,
  onAdd,
}: Readonly<{ noun: 'skill' | 'tool'; taken: string[]; onAdd: (name: string) => void }>) {
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const inputId = `matching-add-${noun}`;

  function submit() {
    const name = text.trim();
    if (name === '') {
      return;
    }
    if (taken.some((other) => sameName(other, name))) {
      setProblem(`${name} is already weighted.`);
      return;
    }
    onAdd(name);
    setText('');
    setProblem(null);
  }

  return (
    <div className="mt-3">
      <label htmlFor={inputId} className="sr-only">
        Add a {noun}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={text}
          maxLength={120}
          placeholder={noun === 'tool' ? 'Add a tool, e.g. Kubernetes' : 'Add a skill, e.g. Spring Boot'}
          status={problem ? 'error' : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setProblem(null);
          }}
          onPressEnter={(event) => {
            // Enter adds the row; it must not submit the whole vacancy form.
            event.preventDefault();
            submit();
          }}
        />
        <Button variant="secondary" onClick={submit} disabled={text.trim() === ''}>
          Add
        </Button>
      </div>
      {problem && <FieldError>{problem}</FieldError>}
    </div>
  );
}

/* --- Experience ---------------------------------------------------------- */

function ExperienceGroup({
  draft,
  minimumYears,
  rowProblems,
  onChange,
}: Readonly<{
  draft: IdealMatchingDraft;
  minimumYears: number | null;
  rowProblems: Record<string, string>;
  onChange: (next: IdealMatchingDraft) => void;
}>) {
  const row = draft.items.find((item) => item.category === 'EXPERIENCE');
  const context =
    minimumYears === null
      ? 'No minimum set in Candidate requirements; screening judges experience against the job description.'
      : `Minimum ${minimumYears} ${minimumYears === 1 ? 'year' : 'years'} (from Candidate requirements).`;

  return (
    <section aria-labelledby="matching-EXPERIENCE-heading" className="rounded-lg border border-slate-200 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 id="matching-EXPERIENCE-heading" className="m-0 text-body font-semibold text-slate-900">
          {CATEGORY_LABELS.EXPERIENCE}
        </h3>
        {row && <span className="text-caption text-slate-500">{row.weight ?? 0}%</span>}
      </div>
      <Typography.Text type="secondary" className="mb-3 block text-small">
        {context}
      </Typography.Text>
      {row ? (
        <ul className="m-0 list-none p-0">
          <WeightedRow
            item={row}
            problem={rowProblems[row.key]}
            onChange={(next) =>
              onChange({ ...draft, items: draft.items.map((item) => (item.key === row.key ? next : item)) })
            }
            onRemove={() => onChange({ ...draft, items: draft.items.filter((item) => item.key !== row.key) })}
          />
        </ul>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange({ ...draft, items: [...draft.items, newItem('EXPERIENCE' as MatchingCategory, '')] })}
          icon={<PlusOutlined aria-hidden className="me-1 text-[12px]" />}
        >
          Weigh relevant experience
        </Button>
      )}
    </section>
  );
}

/* --- Outside the 100% ---------------------------------------------------- */

function Unweighted({
  draft,
  education,
  requirementCertifications,
  onChange,
}: Readonly<{
  draft: IdealMatchingDraft;
  education: string;
  requirementCertifications: string[];
  onChange: (next: IdealMatchingDraft) => void;
}>) {
  const degree = isDegreeLevel(education);
  const degreeSuggestions = DEGREE_TYPE_SUGGESTIONS.filter(
    (name) => !draft.degreeTypes.some((taken) => sameName(taken, name)),
  ).slice(0, 6);
  const certificationSuggestions = requirementCertifications.filter(
    (name) => !draft.niceToHaveCertifications.some((taken) => sameName(taken, name)),
  );

  return (
    <section aria-labelledby="matching-unweighted-heading" className="rounded-lg border border-dashed border-slate-300 p-4">
      <h3 id="matching-unweighted-heading" className="m-0 text-body font-semibold text-slate-900">
        Not part of the 100%
      </h3>
      <Typography.Text type="secondary" className="mb-4 block text-small">
        Education and certifications guide AI screening but are not weighted.
      </Typography.Text>

      <div className="flex flex-col gap-4">
        <div>
          <span className="block text-small font-medium text-slate-900">Education</span>
          <span className="block text-small text-slate-600">
            {education === '' ? 'No minimum qualification chosen in Candidate requirements.' : education}
          </span>
          {degree ? (
            <div className="mt-3">
              <CompanyChipListEditor
                id="matching-degree-types"
                label="Accepted degree types"
                placeholder="e.g. Computer Science"
                hint="The degree subjects that fit this role. Press Enter after each."
                values={draft.degreeTypes}
                onChange={(next) => onChange({ ...draft, degreeTypes: next })}
              />
              {degreeSuggestions.length > 0 && (
                <SuggestionStrip
                  label="Common:"
                  names={degreeSuggestions}
                  onAdd={(name) => onChange({ ...draft, degreeTypes: [...draft.degreeTypes, name] })}
                />
              )}
            </div>
          ) : (
            <Typography.Text type="secondary" className="mt-1 block text-caption">
              Choose a degree (Diploma or higher) as the minimum qualification to list accepted degree types.
            </Typography.Text>
          )}
        </div>

        <div>
          <CompanyChipListEditor
            id="matching-certifications"
            label="Nice-to-have certifications"
            placeholder="e.g. AWS Solutions Architect"
            hint="Certifications that count in a candidate’s favour. Press Enter after each."
            values={draft.niceToHaveCertifications}
            onChange={(next) => onChange({ ...draft, niceToHaveCertifications: next })}
          />
          {certificationSuggestions.length > 0 && (
            <SuggestionStrip
              label="Also in candidate requirements:"
              names={certificationSuggestions}
              onAdd={(name) =>
                onChange({ ...draft, niceToHaveCertifications: [...draft.niceToHaveCertifications, name] })
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function SuggestionStrip({
  label,
  names,
  onAdd,
}: Readonly<{ label: string; names: string[]; onAdd: (name: string) => void }>) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-caption text-slate-500">{label}</span>
      {names.map((name) => (
        <Button
          key={name}
          variant="ghost"
          size="sm"
          onClick={() => onAdd(name)}
          icon={<PlusOutlined aria-hidden className="me-1 text-[12px]" />}
          aria-label={`Add ${name}`}
        >
          {name}
        </Button>
      ))}
    </div>
  );
}
