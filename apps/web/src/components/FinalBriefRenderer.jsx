import React, { useState } from 'react';
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
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { renderEmailAsLink } from '@/utils/emailRenderer.js';

const getConfidenceColor = (confidence) => {
  const c = (confidence || '').toLowerCase();
  if (c === 'high') return 'bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-400';
  if (c === 'medium') return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-400';
  if (c === 'low') return 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-400';
  return 'bg-secondary text-secondary-foreground';
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

const getContactRole = (contact) => contact?.role || contact?.title || contact?.job_title || '';

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

const buildBriefEmailDraft = ({ companyName, contact, salesBrief }) => {
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

const buildBriefLinkedInDraft = ({ companyName, contact, salesBrief }) => {
  const linkedin = getContactLinkedIn(contact);
  if (!linkedin) return null;

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

const ContactCard = ({ contact, routeLabels = [], companyName, salesBrief }) => {
  const emailDraft = buildBriefEmailDraft({ companyName, contact, salesBrief });
  const linkedInDraft = buildBriefLinkedInDraft({ companyName, contact, salesBrief });
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
    <Card className="bg-card shadow-sm border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
            <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
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
          {contact.confidence && (
            <Badge variant="outline" className={cn("text-xs font-medium", getConfidenceColor(contact.confidence))}>
              {contact.confidence} Match
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
  const researchAppendix = data.research_appendix || {};
  
  // Contacts
  const contacts = Array.isArray(researchAppendix.contacts?.items) 
    ? researchAppendix.contacts.items 
    : (Array.isArray(researchAppendix.contacts) ? researchAppendix.contacts : []);
  
  const routeLabelsByContactIndex = buildContactRouteLabels(contacts, salesBrief.who_to_contact || {});

  // Extract company name from briefData or data
  const companyName = briefData.company_name || data.company_name || 'Company Brief';

  return (
    <div className="space-y-8">
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

      {/* CONTACT CARDS */}
      <Section title="Captured Contacts">
        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact, i) => (
              <ContactCard
                key={i}
                contact={contact}
                routeLabels={routeLabelsByContactIndex.get(i) || []}
                companyName={companyName}
                salesBrief={salesBrief}
              />
            ))}
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

      {/* SALES BRIEF SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WHY NOW */}
        {salesBrief.why_now && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Why Now</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={salesBrief.why_now} />
            </CardContent>
          </Card>
        )}

        {/* RECOMMENDED ANGLE AND TALK TRACK */}
        {salesBrief.recommended_angle_talk_track && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recommended Angle & Talk Track</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={salesBrief.recommended_angle_talk_track} />
            </CardContent>
          </Card>
        )}

        {/* DISCOVERY QUESTIONS */}
        {salesBrief.discovery_questions && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Discovery Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={salesBrief.discovery_questions} />
            </CardContent>
          </Card>
        )}

        {/* OBJECTIONS AND RESPONSES */}
        {salesBrief.objections_and_responses && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Objections & Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={salesBrief.objections_and_responses} />
            </CardContent>
          </Card>
        )}

        {/* SUGGESTED OPENER */}
        {salesBrief.suggested_openers && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Suggested Openers</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={salesBrief.suggested_openers} />
            </CardContent>
          </Card>
        )}

        {/* NEXT BEST ACTION */}
        {salesBrief.next_best_action && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Next Best Action</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={salesBrief.next_best_action} />
            </CardContent>
          </Card>
        )}
      </div>

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
      {Object.keys(researchAppendix).length > 0 && (
        <Section title="Research Appendix" className="pt-6 border-t border-border">
          <Accordion type="single" collapsible className="w-full bg-card rounded-xl border border-border px-4 shadow-sm">
            
            {researchAppendix.company && Object.keys(researchAppendix.company).length > 0 && (
              <AccordionItem value="company">
                <AccordionTrigger className="hover:no-underline hover:text-primary">Company Info</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    {Object.entries(researchAppendix.company).map(([key, val]) => (
                      <div key={key}>
                        <span className="font-semibold capitalize text-foreground mr-2">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-muted-foreground">
                          {typeof val === 'string' ? val : JSON.stringify(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {researchAppendix.properties?.properties && Array.isArray(researchAppendix.properties.properties) && (
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

            {researchAppendix.news?.developments && Array.isArray(researchAppendix.news.developments) && researchAppendix.news.developments.length > 0 && (
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

            {researchAppendix.events?.items && Array.isArray(researchAppendix.events.items) && researchAppendix.events.items.length > 0 && (
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
