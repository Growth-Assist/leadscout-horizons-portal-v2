
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import BriefDetailDrawer from '@/components/BriefDetailDrawer.jsx';
import { Search, ArrowUpDown, FileText, AlertCircle, ExternalLink, Download, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseDataService, { supabase } from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';

const PUBLIC_BASE_URL = 'https://poc.growth-assist.co.uk';

const normalizeDecision = (rawDecision) => {
  if (!rawDecision) return '';
  const lower = rawDecision.toLowerCase();
  if (lower.includes('target')) return 'Target';
  if (lower.includes('watch')) return 'Watch';
  if (lower.includes('reject') || lower.includes('disqualify')) return 'Reject';
  return rawDecision.charAt(0).toUpperCase() + rawDecision.slice(1);
};

const getDecisionBadge = (decision) => {
  const lower = decision?.toLowerCase() || '';
  if (lower === 'target') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Target</Badge>;
  if (lower === 'watch') return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Watch</Badge>;
  if (lower === 'reject') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Reject</Badge>;
  return <Badge className="bg-muted text-muted-foreground">{decision || 'N/A'}</Badge>;
};

const formatVerdictLabel = (verdict) => {
  if (!verdict) return 'Not reviewed';
  const lower = verdict.toLowerCase();
  if (lower === 'good') return 'Good';
  if (lower === 'mixed') return 'Mixed';
  if (lower === 'bad') return 'Bad';
  return verdict.charAt(0).toUpperCase() + verdict.slice(1);
};

const getVerdictBadge = (verdict) => {
  const lower = verdict?.toLowerCase() || '';
  if (lower === 'good') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Good</Badge>;
  if (lower === 'mixed') return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Mixed</Badge>;
  if (lower === 'bad') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Bad</Badge>;
  return <Badge className="bg-muted text-muted-foreground">Not reviewed</Badge>;
};

const getAssignmentStatusBadge = (status) => {
  const s = status?.toLowerCase();
  if (s === 'assigned') return <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-400/10 dark:text-slate-400">Assigned</Badge>;
  if (s === 'reviewing') return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400">Reviewing</Badge>;
  if (s === 'contacted') return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-400/10 dark:text-orange-400">Contacted</Badge>;
  if (s === 'meeting_booked') return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-400/10 dark:text-green-400">Meeting Booked</Badge>;
  if (s === 'closed') return <Badge variant="outline" className="bg-slate-800/10 text-slate-800 border-slate-800/20 dark:bg-slate-200/10 dark:text-slate-300">Closed</Badge>;
  return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50">Unassigned</Badge>;
};

const escapeCSV = (str) => {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const exportBriefsToCSV = (briefs) => {
  if (!briefs || briefs.length === 0) return;

  const headers = [
    'company_name',
    'company_id',
    'run_id',
    'campaign_id',
    'industry',
    'decision',
    'website',
    'assignee',
    'assignment_status',
    'brief_verdict',
    'quick_reason',
    'contacted',
    'notes',
    'brief_created_at',
    'feedback_created_at',
    'feedback_updated_at'
  ];

  const csvRows = [
    headers.join(','),
    ...briefs.map(row => {
      const assigneeName = row.assignment_display_name || row.assignment_email || 'Unassigned';
      return [
        escapeCSV(row.mappedName),
        escapeCSV(row.company_id),
        escapeCSV(row.finalBriefRunId),
        escapeCSV(row.campaign_id),
        escapeCSV(row.mappedIndustry),
        escapeCSV(row.mappedDecision),
        escapeCSV(row.mappedWebsite),
        escapeCSV(assigneeName),
        escapeCSV(row.assignment_status || ''),
        escapeCSV(formatVerdictLabel(row.feedback_verdict)),
        escapeCSV(row.feedback_quick_reason),
        escapeCSV(row.feedback_contacted),
        escapeCSV(row.feedback_notes),
        escapeCSV(row.final_brief_generated_at),
        escapeCSV(row.feedback_created_at),
        escapeCSV(row.feedback_updated_at)
      ].join(',');
    })
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `briefs-export-${date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const BriefsPage = () => {
  const { client_id, currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Drawer state management synced with URL
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const compId = searchParams.get('company');
    if (compId) {
      setSelectedCompanyId(compId);
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
      const timer = setTimeout(() => setSelectedCompanyId(null), 300); // Wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const onSelectCompany = useCallback((companyId) => {
    setSearchParams(prev => {
      prev.set('company', companyId);
      return prev;
    });
  }, [setSearchParams]);

  const onCloseDrawer = () => {
    setSearchParams(prev => {
      prev.delete('company');
      return prev;
    });
  };

  // Data fetching and UI state
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isManager, setIsManager] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [signalTypeFilter, setSignalTypeFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState([]);
  const [contactedFilter, setContactedFilter] = useState('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');
  
  const userRole = currentUser?.app_metadata?.portal_role;
  const [assignmentFilter, setAssignmentFilter] = useState(
    (userRole === 'manager' || userRole === 'admin') ? 'team_queue' : 'my_briefs'
  );
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [sortField, setSortField] = useState('latest_logged_at');
  const [sortDirection, setSortDirection] = useState('desc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);

  const fetchBriefs = useCallback(async () => {
    if (!client_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // 1. Fetch team members to determine manager status
      let members = [];
      try {
        members = await supabaseDataService.fetchPortalTeamMembers(client_id);
        const isAdmin = currentUser?.app_metadata?.portal_role === 'admin';
        const userMember = members.find(m => m.user_id === currentUser?.id || m.email === currentUser?.email);
        setIsManager(isAdmin || userMember?.team_role === 'manager');
      } catch (memErr) {
        console.warn('Failed to fetch team members:', memErr);
      }

      // 2. Fetch main company details
      const { data: detailData, error: fetchError } = await supabase
        .from('portal_target_company_detail')
        .select('client_id, company_id, latest_run_id, final_brief_run_id, name, website, industry, fit_score, decision, latest_logged_at, campaign_id, signal_id, has_finalized_brief, final_brief_generated_at')
        .eq('client_id', client_id)
        .order('fit_score', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      // 3. Fetch assignments
      let assignmentMap = new Map();
      try {
        const runIds = (detailData || []).map(d => d.final_brief_run_id).filter(Boolean);
        if (runIds.length > 0) {
          // Chunk runIds if too large to avoid query limits
          const chunkSize = 200;
          let allAssignments = [];
          for (let i = 0; i < runIds.length; i += chunkSize) {
            const chunk = runIds.slice(i, i + chunkSize);
            const chunkAssignments = await supabaseDataService.fetchBriefAssignments(client_id, chunk);
            allAssignments = [...allAssignments, ...(chunkAssignments || [])];
          }
          
          allAssignments.forEach(a => {
            assignmentMap.set(`${a.company_id}_${a.run_id}`, a);
          });
        }
      } catch (assignErr) {
        console.warn('Failed to fetch brief assignments:', assignErr);
      }

      // 4. Fetch signals
      let signalsData = [];
      try {
        const { data: sigData, error: sigError } = await supabase
          .from('portal_company_signals')
          .select('client_id, company_id, signal_id, type, summary, date')
          .eq('client_id', client_id);
          
        if (sigError) throw sigError;
        signalsData = sigData || [];
      } catch (sigErr) {
        console.warn('Failed to fetch company signals, continuing without them:', sigErr);
      }

      // 5. Fetch feedback
      let feedbackData = [];
      try {
        const { data: fbData, error: fbError } = await supabase
          .from('portal_brief_feedback')
          .select('client_id, company_id, run_id, brief_verdict, contacted, quick_reason, notes, created_at, updated_at, meeting_booked')
          .eq('client_id', client_id);
          
        if (fbError) throw fbError;
        feedbackData = fbData || [];
      } catch (fbErr) {
        console.warn('Failed to fetch brief feedback, continuing without it:', fbErr);
      }

      const signalTypesByCompanyId = new Map();
      signalsData.forEach(sig => {
        if (sig.company_id && sig.type) {
          if (!signalTypesByCompanyId.has(sig.company_id)) {
            signalTypesByCompanyId.set(sig.company_id, new Set());
          }
          signalTypesByCompanyId.get(sig.company_id).add(sig.type);
        }
      });

      const feedbackMap = new Map();
      feedbackData.forEach(fb => {
        if (fb.company_id && fb.run_id) {
          feedbackMap.set(`${fb.company_id}_${fb.run_id}`, fb);
        }
      });

      // 6. Assemble enriched data
      const enrichedData = (detailData || []).map(c => {
        const fb = feedbackMap.get(`${c.company_id}_${c.final_brief_run_id}`);
        const assignment = assignmentMap.get(`${c.company_id}_${c.final_brief_run_id}`);
        
        return {
          ...c,
          signal_types: Array.from(signalTypesByCompanyId.get(c.company_id) || []),
          feedback_verdict: fb?.brief_verdict || null,
          feedback_contacted: fb?.contacted || false,
          feedback_meeting_booked: fb?.meeting_booked || false,
          feedback_quick_reason: fb?.quick_reason || null,
          feedback_notes: fb?.notes || null,
          feedback_created_at: fb?.created_at || null,
          feedback_updated_at: fb?.updated_at || null,
          
          assignment_assigned_to: assignment?.assigned_to || null,
          assignment_display_name: assignment?.assigned_to_display_name || null,
          assignment_email: assignment?.assigned_to_email || null,
          assignment_is_active: assignment?.assigned_to_is_active ?? true,
          assignment_status: assignment?.status || null,
        };
      });

      setRawData(enrichedData);
    } catch (err) {
      console.error('Failed to fetch briefs:', err);
      setError('Failed to load companies from Supabase. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client_id, currentUser]);

  useEffect(() => {
    fetchBriefs();
  }, [fetchBriefs]);

  const formatLabel = (str) => {
    if (!str) return '';
    return str.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const toggleVerdict = (v) => {
    setVerdictFilter(prev => 
      prev.includes(v) ? prev.filter(item => item !== v) : [...prev, v]
    );
    setCurrentPage(1);
  };

  const summaryCounts = useMemo(() => {
    let generated = 0;
    let myBriefs = 0;
    let unassigned = 0;
    let reviewed = 0;
    let contacted = 0;
    let meetingBooked = 0;

    rawData.forEach(brief => {
      if (brief.has_finalized_brief === true) generated++;
      if (brief.assignment_assigned_to === currentUser?.id) myBriefs++;
      if (brief.has_finalized_brief === true && !brief.assignment_assigned_to) unassigned++;
      if (brief.feedback_verdict !== null && brief.feedback_verdict !== undefined && brief.feedback_verdict !== '') reviewed++;
      if (brief.feedback_contacted === true) contacted++;
      if (brief.feedback_meeting_booked === true) meetingBooked++;
    });

    return { generated, myBriefs, unassigned, reviewed, contacted, meetingBooked };
  }, [rawData, currentUser?.id]);

  const processedData = useMemo(() => {
    let mapped = rawData.map(row => {
      const fb = row.final_brief_json || {};
      const fbCompany = fb.research_appendix?.company || {};

      const rawScoreVal = row.fit_score;
      const parsedScore = rawScoreVal !== null && rawScoreVal !== undefined && rawScoreVal !== '' 
        ? Number(rawScoreVal) 
        : null;

      const snapshotScore = Number.isFinite(parsedScore) ? parsedScore : null;
      const snapshotDecision = row.decision || '';

      return {
        ...row,
        mappedName: row.name || fb.company_name || row.company_id,
        mappedWebsite: row.website,
        mappedIndustry: row.industry || fbCompany.industry || 'Unknown',
        mappedLocation: row.locations || row.postcode || fbCompany.address || 'Unknown',
        mappedScore: snapshotScore,
        mappedDecision: normalizeDecision(snapshotDecision),
        mappedUpdated: row.score_updated_at || row.latest_logged_at || null,
        hasFinalizedBrief: row.has_finalized_brief,
        finalBriefRunId: row.final_brief_run_id
      };
    });

    let filtered = mapped.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (item.mappedName?.toLowerCase().includes(q)) ||
                      (item.mappedWebsite?.toLowerCase().includes(q)) ||
                      (item.mappedIndustry?.toLowerCase().includes(q)) ||
                      (item.company_id?.toLowerCase().includes(q));
        if (!match) return false;
      }
      
      if (industryFilter !== 'all' && item.mappedIndustry !== industryFilter) return false;
      if (campaignFilter !== 'all' && item.campaign_id !== campaignFilter) return false;
      if (signalTypeFilter !== 'all' && !(item.signal_types || []).includes(signalTypeFilter)) return false;

      if (verdictFilter.length > 0) {
        if (!verdictFilter.includes(item.feedback_verdict)) return false;
      }

      if (contactedFilter !== 'all') {
        const isContacted = !!item.feedback_contacted;
        if (contactedFilter === 'yes' && !isContacted) return false;
        if (contactedFilter === 'no' && isContacted) return false;
      }

      if (reviewStatusFilter !== 'all') {
        const isReviewed = item.feedback_verdict !== null && item.feedback_verdict !== undefined && item.feedback_verdict !== '';
        if (reviewStatusFilter === 'reviewed' && !isReviewed) return false;
        if (reviewStatusFilter === 'not_reviewed' && isReviewed) return false;
      }

      // Assignment filtering
      if (assignmentFilter !== 'all') {
        if (assignmentFilter === 'my_briefs') {
          if (item.assignment_assigned_to !== currentUser?.id) return false;
        } else if (assignmentFilter === 'unassigned') {
          if (!item.hasFinalizedBrief || item.assignment_assigned_to) return false;
        } else if (assignmentFilter === 'team_queue') {
          if (!item.assignment_assigned_to) return false;
        }
      }

      // Hide closed briefs by default unless explicitly filtering for them
      if (item.assignment_status === 'closed' && assignmentStatusFilter !== 'closed') {
        return false;
      }

      // Assignment Status filtering
      if (assignmentFilter !== 'unassigned' && assignmentStatusFilter !== 'all') {
        if (item.assignment_status !== assignmentStatusFilter) return false;
      }

      if (fromDate) {
        if (!item.latest_logged_at || !(new Date(item.latest_logged_at) >= new Date(fromDate))) return false;
      }
      
      if (toDate) {
        if (!item.latest_logged_at || !(new Date(item.latest_logged_at) <= new Date(toDate))) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'company_name') { valA = a.mappedName; valB = b.mappedName; }
      if (sortField === 'industry') { valA = a.mappedIndustry; valB = b.mappedIndustry; }
      if (sortField === 'fit_score') { valA = a.mappedScore; valB = b.mappedScore; }
      if (sortField === 'latest_logged_at') { valA = a.mappedUpdated; valB = b.mappedUpdated; }
      if (sortField === 'verdict') { valA = a.feedback_verdict || ''; valB = b.feedback_verdict || ''; }
      if (sortField === 'assignment_assignee') {
        const nameA = a.assignment_display_name || a.assignment_email;
        const nameB = b.assignment_display_name || b.assignment_email;
        valA = nameA ? nameA.toLowerCase() : 'zzz';
        valB = nameB ? nameB.toLowerCase() : 'zzz';
      }
      if (sortField === 'assignment_status') {
        valA = a.assignment_status || 'zzz';
        valB = b.assignment_status || 'zzz';
      }

      if (sortField === 'industry') {
        const isAUnknown = !valA || valA === 'Unknown';
        const isBUnknown = !valB || valB === 'Unknown';
        if (isAUnknown && isBUnknown) return 0;
        if (isAUnknown) return 1;
        if (isBUnknown) return -1;
      } else if (sortField === 'fit_score') {
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;
      } else {
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rawData, searchQuery, industryFilter, campaignFilter, signalTypeFilter, verdictFilter, contactedFilter, reviewStatusFilter, assignmentFilter, assignmentStatusFilter, sortField, sortDirection, fromDate, toDate, currentUser]);

  const industries = [...new Set(rawData.map(b => b.industry || (b.final_brief_json?.research_appendix?.company?.industry) || 'Unknown').filter(i => i && i !== 'Unknown'))].sort();
  const campaigns = [...new Set(rawData.map(b => b.campaign_id).filter(Boolean))].sort();
  const signalTypes = [...new Set(rawData.flatMap(b => b.signal_types).filter(Boolean))].sort();
  const verdicts = [...new Set(rawData.map(b => b.feedback_verdict).filter(Boolean))].sort();

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const paginatedBriefs = processedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Drawer Navigation Logic
  const selectedIndex = selectedCompanyId ? processedData.findIndex(b => b.company_id === selectedCompanyId) : -1;
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < processedData.length - 1;

  const goToPreviousBrief = useCallback(() => {
    if (hasPrevious) {
      onSelectCompany(processedData[selectedIndex - 1].company_id);
    }
  }, [hasPrevious, processedData, selectedIndex, onSelectCompany]);

  const goToNextBrief = useCallback(() => {
    if (hasNext) {
      onSelectCompany(processedData[selectedIndex + 1].company_id);
    }
  }, [hasNext, processedData, selectedIndex, onSelectCompany]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (event, brief) => {
    event.stopPropagation();
    onSelectCompany(brief.company_id);
  };

  if (!client_id) {
    return (
      <>
        <Helmet>
          <title>Companies - LeadScout Portal</title>
        </Helmet>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <title>Companies - LeadScout Portal</title>
        <meta name="description" content="Browse and filter scored companies and intelligence briefs" />
      </Helmet>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2 text-foreground" style={{ letterSpacing: '-0.02em' }}>Lead Intelligence Queue</h1>
                  <p className="text-muted-foreground">Review prioritised briefs, claim ownership, and move prospects through outreach.</p>
                </div>

                <Card className="mb-6 bg-card border-border/50 shadow-sm">
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-sm text-muted-foreground">
                      {isManager 
                        ? "Showing team-wide brief progress for this client workspace" 
                        : "Showing your assigned briefs and available opportunities"}
                    </p>
                  </div>
                  <CardContent className="px-4 pb-4 pt-2 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Generated:</span>
                      <span className="font-semibold text-foreground">{summaryCounts.generated}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Unassigned:</span>
                      <span className="font-semibold text-foreground">{summaryCounts.unassigned}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">My Briefs:</span>
                      <span className="font-semibold text-foreground">{summaryCounts.myBriefs}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Reviewed:</span>
                      <span className="font-semibold text-foreground">{summaryCounts.reviewed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Contacted:</span>
                      <span className="font-semibold text-foreground">{summaryCounts.contacted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Meeting Booked:</span>
                      <span className="font-semibold text-foreground">{summaryCounts.meetingBooked}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-6 bg-card border-border/50 text-card-foreground shadow-sm">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Find The Right Briefs</CardTitle>
                      <CardDescription>Filter by assignment, status, campaign, signal, or company details.</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => exportBriefsToCSV(processedData)}
                      disabled={processedData.length === 0 || loading}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-2 xl:col-span-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, website, industry, or ID..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="pl-10 text-foreground bg-background"
                        />
                      </div>
                      
                      <Select value={assignmentFilter} onValueChange={(v) => { setAssignmentFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Assignment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Assignment: All</SelectItem>
                          <SelectItem value="my_briefs">My Briefs</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {isManager && <SelectItem value="team_queue">Team Queue</SelectItem>}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={assignmentStatusFilter} 
                        onValueChange={(v) => { setAssignmentStatusFilter(v); setCurrentPage(1); }}
                        disabled={assignmentFilter === 'unassigned'}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Assignment Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Status: All</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={industryFilter} onValueChange={(v) => { setIndustryFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All industries</SelectItem>
                          {industries.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={campaignFilter} onValueChange={(v) => { setCampaignFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Campaign ID" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All campaigns</SelectItem>
                          {campaigns.map(camp => (
                            <SelectItem key={camp} value={camp}>{camp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={signalTypeFilter} onValueChange={(v) => { setSignalTypeFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Signal Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All signal types</SelectItem>
                          {signalTypes.map(sig => (
                            <SelectItem key={sig} value={sig}>{formatLabel(sig)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between bg-background font-normal border-input hover:bg-background/90"
                            style={{ 
                              color: verdictFilter.length === 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))"
                            }}
                          >
                            <span className="truncate">
                              {verdictFilter.length === 0 
                                ? "Brief Verdict" 
                                : verdictFilter.length === 1 
                                ? verdictFilter[0] 
                                : `${verdictFilter.length} selected`}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="start">
                          {verdicts.map(v => (
                            <DropdownMenuCheckboxItem
                              key={v}
                              checked={verdictFilter.includes(v)}
                              onCheckedChange={() => toggleVerdict(v)}
                            >
                              {v}
                            </DropdownMenuCheckboxItem>
                          ))}
                          {verdicts.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground text-center">No verdicts found</div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Select value={contactedFilter} onValueChange={(v) => { setContactedFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Contacted" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Contacted: All</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={reviewStatusFilter} onValueChange={(v) => { setReviewStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Review Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Review Status: All</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="not_reviewed">Not reviewed</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex flex-col justify-end sm:col-span-2">
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-background border-input",
                                !dateRange?.from && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange?.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(dateRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Select dates</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange?.from}
                              selected={dateRange}
                              onSelect={(range) => {
                                setDateRange(range);
                                setFromDate(range?.from ? format(range.from, 'yyyy-MM-dd') : '');
                                setToDate(range?.to ? format(range.to, 'yyyy-MM-dd') : '');
                                setCurrentPage(1);
                                if (range?.from && range?.to) {
                                  setIsCalendarOpen(false);
                                }
                              }}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {error && (
                  <Card className="mb-6 border-destructive/30 bg-destructive/5 text-destructive-foreground">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-semibold">Error Loading Companies</p>
                      </div>
                      <p className="text-destructive/80 text-sm">{error}</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-card border-border/50 text-card-foreground shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between bg-muted/10 border-b border-border/50">
                    <div>
                      <CardTitle className="text-base text-foreground">Briefs Ready For Review</CardTitle>
                      <CardDescription>
                        Showing {paginatedBriefs.length} of {processedData.length} target companies
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="cursor-pointer text-foreground" onClick={() => handleSort('company_name')}>
                              <div className="flex items-center gap-2">
                                Company
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-foreground" onClick={() => handleSort('industry')}>
                              <div className="flex items-center gap-2">
                                Industry
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-foreground min-w-[140px]" onClick={() => handleSort('assignment_assignee')}>
                              <div className="flex items-center gap-2">
                                Assignee
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-foreground min-w-[140px]" onClick={() => handleSort('assignment_status')}>
                              <div className="flex items-center gap-2">
                                Status
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-foreground" onClick={() => handleSort('fit_score')}>
                              <div className="flex items-center gap-2">
                                Score
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-foreground">Decision</TableHead>
                            <TableHead className="cursor-pointer text-foreground" onClick={() => handleSort('verdict')}>
                              <div className="flex items-center gap-2">
                                Verdict
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-foreground" onClick={() => handleSort('latest_logged_at')}>
                              <div className="flex items-center gap-2">
                                Updated
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                              </TableRow>
                            ))
                          ) : paginatedBriefs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                                No companies found matching your criteria.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedBriefs.map((brief) => {
                              const assigneeName = brief.assignment_display_name || brief.assignment_email;
                              return (
                                <TableRow
                                  key={brief.company_id}
                                  className={cn(
                                    "cursor-pointer hover:bg-muted/50 transition-colors",
                                    selectedCompanyId === brief.company_id && "bg-muted/30"
                                  )}
                                  onClick={(e) => handleRowClick(e, brief)}
                                >
                                  <TableCell>
                                    <div className="font-medium text-primary max-w-[200px] truncate" title={brief.mappedName}>
                                      {brief.mappedName}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 max-w-[200px] truncate">
                                      {brief.mappedWebsite || brief.company_id.substring(0, 8)}
                                      {brief.mappedWebsite && (
                                        <a 
                                          href={brief.mappedWebsite.startsWith('http') ? brief.mappedWebsite : `https://${brief.mappedWebsite}`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="text-muted-foreground hover:text-primary transition-colors inline-flex shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label={`Visit ${brief.mappedName} website`}
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground truncate max-w-[150px]" title={brief.mappedIndustry}>
                                    {brief.mappedIndustry}
                                  </TableCell>
                                  <TableCell>
                                    {assigneeName ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-medium text-foreground truncate max-w-[140px]" title={assigneeName}>
                                          {assigneeName}
                                        </span>
                                        {brief.assignment_is_active === false && (
                                          <span className="text-[10px] text-muted-foreground">(inactive)</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground italic">Unassigned</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {getAssignmentStatusBadge(brief.assignment_status)}
                                  </TableCell>
                                  <TableCell>
                                    <span className={cn(
                                      "text-lg font-bold tabular-nums",
                                      brief.mappedScore !== null ? "text-foreground" : "text-muted-foreground font-normal text-sm"
                                    )}>
                                      {brief.mappedScore !== null ? brief.mappedScore : 'N/A'}
                                    </span>
                                  </TableCell>
                                  <TableCell>{getDecisionBadge(brief.mappedDecision)}</TableCell>
                                  <TableCell>{getVerdictBadge(brief.feedback_verdict)}</TableCell>
                                  <TableCell className="text-muted-foreground tabular-nums text-sm">
                                    {brief.mappedUpdated ? new Date(brief.mappedUpdated).toLocaleDateString() : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      {Boolean(brief.hasFinalizedBrief && brief.company_id && brief.client_id && brief.finalBriefRunId) && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Open HTML Brief"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const htmlUrl = `${PUBLIC_BASE_URL}/outputs/final-brief/${encodeURIComponent(brief.company_id)}/html?client=${encodeURIComponent(brief.client_id)}&run_id=${encodeURIComponent(brief.finalBriefRunId)}`;
                                              window.open(htmlUrl, '_blank');
                                            }}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                            <span className="sr-only">Open HTML</span>
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Download PDF"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const pdfUrl = `${PUBLIC_BASE_URL}/outputs/final-brief/${encodeURIComponent(brief.company_id)}/pdf-share?client=${encodeURIComponent(brief.client_id)}&run_id=${encodeURIComponent(brief.finalBriefRunId)}`;
                                              window.open(pdfUrl, '_blank');
                                            }}
                                          >
                                            <Download className="h-4 w-4" />
                                            <span className="sr-only">Download PDF</span>
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        title="View Details"
                                        onClick={(e) => handleRowClick(e, brief)}
                                      >
                                        <FileText className="h-4 w-4" />
                                        <span className="sr-only">View Details</span>
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {!loading && totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </main>
          
          <AnimatePresence>
            {isDrawerOpen && selectedCompanyId && (
              <BriefDetailDrawer
                companyId={selectedCompanyId}
                clientId={client_id}
                isOpen={isDrawerOpen}
                onClose={onCloseDrawer}
                onPrevious={goToPreviousBrief}
                onNext={goToNextBrief}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
                currentIndex={selectedIndex >= 0 ? selectedIndex + 1 : 0}
                totalCount={processedData.length}
              />
            )}
          </AnimatePresence>
          
        </div>
      </div>
    </>
  );
};

export default BriefsPage;
