import React from 'react';

const MetricTile = ({ icon: Icon, label, value }) => {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-1.5 h-full shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <p className="text-xs font-semibold uppercase tracking-wider truncate" title={label}>
          {label}
        </p>
      </div>
      <div className="text-sm font-medium text-foreground mt-1 break-words">
        {value}
      </div>
    </div>
  );
};

export default MetricTile;