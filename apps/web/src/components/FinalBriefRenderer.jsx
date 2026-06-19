import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  Home
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

const ContactCard = ({ contact, routeLabels = [] }) => {
  if (!contact) return null;
  const name = getContactName(contact) || 'Unknown Contact';
  const role = getContactRole(contact) || 'Unknown Role';
  const phone = contact.telephone || contact.phone || '—';
  const email = getContactEmail(contact) || '—';
  const linkedin = getContactLinkedIn(contact) || '—';

  return (
    <Card className="bg-card shadow-sm border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
            {routeLabels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
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
            )}
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
  
  const contactMatchNote = researchAppendix.contacts?.contact_match_note;
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
              <ContactCard key={i} contact={contact} routeLabels={routeLabelsByContactIndex.get(i) || []} />
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
        
        {contactMatchNote && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-3 bg-muted/30 p-3 rounded-lg">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{contactMatchNote}</p>
          </div>
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
