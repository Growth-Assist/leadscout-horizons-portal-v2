/**
 * Safely extracts the ecommerce signal audit data from a brief object.
 * 
 * Checks multiple possible paths in order using optional chaining and returns
 * the first non-null/non-undefined value found. If none of the paths resolve
 * to a value, returns null.
 * 
 * @param {Object} briefOrParsedData - The brief object or parsed data object to extract from.
 *                                     Can be null, undefined, or any object shape.
 * @returns {*} The ecommerce signal audit data if found, or null if not found or input is invalid.
 * 
 * @example
 * // With parsedResearchData path
 * const audit = getEcommerceSignalAudit({
 *   parsedResearchData: {
 *     ecommerce_signal_audit: { platforms: ['Shopify', 'WooCommerce'] }
 *   }
 * });
 * // Returns: { platforms: ['Shopify', 'WooCommerce'] }
 * 
 * @example
 * // With final_brief_json.research_appendix path
 * const audit = getEcommerceSignalAudit({
 *   final_brief_json: {
 *     research_appendix: {
 *       ecommerce_signal_audit: { conversion_rate: 2.5 }
 *     }
 *   }
 * });
 * // Returns: { conversion_rate: 2.5 }
 * 
 * @example
 * // With no matching paths
 * const audit = getEcommerceSignalAudit({ someOtherField: 'value' });
 * // Returns: null
 * 
 * @example
 * // With null or undefined input
 * const audit = getEcommerceSignalAudit(null);
 * // Returns: null
 */
export function getEcommerceSignalAudit(briefOrParsedData) {
  // Check path 1: parsedResearchData.ecommerce_signal_audit
  const path1 = briefOrParsedData?.parsedResearchData?.ecommerce_signal_audit;
  if (path1 !== null && path1 !== undefined) {
    return path1;
  }

  // Check path 2: final_brief_json.research_appendix.ecommerce_signal_audit
  const path2 = briefOrParsedData?.final_brief_json?.research_appendix?.ecommerce_signal_audit;
  if (path2 !== null && path2 !== undefined) {
    return path2;
  }

  // Check path 3: final_brief_json.ecommerce_signal_audit
  const path3 = briefOrParsedData?.final_brief_json?.ecommerce_signal_audit;
  if (path3 !== null && path3 !== undefined) {
    return path3;
  }

  // Check path 4: parsedBrief.research_appendix.ecommerce_signal_audit
  const path4 = briefOrParsedData?.parsedBrief?.research_appendix?.ecommerce_signal_audit;
  if (path4 !== null && path4 !== undefined) {
    return path4;
  }

  // Check path 5: parsedBrief.ecommerce_signal_audit
  const path5 = briefOrParsedData?.parsedBrief?.ecommerce_signal_audit;
  if (path5 !== null && path5 !== undefined) {
    return path5;
  }

  // No matching path found
  return null;
}

const LOOKUP_BODY_KEYS = [
  'evidence',
  'evidence_summary',
  'summary',
  'notes',
  'reason',
  'source',
  'source_summary',
  'description'
];

const SURVEY_SIGNAL_LABELS = {
  roofing_or_cladding_survey: 'Roofing or cladding survey',
  survey_activity_possible: 'Survey activity possible',
  tendering_stage_possible: 'Tendering stage possible',
  planning_application_submitted: 'Planning application submitted',
  metal_roof_or_cladding_system: 'Metal roof or cladding system',
  large_building: 'Large building'
};

const SURVEY_SIGNAL_PRIORITY = [
  'roofing_or_cladding_survey',
  'tendering_stage_possible',
  'planning_application_submitted',
  'metal_roof_or_cladding_system',
  'survey_activity_possible',
  'large_building'
];

const OWNER_ROUTE_PATTERN = /\b(owner|ownership|asset[\s_]*manager|landlord|propco|property[\s_]*company|client|procurer|freeholder|leaseholder)\b/i;
const CONTRACTOR_PATTERN = /\b(contractor|main[\s_]*contractor|specialist[\s_]*contractor|subcontractor)\b/i;
const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };
const CURRENT_YEAR = new Date().getFullYear();

const LEGACY_PROJECT_STAGE_DISPLAY_KEYS = {
  concept_or_feasibility: 'planning',
  planning_submitted: 'planning',
  planning_approved: 'planning',
  pre_tender: 'tendering',
  tendering: 'tendering',
  contractor_appointed: 'onsite',
  on_site: 'onsite',
  complete: 'built_operational'
};

const DISPLAY_STAGE_LABELS = {
  planning: 'Planning',
  tendering: 'Tendering',
  onsite: 'On Site',
  built_operational: 'Built / Operational'
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean).join('; ');
  }
  if (typeof value === 'object') {
    return Object.values(value).map(cleanText).filter(Boolean).join('; ');
  }
  return '';
};

const compactJoin = (parts) => {
  const seen = new Set();
  return parts
    .map(cleanText)
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(' · ');
};

/**
 * Normalizes the explicit project stage supplied in the final brief research appendix.
 *
 * @param {Object} finalBriefJson - Parsed final brief JSON.
 * @returns {null|{stageKey: string, stageLabel: string, displayStageKey: string, displayStageLabel: string, displayContextLabel: string, opportunityMode: string, opportunityModeLabel: string, confidence: string, reason: string, evidence: string, sourceSignals: string[]}}
 */
export function getProjectStageEvidence(finalBriefJson) {
  const projectStage = finalBriefJson?.research_appendix?.project_stage;
  if (!projectStage || typeof projectStage !== 'object') return null;

  const stageKey = cleanText(projectStage.stage_key);
  const stageLabel = cleanText(projectStage.stage_label);
  const displayStageKey = cleanText(projectStage.display_stage_key)
    || LEGACY_PROJECT_STAGE_DISPLAY_KEYS[stageKey]
    || stageKey;
  const displayStageLabel = cleanText(projectStage.display_stage_label)
    || DISPLAY_STAGE_LABELS[displayStageKey]
    || stageLabel;
  const sourceSignals = asArray(projectStage.source_signals)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 4);

  return {
    stageKey,
    stageLabel,
    displayStageKey,
    displayStageLabel,
    displayContextLabel: cleanText(projectStage.display_context_label),
    opportunityMode: cleanText(projectStage.opportunity_mode),
    opportunityModeLabel: cleanText(projectStage.opportunity_mode_label),
    confidence: cleanText(projectStage.confidence),
    reason: cleanText(projectStage.reason),
    evidence: cleanText(projectStage.evidence),
    sourceSignals
  };
}

const getFirstValue = (item, keys) => {
  for (const key of keys) {
    const value = cleanText(item?.[key]);
    if (value) return value;
  }
  return '';
};

const getFirstUrl = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map(getFirstUrl).find(Boolean) || '';
  }
  if (typeof value === 'object') {
    return getFirstUrl(value.url || value.href || value.source_url || value.website);
  }
  const text = cleanText(value);
  return text.split(/\s*;\s*/).find((part) => /^https?:\/\//i.test(part)) || '';
};

const getHref = (item) => {
  for (const key of ['href', 'url', 'website', 'source_url', 'sources', 'party_website', 'source']) {
    const url = getFirstUrl(item?.[key]);
    if (url) return url;
  }
  return '';
};

const getSourceLabel = (item) => (
  getFirstValue(item, ['source_label', 'source_name', 'source']).replace(/^https?:\/\/\S+$/i, '')
);

const getBody = (item, extraParts = []) => compactJoin([
  ...extraParts,
  ...LOOKUP_BODY_KEYS.map((key) => item?.[key]),
  item?.website
]);

const getOrganisationName = (item) => getFirstValue(item, [
  'organisation_name',
  'organization_name',
  'company_name',
  'name',
  'entity_name',
  'contractor_name'
]);

const getRoleText = (item) => getFirstValue(item, [
  'role',
  'type',
  'label',
  'relationship',
  'route_type',
  'organisation_role',
  'organization_role'
]);

const getConfidenceKey = (confidence) => {
  const normalized = cleanText(confidence).toLowerCase();
  if (normalized.startsWith('high')) return 'high';
  if (normalized.startsWith('medium')) return 'medium';
  if (normalized.startsWith('low')) return 'low';
  return '';
};

const pickHighestConfidence = (values) => {
  let best = '';
  let bestRank = 0;

  values.forEach((value) => {
    const text = cleanText(value);
    if (!text) return;
    const rank = CONFIDENCE_RANK[getConfidenceKey(text)] || 0;
    if (!best || rank > bestRank) {
      best = text;
      bestRank = rank;
    }
  });

  return best;
};

const matchesOrganisation = (left, right) => {
  const a = cleanText(left).toLowerCase();
  const b = cleanText(right).toLowerCase();
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
};

const buildOwnerRouteBodyParts = (name, routes) => routes
  .filter((route) => matchesOrganisation(name, getOrganisationName(route)))
  .map((route) => getBody(route, [getRoleText(route)]))
  .filter(Boolean);

const getPropertySignalEnrichment = (finalBriefJson) => (
  finalBriefJson?.research?.property_signal_enrichment
  || finalBriefJson?.research_appendix?.property_signals
  || finalBriefJson?.research_appendix?.scoring?.inputs?.property_signal_enrichment
  || null
);

const getSurveySignalKey = (key, value) => {
  if (typeof value === 'object' && !Array.isArray(value)) {
    return cleanText(value.signal || value.key || key);
  }
  return key;
};

const normalizeSurveySignals = (surveySignals) => {
  if (Array.isArray(surveySignals)) {
    return surveySignals
      .map((value) => ({ key: getSurveySignalKey('', value), value }))
      .filter(({ key }) => key);
  }

  if (surveySignals && typeof surveySignals === 'object') {
    return Object.entries(surveySignals).map(([key, value]) => ({
      key: getSurveySignalKey(key, value),
      value
    }));
  }

  return [];
};

const buildSurveySignalBody = (key, value) => {
  const label = SURVEY_SIGNAL_LABELS[key] || key.replace(/_/g, ' ');
  if (value === true) return label;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return compactJoin([label, getBody(value)]);
  }
  return `${label}: ${cleanText(value)}`;
};

const formatSquareMetres = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${Math.round(number).toLocaleString('en-GB')} sqm`;
};

const parseSquareMetres = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getRoofSizeBand = (value) => {
  const squareMetres = parseSquareMetres(value);
  if (!Number.isFinite(squareMetres)) {
    return {
      key: 'unknown',
      label: 'Size unknown',
      squareMetres: null
    };
  }

  if (squareMetres >= 2000) {
    return {
      key: 'strong',
      label: 'Strong size signal',
      squareMetres
    };
  }

  if (squareMetres >= 1000) {
    return {
      key: 'good',
      label: 'Good size signal',
      squareMetres
    };
  }

  return {
    key: 'lower',
    label: 'Lower size signal',
    squareMetres
  };
};

const getBuildingAgeDisplay = (candidate) => {
  const period = cleanText(candidate?.buildingage_period);
  const year = cleanText(candidate?.buildingage_year);
  if (period && year) return `${period} / ${year}`;
  return period || year;
};

const inferBuildingAgeYears = (candidate) => {
  const year = Number(candidate?.buildingage_year);
  if (Number.isFinite(year) && year > 0) {
    return CURRENT_YEAR - year;
  }

  const period = cleanText(candidate?.buildingage_period);
  const yearMatches = period.match(/\b(18|19|20)\d{2}\b/g);
  const periodEndYear = yearMatches?.length ? Number(yearMatches[yearMatches.length - 1]) : NaN;
  if (Number.isFinite(periodEndYear) && periodEndYear > 0) {
    return CURRENT_YEAR - periodEndYear;
  }

  return null;
};

const getBuildingAgeBand = (candidate) => {
  const years = inferBuildingAgeYears(candidate);
  if (!Number.isFinite(years)) {
    return {
      key: 'unknown',
      label: 'Age unknown',
      years: null
    };
  }

  if (years >= 25) {
    return {
      key: 'strong',
      label: 'Strong candidate',
      years
    };
  }

  if (years >= 10) {
    return {
      key: 'good',
      label: 'Good candidate',
      years
    };
  }

  return {
    key: 'lower',
    label: 'Lower age signal',
    years
  };
};

const parseDateOnly = (value) => {
  const text = cleanText(value);
  if (!text) return null;

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateAgeYears = (date) => {
  const now = new Date();
  const elapsedMs = now.getTime() - date.getTime();
  return elapsedMs / (1000 * 60 * 60 * 24 * 365.25);
};

const getRoofEvidenceDateBand = (value) => {
  const text = cleanText(value);
  if (!text) return null;

  const date = parseDateOnly(text);
  if (!date) {
    return {
      key: 'unknown',
      label: 'Date unclear',
      years: null
    };
  }

  const years = getDateAgeYears(date);
  if (years < 1) {
    return {
      key: 'strong',
      label: 'Fresh evidence',
      years
    };
  }

  if (years < 3) {
    return {
      key: 'good',
      label: 'Recent evidence',
      years
    };
  }

  if (years <= 5) {
    return {
      key: 'aging',
      label: 'Aging evidence',
      years
    };
  }

  return {
    key: 'lower',
    label: 'Older evidence',
    years
  };
};

const getRoofCandidateConfidence = (indicator) => {
  const value = cleanText(indicator);
  if (!value) {
    return {
      level: 'low',
      label: 'Unknown confidence',
      indicator: ''
    };
  }

  if (value.toLowerCase() === 'expected data output') {
    return {
      level: 'high',
      label: 'High confidence',
      indicator: value
    };
  }

  return {
    level: 'medium',
    label: 'Medium confidence',
    indicator: value,
    caveat: 'Non-standard OS confidence indicator'
  };
};

const ROUTE_TYPES = [
  { type: 'contractor', label: 'Contractor' },
  { type: 'owner', label: 'Owner' },
  { type: 'surveyor', label: 'Surveyor' },
  { type: 'occupier', label: 'Occupier' },
  { type: 'architect', label: 'Architect' },
  { type: 'consultant', label: 'Consultant' }
];

const ROUTE_PATTERNS = {
  contractor: /\b(main[\s_]*contractor|specialist[\s_]*contractor|subcontractor|contractor|project[\s_]*manager|delivery|installer|works?)\b/i,
  owner: /\b(landlord|freeholder|owner|ownership|propco|asset[\s_]*manager|property[\s_]*manager|control)\b/i,
  surveyor: /\b(surveyor|building[\s_]*surveyor|chartered[\s_]*surveyor|specification|specifier|technical[\s_]*property)\b/i,
  occupier: /\b(occupier|site[\s_]*operator|operator|facilit(?:y|ies)|estates?|day[\s_-]*to[\s_-]*day[\s_]*site)\b/i,
  architect: /\b(architect|architecture|design|designer)\b/i,
  consultant: /\b(consultant|adviser|advisor|professional[\s_]*adviser|professional[\s_]*advisor|project[\s_]*consultant)\b/i
};

const getRouteSearchText = (item) => compactJoin([
  getRoleText(item),
  getOrganisationName(item),
  item?.category,
  item?.title,
  item?.label,
  item?.route,
  item?.route_type,
  item?.selected_contact_route,
  item?.contact_route_reason,
  item?.notes,
  item?.summary,
  item?.evidence,
  item?.reason,
  item?.description
]);

const getRouteType = (item) => {
  const text = getRouteSearchText(item);
  return ROUTE_TYPES.find(({ type }) => ROUTE_PATTERNS[type].test(text))?.type || '';
};

const LOW_VALUE_ROUTE_VALUES = new Set([
  'client_contact_routing'
]);

const cleanRouteValue = (value) => {
  const text = cleanText(value);
  return LOW_VALUE_ROUTE_VALUES.has(text.toLowerCase()) ? '' : text;
};

const cleanRouteDisplayValue = (value) => {
  const text = cleanRouteValue(value);
  if (!text) return '';
  if (!/[_-]/.test(text)) return text;

  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRouteName = (item) => (
  cleanRouteDisplayValue(getOrganisationName(item))
  || cleanRouteDisplayValue(getFirstValue(item, ['route_name', 'route', 'role', 'title', 'label']))
);

const getRouteEvidence = (item, fallback = '') => cleanRouteValue(getBody(item, [fallback]));

const makeEmptyRouteCard = ({ type, label }) => ({
  type,
  label,
  name: '',
  confidence: '',
  evidence: '',
  isSelected: false,
  isEmpty: true
});

const getConfidenceRank = (confidence) => CONFIDENCE_RANK[getConfidenceKey(confidence)] || 0;

const shouldReplaceRouteCard = (current, candidate) => {
  if (current.isEmpty) return true;

  const currentRank = getConfidenceRank(current.confidence);
  const candidateRank = getConfidenceRank(candidate.confidence);
  return candidateRank > currentRank;
};

const setRouteCard = (cardsByType, card) => {
  const current = cardsByType.get(card.type);
  if (!current || shouldReplaceRouteCard(current, card)) {
    cardsByType.set(card.type, card);
  }
};

const normalizeRouteItem = (item, fallbackEvidence = '') => {
  const type = getRouteType(item);
  if (!type) return null;

  const routeMeta = ROUTE_TYPES.find((routeType) => routeType.type === type);
  const name = getRouteName(item);
  const evidence = getRouteEvidence(item, fallbackEvidence);

  if (!name && !evidence && !cleanText(item?.confidence)) return null;

  return {
    type,
    label: routeMeta.label,
    name: name || routeMeta.label,
    confidence: cleanText(item?.confidence),
    evidence,
    isSelected: false,
    isEmpty: false
  };
};

const normalizeSelectedRouteValue = (selectedRoute) => {
  if (!selectedRoute) return null;
  if (typeof selectedRoute === 'object') return selectedRoute;
  return {
    route: selectedRoute,
    role: selectedRoute
  };
};

const getWhoToContactRoutes = (whoToContact) => {
  if (!whoToContact || typeof whoToContact !== 'object') return [];

  return Object.entries(whoToContact)
    .filter(([, value]) => value && typeof value === 'object')
    .filter(([, value]) => {
      const source = cleanText(value.source).toLowerCase();
      const hasNamedContact = Boolean(cleanText(value.name));
      return source !== 'client_contact_routing' || hasNamedContact;
    })
    .map(([key, value]) => ({
      ...value,
      route_type: value.route_type || key
    }));
};

const getPropertyLedOccupierName = (finalBriefJson) => {
  const isPropertyLed = finalBriefJson?.property_led === true || finalBriefJson?.metadata?.property_led === true;
  if (!isPropertyLed) return '';

  return cleanText(finalBriefJson?.research_appendix?.property_signals?.property?.candidate_occupier?.company_name)
    || cleanText(finalBriefJson?.research?.property_signal_enrichment?.property?.candidate_occupier?.company_name)
    || cleanText(finalBriefJson?.target_company_name)
    || cleanText(finalBriefJson?.metadata?.target_company_name);
};

const getSignalValue = (signal) => (
  signal && typeof signal.value === 'object' && !Array.isArray(signal.value)
    ? signal.value
    : {}
);

const isOsNgdSignal = (signalValue) => {
  const source = cleanText(signalValue.source).toLowerCase();
  const summary = cleanText(signalValue.summary).toLowerCase();
  return source === 'os_ngd' || summary.includes('os ngd');
};

const extractRoofConfidenceIndicator = (summary) => {
  const text = cleanText(summary);
  const match = text.match(/confidence\s+([^.;]+)/i);
  return cleanText(match?.[1]);
};

const getEmbeddedOsRoofCandidate = (finalBriefJson) => {
  const property = finalBriefJson?.research_appendix?.property_signals?.property;
  if (!property || typeof property !== 'object') return null;

  const roofSignal = normalizeSurveySignals(property.survey_signals)
    .find((signal) => {
      const signalValue = getSignalValue(signal);
      return signal.key === 'metal_roof_or_cladding_system' && isOsNgdSignal(signalValue);
    });

  if (!roofSignal) return null;

  const roofSignalValue = getSignalValue(roofSignal);

  return {
    nearest_address: property.nearest_address || property.address || finalBriefJson?.research_appendix?.properties?.primary_property_address,
    geometry_area_m2: property.geometry_area_m2 || property.building_size_sq_m,
    buildingage_period: property.buildingage_period || property.building_age,
    buildingage_year: property.buildingage_year,
    google_maps_url: roofSignalValue.source_url || getFirstUrl(property.sources),
    roofmaterial_confidenceindicator: property.roofmaterial_confidenceindicator
      || extractRoofConfidenceIndicator(roofSignalValue.summary)
      || roofSignalValue.confidence,
    roofmaterial_evidencedate: property.roofmaterial_evidencedate || roofSignalValue.evidence_date,
    osid: property.osid || property.os_id || property.id || property.uprn
  };
};

/**
 * Normalizes OS NGD roof candidate evidence for the final brief property/site section.
 *
 * @param {Object} finalBriefJson - Parsed final brief JSON.
 * @returns {null|{title: string, nearestAddress: string, footprintArea: string, roofSizeBand: Object, buildingAge: string, buildingAgeBand: Object, roofConfidence: Object, roofEvidenceDate: string, roofEvidenceDateBand: Object|null, googleMapsUrl: string, osid: string}}
 */
export function getOsRoofCandidateEvidence(finalBriefJson) {
  const candidate = finalBriefJson?.research?.os_ngd_roof_candidate || getEmbeddedOsRoofCandidate(finalBriefJson);
  if (!candidate || typeof candidate !== 'object') return null;
  const footprintAreaM2 = candidate.geometry_area_m2;
  const roofEvidenceDate = cleanText(candidate.roofmaterial_evidencedate);

  return {
    title: 'OS Roof Candidate',
    nearestAddress: cleanText(candidate.nearest_address),
    footprintArea: formatSquareMetres(footprintAreaM2),
    roofSizeBand: getRoofSizeBand(footprintAreaM2),
    buildingAge: getBuildingAgeDisplay(candidate),
    buildingAgeBand: getBuildingAgeBand(candidate),
    roofConfidence: getRoofCandidateConfidence(candidate.roofmaterial_confidenceindicator),
    roofEvidenceDate,
    roofEvidenceDateBand: getRoofEvidenceDateBand(roofEvidenceDate),
    googleMapsUrl: getFirstUrl(candidate.google_maps_url),
    osid: getFirstValue(candidate, ['osid', 'os_id', 'id'])
  };
}

/**
 * Normalizes property/contact route evidence into six stable route cards.
 *
 * @param {Object} finalBriefJson - Parsed final brief JSON.
 * @returns {Array<{type: string, label: string, name: string, confidence: string, evidence: string, isSelected: boolean, isEmpty: boolean}>}
 */
export function getPropertyRouteCards(finalBriefJson) {
  const cardsByType = new Map(ROUTE_TYPES.map((routeType) => [
    routeType.type,
    makeEmptyRouteCard(routeType)
  ]));

  const propertySignals = finalBriefJson?.research_appendix?.property_signals || {};
  const contacts = finalBriefJson?.research_appendix?.contacts || {};
  const selectedRouteItem = normalizeSelectedRouteValue(contacts.selected_contact_route);
  const selectedRouteType = selectedRouteItem ? getRouteType(selectedRouteItem) : '';
  const contactRouteReason = cleanText(contacts.contact_route_reason);

  [
    ...asArray(propertySignals.organisation_contact_routes),
    ...asArray(propertySignals.related_organisations)
  ].forEach((item) => {
    const card = normalizeRouteItem(item);
    if (card) setRouteCard(cardsByType, card);
  });

  if (selectedRouteType) {
    const selectedMeta = ROUTE_TYPES.find((routeType) => routeType.type === selectedRouteType);
    const selectedCard = normalizeRouteItem(selectedRouteItem, contactRouteReason) || {
      ...makeEmptyRouteCard(selectedMeta),
      name: selectedMeta.label,
      evidence: contactRouteReason,
      isEmpty: false
    };
    setRouteCard(cardsByType, selectedCard);
  }

  getWhoToContactRoutes(finalBriefJson?.sales_brief?.who_to_contact).forEach((item) => {
    const card = normalizeRouteItem(item);
    if (card) setRouteCard(cardsByType, card);
  });

  const occupierFallbackName = getPropertyLedOccupierName(finalBriefJson);
  if (occupierFallbackName && cardsByType.get('occupier')?.isEmpty) {
    setRouteCard(cardsByType, {
      type: 'occupier',
      label: 'Occupier',
      name: occupierFallbackName,
      confidence: '',
      evidence: '',
      isSelected: false,
      isEmpty: false
    });
  }

  if (selectedRouteType) {
    const selectedCard = cardsByType.get(selectedRouteType);
    cardsByType.set(selectedRouteType, {
      ...selectedCard,
      evidence: selectedCard.evidence || contactRouteReason,
      isSelected: true,
      isEmpty: false
    });
  }

  return ROUTE_TYPES.map(({ type }) => cardsByType.get(type));
}

/**
 * Normalizes property lookup/evidence data into compact cards for the final brief UI.
 *
 * @param {Object} finalBriefJson - Parsed final brief JSON.
 * @returns {Array<{category: string, title: string, body: string, confidence: string, href?: string, sourceLabel?: string}>}
 */
export function getLookupEvidenceCards(finalBriefJson) {
  const enrichment = getPropertySignalEnrichment(finalBriefJson);
  if (!enrichment || typeof enrichment !== 'object') return [];

  const cards = [];
  const candidateOccupier = enrichment.property?.candidate_occupier;

  if (candidateOccupier?.company_name) {
    cards.push({
      category: 'Occupier / Site Operator',
      title: cleanText(candidateOccupier.company_name),
      body: getBody(candidateOccupier),
      confidence: cleanText(candidateOccupier.confidence),
      href: getHref(candidateOccupier),
      sourceLabel: getSourceLabel(candidateOccupier)
    });
  }

  const organisationContactRoutes = asArray(enrichment.organisation_contact_routes);

  asArray(enrichment.related_organisations).forEach((organisation) => {
    const title = getOrganisationName(organisation);
    const role = getRoleText(organisation);
    const qualifier = compactJoin([role, title, organisation?.category]);
    if (!title || !OWNER_ROUTE_PATTERN.test(qualifier)) {
      return;
    }

    cards.push({
      category: 'Owner / Asset Route',
      title,
      body: getBody(organisation, [role, ...buildOwnerRouteBodyParts(title, organisationContactRoutes)]),
      confidence: cleanText(organisation.confidence),
      href: getHref(organisation),
      sourceLabel: getSourceLabel(organisation)
    });
  });

  organisationContactRoutes.forEach((route) => {
    const title = getOrganisationName(route);
    const role = getRoleText(route);
    const qualifier = compactJoin([role, title, route?.category]);
    const alreadyRendered = cards.some((card) => (
      card.category === 'Owner / Asset Route' && matchesOrganisation(card.title, title)
    ));

    if (!title || alreadyRendered || !OWNER_ROUTE_PATTERN.test(qualifier)) return;

    cards.push({
      category: 'Owner / Asset Route',
      title,
      body: getBody(route, [role]),
      confidence: cleanText(route.confidence),
      href: getHref(route),
      sourceLabel: getSourceLabel(route)
    });
  });

  [
    ...asArray(enrichment.job_contractor_candidates),
    ...asArray(enrichment.related_organisations),
    ...asArray(enrichment.organisation_contact_routes)
  ].forEach((contractor) => {
    const title = getOrganisationName(contractor);
    const role = getRoleText(contractor);
    const qualifier = compactJoin([role, title, contractor?.category]);
    const alreadyRendered = cards.some((card) => (
      card.category === 'Contractor Identified' && matchesOrganisation(card.title, title)
    ));
    if (!title || alreadyRendered || !CONTRACTOR_PATTERN.test(qualifier)) return;

    cards.push({
      category: 'Contractor Identified',
      title,
      body: getBody(contractor, [role]),
      confidence: cleanText(contractor.confidence),
      href: getHref(contractor),
      sourceLabel: getSourceLabel(contractor)
    });
  });

  const surveySignals = enrichment.property?.survey_signals;
  if (surveySignals && typeof surveySignals === 'object') {
    const normalizedSignals = normalizeSurveySignals(surveySignals);
    const matchingSignals = normalizedSignals
      .filter(({ key, value }) => (
        SURVEY_SIGNAL_PRIORITY.includes(key)
        && (() => {
        if (value === false || value === null || value === undefined) return false;
        return cleanText(value) !== '';
        })()
      ))
      .sort((left, right) => (
        SURVEY_SIGNAL_PRIORITY.indexOf(left.key) - SURVEY_SIGNAL_PRIORITY.indexOf(right.key)
      ));

    if (matchingSignals.length > 0) {
      const strongestSignal = matchingSignals[0].key;
      const body = compactJoin(matchingSignals.map(({ key, value }) => buildSurveySignalBody(key, value)));
      const confidence = pickHighestConfidence(matchingSignals.map(({ value }) => (
        typeof value === 'object' && !Array.isArray(value) ? value?.confidence : ''
      )));

      cards.push({
        category: 'Survey / Specification',
        title: SURVEY_SIGNAL_LABELS[strongestSignal],
        body,
        confidence,
        href: getHref(surveySignals),
        sourceLabel: getSourceLabel(surveySignals)
      });
    }
  }

  return cards.filter((card) => card.title);
}
