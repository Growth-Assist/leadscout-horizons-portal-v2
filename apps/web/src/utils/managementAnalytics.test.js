import { describe, expect, it } from 'vitest';
import {
  buildManagementInsights,
  buildManagementMetrics,
  formatRate,
  resolveAverageDealSizeGbp,
  safeRate
} from './managementAnalytics.js';

describe('management analytics', () => {
  const snapshot = { total_target_companies: 100, generated_briefs: 80, feedback_received: 40 };
  const feedback = [
    { brief_verdict: 'good', contacted: true, meeting_booked: true, commercial_outcome: 'closed_won', actual_deal_value_gbp: 12000 },
    { brief_verdict: 'good', contacted: true, meeting_booked: true, commercial_outcome: 'closed_won', actual_deal_value_gbp: null },
    { brief_verdict: 'bad', contacted: true, meeting_booked: false, commercial_outcome: 'closed_lost' }
  ];

  it('calculates conversions and non-additive commercial stages', () => {
    const result = buildManagementMetrics(snapshot, feedback, 10000);
    expect(result.contactedPotential).toBe(30000);
    expect(result.meetingPipeline).toBe(20000);
    expect(result.closedWonValue).toBe(22000);
    expect(result.meetingRate).toBeCloseTo(66.67, 1);
    expect(result.winRate).toBe(100);
  });

  it('requires deal-size configuration for estimates', () => {
    const result = buildManagementMetrics(snapshot, feedback, null);
    expect(result.contactedPotential).toBeNull();
    expect(result.meetingPipeline).toBeNull();
    expect(result.closedWonValue).toBeNull();
  });

  it.each([
    ['number', 25000, 25000],
    ['numeric string', '25000.50', 25000.5],
    ['missing field', undefined, null],
    ['null', null, null],
    ['zero', 0, null],
    ['negative', -1, null],
    ['non-numeric string', 'unknown', null]
  ])('resolves average deal size from client context: %s', (_label, value, expected) => {
    const document = value === undefined
      ? { content: { commercial_model: {} } }
      : { content: { commercial_model: { average_deal_size_gbp: value } } };

    expect(resolveAverageDealSizeGbp(document)).toBe(expected);
  });

  it('uses em dashes for empty denominators', () => {
    expect(safeRate(1, 0)).toBeNull();
    expect(formatRate(null)).toBe('—');
  });

  it('suppresses insights without enough evidence', () => {
    const metrics = buildManagementMetrics({}, feedback.slice(0, 2), 10000);
    expect(buildManagementInsights(metrics, {})).toEqual([]);
  });
});
