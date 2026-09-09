import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight,
  CalendarClock, MessageSquarePlus, RefreshCw, Users
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import supabaseDataService from '@/services/supabaseDataService.js';
import { cn } from '@/lib/utils.js';
import {
  createMomentumRange, formatMomentumDelta, formatMomentumPercentage, normalizeMomentumResponse
} from '@/utils/feedbackMomentum.js';
import StaleFollowUpsDialog from '@/components/StaleFollowUpsDialog.jsx';

const formatWeek = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
};

const formatActivity = (value) => {
  if (!value) return 'No activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const MomentumTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-lg">
      <p className="font-medium text-foreground">Week of {formatWeek(row.weekStart)}{row.isPartial ? ' · Partial' : ''}</p>
      <p className="mt-1 text-muted-foreground">{row.accountsUpdated} accounts updated</p>
      <p className="text-muted-foreground">{row.noteEvents} note events</p>
    </div>
  );
};

const Metric = ({ label, value, context, icon: Icon, accent, onClick }) => {
  const content = (
    <div className="flex h-full items-start justify-between gap-3 text-left">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-1 text-2xl font-bold tabular-nums', accent)}>{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{context}</p>
      </div>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-lg border border-border/60 bg-muted/10 p-4 transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </button>
  ) : <div className="rounded-lg border border-border/60 bg-muted/10 p-4">{content}</div>;
};

const FeedbackMomentumPanel = ({ clientId, onOpenBrief }) => {
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedContributor, setSelectedContributor] = useState('all');
  const [data, setData] = useState(null);
  const [availableContributors, setAvailableContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staleOpen, setStaleOpen] = useState(false);
  const requestSequence = useRef(0);

  const loadMomentum = useCallback(async () => {
    if (!clientId) return;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const requestedRange = createMomentumRange(periodDays);
      const payload = await supabaseDataService.fetchFeedbackNoteMomentum(
        clientId,
        requestedRange.dateFrom,
        requestedRange.dateTo,
        selectedContributor === 'all' ? null : selectedContributor
      );
      const normalized = normalizeMomentumResponse(payload);
      if (requestSequence.current !== requestId) return;
      setData(normalized);
      if (selectedContributor === 'all') setAvailableContributors(normalized.contributors);
    } catch (loadError) {
      if (requestSequence.current !== requestId) return;
      console.error('Failed to load feedback momentum:', loadError);
      setError('Sales follow-up momentum could not be loaded.');
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }, [clientId, periodDays, selectedContributor]);

  useEffect(() => {
    requestSequence.current += 1;
    setData(null);
    setSelectedContributor('all');
    setAvailableContributors([]);
    setStaleOpen(false);
  }, [clientId]);

  useEffect(() => { loadMomentum(); }, [loadMomentum]);

  useEffect(() => {
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') loadMomentum(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => document.removeEventListener('visibilitychange', refreshOnFocus);
  }, [loadMomentum]);

  const momentum = formatMomentumDelta(data?.totals.momentumPct);
  const MomentumIcon = momentum.direction === 'up'
    ? ArrowUpRight
    : momentum.direction === 'down'
      ? ArrowDownRight
      : ArrowRight;
  const contributorRows = useMemo(() => (data?.contributors || []).slice(0, 5), [data?.contributors]);
  const selectedName = availableContributors.find((row) => row.userId === selectedContributor)?.displayName;
  const coverageContext = data?.totals.followUpCoveragePct === null
    ? data?.totals.coverageUnavailableReason || 'Unavailable for contributor view'
    : `${data?.totals.coverageCoveredAccounts || 0} of ${data?.totals.coverageEligibleAccounts || 0} contacted open accounts`;
  const staleAvailable = selectedContributor === 'all' && Number(data?.totals.staleFollowUps || 0) > 0;

  return (
    <>
      <Card className="mb-8 border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl"><Activity className="h-5 w-5 text-primary" />Sales follow-up momentum</CardTitle>
              <CardDescription className="mt-1">Distinct accounts updated with notes, paired with follow-up and progression context.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={String(periodDays)} onValueChange={(value) => setPeriodDays(Number(value))}>
                <SelectTrigger className="w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedContributor} onValueChange={setSelectedContributor}>
                <SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="All contributors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All contributors</SelectItem>
                  {availableContributors.filter((row) => row.userId).map((row) => (
                    <SelectItem key={row.userId} value={row.userId}>{row.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadMomentum} disabled={loading} title="Refresh momentum">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                <span className="sr-only">Refresh momentum</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div><Skeleton className="h-56" /></div>
          ) : error && !data ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
              <AlertCircle className="mb-2 h-5 w-5 text-destructive" /><p className="text-sm text-destructive">{error}</p><Button className="mt-3" variant="outline" size="sm" onClick={loadMomentum}>Try again</Button>
            </div>
          ) : data ? (
            <div className={cn('space-y-5', loading && 'opacity-60')}>
              {selectedName && <p className="text-xs text-muted-foreground">Contributor view: <span className="font-medium text-foreground">{selectedName}</span>. Coverage and stale follow-ups remain account-level and are unavailable here.</p>}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Accounts updated" value={data.totals.accountsUpdated} context={`${data.totals.noteEvents} note events`} icon={MessageSquarePlus} />
                <Metric label="Follow-up coverage" value={formatMomentumPercentage(data.totals.followUpCoveragePct)} context={coverageContext} icon={Users} />
                <Metric label="Momentum" value={momentum.value} context={data.totals.momentumPct === null ? 'No prior-period baseline' : `versus previous ${periodDays} days`} icon={MomentumIcon} accent={momentum.direction === 'up' ? 'text-emerald-500' : momentum.direction === 'down' ? 'text-amber-500' : ''} />
                <Metric label="Stale follow-ups" value={data.totals.staleFollowUps ?? '—'} context={data.totals.staleFollowUps === null ? 'Unavailable for contributor view' : 'Contacted open accounts · View accounts'} icon={CalendarClock} onClick={staleAvailable ? () => setStaleOpen(true) : undefined} />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Weekly accounts updated</h3><p className="text-xs text-muted-foreground">Eight Monday-based UTC buckets</p></div>{data.weekly.some((row) => row.isPartial) && <span className="text-[11px] text-muted-foreground">Latest week is partial</span>}</div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.weekly} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                        <defs><linearGradient id="feedbackMomentumFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="weekStart" tickFormatter={formatWeek} fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                        <RechartsTooltip content={<MomentumTooltip />} />
                        <Area type="monotone" dataKey="accountsUpdated" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#feedbackMomentumFill)" dot={(props) => <circle key={`${props.cx}-${props.cy}`} cx={props.cx} cy={props.cy} r={props.payload.isPartial ? 4 : 3} fill={props.payload.isPartial ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'} />} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border/60">
                  <div className="border-b border-border/60 p-4"><h3 className="text-sm font-semibold">Contributor activity</h3><p className="text-xs text-muted-foreground">Account updates with outcome context</p></div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Contributor</TableHead><TableHead className="text-right">Accounts</TableHead><TableHead className="text-right">Notes</TableHead><TableHead className="text-right">Meetings</TableHead><TableHead className="text-right">Last activity</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {contributorRows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No attributed note activity in this period.</TableCell></TableRow> : contributorRows.map((row) => (
                          <TableRow key={row.userId || row.email}>
                            <TableCell><p className="font-medium">{row.displayName}</p>{row.email && row.email !== row.displayName && <p className="text-[11px] text-muted-foreground">{row.email}</p>}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.accountsUpdated}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.noteEvents}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.meetingProgressions}</TableCell>
                            <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">{formatActivity(row.lastActivityAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                <span>{data.totals.meetingProgressions} distinct accounts progressed to a meeting after qualifying note activity.</span>
                <span>Contributor rows may overlap and need not sum to the headline total.</span>
                {data.unattributed.noteEvents > 0 && <span>{data.unattributed.accountsUpdated} accounts and {data.unattributed.noteEvents} notes are unattributed.</span>}
                {data.excludedHistorical.noteEvents > 0 && <span>{data.excludedHistorical.noteEvents} historical-run notes excluded.</span>}
              </div>
              {error && <p className="text-xs text-destructive">Refresh failed; the previous result remains displayed.</p>}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <StaleFollowUpsDialog
        open={staleOpen}
        onOpenChange={setStaleOpen}
        clientId={clientId}
        dateFrom={data?.period.dateFrom}
        dateTo={data?.period.dateTo}
        periodDays={data?.period.days || periodDays}
        onOpenBrief={(companyId) => { setStaleOpen(false); onOpenBrief(companyId); }}
      />
    </>
  );
};

export default FeedbackMomentumPanel;
