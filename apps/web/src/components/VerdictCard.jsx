import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Target, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

const VerdictCard = ({ briefData }) => {
  if (!briefData) return null;

  let parsed = {};
  if (briefData.final_brief_json) {
    try {
      parsed = typeof briefData.final_brief_json === 'string'
        ? JSON.parse(briefData.final_brief_json)
        : briefData.final_brief_json;
    } catch (e) {
      console.error("Failed to parse final_brief_json in VerdictCard", e);
    }
  }

  const rawDecision = briefData.decision || parsed?.decision || parsed?.scoring?.decision || '';
  const lowerDecision = String(rawDecision).toLowerCase();
  const score = briefData.fit_score ?? parsed?.fit_score ?? parsed?.scoring?.totalScore;

  let decisionStatus = 'Unknown';
  let statusColor = 'bg-secondary text-secondary-foreground border-secondary';
  let StatusIcon = HelpCircle;

  if (lowerDecision.includes('target') || (score !== null && score >= 70)) {
    decisionStatus = 'Target';
    statusColor = 'bg-green-500/10 text-green-500 border-green-500/20';
    StatusIcon = Target;
  } else if (lowerDecision.includes('watch') || (score !== null && score >= 50)) {
    decisionStatus = 'Watch';
    statusColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    StatusIcon = AlertTriangle;
  } else if (lowerDecision.includes('reject') || lowerDecision.includes('disqualify') || (score !== null && score < 50)) {
    decisionStatus = 'Reject';
    statusColor = 'bg-red-500/10 text-red-500 border-red-500/20';
    StatusIcon = XCircle;
  } else if (rawDecision) {
    decisionStatus = String(rawDecision).charAt(0).toUpperCase() + String(rawDecision).slice(1);
  }

  const rationale = briefData.rationale || parsed?.rationale || parsed?.scoring?.recommendation || parsed?.scoring?.rationale || 'No detailed reasoning provided.';

  return (
    <Card className="border-border overflow-hidden shadow-sm bg-card">
      <div className="flex flex-col sm:flex-row">
        <div className={cn("p-6 flex flex-col items-center justify-center min-w-[180px] border-b sm:border-b-0 sm:border-r border-border bg-muted/5")}>
          <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider">FIT SCORE</div>
          {score !== null && score !== undefined ? (
            <div className="text-5xl font-bold mb-3 tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {score}
            </div>
          ) : (
            <div className="text-3xl font-bold mb-3 text-muted-foreground">N/A</div>
          )}
          <Badge variant="outline" className={cn("text-xs px-3 py-1 font-semibold flex items-center gap-1.5", statusColor)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {decisionStatus}
          </Badge>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center">
          <h3 className="text-base font-semibold text-foreground mb-2 tracking-tight">
            Verdict & Reasoning
          </h3>
          <div className="text-muted-foreground text-sm leading-relaxed">
            {typeof rationale === 'string' ? (
              <p>{rationale}</p>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm">{JSON.stringify(rationale, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VerdictCard;