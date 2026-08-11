import { useCallback, useEffect, useMemo, useState } from 'react';
import { tenantStorage } from '../utils/tenantStorage';

/**
 * Remembers when each invitation was last re-sent.
 *
 * <p>`POST .../resend` answers 204 with no body, and nothing on the user row
 * changes — `createdAt` is the invite date and there is no expiry field — so
 * the server cannot tell us this later. Previously it lived in a `useState`
 * Set that reset on every remount, which made the "Sent" confirmation vanish
 * the moment the admin navigated away and back.</p>
 *
 * <p>Stored through {@link tenantStorage}, so it is namespaced per workspace
 * and one company's history can never surface in another's.</p>
 */

const RESEND_KEY = 'team.resentAt';

/** userId → ISO timestamp of the last successful resend. */
type ResendLog = Record<string, string>;

function read(store: ReturnType<typeof tenantStorage>): ResendLog {
  try {
    const raw = store.get(RESEND_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    // Anything other than a plain object (hand-edited, or written by an older
    // shape) is discarded rather than allowed to crash the page.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as ResendLog)
      : {};
  } catch {
    return {};
  }
}

export function useResendLog(tenantId: string | null, knownIds: string[]) {
  const store = useMemo(() => tenantStorage(tenantId), [tenantId]);
  const [log, setLog] = useState<ResendLog>(() => read(store));

  // Re-read when the workspace changes; the previous tenant's log must not
  // linger in state after a switch.
  useEffect(() => {
    setLog(read(store));
  }, [store]);

  const persist = useCallback(
    (next: ResendLog) => {
      setLog(next);
      try {
        store.set(RESEND_KEY, JSON.stringify(next));
      } catch {
        // Quota or a privacy mode that blocks writes. The in-memory value still
        // works for this session, which is the part the user can see.
      }
    },
    [store],
  );

  // Drop entries for people who are no longer pending invitations — they
  // accepted, or were revoked. Guarded on a non-empty roster so the first
  // render (still loading, empty array) does not wipe the log.
  useEffect(() => {
    if (knownIds.length === 0) {
      return;
    }
    setLog((current) => {
      const alive = new Set(knownIds);
      const entries = Object.entries(current).filter(([id]) => alive.has(id));
      if (entries.length === Object.keys(current).length) {
        return current;
      }
      const next = Object.fromEntries(entries);
      try {
        store.set(RESEND_KEY, JSON.stringify(next));
      } catch {
        // See above.
      }
      return next;
    });
  }, [knownIds, store]);

  const resentAt = useCallback((userId: string) => log[userId] ?? null, [log]);

  const markResent = useCallback(
    (userId: string) => persist({ ...log, [userId]: new Date().toISOString() }),
    [log, persist],
  );

  /** Called after a 404: the invitation is gone, so its history is meaningless. */
  const forget = useCallback(
    (userId: string) => {
      if (!(userId in log)) {
        return;
      }
      const next = { ...log };
      delete next[userId];
      persist(next);
    },
    [log, persist],
  );

  return { resentAt, markResent, forget };
}
