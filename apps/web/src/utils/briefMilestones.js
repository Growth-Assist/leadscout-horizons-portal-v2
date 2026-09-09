import { normalizeAssignmentStatus } from './assignmentStatus.js';

export const getAssignmentMilestones = (assignment) => ({
  assignment_contacted_at: assignment?.contacted_at || null,
  assignment_meeting_booked_at: assignment?.meeting_booked_at || null,
  has_contacted_milestone: Boolean(assignment?.contacted_at),
  has_meeting_milestone: Boolean(assignment?.meeting_booked_at)
});

export const shouldHideClosedBrief = ({ status, assignmentStatusFilter, contactRecordedFilter, meetingRecordedFilter }) => {
  if (normalizeAssignmentStatus(status) !== 'closed') return false;
  if (assignmentStatusFilter === 'closed') return false;
  return contactRecordedFilter !== 'yes' && meetingRecordedFilter !== 'yes';
};
