import React from 'react';
import { Card } from '@/components/ui/card';
import { Briefcase, Layers } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const SERVICE_STYLES = {
  sectionHeading: 'text-xl font-semibold tracking-tight text-foreground',
  cardShell: 'h-full rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-colors hover:border-primary/30',
  cardTitle: 'text-base font-semibold leading-tight text-foreground',
  bodyText: 'text-sm leading-relaxed text-muted-foreground',
  fieldLabel: 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
  innerTile: 'rounded-lg border border-border/60 bg-muted/15 p-3',
  pill: 'inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground'
};

const keyToLabel = (key) => {
  if (!key) return '';
  let str = key;
  // Convert entirely uppercase keys without underscores to lower to let title casing work properly
  if (str === str.toUpperCase() && !str.includes('_')) {
    str = str.toLowerCase();
  }
  
  str = str
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
    .replace(/[_-]+/g, ' ') // replace snake_case / kebab-case
    .replace(/\s+/g, ' ') // collapse spaces
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

const extractFieldByPriority = (item, keys) => {
  for (const key of keys) {
    const foundKey = Object.keys(item).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey && item[foundKey] !== null && item[foundKey] !== undefined && item[foundKey] !== '') {
      return { value: item[foundKey], key: foundKey };
    }
  }
  return { value: null, key: null };
};

const isScalar = (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

const renderScalarValue = (v) => {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

const renderNestedObject = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  const entries = Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;

  return (
    <div className={`${SERVICE_STYLES.innerTile} mt-1.5 space-y-2`}>
      {entries.map(([k, v]) => (
        <div key={k} className="text-xs flex flex-col gap-0.5">
          <span className={SERVICE_STYLES.fieldLabel}>{keyToLabel(k)}</span>
          <span className="whitespace-pre-wrap text-muted-foreground">
            {isScalar(v) ? renderScalarValue(v) : (Array.isArray(v) ? 'Nested List' : 'Nested Data')}
          </span>
        </div>
      ))}
    </div>
  );
};

const ServiceCard = ({ item, categoryKey }) => {
  if (typeof item !== 'object' || item === null) {
    return (
      <Card className={SERVICE_STYLES.cardShell}>
        <h3 className={SERVICE_STYLES.cardTitle}>{String(item)}</h3>
      </Card>
    );
  }

  const usedKeys = new Set();

  // 1. Title Extraction
  const titleRes = extractFieldByPriority(item, ['name', 'title', 'service_name', 'offering', 'label']);
  const title = titleRes.value || (categoryKey ? keyToLabel(categoryKey) : 'Service Offering');
  if (titleRes.key) usedKeys.add(titleRes.key);

  // 2. Description Extraction
  const descRes = extractFieldByPriority(item, ['description', 'summary', 'what_it_is', 'details', 'overview']);
  const description = descRes.value;
  if (descRes.key) usedKeys.add(descRes.key);

  // 3. Commercial Fit Extraction
  const fitRes = extractFieldByPriority(item, ['commercial_fit', 'fit', 'best_for', 'ideal_customer', 'target_customer']);
  if (fitRes.key) usedKeys.add(fitRes.key);

  // 4. Engagement Type Extraction
  const engRes = extractFieldByPriority(item, ['target_engagement_type', 'engagement_type', 'motion', 'delivery_model']);
  if (engRes.key) usedKeys.add(engRes.key);

  // 5. Remaining Fields Categorization
  const remainingScalars = [];
  const stringArrays = [];
  const objectArrays = [];
  const singleObjects = [];

  Object.entries(item).forEach(([k, v]) => {
    if (usedKeys.has(k)) return;
    if (v === null || v === undefined || v === '') return;

    if (isScalar(v)) {
      remainingScalars.push({ key: k, value: v });
    } else if (Array.isArray(v) && v.length > 0) {
      const isStringArray = v.every(isScalar);
      if (isStringArray) {
        stringArrays.push({ key: k, value: v });
      } else {
        const isObjArray = v.some(val => typeof val === 'object' && val !== null);
        if (isObjArray) {
          objectArrays.push({ key: k, value: v });
        }
      }
    } else if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0) {
      singleObjects.push({ key: k, value: v });
    }
  });

  const hasAdditionalFields = fitRes.value || engRes.value || remainingScalars.length > 0 || stringArrays.length > 0 || objectArrays.length > 0 || singleObjects.length > 0;

  return (
    <Card className={`${SERVICE_STYLES.cardShell} flex flex-col`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="mt-1">
          <h3 className={SERVICE_STYLES.cardTitle}>{title}</h3>
        </div>
      </div>
      
      {description && (
        <p className={`${SERVICE_STYLES.bodyText} mb-5 whitespace-pre-wrap`}>
          {description}
        </p>
      )}

      {hasAdditionalFields && (
        <div className="space-y-4 mt-auto pt-4 border-t border-border/50">
          
          {/* Core Fields */}
          {(fitRes.value || engRes.value) && (
            <div className="space-y-2">
              {fitRes.value && (
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{keyToLabel(fitRes.key || 'commercial_fit')}: </span>
                  <span className="text-muted-foreground">{renderScalarValue(fitRes.value)}</span>
                </div>
              )}
              {engRes.value && (
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{keyToLabel(engRes.key || 'engagement_type')}: </span>
                  <span className="text-muted-foreground">{renderScalarValue(engRes.value)}</span>
                </div>
              )}
            </div>
          )}

          {/* Other Scalars */}
          {remainingScalars.length > 0 && (
            <div className="space-y-2">
              {remainingScalars.map(({ key, value }) => (
                <div key={key} className="text-sm">
                  <span className="font-semibold text-foreground">{keyToLabel(key)}: </span>
                  <span className="text-muted-foreground">{renderScalarValue(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Arrays of Strings */}
          {stringArrays.length > 0 && (
            <div className="space-y-3">
              {stringArrays.map(({ key, value }) => (
                <div key={key} className="text-sm">
                  <div className={cn(SERVICE_STYLES.fieldLabel, "mb-1.5")}>{keyToLabel(key)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {value.map((item, idx) => (
                      <span 
                        key={idx} 
                        className={SERVICE_STYLES.pill}
                      >
                        {String(item)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Single Objects */}
          {singleObjects.length > 0 && (
            <div className="space-y-3">
              {singleObjects.map(({ key, value }) => (
                <div key={key} className="text-sm">
                  <div className={SERVICE_STYLES.fieldLabel}>{keyToLabel(key)}</div>
                  {renderNestedObject(value)}
                </div>
              ))}
            </div>
          )}

          {/* Arrays of Objects */}
          {objectArrays.length > 0 && (
            <div className="space-y-3">
              {objectArrays.map(({ key, value }) => (
                <div key={key} className="text-sm">
                  <div className={cn(SERVICE_STYLES.fieldLabel, "mb-1.5")}>{keyToLabel(key)}</div>
                  <div className="grid gap-2">
                    {value.map((obj, idx) => renderNestedObject(obj))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </Card>
  );
};

const ServiceOfferingsSection = ({ value }) => {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null;

  const isArray = Array.isArray(value);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Layers className="h-5 w-5 text-primary" />
        <h3 className={SERVICE_STYLES.sectionHeading}>Service Offerings</h3>
      </div>

      {isArray ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
          {value.map((item, idx) => (
            <ServiceCard key={idx} item={item} />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(value).map(([category, items]) => {
            if (!items || (Array.isArray(items) && items.length === 0)) return null;
            const itemsArray = Array.isArray(items) ? items : [items];
            
            return (
              <div key={category} className="space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold leading-tight text-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {keyToLabel(category)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                  {itemsArray.map((item, idx) => (
                    <ServiceCard key={idx} item={item} categoryKey={category} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServiceOfferingsSection;
