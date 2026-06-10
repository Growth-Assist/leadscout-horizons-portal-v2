import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { Calculator, AlertCircle, Info, Target, ShieldAlert, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import supabaseDataService from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const WEIGHT_LABELS = {
  industry: 'Industry fit',
  structure: 'Company structure',
  ownership: 'Ownership',
  location: 'Location',
  employees: 'Employee count',
  turnover: 'Turnover',
  data_completeness: 'Data completeness',
  operational_alignment: 'Operational alignment',
  property_signal: 'Property signal',
  signal_context: 'External signal context'
};

const DEALBREAKER_LABELS = {
  global_parent: 'Global parent',
  dormant_company: 'Dormant company',
  franchise_or_national_chain: 'Franchise or national chain',
  public_sector_or_charity: 'Public sector or charity'
};

const ScoringTransparencyPage = () => {
  const { client_id } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scoringData, setScoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScoringData = async () => {
      if (!client_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await supabaseDataService.fetchActiveICPRules(client_id);
        
        if (!data || !data.content) {
          throw new Error('No active scoring configuration found');
        }

        const content = data.content;
        const weights = content.scoring_weights || content.scoringWeights;

        if (!weights) {
          throw new Error('Scoring weights not found in configuration');
        }

        setScoringData({
          weights,
          targetIndustries: content.target_industries || [],
          operationalFocus: content.operational_focus || {},
          sizeRequirements: content.size_requirements || {},
          locationRequirements: content.location_requirements || {},
          turnoverRules: content.turnover_rules || {},
          dealbreakers: content.dealbreakers || {},
          notes: content.notes || ''
        });
      } catch (err) {
        console.error('Failed to fetch scoring rules:', err);
        setError(err.message || 'Failed to load scoring configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchScoringData();
  }, [client_id]);

  const renderTruncatedList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return 'None specified';
    if (list.length <= 20) return list.join(', ');
    return `${list.slice(0, 20).join(', ')} + ${list.length - 20} more`;
  };

  const renderJsonValue = (value) => {
    if (Array.isArray(value)) return renderTruncatedList(value);
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }
    return String(value);
  };

  if (!client_id) {
    return (
      <>
        <Helmet>
          <title>Scoring Transparency - LeadScout Portal</title>
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

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Scoring Transparency - LeadScout Portal</title>
        </Helmet>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Skeleton className="h-10 w-64 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
                  <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  if (error || !scoringData) {
    return (
      <>
        <Helmet>
          <title>Scoring Transparency - LeadScout Portal</title>
        </Helmet>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      Configuration Error
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{error || 'No scoring configuration found.'}</p>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  const enabledDealbreakers = Object.entries(scoringData.dealbreakers)
    .filter(([_, enabled]) => enabled === true);

  return (
    <>
      <Helmet>
        <title>Scoring Transparency - LeadScout Portal</title>
        <meta name="description" content="How we calculate company fit scores" />
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
                  <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Scoring Transparency</h1>
                  <p className="text-muted-foreground">How we calculate company fit scores and ideal customer profiles</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Card 1: Category Weights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        Category Weights
                      </CardTitle>
                      <CardDescription>Relative importance of each data category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(scoringData.weights).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-transparent hover:border-border transition-colors">
                            <span className="font-medium text-sm">
                              {WEIGHT_LABELS[key] || key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-muted-foreground font-mono bg-background px-2 py-1 rounded-md text-xs border border-border">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Decision Thresholds */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Decision Thresholds
                      </CardTitle>
                      <CardDescription>How scores translate into actionable decisions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                          <div>
                            <h4 className="font-semibold text-green-500">Target</h4>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-4 py-1">70+</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                          <div>
                            <h4 className="font-semibold text-yellow-500">Watch</h4>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-lg px-4 py-1">50 - 69</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                          <div>
                            <h4 className="font-semibold text-red-500">Reject</h4>
                          </div>
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-sm px-4 py-1">below 50 or disqualified</Badge>
                        </div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground">
                        Decision thresholds are the default portal interpretation unless overridden by client-specific scoring mode.
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Target Profile */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Target Profile
                      </CardTitle>
                      <CardDescription>Core company attributes required</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Industries</h4>
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border">
                          {renderTruncatedList(scoringData.targetIndustries)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Employee Bands</h4>
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border">
                          {renderJsonValue(scoringData.sizeRequirements?.employee_bands)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Minimum Turnover (GBP)</h4>
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border">
                          {scoringData.turnoverRules?.min_turnover_gbp ? `£${scoringData.turnoverRules.min_turnover_gbp.toLocaleString()}` : 'None specified'}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Location Requirements</h4>
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border">
                          {Object.keys(scoringData.locationRequirements).length > 0 
                            ? renderJsonValue(scoringData.locationRequirements)
                            : 'None specified'
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 4: Operational Fit */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Operational Fit
                      </CardTitle>
                      <CardDescription>Keywords indicating alignment or mismatch</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-green-500 mb-2">Positive Signals (Keywords)</h4>
                        <div className="text-sm text-muted-foreground bg-green-500/5 p-3 rounded-md border border-green-500/20">
                          {renderTruncatedList(scoringData.operationalFocus?.description_keywords)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-red-500 mb-2">Negative Signals (Disqualifiers)</h4>
                        <div className="text-sm text-muted-foreground bg-red-500/5 p-3 rounded-md border border-red-500/20">
                          {renderTruncatedList(scoringData.operationalFocus?.disqualify_description_keywords)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 5: Dealbreakers */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        Dealbreakers
                      </CardTitle>
                      <CardDescription>Hard constraints that trigger automatic disqualification</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {enabledDealbreakers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {enabledDealbreakers.map(([key]) => (
                            <div key={key} className="flex items-center gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                              <div className="h-2 w-2 rounded-full bg-destructive" />
                              <span className="font-medium">
                                {DEALBREAKER_LABELS[key] || key.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-muted-foreground bg-muted/30 rounded-lg border border-border">
                          No active dealbreakers configured.
                        </div>
                      )}
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

export default ScoringTransparencyPage;