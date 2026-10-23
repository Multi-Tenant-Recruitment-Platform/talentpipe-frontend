import { api } from './client';
import type { InviteUserRequest, TeamMemberResponse } from './types';

/**
 * Team & invitation endpoints (PB-003 / PB-004). Reading needs `team.view`,
 * inviting `team.invite` and moving someone to another role `team.manage` —
 * the backend enforces both the permission and the tenant scope, so no tenant
 * is ever sent from here.
 */
export const teamApi = {
  /** Everyone in the caller's workspace: active members and pending invitations, with their roles. */
  async list(): Promise<TeamMemberResponse[]> {
    const { data } = await api.get<TeamMemberResponse[]>('/team');
    return data;
  },

  /** Invites someone with one of the workspace's roles (not Owner); they start as INVITED. */
  async invite(request: InviteUserRequest): Promise<TeamMemberResponse> {
    const { data } = await api.post<TeamMemberResponse>('/team/invitations', request);
    return data;
  },

  /** Re-sends the invitation email. */
  async resend(userId: string): Promise<void> {
    await api.post(`/team/invitations/${userId}/resend`);
  },

  /** Revokes a pending invitation and removes the placeholder account. */
  async revoke(userId: string): Promise<void> {
    await api.delete(`/team/invitations/${userId}`);
  },

  /**
   * Moves a member, or a pending invitee, to another role. 422 when it would
   * leave the workspace without an Owner, or involves permissions the caller
   * does not hold.
   */
  async changeRole(userId: string, roleId: string): Promise<TeamMemberResponse> {
    const { data } = await api.put<TeamMemberResponse>(`/team/members/${userId}/role`, { roleId });
    return data;
  },
};
