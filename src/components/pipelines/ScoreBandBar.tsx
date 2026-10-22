import {
  describeScoreBands,
  SCORE_MAX,
  SCORE_MIN,
  scoreBands,
  type ScoreBand,
} from '../../dashboard/pipelineTemplate';

const SPAN = SCORE_MAX - SCORE_MIN + 1;

/** Fill and ink per band — the token pairs the contrast suite already checks. */
const TONE: Record<ScoreBand['id'], { fill: string; swatch: string }> = {
  reject: { fill: 'bg-error-bg', swatch: 'bg-error' },
  manual: { fill: 'bg-warning-bg', swatch: 'bg-warning' },
  auto: { fill: 'bg-success-bg', swatch: 'bg-success' },
};

const range = (band: ScoreBand) => (band.from === band.to ? `${band.from}` : `${band.from}–${band.to}`);

/**
 * The screening rule drawn on the 0–100 scale: where a score is rejected,
 * waits for a person, or moves on by itself. It redraws as the thresholds
 * change, so the admin sees what the two numbers mean before saving them.
 *
 * <p>Colour is never the only carrier: every band is named with its range in
 * the legend, the thresholds are labelled on the scale, and the whole rule is
 * written out as a sentence underneath.</p>
 */
export function ScoreBandBar({ auto, manual }: Readonly<{ auto: number; manual: number }>) {
  const bands = scoreBands(auto, manual).filter((band) => band.from <= band.to);
  const at = (score: number) => `${((score - SCORE_MIN) / SPAN) * 100}%`;
  const sentence = describeScoreBands(auto, manual);

  return (
    <figure className="m-0">
      {/* The drawing is for the eye; the caption below says the same in words. */}
      <div aria-hidden="true">
        {/* Threshold labels sit above the bar, at the score where each band starts. */}
        <div className="relative h-5 text-caption font-semibold tabular-nums text-slate-700">
          {[manual, auto]
            .filter((score) => score > SCORE_MIN)
            .map((score) => (
              <span key={score} className="absolute -translate-x-1/2" style={{ left: at(score) }}>
                {score}
              </span>
            ))}
        </div>
        <div className="relative flex h-3 overflow-hidden rounded-pill ring-1 ring-slate-200">
          {bands.map((band) => (
            <span
              key={band.id}
              className={`h-full ${TONE[band.id].fill}`}
              style={{ width: `${((band.to - band.from + 1) / SPAN) * 100}%` }}
            />
          ))}
          {[manual, auto]
            .filter((score) => score > SCORE_MIN)
            .map((score) => (
              <span key={score} className="absolute inset-y-0 w-0.5 bg-slate-700" style={{ left: at(score) }} />
            ))}
        </div>
        <div className="mt-1 flex justify-between text-caption tabular-nums text-slate-500">
          <span>{SCORE_MIN}</span>
          <span>{SCORE_MAX}</span>
        </div>
      </div>

      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-small text-slate-700" aria-hidden="true">
        {bands.map((band) => (
          <li key={band.id} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-pill ${TONE[band.id].swatch}`} />
            <span className="font-medium">{band.label}</span>
            <span className="tabular-nums text-slate-500">{range(band)}</span>
          </li>
        ))}
      </ul>

      <figcaption className="mt-2 text-small text-slate-600">{sentence}</figcaption>
    </figure>
  );
}
