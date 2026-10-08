import { Card, List, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { JobSummary, PageResponse } from '../api/types';
import { EmptyState } from '../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../components/dashboard/ErrorState';
import { fontSize, space } from '../theme/tokens';

/**
 * Public job board (PB-005, partial). Calls GET /public/jobs — which returns
 * an empty page until the Job module lands — and renders the empty state
 * gracefully.
 */
export function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by the retry button to re-run the effect. A counter rather than a
  // bare function call so the in-flight cleanup still cancels correctly.
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setJobs(null);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PageResponse<JobSummary>>('/public/jobs')
      .then(({ data }) => {
        if (!cancelled) setJobs(data.content);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Could not load jobs. Is the backend running?'));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <section>
      <Typography.Title level={1} style={{ fontSize: fontSize.display, margin: 0 }}>
        Open positions
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: `${space[1]}px 0 0` }}>
        Roles published by companies hiring on TalentPipe.
      </Typography.Paragraph>

      <div style={{ marginTop: space[4] }}>
        {/* The panel is the content here, so a failure replaces it rather than
            stacking an alert above an empty box. */}
        {error && (
          <Card>
            <ErrorState title="Could not load open positions" description={error} onRetry={retry} />
          </Card>
        )}

        {!error && jobs === null && (
          <Card styles={{ body: { padding: `${space[1]}px ${space[3]}px` } }}>
            <RowsSkeleton rows={4} label="Loading open positions…" />
          </Card>
        )}

        {!error && jobs !== null && jobs.length === 0 && (
          <Card>
            <EmptyState
              icon="briefcase"
              title="No open positions yet"
              description="Companies are just getting set up — check back soon."
            />
          </Card>
        )}

        {!error && jobs !== null && jobs.length > 0 && (
          <Card styles={{ body: { padding: 0 } }}>
            <List
              dataSource={jobs}
              renderItem={(job) => (
                <List.Item key={job.id}>
                  <List.Item.Meta
                    title={job.title}
                    description={<Typography.Text type="secondary">{job.companyName}</Typography.Text>}
                  />
                </List.Item>
              )}
              style={{ paddingInline: space[2] }}
            />
          </Card>
        )}
      </div>
    </section>
  );
}
