import { describe, expect, it } from 'vitest';
import {
  createBriefSelectionKey,
  getReturnedBulkCloseAssignments,
  hasFinalizedBriefIdentity,
  isBriefSelectableForBulkClose,
  MAX_BULK_CLOSE_BRIEFS,
  toBriefToClose,
  validateBulkCloseRequest
} from './bulkBriefClose.js';

const brief = (overrides = {}) => ({
  company_id: 'company-1',
  final_brief_run_id: 'run-1',
  hasFinalizedBrief: true,
  assignment_status: 'assigned',
  ...overrides
});

describe('bulk brief close helpers', () => {
  it('keeps the RPC payload limited to company_id and run_id', () => {
    expect(toBriefToClose(brief({ ignored: 'value' }))).toEqual({
      company_id: 'company-1',
      run_id: 'run-1'
    });
  });

  it('uses final_brief_run_id ahead of any unrelated run_id', () => {
    expect(toBriefToClose({
      company_id: 'company-1',
      final_brief_run_id: 'final-run',
      run_id: 'latest-run'
    })).toEqual({ company_id: 'company-1', run_id: 'final-run' });
  });

  it('allows any eligible finalised active brief to be selected', () => {
    expect(isBriefSelectableForBulkClose(brief())).toBe(true);
    expect(isBriefSelectableForBulkClose(brief({ assignment_status: 'closed' }))).toBe(false);
    expect(isBriefSelectableForBulkClose(brief({ hasFinalizedBrief: false }))).toBe(false);
    expect(isBriefSelectableForBulkClose(brief({ final_brief_run_id: null }))).toBe(false);
  });

  it('requires both the finalised flag and final brief run identity', () => {
    expect(hasFinalizedBriefIdentity(brief())).toBe(true);
    expect(hasFinalizedBriefIdentity({
      has_finalized_brief: true,
      final_brief_run_id: 'run-2'
    })).toBe(true);
    expect(hasFinalizedBriefIdentity({
      has_finalized_brief: true,
      latest_run_id: 'not-a-final-brief-run'
    })).toBe(false);
  });

  it('requires a reason and enforces its maximum length', () => {
    expect(validateBulkCloseRequest([brief()], '   ')).toBe('A close reason is required.');
    expect(validateBulkCloseRequest([brief()], 'x'.repeat(2001))).toContain('2,000 characters or fewer');
    expect(validateBulkCloseRequest([brief()], 'No longer in scope')).toBeNull();
  });

  it('rejects duplicate company/run identities and selections over 100', () => {
    expect(validateBulkCloseRequest([brief(), brief()], 'Duplicate')).toBe('The selected briefs contain duplicates.');
    expect(validateBulkCloseRequest(
      Array.from({ length: MAX_BULK_CLOSE_BRIEFS + 1 }, (_, index) => brief({
        company_id: `company-${index}`,
        final_brief_run_id: `run-${index}`
      })),
      'Too many'
    )).toBe(`Select between 1 and ${MAX_BULK_CLOSE_BRIEFS} briefs.`);
  });

  it('creates collision-safe selection keys', () => {
    expect(createBriefSelectionKey('a_b', 'c')).not.toBe(createBriefSelectionKey('a', 'b_c'));
  });

  it('reads the assignment rows from the deployed RPC response', () => {
    const assignments = [{ company_id: 'company-1', run_id: 'run-1', status: 'closed' }];
    expect(getReturnedBulkCloseAssignments({ assignments })).toEqual(assignments);
  });
});
