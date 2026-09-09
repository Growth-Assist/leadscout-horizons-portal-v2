import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowRight, BadgePoundSterling, BarChart3, CheckCircle2,
  Database, FileText, FilterX, Lightbulb, RefreshCw, Send, Target,
  TrendingUp, Trophy, Users
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip,
  XAxis, YAxis
} from 'recharts';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';
import supabaseDataService from '@/services/supabaseDataService.js';
import {
  buildManagementInsights, buildManagementMetrics, formatGbp, formatRate, safeRate
} from '@/utils/managementAnalytics.js';

const EmptyState = ({ icon: Icon, title, description, compact = false }) => (
  <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center', compact ? 'min-h-40' : 'min-h-64')}>
    <div className="mb-3 rounded-full bg-muted p-3"><Icon className="h-6 w-6 text-muted-foreground" /></div>
    <h3 className="font-medium text-foreground">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
  </div>
);

const MetricCard = ({ title, value, context, icon: Icon, accent, loading }) => (
  <Card className="border-border/60">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? <Skeleton className="mt-3 h-9 w-20" /> : <p className={cn('mt-2 text-3xl font-bold tabular-nums', accent)}>{value}</p>}
        </div>
        <div className="rounded-lg bg-muted/60 p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{context}</p>
    </CardContent>
  </Card>
);

const AnalyticsPage = () => {
  const { client_id } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [commercial, setCommercial] = useState({ feedback: [], averageDealSize: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ campaign: 'all', signalType: 'all', verdict: 'all' });

  const fetchDashboard = useCallback(async () => {
    if (!client_id) return;
    setLoading(true);
    setError(null);
    try {
      const campaign = filters.campaign === 'all' ? null : filters.campaign;
      const signalType = filters.signalType === 'all' ? null : filters.signalType;
      const verdict = filters.verdict === 'all' ? null : filters.verdict;
      const [analytics, commercialData, summaryResult] = await Promise.all([
        supabaseDataService.fetchPortalTargetAnalyticsSnapshot(client_id, campaign, signalType, verdict),
        supabaseDataService.fetchManagementCommercialData(client_id, verdict, campaign, signalType),
        campaign || signalType || verdict ? Promise.resolve({ data: null }) : supabaseDataService.fetchDashboardSummary(client_id)
      ]);
      setSnapshot({
        ...(analytics || {}),
        ...(summaryResult.data?.total_companies == null ? {} : { total_companies_entered: summaryResult.data.total_companies })
      });
      setCommercial(commercialData);
    } catch (fetchError) {
      console.error('Error fetching management analytics:', fetchError);
      setError('The management dashboard could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [client_id, filters.campaign, filters.signalType, filters.verdict]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const metrics = useMemo(
    () => buildManagementMetrics(snapshot || {}, commercial.feedback, commercial.averageDealSize),
    [snapshot, commercial.feedback, commercial.averageDealSize]
  );
  const insights = useMemo(() => buildManagementInsights(metrics, snapshot || {}), [metrics, snapshot]);
  const hasFilters = Object.values(filters).some((value) => value !== 'all');
  const verdicts = useMemo(() => {
    const source = Array.isArray(snapshot?.verdict_breakdown) ? snapshot.verdict_breakdown : [];
    const total = source.reduce((sum, row) => sum + Number(row.value || 0), 0);
    return source.map((row) => ({ ...row, rate: safeRate(Number(row.value || 0), total) }));
  }, [snapshot?.verdict_breakdown]);
  const campaignData = Array.isArray(snapshot?.campaign_breakdown) ? snapshot.campaign_breakdown : [];

  if (!client_id) {
    return <div className="flex h-screen bg-background"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /><div className="flex flex-1 flex-col"><Header onMenuClick={() => setIsSidebarOpen(true)} /><main className="flex flex-1 items-center justify-center p-8"><EmptyState icon={AlertCircle} title="No client assigned" description="Your account is not assigned to a client workspace." /></main></div></div>;
  }

  return (
    <>
      <Helmet><title>Management Analytics - Portal</title><meta name="description" content="Management view of volume, action, engagement, commercial value and learning." /></Helmet>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div><p className="mb-2 text-sm font-medium text-primary">All-time management view</p><h1 className="text-3xl font-bold tracking-tight">Management Analytics</h1><p className="mt-2 max-w-3xl text-muted-foreground">See how target volume becomes action, engagement and commercial value—and where evidence suggests a change.</p></div>
                <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh</Button>
              </div>

              {error && <Card className="border-destructive/50 bg-destructive/10"><CardContent className="flex items-center gap-3 p-4 text-sm text-destructive"><AlertCircle className="h-5 w-5" />{error}<Button size="sm" variant="outline" className="ml-auto" onClick={fetchDashboard}>Try again</Button></CardContent></Card>}

              <Card className="border-border/60"><CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center"><div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><FilterX className="h-4 w-4" />Filters</div><div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                <Select value={filters.campaign} onValueChange={(value) => setFilters((current) => ({ ...current, campaign: value }))}><SelectTrigger><SelectValue placeholder="Campaign" /></SelectTrigger><SelectContent><SelectItem value="all">All campaigns</SelectItem>{campaignData.map((row) => <SelectItem key={row.id} value={row.id}>{row.id}</SelectItem>)}</SelectContent></Select>
                <Select value={filters.signalType} onValueChange={(value) => setFilters((current) => ({ ...current, signalType: value }))}><SelectTrigger><SelectValue placeholder="Signal type" /></SelectTrigger><SelectContent><SelectItem value="all">All signal types</SelectItem>{(snapshot?.signal_type_options || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
                <Select value={filters.verdict} onValueChange={(value) => setFilters((current) => ({ ...current, verdict: value }))}><SelectTrigger><SelectValue placeholder="Verdict" /></SelectTrigger><SelectContent><SelectItem value="all">All verdicts</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="mixed">Mixed</SelectItem><SelectItem value="bad">Bad</SelectItem><SelectItem value="not_reviewed">Pending review</SelectItem></SelectContent></Select>
              </div>{hasFilters && <Button variant="ghost" size="sm" onClick={() => setFilters({ campaign: 'all', signalType: 'all', verdict: 'all' })}>Reset</Button>}</CardContent></Card>

              <section aria-labelledby="executive-heading"><div className="mb-3"><h2 id="executive-heading" className="text-lg font-semibold">Executive outcomes</h2><p className="text-sm text-muted-foreground">Each volume is paired with the conversion that gives it meaning.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard title="Volume entered" value={metrics.entered} context={metrics.qualificationRate === null ? `${formatRate(metrics.briefProgressionRate)} of targets progressed to a brief` : `${formatRate(metrics.qualificationRate)} qualified as targets`} icon={Database} loading={loading} />
                <MetricCard title="Briefs generated" value={metrics.briefs} context={`${formatRate(metrics.reviewCoverage)} reviewed`} icon={FileText} accent="text-primary" loading={loading} />
                <MetricCard title="Accounts contacted" value={metrics.contacted} context={`${formatRate(metrics.contactRate)} of briefs actioned`} icon={Send} loading={loading} />
                <MetricCard title="Meetings booked" value={metrics.meetings} context={`${formatRate(metrics.meetingRate)} of contacted accounts`} icon={Users} accent="text-emerald-500" loading={loading} />
                <MetricCard title="Deals won" value={metrics.won} context={`${formatRate(metrics.winRate)} of meetings`} icon={Trophy} accent="text-amber-500" loading={loading} />
              </div></section>

              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-primary" />Management funnel</CardTitle><CardDescription>Previous-stage conversion shows leakage; overall conversion shows progress from the target base.</CardDescription></CardHeader><CardContent>{loading ? <Skeleton className="h-40 w-full" /> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 xl:grid-cols-7">{metrics.stages.map((stage, index) => <div key={stage.id} className="relative rounded-lg border border-border/60 bg-muted/10 p-4"><p className="text-xs font-medium text-muted-foreground">{stage.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{stage.count}</p><p className="mt-2 text-xs text-muted-foreground">{index === 0 ? 'Base population' : `${formatRate(stage.previousRate)} from prior`}</p>{index > 0 && <p className="text-xs text-muted-foreground">{formatRate(stage.overallRate)} overall</p>}{index < metrics.stages.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground xl:block" />}</div>)}</div>}</CardContent></Card>

              <section aria-labelledby="commercial-heading"><div className="mb-3"><h2 id="commercial-heading" className="text-lg font-semibold">Commercial value progression</h2><p className="text-sm text-muted-foreground">These are nested maturity views, not additive totals.</p></div>
                {commercial.averageDealSize === null ? <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="flex gap-3 p-5"><AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" /><div><p className="font-medium">Commercial configuration required</p><p className="text-sm text-muted-foreground">Set this client’s average deal size in its active client context to calculate contacted potential and meeting pipeline.</p></div></CardContent></Card> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {[{ label: 'Contacted potential', value: metrics.contactedPotential, desc: `${metrics.contacted} contacted × ${formatGbp(metrics.averageDealSize)}. Indicative upper ceiling.`, icon: Target }, { label: 'Meeting pipeline', value: metrics.meetingPipeline, desc: `${metrics.meetings} meetings × ${formatGbp(metrics.averageDealSize)}. Estimated, not recognised revenue.`, icon: BadgePoundSterling }, { label: 'Closed-won value', value: metrics.closedWonValue, desc: 'Actual values where recorded; client average used when blank.', icon: Trophy }].map((item, index) => <Card key={item.label} className={cn('border-border/60', index === 2 && 'border-emerald-500/30')}><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{item.label}</p><item.icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-3xl font-bold tabular-nums">{formatGbp(item.value) || '—'}</p><p className="mt-2 text-xs text-muted-foreground">{item.desc}</p></CardContent></Card>)}</div>}
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card><CardHeader><CardTitle className="text-base">Quality and engagement</CardTitle><CardDescription>Review coverage and outcomes, shown as rates rather than isolated activity.</CardDescription></CardHeader><CardContent className="space-y-4">{loading ? <Skeleton className="h-60 w-full" /> : <><div className="grid grid-cols-3 gap-3"><div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Review coverage</p><p className="mt-1 text-xl font-bold">{formatRate(metrics.reviewCoverage)}</p></div><div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Good rate</p><p className="mt-1 text-xl font-bold">{formatRate(metrics.goodRate)}</p></div><div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Meeting rate</p><p className="mt-1 text-xl font-bold">{formatRate(metrics.meetingRate)}</p></div></div><div className="space-y-3">{verdicts.map((row) => <div key={row.name}><div className="mb-1 flex justify-between text-sm"><span className="capitalize">{String(row.name).replace('_', ' ')}</span><span className="tabular-nums text-muted-foreground">{row.value} · {formatRate(row.rate)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', row.name === 'good' ? 'bg-emerald-500' : row.name === 'bad' ? 'bg-red-500' : row.name === 'mixed' ? 'bg-amber-500' : 'bg-slate-400')} style={{ width: `${row.rate || 0}%` }} /></div></div>)}</div></>}</CardContent></Card>

                <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-5 w-5 text-amber-500" />What we are learning and changing</CardTitle><CardDescription>Deterministic observations appear only when the evidence threshold is met.</CardDescription></CardHeader><CardContent>{loading ? <Skeleton className="h-60 w-full" /> : insights.length === 0 ? <EmptyState compact icon={Lightbulb} title="Not enough evidence yet" description="At least five relevant observations are required before the dashboard recommends a change." /> : <div className="space-y-3">{insights.map((insight) => <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={insight.title} className="rounded-lg border border-border/60 p-4"><div className="flex items-start gap-3"><CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', insight.tone === 'attention' ? 'text-amber-500' : 'text-emerald-500')} /><div><p className="font-medium">{insight.title}</p><p className="mt-1 text-sm text-muted-foreground">{insight.evidence}</p><p className="mt-2 text-sm"><span className="font-medium">Change:</span> {insight.action}</p></div></div></motion.div>)}</div>}</CardContent></Card>
              </div>

              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />Campaign performance</CardTitle><CardDescription>Compare scale with quality and downstream outcomes. Select a campaign to filter the dashboard.</CardDescription></CardHeader><CardContent>{loading ? <Skeleton className="h-72 w-full" /> : campaignData.length === 0 ? <EmptyState icon={BarChart3} title="No campaign data" description="Campaign comparisons appear when targets are assigned to campaigns." /> : <><div className="mb-6 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={campaignData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="id" fontSize={11} tickLine={false} axisLine={false} /><YAxis fontSize={11} tickLine={false} axisLine={false} /><RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><Legend /><Bar name="Targets" dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} /><Bar name="Briefs" dataKey="generated" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead className="text-right">Targets</TableHead><TableHead className="text-right">Brief rate</TableHead><TableHead className="text-right">Good rate</TableHead><TableHead className="text-right">Meeting rate</TableHead><TableHead className="text-right">Won value</TableHead></TableRow></TableHeader><TableBody>{campaignData.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={() => setFilters((current) => ({ ...current, campaign: current.campaign === row.id ? 'all' : row.id }))}><TableCell className="font-medium text-primary">{row.id}</TableCell><TableCell className="text-right">{row.count}</TableCell><TableCell className="text-right">{formatRate(safeRate(row.generated, row.count))}</TableCell><TableCell className="text-right">{formatRate(row.good_rate)}</TableCell><TableCell className="text-right">{formatRate(row.meeting_rate)}</TableCell><TableCell className="text-right">{formatGbp(row.closed_won_value_gbp) || '—'}</TableCell></TableRow>)}</TableBody></Table></div></>}</CardContent></Card>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AnalyticsPage;
