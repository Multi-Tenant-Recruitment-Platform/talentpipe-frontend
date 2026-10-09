import { Card, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { space } from '../../theme/tokens';
import { EmptyState } from '../dashboard/EmptyState';
import { Icon } from '../dashboard/Icon';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** The states one public vacancy can be in before it is shown, shared by its details page and the application form. */

export function BackLink({ to, children }: Readonly<{ to: string; children: string }>) {
  return (
    <Link to={to} className="tp-job-back">
      <Icon name="arrow-left" size={16} />
      {children}
    </Link>
  );
}

export function JobLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading job…
      </span>
      <Card>
        <Skeleton active avatar={{ shape: 'square', size: 64 }} paragraph={{ rows: 6 }} />
      </Card>
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
    <Card>
      <EmptyState
        icon="briefcase"
        title="This job is not available."
        description="It may have been closed or removed. Browse the other open positions instead."
        action={<BackLink to="/jobs">All jobs</BackLink>}
      />
    </Card>
  );
}
