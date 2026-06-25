import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, Phone, Linkedin, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { renderEmailAsLink } from '@/utils/emailRenderer.js';
import { getContactRouteTypeLabel } from '@/utils/contactRouteTypes.js';

const CapturedContacts = ({ contactsData, detailData }) => {
  const { currentUser } = useAuth();
  
  if (!contactsData || contactsData.length === 0) return null;

  let finalBrief = {};
  try {
    finalBrief = typeof detailData?.final_brief_json === 'string' 
      ? JSON.parse(detailData.final_brief_json) 
      : (detailData?.final_brief_json || {});
  } catch (e) {
    console.error('Failed to parse final brief', e);
  }

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
          {contactsData.map((contact, idx) => {
            const routeTypeLabel = getContactRouteTypeLabel(contact.route_type);
            const role = contact.role || contact.job_title || contact.title;
            const email = contact.email || contact.email_address || contact.contact_email;
            const phone = contact.telephone || contact.phone;
            const linkedin = contact.linkedin || contact.linkedin_url || contact.linkedin_profile;

            return (
              <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-base text-foreground">{contact.name || 'Unknown Contact'}</div>
                    {role && (
                      <div className="text-sm text-muted-foreground mt-0.5">{role}</div>
                    )}
                    {routeTypeLabel && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="px-2 py-0 text-[11px] font-medium bg-primary/10 text-primary border-primary/25">
                          {routeTypeLabel}
                        </Badge>
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
