import { api } from './client';
import type {
  PageResponse,
  PipelineTemplate,
  PipelineTemplateRequest,
  PipelineTemplateSummary,
} from './types';

/**
 * Pipeline template endpoints (sprint "Pipeline template creation", PT-1 → PT-9).
 *
 * <p>The client half of `PipelineTemplateController` in talentpipe-backend
 * (`com.talentpipe.pipeline`); the endpoint table is in the backend's
 * `docs/API.md`. Tenant scope is never sent — the backend derives it from the
 * access token, and a template in another workspace answers 404.</p>
 *
 * <p>Roles, as the backend enforces them: every endpoint is open to
 * COMPANY_ADMIN; HR_MANAGER may only list and read, and only ever sees active
 * templates (an archived one answers 404 to them).</p>
 *
 * <p>Status codes the screens rely on: 400 for field validation (the message
 * joins `field: reason` pairs) and blank names, 409 for a name another active
 * template already has, 422 for structural and threshold rules and for editing
 * an archived template.</p>
 */

export interface PipelineTemplateListParams {
  /** Matches the template name, case-insensitively. */
  search?: string;
  /** Honoured for admins only; the backend ignores it for a job creator. */
  includeArchived?: boolean;
}

/** The backend's maximum page size. */
const PAGE_SIZE = 100;

/** Safety valve on the page walk — far past any company's template count. */
const MAX_PAGES = 20;

const path = (id: string) => `/pipeline-templates/${encodeURIComponent(id)}`;

/** A full template, as the list row it would be — after a save or an archive. */
export function toSummary(template: PipelineTemplate): PipelineTemplateSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stages, ...summary } = template;
  return summary;
}

export const pipelineTemplatesApi = {
  /**
   * Every matching template. Walks the pages rather than asking for one: the
   * list screen sorts and counts client-side, as the vacancy list does.
   */
  async list({ search, includeArchived }: PipelineTemplateListParams = {}): Promise<PipelineTemplateSummary[]> {
    const all: PipelineTemplateSummary[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data } = await api.get<PageResponse<PipelineTemplateSummary>>('/pipeline-templates', {
        params: {
          search: search?.trim() || undefined,
          includeArchived: includeArchived ? true : undefined,
          page,
          size: PAGE_SIZE,
        },
      });
      all.push(...data.content);
      if (page + 1 >= data.totalPages) {
        break;
      }
    }
    return all;
  },

  /** One template with its stages. 404 when missing, in another workspace, or archived for a job creator. */
  async get(id: string): Promise<PipelineTemplate> {
    const { data } = await api.get<PipelineTemplate>(path(id));
    return data;
  },

  /** Creates a template and its stages in one transaction. 201. */
  async create(request: PipelineTemplateRequest): Promise<PipelineTemplate> {
    const { data } = await api.post<PipelineTemplate>('/pipeline-templates', request);
    return data;
  },

  /** Replaces details, stages and thresholds. 422 if the template is archived. */
  async update(id: string, request: PipelineTemplateRequest): Promise<PipelineTemplate> {
    const { data } = await api.put<PipelineTemplate>(path(id), request);
    return data;
  },

  /** ACTIVE → ARCHIVED. Idempotent. */
  async archive(id: string): Promise<PipelineTemplate> {
    const { data } = await api.post<PipelineTemplate>(`${path(id)}/archive`);
    return data;
  },

  /** A new ACTIVE copy named "<name> (Copy)" or "(Copy N)", from any status. 201. */
  async duplicate(id: string): Promise<PipelineTemplate> {
    const { data } = await api.post<PipelineTemplate>(`${path(id)}/duplicate`);
    return data;
  },

  /** Permanently deletes a template and its stages. 204. */
  async remove(id: string): Promise<void> {
    await api.delete(path(id));
  },
};
