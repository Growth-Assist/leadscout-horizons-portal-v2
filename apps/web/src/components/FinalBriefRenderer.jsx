import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  XCircle, 
  User, 
  Mail, 
  Phone, 
  Linkedin, 
  Info,
  ExternalLink,
  Calendar,
  Home,
  Tags,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { renderEmailAsLink } from '@/utils/emailRenderer.js';
import { getOsRoofCandidateEvidence, getPartnershipFitEvidence, getPlanningApplicationEvidence, getProjectStageEvidence, getPropertyRouteCards } from '@/utils/briefDataExtractors.js';
import { getContactRouteTypeLabel } from '@/utils/contactRouteTypes.js';
import { getBriefDisplayInfo } from '@/utils/briefDisplay.js';
import ProductFitAssessmentSection from '@/components/ProductFitAssessmentSection.jsx';
import { normalizeProductFitAssessment } from '@/utils/productFitAssessment.js';
import {
  contactsMatch,
  emitRelationshipAnalyticsEvent,
  getFinalBriefContacts,
  getRecommendedKnownContact,
  getRelationshipAnalyticsProperties,
  getRoleFitLabel,
  hasEnrichedContactDetails,
  isKnownNetworkContact,
  sortContactsForSales
} from '@/utils/contactRelationship.js';

const getConfidenceColor = (confidence) => {
  const c = (confidence || '').toLowerCase();
  if (c === 'high') return 'bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-400';
  if (c === 'medium') return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-400';
  if (c === 'low') return 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-400';
  return 'bg-secondary text-secondary-foreground';
};

const getCompactConfidenceLabel = (confidence) => {
  const normalized = String(confidence || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.startsWith('high')) return 'High';
  if (normalized.startsWith('medium')) return 'Medium';
  if (normalized.startsWith('low')) return 'Low';
  return '';
};

const ROUTE_LABELS = {
  primary_buyer: 'Primary buyer',
  likely_influencer: 'Likely influencer',
  likely_blocker: 'Likely blocker',
  fallback_route: 'Fallback route'
};

const LINKEDIN_MESSAGE_LIMIT = 200;

const extractDomain = (url) => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
};

const normalizeIdentity = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const normalizeLinkedIn = (value) => normalizeIdentity(value)
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .replace(/\/+$/, '');

const getContactName = (contact) => contact?.name || contact?.full_name || contact?.person_name || '';

const getContactRole = (contact) => (
  contact?.title
  || contact?.job_title
  || contact?.enriched_title
  || (contact?.enrichment_source ? contact?.role : '')
  || contact?.profession
  || contact?.role
  || ''
);

const getContactEmail = (contact) => contact?.email || contact?.email_address || contact?.contact_email || '';

const getContactLinkedIn = (contact) => contact?.linkedin || contact?.linkedin_url || contact?.linkedin_profile || '';

const getFirstName = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown contact') return '';
  return trimmed.split(/\s+/)[0];
};

const sentenceCase = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toLowerCase() + text.slice(1);
};

const cleanInlineText = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .replace(/[.!?]+$/g, '')
  .trim();

const stringifyBriefValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(stringifyBriefValue).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value).map(stringifyBriefValue).filter(Boolean).join(' ');
  }
  return '';
};

const getBriefFieldText = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map(stringifyBriefValue).find(Boolean) || '';
  }
  return stringifyBriefValue(value);
};

const findTalkTrackField = (talkTrack, keys, labels = []) => {
  if (!talkTrack) return '';

  const normalizedKeys = keys.map((key) => key.toLowerCase());
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  if (Array.isArray(talkTrack)) {
    for (const item of talkTrack) {
      const fromItem = findTalkTrackField(item, keys, labels);
      if (fromItem) return fromItem;
    }
    return '';
  }

  if (typeof talkTrack === 'object') {
    for (const [key, value] of Object.entries(talkTrack)) {
      const normalizedKey = key.toLowerCase().replace(/[\s-]+/g, '_');
      if (normalizedKeys.includes(normalizedKey)) {
        return stringifyBriefValue(value);
      }
    }
    return '';
  }

  const text = String(talkTrack || '');
  const lines = text.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const matchingLabel = normalizedLabels.find((label) => lowerLine.startsWith(label));
    if (matchingLabel) {
      return line.slice(matchingLabel.length).replace(/^[:\s-]+/, '').trim();
    }
  }

  return '';
};

const hasOutreachDirective = (outreach, includeKey, textKey) => (
  outreach
  && (Object.prototype.hasOwnProperty.call(outreach, includeKey)
    || Object.prototype.hasOwnProperty.call(outreach, textKey))
);

const interpolateOutreachTemplate = ({ template, companyName, contact }) => {
  const firstName = getFirstName(getContactName(contact));
  const contactName = getContactName(contact);
  const contactRole = getContactRole(contact);
  const safeCompanyName = companyName || 'your business';

  return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, token) => {
    const normalizedToken = token.toLowerCase();
    const replacements = {
      first_name: firstName,
      firstname: firstName,
      contact_first_name: firstName,
      contact_name: contactName,
      name: contactName,
      contact_role: contactRole,
      role: contactRole,
      company_name: safeCompanyName,
      company: safeCompanyName
    };

    return replacements[normalizedToken] || match;
  }).trim();
};

const getOutreachTemplateText = (outreach, includeKey, textKey) => {
  if (!hasOutreachDirective(outreach, includeKey, textKey)) return undefined;
  if (outreach?.[includeKey] !== true) return '';
  return String(outreach?.[textKey] || '').trim();
};

const buildBriefEmailDraft = ({ companyName, contact, salesBrief, outreach }) => {
  const warmupTemplate = getOutreachTemplateText(outreach, 'include_warmup_email', 'warmup_email_text');
  if (warmupTemplate !== undefined) {
    if (!warmupTemplate) return null;

    return {
      to: getContactEmail(contact),
      subject: `Quick question for ${companyName || 'your business'}`,
      body: interpolateOutreachTemplate({ template: warmupTemplate, companyName, contact })
    };
  }

  const talkTrack = salesBrief?.recommended_angle_talk_track;
  const primaryAngle = findTalkTrackField(
    talkTrack,
    ['primary_angle', 'primary'],
    ['primary angle', 'primary']
  );
  const valueFraming = findTalkTrackField(
    talkTrack,
    ['value_framing', 'value'],
    ['value framing', 'value']
  );
  const discoveryHook = findTalkTrackField(
    talkTrack,
    ['discovery_hook', 'hook'],
    ['discovery hook', 'hook']
  );
  const firstTalkTrackText = getBriefFieldText(talkTrack);
  const whyNow = getBriefFieldText(salesBrief?.why_now);
  const discoveryQuestion = getBriefFieldText(salesBrief?.discovery_questions);
  const discoveryContext = discoveryHook || whyNow || discoveryQuestion;
  const angleContext = primaryAngle || valueFraming || firstTalkTrackText;

  if (!discoveryContext && !angleContext) return null;

  const safeCompanyName = companyName || 'your business';
  const firstName = getFirstName(getContactName(contact));
  const salutation = firstName ? `Hi ${firstName},` : 'Hi,';

  return {
    to: getContactEmail(contact),
    subject: `Quick question for ${safeCompanyName}`,
    body: [
      salutation,
      '',
      discoveryContext ? `I noticed ${sentenceCase(discoveryContext)}.` : null,
      '',
      angleContext ? `The reason I’m reaching out is ${sentenceCase(angleContext)}.` : null,
      '',
      `Would it be worth a quick conversation to see whether this is relevant for ${safeCompanyName}?`,
      '',
      'Best,'
    ].filter((line) => line !== null).join('\n')
  };
};

const trimToLimit = (value, limit) => {
  const text = cleanInlineText(value);
  if (text.length <= limit) return text;

  const truncated = text.slice(0, limit - 1).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  const safeTruncated = lastSpace > limit * 0.6 ? truncated.slice(0, lastSpace) : truncated;
  return `${safeTruncated.trimEnd()}…`;
};

const trimTemplateToLimit = (value, limit) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;

  const truncated = text.slice(0, limit - 1).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  const safeTruncated = lastSpace > limit * 0.6 ? truncated.slice(0, lastSpace) : truncated;
  return `${safeTruncated.trimEnd()}…`;
};

const buildBriefLinkedInDraft = ({ companyName, contact, salesBrief, outreach }) => {
  const linkedin = getContactLinkedIn(contact);
  if (!linkedin) return null;

  const linkedInTemplate = getOutreachTemplateText(outreach, 'include_linkedin_message', 'linkedin_message_text');
  if (linkedInTemplate !== undefined) {
    if (!linkedInTemplate) return null;

    return {
      profileUrl: linkedin,
      message: trimTemplateToLimit(
        interpolateOutreachTemplate({ template: linkedInTemplate, companyName, contact }),
        LINKEDIN_MESSAGE_LIMIT
      )
    };
  }

  const talkTrack = salesBrief?.recommended_angle_talk_track;
  const primaryAngle = findTalkTrackField(
    talkTrack,
    ['primary_angle', 'primary'],
    ['primary angle', 'primary']
  );
  const valueFraming = findTalkTrackField(
    talkTrack,
    ['value_framing', 'value'],
    ['value framing', 'value']
  );
  const discoveryHook = findTalkTrackField(
    talkTrack,
    ['discovery_hook', 'hook'],
    ['discovery hook', 'hook']
  );
  const firstTalkTrackText = getBriefFieldText(talkTrack);
  const whyNow = getBriefFieldText(salesBrief?.why_now);
  const discoveryContext = cleanInlineText(discoveryHook || whyNow);
  const angleContext = cleanInlineText(primaryAngle || valueFraming || firstTalkTrackText);

  if (!discoveryContext && !angleContext) return null;

  const firstName = getFirstName(getContactName(contact));
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const safeCompanyName = cleanInlineText(companyName) || 'your business';
  const compactDiscovery = discoveryContext
    ? `noticed ${safeCompanyName}: ${sentenceCase(discoveryContext)}`
    : `noticed ${safeCompanyName}`;
  const compactAngle = angleContext || discoveryContext;
  const message = [
    greeting,
    compactDiscovery,
    compactAngle ? `Thought ${sentenceCase(compactAngle)} might be relevant.` : null,
    'Open to connecting?'
  ].filter(Boolean).join(' ');

  return {
    profileUrl: linkedin,
    message: trimToLimit(message, LINKEDIN_MESSAGE_LIMIT)
  };
};

const buildRouteMatchKeys = (route) => {
  const name = normalizeIdentity(route?.name);
  if (!name) return [];

  const keys = [];
  const email = normalizeIdentity(route?.email || route?.email_address || route?.contact_email);
  if (email) keys.push(`email:${email}`);

  const linkedin = normalizeLinkedIn(route?.linkedin || route?.linkedin_url || route?.linkedin_profile);
  if (linkedin) keys.push(`linkedin:${linkedin}`);

  const role = normalizeIdentity(route?.role || route?.title || route?.job_title);
  if (role) keys.push(`name_role:${name}:${role}`);

  return keys;
};

const buildContactMatchKeys = (contact) => {
  const keys = [];
  const name = normalizeIdentity(getContactName(contact));
  if (!name) return keys;

  const email = normalizeIdentity(getContactEmail(contact));
  if (email) keys.push(`email:${email}`);

  const linkedin = normalizeLinkedIn(getContactLinkedIn(contact));
  if (linkedin) keys.push(`linkedin:${linkedin}`);

  const role = normalizeIdentity(getContactRole(contact));
  if (role) keys.push(`name_role:${name}:${role}`);

  return keys;
};

const buildContactRouteLabels = (contacts, whoToContact) => {
  const labelsByContactIndex = new Map();
  const contactIndexByKey = new Map();

  contacts.forEach((contact, index) => {
    buildContactMatchKeys(contact).forEach((key) => {
      if (!contactIndexByKey.has(key)) {
        contactIndexByKey.set(key, index);
      }
    });
  });

  Object.entries(ROUTE_LABELS).forEach(([routeKey, label]) => {
    const matchKeys = buildRouteMatchKeys(whoToContact?.[routeKey]);
    if (matchKeys.length === 0) return;

    const contactIndex = matchKeys
      .map((matchKey) => contactIndexByKey.get(matchKey))
      .find((index) => index !== undefined);
    if (contactIndex === undefined) return;

    const existing = labelsByContactIndex.get(contactIndex) || [];
    if (!existing.includes(label)) {
      labelsByContactIndex.set(contactIndex, [...existing, label]);
    }
  });

  return labelsByContactIndex;
};

const BulletList = ({ items }) => {
  if (!items) return <p className="text-sm text-muted-foreground">Not provided.</p>;
  const arr = Array.isArray(items) ? items : [items];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">Not provided.</p>;
  
  return (
    <ul className="list-disc pl-5 space-y-2 text-sm text-foreground">
      {arr.map((item, i) => (
        <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
      ))}
    </ul>
  );
};

const COMPANY_PRESENCE_FIELD_KEYS = new Set([
  'company_presence_summary',
  'headquarters_location',
  'operating_locations',
  'regional_presence_evidence',
  'locations',
  'registered_office_address',
  'brand_portfolio',
  'brand_portfolio_summary'
]);

const isPresentBriefValue = (value) => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.map(stringifyBriefValue).some(Boolean);
  return stringifyBriefValue(value).length > 0;
};

const toBriefValueList = (value) => {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map(stringifyBriefValue).filter(Boolean);
};

const formatCompanyFieldLabel = (key) => key
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const getCompanyPresenceRows = (company = {}) => ([
  {
    key: 'headquarters_location',
    label: 'HQ / principal location',
    value: company.headquarters_location,
    list: false
  },
  {
    key: 'operating_locations',
    label: 'Operating locations',
    value: company.operating_locations,
    list: true
  },
  {
    key: 'regional_presence_evidence',
    label: 'Regional presence evidence',
    value: company.regional_presence_evidence,
    list: true
  },
  {
    key: 'locations',
    label: 'Other locations / served regions',
    value: company.locations,
    list: true
  },
  {
    key: 'registered_office_address',
    label: 'Registered office (legal address)',
    value: company.registered_office_address,
    list: false
  }
]).filter((row) => isPresentBriefValue(row.value));

const CompanyPresenceBlock = ({ company }) => {
  const rows = getCompanyPresenceRows(company);
  const summary = getBriefFieldText(company?.company_presence_summary);
  if (!summary && rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span>Company Presence</span>
      </div>

      {summary && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      )}

      {rows.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((row) => {
            const values = toBriefValueList(row.value);
            return (
              <div key={row.key} className="rounded-lg border border-border/50 bg-background/70 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </div>
                {row.list ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-foreground">
                    {values.map((value, index) => (
                      <li key={`${row.key}-${index}`}>{value}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{values.join(', ')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const formatBrandPortfolioLabel = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const getBrandPortfolioEntries = (company = {}) => {
  const rawEntries = Array.isArray(company?.brand_portfolio) ? company.brand_portfolio : [];
  return rawEntries
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => {
      const name = getBriefFieldText(entry.name);
      if (!name) return null;
      const relationship = getBriefFieldText(entry.relationship);
      const category = getBriefFieldText(entry.category);
      return {
        name,
        relationship,
        category,
        evidence: getBriefFieldText(entry.evidence),
        source: getBriefFieldText(entry.source),
        metadata: [relationship, category].filter(Boolean).map(formatBrandPortfolioLabel).join(' · ')
      };
    })
    .filter(Boolean);
};

const BrandPortfolioBlock = ({ company }) => {
  const entries = getBrandPortfolioEntries(company);
  const summary = getBriefFieldText(company?.brand_portfolio_summary);
  if (!summary && entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Tags className="h-4 w-4 text-muted-foreground" />
        <span>Brand Portfolio</span>
      </div>

      {summary && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      )}

      {entries.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {entries.map((entry, index) => (
            <div key={`${entry.name}-${index}`} className="rounded-lg border border-border/50 bg-background/70 p-3">
              <div className="text-sm font-semibold text-foreground">{entry.name}</div>
              {entry.metadata && (
                <div className="mt-1 text-xs font-medium text-muted-foreground">{entry.metadata}</div>
              )}
              {entry.evidence && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.evidence}</p>
              )}
              {entry.source && (
                <a
                  href={entry.source}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const toBriefTextItems = (items) => {
  if (!items) return [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.map(stringifyBriefValue).filter(Boolean);
};

const cleanWhyNowSignalText = (value) => String(value || '')
  .replace(/\b(?:Trigger|Why it matters|Use in conversation):\s*/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

const WhyNowTriggerCard = ({ signal }) => (
  <Card className="bg-card shadow-sm border-border">
    <CardContent className="flex h-full gap-3 p-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500/80" />
      <div className="min-w-0 space-y-1.5">
        <Badge
          variant="outline"
          className="h-5 border-green-500/25 bg-green-500/10 px-2 text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400"
        >
          Trigger
        </Badge>
        <p className="text-sm leading-relaxed text-foreground">{signal}</p>
      </div>
    </CardContent>
  </Card>
);

const WhyNowSection = ({ items }) => {
  const signals = toBriefTextItems(items);
  if (signals.length === 0) return null;

  const cleanedSignals = signals.map(cleanWhyNowSignalText).filter(Boolean);
  if (cleanedSignals.length === 0) return null;

  const visibleSignals = cleanedSignals.slice(0, 3);
  const overflowSignals = cleanedSignals.slice(3);

  return (
    <Section title="Why Now">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {visibleSignals.map((signal, index) => (
          <WhyNowTriggerCard key={`${signal}-${index}`} signal={signal} />
        ))}
      </div>

      {overflowSignals.length > 0 && (
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card shadow-sm">
          <AccordionItem value="more-triggers" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 text-left hover:no-underline hover:text-primary">
              <span className="text-sm font-semibold text-foreground">
                More triggers ({overflowSignals.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {overflowSignals.map((signal, index) => (
                  <WhyNowTriggerCard key={`${signal}-${index + 3}`} signal={signal} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </Section>
  );
};

const normalizeTalkTrackKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const getTalkTrackObjectField = (talkTrack, keys) => {
  if (!talkTrack || typeof talkTrack !== 'object' || Array.isArray(talkTrack)) return '';
  const normalizedKeys = keys.map(normalizeTalkTrackKey);
  const entry = Object.entries(talkTrack).find(([key]) => normalizedKeys.includes(normalizeTalkTrackKey(key)));
  return entry ? stringifyBriefValue(entry[1]) : '';
};

const getTalkTrackFlowSteps = (talkTrack) => {
  if (!talkTrack || typeof talkTrack !== 'object' || Array.isArray(talkTrack)) return [];

  return [
    {
      key: 'primary-angle',
      label: 'Primary angle',
      value: getTalkTrackObjectField(talkTrack, ['primary_angle', 'primary angle', 'primaryAngle', 'primary'])
    },
    {
      key: 'secondary-angle',
      label: 'Secondary angle',
      value: getTalkTrackObjectField(talkTrack, ['secondary_angle', 'secondary angle', 'secondaryAngle', 'secondary'])
    },
    {
      key: 'discovery-hook',
      label: 'Discovery hook',
      value: getTalkTrackObjectField(talkTrack, ['discovery_hook', 'discovery hook', 'discoveryHook', 'hook'])
    },
    {
      key: 'value-framing',
      label: 'Value framing',
      value: getTalkTrackObjectField(talkTrack, ['value_framing', 'value framing', 'valueFraming', 'value'])
    }
  ].filter((step) => step.value);
};

const TalkTrackFlowCard = ({ talkTrack }) => {
  const steps = getTalkTrackFlowSteps(talkTrack);
  const hasStructuredSteps = steps.length > 0;

  return (
    <Card className="bg-card shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recommended Angle & Talk Track</CardTitle>
      </CardHeader>
      <CardContent>
        {hasStructuredSteps ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <div key={step.key} className="min-w-0 rounded-lg border border-border/70 bg-muted/20 p-3">
                <Badge
                  variant="outline"
                  className="mb-2 border-primary/25 bg-primary/10 px-2 text-[10px] font-semibold uppercase tracking-wider text-primary"
                >
                  {step.label}
                </Badge>
                <p className="text-sm leading-relaxed text-foreground">{step.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <BulletList items={talkTrack} />
        )}
      </CardContent>
    </Card>
  );
};

const Section = ({ title, children, className }) => (
  <div className={cn("space-y-3", className)}>
    <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
    {children}
  </div>
);

const MiniTile = ({ label, value, isBadge }) => (
  <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    {isBadge ? (
      <Badge variant="secondary" className="w-fit font-normal bg-secondary/50">{value}</Badge>
    ) : (
      <span className="text-sm font-medium text-foreground">{value}</span>
    )}
  </div>
);

const formatSnakeCaseLabel = (value) => {
  const text = String(value || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
};

const isSafeExternalUrl = (value) => (
  typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim())
);

const normalizeContactCount = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
};

const getContactRouteViewModel = (contactRoute) => {
  const route = contactRoute && typeof contactRoute === 'object' && !Array.isArray(contactRoute)
    ? contactRoute
    : null;
  const selectedRoute = route?.selected_route
    && typeof route.selected_route === 'object'
    && !Array.isArray(route.selected_route)
    ? route.selected_route
    : null;
  const attempts = Array.isArray(route?.attempts)
    ? route.attempts.filter((attempt) => attempt && typeof attempt === 'object' && !Array.isArray(attempt))
    : [];
  const acceptedCount = normalizeContactCount(route?.results?.accepted_contact_count);
  const rejectedCount = normalizeContactCount(route?.results?.rejected_contact_count);
  const identitySources = Array.isArray(route?.results?.validation_identity_sources)
    ? route.results.validation_identity_sources.map(formatSnakeCaseLabel).filter(Boolean)
    : [];
  const evidenceSources = Array.isArray(route?.evidence?.sources)
    ? route.evidence.sources
      .filter(isSafeExternalUrl)
      .map((source) => source.trim())
    : [];

  return {
    route,
    selectedRoute,
    attempts,
    acceptedCount,
    rejectedCount,
    identitySources,
    evidenceSources,
    hasMeaningfulData: Boolean(selectedRoute)
      || attempts.length > 0
      || acceptedCount > 0
      || rejectedCount > 0
  };
};

const ContactRouteAccordionItem = ({ contactRoute }) => {
  const {
    route,
    selectedRoute,
    attempts,
    acceptedCount,
    rejectedCount,
    identitySources,
    evidenceSources,
    hasMeaningfulData
  } = getContactRouteViewModel(contactRoute);

  if (!hasMeaningfulData) return null;

  const selectedName = getBriefFieldText(selectedRoute?.name);
  const selectedRole = getBriefFieldText(selectedRoute?.role);
  const selectedConfidence = getBriefFieldText(selectedRoute?.confidence);
  const selectedValidationStatus = getBriefFieldText(selectedRoute?.validation_status);
  const selectedWebsite = isSafeExternalUrl(selectedRoute?.website)
    ? selectedRoute.website.trim()
    : '';
  const selectionReason = getBriefFieldText(route?.selection_reason);
  const routeNotes = getBriefFieldText(selectedRoute?.notes);
  const evidenceNotes = getBriefFieldText(route?.evidence?.notes);
  const hasSelectedRouteContent = selectedName
    || selectedRole
    || selectedConfidence
    || selectedValidationStatus
    || selectedWebsite
    || selectionReason
    || routeNotes;

  return (
    <AccordionItem value="contact-route">
      <AccordionTrigger className="hover:no-underline hover:text-primary">
        Contact Route
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pb-4 pt-2">
          {hasSelectedRouteContent && (
            <Card className="border-border/60 bg-muted/10 shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Selected route
                    </p>
                    {(selectedName || selectedRole) && (
                      <p className="mt-1 font-semibold text-foreground">
                        {[selectedName, selectedRole].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedConfidence && <Badge variant="secondary">{selectedConfidence}</Badge>}
                    {selectedValidationStatus && (
                      <Badge variant="outline">{formatSnakeCaseLabel(selectedValidationStatus)}</Badge>
                    )}
                    {route?.owner_fallback_used === true && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400">
                        Owner fallback
                      </Badge>
                    )}
                  </div>
                </div>

                {selectionReason && (
                  <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Selection reason
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{selectionReason}</p>
                  </div>
                )}

                {routeNotes && (
                  <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Route notes
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{routeNotes}</p>
                  </div>
                )}

                {selectedWebsite && (
                  <a
                    href={selectedWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open selected route website
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {(evidenceSources.length > 0 || evidenceNotes) && (
            <Card className="border-border/60 bg-muted/10 shadow-none">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold text-foreground">Route evidence</p>
                {evidenceSources.length > 0 && (
                  <div className="flex flex-col items-start gap-2">
                    {evidenceSources.map((source, index) => (
                      <a
                        key={`${source}-${index}`}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span className="truncate">{extractDomain(source)}</span>
                      </a>
                    ))}
                  </div>
                )}
                {evidenceNotes && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{evidenceNotes}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MiniTile label="Accepted contacts" value={acceptedCount} />
            <MiniTile label="Rejected contacts" value={rejectedCount} />
            {identitySources.length > 0 && (
              <MiniTile label="Validation identity sources" value={identitySources.join(', ')} />
            )}
          </div>

          {attempts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Route attempts</p>
              {attempts.map((attempt, index) => {
                const routeName = getBriefFieldText(attempt.route_name);
                const routeRole = getBriefFieldText(attempt.route_role);
                const outcome = getBriefFieldText(attempt.outcome);
                const resolvedDomain = getBriefFieldText(attempt.resolved_domain);
                const confidence = getBriefFieldText(attempt.confidence);
                const validationStatus = getBriefFieldText(attempt.validation_status);
                const contactCount = normalizeContactCount(attempt.contact_count);
                const attemptRejectedCount = normalizeContactCount(attempt.rejected_contact_count);
                const rejectionReasons = Array.isArray(attempt.rejection_reasons)
                  ? attempt.rejection_reasons.map(getBriefFieldText).filter(Boolean)
                  : [];

                return (
                  <div
                    key={`${routeName || 'route'}-${index}`}
                    className="rounded-xl border border-border/60 bg-muted/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Attempt {index + 1}
                        </p>
                        {(routeName || routeRole) && (
                          <p className="mt-1 font-semibold text-foreground">
                            {[routeName, routeRole].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {outcome && <Badge variant="outline">{formatSnakeCaseLabel(outcome)}</Badge>}
                        {confidence && <Badge variant="secondary">{confidence}</Badge>}
                        {validationStatus && (
                          <Badge variant="outline">{formatSnakeCaseLabel(validationStatus)}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {resolvedDomain && <MiniTile label="Resolved domain" value={resolvedDomain} />}
                      <MiniTile label="Contacts found" value={contactCount} />
                      <MiniTile label="Rejected contacts" value={attemptRejectedCount} />
                    </div>

                    {rejectionReasons.length > 0 && (
                      <div className="mt-3 rounded-lg border border-border/50 bg-background/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Rejection reasons
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
                          {rejectionReasons.map((reason, reasonIndex) => (
                            <li key={`${reason}-${reasonIndex}`}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

const getSignalBandClassName = (key) => {
  if (key === 'strong') return 'bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-400';
  if (key === 'good') return 'bg-lime-500/20 text-lime-700 border-lime-500/30 dark:text-lime-400';
  if (key === 'aging') return 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400';
  if (key === 'lower') return 'bg-muted/40 text-muted-foreground border-border/70';
  return 'bg-secondary text-secondary-foreground border-border/70';
};

const EvidenceSignalTile = ({ label, value, badge }) => {
  if (!value && !badge?.label) return null;

  return (
    <div className="grid min-h-28 grid-rows-[auto_minmax(1.75rem,auto)_auto] gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex min-h-7 items-start">
        {value && <span className="text-sm font-medium text-foreground">{value}</span>}
      </div>
      {badge?.label && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'max-w-full whitespace-normal break-words text-left text-xs font-medium leading-tight',
              badge.className || getSignalBandClassName(badge.key)
            )}
          >
            {badge.label}
          </Badge>
        </div>
      )}
      {!badge?.label && (
        <div />
      )}
    </div>
  );
};

const OsRoofCandidateSection = ({ evidence }) => {
  if (!evidence) return null;

  const roofConfidenceLabel = evidence.roofConfidence?.label;
  const roofConfidenceLevel = evidence.roofConfidence?.level;

  return (
    <Card className="bg-card shadow-sm border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
              Property / Site Evidence
            </p>
            <h4 className="text-lg font-semibold leading-tight text-foreground">{evidence.title}</h4>
            {evidence.nearestAddress && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {evidence.nearestAddress}
              </p>
            )}
          </div>

          {evidence.googleMapsUrl && (
            <a
              href={evidence.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Verify on Google Maps
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <EvidenceSignalTile
            label="Footprint Area"
            value={evidence.footprintArea}
            badge={evidence.footprintArea ? evidence.roofSizeBand : null}
          />
          <EvidenceSignalTile
            label="Building Age"
            value={evidence.buildingAge}
            badge={evidence.buildingAge ? evidence.buildingAgeBand : null}
          />
          {roofConfidenceLabel && (
            <EvidenceSignalTile
              label="Roof Confidence"
              value={evidence.roofConfidence?.caveat}
              badge={{
                key: roofConfidenceLevel,
                label: roofConfidenceLabel,
                className: getConfidenceColor(roofConfidenceLevel)
              }}
            />
          )}
          <EvidenceSignalTile
            label="Roof Evidence Date"
            value={evidence.roofEvidenceDate}
            badge={evidence.roofEvidenceDate ? evidence.roofEvidenceDateBand : null}
          />
          {evidence.osid && (
            <MiniTile label="OSID" value={evidence.osid} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PlanningApplicationSection = ({ evidence }) => {
  if (!evidence) return null;

  return (
    <Card className="bg-card shadow-sm border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
              Property / Site Evidence
            </p>
            <h4 className="text-lg font-semibold leading-tight text-foreground">{evidence.title}</h4>
            {evidence.proposal && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {evidence.proposal}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open planning record
            </a>
            {evidence.documentsUrl && (
              <a
                href={evidence.documentsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View documents
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniTile label="Reference" value={evidence.reference} />
          <MiniTile label="Status" value={evidence.status} />
          <MiniTile label="Authority" value={evidence.authority} />
          <MiniTile label="Source" value={evidence.sourceLabel} />
        </div>
      </CardContent>
    </Card>
  );
};

const PropertySiteEvidenceSection = ({ osRoofEvidence, planningEvidence }) => {
  if (!osRoofEvidence && !planningEvidence) return null;

  return (
    <Section title="Property / Site Evidence">
      <div className="space-y-4">
        <OsRoofCandidateSection evidence={osRoofEvidence} />
        <PlanningApplicationSection evidence={planningEvidence} />
      </div>
    </Section>
  );
};

const RouteEvidenceCard = ({ card }) => {
  const confidenceLabel = getCompactConfidenceLabel(card.confidence);

  return (
    <Card className={cn(
      'bg-card shadow-sm',
      card.isEmpty ? 'border-dashed border-border/70 bg-muted/10' : 'border-border',
      card.isSelected && 'border-primary/50 bg-primary/5'
    )}>
      <CardContent className="p-3 flex flex-col gap-2.5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
              {card.label}
            </p>
            {card.isSelected && (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[11px]">
                Selected route
              </Badge>
            )}
          </div>
          <h4 className={cn(
            'font-semibold leading-tight',
            card.isEmpty ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {card.isEmpty ? 'No route identified' : card.name}
          </h4>
        </div>

        {card.evidence && (
          <p
            className="overflow-hidden text-sm leading-snug text-muted-foreground"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {card.evidence}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2">
          {confidenceLabel ? (
            <Badge variant="outline" className={cn('text-xs font-medium', getConfidenceColor(confidenceLabel))}>
              {confidenceLabel} confidence
            </Badge>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Route slot</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const RouteVisualizationSection = ({ cards }) => {
  if (!cards || cards.length === 0 || !cards.some((card) => !card.isEmpty)) return null;

  return (
    <Section title="Route Evidence">
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <RouteEvidenceCard key={`${card.type}-${index}`} card={card} />
        ))}
      </div>
    </Section>
  );
};

const PartnershipFitAccordionItem = ({ card }) => (
  <AccordionItem value={card.key} className="rounded-xl border border-border bg-card px-4 shadow-sm">
    <AccordionTrigger className="py-4 text-left hover:no-underline hover:text-primary">
      <div className="flex w-full items-center justify-between gap-4 pr-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-foreground">
            {card.hasScore ? `${card.score}/${card.maxScore}` : `Not captured/${card.maxScore}`}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-muted/20 px-3 py-1 text-xs font-semibold text-muted-foreground">
          View evidence
        </span>
      </div>
    </AccordionTrigger>
    <AccordionContent className="pb-4 pt-0">
      <div className="border-t border-border/60 pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {card.evidenceLabel}
        </p>
        {card.evidence.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {card.evidence.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No supporting evidence captured</p>
        )}
      </div>
    </AccordionContent>
  </AccordionItem>
);

const PartnershipFitSection = ({ fit }) => {
  if (!fit?.cards?.length) return null;

  return (
    <Section title="Partnership Fit">
      <Accordion type="multiple" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fit.cards.map((card) => (
          <PartnershipFitAccordionItem key={card.key} card={card} />
        ))}
      </Accordion>
    </Section>
  );
};

const CollapsibleBriefSection = ({ value, title, items }) => (
  <AccordionItem value={value} className="border-b border-border/50 last:border-b-0">
    <AccordionTrigger className="px-4 py-3 text-left hover:no-underline hover:text-primary">
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </AccordionTrigger>
    <AccordionContent className="px-4 pb-4 pt-1">
      <BulletList items={items} />
    </AccordionContent>
  </AccordionItem>
);

const SalesGuidanceSection = ({ salesBrief }) => {
  const sections = [
    {
      value: 'discovery-questions',
      title: 'Discovery Questions',
      items: salesBrief.discovery_questions
    },
    {
      value: 'objections-responses',
      title: 'Objections & Responses',
      items: salesBrief.objections_and_responses
    },
    {
      value: 'suggested-openers',
      title: 'Suggested Openers',
      items: salesBrief.suggested_openers
    },
    {
      value: 'next-best-action',
      title: 'Next Best Action',
      items: salesBrief.next_best_action
    }
  ].filter((section) => section.items);

  if (sections.length === 0) return null;

  return (
    <Section title="Sales Guidance">
      <Accordion type="multiple" className="w-full bg-card rounded-xl border border-border shadow-sm">
        {sections.map((section) => (
          <CollapsibleBriefSection
            key={section.value}
            value={section.value}
            title={section.title}
            items={section.items}
          />
        ))}
      </Accordion>
    </Section>
  );
};

const getProjectStageStepClassName = (status) => {
  if (status === 'complete') return 'border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-400';
  if (status === 'active') return 'border-primary bg-primary/15 text-primary shadow-sm';
  return 'border-border/70 bg-muted/20 text-muted-foreground';
};

const ACTIVE_PROJECT_STEPS = [
  { key: 'planning', label: 'Planning' },
  { key: 'tendering', label: 'Tendering' },
  { key: 'onsite', label: 'On Site' }
];

const ProjectStageSection = ({ stage }) => {
  if (!stage) return null;

  const confidenceLabel = getCompactConfidenceLabel(stage.confidence);
  const isBuiltOperational = stage.opportunityMode === 'built_operational'
    || stage.displayStageKey === 'built_operational';
  const sectionTitle = stage.displayContextLabel || (isBuiltOperational ? 'Opportunity Mode' : 'Project Stage');
  const title = stage.displayStageLabel
    || stage.opportunityModeLabel
    || stage.stageLabel
    || (isBuiltOperational ? 'Built / Operational' : 'Stage supplied');
  const activeIndex = ACTIVE_PROJECT_STEPS.findIndex((step) => step.key === stage.displayStageKey);

  if (isBuiltOperational) {
    return (
      <Section title={sectionTitle}>
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-3 space-y-3">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                {stage.displayContextLabel || 'Opportunity Mode'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold leading-tight text-foreground">
                  {title}
                </h4>
                {confidenceLabel && (
                  <Badge variant="outline" className={cn('text-[11px] font-medium', getConfidenceColor(confidenceLabel))}>
                    {confidenceLabel} confidence
                  </Badge>
                )}
              </div>
              {stage.reason && (
                <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">{stage.reason}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Section>
    );
  }

  return (
    <Section title={sectionTitle}>
      <Card className="bg-card shadow-sm border-border">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                Project Stage
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold leading-tight text-foreground">
                  {title}
                </h4>
                {confidenceLabel && (
                  <Badge variant="outline" className={cn('text-[11px] font-medium', getConfidenceColor(confidenceLabel))}>
                    {confidenceLabel} confidence
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-start gap-2" aria-label="Project stage row">
              {ACTIVE_PROJECT_STEPS.map((step, index) => {
                const status = activeIndex === -1
                  ? 'pending'
                  : (index < activeIndex ? 'complete' : (index === activeIndex ? 'active' : 'pending'));
                const isActive = status === 'active';
                return (
                  <div key={step.key} className="flex min-w-0 flex-1 items-center">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                      <div
                        data-testid={`project-stage-step-${step.key}`}
                        data-status={status}
                        aria-current={isActive ? 'step' : undefined}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                          getProjectStageStepClassName(status)
                        )}
                      >
                        {index + 1}
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium leading-tight',
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {index < ACTIVE_PROJECT_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'mt-3 h-px w-10 shrink-0',
                          status === 'complete' ? 'bg-green-500/50' : 'bg-border'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
};

const normalizeCompanyContactNumbers = (value) => (
  Array.isArray(value)
    ? value
      .filter((number) => typeof number === 'string')
      .map((number) => number.trim())
      .filter(Boolean)
    : []
);

const CompanyContactStrip = ({ companyName, phone }) => {
  if (!phone) return null;

  return (
    <div
      className="mb-4 flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4"
      title="Company-level number — not a direct personal phone"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 font-semibold text-foreground">{companyName}</span>
      </div>
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
      <span className="text-muted-foreground">Company line</span>
      <span className="whitespace-nowrap text-foreground">{phone}</span>
      <span className="sr-only">Company-level number — not a direct personal phone</span>
    </div>
  );
};

const RelationshipAnalyticsTracker = ({ properties, briefIdentity }) => {
  useEffect(() => {
    emitRelationshipAnalyticsEvent('portal_finalized_brief_viewed', properties);
  }, [
    briefIdentity,
    properties.known_network_contact_existed,
    properties.known_network_contact_recommended,
    properties.selected_contact_role_fit,
    properties.selected_contact_details_enriched,
    properties.relationship_source
  ]);

  return null;
};

const ContactCard = ({
  contact,
  routeLabels = [],
  companyName,
  salesBrief,
  outreach,
  isRecommendedKnown = false,
  analyticsProperties = {}
}) => {
  const emailDraft = buildBriefEmailDraft({ companyName, contact, salesBrief, outreach });
  const linkedInDraft = buildBriefLinkedInDraft({ companyName, contact, salesBrief, outreach });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState(emailDraft?.subject || '');
  const [emailBody, setEmailBody] = useState(emailDraft?.body || '');
  const [linkedInDialogOpen, setLinkedInDialogOpen] = useState(false);
  const [linkedInMessage, setLinkedInMessage] = useState(linkedInDraft?.message || '');

  if (!contact) return null;
  const name = getContactName(contact) || 'Unknown Contact';
  const role = getContactRole(contact) || 'Unknown Role';
  const phone = contact.telephone || contact.phone || '—';
  const email = getContactEmail(contact) || '—';
  const linkedin = getContactLinkedIn(contact) || '—';
  const confidenceLabel = getCompactConfidenceLabel(contact.confidence);
  const routeTypeLabel = getContactRouteTypeLabel(contact.route_type);
  const knownNetwork = isKnownNetworkContact(contact);
  const roleFitLabel = getRoleFitLabel(contact.role_fit);
  const detailsEnriched = hasEnrichedContactDetails(contact);
  const detailsUnavailable = knownNetwork && !detailsEnriched && !getContactEmail(contact) && !contact.telephone && !contact.phone;

  const mailtoUrl = emailDraft
    ? `mailto:${encodeURIComponent(emailDraft.to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : '';
  const canOpenMailto = Boolean(emailDraft) && mailtoUrl.length <= 1900;

  const onOpenEmailDraft = (event) => {
    event.stopPropagation();
    if (!emailDraft) return;
    setEmailSubject(emailDraft.subject);
    setEmailBody(emailDraft.body);
    setEmailDialogOpen(true);
    emitRelationshipAnalyticsEvent('portal_outreach_generated', {
      ...analyticsProperties,
      outreach_channel: 'email'
    });
  };

  const onCopyDraft = async (event) => {
    event.stopPropagation();
    const draftText = `To: ${emailDraft.to}\nSubject: ${emailSubject}\n\n${emailBody}`;
    await navigator.clipboard?.writeText(draftText);
  };

  const onOpenMailto = (event) => {
    event.stopPropagation();
    if (!canOpenMailto) return;
    window.location.href = mailtoUrl;
  };

  const onOpenLinkedInDraft = (event) => {
    event.stopPropagation();
    if (!linkedInDraft) return;
    setLinkedInMessage(linkedInDraft.message);
    setLinkedInDialogOpen(true);
    emitRelationshipAnalyticsEvent('portal_outreach_generated', {
      ...analyticsProperties,
      outreach_channel: 'linkedin'
    });
  };

  const onCopyLinkedInDraft = async (event) => {
    event.stopPropagation();
    await navigator.clipboard?.writeText(linkedInMessage);
  };

  const onOpenLinkedInProfile = (event) => {
    event.stopPropagation();
    if (!linkedInDraft?.profileUrl) return;
    window.open(linkedInDraft.profileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={cn(
      'bg-card shadow-sm border-border',
      knownNetwork && 'border-amber-500/35 bg-amber-500/[0.04] ring-1 ring-amber-500/10',
      isRecommendedKnown && 'border-amber-500/60 bg-amber-500/[0.07] shadow-md'
    )} data-contact-card="true">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
            <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
              {isRecommendedKnown ? (
                <Badge className="px-2 py-0.5 text-[11px] font-semibold bg-amber-500 text-amber-950 border-amber-500">
                  Recommended known network contact
                </Badge>
              ) : knownNetwork ? (
                <Badge variant="outline" className="px-2 py-0 text-[11px] font-semibold bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300">
                  Known network contact
                </Badge>
              ) : null}
              {roleFitLabel && (
                <Badge variant="outline" className="px-2 py-0 text-[11px] font-medium bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300">
                  {roleFitLabel}
                </Badge>
              )}
              {routeTypeLabel && (
                <Badge
                  variant="outline"
                  className="px-2 py-0 text-[11px] font-medium bg-primary/10 text-primary border-primary/25"
                >
                  {routeTypeLabel}
                </Badge>
              )}
              {routeLabels.map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="px-2 py-0 text-[11px] font-medium bg-muted/30 text-muted-foreground border-border/70"
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          {confidenceLabel && (
            <Badge variant="outline" className={cn("text-xs font-medium", getConfidenceColor(confidenceLabel))}>
              {confidenceLabel} Match
            </Badge>
          )}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Mail className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">{renderEmailAsLink(email)}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Phone className="h-4 w-4 mr-2 shrink-0" />
            <span>{phone}</span>
          </div>
          {linkedin !== '—' && (
            <div className="flex items-center text-primary">
              <Linkedin className="h-4 w-4 mr-2 shrink-0" />
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                LinkedIn Profile
              </a>
            </div>
          )}
          {(detailsEnriched || detailsUnavailable) && (
            <p className="pt-1 text-xs text-muted-foreground">
              {detailsEnriched ? 'Contact details enriched' : 'Contact details unavailable'}
            </p>
          )}
        </div>

        {emailDraft && email !== '—' && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full justify-center"
              onClick={onOpenEmailDraft}
            >
              <Mail className="h-4 w-4" />
              Generate email
            </Button>
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogContent className="sm:max-w-2xl" onClick={(event) => event.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Generated email draft</DialogTitle>
                  <DialogDescription>
                    Review the draft before copying it or opening your email client.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor={`email-to-${emailDraft.to}`}>To</label>
                    <Input id={`email-to-${emailDraft.to}`} value={emailDraft.to} readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor={`email-subject-${emailDraft.to}`}>Subject</label>
                    <Input
                      id={`email-subject-${emailDraft.to}`}
                      value={emailSubject}
                      onChange={(event) => setEmailSubject(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor={`email-body-${emailDraft.to}`}>Body</label>
                    <Textarea
                      id={`email-body-${emailDraft.to}`}
                      value={emailBody}
                      onChange={(event) => setEmailBody(event.target.value)}
                      rows={10}
                      className="resize-y"
                    />
                  </div>
                  {!canOpenMailto && (
                    <p className="text-sm text-muted-foreground">
                      This draft is too long to open reliably as a mailto link. Copy it into your email client instead.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onCopyDraft}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button type="button" onClick={onOpenMailto} disabled={!canOpenMailto}>
                    <ExternalLink className="h-4 w-4" />
                    Open in email client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {linkedInDraft && linkedin !== '—' && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={onOpenLinkedInDraft}
            >
              <Linkedin className="h-4 w-4" />
              Generate LinkedIn
            </Button>
            <Dialog open={linkedInDialogOpen} onOpenChange={setLinkedInDialogOpen}>
              <DialogContent className="sm:max-w-2xl" onClick={(event) => event.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Generated LinkedIn message</DialogTitle>
                  <DialogDescription>
                    Review the connection note before copying it or opening the LinkedIn profile.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor={`linkedin-profile-${name}`}>LinkedIn profile</label>
                    <Input id={`linkedin-profile-${name}`} value={linkedInDraft.profileUrl} readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium" htmlFor={`linkedin-message-${name}`}>Message</label>
                      <span className="text-xs text-muted-foreground">
                        {linkedInMessage.length} / {LINKEDIN_MESSAGE_LIMIT}
                      </span>
                    </div>
                    <Textarea
                      id={`linkedin-message-${name}`}
                      value={linkedInMessage}
                      onChange={(event) => setLinkedInMessage(event.target.value)}
                      maxLength={LINKEDIN_MESSAGE_LIMIT}
                      rows={5}
                      className="resize-y"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onCopyLinkedInDraft}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button type="button" onClick={onOpenLinkedInProfile}>
                    <ExternalLink className="h-4 w-4" />
                    Open LinkedIn profile
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const EventCard = ({ event }) => {
  if (!event) return null;
  
  // Fallback for unstructured string events
  if (typeof event === 'string') {
    return (
      <Card className="bg-card shadow-sm border-border">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">{event}</p>
        </CardContent>
      </Card>
    );
  }

  const title = event.title || event.name || 'Unknown Event';
  const type = event.event_type;
  const date = event.date;
  const timing = event.timing;
  const what = event.what || event.description;
  const why = event.why;
  const source = event.source;

  const isUrl = source && (source.startsWith('http://') || source.startsWith('https://'));

  return (
    <Card className="bg-card shadow-sm border-border overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 flex flex-col h-full space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-semibold text-foreground leading-tight">{title}</h4>
          {type && (
            <Badge variant="secondary" className="shrink-0 text-xs font-medium">
              {type}
            </Badge>
          )}
        </div>

        {(date || timing) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/30 w-fit px-2 py-1 rounded-md">
            <Calendar className="h-3 w-3" />
            {date && <span>{date}</span>}
            {date && timing && <span>•</span>}
            {timing && <span>{timing}</span>}
          </div>
        )}

        <div className="space-y-2 flex-1">
          {what && (
            <div className="text-sm">
              <span className="font-semibold text-foreground mr-1">What:</span>
              <span className="text-muted-foreground">{what}</span>
            </div>
          )}

          {why && (
            <div className="text-sm">
              <span className="font-semibold text-foreground mr-1">Why it matters:</span>
              <span className="text-muted-foreground">{why}</span>
            </div>
          )}
        </div>

        {source && (
          <div className="pt-3 mt-auto border-t border-border/50 text-xs">
            {isUrl ? (
              <a 
                href={source} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {extractDomain(source)}
              </a>
            ) : (
              <span className="text-muted-foreground font-medium">Source: {source}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DevelopmentCard = ({ dev }) => {
  if (!dev) return null;

  // Fallback for unstructured string developments
  if (typeof dev === 'string') {
    return (
      <Card className="bg-card shadow-sm border-border">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">{dev}</p>
        </CardContent>
      </Card>
    );
  }

  const title = dev.title || dev.headline || dev.name || 'Unknown Development';
  const date = dev.date || dev.published_at;
  const what = dev.what || dev.description || dev.summary;
  const why = dev.why || dev.relevance;
  const scope = dev.scope || dev.impact;
  const signal = dev.signal || dev.indicator;
  const source = dev.source || dev.url;

  const isUrl = source && (source.startsWith('http://') || source.startsWith('https://'));

  return (
    <Card className="bg-card shadow-sm border-border overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 flex flex-col h-full space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-semibold text-foreground leading-tight">{title}</h4>
          {signal && (
            <Badge variant="outline" className="shrink-0 text-xs font-medium bg-muted/10">
              {signal}
            </Badge>
          )}
        </div>

        {date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/30 w-fit px-2 py-1 rounded-md">
            <Calendar className="h-3 w-3" />
            <span>{date}</span>
          </div>
        )}

        <div className="space-y-2 flex-1">
          {what && (
            <div className="text-sm">
              <span className="font-semibold text-foreground mr-1">What:</span>
              <span className="text-muted-foreground">{what}</span>
            </div>
          )}

          {why && (
            <div className="text-sm">
              <span className="font-semibold text-foreground mr-1">Why it matters:</span>
              <span className="text-muted-foreground">{why}</span>
            </div>
          )}

          {scope && (
            <div className="text-sm">
              <span className="font-semibold text-foreground mr-1">Scope:</span>
              <span className="text-muted-foreground">{scope}</span>
            </div>
          )}
        </div>

        {source && (
          <div className="pt-3 mt-auto border-t border-border/50 text-xs">
            {isUrl ? (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {extractDomain(source)}
              </a>
            ) : (
              <span className="text-muted-foreground font-medium">Source: {source}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FinalBriefRenderer = ({ briefData }) => {
  if (!briefData || !briefData.final_brief_json) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Brief content is not yet available. Please check back later.</p>
          <p className="text-sm text-muted-foreground mt-2">The final brief JSON data is missing or empty.</p>
        </CardContent>
      </Card>
    );
  }

  let data = null;
  try {
    data = typeof briefData.final_brief_json === 'string'
      ? JSON.parse(briefData.final_brief_json)
      : briefData.final_brief_json;
  } catch (e) {
    console.error('Error parsing final_brief_json:', e);
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-8 text-center">
          <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium text-destructive">Unable to display brief content due to formatting error.</p>
          <p className="text-sm text-destructive/80 mt-2">The brief data could not be read properly.</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Brief content is not yet available. Please check back later.</p>
        </CardContent>
      </Card>
    );
  }

  const salesBrief = data.sales_brief || {};
  const productFitAssessment = normalizeProductFitAssessment(salesBrief.product_fit);
  const outreach = data.outreach || {};
  const researchAppendix = data.research_appendix || {};
  const contactRoute = researchAppendix.contact_route || null;
  const propertyRouteCards = getPropertyRouteCards(data);
  const osRoofCandidateEvidence = getOsRoofCandidateEvidence(data);
  const planningApplicationEvidence = getPlanningApplicationEvidence(data);
  const projectStageEvidence = getProjectStageEvidence(data);
  const partnershipFitEvidence = getPartnershipFitEvidence(data);
  
  // Contacts
  const contacts = getFinalBriefContacts(data);
  const companyContactNumbers = normalizeCompanyContactNumbers(
    researchAppendix.contacts?.company_contact_numbers
  );
  
  const whoToContact = salesBrief.who_to_contact || {};
  const recommendedKnownContact = getRecommendedKnownContact(contacts, whoToContact);
  const orderedContacts = sortContactsForSales(contacts, whoToContact);
  const routeLabelsByContactIndex = buildContactRouteLabels(contacts, whoToContact);

  // Extract display name from briefData or data
  const briefDisplayInfo = getBriefDisplayInfo({
    row: briefData,
    parsedBrief: data,
    fallbackName: briefData.company_name || data.company_name || 'Company Brief',
    fallbackUrl: briefData.website
  });
  const companyName = briefDisplayInfo.displayName || 'Company Brief';
  const relationshipAnalytics = getRelationshipAnalyticsProperties({
    contacts,
    whoToContact,
    selectedContact: recommendedKnownContact
  });

  const isPropertyLedBrief = briefDisplayInfo.isPropertyLed === true;
  const selectedContactRouteName = getBriefFieldText(contactRoute?.selected_route?.name);
  const companyContactName = isPropertyLedBrief && selectedContactRouteName
    ? selectedContactRouteName
    : companyName;
  const hasCompanyAppendix = researchAppendix.company && Object.keys(researchAppendix.company).length > 0;
  const genericCompanyEntries = hasCompanyAppendix
    ? Object.entries(researchAppendix.company).filter(([key, value]) => (
      !COMPANY_PRESENCE_FIELD_KEYS.has(key) && isPresentBriefValue(value)
    ))
    : [];
  const hasPropertyAppendix = isPropertyLedBrief
    && researchAppendix.properties?.properties
    && Array.isArray(researchAppendix.properties.properties)
    && researchAppendix.properties.properties.length > 0;
  const hasNewsAppendix = researchAppendix.news?.developments
    && Array.isArray(researchAppendix.news.developments)
    && researchAppendix.news.developments.length > 0;
  const hasEventsAppendix = researchAppendix.events?.items
    && Array.isArray(researchAppendix.events.items)
    && researchAppendix.events.items.length > 0;
  const hasContactRouteAppendix = getContactRouteViewModel(contactRoute).hasMeaningfulData;
  const hasVisibleResearchAppendix = hasCompanyAppendix
    || hasPropertyAppendix
    || hasNewsAppendix
    || hasEventsAppendix
    || hasContactRouteAppendix;

  return (
    <div className="space-y-8">
      <RelationshipAnalyticsTracker
        properties={relationshipAnalytics}
        briefIdentity={`${briefData?.client_id || ''}:${briefData?.company_id || ''}:${briefData?.final_brief_run_id || ''}`}
      />
      <ProductFitAssessmentSection assessment={productFitAssessment} />
      {/* HEADER SECTION - Single Column */}
      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            {companyName}
          </h1>
        </div>

        {/* Executive Summary */}
        {salesBrief.executive_summary && (
          <Card className="border-border shadow-md">
            <CardContent className="p-6">
              <Section title="Executive Summary">
                <p className="text-foreground leading-relaxed">
                  {typeof salesBrief.executive_summary === 'string' 
                    ? salesBrief.executive_summary 
                    : JSON.stringify(salesBrief.executive_summary)}
                </p>
              </Section>
            </CardContent>
          </Card>
        )}
      </div>

      <WhyNowSection items={salesBrief.why_now} />

      <ProjectStageSection stage={projectStageEvidence} />

      <RouteVisualizationSection cards={propertyRouteCards} />

      {/* CONTACT CARDS */}
      <Section title="Captured Contacts">
        <CompanyContactStrip
          companyName={companyContactName}
          phone={companyContactNumbers[0] || ''}
        />
        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orderedContacts.map((contact, i) => {
              const originalIndex = contacts.indexOf(contact);
              const isRecommendedKnown = Boolean(
                recommendedKnownContact && contactsMatch(contact, recommendedKnownContact)
              );
              return (
              <ContactCard
                key={contact.contact_id || contact.apollo_id || contact.email || `${getContactName(contact)}-${i}`}
                contact={contact}
                routeLabels={routeLabelsByContactIndex.get(originalIndex) || []}
                companyName={companyName}
                salesBrief={salesBrief}
                outreach={outreach}
                isRecommendedKnown={isRecommendedKnown}
                analyticsProperties={getRelationshipAnalyticsProperties({
                  contacts,
                  whoToContact,
                  selectedContact: contact
                })}
              />
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="p-6 text-center text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No named contacts were captured yet. Use the ICP-aligned target titles as the recommended starting point.</p>
            </CardContent>
          </Card>
        )}
      </Section>

      <PartnershipFitSection fit={partnershipFitEvidence} />

      <PropertySiteEvidenceSection
        osRoofEvidence={osRoofCandidateEvidence}
        planningEvidence={planningApplicationEvidence}
      />

      {/* SALES BRIEF SECTIONS */}
      {salesBrief.recommended_angle_talk_track && (
        <div>
          <TalkTrackFlowCard talkTrack={salesBrief.recommended_angle_talk_track} />
        </div>
      )}

      <SalesGuidanceSection salesBrief={salesBrief} />

      {/* EVIDENCE SUMMARY */}
      {salesBrief.evidence_summary && (
        <Card className="bg-muted/10 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Evidence Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <BulletList items={salesBrief.evidence_summary} />
          </CardContent>
        </Card>
      )}

      {/* OPTIONAL RESEARCH APPENDIX */}
      {hasVisibleResearchAppendix && (
        <Section title="Research Appendix" className="pt-6 border-t border-border">
          <Accordion type="single" collapsible className="w-full bg-card rounded-xl border border-border px-4 shadow-sm">
            
            {hasCompanyAppendix && (
              <AccordionItem value="company">
                <AccordionTrigger className="hover:no-underline hover:text-primary">Company Info</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <CompanyPresenceBlock company={researchAppendix.company} />
                    <BrandPortfolioBlock company={researchAppendix.company} />

                    {genericCompanyEntries.map(([key, val]) => (
                      <div key={key}>
                        <span className="font-semibold text-foreground mr-2">
                          {formatCompanyFieldLabel(key)}:
                        </span>
                        <span className="text-muted-foreground">
                          {toBriefValueList(val).join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {hasContactRouteAppendix && (
              <ContactRouteAccordionItem contactRoute={contactRoute} />
            )}

            {hasPropertyAppendix && (
              <AccordionItem value="properties">
                <AccordionTrigger className="hover:no-underline hover:text-primary">Properties & Signals</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2 pb-4">
                    {researchAppendix.properties.properties.map((prop, idx) => {
                      if (typeof prop === 'string') {
                        return (
                          <div key={idx} className="p-4 rounded-xl border border-border/50 bg-muted/10 text-sm">
                            {prop}
                          </div>
                        );
                      }

                      const {
                        address,
                        property_id,
                        ownership_label,
                        property_research_type,
                        property_research_use_class,
                        property_research_summary,
                        epc_property_type,
                        epc_floor_area,
                        epc_asset_rating_band,
                        epc_lodgement_date,
                        epc_meets_target_size,
                        epc_typical_emissions,
                        epc_building_emissions
                      } = prop;

                      const isValid = (val) => {
                        if (val === null || val === undefined || val === '') return false;
                        const strVal = String(val).trim().toLowerCase();
                        if (strVal === 'n/a' || strVal === 'unknown') return false;
                        return true;
                      };

                      const formatBool = (val) => typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val;

                      return (
                        <div key={idx} className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-muted/10">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/50 pb-2">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            Property {isValid(property_id) ? `#${property_id}` : idx + 1}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* 1. Address */}
                            {isValid(address) && (
                              <div className="sm:col-span-2 lg:col-span-3">
                                <MiniTile label="Address" value={address} />
                              </div>
                            )}
                            
                            {/* 2-5 */}
                            {isValid(property_id) && <MiniTile label="Property ID" value={property_id} />}
                            {isValid(ownership_label) && <MiniTile label="Ownership" value={ownership_label} isBadge />}
                            {isValid(property_research_type) && <MiniTile label="Research Type" value={property_research_type} />}
                            {isValid(property_research_use_class) && <MiniTile label="Use Class" value={property_research_use_class} />}
                            
                            {/* 6. Summary */}
                            {isValid(property_research_summary) && (
                              <div className="sm:col-span-2 lg:col-span-3">
                                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Research Summary</span>
                                  <span className="text-sm font-medium text-foreground">{property_research_summary}</span>
                                </div>
                              </div>
                            )}

                            {/* 7-13 */}
                            {isValid(epc_property_type) && <MiniTile label="EPC Property Type" value={epc_property_type} />}
                            {isValid(epc_floor_area) && <MiniTile label="EPC Floor Area" value={epc_floor_area} />}
                            {isValid(epc_asset_rating_band) && <MiniTile label="EPC Rating Band" value={epc_asset_rating_band} isBadge />}
                            {isValid(epc_lodgement_date) && <MiniTile label="EPC Lodgement Date" value={epc_lodgement_date} />}
                            {isValid(epc_meets_target_size) && <MiniTile label="Meets Target Size" value={formatBool(epc_meets_target_size)} isBadge />}
                            {isValid(epc_typical_emissions) && <MiniTile label="Typical Emissions" value={epc_typical_emissions} />}
                            {isValid(epc_building_emissions) && <MiniTile label="Building Emissions" value={epc_building_emissions} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {hasNewsAppendix && (
              <AccordionItem value="news">
                <AccordionTrigger className="hover:no-underline hover:text-primary">News & Developments</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pb-4">
                    {researchAppendix.news.developments.map((dev, i) => (
                      <DevelopmentCard key={i} dev={dev} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {hasEventsAppendix && (
              <AccordionItem value="events">
                <AccordionTrigger className="hover:no-underline hover:text-primary">Events</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pb-4">
                    {researchAppendix.events.items.map((event, i) => (
                      <EventCard key={i} event={event} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

          </Accordion>
        </Section>
      )}

    </div>
  );
};

export default FinalBriefRenderer;
