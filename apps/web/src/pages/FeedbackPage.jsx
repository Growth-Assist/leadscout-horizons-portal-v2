import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { Search, Download, AlertCircle, ExternalLink, MessageSquare as MessageSquareText, ThumbsUp, ThumbsDown, Minus, Calendar, Send, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';
import { getFeedbackRunIdChunks, mergeFeedbackRowsWithNotes } from '@/utils/feedbackNotes.js';
import { buildFeedbackReasonSummary, FEEDBACK_REASON_LABELS } from '@/utils/feedbackReasonAnalytics.js';
import FeedbackMomentumPanel from '@/components/FeedbackMomentumPanel.jsx';

const QUICK_REASON_MAP = Object.fromEntries(
  Object.entries(FEEDBACK_REASON_LABELS).filter(([key]) => key !== 'not_recorded')
);

const REASON_GROUP_STYLES = {
  good: { accent: 'text-green-500', bar: 'bg-green-500', border: 'border-green-500/20', background: 'bg-green-500/5' },
  bad: { accent: 'text-red-500', bar: 'bg-red-500', border: 'border-red-500/20', background: 'bg-red-500/5' }
};

const formatPercentage = (value) => value === null ? '—' : `${value.toFixed(1)}%`;

const getVerdictConfig = (verdict) => {
  switch(verdict) {
    case 'good': return { icon: ThumbsUp, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Good' };
    case 'mixed': return { icon: Minus, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Mixed' };
    case 'bad': return { icon: ThumbsDown, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Bad' };
    default: return { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: verdict || 'Unknown' };
  }
};

const escapeCSV = (str) => {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const FeedbackPage = () => {
  const { client_id } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [outreachFilter, setOutreachFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');

  // Sorting state
  const [sortField, setSortField] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchFeedbackData = async () => {
      if (!client_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: feedbackError } = await supabase.rpc('portal_feedback_rows_for_client', {
          p_client_id: client_id,
          p_sort_field: sortField ?? 'updated_at',
          p_sort_order: sortOrder ?? 'desc'
        });

        if (feedbackError) {
          console.error('Supabase query error in fetchFeedbackData:', {
            message: feedbackError.message,
            code: feedbackError.code,
            details: feedbackError.details,
            hint: feedbackError.hint
          });
          throw feedbackError;
        }

        const feedbackRows = data || [];
        const runIdChunks = getFeedbackRunIdChunks(feedbackRows);
        let noteRows = [];

        if (runIdChunks.length > 0) {
          try {
            for (const runIdChunk of runIdChunks) {
              const { data: notesData, error: notesError } = await supabase
                .from('portal_brief_notes_enriched')
                .select('id, client_id, company_id, run_id, note_text, created_at, created_by_display_name, created_by_email')
                .eq('client_id', client_id)
                .in('run_id', runIdChunk)
                .order('created_at', { ascending: false });

              if (notesError) throw notesError;
              noteRows = [...noteRows, ...(notesData || [])];
            }
          } catch (notesError) {
            console.warn('Failed to fetch feedback note history, falling back to legacy notes:', {
              message: notesError.message,
              code: notesError.code,
              details: notesError.details
            });
          }
        }

        setRawData(mergeFeedbackRowsWithNotes(feedbackRows, noteRows));
      } catch (err) {
        console.error('Failed to fetch feedback data:', err);
        setError('Failed to load feedback data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackData();
  }, [client_id, sortField, sortOrder]);

  const processedData = useMemo(() => {
    // Array.prototype.filter preserves the original sorted order from Supabase
    return rawData.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          (item.company_name?.toLowerCase().includes(q)) ||
          (item.company_id?.toLowerCase().includes(q)) ||
          (item.notes_search_text?.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (verdictFilter !== 'all' && item.brief_verdict !== verdictFilter) return false;
      
      if (outreachFilter !== 'all') {
        if (outreachFilter === 'contacted' && !item.contacted) return false;
        if (outreachFilter === 'not_contacted' && item.contacted) return false;
        if (outreachFilter === 'meeting_booked' && !item.meeting_booked) return false;
      }

      if (reasonFilter !== 'all' && item.quick_reason !== reasonFilter) return false;

      return true;
    });
  }, [rawData, searchQuery, verdictFilter, outreachFilter, reasonFilter]);

  const metrics = useMemo(() => {
    return rawData.reduce((acc, curr) => {
      acc.total++;
      if (curr.brief_verdict === 'good') acc.good++;
      if (curr.brief_verdict === 'mixed') acc.mixed++;
      if (curr.brief_verdict === 'bad') acc.bad++;
      if (curr.contacted) acc.contacted++;
      else acc.notContacted++;
      if (curr.meeting_booked) acc.meetingsBooked++;
      return acc;
    }, { total: 0, good: 0, mixed: 0, bad: 0, contacted: 0, notContacted: 0, meetingsBooked: 0 });
  }, [rawData]);

  const reasonSummary = useMemo(() => buildFeedbackReasonSummary(rawData), [rawData]);

  const handleExportCSV = () => {
    if (processedData.length === 0) return;

    const headers = [
      'company_name', 'company_id', 'run_id', 'brief_verdict', 
      'quick_reason', 'contacted', 'meeting_booked', 'notes', 
      'created_at', 'updated_at'
    ];

    const csvRows = [
      headers.join(','),
      ...processedData.map(row => {
        return headers.map(header => {
          let val = row[header];
          if (header === 'quick_reason') val = QUICK_REASON_MAP[val] || val;
          return escapeCSV(val);
        }).join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `feedback-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSortToggle = () => {
    if (sortField === 'updated_at') {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField('updated_at');
      setSortOrder('desc');
    }
  };

  if (!client_id) {
    return (
      <>
        <Helmet><title>Feedback - LeadScout Portal</title></Helmet>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-8">
              <Card className="border-muted bg-muted/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    No Client Assigned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Your account is not currently assigned to a specific client workspace.</p>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Feedback - LeadScout Portal</title>
        <meta name="description" content="Review collected brief feedback and outreach status" />
      </Helmet>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2 text-foreground" style={{ letterSpacing: '-0.02em' }}>Feedback</h1>
                  <p className="text-muted-foreground">Review collected brief feedback and outreach status</p>
                </div>

                {/* Metrics Grid */}
                {loading && rawData.length === 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Card key={i}><CardContent className="p-4"><Skeleton className="h-8 w-12 mb-2" /><Skeleton className="h-3 w-20" /></CardContent></Card>
                    ))}
                  </div>
                ) : error ? (
                  <Card className="mb-8 border-destructive/30 bg-destructive/5">
                    <CardContent className="pt-6 flex items-center gap-3 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <p>{error}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                    <Card className="bg-card">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{metrics.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total Feedback</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-500">{metrics.good}</div>
                        <p className="text-xs text-muted-foreground mt-1">Good</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-500/5 border-yellow-500/20">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-yellow-500">{metrics.mixed}</div>
                        <p className="text-xs text-muted-foreground mt-1">Mixed</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-500/5 border-red-500/20">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-red-500">{metrics.bad}</div>
                        <p className="text-xs text-muted-foreground mt-1">Bad</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-500/5 border-blue-500/20">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-500">{metrics.contacted}</div>
                        <p className="text-xs text-muted-foreground mt-1">Contacted</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-emerald-500/5 border-emerald-500/20">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-emerald-500">{metrics.meetingsBooked}</div>
                        <p className="text-xs text-muted-foreground mt-1">Meetings</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-muted-foreground">{metrics.notContacted}</div>
                        <p className="text-xs text-muted-foreground mt-1">Not Contacted</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {!error && (
                  <FeedbackMomentumPanel
                    clientId={client_id}
                    onOpenBrief={(companyId) => navigate(`/briefs/${encodeURIComponent(companyId)}`)}
                  />
                )}

                {!error && (
                  <Card className="mb-8 bg-card border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        What&apos;s driving feedback?
                      </CardTitle>
                      <CardDescription>
                        A compact view of the strongest positive drivers and the main improvement areas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading && rawData.length === 0 ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {Array.from({ length: 2 }).map((_, index) => (
                            <Skeleton key={index} className="h-44 w-full" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {reasonSummary.groups.map((group) => {
                            const style = REASON_GROUP_STYLES[group.id];
                            return (
                              <section key={group.id} className={cn('rounded-lg border p-4', style.border, style.background)}>
                                <div className="mb-4 flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className={cn('font-semibold', style.accent)}>{group.title}</h3>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold tabular-nums">{group.total}</p>
                                    <p className="text-[11px] text-muted-foreground">responses</p>
                                  </div>
                                </div>

                                {group.items.length === 0 ? (
                                  <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-border/60 text-sm text-muted-foreground">
                                    No {group.id} feedback yet
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {group.items.map((item) => (
                                      <div key={item.reason}>
                                        <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                                          <span className="leading-tight">{item.label}</span>
                                          <span className="shrink-0 font-medium tabular-nums">
                                            {item.count} <span className="font-normal text-muted-foreground">· {formatPercentage(item.share)}</span>
                                          </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-background/80" aria-hidden="true">
                                          <div
                                            className={cn('h-full rounded-full transition-[width]', style.bar)}
                                            style={{ width: `${item.share ?? 0}%` }}
                                          />
                                        </div>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          {formatPercentage(item.meetingRate)} meeting conversion
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </section>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                        <span>Reason coverage: <strong className="font-medium text-foreground">{formatPercentage(reasonSummary.coverage)}</strong> ({reasonSummary.reasonedCount} of {reasonSummary.total})</span>
                        {reasonSummary.uncategorizedCount > 0 && <span>{reasonSummary.uncategorizedCount} other or legacy reasons excluded</span>}
                        <span>Bars show share within each reason group; meeting conversion is shown beneath.</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Filters & Actions */}
                <Card className="mb-6 bg-card border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full">
                        <div className="relative flex-1 max-w-md">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search company or notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-background"
                          />
                        </div>
                        <Select value={verdictFilter} onValueChange={setVerdictFilter}>
                          <SelectTrigger className="w-full sm:w-[140px] bg-background">
                            <SelectValue placeholder="Verdict" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Verdicts</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                            <SelectItem value="bad">Bad</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={outreachFilter} onValueChange={setOutreachFilter}>
                          <SelectTrigger className="w-full sm:w-[160px] bg-background">
                            <SelectValue placeholder="Outreach" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Outreach</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="not_contacted">Not Contacted</SelectItem>
                            <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={reasonFilter} onValueChange={setReasonFilter}>
                          <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue placeholder="Reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Reasons</SelectItem>
                            {Object.entries(QUICK_REASON_MAP).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleExportCSV}
                        disabled={processedData.length === 0 || loading}
                        className="w-full md:w-auto shrink-0"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Table */}
                <Card className="bg-card border-border/50 shadow-sm relative">
                  {/* Subtle loading overlay for when resorting data */}
                  {loading && rawData.length > 0 && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-foreground">Company</TableHead>
                            <TableHead className="text-foreground">Verdict</TableHead>
                            <TableHead className="text-foreground">Reason</TableHead>
                            <TableHead className="text-foreground">Outreach</TableHead>
                            <TableHead className="text-foreground max-w-[300px]">Notes</TableHead>
                            <TableHead 
                              className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                              onClick={handleSortToggle}
                            >
                              <div className="flex items-center gap-1">
                                Updated
                                {sortField === 'updated_at' ? (
                                  sortOrder === 'desc' ? (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4 text-primary" />
                                  )
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-foreground">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading && rawData.length === 0 ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-3 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                              </TableRow>
                            ))
                          ) : processedData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center">
                                  <MessageSquareText className="h-8 w-8 mb-2 opacity-20" />
                                  <p>No feedback found matching your criteria.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            processedData.map((row) => {
                              const vConfig = getVerdictConfig(row.brief_verdict);
                              const VIcon = vConfig.icon;
                              return (
                                <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                                  <TableCell>
                                    <div className="font-medium text-primary">{row.company_name}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{row.company_id.substring(0, 8)}...</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={cn("gap-1", vConfig.bg, vConfig.color, vConfig.border)}>
                                      <VIcon className="h-3 w-3" />
                                      {vConfig.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {QUICK_REASON_MAP[row.quick_reason] || row.quick_reason || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1.5 items-start">
                                      {row.contacted ? (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1 font-normal">
                                          <Send className="h-3 w-3" /> Contacted
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">Not contacted</span>
                                      )}
                                      {row.meeting_booked && (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 font-normal">
                                          <Calendar className="h-3 w-3" /> Meeting
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="max-w-[300px]">
                                    {row.latest_note ? (
                                      <div className="flex items-center gap-2">
                                        <p className="min-w-0 truncate text-sm text-muted-foreground" title={row.notes}>
                                          {row.latest_note}
                                        </p>
                                        {row.notes_count > 1 && (
                                          <Badge variant="outline" className="shrink-0 border-border/60 bg-muted/30 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                                            {row.notes_count} notes
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">-</p>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                                    {new Date(row.updated_at || row.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                      title="View Brief"
                                      onClick={() => navigate(`/briefs/${row.company_id}`)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      <span className="sr-only">View Brief</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default FeedbackPage;
