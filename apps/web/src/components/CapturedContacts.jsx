import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, Phone, Linkedin, Users } from 'lucide-react';
import { renderEmailAsLink } from '@/utils/emailRenderer.js';
import { getContactRouteTypeLabel } from '@/utils/contactRouteTypes.js';
import { cn } from '@/lib/utils.js';
import {
  contactsMatch,
  getRecommendedKnownContact,
  getRoleFitLabel,
  hasEnrichedContactDetails,
  isKnownNetworkContact,
  sortContactsForSales,
  withRecommendedContact
} from '@/utils/contactRelationship.js';

const CapturedContacts = ({ contactsData, detailData }) => {
  if (!contactsData || contactsData.length === 0) return null;

  let finalBrief = {};
  try {
    finalBrief = typeof detailData?.final_brief_json === 'string' 
      ? JSON.parse(detailData.final_brief_json) 
      : (detailData?.final_brief_json || {});
  } catch (e) {
    console.error('Failed to parse final brief', e);
  }
  const whoToContact = finalBrief?.sales_brief?.who_to_contact || {};
  const contactsWithRecommendation = withRecommendedContact(contactsData, whoToContact);
  const recommendedKnownContact = getRecommendedKnownContact(contactsWithRecommendation, whoToContact);
  const orderedContacts = sortContactsForSales(contactsWithRecommendation, whoToContact);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Captured Contacts
        </CardTitle>
        <CardDescription>Key personnel and direct engagement routes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orderedContacts.map((contact, idx) => {
            const routeTypeLabel = getContactRouteTypeLabel(contact.route_type);
            const role = contact.title
              || contact.job_title
              || contact.enriched_title
              || (contact.enrichment_source ? contact.role : '')
              || contact.profession
              || contact.role;
            const email = contact.email || contact.email_address || contact.contact_email;
            const phone = contact.telephone || contact.phone;
            const linkedin = contact.linkedin || contact.linkedin_url || contact.linkedin_profile;
            const knownNetwork = isKnownNetworkContact(contact);
            const isRecommendedKnown = Boolean(
              recommendedKnownContact && contactsMatch(contact, recommendedKnownContact)
            );
            const roleFitLabel = getRoleFitLabel(contact.role_fit);
            const detailsEnriched = hasEnrichedContactDetails(contact);
            const detailsUnavailable = knownNetwork && !detailsEnriched && !email && !phone;

            return (
              <div key={contact.contact_id || contact.apollo_id || contact.email || idx} className={cn(
                'flex flex-col gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow relative',
                knownNetwork && 'border-amber-500/35 bg-amber-500/[0.04] ring-1 ring-amber-500/10',
                isRecommendedKnown && 'border-amber-500/60 bg-amber-500/[0.07]'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-base text-foreground">{contact.name || 'Unknown Contact'}</div>
                    {role && (
                      <div className="text-sm text-muted-foreground mt-0.5">{role}</div>
                    )}
                    {(isRecommendedKnown || knownNetwork || roleFitLabel || routeTypeLabel) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
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
                        <Badge variant="outline" className="px-2 py-0 text-[11px] font-medium bg-primary/10 text-primary border-primary/25">
                          {routeTypeLabel}
                        </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {(contact.match_reason || contact.persona) && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 shrink-0 text-xs text-center max-w-[120px]">
                      {contact.match_reason || contact.persona || 'Best Match'}
                    </Badge>
                  )}
                </div>
              
                <div className="flex flex-col gap-2 mt-1">
                  {email ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="inline-flex items-center gap-2 text-sm w-fit relative z-10"
                          >
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate font-medium">{renderEmailAsLink(email)}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Contact email</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 opacity-50 shrink-0" />
                      No email available
                    </span>
                  )}
                  {phone && (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      {phone}
                    </span>
                  )}
                  {linkedin && (
                    <a 
                      href={linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#0a66c2] cursor-pointer pointer-events-auto transition-colors w-fit relative z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="h-4 w-4 shrink-0" />
                      LinkedIn Profile
                    </a>
                  )}
                  {(detailsEnriched || detailsUnavailable) && (
                    <span className="text-xs text-muted-foreground">
                      {detailsEnriched ? 'Contact details enriched' : 'Contact details unavailable'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CapturedContacts;
