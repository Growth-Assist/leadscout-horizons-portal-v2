export const MAX_BULK_CLOSE_BRIEFS = 100;
export const MAX_BULK_CLOSE_REASON_LENGTH = 2000;

export const getBriefRunId = (brief) => String(
  brief?.finalBriefRunId || brief?.final_brief_run_id || brief?.run_id || ''
).trim();

export const createBriefSelectionKey = (companyId, runId) => JSON.stringify([
  String(companyId || '').trim(),
  String(runId || '').trim()
]);

export const toBriefToClose = (brief) => ({
  company_id: String(brief?.company_id || '').trim(),
  run_id: getBriefRunId(brief)
});

export const hasFinalizedBriefIdentity = (brief) => {
  const isFinalized = brief?.hasFinalizedBrief === true || brief?.has_finalized_brief === true;
  const finalBriefRunId = String(
    brief?.finalBriefRunId || brief?.final_brief_run_id || ''
  ).trim();
  return isFinalized && Boolean(finalBriefRunId);
};

export const isBriefSelectableForBulkClose = (brief) => {
  const payload = toBriefToClose(brief);
  return Boolean(
    hasFinalizedBriefIdentity(brief)
    && payload.company_id
    && payload.run_id
    && String(brief?.assignment_status || '').toLowerCase() !== 'closed'
  );
};

export const validateBulkCloseRequest = (briefs, closeReason) => {
  if (!Array.isArray(briefs) || briefs.length < 1 || briefs.length > MAX_BULK_CLOSE_BRIEFS) {
    return `Select between 1 and ${MAX_BULK_CLOSE_BRIEFS} briefs.`;
  }

  const normalized = briefs.map(toBriefToClose);
  if (normalized.some(({ company_id, run_id }) => !company_id || !run_id)) {
    return 'Every selected brief must have a company and finalised run identifier.';
  }

  const uniqueKeys = new Set(normalized.map(({ company_id, run_id }) => (
    createBriefSelectionKey(company_id, run_id)
  )));
  if (uniqueKeys.size !== normalized.length) {
    return 'The selected briefs contain duplicates.';
  }

  const reason = String(closeReason || '').trim();
  if (!reason) return 'A close reason is required.';
  if (reason.length > MAX_BULK_CLOSE_REASON_LENGTH) {
    return `The close reason must be ${MAX_BULK_CLOSE_REASON_LENGTH.toLocaleString()} characters or fewer.`;
  }

  return null;
};

export const getReturnedBulkCloseAssignments = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.assignments)) return data.assignments;
  if (Array.isArray(data?.closed_assignments)) return data.closed_assignments;
  return [];
};
