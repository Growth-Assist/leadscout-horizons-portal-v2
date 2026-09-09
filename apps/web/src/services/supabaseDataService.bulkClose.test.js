import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock('@/lib/supabaseClient.js', () => ({
  supabase: {
    rpc,
    from
  }
}));

import supabaseDataService from './supabaseDataService.js';

describe('supabaseDataService.bulkCloseBriefAssignments', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it('fetches only rows with a finalised brief identity for the review queue', async () => {
    const query = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.not = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({ data: [], error: null });
    from.mockReturnValue(query);

    await expect(supabaseDataService.fetchAllTargetCompanyDetails('ultraict')).resolves.toEqual([]);

    expect(from).toHaveBeenCalledWith('portal_target_company_detail');
    expect(query.select).toHaveBeenCalledWith(expect.not.stringContaining('final_brief_json'));
    expect(query.eq).toHaveBeenCalledWith('client_id', 'ultraict');
    expect(query.eq).toHaveBeenCalledWith('has_finalized_brief', true);
    expect(query.not).toHaveBeenCalledWith('final_brief_run_id', 'is', null);
  });

  it('loads final brief JSON only for explicitly requested company/run pairs', async () => {
    const query = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.not = vi.fn(() => query);
    query.in = vi.fn().mockResolvedValue({
      data: [
        { company_id: 'company-1', final_brief_run_id: 'run-1', final_brief_json: { company_name: 'One' } },
        { company_id: 'company-2', final_brief_run_id: 'older-run', final_brief_json: { company_name: 'Wrong run' } }
      ],
      error: null
    });
    from.mockReturnValue(query);

    await expect(supabaseDataService.fetchFinalBriefJsonForBriefs('ultraict', [
      { company_id: 'company-1', final_brief_run_id: 'run-1' },
      { company_id: 'company-2', final_brief_run_id: 'run-2' }
    ])).resolves.toEqual([
      { company_id: 'company-1', final_brief_run_id: 'run-1', final_brief_json: { company_name: 'One' } }
    ]);

    expect(query.select).toHaveBeenCalledWith('company_id,final_brief_run_id,final_brief_json');
    expect(query.in).toHaveBeenCalledWith('company_id', ['company-1', 'company-2']);
  });

  it('calls the deployed RPC with only the selected identities and trimmed reason', async () => {
    const response = { requested_count: 1, assignments: [] };
    rpc.mockResolvedValue({ data: response, error: null });

    await expect(supabaseDataService.bulkCloseBriefAssignments({
      clientId: 'ultraict',
      briefs: [{ company_id: 'company-1', run_id: 'run-1', company_name: 'Ignored' }],
      closeReason: '  No longer in scope  '
    })).resolves.toEqual(response);

    expect(rpc).toHaveBeenCalledWith('portal_bulk_close_briefs', {
      p_client_id: 'ultraict',
      p_briefs: [{ company_id: 'company-1', run_id: 'run-1' }],
      p_close_reason: 'No longer in scope'
    });
  });

  it('surfaces the database error message unchanged', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Every selected brief must be a finalised brief for this client.' }
    });

    await expect(supabaseDataService.bulkCloseBriefAssignments({
      clientId: 'ultraict',
      briefs: [{ company_id: 'company-1', run_id: 'run-1' }],
      closeReason: 'Close it'
    })).rejects.toMatchObject({
      message: 'Every selected brief must be a finalised brief for this client.'
    });
  });
});
