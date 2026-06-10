import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, CheckCircle2, Send, Calendar, AlertCircle, Inbox, FileText } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const STAGE_ICONS = {
  'generated': FileText,
  'reviewed': CheckCircle2,
  'contacted': Send,
  'meeting_booked': Calendar,
  // Fallbacks
  'Generated': FileText,
  'Reviewed': CheckCircle2,
  'Contacted': Send,
  'Meeting Booked': Calendar
};

const STAGE_ORDER = ['generated', 'reviewed', 'contacted', 'meeting_booked'];

const BriefFeedbackFunnel = ({ funnel_summary, loading = false }) => {
  if (loading) {
    return (
      <Card className="bg-card text-card-foreground border-border/50 overflow-hidden flex flex-col mb-8">
        <CardHeader className="bg-muted/10 border-b border-border/50">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="p-8">
          <Skeleton className="h-32 w-full max-w-5xl mx-auto rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Safely normalize funnel_summary to an array regardless of whether it's an array or an object
  let normalizedFunnel = [];
  if (Array.isArray(funnel_summary)) {
    normalizedFunnel = [...funnel_summary];
  } else if (funnel_summary && typeof funnel_summary === 'object') {
    normalizedFunnel = Object.entries(funnel_summary).map(([key, val]) => ({
      stage: key,
      id: key,
      ...(typeof val === 'object' && val !== null ? val : { count: Number(val) || 0 })
    }));
  }

  // Filter out 'not_reviewed' as it's a duplicate of 'generated'
  normalizedFunnel = normalizedFunnel.filter(stage => {
    const name = (stage.stage || stage.id || '').toLowerCase();
    return name !== 'not_reviewed' && name !== 'not reviewed';
  });

  // Sort stages to match the logical progression: Generated -> Reviewed -> Contacted -> Meetings Booked
  normalizedFunnel.sort((a, b) => {
    const aName = (a.stage || a.id || '').toLowerCase().replace(' ', '_');
    const bName = (b.stage || b.id || '').toLowerCase().replace(' ', '_');
    
    let aIdx = STAGE_ORDER.indexOf(aName);
    let bIdx = STAGE_ORDER.indexOf(bName);
    
    // If a stage isn't in our predefined order, push it to the end
    if (aIdx === -1) aIdx = 999;
    if (bIdx === -1) bIdx = 999;
    
    return aIdx - bIdx;
  });

  if (!normalizedFunnel || normalizedFunnel.length === 0) {
    return (
      <Card className="bg-card text-card-foreground border-border/50 overflow-hidden flex flex-col mb-8">
        <CardHeader className="bg-muted/10 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Filter className="h-5 w-5 text-primary" />
            Brief Action Pipeline
          </CardTitle>
          <CardDescription>Progression from generated briefs to booked meetings</CardDescription>
        </CardHeader>
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[250px] text-center">
          <div className="bg-muted/50 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No funnel data available</h3>
          <p className="text-sm text-muted-foreground max-w-[400px]">
            Generate briefs for your target accounts to see the action pipeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine visual progression based on the furthest stage with a count > 0
  let trackProgress = 0;
  const totalStages = normalizedFunnel.length;
  
  for (let i = totalStages - 1; i >= 0; i--) {
    if (normalizedFunnel[i].count > 0) {
      trackProgress = (i / Math.max(1, totalStages - 1)) * 100;
      break;
    }
  }

  return (
    <Card className="bg-card text-card-foreground border-border/50 overflow-hidden flex flex-col mb-8">
      <CardHeader className="bg-muted/10 border-b border-border/50">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Filter className="h-5 w-5 text-primary" />
          Brief Action Pipeline
        </CardTitle>
        <CardDescription>Progression from generated briefs to booked meetings</CardDescription>
      </CardHeader>
      <CardContent className="p-8 overflow-x-auto">
        <div className="relative flex justify-between items-start w-full max-w-5xl mx-auto min-w-[750px] pt-4 pb-2">
          
          {/* Background Track Line */}
          <div className="absolute top-10 left-[12.5%] right-[12.5%] h-1.5 bg-muted rounded-full -z-10"></div>
          
          {/* Filled Track Line (Visual progression representation) */}
          <div 
            className="absolute top-10 left-[12.5%] h-1.5 bg-primary rounded-full -z-10 transition-all duration-1000 ease-out"
            style={{ width: `${trackProgress * 0.75}%` }}
          ></div>

          {normalizedFunnel.map((stage, index) => {
            const Icon = STAGE_ICONS[stage.id] || STAGE_ICONS[stage.stage] || Filter;
            const isFirst = index === 0;
            const hasCount = stage.count > 0;
            
            return (
              <div key={stage.id || stage.stage || index} className="flex flex-col items-center z-10 flex-1">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center shadow-md mb-4 ring-4 ring-card transition-colors duration-500",
                  hasCount && !isFirst
                    ? "bg-primary text-primary-foreground shadow-primary/20" 
                    : hasCount && isFirst
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/50 text-muted-foreground/50"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-foreground mb-1 capitalize">{stage.stage?.replace('_', ' ')}</h4>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className={cn(
                      "text-2xl font-extrabold tabular-nums tracking-tight",
                      hasCount ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {stage.count || 0}
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    hasCount && !isFirst
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : hasCount && isFirst
                      ? "bg-secondary text-secondary-foreground border-border"
                      : "bg-muted/50 text-muted-foreground border-border"
                  )}>
                    {stage.percentage || 0}% {isFirst ? 'of base' : 'conversion'}
                  </span>
                </div>
              </div>
            );
          })}

        </div>
      </CardContent>
    </Card>
  );
};

export default BriefFeedbackFunnel;