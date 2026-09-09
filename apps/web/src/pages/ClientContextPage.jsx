import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import EntityHeaderCard from '@/components/EntityHeaderCard.jsx';
import MetricTile from '@/components/MetricTile.jsx';
import ActionCard from '@/components/ActionCard.jsx';
import ServiceOfferingsSection from '@/components/ServiceOfferingsSection.jsx';
import AdditionalInfoCardGrid from '@/components/AdditionalInfoCardGrid.jsx';
import StrategicContextSection from '@/components/StrategicContextSection.jsx';
import { 
  AlertCircle, 
  Target, 
  Lightbulb, 
  Rocket, 
  Zap, 
  CheckSquare, 
  Shield, 
  TrendingUp, 
  Key,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Mail,
  Activity,
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  Users,
  Globe,
  Phone,
  FileText,
  User,
  Linkedin,
  ShieldAlert,
  HelpCircle,
  Tag,
  Crosshair,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import supabaseDataService from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';

// --- Helper Functions ---

const CLIENT_CONTEXT_STYLES = {
  sectionHeading: 'text-xl font-semibold tracking-tight text-foreground',
  cardShell: 'h-full overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm',
  cardTitle: 'text-base font-semibold leading-tight text-foreground',
  bodyText: 'text-sm leading-relaxed text-muted-foreground',
  fieldLabel: 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
  innerTile: 'rounded-lg border border-border/60 bg-muted/15 p-3',
  pill: 'bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
};

const CLIENT_CONTEXT_ACCENT = 'bg-primary/10 text-primary border-primary/20';

const SectionHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 border-b border-border/50 pb-2">
    {Icon && <Icon className="h-5 w-5 text-primary" />}
    <h3 className={CLIENT_CONTEXT_STYLES.sectionHeading}>{title}</h3>
  </div>
);

const normalizeFieldName = (key) => {
  if (!key) return '';
  const normalized = key
    .replace(/^(client_name|company_name)$/i, 'name')
    .replace(/^(email_address|contact_email)$/i, 'email');
  
  return normalized
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

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

const isUrl = (str) => /^https?:\/\//i.test(str);
const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
const isDate = (str) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) && !isNaN(Date.parse(str));

const renderText = (text) => {
  if (!text) return <span className="text-muted-foreground italic text-sm">Not provided</span>;
  
  if (isUrl(text)) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium break-all">
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        {text}
      </a>
    );
  }
  
  if (isEmail(text)) {
    return (
      <a href={`mailto:${text}`} className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium break-all">
        <Mail className="h-3.5 w-3.5 shrink-0" />
        {text}
      </a>
    );
  }
  
  if (isDate(text)) {
    return <span className="text-sm text-foreground">{new Date(text).toLocaleString()}</span>;
  }

  return (
    <div className={`${CLIENT_CONTEXT_STYLES.bodyText} whitespace-pre-wrap`}>
      {text}
    </div>
  );
};

const renderArray = (arr, depth = 0) => {
  if (!arr || arr.length === 0) {
    return <span className="text-muted-foreground italic text-sm">Empty list</span>;
  }
  
  const hasObjects = arr.some(item => typeof item === 'object' && item !== null);
  
  if (hasObjects) {
    return (
      <div className="mt-2 space-y-4">
        <div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
          {arr.length} item{arr.length !== 1 ? 's' : ''}
        </div>
        <div className="space-y-4">
          {arr.map((item, i) => (
            <div key={i} className="pl-4 border-l-2 border-primary/20 relative">
              <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary/40" />
              {renderValue(item, depth + 1)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-2">
        {arr.map((item, i) => (
          <Badge key={i} variant="secondary" className={CLIENT_CONTEXT_STYLES.pill}>
            {String(item)}
          </Badge>
        ))}
      </div>
    </div>
  );
};

const renderObject = (obj, depth = 0) => {
  if (!obj || Object.keys(obj).length === 0) {
    return <span className="text-muted-foreground italic text-sm">Empty</span>;
  }
  
  return (
    <div className="space-y-3 mt-2 pl-4 border-l-2 border-border/40">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1">
          <span className="block text-sm font-semibold text-foreground">
            {normalizeFieldName(k)}
          </span>
          <div className="mt-0.5">
            {renderValue(v, depth + 1)}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderValue = (val, depth = 0) => {
  if (val === null || val === undefined || val === '') {
    return <span className="text-muted-foreground italic text-sm">Not provided</span>;
  }
  if (typeof val === 'boolean') {
    return val ? (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500">
        <CheckCircle2 className="h-4 w-4" /> Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-500">
        <XCircle className="h-4 w-4" /> No
      </span>
    );
  }
  if (typeof val === 'number') {
    return <span className="text-sm font-mono text-foreground bg-muted/30 px-1.5 py-0.5 rounded">{val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>;
  }
  if (typeof val === 'string') {
    return renderText(val);
  }
  if (Array.isArray(val)) {
    return renderArray(val, depth);
  }
  if (typeof val === 'object') {
    return renderObject(val, depth);
  }
  return <span className={CLIENT_CONTEXT_STYLES.bodyText}>{String(val)}</span>;
};

// Formatter to render complex data as clean, readable text
const formatForActionCard = (data, depth = 0) => {
  if (data === null || data === undefined || data === '') return '';
  if (typeof data === 'boolean') return data ? 'Yes' : 'No';
  if (typeof data === 'number') return String(data);
  if (typeof data === 'string') return data;

  const indent = '  '.repeat(depth);

  if (Array.isArray(data)) {
    if (data.length === 0) return '';

    const isObjectArray = data.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));

    if (isObjectArray) {
      const anyHasExtra = data.some(item => {
        const name = item.name || item.title || item.persona;
        const role = item.role || item.type || item.jobTitle || item.job_title;
        if (name && role) {
          const rest = Object.keys(item).filter(k => !['name', 'title', 'persona', 'role', 'type', 'jobTitle', 'job_title'].includes(k));
          return rest.length > 0;
        }
        return Object.keys(item).length > 2;
      });

      return data.map((item) => {
        const name = item.name || item.title || item.persona;
        const role = item.role || item.type || item.jobTitle || item.job_title;

        let result = '';
        if (name && role) {
          result += `${indent}${name} — ${role}`;
          const rest = Object.entries(item).filter(([k]) => !['name', 'title', 'persona', 'role', 'type', 'jobTitle', 'job_title'].includes(k));
          if (rest.length > 0) {
            const restLines = rest.map(([k, v]) => {
              if (v === null || v === undefined || v === '') return null;
              const label = keyToLabel(k);
              
              if (typeof v === 'object' && v !== null && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)) {
                const nestedVal = formatForActionCard(v, depth + 2);
                if (!nestedVal) return null;
                return `${indent}  ${label}:\n${nestedVal}`;
              }
              
              const val = formatForActionCard(v, 0).trim();
              if (val === '') return null;
              
              const lines = val.split('\n');
              if (lines.length > 1) {
                return `${indent}  ${label}:\n` + lines.map(l => `${indent}    ${l}`).join('\n');
              }
              return `${indent}  ${label}: ${val}`;
            }).filter(Boolean);

            if (restLines.length > 0) {
              result += '\n' + restLines.join('\n');
            }
          }
        } else {
          result += Object.entries(item)
            .map(([k, v]) => {
              if (v === null || v === undefined || v === '') return null;
              const label = keyToLabel(k);
              
              if (typeof v === 'object' && v !== null && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)) {
                const nestedVal = formatForActionCard(v, depth + 1);
                if (!nestedVal) return null;
                return `${indent}${label}:\n${nestedVal}`;
              }
              
              const val = formatForActionCard(v, 0).trim();
              if (val === '') return null;
              
              const lines = val.split('\n');
              if (lines.length > 1) {
                return `${indent}${label}:\n` + lines.map(l => `${indent}  ${l}`).join('\n');
              }
              return `${indent}${label}: ${val}`;
            })
            .filter(Boolean)
            .join('\n');
        }
        return result;
      }).filter(Boolean).join(anyHasExtra ? '\n\n' : '\n');
    }

    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        return formatForActionCard(item, depth);
      }
      const lines = String(item).split('\n');
      if (lines.length > 1) {
        return `${indent}• ${lines[0]}\n` + lines.slice(1).map(l => `${indent}  ${l}`).join('\n');
      }
      return `${indent}• ${item}`;
    }).filter(Boolean).join('\n');
  }

  if (typeof data === 'object') {
    if (Object.keys(data).length === 0) return '';
    return Object.entries(data)
      .map(([k, v]) => {
        if (v === null || v === undefined || v === '') return null;
        const label = keyToLabel(k);
        
        if (typeof v === 'object' && v !== null && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)) {
          const nestedVal = formatForActionCard(v, depth + 1);
          if (!nestedVal) return null;
          return `${indent}${label}:\n${nestedVal}`;
        }

        const val = formatForActionCard(v, 0).trim();
        if (val === '') return null;
        
        const lines = val.split('\n');
        if (lines.length > 1) {
          return `${indent}${label}:\n` + lines.map(l => `${indent}  ${l}`).join('\n');
        }
        return `${indent}${label}: ${val}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  return String(data);
};

const formatFieldValue = (value, depth = 0) => {
  const formatted = formatForActionCard(value, depth);
  return formatted === '' ? 'Not provided' : formatted;
};

const getMetricIcon = (key) => {
  const l = key.toLowerCase();
  if (l.includes('industry')) return Briefcase;
  if (l.includes('size') || l.includes('employee')) return Users;
  if (l.includes('location')) return MapPin;
  if (l.includes('revenue') || l.includes('budget')) return DollarSign;
  if (l.includes('time') || l.includes('founded')) return Clock;
  if (l.includes('status') || l.includes('stage')) return Activity;
  if (l.includes('web') || l.includes('url')) return Globe;
  if (l.includes('phone')) return Phone;
  if (l.includes('email')) return Mail;
  return Activity;
};

const getStatusColor = (key, value) => {
  const k = key.toLowerCase();
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
  
  if (v === 'active' || v === 'qualified' || v === 'approved' || v === 'yes' || v === 'true') {
    return 'bg-green-500/10 text-green-500 border-green-500/20';
  }
  if (v === 'inactive' || v === 'rejected' || v === 'disqualified' || v === 'no' || v === 'false') {
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  }
  if (v === 'pending' || v === 'review') {
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  }
  
  return 'bg-secondary text-secondary-foreground border-border';
};

const ContentPanel = ({ title, children, compact }) => (
  <Card className={CLIENT_CONTEXT_STYLES.cardShell}>
    <CardHeader className={cn("border-b border-border/50 bg-muted/10", compact ? "p-4" : "pb-4")}>
      <CardTitle className={cn(CLIENT_CONTEXT_STYLES.cardTitle, "flex items-center gap-2")}>
        <FileText className="h-5 w-5 text-primary shrink-0" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className={cn(compact ? "p-4" : "p-6")}>
      <div className={cn("bg-background/40 rounded-lg", compact ? "p-0" : "p-2")}>
        {children}
      </div>
    </CardContent>
  </Card>
);

const StrategyCardGrid = ({ title, icon: Icon, children }) => {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  
  return (
    <div className="space-y-4">
      <SectionHeading icon={Icon} title={title} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {children}
      </div>
    </div>
  );
};

const isStructuredActionValue = (value) => (
  value
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).length > 0
);

const StructuredActionValue = ({ value }) => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatForActionCard(item).trim())
      .filter(Boolean);

    if (items.length === 0) {
      return <span className="text-sm italic text-muted-foreground">Not provided</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <Badge
            key={`${item}-${index}`}
            variant="secondary"
            className={CLIENT_CONTEXT_STYLES.pill}
          >
            {item}
          </Badge>
        ))}
      </div>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([key, nestedValue]) => {
          const text = formatForActionCard(nestedValue).trim();
          if (!text) return null;

          return (
            <div key={key} className="space-y-1">
              <p className={CLIENT_CONTEXT_STYLES.fieldLabel}>
                {keyToLabel(key)}
              </p>
              <p className={`${CLIENT_CONTEXT_STYLES.bodyText} whitespace-pre-wrap`}>
                {text}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  const text = formatForActionCard(value).trim();
  if (!text) return <span className="text-sm italic text-muted-foreground">Not provided</span>;

  return <p className={`${CLIENT_CONTEXT_STYLES.bodyText} whitespace-pre-wrap`}>{text}</p>;
};

const StructuredActionCard = ({ icon: Icon, heading, value, accentColor = CLIENT_CONTEXT_ACCENT }) => {
  const isContactRouting = String(heading || '').toLowerCase() === 'contact routing';
  const sections = Object.entries(value || {})
    .map(([key, sectionValue]) => ({ key, label: keyToLabel(key), value: sectionValue }))
    .filter((section) => formatForActionCard(section.value).trim());

  if (sections.length === 0) {
    return (
      <ActionCard
        icon={Icon}
        heading={heading}
        content="Not provided."
        accentColor={accentColor}
      />
    );
  }

  return (
    <Card className={cn(CLIENT_CONTEXT_STYLES.cardShell, isContactRouting && "md:col-span-2 lg:col-span-3")}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("rounded-lg border p-2", accentColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h4 className={CLIENT_CONTEXT_STYLES.cardTitle}>
            {heading}
          </h4>
        </div>

        <div className={cn(
          "grid grid-cols-1 gap-3",
          isContactRouting ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-1"
        )}>
          {sections.map((section) => (
            <div
              key={section.key}
              className={CLIENT_CONTEXT_STYLES.innerTile}
            >
              <p className={cn(CLIENT_CONTEXT_STYLES.fieldLabel, "mb-2 text-primary")}>
                {section.label}
              </p>
              <StructuredActionValue value={section.value} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ContextContactCard = ({ item }) => {
  const name = item.name || item.title || item.persona || 'Unknown Role/Contact';
  const role = item.role || item.type || item.job_title || '';
  const email = item.email || '';
  const phone = item.phone || item.telephone || '';
  const linkedin = item.linkedin || item.linkedin_url || '';
  const description = item.description || item.bio || item.notes || item.summary || item.responsibilities || '';
  const priority = item.priority || '';
  const confidence = item.confidence || '';

  return (
    <Card className="bg-card shadow-sm border-border/50 overflow-hidden hover:border-primary/30 transition-colors h-full flex flex-col">
      <CardContent className="p-5 flex flex-col h-full space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h4 className={CLIENT_CONTEXT_STYLES.cardTitle}>{name}</h4>
              {role && <p className="text-sm text-muted-foreground mt-0.5">{role}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            {priority && (
              <Badge variant="outline" className={cn("text-xs font-medium", getStatusColor('priority', priority))}>
                {priority} Priority
              </Badge>
            )}
            {confidence && (
              <Badge variant="outline" className={cn("text-xs font-medium", getStatusColor('confidence', confidence))}>
                {confidence} Confidence
              </Badge>
            )}
          </div>
        </div>

        {description && (
          <div className={cn(CLIENT_CONTEXT_STYLES.bodyText, "flex-1")}>
            {description}
          </div>
        )}

        {(email || phone || linkedin) && (
          <div className="pt-4 border-t border-border/50 space-y-2 mt-auto">
            {email && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                <span className="truncate">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="h-4 w-4 mr-2" />
                <span>{phone}</span>
              </div>
            )}
            {linkedin && (
              <div className="flex items-center text-sm text-primary">
                <Linkedin className="h-4 w-4 mr-2" />
                <a href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                  LinkedIn Profile
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const METRIC_KEYWORDS = ['industry', 'size', 'location', 'founded', 'revenue', 'employee', 'phone', 'email', 'budget', 'timeline', 'website', 'count', 'stage', 'confidence', 'entity_type'];
const CONTENT_KEYWORDS = ['description', 'overview', 'summary', 'business_model', 'growth', 'risk_assessment', 'profile', 'geographic_focus'];
const CONTACT_KEYWORDS = ['buyer', 'decision_maker', 'influencer', 'persona', 'contact', 'role', 'stakeholder'];
const STATUS_KEYWORDS = ['priority', 'confidence', 'risk', 'disqualifi', 'status', 'classification', 'tier'];

const ClientContextPage = () => {
  const { client_id } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContext = async () => {
      if (!client_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setMissing(false);

        const data = await supabaseDataService.fetchActiveClientContext(client_id);
        
        if (!data || !data.content) {
          setMissing(true);
        } else {
          setDocument(data);
        }
      } catch (err) {
        console.error('Failed to fetch client context:', err);
        if (err.message && err.message.includes('No active client context')) {
          setMissing(true);
        } else {
          setError(err.message || 'An unexpected error occurred while loading the client context.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [client_id]);

  const parsedData = useMemo(() => {
    if (!document || !document.content) return null;

    const content = document.content;
    const usedKeys = new Set();
    
    // 1. Extract Header Data
    const titleKey = Object.keys(content).find(k => ['name', 'client_name', 'company_name'].includes(k.toLowerCase()));
    const subtitleKey = Object.keys(content).find(k => ['summary', 'description', 'overview'].includes(k.toLowerCase()));
    const linkKey = Object.keys(content).find(k => ['website', 'url'].includes(k.toLowerCase()));

    const headerData = {
      title: titleKey ? content[titleKey] : 'Client Context',
      subtitle: subtitleKey ? content[subtitleKey] : '',
      externalLink: linkKey ? content[linkKey] : '',
      version: document.version_id,
      publishedDate: document.created_at
    };

    if (titleKey) usedKeys.add(titleKey);
    if (subtitleKey) usedKeys.add(subtitleKey);
    if (linkKey) usedKeys.add(linkKey);

    // 2. Extract Top Strategy Cards
    const topStrategies = {
      corePositioning: null,
      outreachAngles: null,
      proposalStrategy: null
    };

    const findAndSetStrategy = (keywords, keyRef) => {
      for (const kw of keywords) {
        const exactKey = Object.keys(content).find(k => k.toLowerCase() === kw.toLowerCase());
        if (exactKey && !usedKeys.has(exactKey)) {
          topStrategies[keyRef] = { key: exactKey, label: normalizeFieldName(exactKey), value: content[exactKey] };
          usedKeys.add(exactKey);
          break;
        }
      }
    };

    findAndSetStrategy(['core_positioning', 'positioning', 'value_proposition', 'commercial_identity', 'market_position', 'primary_value_proposition'], 'corePositioning');
    findAndSetStrategy(['sample_outreach_angles', 'outreach_angles', 'outreach_strategy', 'call_openers', 'recommended_motion', 'route_to_engagement'], 'outreachAngles');
    findAndSetStrategy(['proposal_strategy_context', 'proposal_strategy', 'qualification_guidance', 'evidence_requirements', 'sales_process', 'success_metrics'], 'proposalStrategy');

    // 3. Extract Company Profile
    const companyProfileKeys = ['company_profile', 'companyprofile', 'profile', 'company_info', 'companyinfo'];
    let companyProfileObj = null;
    let companyProfileParentKey = null;

    for (const k of Object.keys(content)) {
      if (companyProfileKeys.includes(k.toLowerCase()) && typeof content[k] === 'object' && content[k] !== null && !Array.isArray(content[k])) {
        companyProfileObj = content[k];
        companyProfileParentKey = k;
        usedKeys.add(k);
        break;
      }
    }

    const companyProfileData = {
      shortFields: [],
      longFields: []
    };

    const unmapped = {};

    if (companyProfileObj) {
      const SHORT_KEYS = ['website', 'industry', 'company_stage', 'geography', 'entity_type', 'employee_count', 'revenue'];
      const LONG_KEYS = ['business_model', 'summary', 'description', 'notes', 'geographic_focus'];

      Object.entries(companyProfileObj).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '') return;
        
        const lowerK = k.toLowerCase();
        let matched = false;

        if (SHORT_KEYS.includes(lowerK)) {
          companyProfileData.shortFields.push({ key: k, label: keyToLabel(k), value: v, icon: getMetricIcon(k) });
          usedKeys.add(k);
          matched = true;
        } else if (LONG_KEYS.includes(lowerK)) {
          companyProfileData.longFields.push({ key: k, label: keyToLabel(k), value: v });
          usedKeys.add(k);
          matched = true;
        }

        if (!matched) {
          unmapped[`${companyProfileParentKey}_${k}`] = v;
        }
      });
    }

    // 4. Extract Service Offerings
    const SERVICE_OFFERING_KEYS = [
      'service_offerings',
      'serviceoffering',
      'service_offering',
      'offerings',
      'services',
      'products',
      'solutions'
    ];
    let serviceOfferingsKey = undefined;
    for (const targetKey of SERVICE_OFFERING_KEYS) {
      const match = Object.keys(content).find(k => k.toLowerCase() === targetKey.toLowerCase());
      if (match) {
        serviceOfferingsKey = match;
        break;
      }
    }
    const serviceOfferings = serviceOfferingsKey ? content[serviceOfferingsKey] : undefined;
    if (serviceOfferingsKey) {
      usedKeys.add(serviceOfferingsKey);
    }

    // 4.25 Extract Commercial Model
    const commercialModelKey = Object.keys(content).find(k => k.toLowerCase() === 'commercial_model');
    const commercialModelSource = commercialModelKey
      && typeof content[commercialModelKey] === 'object'
      && content[commercialModelKey] !== null
      && !Array.isArray(content[commercialModelKey])
      ? content[commercialModelKey]
      : null;
    const averageDealSize = Number(commercialModelSource?.average_deal_size_gbp);
    const commercialModel = commercialModelSource ? {
      averageDealSizeGbp: Number.isFinite(averageDealSize) && averageDealSize > 0 ? averageDealSize : null,
      additionalFields: Object.entries(commercialModelSource)
        .filter(([key, value]) => key !== 'average_deal_size_gbp' && value !== null && value !== undefined && value !== '')
        .map(([key, value]) => ({ key, label: keyToLabel(key), value }))
    } : null;
    if (commercialModelKey) usedKeys.add(commercialModelKey);

    // 4.5 Extract Structured Context fields
    const structuredContext = {
      differentiation: undefined,
      growthConstraints: undefined,
      targetClientProfile: undefined
    };

    const diffKey = Object.keys(content).find(k => k.toLowerCase() === 'differentiation');
    if (diffKey) {
      structuredContext.differentiation = content[diffKey];
      usedKeys.add(diffKey);
    }

    const growthKey = Object.keys(content).find(k => k.toLowerCase() === 'growth_constraints');
    if (growthKey) {
      structuredContext.growthConstraints = content[growthKey];
      usedKeys.add(growthKey);
    }

    const targetProfileKey = Object.keys(content).find(k => k.toLowerCase() === 'target_client_profile');
    if (targetProfileKey) {
      structuredContext.targetClientProfile = content[targetProfileKey];
      usedKeys.add(targetProfileKey);
    }

    // Categories
    const metrics = [];
    const actions = [];
    const contents = [];
    const contactGroups = [];
    const statuses = [];

    Object.keys(content).forEach(key => {
      if (usedKeys.has(key)) return;
      
      const lowerKey = key.toLowerCase();
      const val = content[key];
      
      if (STATUS_KEYWORDS.some(kw => lowerKey.includes(kw)) && (typeof val === 'string' || typeof val === 'number') && String(val).length <= 50) {
        statuses.push({ key, label: normalizeFieldName(key), value: val });
      } else if (CONTACT_KEYWORDS.some(kw => lowerKey.includes(kw)) && Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        contactGroups.push({ key, label: normalizeFieldName(key), items: val });
      } else if (METRIC_KEYWORDS.some(kw => lowerKey.includes(kw)) && (typeof val === 'string' || typeof val === 'number') && String(val).length <= 50) {
        metrics.push({ key, label: normalizeFieldName(key), value: val, icon: getMetricIcon(key) });
      } else if (CONTENT_KEYWORDS.some(kw => lowerKey.includes(kw))) {
        contents.push({ key, label: normalizeFieldName(key), value: val });
      } else {
        if (typeof val === 'string' && val.length > 200) {
          contents.push({ key, label: normalizeFieldName(key), value: val });
        } else if (typeof val === 'string' && val.length <= 50) {
          metrics.push({ key, label: normalizeFieldName(key), value: val, icon: getMetricIcon(key) });
        } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          contactGroups.push({ key, label: normalizeFieldName(key), items: val });
        } else if (Array.isArray(val) && val.length > 0) {
          actions.push({ key, label: normalizeFieldName(key), value: val });
        } else if (typeof val === 'object' && val !== null) {
          if (JSON.stringify(val).length > 800) {
            contents.push({ key, label: normalizeFieldName(key), value: val });
          } else {
            actions.push({ key, label: normalizeFieldName(key), value: val });
          }
        } else if (typeof val === 'string') {
          actions.push({ key, label: normalizeFieldName(key), value: val });
        } else {
          unmapped[key] = val;
        }
      }
      usedKeys.add(key);
    });

    return { 
      headerData, 
      topStrategies, 
      companyProfileData, 
      serviceOfferings, 
      commercialModel,
      structuredContext, 
      statuses, 
      metrics, 
      actions, 
      contents, 
      contactGroups, 
      unmapped 
    };
  }, [document]);

  if (!client_id) {
    return (
      <>
        <Helmet><title>Client Context - LeadScout Portal</title></Helmet>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-8">
              <div className="max-w-7xl mx-auto">
                <Card className="border-muted bg-muted/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      No Client Assigned
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Your account is not currently assigned to a specific client workspace. Please contact your administrator.</p>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Client Context - LeadScout Portal</title>
        <meta name="description" content="Active client context and go-to-market strategies" />
      </Helmet>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                
                {loading && (
                  <div className="grid grid-cols-1 gap-6">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                  </div>
                )}

                {!loading && missing && (
                  <Card className="border-border bg-muted/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Info className="h-5 w-5 text-primary" />
                        No Active Context Found
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">No active client context has been published yet. Please configure the go-to-market context in the settings area or reach out to your administrator.</p>
                    </CardContent>
                  </Card>
                )}

                {!loading && error && !missing && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Error Loading Context
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{error}</p>
                    </CardContent>
                  </Card>
                )}

                {!loading && parsedData && (
                  <div className="space-y-10">
                    {/* 1. HEADER SECTION */}
                    <EntityHeaderCard 
                      title={parsedData.headerData.title}
                      subtitle={parsedData.headerData.subtitle}
                      publishedDate={parsedData.headerData.publishedDate}
                      externalLink={parsedData.headerData.externalLink}
                      version={parsedData.headerData.version}
                    />

                    {/* 2. STATUS BADGES SECTION */}
                    {parsedData.statuses.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-4 rounded-xl border border-border/50">
                        {parsedData.statuses.map((status) => {
                          const isRisk = status.key.toLowerCase().includes('risk') || status.key.toLowerCase().includes('disqualif');
                          const Icon = isRisk ? ShieldAlert : Tag;
                          
                          return (
                            <div key={status.key} className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {status.label}:
                              </span>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs font-medium px-2.5 py-0.5 flex items-center gap-1.5", getStatusColor(status.key, status.value))}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {String(status.value)}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. METRIC TILES GRID */}
                    {parsedData.metrics.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {parsedData.metrics.map((tile) => (
                          <MetricTile 
                            key={tile.key}
                            icon={tile.icon}
                            label={tile.label}
                            value={renderValue(tile.value)}
                          />
                        ))}
                      </div>
                    )}

                    {/* 3.25 COMPANY PROFILE SECTION */}
                    {parsedData.companyProfileData && (parsedData.companyProfileData.shortFields.length > 0 || parsedData.companyProfileData.longFields.length > 0) && (
                      <div className="space-y-6">
                        <SectionHeading icon={Briefcase} title="Company Profile" />
                        
                        {parsedData.companyProfileData.shortFields.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {parsedData.companyProfileData.shortFields.map((tile) => (
                              <MetricTile 
                                key={tile.key}
                                icon={tile.icon}
                                label={tile.label}
                                value={renderValue(tile.value)}
                              />
                            ))}
                          </div>
                        )}

                        {parsedData.companyProfileData.longFields.length > 0 && (() => {
                          const compactKeys = ['business_model', 'geographic_focus'];
                          const compactFields = parsedData.companyProfileData.longFields.filter(f => compactKeys.includes(f.key.toLowerCase()));
                          const otherLongFields = parsedData.companyProfileData.longFields.filter(f => !compactKeys.includes(f.key.toLowerCase()));

                          return (
                            <div className="space-y-4">
                              {compactFields.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {compactFields.map((field) => (
                                    <ContentPanel key={field.key} title={field.label} compact>
                                      {renderValue(field.value)}
                                    </ContentPanel>
                                  ))}
                                </div>
                              )}
                              {otherLongFields.length > 0 && (
                                <div className="grid grid-cols-1 gap-6">
                                  {otherLongFields.map((field) => (
                                    <ContentPanel key={field.key} title={field.label}>
                                      {renderValue(field.value)}
                                    </ContentPanel>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* 3.4 COMMERCIAL MODEL SECTION */}
                    {parsedData.commercialModel && (
                      <div className="space-y-4">
                        <SectionHeading icon={DollarSign} title="Commercial Model" />
                        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] md:items-center">
                              <div>
                                <p className={CLIENT_CONTEXT_STYLES.fieldLabel}>Average deal size</p>
                                {parsedData.commercialModel.averageDealSizeGbp !== null ? (
                                  <p className="mt-2 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                                    {new Intl.NumberFormat('en-GB', {
                                      style: 'currency',
                                      currency: 'GBP',
                                      maximumFractionDigits: 0
                                    }).format(parsedData.commercialModel.averageDealSizeGbp)}
                                  </p>
                                ) : (
                                  <p className="mt-2 text-lg font-medium text-muted-foreground">Not configured</p>
                                )}
                              </div>
                              <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                                <p className="text-sm font-medium text-foreground">Management reporting assumption</p>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  Used to estimate contacted potential and meeting pipeline. It is an indicative client-level assumption, not recognised revenue.
                                </p>
                              </div>
                            </div>

                            {parsedData.commercialModel.additionalFields.length > 0 && (
                              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border/50 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                                {parsedData.commercialModel.additionalFields.map((field) => (
                                  <div key={field.key} className={CLIENT_CONTEXT_STYLES.innerTile}>
                                    <p className={CLIENT_CONTEXT_STYLES.fieldLabel}>{field.label}</p>
                                    <div className="mt-1 text-sm font-medium text-foreground">{renderValue(field.value)}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* 3.5. CORE STRATEGIES GRID */}
                    {(parsedData.topStrategies.corePositioning || parsedData.topStrategies.outreachAngles || parsedData.topStrategies.proposalStrategy) && (
                      <StrategyCardGrid title="Core Context" icon={Target}>
                        {parsedData.topStrategies.corePositioning && (
                          <ActionCard
                            icon={MessageSquare}
                            heading="Core Positioning"
                            content={formatForActionCard(parsedData.topStrategies.corePositioning.value)}
                            accentColor={CLIENT_CONTEXT_ACCENT}
                            collapsible
                          />
                        )}
                        {parsedData.topStrategies.outreachAngles && (
                          <ActionCard
                            icon={Rocket}
                            heading="Sample Outreach Angles"
                            content={formatForActionCard(parsedData.topStrategies.outreachAngles.value)}
                            accentColor={CLIENT_CONTEXT_ACCENT}
                            collapsible
                          />
                        )}
                        {parsedData.topStrategies.proposalStrategy && (
                          <ActionCard
                            icon={CheckSquare}
                            heading="Proposal Strategy Context"
                            content={formatForActionCard(parsedData.topStrategies.proposalStrategy.value)}
                            accentColor={CLIENT_CONTEXT_ACCENT}
                            collapsible
                          />
                        )}
                      </StrategyCardGrid>
                    )}

                    {/* 3.8 SERVICE OFFERINGS SECTION */}
                    {parsedData.serviceOfferings !== undefined && parsedData.serviceOfferings !== null && (
                      <ServiceOfferingsSection value={parsedData.serviceOfferings} />
                    )}

                    {/* 3.9 STRUCTURED CONTEXT SECTIONS */}
                    {(parsedData.structuredContext?.differentiation || parsedData.structuredContext?.growthConstraints || parsedData.structuredContext?.targetClientProfile) && (
                      <div className="space-y-6">
                        {parsedData.structuredContext?.differentiation && (
                          <StrategicContextSection 
                            title="Differentiation" 
                            icon={Shield} 
                            value={parsedData.structuredContext.differentiation} 
                            tone="blue" 
                          />
                        )}
                        {parsedData.structuredContext?.growthConstraints && (
                          <StrategicContextSection 
                            title="Growth Constraints" 
                            icon={AlertTriangle} 
                            value={parsedData.structuredContext.growthConstraints} 
                            tone="amber" 
                          />
                        )}
                        {parsedData.structuredContext?.targetClientProfile && (
                          <StrategicContextSection 
                            title="Target Client Profile" 
                            icon={Crosshair} 
                            value={parsedData.structuredContext.targetClientProfile} 
                            tone="emerald" 
                          />
                        )}
                      </div>
                    )}

                    {/* 4. ACTION CARD GRID (Strategic Insights) */}
                    {parsedData.actions.length > 0 && (
                      <StrategyCardGrid title="Strategic Insights" icon={Lightbulb}>
                        {parsedData.actions.map((item, idx) => {
                          if (isStructuredActionValue(item.value)) {
                            return (
                              <StructuredActionCard
                                key={item.key}
                                heading={item.label}
                                value={item.value}
                                accentColor={CLIENT_CONTEXT_ACCENT}
                              />
                            );
                          }

                          return (
                            <ActionCard
                              key={item.key}
                              heading={item.label}
                              content={formatForActionCard(item.value)}
                              accentColor={CLIENT_CONTEXT_ACCENT}
                            />
                          );
                        })}
                      </StrategyCardGrid>
                    )}

                    {/* 5. CONTENT PANELS (Long-form Narrative) */}
                    {parsedData.contents.length > 0 && (
                      <div className="grid grid-cols-1 gap-6">
                        {parsedData.contents.map((contentField) => (
                          <ContentPanel key={contentField.key} title={contentField.label}>
                            {renderValue(contentField.value)}
                          </ContentPanel>
                        ))}
                      </div>
                    )}

                    {/* 6. CONTACT / PERSONA CARDS */}
                    {parsedData.contactGroups.length > 0 && (
                      <div className="space-y-8">
                        {parsedData.contactGroups.map((group) => (
                          <div key={group.key} className="space-y-4">
                            <SectionHeading icon={Users} title={group.label} />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {group.items.map((item, idx) => (
                                <ContextContactCard key={idx} item={item} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 7. ADDITIONAL INFORMATION */}
                    <AdditionalInfoCardGrid items={parsedData.unmapped} />

                  </div>
                )}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default ClientContextPage;
