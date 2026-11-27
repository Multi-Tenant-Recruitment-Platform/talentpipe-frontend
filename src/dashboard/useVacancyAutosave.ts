import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isVacancyDirty, type JobVacancyFormValues } from './jobVacancy';
import { vacancyDraftStore } from './vacancyDraftStore';

/**
 * Keeps a vacancy being written from being lost (the vacancy form's auto-save).
 *
 * <p>Two copies, for two different failures. The browser copy is written a
 * moment after every change, so a closed tab or a crash costs nothing; it is
 * the only copy a new vacancy has before its pipeline template is chosen,
 * because the server refuses a draft without one. The server copy is the real
 * Draft, the one the team sees in Vacancies: sent when the form moves between
 * steps, and after a pause in typing once the server already knows the
 * vacancy.</p>
 *
 * <p>Server saves run one at a time, in order. Each one sends the values as
 * they are when it starts, and is skipped if nothing changed since the last,
 * so a burst of triggers ends in at most one request per real change.</p>
 */

export type AutosaveStatus =
  | { kind: 'idle' }
  | { kind: 'local'; at: Date }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'error'; message: string };

/** How long after the last change the browser copy is written. */
export const LOCAL_SAVE_DELAY_MS = 600;
/** How long after the last change the server copy is sent, once idle saves are on. */
export const SERVER_SAVE_DELAY_MS = 2500;

export function useVacancyAutosave({
  storageKey,
  values,
  step,
  initialValues,
  localEnabled,
  serverReady,
  idleSaves,
  persist,
  describeError,
}: {
  /** Where the browser copy lives; see {@link vacancyDraftStore}. */
  storageKey: string;
  values: JobVacancyFormValues;
  step: string;
  /** What the form opened with — the server's copy, or nothing for a new vacancy. */
  initialValues: JobVacancyFormValues;
  /** False while an earlier browser copy is waiting to be resumed or dropped, so it is not overwritten. */
  localEnabled: boolean;
  /** Whether these values may be sent to the server at all. */
  serverReady: boolean;
  /** Whether a pause in typing sends them, or only a step change and an explicit save. */
  idleSaves: boolean;
  /** Sends one save. Throws when it was refused. */
  persist: (values: JobVacancyFormValues) => Promise<void>;
  describeError: (err: unknown) => string;
}) {
  const [status, setStatus] = useState<AutosaveStatus>({ kind: 'idle' });

  // Read by the save chain, which outlives the render that queued it.
  const latest = useRef({ values, step, serverReady, persist, describeError });
  useLayoutEffect(() => {
    latest.current = { values, step, serverReady, persist, describeError };
  });
  // What the server holds: a ref for the chain, state for the render.
  const sent = useRef(initialValues);
  const [sentValues, setSentValues] = useState(initialValues);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const stopped = useRef(false);

  const serverDirty = isVacancyDirty(values, sentValues);

  /* --- Server ------------------------------------------------------------- */

  /** Queues a save; resolves false if it was refused. Nothing to send counts as success. */
  const saveNow = useCallback((): Promise<boolean> => {
    chain.current = chain.current.then(async () => {
      const { values: snapshot, serverReady: ready, persist: send, describeError: describe } = latest.current;
      if (stopped.current || !ready || !isVacancyDirty(snapshot, sent.current)) {
        return true;
      }
      setStatus({ kind: 'saving' });
      try {
        await send(snapshot);
        sent.current = snapshot;
        setSentValues(snapshot);
        setStatus({ kind: 'saved', at: new Date() });
        return true;
      } catch (err: unknown) {
        setStatus({ kind: 'error', message: describe(err) });
        return false;
      }
    });
    return chain.current;
  }, []);

  useEffect(() => {
    if (!idleSaves || !serverReady || !serverDirty) {
      return;
    }
    const timer = window.setTimeout(() => void saveNow(), SERVER_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [values, idleSaves, serverReady, serverDirty, saveNow]);

  /* --- Browser ------------------------------------------------------------ */

  const writtenKey = useRef(storageKey);

  const writeLocal = useCallback(() => {
    if (stopped.current) {
      return;
    }
    const { values: snapshot, step: open, serverReady: ready } = latest.current;
    if (!isVacancyDirty(snapshot, initialValues)) {
      // Back where it started: nothing worth offering to resume.
      vacancyDraftStore.clear(writtenKey.current);
      return;
    }
    vacancyDraftStore.write(writtenKey.current, snapshot, open);
    if (!ready) {
      setStatus({ kind: 'local', at: new Date() });
    }
  }, [initialValues]);

  // A vacancy the server has just filed moves its copy under its own id.
  useEffect(() => {
    if (writtenKey.current !== storageKey) {
      vacancyDraftStore.clear(writtenKey.current);
      writtenKey.current = storageKey;
      if (localEnabled) {
        writeLocal();
      }
    }
  }, [storageKey, localEnabled, writeLocal]);

  const pendingLocal = useRef(false);
  useEffect(() => {
    if (!localEnabled) {
      return;
    }
    pendingLocal.current = true;
    const timer = window.setTimeout(() => {
      pendingLocal.current = false;
      writeLocal();
    }, LOCAL_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [values, step, localEnabled, writeLocal]);

  // Leaving the page, or the tab, inside the delay still keeps the last change.
  useEffect(() => {
    if (!localEnabled) {
      return;
    }
    const flush = () => {
      if (pendingLocal.current) {
        pendingLocal.current = false;
        writeLocal();
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [localEnabled, writeLocal]);

  /* --- Control ------------------------------------------------------------ */

  /** Resolves once every queued save has finished. */
  const settle = useCallback(() => chain.current, []);

  /**
   * Stops every save from here on and drops the browser copy. For the moment
   * the work is done — published, or discarded — and nothing should write it
   * back afterwards.
   */
  const finish = useCallback(() => {
    stopped.current = true;
    pendingLocal.current = false;
    vacancyDraftStore.clear(writtenKey.current);
  }, []);

  return { status, serverDirty, saveNow, settle, finish };
}
