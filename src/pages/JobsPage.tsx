import { Card, Empty, Flex, List, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { JobSummary, PageResponse } from '../api/types';
import { Alert } from '../components/ui/Alert';

/**
 * Public job board (PB-005, partial). Calls GET /public/jobs — which returns
 * an empty page until the Job module lands — and renders the empty state
 * gracefully.
 */
export function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  return (
    <section>
      <Typography.Title level={1} style={{ fontSize: 30, margin: 0 }}>
        Open positions
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        Roles published by companies hiring on TalentPipe.
      </Typography.Paragraph>

      <div style={{ marginTop: 32 }}>
        {error && <Alert tone="error">{error}</Alert>}

        {!error && jobs === null && (
          <Flex align="center" gap={12}>
            <Spin />
            <Typography.Text type="secondary">Loading jobs…</Typography.Text>
          </Flex>
        )}

        {!error && jobs !== null && jobs.length === 0 && (
          <Card>
            <Empty
              description={
                <>
                  <Typography.Paragraph strong style={{ marginBottom: 4 }}>
                    No open positions yet
                  </Typography.Paragraph>
                  <Typography.Text type="secondary">
                    Companies are just getting set up — check back soon.
                  </Typography.Text>
                </>
              }
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
              style={{ paddingInline: 16 }}
            />
          </Card>
        )}
      </div>
    </section>
  );
}
