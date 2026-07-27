import { normalizeAssignmentStatus } from './assignmentStatus.js';

export const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const formatVerdictLabel = (verdict) => {
  if (!verdict) return 'Not reviewed';
  const lower = String(verdict).toLowerCase();
  if (lower === 'good') return 'Good';
  if (lower === 'mixed') return 'Mixed';
  if (lower === 'bad') return 'Bad';
  return String(verdict).charAt(0).toUpperCase() + String(verdict).slice(1);
};

const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const getFirstValue = (object, keys) => {
  if (!object || typeof object !== 'object') return '';
  return keys.map((key) => cleanText(object[key])).find(Boolean) || '';
};

const parseFinalBriefJson = (finalBriefJson) => {
  if (!finalBriefJson || typeof finalBriefJson !== 'string') return finalBriefJson || {};
  try {
    return JSON.parse(finalBriefJson);
  } catch {
    return {};
  }
};

export const getSuggestedContact = (finalBriefJson) => {
  const parsedBrief = parseFinalBriefJson(finalBriefJson);
  const contacts = parsedBrief?.research_appendix?.contacts;
  const items = Array.isArray(contacts?.items)
    ? contacts.items
    : (Array.isArray(contacts) ? contacts : []);

  return items.find((contact) => contact && typeof contact === 'object') || null;
};

export const getSuggestedContactExportFields = (finalBriefJson) => {
  const contact = getSuggestedContact(finalBriefJson);

  return {
    suggested_contact_name: getFirstValue(contact, ['name']),
    suggested_contact_role: getFirstValue(contact, ['role', 'title', 'job_title']),
    suggested_contact_email: getFirstValue(contact, ['email']),
    suggested_contact_phone: getFirstValue(contact, ['telephone', 'phone', 'mobile']),
    suggested_contact_linkedin: getFirstValue(contact, ['linkedin', 'linkedin_url']),
    suggested_contact_route_type: getFirstValue(contact, ['route_type']),
    suggested_contact_confidence: getFirstValue(contact, ['confidence'])
  };
};

export const BRIEF_CSV_HEADERS = [
  'company_name',
  'company_id',
  'run_id',
  'campaign_id',
  'industry',
  'decision',
  'website',
  'assignee',
  'assignment_status',
  'brief_verdict',
  'quick_reason',
  'contacted',
  'notes',
  'brief_created_at',
  'feedback_created_at',
  'feedback_updated_at',
  'suggested_contact_name',
  'suggested_contact_role',
  'suggested_contact_email',
  'suggested_contact_phone',
  'suggested_contact_linkedin',
  'suggested_contact_route_type',
  'suggested_contact_confidence'
];

export const getBriefCsvRowValues = (row) => {
  const assigneeName = row.assignment_display_name || row.assignment_email || 'Unassigned';
  const suggestedContact = getSuggestedContactExportFields(row.final_brief_json || {});

  return [
    row.mappedName,
    row.company_id,
    row.finalBriefRunId,
    row.campaign_id,
    row.mappedIndustry,
    row.mappedDecision,
    row.mappedWebsite,
    assigneeName,
    normalizeAssignmentStatus(row.assignment_status) || '',
    formatVerdictLabel(row.feedback_verdict),
    row.feedback_quick_reason,
    row.feedback_contacted,
    row.feedback_notes,
    row.final_brief_generated_at,
    row.feedback_created_at,
    row.feedback_updated_at,
    suggestedContact.suggested_contact_name,
    suggestedContact.suggested_contact_role,
    suggestedContact.suggested_contact_email,
    suggestedContact.suggested_contact_phone,
    suggestedContact.suggested_contact_linkedin,
    suggestedContact.suggested_contact_route_type,
    suggestedContact.suggested_contact_confidence
  ];
};

export const buildBriefsCsv = (briefs) => {
  const csvRows = [
    BRIEF_CSV_HEADERS.join(','),
    ...briefs.map((row) => getBriefCsvRowValues(row).map(escapeCSV).join(','))
  ];

  return csvRows.join('\n');
};
