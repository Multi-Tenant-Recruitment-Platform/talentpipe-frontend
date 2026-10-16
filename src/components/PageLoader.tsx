import { Spin } from 'antd';

/** Suspense fallback while a route's code chunk downloads. */
export function PageLoader() {
  return (
    <div role="status" aria-label="Loading page" className="flex min-h-[50vh] items-center justify-center">
      <Spin />
    </div>
  );
}
