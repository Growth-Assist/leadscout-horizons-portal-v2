import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const keyToLabel = (key) => {
  if (!key) return '';
  let str = key;
  if (str === str.toUpperCase() && !str.includes('_')) {
    str = str.toLowerCase();
  }
  
  str = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return str.split(' ').map(word => {
    if (!word) return '';
    const lower = word.toLowerCase();
    if (['ceo', 'cto', 'cfo', 'coo', 'roi', 'kpi', 'saas', 'b2b', 'b2c', 'api', 'ui', 'ux', 'icp', 'id'].includes(lower)) {
      return lower.toUpperCase();
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
};

const isEmpty = (val) => {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return true;
  return false;
};

const isStringArray = (val) => {
  return Array.isArray(val) && val.length > 0 && val.every(item => typeof item === 'string');
};

const formatFieldValue = (value) => {
  if (isEmpty(value)) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  
  if (Array.isArray(value)) {
    return value
      .filter(v => !isEmpty(v))
      .map(v => {
        if (typeof v === 'object') {
          return Object.entries(v)
            .filter(([_, nestedVal]) => !isEmpty(nestedVal))
            .map(([k, nestedVal]) => `${keyToLabel(k)}: ${formatFieldValue(nestedVal)}`)
            .join(' | ');
        }
        return `• ${v}`;
      })
      .join('\n');
  }
  
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([_, v]) => !isEmpty(v))
      .map(([k, v]) => `${keyToLabel(k)}:\n  ${formatFieldValue(v).replace(/\n/g, '\n  ')}`)
      .join('\n');
  }
  
  return String(value);
};

const renderStringValue = (val) => {
  if (typeof val !== 'string') return null;
  if (val.length > 140) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1">
        {val}
      </p>
    );
  }
  return (
    <div className="bg-background/50 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground whitespace-pre-wrap mt-1 w-fit">
      {val}
    </div>
  );
};

const renderNestedValue = (val) => {
  if (typeof val === 'boolean') {
    return <Badge variant="secondary" className="font-normal">{val ? 'Yes' : 'No'}</Badge>;
  }
  
  if (isStringArray(val)) {
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {val.slice(0, 4).map((item, i) => (
          <Badge key={i} variant="secondary" className="font-normal bg-secondary/50 hover:bg-secondary/70 text-secondary-foreground">
            {item}
          </Badge>
        ))}
        {val.length > 4 && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            +{val.length - 4} more
          </Badge>
        )}
      </div>
    );
  }
  
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    return (
      <span className="text-muted-foreground">
        {Object.entries(val)
          .filter(([_, v]) => !isEmpty(v))
          .map(([k, v]) => `${keyToLabel(k)}: ${formatFieldValue(v)}`)
          .join(', ')}
      </span>
    );
  }

  if (typeof val === 'string') {
    return renderStringValue(val);
  }
  
  return formatFieldValue(val);
};

const renderObjectFields = (obj) => {
  const entries = Object.entries(obj).filter(([_, v]) => !isEmpty(v));
  const visibleEntries = entries.slice(0, 6);
  const remaining = entries.length - 6;

  return (
    <div className="space-y-3 mt-2">
      {visibleEntries.map(([k, val]) => (
        <div key={k} className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {keyToLabel(k)}
          </span>
          <div className="text-sm text-foreground">
            {renderNestedValue(val)}
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-xs text-muted-foreground italic pt-1">
          +{remaining} more fields
        </div>
      )}
    </div>
  );
};

const StrategicContextSection = ({ title, icon: Icon, value, tone = 'default' }) => {
  if (isEmpty(value)) return null;

  const iconColors = {
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    default: 'text-primary'
  };

  const renderContent = () => {
    // If it's a plain object, render as responsive card grid
    if (typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value).filter(([_, v]) => !isEmpty(v));
      
      if (entries.length === 0) return null;

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {entries.map(([k, v]) => (
            <Card key={k} className="border border-border/50 bg-card rounded-xl shadow-sm h-full">
              <CardContent className="p-5 space-y-3">
                <h4 className="text-sm font-semibold text-foreground leading-tight">
                  {keyToLabel(k)}
                </h4>
                {isStringArray(v) ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {v.slice(0, 8).map((item, i) => (
                      <Badge key={i} variant="secondary" className="font-normal bg-secondary/50 hover:bg-secondary/70 text-secondary-foreground">
                        {item}
                      </Badge>
                    ))}
                    {v.length > 8 && (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        +{v.length - 8} more
                      </Badge>
                    )}
                  </div>
                ) : typeof v === 'object' && v !== null && !Array.isArray(v) ? (
                  renderObjectFields(v)
                ) : typeof v === 'string' ? (
                  renderStringValue(v)
                ) : (
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1">
                    {formatFieldValue(v)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // For string, number, boolean, array, fallback render
    return (
      <div className="bg-background/40 rounded-lg p-4 border border-border/50">
        {isStringArray(value) ? (
          <div className="flex flex-wrap gap-2">
            {value.slice(0, 8).map((item, i) => (
              <Badge key={i} variant="secondary" className="font-normal bg-secondary/50 hover:bg-secondary/70 text-secondary-foreground">
                {item}
              </Badge>
            ))}
            {value.length > 8 && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                +{value.length - 8} more
              </Badge>
            )}
          </div>
        ) : typeof value === 'string' ? (
          renderStringValue(value)
        ) : (
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {formatFieldValue(value)}
          </pre>
        )}
      </div>
    );
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b border-border/30 pb-3">
        {Icon && <Icon className={cn('h-5 w-5 shrink-0', iconColors[tone])} />}
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {content}
    </div>
  );
};

export default StrategicContextSection;