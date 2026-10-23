import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Input, InputNumber, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  addRound,
  MAX_INTERVIEW_ROUNDS,
  MIN_INTERVIEW_ROUNDS,
  moveRound,
  removeRound,
  renameRound,
  restoreRound,
  roundBenchmarkField,
  roundNameField,
  ROUND_NAME_MAX,
  SCREENING_OPTIONAL,
  setRoundBenchmark,
  STAGE_HELP,
  STAGE_LABEL,
  type RemovedRound,
  type TemplateErrors,
  type TemplateField,
  type TemplateFormValues,
} from '../../dashboard/pipelineTemplate';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';
import { FixedTag, StageNode, StageTitle } from './StageTrack';
import {
  ADD_ROUND_BUTTON_ID,
  ADD_SCREENING_BUTTON_ID,
  REMOVE_SCREENING_BUTTON_ID,
  roundMoveButtonId,
  roundRemoveButtonId,
  templateErrorId,
  templateFieldAria,
  templateFieldId,
  templateHintId,
} from './templateFieldIds';

/** Long enough to notice and reach, short enough not to linger over the next edit. */
const UNDO_MS = 6000;

const UNDO_BUTTON_ID = 'template-round-undo';

/**
 * The stage builder (PT-2, PT-3): post application and onboard locked at the
 * ends, screening pinned after post application, and the interview rounds
 * between — named, benchmarked, added, removed and reordered.
 *
 * <p>Reordering is by Move up / Move down buttons rather than drag and drop.
 * The spec allows either; buttons work the same from a keyboard, a screen
 * reader and a phone, and need no new dependency.</p>
 *
 * <p>Removing a round asks for no confirmation. Nothing is saved until Save,
 * and an Undo sits where the round was for a few seconds — cheaper for the
 * admin than a dialog, and just as safe.</p>
 */
export function StageBuilder({
  values,
  errors,
  disabled,
  onChange,
  onBlurField,
}: Readonly<{
  values: TemplateFormValues;
  /** Only the errors that should be visible now. */
  errors: TemplateErrors;
  disabled: boolean;
  onChange: (next: TemplateFormValues) => void;
  onBlurField: (field: TemplateField) => void;
}>) {
  const [removed, setRemoved] = useState<(RemovedRound & { label: string }) | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // Where focus goes once the change it follows has rendered. A ref: it is
  // read once by the effect below and needs no render of its own.
  const pendingFocus = useRef<string | null>(null);

  const { rounds, includeScreening } = values;
  const firstRoundPosition = includeScreening ? 3 : 2;
  const onboardPosition = firstRoundPosition + rounds.length;
  const atMax = rounds.length >= MAX_INTERVIEW_ROUNDS;
  const atMin = rounds.length <= MIN_INTERVIEW_ROUNDS;

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) {
      return;
    }
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  });

  // The undo offer expires. If it was holding focus, focus moves on to the
  // next useful control instead of falling to the top of the page.
  useEffect(() => {
    if (!removed) {
      return;
    }
    const timer = window.setTimeout(() => {
      const holdingFocus = document.activeElement?.id === UNDO_BUTTON_ID;
      setRemoved(null);
      if (holdingFocus) {
        const next =
          document.getElementById(ADD_ROUND_BUTTON_ID) ??
          document.querySelector<HTMLElement>('[data-template-stages] input');
        next?.focus();
      }
    }, UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [removed]);

  function add() {
    const next = addRound(values);
    const created = next.rounds[next.rounds.length - 1];
    pendingFocus.current = templateFieldId(roundNameField(created.key));
    setAnnouncement(`${created.name} added.`);
    onChange(next);
  }

  function remove(key: string) {
    const result = removeRound(values, key);
    if (!result.removed) {
      return;
    }
    const label = result.removed.round.name.trim() || 'Interview round';
    setRemoved({ ...result.removed, label });
    pendingFocus.current = UNDO_BUTTON_ID;
    onChange(result.values);
  }

  function undo() {
    if (!removed) {
      return;
    }
    const next = restoreRound(values, removed);
    pendingFocus.current = templateFieldId(roundNameField(removed.round.key));
    setAnnouncement(`${removed.label} restored.`);
    setRemoved(null);
    onChange(next);
  }

  function move(key: string, direction: 'up' | 'down') {
    const from = rounds.findIndex((round) => round.key === key);
    const label = rounds[from]?.name.trim() || 'Interview round';
    const next = moveRound(values, key, direction);
    const to = next.rounds.findIndex((round) => round.key === key);
    // Focus stays on the button just pressed, unless the move took the row to
    // the end where that button no longer applies — then its twin.
    const edge = direction === 'up' ? to === 0 : to === next.rounds.length - 1;
    pendingFocus.current = roundMoveButtonId(key, edge ? (direction === 'up' ? 'down' : 'up') : direction);
    setAnnouncement(`${label} moved to position ${to + 1} of ${next.rounds.length} interview rounds.`);
    onChange(next);
  }

  function toggleScreening(include: boolean) {
    pendingFocus.current = include ? REMOVE_SCREENING_BUTTON_ID : ADD_SCREENING_BUTTON_ID;
    setAnnouncement(include ? 'Screening stage added.' : 'Screening stage removed.');
    onChange({ ...values, includeScreening: include });
  }

  return (
    <div>
      {/* One polite region for every move, add and restore, so no control needs its own. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ol data-template-stages className="m-0 list-none p-0" aria-label="Pipeline stages">
        <StageNode position={1} kind="fixed">
          <StageTitle aside={<FixedTag>Fixed · always first</FixedTag>}>{STAGE_LABEL.POST_APPLICATION}</StageTitle>
          <p className="m-0 mt-0.5 text-small text-slate-600">{STAGE_HELP.POST_APPLICATION}</p>
        </StageNode>

        {includeScreening ? (
          <StageNode position={2} kind="screening">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <StageTitle>{STAGE_LABEL.SCREENING}</StageTitle>
                <p className="m-0 mt-0.5 text-small text-slate-600">{STAGE_HELP.SCREENING}</p>
              </div>
              {SCREENING_OPTIONAL && (
                <Button
                  id={REMOVE_SCREENING_BUTTON_ID}
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  icon={<MinusCircleOutlined aria-hidden className="text-[14px]" />}
                  onClick={() => toggleScreening(false)}
                >
                  Remove screening
                </Button>
              )}
            </div>
          </StageNode>
        ) : (
          <li className="mb-3 ml-11 sm:ml-12">
            <button
              id={ADD_SCREENING_BUTTON_ID}
              type="button"
              disabled={disabled}
              onClick={() => toggleScreening(true)}
              className="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border border-dashed border-slate-300 bg-transparent px-4 py-3 text-left text-slate-600 transition-colors duration-(--tp-motion-base) hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <PlusOutlined aria-hidden className="text-[14px]" />
                Add screening stage
              </span>
              <span className="text-small">Scores each CV with AI before anyone is interviewed.</span>
            </button>
          </li>
        )}

        {rounds.map((round, i) => {
          const nameField = roundNameField(round.key);
          const benchmarkField = roundBenchmarkField(round.key);
          const nameError = errors[nameField];
          const benchmarkError = errors[benchmarkField];
          const groupLabelId = `template-round-${round.key}-label`;
          const label = round.name.trim() || `Interview round ${i + 1}`;

          return (
            <StageNode key={round.key} position={firstRoundPosition + i} kind="interview">
              <div role="group" aria-labelledby={groupLabelId}>
                <div className="flex items-center justify-between gap-2">
                  <p id={groupLabelId} className="m-0 text-caption font-medium uppercase tracking-caps text-slate-500">
                    Interview round {i + 1}
                    <span className="sr-only"> of {rounds.length}</span>
                  </p>
                  <div className="flex items-center gap-0.5">
                    <Tooltip title="Move up">
                      <Button
                        id={roundMoveButtonId(round.key, 'up')}
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${label} up`}
                        disabled={disabled || i === 0}
                        onClick={() => move(round.key, 'up')}
                      >
                        <ArrowUpOutlined aria-hidden className="text-[14px]" />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Move down">
                      <Button
                        id={roundMoveButtonId(round.key, 'down')}
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${label} down`}
                        disabled={disabled || i === rounds.length - 1}
                        onClick={() => move(round.key, 'down')}
                      >
                        <ArrowDownOutlined aria-hidden className="text-[14px]" />
                      </Button>
                    </Tooltip>
                    <Tooltip title={atMin ? 'A template needs at least one interview round' : 'Remove round'}>
                      {/* A disabled button fires no pointer events, so the tooltip needs a host. */}
                      <span className="inline-flex">
                        <Button
                          id={roundRemoveButtonId(round.key)}
                          size="sm"
                          variant="danger"
                          aria-label={`Remove ${label}`}
                          disabled={disabled || atMin}
                          onClick={() => remove(round.key)}
                        >
                          <DeleteOutlined aria-hidden className="text-[14px]" />
                        </Button>
                      </span>
                    </Tooltip>
                  </div>
                </div>

                <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                  <div>
                    <label htmlFor={templateFieldId(nameField)} className="mb-1.5 block font-medium">
                      Round name{' '}
                      <span aria-hidden="true" className="font-normal text-slate-400">
                        *
                      </span>
                      <span className="sr-only"> (required)</span>
                    </label>
                    <Input
                      {...templateFieldAria(nameField, nameError)}
                      value={round.name}
                      maxLength={ROUND_NAME_MAX}
                      disabled={disabled}
                      autoComplete="off"
                      onChange={(event) => onChange(renameRound(values, round.key, event.target.value))}
                      onBlur={() => onBlurField(nameField)}
                    />
                    {nameError && <FieldError id={templateErrorId(nameField)}>{nameError}</FieldError>}
                  </div>
                  <div>
                    <label htmlFor={templateFieldId(benchmarkField)} className="mb-1.5 block font-medium">
                      Benchmark{' '}
                      <span aria-hidden="true" className="font-normal text-slate-400">
                        *
                      </span>
                      <span className="sr-only"> (required, 0 to 100)</span>
                    </label>
                    <InputNumber
                      {...templateFieldAria(benchmarkField, benchmarkError, true)}
                      value={round.benchmark}
                      step={1}
                      inputMode="numeric"
                      suffix="/ 100"
                      placeholder="e.g. 70"
                      disabled={disabled}
                      className="w-full"
                      onChange={(next) =>
                        onChange(setRoundBenchmark(values, round.key, typeof next === 'number' ? next : null))
                      }
                      onBlur={() => onBlurField(benchmarkField)}
                    />
                  </div>
                </div>
                {benchmarkError ? (
                  <FieldError id={templateErrorId(benchmarkField)}>{benchmarkError}</FieldError>
                ) : (
                  <p id={templateHintId(benchmarkField)} className="m-0 mt-1.5 text-caption text-slate-500">
                    {STAGE_HELP.INTERVIEW}
                  </p>
                )}
              </div>
            </StageNode>
          );
        })}

        {removed && (
          <li className="mb-3 ml-11 sm:ml-12">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-small text-white">
              <span>
                Removed <strong>{removed.label}</strong>
              </span>
              <button
                id={UNDO_BUTTON_ID}
                type="button"
                onClick={undo}
                disabled={disabled}
                className="cursor-pointer rounded-sm border-0 bg-transparent px-2 py-1 font-semibold text-primary-200 underline underline-offset-2 hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
              >
                Undo
              </button>
            </div>
          </li>
        )}

        <li className="mb-3 ml-11 sm:ml-12">
          {atMax ? (
            <p className="m-0 rounded-lg bg-slate-50 px-4 py-3 text-small text-slate-600">
              {MAX_INTERVIEW_ROUNDS} interview rounds is the most a template can have.
            </p>
          ) : (
            <button
              id={ADD_ROUND_BUTTON_ID}
              type="button"
              disabled={disabled}
              onClick={add}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-transparent px-4 py-3 font-semibold text-slate-600 transition-colors duration-(--tp-motion-base) hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusOutlined aria-hidden className="text-[14px]" />
              Add interview round
            </button>
          )}
          {errors.rounds && <FieldError id={templateErrorId('rounds')}>{errors.rounds}</FieldError>}
        </li>

        <StageNode position={onboardPosition} kind="fixed" last>
          <StageTitle aside={<FixedTag>Fixed · always last</FixedTag>}>{STAGE_LABEL.ONBOARD}</StageTitle>
          <p className="m-0 mt-0.5 text-small text-slate-600">{STAGE_HELP.ONBOARD}</p>
        </StageNode>
      </ol>
    </div>
  );
}
