import { describe, expect, it } from 'vitest';
import { ASSIGNMENT_STAGES, getAssignmentStatusLabel, normalizeAssignmentStatus } from './assignmentStatus.js';

describe('assignmentStatus', () => {
  it('uses the simplified assignment lifecycle', () => {
    expect(ASSIGNMENT_STAGES.map((stage) => stage.id)).toEqual([
      'assigned',
      'contacted',
      'nurture',
      'meeting_booked',
      'closed'
    ]);
  });

  it('normalizes stale reviewing statuses to assigned', () => {
    expect(normalizeAssignmentStatus('reviewing')).toBe('assigned');
    expect(normalizeAssignmentStatus('assigned')).toBe('assigned');
    expect(getAssignmentStatusLabel('reviewing')).toBe('Assigned');
    expect(getAssignmentStatusLabel('nurture')).toBe('Nurture');
  });
});
