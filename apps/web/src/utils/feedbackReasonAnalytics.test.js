import { describe, expect, it } from 'vitest';
import { buildFeedbackReasonSummary } from './feedbackReasonAnalytics.js';

describe('buildFeedbackReasonSummary', () => {
  it('calculates reason share and meeting conversion within each verdict', () => {
    const summary = buildFeedbackReasonSummary([
      { brief_verdict: 'good', quick_reason: 'good_fit', meeting_booked: true },
      { brief_verdict: 'good', quick_reason: 'good_fit', meeting_booked: false },
      { brief_verdict: 'good', quick_reason: 'useful_trigger', meeting_booked: false },
      { brief_verdict: 'good', quick_reason: 'weak_fit', meeting_booked: false }
    ]);

    const good = summary.groups.find((group) => group.id === 'good');
    const bad = summary.groups.find((group) => group.id === 'bad');
    const goodFit = good.items.find((item) => item.reason === 'good_fit');

    expect(good.total).toBe(3);
    expect(bad.total).toBe(1);
    expect(goodFit).toMatchObject({ count: 2, meetingRate: 50 });
    expect(goodFit.share).toBeCloseTo(200 / 3);
  });

  it('surfaces missing reasons and avoids misleading percentages for empty groups', () => {
    const summary = buildFeedbackReasonSummary([
      { brief_verdict: 'mixed', quick_reason: null, meeting_booked: true },
      { brief_verdict: 'mixed', quick_reason: 'other', meeting_booked: false }
    ]);

    expect(summary).toMatchObject({ total: 2, reasonedCount: 1, coverage: 50, uncategorizedCount: 1 });
    expect(summary.groups.every((group) => group.items.length === 0)).toBe(true);
  });
});
