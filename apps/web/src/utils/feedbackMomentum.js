const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asNullableNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const createMomentumRange = (days, now = new Date()) => {
  const periodDays = Number(days);
  if (![7, 30, 90].includes(periodDays)) throw new Error('Unsupported momentum period.');
  const dateTo = new Date(now);
  if (Number.isNaN(dateTo.getTime())) throw new Error('Invalid momentum end date.');
  const dateFrom = new Date(dateTo.getTime() - periodDays * 24 * 60 * 60 * 1000);
  return { days: periodDays, dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() };
};

export const normalizeMomentumResponse = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Momentum response was empty or invalid.');
  }
  if (Number(payload.schema_version) !== 1) {
    throw new Error('Unsupported momentum response version.');
  }

  const totals = payload.totals && typeof payload.totals === 'object' ? payload.totals : {};
  const period = payload.period && typeof payload.period === 'object' ? payload.period : {};
  const staleAccounts = payload.stale_accounts && typeof payload.stale_accounts === 'object'
    ? payload.stale_accounts
    : {};
  const unattributed = payload.unattributed && typeof payload.unattributed === 'object' ? payload.unattributed : {};
  const excludedHistorical = payload.excluded_historical && typeof payload.excluded_historical === 'object'
    ? payload.excluded_historical
    : {};

  return {
    schemaVersion: 1,
    generatedAt: payload.generated_at || null,
    period: {
      days: asNumber(period.days),
      dateFrom: period.date_from || null,
      dateTo: period.date_to || null,
      previousDateFrom: period.previous_date_from || null,
      previousDateTo: period.previous_date_to || null
    },
    totals: {
      accountsUpdated: asNumber(totals.accounts_updated),
      noteEvents: asNumber(totals.note_events),
      previousAccountsUpdated: asNumber(totals.previous_accounts_updated),
      momentumPct: asNullableNumber(totals.momentum_pct),
      followUpCoveragePct: asNullableNumber(totals.follow_up_coverage_pct),
      coverageEligibleAccounts: asNullableNumber(totals.coverage_eligible_accounts),
      coverageCoveredAccounts: asNullableNumber(totals.coverage_covered_accounts),
      staleFollowUps: asNullableNumber(totals.stale_follow_ups),
      meetingProgressions: asNumber(totals.meeting_progressions),
      coverageUnavailableReason: totals.coverage_unavailable_reason || null
    },
    weekly: (Array.isArray(payload.weekly) ? payload.weekly : []).map((row) => ({
      weekStart: row?.week_start || null,
      weekEnd: row?.week_end || null,
      accountsUpdated: asNumber(row?.accounts_updated),
      noteEvents: asNumber(row?.note_events),
      isPartial: Boolean(row?.is_partial)
    })),
    contributors: (Array.isArray(payload.contributors) ? payload.contributors : []).map((row) => ({
      userId: row?.user_id || null,
      displayName: row?.display_name || row?.email || 'Unknown contributor',
      email: row?.email || null,
      accountsUpdated: asNumber(row?.accounts_updated),
      noteEvents: asNumber(row?.note_events),
      meetingProgressions: asNumber(row?.meeting_progressions),
      lastActivityAt: row?.last_activity_at || null
    })),
    staleAccounts: {
      total: asNumber(staleAccounts.total),
      returned: asNumber(staleAccounts.returned),
      truncated: Boolean(staleAccounts.truncated),
      items: Array.isArray(staleAccounts.items) ? staleAccounts.items : []
    },
    unattributed: {
      noteEvents: asNumber(unattributed.note_events),
      accountsUpdated: asNumber(unattributed.accounts_updated)
    },
    excludedHistorical: {
      noteEvents: asNumber(excludedHistorical.note_events),
      accountsUpdated: asNumber(excludedHistorical.accounts_updated)
    }
  };
};

export const formatMomentumPercentage = (value) => (
  value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`
);

export const formatMomentumDelta = (value) => {
  if (value === null || value === undefined) return { value: '—', direction: 'none' };
  const numeric = Number(value);
  if (numeric > 0) return { value: `+${numeric.toFixed(1)}%`, direction: 'up' };
  if (numeric < 0) return { value: `${numeric.toFixed(1)}%`, direction: 'down' };
  return { value: '0.0%', direction: 'flat' };
};

