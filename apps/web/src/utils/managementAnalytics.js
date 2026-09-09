const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveAverageDealSizeGbp = (clientContextDocument) => {
  const rawValue = clientContextDocument?.content?.commercial_model?.average_deal_size_gbp;
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue !== 'number' && typeof rawValue !== 'string') return null;
  if (typeof rawValue === 'string' && rawValue.trim() === '') return null;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const safeRate = (numerator, denominator) => {
  const base = number(denominator);
  if (base <= 0) return null;
  return (number(numerator) / base) * 100;
};

export const formatRate = (value, digits = 1) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(digits)}%`;

export const formatGbp = (value) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? null
    : new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0
      }).format(Number(value));

const stageName = (stage) => String(stage?.id || stage?.stage || '').toLowerCase().replaceAll(' ', '_');

const funnelCount = (funnel, names) => {
  const match = (Array.isArray(funnel) ? funnel : []).find((stage) => names.includes(stageName(stage)));
  return number(match?.count);
};

export const buildManagementMetrics = (snapshot = {}, feedback = [], averageDealSize = null) => {
  const funnel = snapshot.funnel_summary || [];
  const targets = number(snapshot.total_target_companies);
  const entered = snapshot.total_companies_entered == null ? targets : number(snapshot.total_companies_entered);
  const briefs = number(snapshot.generated_briefs) || funnelCount(funnel, ['generated']);
  const reviewed = number(snapshot.feedback_received) || funnelCount(funnel, ['reviewed']);
  const contacted = number(snapshot.contacted_accounts) || funnelCount(funnel, ['contacted']) || feedback.filter((row) => row.contacted).length;
  const meetings = number(snapshot.meetings_booked) || funnelCount(funnel, ['meeting_booked']) || feedback.filter((row) => row.meeting_booked).length;
  const good = number(snapshot.good_quality_briefs) || feedback.filter((row) => row.brief_verdict === 'good').length;
  const wonRows = feedback.filter((row) => row.commercial_outcome === 'closed_won');
  const won = number(snapshot.deals_won) || wonRows.length;
  const dealSize = averageDealSize === null || averageDealSize === undefined ? null : number(averageDealSize);
  const closedWonValue = snapshot.closed_won_value_gbp !== undefined
    ? number(snapshot.closed_won_value_gbp)
    : dealSize === null
      ? null
      : wonRows.reduce((sum, row) => sum + (row.actual_deal_value_gbp == null ? dealSize : number(row.actual_deal_value_gbp)), 0);

  const stages = [
    { id: 'targets', label: 'Targets', count: targets },
    { id: 'briefs', label: 'Briefs', count: briefs },
    { id: 'reviewed', label: 'Reviewed', count: reviewed },
    { id: 'good', label: 'Good quality', count: good },
    { id: 'contacted', label: 'Contacted', count: contacted },
    { id: 'meetings', label: 'Meetings', count: meetings },
    { id: 'won', label: 'Won', count: won }
  ].map((stage, index, all) => ({
    ...stage,
    previousRate: index === 0 ? null : safeRate(stage.count, all[index - 1].count),
    overallRate: index === 0 ? (targets > 0 ? 100 : null) : safeRate(stage.count, targets)
  }));

  return {
    entered, targets, briefs, reviewed, good, contacted, meetings, won, stages,
    qualificationRate: snapshot.total_companies_entered == null ? null : safeRate(targets, entered),
    briefProgressionRate: safeRate(briefs, targets),
    reviewCoverage: safeRate(reviewed, briefs),
    goodRate: safeRate(good, reviewed),
    contactRate: safeRate(contacted, briefs),
    meetingRate: safeRate(meetings, contacted),
    winRate: safeRate(won, meetings),
    averageDealSize: dealSize,
    contactedPotential: dealSize === null ? null : contacted * dealSize,
    meetingPipeline: dealSize === null ? null : meetings * dealSize,
    closedWonValue
  };
};

export const buildManagementInsights = (metrics, snapshot = {}) => {
  const insights = [];
  const add = (tone, title, evidence, action) => insights.push({ tone, title, evidence, action });

  if (metrics.reviewed >= 5 && metrics.reviewCoverage !== null && metrics.reviewCoverage < 60) {
    add('attention', 'Review coverage is limiting learning', `${formatRate(metrics.reviewCoverage)} of generated briefs have feedback.`, 'Prioritise reviews before changing targeting rules.');
  }
  if (metrics.reviewed >= 5 && metrics.goodRate !== null) {
    if (metrics.goodRate >= 70) add('positive', 'Reviewed brief quality is strong', `${formatRate(metrics.goodRate)} of reviewed briefs are rated good.`, 'Preserve the current qualification pattern and test it on more accounts.');
    if (metrics.goodRate < 40) add('attention', 'Brief quality needs investigation', `Only ${formatRate(metrics.goodRate)} of reviewed briefs are rated good.`, 'Review the most common negative feedback reasons before increasing volume.');
  }
  if (metrics.contacted >= 5 && metrics.meetingRate !== null) {
    if (metrics.meetingRate >= 25) add('positive', 'Contacted accounts are engaging', `${formatRate(metrics.meetingRate)} of contacted accounts produced meetings.`, 'Identify the campaigns and signals contributing most to this cohort.');
    if (metrics.meetingRate < 10) add('attention', 'Engagement conversion is low', `${formatRate(metrics.meetingRate)} of contacted accounts produced meetings.`, 'Review positioning and contact selection before increasing outreach.');
  }

  const campaigns = Array.isArray(snapshot.campaign_breakdown) ? snapshot.campaign_breakdown : [];
  const comparable = campaigns.filter((row) => number(row.count) >= 5 && (row.meeting_rate != null || row.good_rate != null));
  if (comparable.length >= 2) {
    const ranked = [...comparable].sort((a, b) => number(b.meeting_rate) - number(a.meeting_rate));
    add('learning', `${ranked[0].id} leads meeting conversion`, `${formatRate(number(ranked[0].meeting_rate))} meeting rate across ${number(ranked[0].count)} targets.`, 'Compare its signals and outreach approach with lower-converting campaigns.');
  }

  return insights.slice(0, 4);
};
