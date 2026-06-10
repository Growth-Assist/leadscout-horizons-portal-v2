import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils.js';

const ActionCard = ({ icon: Icon, heading, content, accentColor = "bg-primary/10 text-primary border-primary/20" }) => {
  return (
    <Card className="shadow-sm border-border/50 bg-card overflow-hidden h-full">
      <CardContent className="p-5 flex flex-col h-full gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("p-2 rounded-lg border", accentColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h4 className="font-semibold tracking-tight text-foreground leading-tight">
            {heading}
          </h4>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {content || 'Not provided.'}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionCard;