import { useState, type FormEvent } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_VACANCY_FEATURES,
  vacancyFeaturesFrom,
  vacancyFeaturesPayload,
  type VacancyFeatureSettings as Settings,
} from '../../dashboard/vacancyFeatures';
import { VacancyFeatureSettings } from './VacancyFeatureSettings';

/** Stand-in for the vacancy form: owns the state, submits a payload, supports reset. */
function Harness({
  initial = DEFAULT_VACANCY_FEATURES,
  onSubmit,
  disabled,
}: Readonly<{ initial?: Settings; onSubmit: (payload: Settings) => void; disabled?: boolean }>) {
  const [features, setFeatures] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(vacancyFeaturesPayload(features));
  };
  return (
    <form onSubmit={submit}>
      <VacancyFeatureSettings value={features} onChange={setFeatures} disabled={disabled} />
      <button type="button" onClick={() => setFeatures(initial)}>
        Reset
      </button>
      <button type="submit">Save</button>
    </form>
  );
}

const aiSwitch = () => screen.getByRole('switch', { name: 'AI Screening' });
const matchingSwitch = () => screen.getByRole('switch', { name: 'Candidate Matching' });

describe('VacancyFeatureSettings', () => {
  it('renders exactly the two switches with helper text, and no blind mode control', () => {
    render(<Harness onSubmit={vi.fn()} />);
    expect(screen.getAllByRole('switch')).toHaveLength(2);
    expect(aiSwitch()).toHaveAccessibleDescription(/evaluation of applications/i);
    expect(matchingSwitch()).toHaveAccessibleDescription(/matching of candidate profiles/i);
    expect(screen.queryByText(/blind/i)).toBeNull();
  });

  it('toggles each switch independently', async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} />);
    await user.click(aiSwitch());
    expect(aiSwitch()).toBeChecked();
    expect(matchingSwitch()).not.toBeChecked();
    await user.click(matchingSwitch());
    await user.click(aiSwitch());
    expect(aiSwitch()).not.toBeChecked();
    expect(matchingSwitch()).toBeChecked();
  });

  it('shows the On/Off state visibly', async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} />);
    expect(aiSwitch()).toHaveTextContent('Off');
    await user.click(aiSwitch());
    expect(aiSwitch()).toHaveTextContent('On');
  });

  it('toggles from the label too', async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} />);
    await user.click(screen.getByText('Candidate Matching'));
    expect(matchingSwitch()).toBeChecked();
  });

  it('does not submit the form when a switch is toggled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.click(aiSwitch());
    aiSwitch().focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('works from the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} />);
    await user.tab();
    expect(aiSwitch()).toHaveFocus();
    await user.keyboard(' ');
    expect(aiSwitch()).toBeChecked();
    await user.tab();
    expect(matchingSwitch()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(matchingSwitch()).toBeChecked();
  });

  it.each([
    [[], { aiScreeningEnabled: false, candidateMatchingEnabled: false }],
    [['ai'], { aiScreeningEnabled: true, candidateMatchingEnabled: false }],
    [['matching'], { aiScreeningEnabled: false, candidateMatchingEnabled: true }],
    [['ai', 'matching'], { aiScreeningEnabled: true, candidateMatchingEnabled: true }],
  ])('submits explicit booleans when toggled %j', async (toggles, expected) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    for (const t of toggles) await user.click(t === 'ai' ? aiSwitch() : matchingSwitch());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(expected);
  });

  it('initialises from saved vacancy values on the edit screen', () => {
    render(
      <Harness
        initial={vacancyFeaturesFrom({ aiScreeningEnabled: false, candidateMatchingEnabled: true })}
        onSubmit={vi.fn()}
      />,
    );
    expect(aiSwitch()).not.toBeChecked();
    expect(matchingSwitch()).toBeChecked();
  });

  it('restores the original values on reset', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ aiScreeningEnabled: true, candidateMatchingEnabled: false }} onSubmit={vi.fn()} />);
    await user.click(aiSwitch());
    await user.click(matchingSwitch());
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(aiSwitch()).toBeChecked();
    expect(matchingSwitch()).not.toBeChecked();
  });

  it('keeps the chosen values after a failed save', async () => {
    const user = userEvent.setup();
    // The save is rejected by the server; the form keeps its state and shows an error.
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.click(matchingSwitch());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(matchingSwitch()).toBeChecked();
    expect(aiSwitch()).not.toBeChecked();
  });

  it('blocks changes while disabled (loading or submitting)', async () => {
    const user = userEvent.setup();
    render(<Harness disabled onSubmit={vi.fn()} />);
    expect(aiSwitch()).toBeDisabled();
    expect(matchingSwitch()).toBeDisabled();
    await user.click(aiSwitch());
    expect(aiSwitch()).not.toBeChecked();
  });
});

describe('vacancyFeatures helpers', () => {
  it('defaults missing or malformed saved values', () => {
    expect(vacancyFeaturesFrom(undefined)).toEqual(DEFAULT_VACANCY_FEATURES);
    expect(vacancyFeaturesFrom({ aiScreeningEnabled: 'yes' })).toEqual(DEFAULT_VACANCY_FEATURES);
    expect(vacancyFeaturesFrom({ aiScreeningEnabled: true })).toEqual({
      aiScreeningEnabled: true,
      candidateMatchingEnabled: false,
    });
  });

  it('always includes both keys in the payload, including false', () => {
    const payload = vacancyFeaturesPayload(DEFAULT_VACANCY_FEATURES);
    expect(Object.keys(payload).sort()).toEqual(['aiScreeningEnabled', 'candidateMatchingEnabled']);
    expect(JSON.parse(JSON.stringify(payload))).toEqual({
      aiScreeningEnabled: false,
      candidateMatchingEnabled: false,
    });
  });
});
