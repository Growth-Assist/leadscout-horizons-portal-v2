export const ASSIGNMENT_STAGES = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'nurture', label: 'Nurture' },
  { id: 'meeting_booked', label: 'Meeting Booked' },
  { id: 'closed', label: 'Closed' }
];

export const normalizeAssignmentStatus = (status) => (
  String(status || '').toLowerCase() === 'reviewing' ? 'assigned' : status
);

export const getAssignmentStatusLabel = (status) => {
  const normalizedStatus = normalizeAssignmentStatus(status);
  return ASSIGNMENT_STAGES.find((stage) => stage.id === normalizedStatus)?.label || normalizedStatus;
};
