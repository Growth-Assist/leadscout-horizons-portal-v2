const ASSESSMENT_STATUSES = new Set(['recommended', 'needs_discovery']);
const GROWTH_MOTIONS = new Set([
  'outbound',
  'outbound_led',
  'inbound',
  'inbound_led',
  'both',
  'bespoke_workflow',
  'needs_discovery'
]);
const CONFIDENCE_LEVELS = new Set(['low', 'medium', 'high']);
const SELECTION_BASES = new Set(['explicit_objective', 'industry_mapping', 'target_evidence']);
const INTERNAL_BRAND_PATTERN = /\b(?:resce\s+labs?|odin|frey)\b/i;

export const GROWTH_MOTION_LABELS = {
  outbound: 'Outbound',
  outbound_led: 'Outbound-led',
  inbound: 'Inbound',
  inbound_led: 'Inbound-led',
  both: 'Outbound and inbound',
  bespoke_workflow: 'Bespoke workflow',
  needs_discovery: 'Needs discovery'
};

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cleanVisibleText = (value) => {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  return text && !INTERNAL_BRAND_PATTERN.test(text) ? text : '';
};

const cleanStringArray = (value) => (
  Array.isArray(value) ? value.map(cleanVisibleText).filter(Boolean) : []
);

const cleanOffering = (value) => {
  if (!isRecord(value)) return null;
  const label = cleanVisibleText(value.label);
  if (!label || !/^growth assist\b/i.test(label)) return null;

  return {
    key: typeof value.key === 'string' ? value.key.trim() : '',
    label
  };
};

export const normalizeProductFitEvidenceUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

const cleanEvidence = (value) => {
  if (!isRecord(value)) return null;
  const title = cleanVisibleText(value.title);
  const supports = cleanVisibleText(value.supports);
  if (!title && !supports) return null;

  return {
    title,
    supports,
    url: normalizeProductFitEvidenceUrl(value.url)
  };
};

export const isNeutralProductFitTiming = (value) => {
  const text = String(value || '').toLowerCase();
  return /no\s+(?:specific\s+)?(?:confirmed\s+)?time[- ]bound\s+signal/.test(text)
    || /no\s+time[- ]bound\s+signal\s+(?:was|has been)\s+confirmed/.test(text);
};

export const normalizeProductFitAssessment = (value) => {
  if (!isRecord(value)) return null;

  const assessmentStatus = typeof value.assessment_status === 'string'
    ? value.assessment_status.trim().toLowerCase()
    : '';
  if (!ASSESSMENT_STATUSES.has(assessmentStatus)) return null;

  const growthMotion = typeof value.best_growth_motion === 'string'
    ? value.best_growth_motion.trim().toLowerCase()
    : '';
  const confidence = typeof value.confidence === 'string'
    ? value.confidence.trim().toLowerCase()
    : '';
  const intelligenceFit = isRecord(value.intelligence_fit) ? value.intelligence_fit : {};

  return {
    assessment_status: assessmentStatus,
    best_growth_motion: GROWTH_MOTIONS.has(growthMotion) ? growthMotion : '',
    primary_offering: cleanOffering(value.primary_offering),
    supporting_offerings: Array.isArray(value.supporting_offerings)
      ? value.supporting_offerings.map(cleanOffering).filter(Boolean)
      : [],
    intelligence_fit: {
      applicable: intelligenceFit.applicable === true,
      primary_type: cleanVisibleText(intelligenceFit.primary_type),
      supporting_types: cleanStringArray(intelligenceFit.supporting_types)
    },
    industry_basis: cleanVisibleText(value.industry_basis),
    confidence: CONFIDENCE_LEVELS.has(confidence) ? confidence : '',
    selection_basis: Array.isArray(value.selection_basis)
      ? value.selection_basis.filter((item) => SELECTION_BASES.has(item))
      : [],
    rationale: cleanVisibleText(value.rationale),
    why_now: cleanVisibleText(value.why_now),
    growth_assist_contribution: cleanStringArray(value.growth_assist_contribution),
    proposed_outputs: cleanStringArray(value.proposed_outputs),
    information_required: cleanStringArray(value.information_required),
    evidence: Array.isArray(value.evidence)
      ? value.evidence.map(cleanEvidence).filter(Boolean)
      : []
  };
};

