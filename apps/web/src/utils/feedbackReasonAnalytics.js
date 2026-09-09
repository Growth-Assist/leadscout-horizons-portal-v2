export const FEEDBACK_REASON_LABELS = {
  good_fit: 'Good fit',
  useful_trigger: 'Useful trigger',
  right_contact: 'Right contact',
  partial_fit: 'Partial fit',
  evidence_needs_strengthening: 'Evidence needs strengthening',
  contact_uncertain: 'Contact uncertain',
  weak_fit: 'Weak fit',
  weak_or_missing_evidence: 'Weak/missing evidence',
  wrong_or_missing_contact: 'Wrong/missing contact',
  other: 'Other',
  not_recorded: 'No reason recorded'
};

const GROUPS = [
  {
    id: 'good',
    title: 'Positive drivers',
    description: 'Why briefs are working',
    reasons: ['good_fit', 'useful_trigger', 'right_contact']
  },
  {
    id: 'bad',
    title: 'Improvement areas',
    description: 'Where briefs need attention',
    reasons: ['weak_fit', 'weak_or_missing_evidence', 'wrong_or_missing_contact']
  }
];

const toPercentage = (numerator, denominator) => (
  denominator > 0 ? (numerator / denominator) * 100 : null
);

export const buildFeedbackReasonSummary = (rows = []) => {
  const reasonedRows = rows.filter((row) => row.quick_reason);
  const classifiedReasons = new Set(GROUPS.flatMap((group) => group.reasons));

  const groups = GROUPS.map((group) => {
    const groupRows = reasonedRows.filter((row) => group.reasons.includes(row.quick_reason));
    const items = group.reasons.map((reason) => {
      const matchingRows = groupRows.filter((row) => row.quick_reason === reason);
      const meetings = matchingRows.filter((row) => row.meeting_booked).length;
      return {
      reason,
        label: FEEDBACK_REASON_LABELS[reason],
        count: matchingRows.length,
        share: toPercentage(matchingRows.length, groupRows.length),
        meetingRate: toPercentage(meetings, matchingRows.length)
      };
    }).filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return { ...group, total: groupRows.length, items };
  });

  return {
    groups,
    total: rows.length,
    reasonedCount: reasonedRows.length,
    coverage: toPercentage(reasonedRows.length, rows.length),
    uncategorizedCount: reasonedRows.filter((row) => !classifiedReasons.has(row.quick_reason)).length
  };
};
