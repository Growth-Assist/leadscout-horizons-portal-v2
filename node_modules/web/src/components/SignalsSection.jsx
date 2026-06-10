import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  ExternalLink, 
  Target, 
  Lightbulb, 
  ShieldAlert, 
  Activity, 
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Maps confidence text to Badge variant
 * @param {string} confidence - The confidence level text
 * @returns {string} Badge variant: 'default', 'secondary', or 'outline'
 */
const getConfidenceBadgeVariant = (confidence) => {
  if (!confidence) return 'secondary';
  
  const normalized = confidence.toString().toLowerCase();
  
  if (normalized.includes('strong evidence')) {
    return 'default';
  }
  if (normalized.includes('partial evidence')) {
    return 'secondary';
  }
  if (normalized.includes('likely opportunity')) {
    return 'outline';
  }
  if (normalized.includes('not proven')) {
    return 'secondary';
  }
  if (normalized.includes('no issue found')) {
    return 'secondary';
  }
  
  return 'secondary';
};

/**
 * Maps strength text to Badge variant
 * @param {string} strength - The strength level text
 * @returns {string} Badge variant: 'default' or 'secondary'
 */
const getStrengthBadgeVariant = (strength) => {
  if (!strength) return 'secondary';
  
  const normalized = strength.toString().toLowerCase();
  
  if (normalized.includes('high')) {
    return 'default';
  }
  if (normalized.includes('medium')) {
    return 'secondary';
  }
  if (normalized.includes('low')) {
    return 'secondary';
  }
  
  return 'secondary';
};

/**
 * Extracts readable display text from an array of URLs.
 * If multiple URLs share the same hostname, appends a short path segment to differentiate them.
 * @param {string[]} urls - Array of URL strings
 * @returns {Array<{url: string, displayText: string}>}
 */
const getReadableUrlText = (urls) => {
  if (!urls || !Array.isArray(urls)) return [];

  const parsedUrls = urls.map(url => {
    try {
      const parsed = new URL(url);
      return { url, parsed, hostname: parsed.hostname, valid: true };
    } catch (e) {
      return { url, valid: false };
    }
  });

  const hostnameCounts = parsedUrls.reduce((acc, item) => {
    if (item.valid) {
      acc[item.hostname] = (acc[item.hostname] || 0) + 1;
    }
    return acc;
  }, {});

  return parsedUrls.map(item => {
    if (!item.valid) return { url: item.url, displayText: item.url };

    let displayText = item.hostname;
    if (hostnameCounts[item.hostname] > 1) {
      const path = item.parsed.pathname;
      if (path && path !== '/') {
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 0) {
          displayText = `${item.hostname}/${segments[0]}`;
        }
      }
    }
    return { url: item.url, displayText };
  });
};

const SignalsSection = ({ title, audit, compact = false }) => {
  if (!audit) return null;

  const {
    overall_verdict,
    recommended_positioning,
    strongest_opportunity_angles = [],
    signals = [],
    do_not_claim = [],
    leadscout_scoring_note,
    suggested_fit_score,
    score_reasoning
  } = audit;

  // If the audit object is completely empty of our expected fields, don't render
  if (
    !overall_verdict && 
    !recommended_positioning && 
    (!strongest_opportunity_angles || strongest_opportunity_angles.length === 0) && 
    (!signals || signals.length === 0) &&
    (!do_not_claim || do_not_claim.length === 0) &&
    !leadscout_scoring_note &&
    !suggested_fit_score
  ) {
    return null;
  }

  return (
    <div className={cn("space-y-6", compact ? "space-y-4" : "space-y-8")}>
      {title && (
        <h3 className={cn("font-bold text-foreground tracking-tight", compact ? "text-xl" : "text-2xl")}>
          {title}
        </h3>
      )}

      {/* Top Section: Verdict & Positioning */}
      {(overall_verdict || recommended_positioning) && (
        <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          <CardHeader className={cn("pb-3", compact && "py-3")}>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Strategic Verdict
            </CardTitle>
          </CardHeader>
          <CardContent className={cn("space-y-4", compact && "pb-3")}>
            {overall_verdict && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Overall Verdict</h4>
                <p className="text-foreground leading-relaxed">{overall_verdict}</p>
              </div>
            )}
            {recommended_positioning && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Recommended Positioning</h4>
                <p className="text-foreground leading-relaxed">{recommended_positioning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Opportunity Angles */}
      {strongest_opportunity_angles && strongest_opportunity_angles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Opportunity Angles
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strongest_opportunity_angles.map((angle, idx) => (
              <Card key={idx} className="bg-muted/30 border-border/50 shadow-none">
                <CardContent className="p-4 space-y-3">
                  {angle.angle && (
                    <div className="font-semibold text-foreground text-base">
                      {angle.angle}
                    </div>
                  )}
                  {angle.why_it_matters && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground mr-1">Why it matters:</span>
                      {angle.why_it_matters}
                    </div>
                  )}
                  {angle.suggested_opener && (
                    <div className="bg-background rounded-md p-3 border border-border/50 mt-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Suggested Opener
                      </div>
                      <p className="text-sm text-foreground italic">"{angle.suggested_opener}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Signals List */}
      {signals && signals.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-blue-500" />
            Detected Signals
          </h4>
          <div className="space-y-3">
            {signals.map((signalItem, idx) => {
              if (!signalItem.signal) return null;

              return (
                <Card key={idx} className="bg-card border-border/50 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-semibold text-foreground text-base">
                            {signalItem.signal}
                          </h5>
                          {signalItem.evidence_found && (
                            <Badge variant="outline" className="text-xs font-normal bg-muted/50">
                              {signalItem.evidence_found}
                            </Badge>
                          )}
                        </div>
                        
                        {signalItem.notes && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {signalItem.notes}
                          </p>
                        )}

                        {signalItem.recommended_sales_angle && (
                          <div className="bg-primary/5 rounded-md p-3 border border-primary/10 mt-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5 uppercase tracking-wider">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Recommended sales angle
                            </div>
                            <p className="text-sm text-foreground">{signalItem.recommended_sales_angle}</p>
                          </div>
                        )}

                        {signalItem.do_not_claim && (
                          <div className="bg-destructive/5 rounded-md p-3 border border-destructive/20 mt-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive mb-1.5 uppercase tracking-wider">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Do not claim
                            </div>
                            <p className="text-sm text-foreground">{signalItem.do_not_claim}</p>
                          </div>
                        )}

                        {/* Evidence URLs */}
                        {signalItem.evidence_urls && signalItem.evidence_urls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {getReadableUrlText(signalItem.evidence_urls).map((item, urlIdx) => (
                              <a
                                key={urlIdx}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors bg-primary/5 px-2 py-1 rounded-md"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {item.displayText}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Badges Column */}
                      <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                        {signalItem.confidence && (
                          <Badge variant={getConfidenceBadgeVariant(signalItem.confidence)} className="justify-center">
                            Confidence: {signalItem.confidence}
                          </Badge>
                        )}
                        {signalItem.strength && (
                          <Badge variant={getStrengthBadgeVariant(signalItem.strength)} className="justify-center">
                            Strength: {signalItem.strength}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Guardrails / Do Not Claim (Top-level) */}
      {do_not_claim && do_not_claim.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Guardrails & Cautions
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {do_not_claim.map((caution, idx) => {
              const text = typeof caution === 'string' ? caution : (caution.claim || caution.description || JSON.stringify(caution));
              const reason = typeof caution === 'object' ? caution.reason : null;
              
              return (
                <Alert key={idx} variant="destructive" className="bg-destructive/5 border-destructive/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">Avoid Claiming</AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    <span className="block font-medium">{text}</span>
                    {reason && <span className="block text-destructive/80 mt-1 text-xs">{reason}</span>}
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        </div>
      )}

      {/* Scoring Note */}
      {(leadscout_scoring_note || suggested_fit_score || score_reasoning) && (
        <Card className="bg-muted/40 border-border/50 shadow-none">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start">
            <div className="bg-background p-3 rounded-lg border border-border/50 shrink-0 flex flex-col items-center justify-center min-w-[100px]">
              <TrendingUp className="h-5 w-5 text-muted-foreground mb-1" />
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Fit Score</div>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                {suggested_fit_score !== undefined && suggested_fit_score !== null ? suggested_fit_score : '-'}
              </div>
            </div>
            <div className="space-y-2 flex-1">
              {leadscout_scoring_note && (
                <div>
                  <h5 className="text-sm font-semibold text-foreground">Scoring Note</h5>
                  <p className="text-sm text-muted-foreground">{leadscout_scoring_note}</p>
                </div>
              )}
              {score_reasoning && (
                <div>
                  <h5 className="text-sm font-semibold text-foreground">Reasoning</h5>
                  <p className="text-sm text-muted-foreground">{score_reasoning}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SignalsSection;