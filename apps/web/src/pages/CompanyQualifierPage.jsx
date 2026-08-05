import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Linkedin,
  Loader2,
  Mail,
  Phone,
  Search,
  Sparkles,
  Target,
  Users
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils.js';
import {
  clearActiveQualifierJob,
  getCompanyQualifierStatus,
  loadActiveQualifierJob,
  normalizeWebsiteInput,
  pollCompanyQualifier,
  saveActiveQualifierJob,
  submitCompanyQualifier
} from '@/services/companyQualifierService.js';

const PROGRESS_STEPS = ['Research', 'Scoring', 'Sales Intelligence'];
const MAX_WAITING_PROGRESS = 95;

const PHASE_MESSAGES = {
  submitting: 'Submitting this company for qualification...',
  queued: 'Queued and waiting for processing to start...',
  processing: 'Processing this qualification...',
  research: 'Researching the company website and profile...',
  scoring: 'Calculating ICP fit and qualification rationale...',
  sales_intelligence: 'Creating sales brief, contacts, and outreach context...',
  connection_interrupted: 'Connection interrupted — retrying automatically...',
  delayed: 'This qualification is taking longer than expected.',
  completed: 'Completed.',
  failed: 'Qualification failed.'
};

const getStageIndex = (phase, lastKnownStage) => {
  const stage = phase === 'connection_interrupted' ? lastKnownStage : phase;
  if (stage === 'scoring') return 1;
  if (stage === 'sales_intelligence' || stage === 'completed') return 2;
  return 0;
};

const getEstimatedProgress = ({ phase, lastKnownStage, elapsedSeconds, result }) => {
  if (result) return 100;
  if (phase === 'idle' || phase === 'failed') return 0;
  if (phase === 'delayed') return MAX_WAITING_PROGRESS;

  const activePhase = phase === 'connection_interrupted' ? lastKnownStage : phase;
  const floorByPhase = {
    submitting: 5,
    queued: 10,
    processing: 20,
    research: 25,
    scoring: 55,
    sales_intelligence: 80
  };
  const phaseFloor = floorByPhase[activePhase] || 10;
  const elapsedEstimate = Math.round((elapsedSeconds / 120) * MAX_WAITING_PROGRESS);
  return Math.min(MAX_WAITING_PROGRESS, Math.max(phaseFloor, elapsedEstimate));
};

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

const getCompanyId = (result) => {
  const raw = getRawResult(result);
  return result?.company_id || raw?.company_id || '';
};

const isFinalBriefAvailable = (result) => {
  const raw = getRawResult(result);
  return result?.extended_brief_generated === true || raw?.extended_brief_generated === true;
};

const getSafeExternalUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
};

const parseMarkdownSections = (markdown) => {
  const sections = {};
  const parts = String(markdown || '').split(/^##\s+(.+)$/gm);
  for (let index = 1; index < parts.length; index += 2) {
    const heading = String(parts[index] || '').trim().toLowerCase();
    const content = String(parts[index + 1] || '').trim();
    if (heading && content) sections[heading] = content;
  }
  return sections;
};

const sectionItems = (value) => String(value || '')
  .split(/\n+/)
  .map((item) => item.replace(/^[-*]\s+/, '').trim())
  .filter(Boolean);

const summaryItems = (value) => asArray(value)
  .map((item) => typeof item === 'string' ? item.trim() : '')
  .filter(Boolean);

const normalizePrimaryContact = (contact) => {
  const name = String(contact?.name || '').trim();
  if (!name) return null;

  return {
    name,
    role: String(contact?.role || contact?.title || '').trim(),
    confidence: String(contact?.confidence || '').trim(),
    email: String(contact?.email || '').trim(),
    phone: String(contact?.phone || contact?.telephone || contact?.mobile || '').trim(),
    linkedin: getSafeExternalUrl(
      contact?.linkedin || contact?.linkedin_url || contact?.linkedin_profile
    )
  };
};

const getQuickQualifySummary = (result) => {
  const provided = result?.quick_qualify_summary;
  const briefSections = parseMarkdownSections(getBrief(result));
  const legacyContacts = getContacts(result);
  const whyNow = provided
    ? summaryItems(provided.why_now)
    : sectionItems(briefSections['why now']);
  const legacyNextActions = sectionItems(briefSections['next best action']);

  return {
    companyName: String(provided?.company_name || getCompanyName(result)).trim(),
    website: getSafeExternalUrl(provided?.website || getWebsite(result)),
    industry: String(provided?.industry || getIndustry(result)).trim(),
    fitScore: provided?.fit_score ?? getFitScore(result),
    decision: String(provided?.decision || getDecision(result)).trim(),
    executiveSummary: String(
      provided?.executive_summary || briefSections['sales executive summary'] || ''
    ).trim(),
    whyNow: whyNow.slice(0, 3),
    primaryContact: normalizePrimaryContact(provided ? provided.primary_contact : legacyContacts[0]),
    nextBestAction: String(provided?.next_best_action || legacyNextActions[0] || '').trim(),
    companyId: String(getCompanyId(result)).trim(),
    briefAvailable: isFinalBriefAvailable(result)
  };
};

const CompanyQualifierPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [website, setWebsite] = useState('');
  const [submittedWebsite, setSubmittedWebsite] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [lastKnownStage, setLastKnownStage] = useState('queued');
  const [submissionStartedAt, setSubmissionStartedAt] = useState(null);

  useEffect(() => {
    const storedJob = loadActiveQualifierJob();
    if (!storedJob) return;
    setActiveJob(storedJob);
    setWebsite(storedJob.website);
    setSubmittedWebsite(storedJob.website);
    setSubmissionStartedAt(Date.parse(storedJob.submitted_at));
    setPhase('queued');
  }, []);

  useEffect(() => {
    if (!activeJob) return undefined;

    const controller = new AbortController();
    let mounted = true;

    pollCompanyQualifier(activeJob, {
      signal: controller.signal,
      onStatus: (statusPayload) => {
        if (!mounted) return;
        const nextStage = statusPayload.stage || statusPayload.status;
        setLastKnownStage(nextStage);
        setPhase(nextStage);
        setError('');
      },
      onTransientError: () => {
        if (!mounted) return;
        setPhase('connection_interrupted');
      }
    }).then((outcome) => {
      if (!mounted) return;
      if (outcome.kind === 'completed') {
        clearActiveQualifierJob();
        setActiveJob(null);
        setResult(outcome.result);
        setPhase('completed');
      } else if (outcome.kind === 'delayed') {
        setPhase('delayed');
      }
    }).catch((requestError) => {
      if (!mounted || requestError?.name === 'AbortError') return;
      clearActiveQualifierJob();
      setActiveJob(null);
      setPhase('failed');
      setError(requestError.message || 'Unable to complete this qualification.');
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [activeJob]);

  const hasActiveQualification = phase === 'submitting' || Boolean(activeJob);

  useEffect(() => {
    if (!hasActiveQualification) return undefined;

    const startedAt = activeJob?.submitted_at
      ? Date.parse(activeJob.submitted_at)
      : submissionStartedAt;
    if (!startedAt || Number.isNaN(startedAt)) return undefined;

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    updateElapsed();
    const elapsedTimer = window.setInterval(() => {
      updateElapsed();
    }, 1000);

    return () => window.clearInterval(elapsedTimer);
  }, [activeJob, hasActiveQualification, submissionStartedAt]);

  const summary = useMemo(() => result ? getQuickQualifySummary(result) : null, [result]);
  const stageIndex = getStageIndex(phase, lastKnownStage);
  const estimatedProgress = getEstimatedProgress({ phase, lastKnownStage, elapsedSeconds, result });
  const activeProgressMessage = PHASE_MESSAGES[phase] || PHASE_MESSAGES.processing;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (hasActiveQualification) return;
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
    setSubmissionStartedAt(Date.now());
    setElapsedSeconds(0);
    setPhase('submitting');

    try {
      const outcome = await submitCompanyQualifier(normalizedWebsite);
      if (outcome.kind === 'completed') {
        setResult(outcome.result);
        setPhase('completed');
        return;
      }

      saveActiveQualifierJob(outcome.job);
      setLastKnownStage('queued');
      setActiveJob(outcome.job);
      setPhase('queued');
    } catch (requestError) {
      setPhase('failed');
      setError(requestError.message || 'Unable to qualify this website.');
    }
  };

  const handleCheckStatus = async () => {
    if (!activeJob) return;
    setError('');

    try {
      const statusPayload = await getCompanyQualifierStatus(activeJob);
      if (statusPayload.status === 'completed') {
        if (!statusPayload.result || typeof statusPayload.result !== 'object') {
          throw new Error('Completed qualification did not include a result.');
        }
        clearActiveQualifierJob();
        setActiveJob(null);
        setResult(statusPayload.result);
        setPhase('completed');
      } else if (statusPayload.status === 'failed') {
        clearActiveQualifierJob();
        setActiveJob(null);
        setPhase('failed');
        setError(statusPayload.error || 'The qualification job failed.');
      } else {
        setLastKnownStage(statusPayload.stage || statusPayload.status);
        setPhase('delayed');
      }
    } catch (requestError) {
      if (!requestError?.transient) {
        clearActiveQualifierJob();
        setActiveJob(null);
        setPhase('failed');
      }
      setError(requestError.message || 'Unable to check this qualification.');
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
                          disabled={hasActiveQualification}
                          aria-label="Website URL"
                        />
                      </div>
                      <Button type="submit" className="h-12 gap-2" disabled={hasActiveQualification}>
                        {hasActiveQualification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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

                {(hasActiveQualification || submittedWebsite || result) && (
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
                            {hasActiveQualification && <span>Running for {elapsedSeconds}s</span>}
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
                        {hasActiveQualification && elapsedSeconds >= 60 && phase !== 'delayed' && (
                          <p className="text-sm text-muted-foreground">
                            Still running. Sales intelligence can take a little longer for complex sites.
                          </p>
                        )}
                        {phase === 'delayed' && (
                          <div className="flex flex-col items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                              The job is still saved and can be checked without submitting it again.
                            </p>
                            <Button type="button" variant="outline" size="sm" onClick={handleCheckStatus}>
                              Check status
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {PROGRESS_STEPS.map((step, index) => {
                          const isComplete = result || index < stageIndex;
                          const isActive = hasActiveQualification && phase !== 'delayed' && index === stageIndex;
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
                            <CardTitle className="text-2xl">{summary.companyName}</CardTitle>
                            <CardDescription className="mt-1">{summary.industry}</CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={cn('capitalize', getDecisionClass(summary.decision))}>
                              {summary.decision}
                            </Badge>
                            {summary.fitScore !== null && summary.fitScore !== undefined && (
                              <Badge variant="secondary" className="text-sm">
                                Fit score {summary.fitScore}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {summary.executiveSummary && (
                          <div className="space-y-2">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                              Qualification summary
                            </h2>
                            <p className="leading-relaxed text-foreground">{summary.executiveSummary}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                          {summary.website && (
                            <Button asChild variant="outline" size="sm">
                              <a href={summary.website} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Website
                              </a>
                            </Button>
                          )}
                          {summary.briefAvailable && summary.companyId && (
                            <Button asChild size="sm">
                              <Link to={`/briefs/${encodeURIComponent(summary.companyId)}`}>
                                View full brief
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {summary.whyNow.length > 0 && (
                      <Card className="border-border shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg">Why now</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                            {summary.whyNow.map((item, index) => (
                              <div key={`${item}-${index}`} className="rounded-lg border border-border bg-muted/20 p-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                                  Signal {index + 1}
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {(summary.primaryContact || summary.nextBestAction) && (
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {summary.primaryContact && (
                          <Card className="border-border shadow-sm">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5 text-primary" />
                                Primary contact
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <p className="font-semibold">{summary.primaryContact.name}</p>
                                {summary.primaryContact.role && (
                                  <p className="text-sm text-muted-foreground">{summary.primaryContact.role}</p>
                                )}
                              </div>
                              {summary.primaryContact.confidence && (
                                <Badge variant="outline" className="capitalize">
                                  {summary.primaryContact.confidence} confidence
                                </Badge>
                              )}
                              <div className="space-y-2 text-sm">
                                {summary.primaryContact.email && (
                                  <a className="flex items-center gap-2 text-primary hover:underline" href={`mailto:${summary.primaryContact.email}`}>
                                    <Mail className="h-4 w-4" />
                                    <span className="truncate">{summary.primaryContact.email}</span>
                                  </a>
                                )}
                                {summary.primaryContact.phone && (
                                  <a className="flex items-center gap-2 text-primary hover:underline" href={`tel:${summary.primaryContact.phone}`}>
                                    <Phone className="h-4 w-4" />
                                    {summary.primaryContact.phone}
                                  </a>
                                )}
                                {summary.primaryContact.linkedin && (
                                  <a
                                    className="flex items-center gap-2 text-primary hover:underline"
                                    href={summary.primaryContact.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Linkedin className="h-4 w-4" />
                                    LinkedIn profile
                                  </a>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {summary.nextBestAction && (
                          <Card className="border-border shadow-sm">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <Target className="h-5 w-5 text-primary" />
                                Next best action
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {summary.nextBestAction}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {!summary.briefAvailable && (
                      <Card className="border-dashed border-border bg-muted/10">
                        <CardContent className="p-4 text-sm text-muted-foreground">
                          Detailed research is not available for this qualification yet.
                        </CardContent>
                      </Card>
                    )}
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
