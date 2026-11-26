import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { jobsApi } from '../api/jobs';
import type { MemberSummary } from '../api/types';

/** How long typing has to pause before the search goes out. */
export const SEARCH_DEBOUNCE_MS = 250;

interface AssignableMembersController {
  /** The answer to the latest search; empty before the first letter. */
  results: MemberSummary[];
  /** A search is waiting out the debounce or in flight. */
  searching: boolean;
  error: string | null;
  /** What was last typed, trimmed; `''` until something is. */
  query: string;
  search: (text: string) => void;
}

/**
 * Searches the company's people as someone types, for an interview panel.
 *
 * <p>One letter is enough: the server matches the start of a first name,
 * last name, full name or email. Typing is debounced, and an answer that
 * arrives after a newer search went out — or after the picker closed — is
 * dropped, so a slow reply for "a" never overwrites the one for "ad".</p>
 */
export function useAssignableMembers(): AssignableMembersController {
  const [results, setResults] = useState<MemberSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set on every mount, not once: StrictMode mounts, unmounts and mounts
  // again, and a flag set only at first would stay false and drop every answer.
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const search = useCallback((text: string) => {
    const wanted = text.trim();
    const ticket = ++latest.current;
    setQuery(wanted);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    if (wanted === '') {
      setResults([]);
      setError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(() => {
      jobsApi
        .searchAssignableMembers(wanted)
        .then((found) => {
          if (mounted.current && ticket === latest.current) {
            setResults(found);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (mounted.current && ticket === latest.current) {
            setError(apiErrorMessage(err, 'We could not search your team. Try again in a moment.'));
          }
        })
        .finally(() => {
          if (mounted.current && ticket === latest.current) {
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  return { results, searching, error, query, search };
}
