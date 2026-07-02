import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  X, ExternalLink, AlertCircle, RefreshCcw, Activity, Target, 
  Lightbulb, Hash, ChevronLeft, ChevronRight, Home, Info, Zap, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/services/supabaseDataService.js';
import FinalBriefRenderer from '@/components/FinalBriefRenderer.jsx';
import ActionCard from '@/components/ActionCard.jsx';
import BriefFeedbackCard from '@/components/BriefFeedbackCard.jsx';
import BriefAssignmentCard from '@/components/BriefAssignmentCard.jsx';
import SignalsSection from '@/components/SignalsSection.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';
import { getEcommerceSignalAudit } from '@/utils/briefDataExtractors.js';
import { getBriefDisplayInfo } from '@/utils/briefDisplay.js';

const getDecisionBadge = (decision) => {
  const lower = decision?.toLowerCase() || '';
  if (lower === 'target') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Target</Badge>;
  if (lower === 'watch') return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Watch</Badge>;
  if (lower === 'reject') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Reject</Badge>;
  return <Badge className="bg-muted text-muted-foreground">{decision || 'N/A'}</Badge>;
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

const BriefDetailDrawer = ({ 
  companyId, 
  clientId, 
  isOpen, 
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalCount
}) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [targetData, setTargetData] = useState(null);
  const [parsedBrief, setParsedBrief] = useState(null);
  const [assignmentRefreshKey, setAssignmentRefreshKey] = useState(0);

  useEffect(() => {
    setAssignmentRefreshKey(0);
  }, [clientId, companyId]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('portal_target_company_detail')
        .select('client_id, company_id, latest_run_id, final_brief_run_id, name, website, industry, fit_score, decision, campaign_id, signal_id, signal_type, has_finalized_brief, final_brief_json')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Company brief not found.');

      let parsed = null;
      if (data.final_brief_json) {
        try {
          parsed = typeof data.final_brief_json === 'string'
            ? JSON.parse(data.final_brief_json)
            : data.final_brief_json;
        } catch (e) {
          console.warn('Failed to parse final_brief_json:', e);
        }
      }
      setTargetData(data);
      setParsedBrief(parsed);
    } catch (err) {
      setError(err.message || 'Failed to load details.');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, clientId]);

  useEffect(() => {
    if (isOpen && companyId && clientId) {
      fetchData();
    }
  }, [isOpen, companyId, clientId, fetchData]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedTargetData = targetData ? {
    ...targetData,
    final_brief_json: parsedBrief || targetData.final_brief_json
  } : null;

  const briefDisplayInfo = getBriefDisplayInfo({
    row: targetData || {},
    parsedBrief,
    fallbackName: targetData?.name || parsedBrief?.company_name || companyId || 'Loading...',
    fallbackUrl: targetData?.website
  });
  const displayName = briefDisplayInfo.displayName || 'Loading...';
  const verdict = parsedBrief?.sales_brief?.verdict || {};
  const propertiesData = parsedBrief?.research_appendix?.properties?.properties;
  const website = briefDisplayInfo.displayUrl;
  const websiteTitle = briefDisplayInfo.isPropertyLed ? 'Open in Google Maps' : 'Visit company website';

  const ecommerceAudit = getEcommerceSignalAudit({
    parsedBrief,
    final_brief_json: targetData?.final_brief_json
  });

  const hasProperties = propertiesData && Array.isArray(propertiesData) && propertiesData.length > 0;
  const hasEcommerceAudit = !!ecommerceAudit;
  const hasResearchAppendices = hasProperties || hasEcommerceAudit;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="drawer-overlay"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header flex items-center justify-between w-full">
          <div className="flex items-center gap-2 flex-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={onPrevious} 
              disabled={!hasPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {currentIndex} of {totalCount}
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-foreground flex-1 text-center truncate">
            Brief Details
          </h2>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={onNext} 
              disabled={!hasNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="drawer-content">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : error ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-destructive">Error Loading Data</h3>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
                <Button variant="outline" className="border-destructive/30 hover:bg-destructive/10 text-destructive" onClick={fetchData}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Section */}
              <Card className="shadow-sm border-border/50 bg-card">
                <CardContent className="p-5 flex flex-col gap-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {targetData?.industry || parsedBrief?.company_name?.industry || 'Unknown Industry'}
                      </p>
                    </div>
                    {website && (
                      <a
                        href={website.startsWith('http') ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-muted rounded-full text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                        title={websiteTitle}
                        aria-label={websiteTitle}
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider">Campaign</p>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate" title={targetData?.campaign_id}>
                        {targetData?.campaign_id || 'Not specified'}
                      </p>
                    </div>

                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider">Signal</p>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate" title={targetData?.signal_type || targetData?.signal_id}>
                        {targetData?.signal_type || targetData?.signal_id || 'Not specified'}
                      </p>
                    </div>

                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider">Fit Score</p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {targetData?.fit_score ?? 'N/A'}
                      </p>
                    </div>

                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col gap-1.5 items-start">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider">Decision</p>
                      </div>
                      <div className="mt-0.5">
                        {getDecisionBadge(targetData?.decision)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Cards Section */}
              {parsedBrief && (
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
              )}

              {/* No Brief Fallback */}
              {!parsedBrief && (
                <div className="bg-muted/30 p-6 rounded-xl border border-border/50 text-center">
                  <h3 className="text-lg font-medium text-foreground mb-1">No brief available</h3>
                  <p className="text-sm text-muted-foreground">
                    The detailed intelligence report is either still generating or missing.
                  </p>
                </div>
              )}

              {/* Final Brief Render */}
              {parsedBrief && (
                <div className="mt-8">
                  <FinalBriefRenderer briefData={normalizedTargetData} />
                </div>
              )}

              {/* Research Appendices */}
              {hasResearchAppendices && (
                <div className="mt-8">
                  <Accordion type="single" collapsible className="w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
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

              {/* Assignment & Feedback Section */}
              <div className="space-y-6 mt-8">
                <BriefAssignmentCard
                  key={`assignment-${assignmentRefreshKey}`}
                  clientId={clientId}
                  companyId={companyId}
                  finalBriefRunId={targetData?.final_brief_run_id}
                  hasFinalizedBrief={targetData?.has_finalized_brief}
                  currentUser={currentUser}
                />

                <BriefFeedbackCard 
                  clientId={clientId} 
                  companyId={companyId} 
                  finalBriefRunId={targetData?.final_brief_run_id} 
                  hasFinalizedBrief={targetData?.has_finalized_brief} 
                  onAssignmentUpdated={() => setAssignmentRefreshKey((key) => key + 1)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <Button variant="outline" asChild className="w-full sm:w-auto hover:bg-muted">
            <Link to={`/briefs/${encodeURIComponent(companyId)}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open full page
            </Link>
          </Button>
        </div>
      </motion.div>
    </>
  );
};

export default BriefDetailDrawer;
