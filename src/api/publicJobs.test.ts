import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { getPublicJob, listPublicJobs } from './publicJobs';

vi.mock('./client', () => ({ api: { get: vi.fn() } }));
const get = vi.mocked(api.get);

// Same shape the other API tests use; it is what axios.isAxiosError checks.
const httpError = (status: number) => ({ isAxiosError: true, response: { status, data: {} } });

beforeEach(() => {
  get.mockReset();
});

describe('publicJobs (live API)', () => {
  it('requests the given page of published jobs', async () => {
    const body = { content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 };
    get.mockResolvedValue({ data: body });
    await expect(listPublicJobs(2)).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith('/public/jobs', { params: { page: 2, size: 20 } });
  });

  it('treats a 404 as "not available"', async () => {
    get.mockRejectedValue(httpError(404));
    await expect(getPublicJob('abc')).resolves.toBeNull();
  });

  it('surfaces other failures instead of hiding them', async () => {
    get.mockRejectedValue(httpError(500));
    await expect(getPublicJob('abc')).rejects.toMatchObject({ response: { status: 500 } });
  });

  it('encodes the id into the path', async () => {
    get.mockResolvedValue({ data: {} });
    await getPublicJob('a/b');
    expect(get).toHaveBeenCalledWith('/public/jobs/a%2Fb');
  });
});
