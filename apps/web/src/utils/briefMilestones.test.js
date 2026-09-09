import { describe, expect, it } from 'vitest';
import { getAssignmentMilestones, shouldHideClosedBrief } from './briefMilestones.js';

describe('brief lifecycle milestones', () => {
  it('derives canonical flags from assignment timestamps only', () => {
    expect(getAssignmentMilestones({ contacted_at: '2026-01-01', meeting_booked_at: null })).toEqual({
      assignment_contacted_at: '2026-01-01',
      assignment_meeting_booked_at: null,
      has_contacted_milestone: true,
      has_meeting_milestone: false
    });
  });

  it('keeps closed work hidden by default', () => {
    expect(shouldHideClosedBrief({ status: 'closed', assignmentStatusFilter: 'all', contactRecordedFilter: 'all', meetingRecordedFilter: 'all' })).toBe(true);
  });

  it('reveals closed work for explicit positive milestone filters', () => {
    expect(shouldHideClosedBrief({ status: 'closed', assignmentStatusFilter: 'all', contactRecordedFilter: 'yes', meetingRecordedFilter: 'all' })).toBe(false);
    expect(shouldHideClosedBrief({ status: 'closed', assignmentStatusFilter: 'all', contactRecordedFilter: 'all', meetingRecordedFilter: 'yes' })).toBe(false);
  });

  it('reveals closed work for the explicit current-status filter', () => {
    expect(shouldHideClosedBrief({ status: 'closed', assignmentStatusFilter: 'closed', contactRecordedFilter: 'all', meetingRecordedFilter: 'all' })).toBe(false);
  });
});
