import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, Tag } from 'lucide-react';

const EntityHeaderCard = ({ title, subtitle, publishedDate, externalLink, version }) => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-muted-foreground leading-relaxed max-w-prose">
            {subtitle}
          </p>
        )}
      </div>

      {/* Metadata chips row */}
      <div className="flex flex-wrap items-center gap-3 pt-4">
        {publishedDate && (
          <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
            <Calendar className="h-4 w-4" />
            Published: {new Date(publishedDate).toLocaleString()}
          </Badge>
        )}
        {version && (
          <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
            <Tag className="h-4 w-4" />
            Template Version: {version}
          </Badge>
        )}
        {externalLink && (
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            Visit Website
          </a>
        )}
      </div>
    </div>
  );
};

export default EntityHeaderCard;