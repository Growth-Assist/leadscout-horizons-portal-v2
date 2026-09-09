import React from 'react';
import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  PackageCheck,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils.js';
import { GROWTH_MOTION_LABELS, isNeutralProductFitTiming } from '@/utils/productFitAssessment.js';

const confidenceStyles = {
  high: 'border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-400',
  medium: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400',
  low: 'border-amber-400/20 bg-muted/60 text-muted-foreground'
};

const ProductFitBadge = ({ children, className }) => (
  <Badge variant="outline" className={cn('font-medium', className)}>
    {children}
  </Badge>
);

const CompactList = ({ items }) => (
  <ul className="space-y-2">
    {items.map((item, index) => (
      <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const ContentPanel = ({ title, children, className }) => (
  <div className={cn('rounded-xl border border-border/60 bg-muted/15 p-4', className)}>
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
    {children}
  </div>
);

const RecommendedAssessment = ({ assessment }) => {
  const motionLabel = GROWTH_MOTION_LABELS[assessment.best_growth_motion];
  const intelligenceType = assessment.intelligence_fit.applicable
    ? assessment.intelligence_fit.primary_type
    : '';
  const neutralTiming = isNeutralProductFitTiming(assessment.why_now);
  const hasSupportingRecommendations = assessment.supporting_offerings.length > 0
    || assessment.intelligence_fit.supporting_types.length > 0;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {motionLabel && <ProductFitBadge>{motionLabel}</ProductFitBadge>}
        {assessment.confidence && (
          <ProductFitBadge className={confidenceStyles[assessment.confidence]}>
            {`${assessment.confidence.charAt(0).toUpperCase()}${assessment.confidence.slice(1)} confidence`}
          </ProductFitBadge>
        )}
        <ProductFitBadge className="border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-400">
          Recommended
        </ProductFitBadge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {assessment.primary_offering && (
          <ContentPanel title="Primary offering" className="bg-primary/5">
            <p className="text-xl font-semibold leading-snug text-foreground">
              {assessment.primary_offering.label}
            </p>
            {intelligenceType && (
              <div className="mt-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Intelligence type
                </span>
                <p className="mt-1 text-sm font-medium text-foreground">{intelligenceType}</p>
              </div>
            )}
          </ContentPanel>
        )}

        {assessment.rationale && (
          <ContentPanel title="Why it fits">
            <p className="text-sm leading-relaxed text-foreground">{assessment.rationale}</p>
          </ContentPanel>
        )}
      </div>

      {assessment.why_now && (
        <ContentPanel
          title="Opportunity timing"
          className={neutralTiming ? 'border-amber-400/20 bg-muted/25' : 'border-primary/20 bg-primary/5'}
        >
          <div className="flex items-start gap-3">
            {neutralTiming ? (
              <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            )}
            <p className={cn('text-sm leading-relaxed', neutralTiming ? 'text-muted-foreground' : 'text-foreground')}>
              {assessment.why_now}
            </p>
          </div>
        </ContentPanel>
      )}

      {hasSupportingRecommendations && (
        <ContentPanel title="Supporting recommendations">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {assessment.supporting_offerings.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Supporting offerings</p>
                <div className="flex flex-wrap gap-2">
                  {assessment.supporting_offerings.map((offering) => (
                    <Badge key={`${offering.key}:${offering.label}`} variant="secondary" className="whitespace-normal text-left">
                      {offering.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {assessment.intelligence_fit.supporting_types.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Supporting intelligence</p>
                <div className="flex flex-wrap gap-2">
                  {assessment.intelligence_fit.supporting_types.map((type) => (
                    <Badge key={type} variant="outline" className="whitespace-normal text-left">{type}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ContentPanel>
      )}

      {(assessment.growth_assist_contribution.length > 0 || assessment.proposed_outputs.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {assessment.growth_assist_contribution.length > 0 && (
            <ContentPanel title="Growth Assist contribution">
              <CompactList items={assessment.growth_assist_contribution} />
            </ContentPanel>
          )}
          {assessment.proposed_outputs.length > 0 && (
            <ContentPanel title="Proposed outputs">
              <CompactList items={assessment.proposed_outputs} />
            </ContentPanel>
          )}
        </div>
      )}
    </>
  );
};

const DiscoveryAssessment = ({ assessment }) => (
  <>
    <div className="flex flex-wrap gap-2">
      {GROWTH_MOTION_LABELS[assessment.best_growth_motion] && (
        <ProductFitBadge>{GROWTH_MOTION_LABELS[assessment.best_growth_motion]}</ProductFitBadge>
      )}
      {assessment.confidence && (
        <ProductFitBadge className={confidenceStyles[assessment.confidence]}>
          {`${assessment.confidence.charAt(0).toUpperCase()}${assessment.confidence.slice(1)} confidence`}
        </ProductFitBadge>
      )}
      <ProductFitBadge className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400">
        Needs discovery
      </ProductFitBadge>
    </div>

    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="space-y-2">
          <p className="font-medium text-foreground">
            More information is required before selecting the primary Growth Assist offering.
          </p>
          {assessment.rationale && (
            <p className="text-sm leading-relaxed text-muted-foreground">{assessment.rationale}</p>
          )}
        </div>
      </div>
    </div>

    {assessment.information_required.length > 0 && (
      <ContentPanel title="Discovery checklist">
        <ul className="space-y-2">
          {assessment.information_required.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 rounded border border-amber-500/50" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ContentPanel>
    )}
  </>
);

const EvidencePanel = ({ evidence }) => {
  if (evidence.length === 0) return null;

  return (
    <ContentPanel title="Recommendation evidence">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {evidence.map((item, index) => (
          <div key={`${item.title}:${index}`} className="rounded-lg border border-border/50 bg-background/60 p-3">
            {item.title && <p className="text-sm font-semibold text-foreground">{item.title}</p>}
            {item.supports && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.supports}</p>}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-sm items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                View source
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        ))}
      </div>
    </ContentPanel>
  );
};

const ProductFitAssessmentSection = ({ assessment }) => {
  if (!assessment) return null;

  const needsDiscovery = assessment.assessment_status === 'needs_discovery';

  return (
    <section aria-labelledby="growth-assist-offering-heading">
      <Card className="overflow-hidden border-primary/20 bg-card shadow-md">
        <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              {needsDiscovery ? (
                <PackageCheck className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <CardTitle id="growth-assist-offering-heading" className="text-lg">
              Recommended Growth Assist Offering
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 md:p-6">
          {needsDiscovery ? (
            <DiscoveryAssessment assessment={assessment} />
          ) : (
            <RecommendedAssessment assessment={assessment} />
          )}
          <EvidencePanel evidence={assessment.evidence} />
        </CardContent>
      </Card>
    </section>
  );
};

export default ProductFitAssessmentSection;

