import { useCallback, useEffect, useRef, useState } from 'react';
import { pipelineTemplatesApi, toSummary } from '../api/pipelineTemplates';
import type { PipelineTemplate, PipelineTemplateSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { describeTemplateError } from './pipelineTemplateErrors';

/**
 * Template data, read from `/pipeline-templates`. The same arrangement as
 * `useJobVacancies`: one hook for the list, one for a single template, and
 * writes made by the page that performs them.
 */

/** Drops answers that arrive after a newer request or after unmount. */
function useLatest() {
  const latest = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(() => {
    const ticket = ++latest.current;
    return () => mounted.current && ticket === latest.current;
  }, []);
}

interface TemplateListController {
  templates: PipelineTemplateSummary[];
  /** True until the first answer arrives. */
  loading: boolean;
  /** A later request is in flight; the rows on screen are the previous answer. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Puts the server's copy of a changed template into the list, or drops it if it no longer belongs. */
  apply: (template: PipelineTemplate) => void;
  /** Removes a deleted template's row. */
  drop: (id: string) => void;
}

/**
 * The company's templates for the given filters. Search runs on the server, so
 * a change of filters is a new request; the previous rows stay on screen until
 * it answers, rather than blinking to a skeleton on every keystroke.
 */
export function usePipelineTemplateList(search: string, includeArchived: boolean): TemplateListController {
  const { user } = useAuth();
  const begin = useLatest();
  const [templates, setTemplates] = useState<PipelineTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which filters the rows on screen answer. Different from the current ones
  // means a newer request is in flight — derived, so no effect has to say so.
  const filtersKey = `${includeArchived}|${search}`;
  const [answeredKey, setAnsweredKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const current = begin();
    try {
      const list = await pipelineTemplatesApi.list({ search, includeArchived });
      if (current()) {
        setTemplates(list);
        setError(null);
      }
    } catch (err: unknown) {
      if (current()) {
        setError(describeTemplateError(err, 'list').message);
      }
    } finally {
      if (current()) {
        setLoading(false);
        setAnsweredKey(`${includeArchived}|${search}`);
      }
    }
  }, [begin, search, includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  const apply = useCallback(
    (template: PipelineTemplate) => {
      setTemplates((rows) =>
        includeArchived || template.status === 'ACTIVE'
          ? rows.map((row) => (row.id === template.id ? toSummary(template) : row))
          : rows.filter((row) => row.id !== template.id),
      );
    },
    [includeArchived],
  );

  const drop = useCallback((id: string) => {
    setTemplates((rows) => rows.filter((row) => row.id !== id));
  }, []);

  const refreshing = !loading && answeredKey !== filtersKey;

  return { templates, loading, refreshing, error, refresh, apply, drop };
}

interface TemplateController {
  template: PipelineTemplate | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refresh: () => Promise<void>;
  replace: (template: PipelineTemplate) => void;
}

/** One template by id, with its stages. */
export function usePipelineTemplate(id: string): TemplateController {
  const { user } = useAuth();
  const begin = useLatest();
  const [template, setTemplate] = useState<PipelineTemplate | null>(null);
  // The id the state on screen answers. Loading is "not yet for this id",
  // derived rather than set from an effect.
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    const current = begin();
    try {
      const found = await pipelineTemplatesApi.get(id);
      if (current()) {
        setTemplate(found);
        setError(null);
        setNotFound(false);
      }
    } catch (err: unknown) {
      if (current()) {
        const plan = describeTemplateError(err, 'load');
        setNotFound(plan.notFound);
        setError(plan.notFound ? null : plan.message);
      }
    } finally {
      if (current()) {
        setAnsweredId(id);
      }
    }
  }, [id, begin]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  return { template, loading: answeredId !== id, error, notFound, refresh, replace: setTemplate };
}

/**
 * Names of the company's other active templates, for the early duplicate-name
 * warning. Best effort: if the list can't be read the server's 409 still
 * catches a clash, so a failure here is silent.
 */
export function useTakenTemplateNames(exceptId?: string): string[] {
  const { user } = useAuth();
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    pipelineTemplatesApi
      .list()
      .then((rows) => {
        if (live) {
          setNames(rows.filter((row) => row.status === 'ACTIVE' && row.id !== exceptId).map((row) => row.name));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [exceptId, user?.id]);

  return names;
}
