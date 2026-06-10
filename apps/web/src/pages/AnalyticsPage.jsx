import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import BriefFeedbackFunnel from '@/components/BriefFeedbackFunnel.jsx';
import { 
  AlertCircle, Users, FileText, BarChart3, MessageSquare, 
  CheckCircle2, RefreshCw, Mail, Phone, Linkedin, 
  MousePointerClick, FilterX, TrendingUp, Database, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseDataService from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { cn } from '@/lib/utils.js';

// Helper for scoring classification in the table
const normalizeDecision = (decision) => {
  if (!decision) return 'unscored';
  const lower = decision.toLowerCase();
  if (['target', 'target_account', 'high_fit'].some(d => lower.includes(d))) return 'target';
  if (['watch', 'medium_fit'].some(d => lower.includes(d))) return 'watch';
  if (['reject', 'disqualify', 'low_fit', 'no_fit', 'rejected'].some(d => lower.includes(d))) return 'reject';
  return 'unscored';
};

// Reusable Empty State Component
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] bg-muted/20 rounded-xl border border-dashed border-border">
    <div className="bg-muted p-4 rounded-full mb-4 shadow-sm">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-[400px]">{description}</p>
  </div>
);

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { client_id } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // RPC Snapshot State
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dynamic Filters (Target Account Analytics specific)
  const [filters, setFilters] = useState({
    campaign: 'all',
    signalType: 'all',
    verdict: 'all'
  });

  // Fetch RPC Snapshot
  const fetchSnapshot = useCallback(async () => {
    if (!client_id) return;
    setLoading(true);
    setError(null);
    try {
      const campaign = filters.campaign === 'all' ? null : filters.campaign;
      const signalType = filters.signalType === 'all' ? null : filters.signalType;
      const verdict = filters.verdict === 'all' ? null : filters.verdict;
      
      const data = await supabaseDataService.fetchPortalTargetAnalyticsSnapshot(
        client_id, campaign, signalType, verdict
      );
      
      if (data) {
        setAnalyticsSnapshot(data);
      } else {
        // Fallback empty state if RPC returns null
        setAnalyticsSnapshot({
          total_target_companies: 0,
          generated_briefs: 0,
          contact_companies: 0,
          total_contacts: 0,
          named_contacts: 0,
          contacts_with_email: 0,
          contacts_with_phone: 0,
          contacts_with_linkedin: 0,
          avg_contacts_per_company: 0,
          feedback_received: 0,
          score_distribution: [],
          verdict_breakdown: [],
          campaign_breakdown: [],
          top_companies: [],
          signal_type_options: [],
          campaign_options: [],
          funnel_summary: []
        });
      }
    } catch (err) {
      console.error('Error fetching snapshot:', err);
      setError('Failed to load target account analytics.');
    } finally {
      setLoading(false);
    }
  }, [client_id, filters.campaign, filters.signalType, filters.verdict]);

  // RPC load on mount and filter changes
  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // Interaction Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ campaign: 'all', signalType: 'all', verdict: 'all' });
  };

  const handleRefresh = () => {
    fetchSnapshot();
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

  const handleRowNavigate = (companyId) => {
    if (companyId) navigate(`/briefs/${companyId}`);
  };

  // Map colors for verdict breakdown if not provided by RPC
  const getVerdictColor = (name) => {
    if (name === 'good') return 'hsl(var(--chart-2))';
    if (name === 'mixed') return 'hsl(var(--chart-3))';
    if (name === 'bad') return 'hsl(var(--destructive))';
    return '#6B7280'; // not_reviewed or other
  };

  const verdictData = useMemo(() => {
    if (!analyticsSnapshot?.verdict_breakdown) return [];
    return analyticsSnapshot.verdict_breakdown.map(v => ({
      ...v,
      color: v.color || getVerdictColor(v.name)
    }));
  }, [analyticsSnapshot?.verdict_breakdown]);

  if (!client_id) {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 flex items-center justify-center p-8">
            <EmptyState 
              icon={AlertCircle} 
              title="No Client Assigned" 
              description="Your account is not currently assigned to a specific client workspace." 
            />
          </main>
        </div>
      </div>
    );
  }

  const KpiCard = ({ title, value, desc, icon: Icon, valueColor = "text-foreground", isLoading }) => (
    <Card className="relative overflow-hidden bg-card hover:bg-card/80 transition-colors border-border/50 text-card-foreground">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 bg-muted/50 rounded-lg">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <motion.h3 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn("text-3xl font-bold tabular-nums tracking-tight", valueColor)}
            >
              {value}
            </motion.h3>
          )}
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );

  const MetricPill = ({ icon: Icon, label, value, isLoading }) => (
    <div className="flex items-center gap-3 bg-muted/30 border border-border/50 rounded-lg px-4 py-3 flex-1 min-w-[140px] text-foreground">
      <div className="bg-primary/10 p-2 rounded-md">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        {isLoading ? (
          <Skeleton className="h-6 w-12 mt-1" />
        ) : (
          <div className="font-bold text-lg tabular-nums leading-tight">{value}</div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Target Account Analytics - Portal</title>
        <meta name="description" content="Track scoring trends and performance for target accounts." />
      </Helmet>
      
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
              
              {/* Header Section */}
              <div className="flex flex-col md:flex-row justify-between gap-4 md:items-end">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Target Account Analytics</h1>
                  <p className="text-muted-foreground max-w-2xl">
                    Track scoring trends, brief generation volume, feedback trends, contact coverage, and campaign performance for your target accounts.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="bg-transparent hover:bg-muted text-foreground">
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Error State */}
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-destructive/50 bg-destructive/10 text-destructive-foreground shadow-none">
                    <CardContent className="p-4 flex items-start gap-4">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-destructive mb-1">Failed to load analytics</h4>
                        <p className="text-sm text-destructive/80 mb-3">{error}</p>
                        <Button size="sm" variant="outline" className="bg-transparent border-destructive text-destructive hover:bg-destructive/20" onClick={fetchSnapshot}>Try Again</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Filters */}
              <Card className="bg-card text-card-foreground border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
                      <FilterX className="h-4 w-4" />
                      Filters
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                      <Select value={filters.campaign} onValueChange={(v) => handleFilterChange('campaign', v)}>
                        <SelectTrigger className="h-9 bg-transparent">
                          <SelectValue placeholder="Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Campaigns</SelectItem>
                          {(analyticsSnapshot?.campaign_breakdown?.map(c => c.id).filter(Boolean) || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={filters.signalType} onValueChange={(v) => handleFilterChange('signalType', v)}>
                        <SelectTrigger className="h-9 bg-transparent">
                          <SelectValue placeholder="Signal Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Signal Types</SelectItem>
                          {(analyticsSnapshot?.signal_type_options || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={filters.verdict} onValueChange={(v) => handleFilterChange('verdict', v)}>
                        <SelectTrigger className="h-9 bg-transparent">
                          <SelectValue placeholder="Filter Verdict" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Verdicts</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                          <SelectItem value="bad">Bad</SelectItem>
                          <SelectItem value="not_reviewed">Pending Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <AnimatePresence>
                      {hasActiveFilters && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground hover:text-foreground">
                            Reset
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>

              {/* Main Dashboard Content */}
              <div className="space-y-8">
                
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <KpiCard title="Total Target Companies" value={analyticsSnapshot?.total_target_companies || 0} desc="High priority fits" icon={Database} isLoading={loading} />
                  <KpiCard title="Briefs Generated" value={analyticsSnapshot?.generated_briefs || 0} desc="Finalized research documents" icon={FileText} valueColor="text-primary" isLoading={loading} />
                  <KpiCard title="Contacts Found" value={analyticsSnapshot?.contact_companies || 0} desc="Target companies with enriched data" icon={Users} isLoading={loading} />
                  <KpiCard title="Feedback Received" value={analyticsSnapshot?.feedback_received || 0} desc="Briefs reviewed by team" icon={CheckCircle2} valueColor="text-green-500" isLoading={loading} />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Score Distribution */}
                  <Card className="flex flex-col bg-card text-card-foreground border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base text-foreground">
                        Target Score Distribution
                      </CardTitle>
                      <CardDescription>Distribution of fit scores among target accounts</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px]">
                      {loading ? <Skeleton className="w-full h-full rounded-xl" /> : 
                        (!analyticsSnapshot?.score_distribution || analyticsSnapshot.score_distribution.length === 0) ? (
                          <EmptyState icon={BarChart3} title="No score data" description="Import and score companies to see distributions." />
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsSnapshot.score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                              itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar 
                              dataKey="count" 
                              radius={[4, 4, 0, 0]}
                              fill="hsl(var(--primary))"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Verdict Breakdown */}
                  <Card className="flex flex-col bg-card text-card-foreground border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base text-foreground">
                        Brief Feedback Trends
                      </CardTitle>
                      <CardDescription>User feedback on generated target briefs</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
                      {loading ? <Skeleton className="w-full h-full rounded-xl" /> : 
                        verdictData.length === 0 ? (
                          <EmptyState icon={MessageSquare} title="No feedback data" description="Generate briefs to see feedback trends." />
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={verdictData}
                              cx="50%" cy="50%"
                              innerRadius={70} outerRadius={110}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {verdictData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color} 
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                              itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Brief Feedback Funnel */}
                <BriefFeedbackFunnel 
                  funnel_summary={analyticsSnapshot?.funnel_summary || []} 
                  loading={loading} 
                />

                {/* Contact Coverage Full Width Section */}
                <Card className="bg-card text-card-foreground border-border/50 overflow-hidden flex flex-col">
                  <CardHeader className="bg-muted/10 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2 text-foreground">
                      <Users className="h-5 w-5 text-primary" />
                      Target Contact Coverage & Enrichment
                    </CardTitle>
                    <CardDescription>Data availability across target accounts</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loading ? (
                      <div className="space-y-6">
                        <div className="flex gap-4"><Skeleton className="h-16 flex-1"/><Skeleton className="h-16 flex-1"/><Skeleton className="h-16 flex-1"/></div>
                      </div>
                    ) : (analyticsSnapshot?.contact_companies || 0) === 0 ? (
                      <EmptyState icon={Users} title="No Contacts Found" description="Enrich target companies with contact data to view coverage metrics." />
                    ) : (
                      <div className="flex flex-wrap gap-4">
                        <MetricPill icon={Briefcase} label="Target Companies" value={analyticsSnapshot?.contact_companies || 0} isLoading={loading} />
                        <MetricPill icon={Users} label="Total Contacts" value={analyticsSnapshot?.total_contacts || 0} isLoading={loading} />
                        <MetricPill icon={Users} label="Named Contacts" value={analyticsSnapshot?.named_contacts || 0} isLoading={loading} />
                        <MetricPill icon={Mail} label="With Email" value={analyticsSnapshot?.contacts_with_email || 0} isLoading={loading} />
                        <MetricPill icon={Phone} label="With Phone" value={analyticsSnapshot?.contacts_with_phone || 0} isLoading={loading} />
                        <MetricPill icon={Linkedin} label="With LinkedIn" value={analyticsSnapshot?.contacts_with_linkedin || 0} isLoading={loading} />
                        <MetricPill icon={BarChart3} label="Avg per Target" value={Number(analyticsSnapshot?.avg_contacts_per_company || 0).toFixed(1)} isLoading={loading} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tables Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Top Scored Companies */}
                  <Card className="bg-card text-card-foreground border-border/50 overflow-hidden flex flex-col">
                    <CardHeader className="bg-muted/10 border-b border-border/50">
                      <CardTitle className="text-base flex items-center gap-2 text-foreground">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Top Target Matches
                      </CardTitle>
                      <CardDescription>Highest scoring target companies in current view</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {loading ? (
                        <div className="p-4 space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
                      ) : (!analyticsSnapshot?.top_companies || analyticsSnapshot.top_companies.length === 0) ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">No target companies match criteria.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-foreground">Company</TableHead>
                                <TableHead className="text-right text-foreground">Score</TableHead>
                                <TableHead className="text-right text-foreground">Decision</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analyticsSnapshot.top_companies.map((c) => (
                                <TableRow 
                                  key={c.id || c.company_id} 
                                  className="table-row-interactive cursor-pointer"
                                  onClick={() => handleRowNavigate(c.company_id)}
                                >
                                  <TableCell className="font-medium text-primary flex items-center gap-2">
                                    {c.name || c.company_id?.substring(0,8)}
                                    <MousePointerClick className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{c.fit_score}</TableCell>
                                  <TableCell className="text-right capitalize">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                                      normalizeDecision(c.decision) === 'target' ? "bg-green-500/10 text-green-500" :
                                      normalizeDecision(c.decision) === 'watch' ? "bg-yellow-500/10 text-yellow-500" :
                                      normalizeDecision(c.decision) === 'reject' ? "bg-red-500/10 text-red-500" :
                                      "bg-muted text-muted-foreground"
                                    )}>
                                      {c.decision || 'Unscored'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Campaign Performance */}
                  <Card className="bg-card text-card-foreground border-border/50 overflow-hidden flex flex-col">
                    <CardHeader className="bg-muted/10 border-b border-border/50">
                      <CardTitle className="text-base text-foreground">Target Campaign Performance</CardTitle>
                      <CardDescription>Click a campaign to filter entire dashboard</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {loading ? (
                        <div className="p-4 space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
                      ) : (!analyticsSnapshot?.campaign_breakdown || analyticsSnapshot.campaign_breakdown.length === 0) ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">No campaign data available.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-foreground">Campaign</TableHead>
                                <TableHead className="text-right text-foreground">Targets</TableHead>
                                <TableHead className="text-right text-foreground">Avg Score</TableHead>
                                <TableHead className="text-right text-foreground">Briefs</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analyticsSnapshot.campaign_breakdown.map((camp) => (
                                <TableRow 
                                  key={camp.id} 
                                  className="table-row-interactive cursor-pointer"
                                  onClick={() => handleFilterChange('campaign', filters.campaign === camp.id ? 'all' : camp.id)}
                                >
                                  <TableCell className={cn("font-medium", filters.campaign === camp.id && "text-primary")}>
                                    {camp.id}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{camp.count}</TableCell>
                                  <TableCell className="text-right tabular-nums">{camp.avgScore}</TableCell>
                                  <TableCell className="text-right tabular-nums">{camp.generated}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AnalyticsPage;