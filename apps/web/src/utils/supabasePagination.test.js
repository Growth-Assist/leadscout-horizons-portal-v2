import { describe, expect, it, vi } from 'vitest';
import { fetchAllSupabasePages } from './supabasePagination.js';

describe('fetchAllSupabasePages', () => {
  it.each([999, 1000, 1001, 2005])('loads all %i rows without truncation', async (total) => {
    const source = Array.from({ length: total }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));

    const result = await fetchAllSupabasePages(fetchPage);

    expect(result).toEqual(source);
    expect(new Set(result.map((row) => row.id)).size).toBe(total);
  });

  it('requests a terminating empty page for exact page-size multiples', async () => {
    const source = Array.from({ length: 1000 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));

    await fetchAllSupabasePages(fetchPage);

    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('rejects the whole load when a later page fails', async () => {
    const failure = new Error('page failed');
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null })
      .mockResolvedValueOnce({ data: null, error: failure });

    await expect(fetchAllSupabasePages(fetchPage)).rejects.toBe(failure);
  });
});
