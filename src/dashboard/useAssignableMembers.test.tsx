import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberSummary } from '../api/types';

const api = vi.hoisted(() => ({ searchAssignableMembers: vi.fn() }));
vi.mock('../api/jobs', () => ({ jobsApi: api }));

const { useAssignableMembers, SEARCH_DEBOUNCE_MS } = await import('./useAssignableMembers');

const member = (id: string): MemberSummary => ({
  id,
  firstName: id,
  lastName: 'Member',
  email: `${id}@acme.test`,
  roleName: 'Interviewer',
  status: 'ACTIVE',
});

/** Rendered as main.tsx renders the app, so a mount-once flag would show up here. */
const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

/** Lets the debounce run out and any settled promises land. */
async function settle(ms = SEARCH_DEBOUNCE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  api.searchAssignableMembers.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useAssignableMembers', () => {
  it('searches from one letter, once typing pauses', async () => {
    api.searchAssignableMembers.mockResolvedValue([member('ada')]);
    const { result } = renderHook(() => useAssignableMembers(), { wrapper: strict });

    act(() => result.current.search('a'));
    act(() => result.current.search('ad'));
    expect(api.searchAssignableMembers).not.toHaveBeenCalled();
    await settle();

    // One request, for what was typed last.
    expect(api.searchAssignableMembers).toHaveBeenCalledTimes(1);
    expect(api.searchAssignableMembers).toHaveBeenCalledWith('ad');
    expect(result.current.results.map((p) => p.id)).toEqual(['ada']);
    expect(result.current.searching).toBe(false);
  });

  it('drops a slow answer that a newer search has overtaken', async () => {
    let answerOld: (found: MemberSummary[]) => void = () => {};
    api.searchAssignableMembers
      .mockImplementationOnce(() => new Promise<MemberSummary[]>((resolve) => (answerOld = resolve)))
      .mockResolvedValueOnce([member('grace')]);
    const { result } = renderHook(() => useAssignableMembers(), { wrapper: strict });

    act(() => result.current.search('a'));
    await settle();
    act(() => result.current.search('g'));
    await settle();
    expect(result.current.results.map((p) => p.id)).toEqual(['grace']);

    await act(async () => answerOld([member('ada')]));
    expect(result.current.results.map((p) => p.id)).toEqual(['grace']);
  });

  it('clears the results without asking the server when the text is erased', async () => {
    api.searchAssignableMembers.mockResolvedValue([member('ada')]);
    const { result } = renderHook(() => useAssignableMembers(), { wrapper: strict });
    act(() => result.current.search('a'));
    await settle();

    act(() => result.current.search('   '));
    await settle();

    expect(result.current.results).toEqual([]);
    expect(api.searchAssignableMembers).toHaveBeenCalledTimes(1);
  });

  it('says why a search failed', async () => {
    api.searchAssignableMembers.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAssignableMembers(), { wrapper: strict });

    act(() => result.current.search('a'));
    await settle();

    expect(result.current.error).toBeTruthy();
    expect(result.current.searching).toBe(false);
  });
});
