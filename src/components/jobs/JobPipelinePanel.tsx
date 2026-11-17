import { Card } from 'antd';
import { useEffect, useState } from 'react';
import { jobsApi } from '../../api/jobs';
import type { JobStageResponse, JobVacancyResponse } from '../../api/types';
import { space } from '../../theme/tokens';
import { ErrorState, RowsSkeleton } from '../dashboard/ErrorState';
import { ScoreBandBar } from '../pipelines/ScoreBandBar';
import { StageTrack } from '../pipelines/StageTrack';

/** The vacancy's saved pipeline, independent of the template it was copied from. */
export function JobPipelinePanel({ vacancy }: Readonly<{ vacancy: JobVacancyResponse }>) {
  const [result, setResult] = useState<{
    jobId: string;
    stages: JobStageResponse[];
    failed: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (vacancy.stages !== undefined) {
      return;
    }
    let active = true;
    async function load() {
      try {
        const stages = await jobsApi.stages(vacancy.id);
        if (active) {
          setResult({ jobId: vacancy.id, stages, failed: false });
        }
      } catch {
        if (active) {
          setResult({ jobId: vacancy.id, stages: [], failed: true });
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [vacancy.id, vacancy.stages, attempt]);

  const current = result?.jobId === vacancy.id ? result : null;
  const stages = vacancy.stages ?? current?.stages;
  const failed = vacancy.stages === undefined && current?.failed;
  const { autoThreshold: auto, manualThreshold: manual } = vacancy;
  const validThresholds = typeof auto === 'number' && typeof manual === 'number'
    && Number.isFinite(auto) && Number.isFinite(manual)
    && manual >= 0 && auto <= 100 && manual < auto;

  return (
    <section aria-label="Hiring pipeline" className="mb-6 min-w-0">
      <Card styles={{ body: { padding: space[3] } }}>
        <h2 className="m-0 text-title font-semibold text-slate-900">Hiring pipeline</h2>
        <p className="m-0 mt-1 mb-6 text-small text-slate-600">
          {vacancy.recruitmentPipelineName && <strong>{vacancy.recruitmentPipelineName}. </strong>}
          Saved for this vacancy. Later template edits do not change these stages.
        </p>
        <div className="grid items-start gap-6 *:min-w-0 lg:grid-cols-2 lg:gap-8">
          <div>
            <h3 className="m-0 mb-4 text-body font-semibold text-slate-900">Stages</h3>
            {failed ? (
              <ErrorState title="We couldn't load the saved stages" description="Try again to see this vacancy's hiring pipeline."
                onRetry={() => { setResult(null); setAttempt((value) => value + 1); }} />
            ) : stages === undefined ? (
              <RowsSkeleton rows={4} label="Loading saved pipeline stages…" />
            ) : stages.length > 0 ? (
              <StageTrack stages={stages} useStageNames />
            ) : (
              <p className="m-0 text-small text-slate-600">No pipeline stages were saved for this vacancy.</p>
            )}
          </div>
          <div>
            <h3 className="m-0 mb-4 text-body font-semibold text-slate-900">Screening thresholds</h3>
            <dl className="m-0 mb-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-caption font-medium text-slate-500">Auto-advance</dt>
                <dd className="m-0 text-lead font-semibold tabular-nums text-slate-900">{auto ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-caption font-medium text-slate-500">Manual review</dt>
                <dd className="m-0 text-lead font-semibold tabular-nums text-slate-900">{manual ?? 'Not set'}</dd>
              </div>
            </dl>
            {validThresholds ? <ScoreBandBar auto={auto} manual={manual} /> : (
              <p className="m-0 text-small text-slate-600">Screening score bands are unavailable for this vacancy.</p>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
