import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  Sparkles,
  Target,
  Users
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils.js';
import { normalizeWebsiteInput, runCompanyQualifier } from '@/services/companyQualifierService.js';

const PROGRESS_STEPS = ['Research', 'Scoring', 'Sales Intelligence'];
const PROGRESS_MESSAGES = [
  'Researching the company website and profile...',
  'Calculating ICP fit and qualification rationale...',
  'Creating sales brief, contacts, and outreach context...'
];
const SCORING_STAGE_DELAY_MS = 20000;
const SALES_INTELLIGENCE_STAGE_DELAY_MS = 40000;
const EXPECTED_RUN_SECONDS = 60;
const MAX_WAITING_PROGRESS = 95;

const getDecisionClass = (decision) => {
  const value = String(decision || '').toLowerCase();
  if (value === 'target') return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (value === 'watch') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (value === 'reject') return 'bg-red-500/15 text-red-400 border-red-500/30';
  return 'bg-muted text-muted-foreground border-border';
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const parseMaybeJson = (value) => {
  if (!value || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const getRawResult = (result) => parseMaybeJson(result?._raw) || {};

const getResearchData = (result) => {
  const raw = getRawResult(result);
  return parseMaybeJson(result?.research) || parseMaybeJson(raw?.research) || {};
};

const getScoreData = (result) => {
  const raw = getRawResult(result);
  return parseMaybeJson(result?.score) || parseMaybeJson(raw?.score) || {};
};

const getContacts = (result) => {
  const raw = getRawResult(result);
  if (Array.isArray(result?.contacts)) return result.contacts;
  if (Array.isArray(result?.contacts?.contacts)) return result.contacts.contacts;
  if (Array.isArray(raw?.contacts)) return raw.contacts;
  if (Array.isArray(raw?.contacts?.contacts)) return raw.contacts.contacts;
  return [];
};

const getRationale = (result) => asArray(result?.rationale || getScoreData(result)?.rationale);

const getCompanyName = (result) => {
  const raw = getRawResult(result);
  const research = getResearchData(result);
  return result?.company_name || research?.name || raw?.company_name || 'Qualified company';
};

const getWebsite = (result) => {
  const raw = getRawResult(result);
  const research = getResearchData(result);
  return result?.website || research?.website || raw?.website;
};

const getIndustry = (result) => {
  const research = getResearchData(result);
  return result?.industry || research?.industry || 'Unknown industry';
};

const getFitScore = (result) => {
  const score = getScoreData(result);
  return result?.fit_score ?? score?.fit_score ?? null;
};

const getDecision = (result) => {
  const raw = getRawResult(result);
  const score = getScoreData(result);
  return result?.decision || score?.decision || raw?.decision || 'unknown';
};

const getBrief = (result) => {
  const raw = getRawResult(result);
  return result?.brief || raw?.brief || '';
};

const getFinalBriefUrl = (result) => {
  const raw = getRawResult(result);
  return result?.final_brief_url || raw?.final_brief_url;
};

const CompanyQualifierPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [website, setWebsite] = useState('');
  const [submittedWebsite, setSubmittedWebsite] = useState('');
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isLoading) return undefined;

    setStageIndex(0);
    const scoringTimer = window.setTimeout(() => setStageIndex(1), SCORING_STAGE_DELAY_MS);
    const intelligenceTimer = window.setTimeout(() => setStageIndex(2), SALES_INTELLIGENCE_STAGE_DELAY_MS);

    return () => {
      window.clearTimeout(scoringTimer);
      window.clearTimeout(intelligenceTimer);
    };
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) return undefined;

    setElapsedSeconds(0);
    const elapsedTimer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(elapsedTimer);
  }, [isLoading]);

  const contacts = useMemo(() => getContacts(result), [result]);
  const rationale = useMemo(() => getRationale(result), [result]);
  const brief = getBrief(result);
  const finalBriefUrl = getFinalBriefUrl(result);
  const estimatedProgress = result
    ? 100
    : isLoading
      ? Math.min(
        MAX_WAITING_PROGRESS,
        Math.max(5, Math.round((elapsedSeconds / EXPECTED_RUN_SECONDS) * MAX_WAITING_PROGRESS))
      )
      : 0;
  const activeProgressMessage = result ? 'Completed.' : PROGRESS_MESSAGES[stageIndex] || PROGRESS_MESSAGES[0];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    let normalizedWebsite;
    try {
      normalizedWebsite = normalizeWebsiteInput(website);
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    setSubmittedWebsite(normalizedWebsite);
    setWebsite(normalizedWebsite);
    setIsLoading(true);

    try {
      const data = await runCompanyQualifier(normalizedWebsite);
      setStageIndex(PROGRESS_STEPS.length - 1);
      setResult(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to qualify this website.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Quick Qualify - LeadScout Portal</title>
      </Helmet>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Target className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Sales Intelligence</span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Quick Qualify</h1>
                  <p className="max-w-2xl text-muted-foreground">
                    Submit a website enquiry and generate a fast company score, research summary, contacts, and sales brief.
                  </p>
                </div>

                <Card className="border-border shadow-sm">
                  <CardContent className="p-5">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={website}
                          onChange={(event) => setWebsite(event.target.value)}
                          placeholder="https://example.com"
                          className="h-12 pl-11"
                          disabled={isLoading}
                          aria-label="Website URL"
                        />
                      </div>
                      <Button type="submit" className="h-12 gap-2" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Qualify
                      </Button>
                    </form>
                    {error && (
                      <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(isLoading || submittedWebsite || result) && (
                  <Card className="border-border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Estimated run progress
                      </CardTitle>
                      <CardDescription>{submittedWebsite || 'Waiting for website submission'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-muted-foreground">{activeProgressMessage}</p>
                          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                            {isLoading && <span>Running for {elapsedSeconds}s</span>}
                            <span>{estimatedProgress}%</span>
                          </div>
                        </div>
                        <Progress
                          value={estimatedProgress}
                          className="h-2.5"
                          aria-label="Estimated run progress"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={estimatedProgress}
                        />
                        {isLoading && elapsedSeconds >= EXPECTED_RUN_SECONDS && (
                          <p className="text-sm text-muted-foreground">
                            Still running. Sales intelligence can take a little longer for complex sites.
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {PROGRESS_STEPS.map((step, index) => {
                          const isComplete = result || index < stageIndex;
                          const isActive = isLoading && index === stageIndex;
                          return (
                            <div
                              key={step}
                              className={cn(
                                'flex items-center gap-3 rounded-lg border p-4',
                                isComplete || isActive ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted/20'
                              )}
                            >
                              <div className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-full',
                                isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              )}>
                                {isActive && !isComplete ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              </div>
                              <span className="font-medium">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {result && (
                  <div className="space-y-6">
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <CardTitle className="text-2xl">{getCompanyName(result)}</CardTitle>
                            <CardDescription className="mt-1">{getIndustry(result)}</CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={cn('capitalize', getDecisionClass(getDecision(result)))}>
                              {getDecision(result)}
                            </Badge>
                            {getFitScore(result) !== null && (
                              <Badge variant="secondary" className="text-sm">
                                Fit score {getFitScore(result)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="flex flex-wrap gap-3">
                          {getWebsite(result) && (
                            <Button asChild variant="outline" size="sm">
                              <a href={getWebsite(result)} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Website
                              </a>
                            </Button>
                          )}
                          {finalBriefUrl && (
                            <Button asChild size="sm">
                              <a href={finalBriefUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Open final brief
                              </a>
                            </Button>
                          )}
                        </div>

                        {rationale.length > 0 && (
                          <div className="space-y-2">
                            <h2 className="text-lg font-semibold">Rationale</h2>
                            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                              {rationale.map((item, index) => (
                                <li key={`${item}-${index}`}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {contacts.length > 0 && (
                      <Card className="border-border shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-primary" />
                            Contacts
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {contacts.map((contact, index) => (
                              <div key={`${contact?.email || contact?.name || 'contact'}-${index}`} className="rounded-lg border border-border bg-muted/20 p-4">
                                <p className="font-semibold">{contact?.name || 'Unknown contact'}</p>
                                <p className="text-sm text-muted-foreground">{contact?.role || contact?.title || 'Role not provided'}</p>
                                {contact?.email && <p className="mt-3 truncate text-sm text-primary">{contact.email}</p>}
                                {contact?.phone && <p className="text-sm text-muted-foreground">{contact.phone}</p>}
                                {contact?.linkedin && (
                                  <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm text-primary hover:underline">
                                    LinkedIn
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {brief && (
                      <Card className="border-border shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg">Generated sales brief</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-4 text-sm leading-6 text-foreground">
                            {brief}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
                      <AccordionItem value="raw-json" className="border-none">
                        <AccordionTrigger>Raw JSON</AccordionTrigger>
                        <AccordionContent>
                          <pre className="max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 text-xs text-muted-foreground">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
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

export default CompanyQualifierPage;
