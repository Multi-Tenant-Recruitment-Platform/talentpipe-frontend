import { Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { space } from '../../theme/tokens';
import { EmptyState } from '../dashboard/EmptyState';
import { Icon } from '../dashboard/Icon';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function BackLink({ to, children }: Readonly<{ to: string; children: string }>) {
  return (
    <Link to={to} className="tp-back-link">
      <Icon name="arrow-left" size={16} />
      {children}
    </Link>
  );
}

export function JobLoading() {
  return (
    <div aria-busy="true" className="tp-job-panel tp-job-panel-body">
      <span className="sr-only" role="status">
        Loading job…
      </span>
      <Skeleton active avatar={{ shape: 'square', size: 64 }} paragraph={{ rows: 5 }} />
    </div>
  );
}

export function JobLoadError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <Alert tone="error">
      <p style={{ margin: 0 }}>{message}</p>
      <Button size="sm" style={{ marginTop: space[1.5] }} onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}

export function JobUnavailable() {
  return (
    <div className="tp-job-panel-empty">
      <EmptyState
        icon="briefcase"
        title="This job is not available."
        description="It may have been closed or removed. Browse the other open positions instead."
        action={<BackLink to="/jobs">All jobs</BackLink>}
      />
    </div>
  );
}
