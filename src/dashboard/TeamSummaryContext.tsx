import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiErrorMessage } from '../api/client';
import { teamApi } from '../api/team';
import type { UserResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useCan } from '../auth/useCan';

interface TeamSummary {
  /** Everyone in the workspace, including the signed-in admin. */
  members: UserResponse[];
  /** Members who have accepted and can sign in. */
  activeMembers: UserResponse[];
  /** Invitations that have not been accepted yet. */
  pendingInvites: UserResponse[];
  /** Seats consumed = active people + outstanding invitations holding a seat. */
  seatsUsed: number;
  loading: boolean;
  error: string | null;
  /** Re-fetches after an invite / resend / revoke. */
  refresh: () => Promise<void>;
}

const EMPTY: UserResponse[] = [];

const TeamSummaryContext = createContext<TeamSummary | null>(null);

/**
 * Single fetch of GET /team shared by every dashboard surface that needs it —
 * the sidebar's seat gauge, the overview's pending-invite KPI and the team
 * page's tables. Before this, the sidebar and the team page each issued their
 * own request for the same list on every navigation.
 *
 * <p>The endpoint is COMPANY_ADMIN-only on the backend, so the fetch is gated
 * on the same permission the route guard uses. For any other role this stays
 * empty and non-loading rather than firing a request that can only 403.</p>
 */
export function TeamSummaryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const allow = useCan();
  const { user } = useAuth();
  const canRead = allow('team.view');

  const [members, setMembers] = useState<UserResponse[]>(EMPTY);
  const [loading, setLoading] = useState(canRead);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!canRead) {
      return;
    }
    setLoading(true);
    try {
      setMembers(await teamApi.list());
      setError(null);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'We could not load your team right now.'));
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  // Re-runs when the signed-in identity changes, so switching workspaces on
  // one device never leaves the previous tenant's roster on screen.
  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  const value = useMemo<TeamSummary>(() => {
    const activeMembers = members.filter((m) => m.status === 'ACTIVE');
    const pendingInvites = members.filter((m) => m.status === 'INVITED');
    return {
      members,
      activeMembers,
      pendingInvites,
      // A pending invite is a reserved seat: it becomes a real one the moment
      // it is accepted, so counting only active members would under-report.
      seatsUsed: activeMembers.length + pendingInvites.length,
      loading,
      error,
      refresh,
    };
  }, [members, loading, error, refresh]);

  return <TeamSummaryContext.Provider value={value}>{children}</TeamSummaryContext.Provider>;
}

export function useTeamSummary(): TeamSummary {
  const context = useContext(TeamSummaryContext);
  if (!context) {
    throw new Error('useTeamSummary must be used inside a TeamSummaryProvider');
  }
  return context;
}
