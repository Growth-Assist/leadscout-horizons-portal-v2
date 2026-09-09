import { describe, expect, it } from 'vitest';
import {
  createMomentumRange,
  formatMomentumDelta,
  normalizeMomentumResponse
} from './feedbackMomentum.js';

describe('feedback momentum utilities', () => {
  it('creates exact UTC duration ranges across a daylight-saving boundary', () => {
    const range = createMomentumRange(30, new Date('2026-04-10T12:00:00.000Z'));
    expect(range).toEqual({
      days: 30,
      dateFrom: '2026-03-11T12:00:00.000Z',
      dateTo: '2026-04-10T12:00:00.000Z'
    });
  });

  it('preserves unavailable metrics as null while normalising numeric JSON values', () => {
    const result = normalizeMomentumResponse({
      schema_version: 1,
      period: { days: 30, date_from: 'from', date_to: 'to' },
      totals: {
        accounts_updated: '12',
        note_events: 18,
        momentum_pct: null,
        follow_up_coverage_pct: null,
        stale_follow_ups: null,
        meeting_progressions: 2
      },
      weekly: [{ accounts_updated: '3', note_events: '4', is_partial: true }],
      contributors: [{ user_id: 'user-1', email: 'rep@example.com', accounts_updated: 3 }]
    });

    expect(result.totals).toMatchObject({
      accountsUpdated: 12,
      noteEvents: 18,
      momentumPct: null,
      followUpCoveragePct: null,
      staleFollowUps: null
    });
    expect(result.weekly[0]).toMatchObject({ accountsUpdated: 3, noteEvents: 4, isPartial: true });
    expect(result.contributors[0].displayName).toBe('rep@example.com');
  });

  it('formats positive, negative, and unavailable momentum without treating null as zero', () => {
    expect(formatMomentumDelta(12.25)).toEqual({ value: '+12.3%', direction: 'up' });
    expect(formatMomentumDelta(-4)).toEqual({ value: '-4.0%', direction: 'down' });
    expect(formatMomentumDelta(null)).toEqual({ value: '—', direction: 'none' });
  });
});

