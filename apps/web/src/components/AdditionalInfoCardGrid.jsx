import React from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Layers, Info, FileText, Tag, Link as LinkIcon, Mail } from 'lucide-react';
import { cn } from '@/lib/utils.js';

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

const getStatusColor = (key, value) => {
  const k = String(key).toLowerCase();
  const v = String(value).toLowerCase();
  
  const isRisk = k.includes('risk') || k.includes('disqualif') || k.includes('blocker') || k.includes('issue');
  
  if (v.includes('high') || v.includes('critical')) {
    return isRisk 
      ? 'bg-red-500/10 text-red-500 border-red-500/20' 
      : 'bg-green-500/10 text-green-500 border-green-500/20';
  }
  if (v.includes('medium')) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if (v.includes('low')) {
    return isRisk 
      ? 'bg-green-500/10 text-green-500 border-green-500/20' 
      : 'bg-red-500/10 text-red-500 border-red-500/20';
  }
  
  if (v === 'active' || v === 'qualified' || v === 'approved' || v === 'yes' || v === 'true' || v === 'enabled') {
    return 'bg-green-500/10 text-green-500 border-green-500/20';
  }
  if (v === 'inactive' || v === 'rejected' || v === 'disqualified' || v === 'no' || v === 'false' || v === 'disabled') {
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  }
  if (v === 'pending' || v === 'review') {
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  }
  
  return 'bg-secondary text-secondary-foreground border-border';
};

const isUrl = (str) => typeof str === 'string' && /^https?:\/\//i.test(str);
const isEmail = (str) => typeof str === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
const isStatus = (str) => {
  if (typeof str !== 'string' && typeof str !== 'boolean') return false;
  const v = String(str).toLowerCase();
  return ['high', 'medium', 'low', 'active', 'inactive', 'true', 'false', 'yes', 'no', 'enabled', 'disabled'].includes(v);
};

const renderNestedObject = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object') return null;
  const entries = Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", depth > 0 && "pl-3 border-l-2 border-border/40 mt-1.5")}>
      {entries.map(([k, v]) => (
        <div key={k} className="text-sm flex flex-col gap-0.5">
          <span className="font-medium text-foreground/80">{keyToLabel(k)}:</span>
          <div className="text-muted-foreground">
            {typeof v === 'object' && v !== null ? (
              Array.isArray(v) ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {v.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/20 text-secondary-foreground text-xs font-medium">
                      {String(item)}
                    </span>
                  ))}
                </div>
              ) : (
                renderNestedObject(v, depth + 1)
              )
            ) : (
              String(v)
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderValue = (key, value) => {
  if (value === null || value === undefined || value === '') return null;

  if (isStatus(value)) {
    return (
      <Badge variant="outline" className={cn("text-xs font-medium px-2.5 py-0.5", getStatusColor(key, value))}>
        {String(value)}
      </Badge>
    );
  }

  if (isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium break-all">
        <LinkIcon className="h-3.5 w-3.5 shrink-0" />
        {value}
      </a>
    );
  }

  if (isEmail(value)) {
    return (
      <a href={`mailto:${value}`} className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium break-all">
        <Mail className="h-3.5 w-3.5 shrink-0" />
        {value}
      </a>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const isStringArray = value.every(v => typeof v === 'string' || typeof v === 'number');
    if (isStringArray) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/20 text-secondary-foreground text-xs font-medium">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {value.map((item, idx) => (
          <div key={idx} className="bg-muted/10 p-3 rounded-lg border border-border/40">
            {typeof item === 'object' && item !== null ? renderNestedObject(item) : String(item)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    if (Object.keys(value).length === 0) return null;
    return renderNestedObject(value);
  }

  const strValue = String(value);
  if (strValue.length < 80) {
    return <span className="text-sm text-muted-foreground">{strValue}</span>;
  }

  return <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{strValue}</div>;
};

const getIconForKey = (key) => {
  const k = key.toLowerCase();
  if (k.includes('note') || k.includes('desc') || k.includes('summary')) return FileText;
  if (k.includes('tag') || k.includes('category') || k.includes('type')) return Tag;
  return Info;
};

const AdditionalInfoCardGrid = ({ items }) => {
  if (!items || typeof items !== 'object' || Object.keys(items).length === 0) return null;

  const validEntries = Object.entries(items).filter(([_, v]) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
    return true;
  });

  if (validEntries.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Layers className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Additional Information</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
        {validEntries.map(([key, value]) => {
          const Icon = getIconForKey(key);
          return (
            <Card key={key} className="border border-border/50 bg-card rounded-xl shadow-sm overflow-hidden h-full">
              <CardContent className="p-5 space-y-3 h-full flex flex-col">
                <div className="flex items-start gap-2">
                  <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <h4 className="text-sm font-semibold text-foreground leading-tight">
                    {keyToLabel(key)}
                  </h4>
                </div>
                <div className="flex-1">
                  {renderValue(key, value)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdditionalInfoCardGrid;