import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import FinalBriefRenderer from '@/components/FinalBriefRenderer.jsx';
import ActionCard from '@/components/ActionCard.jsx';
import BriefFeedbackCard from '@/components/BriefFeedbackCard.jsx';
import BriefAssignmentCard from '@/components/BriefAssignmentCard.jsx';
import SignalsSection from '@/components/SignalsSection.jsx';
import { 
  ArrowLeft, Download, ExternalLink, AlertCircle, FileQuestion, Activity, Target, Hash, Lightbulb, Home, Info, Zap, Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';
import { getEcommerceSignalAudit } from '@/utils/briefDataExtractors.js';

const PUBLIC_BASE_URL = 'https://poc.growth-assist.co.uk';

const safeText = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return val.map(safeText).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    return val.name || val.title || val.label || val.value || val.description || '';
  }
  return '';
};

const MiniTile = ({ label, value, isBadge }) => (
  <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    {isBadge ? (
      <Badge variant="secondary" className="w-fit font-normal bg-secondary/50">{value || 'N/A'}</Badge>
    ) : (
      <span className="text-sm font-medium text-foreground">{value || 'N/A'}</span>
    )}
  </div>
);

const BriefDetailPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { client_id: clientId, isLoading: authLoading, currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Explicit states
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [targetData, setTargetData] = useState(null);
  const [parsedBrief, setParsedBrief] = useState(null);
  const [error, setError] = useState(null);
  const [assignmentRefreshKey, setAssignmentRefreshKey] = useState(0);

  useEffect(() => {
    // Wait for auth to finish loading before attempting to fetch
    if (authLoading) return;

    const fetchData = async () => {
      // Reset states
      setIsLoading(true);
      setIsNotFound(false);
      setIsLoaded(false);
      setTargetData(null);
      setParsedBrief(null);
      setError(null);

      // Check if client_id exists
      if (!clientId) {
        setError("Authentication required or client ID missing.");
        setIsLoading(false);
        return;
      }

      if (!companyId) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        // 1. Query portal_target_company_detail
        const { data: target, error: targetError } = await supabase
          .from('portal_target_company_detail')
          .select('client_id, company_id, latest_run_id, latest_logged_at, name, website, industry, campaign_id, signal_id, signal_type, fit_score, decision, final_brief_run_id, final_brief_generated_at, has_finalized_brief, final_brief_json')
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .maybeSingle();

        if (targetError) {
          setError(targetError.message || 'A network error occurred while loading the brief.');
          setIsLoading(false);
          return;
        } 
        
        if (!target) {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }

        setTargetData(target);
        
        // Parse final_brief_json
        let parsed = null;
        if (target.final_brief_json) {
          try {
            parsed = typeof target.final_brief_json === 'string' 
              ? JSON.parse(target.final_brief_json) 
              : target.final_brief_json;
          } catch (parseErr) {
            console.warn('Failed to parse final_brief_json:', parseErr);
            parsed = null;
          }
        }
        setParsedBrief(parsed);

        setIsLoaded(true);
      } catch (err) {
        console.error('Error fetching company details:', err);
        setError(err.message || 'A network error occurred while loading the brief.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [companyId, clientId, authLoading]);

  // View wrapper to keep UI consistent
  const PageWrapper = ({ children, title = "Brief Detail" }) => (
    <>
      <Helmet>
        <title>{title} - LeadScout Portal</title>
      </Helmet>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/briefs')}
                className="mb-6 hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to briefs
              </Button>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </>
  );

  // Render based on explicit states
  if (isLoading || authLoading) {
    return (
      <PageWrapper title="Loading Brief">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <Skeleton className="h-10 w-64 mb-2 rounded-lg" />
                <Skeleton className="h-5 w-48 rounded-md" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <Skeleton className="h-6 w-32 rounded-md" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isNotFound) {
    return (
      <PageWrapper title="Not Found">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileQuestion className="h-5 w-5 text-muted-foreground" />
              Company Brief Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">We couldn't find a brief matching this ID. It may have been deleted or the URL is incorrect.</p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Error">
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Brief
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (isLoaded && targetData) {
    const { 
      name,
      website,
      industry,
      company_id,
      final_brief_run_id,
      has_finalized_brief,
      fit_score,
      decision,
      campaign_id,
      signal_id,
      signal_type
    } = targetData;
    
    const normalizedTargetData = {
      ...targetData,
      final_brief_json: parsedBrief || targetData.final_brief_json
    };

    const displayName = name || parsedBrief?.company_name || company_id || 'Unknown Company';
    
    let extractedIndustry = industry;
    let extractedLocation = null;

    if (parsedBrief) {
      const companyInfo = parsedBrief.research_appendix?.company || {};
      
      // Industry priority: companyInfo.industry → parsedBrief.industry → targetData.industry
      const rawIndustry = companyInfo.industry || parsedBrief.industry;
      if (rawIndustry) {
        if (typeof rawIndustry === 'string') {
          extractedIndustry = rawIndustry;
        } else {
          extractedIndustry = safeText(rawIndustry) || industry;
        }
      }

      // Location priority: companyInfo.address → companyInfo.location → companyInfo.headquarters → parsedBrief.location
      const rawLocation = companyInfo.address || companyInfo.location || companyInfo.headquarters || parsedBrief.location;
      
      if (rawLocation) {
        if (Array.isArray(rawLocation)) {
          const parsedArray = rawLocation.map(l => {
            if (typeof l === 'object' && l !== null) return l.city || l.name || l.country || l.address || '';
            return String(l);
          }).filter(Boolean);
          if (parsedArray.length > 0) extractedLocation = parsedArray.join(', ');
        } else if (typeof rawLocation === 'object' && rawLocation !== null) {
          extractedLocation = rawLocation.city || rawLocation.name || rawLocation.country || rawLocation.address || '';
        } else {
          extractedLocation = String(rawLocation);
        }
      }
    }

    const displayIndustry = extractedIndustry || 'Unknown Industry';
    const displayLocation = extractedLocation || 'Unknown Location';

    const pdfShareUrl = `${PUBLIC_BASE_URL}/outputs/final-brief/${encodeURIComponent(company_id)}/pdf-share?client=${encodeURIComponent(clientId)}&run_id=${encodeURIComponent(final_brief_run_id || '')}`;
    const htmlUrl = `${PUBLIC_BASE_URL}/outputs/final-brief/${encodeURIComponent(company_id)}/html?client=${encodeURIComponent(clientId)}&run_id=${encodeURIComponent(final_brief_run_id || '')}`;
    const canOpenBrief = Boolean(company_id && clientId && final_brief_run_id && has_finalized_brief);

    // Fallback UI when no parsed brief is available
    if (!parsedBrief) {
      return (
        <PageWrapper title={displayName}>
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-lg border-border/50">
              <CardHeader>
                <CardTitle className="text-3xl mb-2 text-foreground" style={{ letterSpacing: '-0.02em' }}>
                  {displayName}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground font-medium">
                  {displayIndustry}
                </CardDescription>
              </CardHeader>
              <CardContent className="border-t border-border/50 pt-6">
                <div className="bg-muted/30 p-6 rounded-xl border border-border/50 text-center mb-8">
                  <FileQuestion className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No finalized brief JSON available yet</h3>
                  <p className="text-sm text-muted-foreground">
                    The detailed intelligence report for this company is either still generating or not available.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Fit Score</p>
                    </div>
                    <p className="text-lg font-medium text-foreground">{fit_score !== null ? fit_score : 'N/A'}</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Decision</p>
                    </div>
                    <p className="text-lg font-medium text-foreground capitalize">{decision || 'N/A'}</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Campaign ID</p>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate" title={campaign_id}>{campaign_id || 'N/A'}</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Signal</p>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate" title={signal_type || signal_id}>{signal_type || signal_id || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageWrapper>
      );
    }

    const verdict = parsedBrief.sales_brief?.verdict || {};
    const propertiesData = parsedBrief?.research_appendix?.properties?.properties;
    
    // Extract Ecommerce Signal Audit
    const ecommerceAudit = getEcommerceSignalAudit({
      parsedBrief,
      final_brief_json: targetData?.final_brief_json
    });

    const hasProperties = propertiesData && Array.isArray(propertiesData) && propertiesData.length > 0;
    const hasEcommerceAudit = !!ecommerceAudit;
    const hasResearchAppendices = hasProperties || hasEcommerceAudit;

    // Full UI when parsed brief is available
    return (
      <PageWrapper title={displayName}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-border/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2 text-foreground" style={{ letterSpacing: '-0.02em' }}>
                      {displayName}
                    </CardTitle>
                    <CardDescription className="text-base text-muted-foreground font-medium">
                      {displayIndustry} • {displayLocation}
                    </CardDescription>
                  </div>
                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-muted rounded-full text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Visit website"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="border-t border-border/50 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Fit Score</p>
                    </div>
                    <p className="text-lg font-medium text-foreground">{fit_score !== null ? fit_score : 'N/A'}</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Decision</p>
                    </div>
                    <p className="text-lg font-medium text-foreground capitalize">{decision || 'N/A'}</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Campaign ID</p>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate" title={campaign_id}>{campaign_id || 'N/A'}</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Signal</p>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate" title={signal_type || signal_id}>{signal_type || signal_id || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard
                icon={Lightbulb}
                heading="Recommended Motion"
                content={verdict.recommended_motion}
                accentColor="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
              />
              <ActionCard
                icon={Target}
                heading="Route to Engagement"
                content={verdict.best_route_to_engagement}
                accentColor="bg-blue-500/10 text-blue-500 border-blue-500/20"
              />
            </div>

            {/* Delegate all detailed brief rendering to the external component */}
            <FinalBriefRenderer briefData={normalizedTargetData} />

            {/* Research Appendices Structured Display */}
            {hasResearchAppendices && (
              <div className="mt-8">
                <Accordion type="single" collapsible className="w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                  
                  {/* Properties Accordion Item */}
                  {hasProperties && (
                    <AccordionItem value="properties" className={cn(hasEcommerceAudit ? "border-b border-border/50" : "border-none")}>
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <Home className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg text-foreground">Research Appendix: Properties</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6 pt-2 border-t border-border/50">
                        <div className="space-y-6 mt-4">
                          {propertiesData.map((prop, idx) => (
                            <div key={idx} className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-muted/10">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/50 pb-2">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                Property {prop.property_id ? `#${prop.property_id}` : idx + 1}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {prop.address && (
                                  <div className="sm:col-span-2 lg:col-span-3">
                                    <MiniTile label="Address" value={prop.address} />
                                  </div>
                                )}
                                <MiniTile label="Property ID" value={prop.property_id} />
                                <MiniTile label="Ownership Type" value={prop.ownership_type} isBadge />
                                
                                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Has Solar</span>
                                  {prop.has_solar !== undefined && prop.has_solar !== null ? (
                                    <Badge variant="outline" className={cn("w-fit font-medium", prop.has_solar ? "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                                      {prop.has_solar ? 'Yes' : 'No'}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm font-medium text-foreground">N/A</span>
                                  )}
                                </div>

                                <MiniTile label="Roof Sq M (Est)" value={prop.roof_sq_m_estimate} />
                                <MiniTile label="Last Change Date" value={prop.last_change_date} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Ecommerce Signal Audit Accordion Item */}
                  {hasEcommerceAudit && (
                    <AccordionItem value="ecommerce-audit" className="border-none">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg text-foreground">Research Appendix: Ecommerce Signal Audit</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6 pt-2 border-t border-border/50">
                        <div className="mt-4">
                          <SignalsSection
                            title="Ecommerce Signal Audit"
                            audit={ecommerceAudit}
                            compact={true}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                </Accordion>
              </div>
            )}
          </div>

          {/* Sidebar / Auxiliary Column */}
          <div className="space-y-6">
            <BriefAssignmentCard
              key={`assignment-${assignmentRefreshKey}`}
              clientId={clientId}
              companyId={company_id}
              finalBriefRunId={final_brief_run_id}
              hasFinalizedBrief={has_finalized_brief}
              currentUser={currentUser}
            />

            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-lg text-foreground">Actions</CardTitle>
                <CardDescription>Download this brief in various formats</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {canOpenBrief ? (
                  <div className="flex flex-col gap-4">
                    <Button variant="outline" className="w-full justify-start hover:bg-muted" onClick={() => window.open(htmlUrl, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Web View
                    </Button>
                    <Button variant="outline" className="w-full justify-start hover:bg-muted" onClick={() => window.open(pdfShareUrl, '_blank')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border/50">
                    No finalized brief available yet for download.
                  </p>
                )}
              </CardContent>
            </Card>

            <BriefFeedbackCard 
              clientId={clientId} 
              companyId={company_id} 
              finalBriefRunId={final_brief_run_id} 
              hasFinalizedBrief={has_finalized_brief} 
              onAssignmentUpdated={() => setAssignmentRefreshKey((key) => key + 1)}
            />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return null;
};

export default BriefDetailPage;
