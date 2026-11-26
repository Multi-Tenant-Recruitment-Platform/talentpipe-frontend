import { InputNumber, Select, Spin, Typography } from 'antd';
import { useMemo } from 'react';
import type { MemberSummary } from '../../api/types';
import { MAX_INTERVIEWERS, panelProblem, type InterviewPanelDraft } from '../../dashboard/jobVacancy';
import { useAssignableMembers } from '../../dashboard/useAssignableMembers';
import { FieldError } from '../ui/FieldError';

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`.trim();

/** A sentence ends in a full stop, whichever way the rule phrased it. */
const sentence = (text: string) => (text.endsWith('.') ? text : `${text}.`);

/**
 * Who interviews in each interview round: how many people the round needs,
 * then who they are.
 *
 * <p>The number comes first on purpose. It is the decision — a technical
 * round with two engineers, a final round with the hiring manager — and the
 * picker then holds exactly that many, so nobody fills a panel past what was
 * agreed.</p>
 *
 * <p>The picker searches the company as someone types: one letter is enough,
 * and any company member can be chosen whatever their role. Candidates are
 * never company members, so they never appear.</p>
 *
 * @param showShortfall also say which rounds are short — once Publish has been
 *        tried, or for a live vacancy whose panels must stay complete. Problems
 *        no state allows (more people than the number) always show.
 */
export function InterviewPanelEditor({
  panels,
  onChange,
  showShortfall,
  disabled = false,
  idPrefix = 'panel',
}: Readonly<{
  panels: InterviewPanelDraft[];
  onChange: (panels: InterviewPanelDraft[]) => void;
  showShortfall: boolean;
  disabled?: boolean;
  /** Keeps ids unique when the editor appears twice on a page. */
  idPrefix?: string;
}>) {
  if (panels.length === 0) {
    return (
      <Typography.Text type="secondary">
        This pipeline has no interview rounds, so nobody needs to be assigned.
      </Typography.Text>
    );
  }

  function change(position: number, next: Partial<InterviewPanelDraft>) {
    onChange(panels.map((panel) => (panel.stagePosition === position ? { ...panel, ...next } : panel)));
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {panels.map((panel) => (
        <PanelRound
          key={panel.stagePosition}
          panel={panel}
          problem={panelProblem(panel, showShortfall)}
          disabled={disabled}
          idPrefix={idPrefix}
          onChange={(next) => change(panel.stagePosition, next)}
        />
      ))}
    </ol>
  );
}

function PanelRound({
  panel,
  problem,
  disabled,
  idPrefix,
  onChange,
}: Readonly<{
  panel: InterviewPanelDraft;
  problem: string | null;
  disabled: boolean;
  idPrefix: string;
  onChange: (next: Partial<InterviewPanelDraft>) => void;
}>) {
  const { results, searching, error, query, search } = useAssignableMembers();
  const base = `${idPrefix}-${panel.stagePosition}`;
  const countId = `${base}-count`;
  const peopleId = `${base}-people`;
  const errorId = `${base}-error`;
  const headingId = `${base}-heading`;

  // Everyone who can be shown: the people already chosen, then the latest
  // search's answer. The chosen stay named even when a new search no longer
  // finds them.
  const people = useMemo(() => {
    const known = new Map<string, MemberSummary>();
    for (const person of panel.interviewers) {
      known.set(person.id, person);
    }
    for (const person of results) {
      if (!known.has(person.id)) {
        known.set(person.id, person);
      }
    }
    return known;
  }, [panel.interviewers, results]);

  const options = [...people.values()].map((person) => ({
    value: person.id,
    label: fullName(person),
    person,
  }));

  let notFound;
  if (searching) {
    notFound = (
      <span className="flex items-center gap-2 px-1 py-1 text-small text-slate-500">
        <Spin size="small" /> Searching…
      </span>
    );
  } else if (error) {
    notFound = <span className="px-1 py-1 text-small text-error-text">{error}</span>;
  } else if (query === '') {
    notFound = <span className="px-1 py-1 text-small text-slate-500">Type a name or email to search.</span>;
  } else {
    notFound = <span className="px-1 py-1 text-small text-slate-500">No matching team members.</span>;
  }

  const count = panel.interviewerCount;
  const chosen = panel.interviewers.length;
  const full = count !== null && chosen >= count;

  return (
    <li
      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
      aria-labelledby={headingId}
      data-testid={`interview-panel-${panel.stagePosition}`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span id={headingId} className="font-medium text-slate-900">
          {panel.stageName}
        </span>
        <span className="text-caption text-slate-500">
          {count === null ? 'Not staffed yet' : `${chosen} of ${count} chosen`}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <label htmlFor={countId} className="mb-1.5 block text-small font-medium">
            Number of interviewers
          </label>
          <InputNumber
            id={countId}
            value={count}
            min={1}
            max={MAX_INTERVIEWERS}
            precision={0}
            disabled={disabled}
            placeholder="1–10"
            className="w-full"
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? errorId : undefined}
            onChange={(next) => {
              const value = typeof next === 'number' ? next : null;
              // Clearing the number with nobody chosen leaves the round unstaffed;
              // with people chosen, they stay until someone takes them off.
              onChange({ interviewerCount: value });
            }}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={peopleId} className="mb-1.5 block text-small font-medium">
            Interviewers
          </label>
          <Select
            id={peopleId}
            mode="multiple"
            aria-label={`Interviewers for ${panel.stageName}`}
            className="w-full"
            value={panel.interviewers.map((person) => person.id)}
            options={options}
            maxCount={count ?? undefined}
            disabled={disabled || count === null}
            placeholder={count === null ? 'Set the number of interviewers first' : 'Search by name or email'}
            showSearch={{ filterOption: false, onSearch: search }}
            notFoundContent={notFound}
            optionRender={(option) => {
              const person = (option.data as { person: MemberSummary }).person;
              return (
                <span className="block min-w-0">
                  <span className="block truncate text-small text-slate-900">{fullName(person)}</span>
                  <span className="block truncate text-caption text-slate-500">
                    {[person.roleName, person.email].filter(Boolean).join(' · ')}
                  </span>
                </span>
              );
            }}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? errorId : undefined}
            onChange={(ids: string[]) => {
              onChange({
                interviewers: ids
                  .map((id) => people.get(id))
                  .filter((person): person is MemberSummary => person !== undefined),
              });
              // A pick ends that search; the next one starts from nothing.
              search('');
            }}
          />
          {!problem && full && count !== null && (
            <Typography.Text type="secondary" className="mt-1.5 block text-caption">
              The panel is full. Raise the number to add someone else.
            </Typography.Text>
          )}
        </div>
      </div>

      {problem && <FieldError id={errorId}>{sentence(problem)}</FieldError>}
    </li>
  );
}
