import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils.js';

const ACTION_CARD_STYLES = {
  shell: 'h-full overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm',
  title: 'text-base font-semibold leading-tight text-foreground',
  body: 'text-sm leading-relaxed text-muted-foreground'
};

const ActionCard = ({
  icon: Icon,
  heading,
  content,
  accentColor = "bg-primary/10 text-primary border-primary/20",
  collapsible = false,
  collapsedHeightClass = "max-h-72"
}) => {
  const [expanded, setExpanded] = useState(false);
  const shouldClamp = collapsible && !expanded;

  return (
    <Card className={ACTION_CARD_STYLES.shell}>
      <CardContent className="p-5 flex flex-col h-full gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("p-2 rounded-lg border", accentColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h4 className={ACTION_CARD_STYLES.title}>
            {heading}
          </h4>
        </div>
        <div className="relative flex-1">
          <div
            className={cn(
              `${ACTION_CARD_STYLES.body} whitespace-pre-wrap`,
              shouldClamp && collapsedHeightClass,
              shouldClamp && "overflow-hidden"
            )}
          >
            {content || 'Not provided.'}
          </div>
          {shouldClamp && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
          )}
        </div>
        {collapsible && (
          <button
            type="button"
            className="mt-auto w-fit rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionCard;
