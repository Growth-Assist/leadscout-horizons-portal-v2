import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { FileText, ArrowRight, AlertCircle, Clock, ThumbsUp, ThumbsDown, CheckCircle, ListTodo, Target, Eye, Ban, MinusCircle, MessageSquare, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import supabaseDataService, { supabase } from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const OverviewDashboard = () => {
  const navigate = useNavigate();
  const { client_id } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Independent state for Summary
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // Independent state for Briefs
  const [briefsData, setBriefsData] = useState([]);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [briefsError, setBriefsError] = useState(null);

  // Independent state for Feedback
  const [feedbackData, setFeedbackData] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState(null);

  // 1. Fetch Dashboard Summary
  useEffect(() => {
    const fetchSummary = async () => {
      if (!client_id) {
        setSummaryLoading(false);
        return;
      }
      try {
        setSummaryLoading(true);
        setSummaryError(null);
        const { data, error } = await supabaseDataService.fetchDashboardSummary(client_id);
        if (error) throw error;
        setSummaryData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard summary:', err);
        setSummaryError('Failed to load dashboard summary. Please try again later.');
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [client_id]);

  // 2. Fetch Recent Briefs
  useEffect(() => {
    const fetchBriefs = async () => {
      if (!client_id) {
        setBriefsLoading(false);
        return;
      }
      try {
        setBriefsLoading(true);
        setBriefsError(null);
        const { data, error } = await supabaseDataService.fetchRecentFinalizedBriefs(client_id, 5);
        if (error) {
          setBriefsError('Unable to load recent briefs.');
          setBriefsData([]);
        } else {
          setBriefsData(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch recent briefs:', err);
        setBriefsError('Unable to load recent briefs.');
      } finally {
        setBriefsLoading(false);
      }
    };
    fetchBriefs();
  }, [client_id]);

  // 3. Fetch Recent Feedback
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!client_id) {
        setFeedbackLoading(false);
        return;
      }
      try {
        setFeedbackLoading(true);
        setFeedbackError(null);
        const { data, error } = await supabase
          .from('portal_brief_feedback')
          .select('*')
          .eq('client_id', client_id)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setFeedbackData(data || []);
      } catch (err) {
        console.error('Failed to fetch recent feedback:', err);
        setFeedbackError('Unable to load recent feedback.');
      } finally {
        setFeedbackLoading(false);
      }
    };
    fetchFeedback();
  }, [client_id]);

  if (!client_id) {
    return (
      <>
        <Helmet>
          <title>Overview - LeadScout Portal</title>
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

  const getScoreBadge = (score) => {
    if (score >= 70) return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">Target</Badge>;
    if (score >= 50) return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Watch</Badge>;
    return <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30">Reject</Badge>;
  };

  const getVerdictConfig = (verdict) => {
    switch(verdict) {
      case 'good': return { icon: ThumbsUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Good', rotate: '' };
      case 'mixed': return { icon: ThumbsUp, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Mixed', rotate: '-rotate-90' };
      case 'bad': return { icon: ThumbsDown, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Bad', rotate: '' };
      default: return { icon: ThumbsUp, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Unknown', rotate: '' };
    }
  };

  const getReasonLabel = (reason) => {
    const map = {
      good_fit: 'Good fit',
      useful_trigger: 'Useful trigger',
      right_contact: 'Right contact',
      weak_fit: 'Weak fit',
      weak_or_missing_evidence: 'Weak/missing evidence',
      wrong_or_missing_contact: 'Wrong/missing contact',
      other: 'Other'
    };
    return map[reason] || reason || 'No reason provided';
  };

  // -----------------------------------------------------------------
  // Derived Metrics & Percentages
  // -----------------------------------------------------------------
  const scoredCount = summaryData?.scored_companies || 0;
  
  // Progress
  const reviewedCount = summaryData?.reviewed_briefs || 0;
  const toReviewCount = summaryData?.to_review_briefs || 0;
  const totalReviewable = reviewedCount + toReviewCount;
  const reviewProgress = totalReviewable > 0 ? Math.round((reviewedCount / totalReviewable) * 100) : 0;

  // Account Classification
  const targetCount = summaryData?.target_companies || 0;
  const watchCount = summaryData?.watch_companies || 0;
  const disqualifiedCount = summaryData?.disqualified_companies || 0;
  const targetPct = scoredCount > 0 ? Math.round((targetCount / scoredCount) * 100) : 0;
  const watchPct = scoredCount > 0 ? Math.round((watchCount / scoredCount) * 100) : 0;
  const disqualifiedPct = scoredCount > 0 ? Math.round((disqualifiedCount / scoredCount) * 100) : 0;

  // Feedback Quality
  const goodCount = summaryData?.good_briefs || 0;
  const mixedCount = summaryData?.mixed_briefs || 0;
  const badCount = summaryData?.bad_briefs || 0;
  const goodPct = reviewedCount > 0 ? Math.round((goodCount / reviewedCount) * 100) : 0;
  const mixedPct = reviewedCount > 0 ? Math.round((mixedCount / reviewedCount) * 100) : 0;
  const badPct = reviewedCount > 0 ? Math.round((badCount / reviewedCount) * 100) : 0;

  return (
    <>
      <Helmet>
        <title>Overview - LeadScout Portal</title>
        <meta name="description" content="Dashboard overview of your lead intelligence and briefs" />
      </Helmet>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2 text-balance" style={{ letterSpacing: '-0.02em' }}>Overview</h1>
                  <p className="text-muted-foreground">Your lead intelligence dashboard</p>
                </div>

                {/* Main Dashboard Summary Sections */}
                {summaryLoading ? (
                  <>
                    <Card className="mb-6 h-40 border-muted">
                      <CardContent className="h-full flex items-center p-6">
                        <Skeleton className="h-16 w-3/4 max-w-lg" />
                      </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-10 w-16 mb-2" />
                            <Skeleton className="h-3 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : summaryError ? (
                  <Card className="border-destructive/30 bg-destructive/5 mb-8">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Error Loading Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{summaryError}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card className="mb-6 border-primary/20 bg-primary/5 shadow-sm">
                      <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 flex flex-col sm:flex-row items-center text-center sm:text-left sm:justify-between gap-6">
                        <div className="space-y-3">
                          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground tabular-nums">
                            {scoredCount}
                          </h2>
                          <p className="text-xl font-semibold text-primary/90">
                            companies scored
                          </p>
                          <p className="text-muted-foreground max-w-xl text-balance">
                            <strong className="text-foreground font-semibold">{targetCount}</strong> target opportunities identified from <strong className="text-foreground font-semibold">{summaryData?.total_companies || 0}</strong> processed companies.
                          </p>
                        </div>
                        <div className="flex flex-col items-center sm:items-end justify-center border-t sm:border-t-0 sm:border-l border-primary/20 pt-6 sm:pt-0 sm:pl-8">
                          <div className="flex items-center gap-2 text-primary mb-1">
                            <FileText className="h-6 w-6" />
                            <span className="text-3xl font-bold tabular-nums">{summaryData?.companies_with_finalized_brief || 0}</span>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">briefs generated</p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">Generated</CardTitle>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold tabular-nums">{summaryData?.companies_with_finalized_brief || 0}</div>
                          <p className="text-xs text-muted-foreground mt-1">Total briefs created</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold tabular-nums">{reviewedCount}</div>
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={reviewProgress} className="h-2 w-full" />
                            <span className="text-xs font-medium text-muted-foreground tabular-nums w-10 text-right">{reviewProgress}%</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">To review</CardTitle>
                          <ListTodo className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold tabular-nums">{toReviewCount}</div>
                          <p className="text-xs text-muted-foreground mt-1">Requires your feedback</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Action Buttons Section */}
                    <div className="mb-12">
                      <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                        <Button
                          onClick={() => navigate('/briefs')}
                          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                          View Intelligence
                        </Button>
                        <Button
                          onClick={() => navigate('/feedback')}
                          variant="outline"
                          className="flex items-center gap-2 border-border hover:bg-muted transition-all duration-200"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Review Feedback
                        </Button>
                        <Button
                          onClick={() => navigate('/analytics')}
                          variant="outline"
                          className="flex items-center gap-2 border-border hover:bg-muted transition-all duration-200"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Open Analytics
                        </Button>
                      </div>
                    </div>

                    {/* Section 1: Account Classification */}
                    <div className="mb-12">
                      <h3 className="text-lg font-semibold mb-4 text-foreground">Account Classification</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="shadow-sm border-l-4 border-l-emerald-500">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Target</CardTitle>
                            <Target className="h-4 w-4 text-emerald-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline justify-between">
                              <div className="text-3xl font-bold tabular-nums">{targetCount}</div>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{targetPct}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">of scored companies</p>
                          </CardContent>
                        </Card>

                        <Card className="shadow-sm border-l-4 border-l-amber-500">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Watch</CardTitle>
                            <Eye className="h-4 w-4 text-amber-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline justify-between">
                              <div className="text-3xl font-bold tabular-nums">{watchCount}</div>
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">{watchPct}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">of scored companies</p>
                          </CardContent>
                        </Card>

                        <Card className="shadow-sm border-l-4 border-l-rose-500">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Disqualified</CardTitle>
                            <Ban className="h-4 w-4 text-rose-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline justify-between">
                              <div className="text-3xl font-bold tabular-nums">{disqualifiedCount}</div>
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20">{disqualifiedPct}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">of scored companies</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Section 2: Feedback Quality */}
                    <div className="mb-12">
                      <h3 className="text-lg font-semibold mb-4 text-foreground">Feedback Quality</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="shadow-sm border-l-4 border-l-emerald-500">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Good</CardTitle>
                            <ThumbsUp className="h-4 w-4 text-emerald-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline justify-between">
                              <div className="text-3xl font-bold tabular-nums">{goodCount}</div>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{goodPct}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">of reviewed briefs</p>
                          </CardContent>
                        </Card>

                        <Card className="shadow-sm border-l-4 border-l-amber-500">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Mixed</CardTitle>
                            <MinusCircle className="h-4 w-4 text-amber-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline justify-between">
                              <div className="text-3xl font-bold tabular-nums">{mixedCount}</div>
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">{mixedPct}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">of reviewed briefs</p>
                          </CardContent>
                        </Card>

                        <Card className="shadow-sm border-l-4 border-l-rose-500">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Bad</CardTitle>
                            <ThumbsDown className="h-4 w-4 text-rose-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline justify-between">
                              <div className="text-3xl font-bold tabular-nums">{badCount}</div>
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20">{badPct}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">of reviewed briefs</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Recent Briefs Section */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Recent Finalized Briefs</CardTitle>
                      <CardDescription>Latest generated company intelligence reports</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {briefsLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                              <Skeleton className="h-6 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : briefsError ? (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <p className="text-sm text-destructive">{briefsError}</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {briefsData.length > 0 ? briefsData.map((brief) => (
                              <div
                                key={brief.company_id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200 cursor-pointer border border-transparent hover:border-border"
                                onClick={() => navigate(`/briefs/${brief.company_id}`)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{brief.company_name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{brief.industry || 'Unknown Industry'}</p>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                  <div className="text-right">
                                    <p className="text-lg font-bold tabular-nums">{brief.fit_score || 0}</p>
                                  </div>
                                  {getScoreBadge(brief.fit_score || 0)}
                                </div>
                              </div>
                            )) : (
                              <p className="text-sm text-muted-foreground text-center py-4">No finalized briefs found.</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            className="w-full mt-4"
                            onClick={() => navigate('/briefs')}
                          >
                            View all briefs
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Latest Activity Section */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Latest Activity</CardTitle>
                      <CardDescription>System processing and updates</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-6">
                          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                            <Clock className="h-8 w-8 text-primary opacity-80" />
                            <div>
                              <p className="font-medium">Latest Brief Generation</p>
                              <p className="text-sm text-muted-foreground">
                                {summaryData?.latest_final_brief_at 
                                  ? new Date(summaryData.latest_final_brief_at).toLocaleString() 
                                  : briefsData?.length > 0
                                  ? new Date(briefsData[0].final_brief_generated_at || briefsData[0].created_at || Date.now()).toLocaleString()
                                  : 'No activity recorded'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Latest Brief Feedback</h4>
                            {feedbackLoading ? (
                              <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-3">
                                      <Skeleton className="h-8 w-8 rounded-full" />
                                      <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-32" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : feedbackError ? (
                              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">{feedbackError}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {feedbackData.length > 0 ? feedbackData.map((fb) => {
                                  const config = getVerdictConfig(fb.brief_verdict);
                                  const Icon = config.icon;
                                  // Try to find company name from recent briefs, fallback to ID
                                  const companyName = briefsData.find(b => b.company_id === fb.company_id)?.company_name || fb.company_id;

                                  return (
                                    <div 
                                      key={fb.id} 
                                      onClick={() => navigate(`/briefs/${fb.company_id}`)}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted transition-all cursor-pointer border border-transparent hover:border-border"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 rounded-full shrink-0 ${config.bg} ${config.color}`}>
                                          <Icon className={`h-4 w-4 ${config.rotate}`} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-medium text-sm truncate">{companyName}</p>
                                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                            <span className={`font-medium ${config.color}`}>{config.label}</span>
                                            <span>•</span>
                                            <span className="truncate">{getReasonLabel(fb.quick_reason)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground shrink-0 ml-3">
                                        {new Date(fb.updated_at || fb.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </div>
                                    </div>
                                  );
                                }) : (
                                  <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                                    No brief feedback recorded yet.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                       </div>
                    </CardContent>
                  </Card>
                </div>

              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default OverviewDashboard;