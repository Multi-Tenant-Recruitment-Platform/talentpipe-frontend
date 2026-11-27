import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { Skeleton } from 'antd';
import { useEffect, useState } from 'react';
import { applicantsApi } from '../../api/applicants';
import type { ApplicantReview } from '../../api/types';
import { formatBytes } from '../../dashboard/companyImages';
import { EmptyState } from '../dashboard/EmptyState';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

const PDF = 'application/pdf';

/**
 * The CV the candidate applied with — shown in the page when it is a PDF,
 * offered as a download otherwise.
 *
 * <p>Fetched as a file through the shared client, because the access token
 * lives in memory and an iframe's own request could not carry it. The object
 * URL is revoked when the preview goes away, so the file does not stay in
 * memory.</p>
 */
export function ApplicantCvPreview({
  applicationId,
  candidateName,
  cv,
}: Readonly<{ applicationId: string; candidateName: string; cv: NonNullable<ApplicantReview['cv']> | null }>) {
  const isPdf = cv?.mimeType === PDF;
  const [preview, setPreview] = useState<{ url: string | null; failed: boolean }>({ url: null, failed: false });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!cv || !isPdf) return undefined;
    const controller = new AbortController();
    let url: string | null = null;
    applicantsApi
      .cv(applicationId, 'inline', controller.signal)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setPreview({ url, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreview({ url: null, failed: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [applicationId, cv, isPdf]);

  async function download() {
    if (!cv) return;
    setDownloading(true);
    try {
      const blob = await applicantsApi.cv(applicationId, 'attachment');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = cv.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (!cv) {
    return (
      <EmptyState
        icon={FileTextOutlined}
        title="No CV with this application"
        description="This candidate applied without uploading a CV."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <FileTextOutlined aria-hidden className="text-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-800">{cv.fileName}</span>
            <span className="block text-caption text-slate-500">{formatBytes(cv.sizeBytes)}</span>
          </span>
        </span>
        <Button variant="secondary" loading={downloading} onClick={() => void download()}>
          <DownloadOutlined aria-hidden />
          Download
        </Button>
      </div>

      {isPdf ? (
        preview.failed ? (
          <Alert tone="error">The CV couldn't be shown here. Try downloading it instead.</Alert>
        ) : preview.url ? (
          <iframe
            src={preview.url}
            title={`CV of ${candidateName}`}
            className="h-[70vh] w-full rounded-xl border border-slate-200"
          />
        ) : (
          <Skeleton.Node active style={{ width: '100%', height: '70vh' }}>
            <span className="sr-only">Loading the CV…</span>
          </Skeleton.Node>
        )
      ) : (
        <p className="m-0 text-small text-slate-500">This file type can't be previewed here. Download it to read it.</p>
      )}
    </div>
  );
}
