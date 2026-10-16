import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { JobsRedirect } from './App';

afterEach(cleanup);

function UrlProbe() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{pathname + search}</div>;
}

describe('/jobs', () => {
  it('redirects to the job board at /, keeping the query string', () => {
    render(
      <MemoryRouter initialEntries={['/jobs?q=designer']}>
        <Routes>
          <Route path="/" element={<p>board</p>} />
          <Route path="/jobs" element={<JobsRedirect />} />
        </Routes>
        <UrlProbe />
      </MemoryRouter>,
    );

    expect(screen.getByText('board')).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('/?q=designer');
  });
});
