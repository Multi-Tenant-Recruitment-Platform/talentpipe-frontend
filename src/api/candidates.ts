import { api } from './client';
import type { MyCandidateProfileResponse } from './types';

/**
 * The signed-in candidate's own profile — the My profile page.
 *
 * <p>There is no id in any path: the backend takes the candidate from the
 * access token, so there is no request shape that could reach someone else's
 * profile.</p>
 */

// TODO: confirm with backend — the path, the verb (PUT as an upsert, so a
// candidate with no profile yet creates one on first save), the 404 for "no
// profile yet" and the multipart part names in UpdateMyCandidateProfileRequest
// are all assumed.
const MY_PROFILE_PATH = '/candidates/me';

export const candidatesApi = {
  /** Rejects with a 404 while the candidate has not saved a profile yet. */
  async getMine(): Promise<MyCandidateProfileResponse> {
    const { data } = await api.get<MyCandidateProfileResponse>(MY_PROFILE_PATH);
    return data;
  },

  /**
   * Saves the profile and returns it as now stored. The body is built by
   * `buildCandidatePayload`, so this layer never decides what is sent.
   */
  async saveMine(payload: FormData): Promise<MyCandidateProfileResponse> {
    // Content-Type is deliberately unset: the browser has to add the multipart
    // boundary itself, and naming the type here would omit it.
    const { data } = await api.put<MyCandidateProfileResponse>(MY_PROFILE_PATH, payload);
    return data;
  },
};
