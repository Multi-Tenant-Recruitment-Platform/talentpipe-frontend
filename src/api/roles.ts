import { api } from './client';
import type { PageResponse, PermissionGroup, RoleAuditEvent, RoleRequest, RoleResponse } from './types';

/**
 * Company roles and the permission catalogue (ADR-9).
 *
 * <p>Reading the roles needs `team.view`; everything that changes them, and
 * the audit trail, needs `roles.manage`. The backend also refuses to let
 * anyone grant, strip or hand out a permission they do not hold themselves —
 * the editor mirrors that rule so the refusal is rarely seen, but the server's
 * answer is the one that counts.</p>
 */
export const rolesApi = {
  /** Every permission, grouped the way the role editor shows them. Any member may read it. */
  async permissions(): Promise<PermissionGroup[]> {
    const { data } = await api.get<PermissionGroup[]>('/permissions');
    return data;
  },

  /** Owner, Recruiter and Interviewer first, then the company's own roles by name. */
  async list(): Promise<RoleResponse[]> {
    const { data } = await api.get<RoleResponse[]>('/roles');
    return data;
  },

  async get(id: string): Promise<RoleResponse> {
    const { data } = await api.get<RoleResponse>(`/roles/${id}`);
    return data;
  },

  /** 409 CONFLICT when the name is taken; 422 when it grants more than the caller holds. */
  async create(request: RoleRequest): Promise<RoleResponse> {
    const { data } = await api.post<RoleResponse>('/roles', request);
    return data;
  },

  /** Needs the `version` the editor loaded; 409 CONCURRENT_UPDATE when someone saved first. */
  async update(id: string, request: RoleRequest): Promise<RoleResponse> {
    const { data } = await api.put<RoleResponse>(`/roles/${id}`, request);
    return data;
  },

  /** A custom copy named "… (copy)", holding the same permissions. */
  async duplicate(id: string): Promise<RoleResponse> {
    const { data } = await api.post<RoleResponse>(`/roles/${id}/duplicate`);
    return data;
  },

  /**
   * Deletes a custom role. Its members move to `reassignTo` in the same
   * transaction; without one, a role that people hold answers 422.
   */
  async remove(id: string, reassignTo?: string): Promise<void> {
    await api.delete(`/roles/${id}`, { params: reassignTo ? { reassignTo } : undefined });
  },

  /** Who changed which role, and who was moved between roles — newest first. */
  async audit(page = 0, size = 50): Promise<PageResponse<RoleAuditEvent>> {
    const { data } = await api.get<PageResponse<RoleAuditEvent>>('/roles/audit', { params: { page, size } });
    return data;
  },
};
