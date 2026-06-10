import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { Target, CheckCircle2, XCircle, AlertCircle, Users, PoundSterling, Scale, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import supabaseDataService from '@/services/supabaseDataService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const humanizeKey = (key) => {
  if (!key) return '';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatCurrencyGBP = (value) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(value);
};

const ICPProfilePage = () => {
  const { client_id } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [icpData, setIcpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchICPData = async () => {
      if (!client_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await supabaseDataService.fetchActiveICPRules(client_id);
        
        if (data && data.content) {
          setIcpData(data.content);
        } else {
          throw new Error('No active ICP rules found');
        }
      } catch (err) {
        console.error('Failed to fetch ICP rules:', err);
        setError('Failed to load ICP profile configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchICPData();
  }, [client_id]);

  if (!client_id) {
    return (
      <>
        <Helmet>
          <title>ICP Profile - LeadScout Portal</title>
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
          <title>ICP Profile - LeadScout Portal</title>
        </Helmet>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Skeleton className="h-10 w-48 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                  <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  if (error || !icpData) {
    return (
      <>
        <Helmet>
          <title>ICP Profile - LeadScout Portal</title>
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
                    <p className="text-muted-foreground">{error || 'No ICP configuration found.'}</p>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  const icp = icpData?.content ?? icpData ?? {};

  // Data extraction
  const targetIndustries = asArray(icp.target_industries);
  
  const dealbreakers = Object.entries(icp.dealbreakers || {})
    .filter(([_, val]) => val === true)
    .map(([key]) => humanizeKey(key));
  const excludedIndustries = [...new Set([
    ...asArray(icp.operational_focus?.disqualify_description_keywords),
    ...dealbreakers
  ])];

  const positiveSignals = asArray(icp.operational_focus?.description_keywords);
  const negativeSignals = asArray(icp.operational_focus?.disqualify_description_keywords);

  const employeeBands = asArray(icp.size_requirements?.employee_bands);
  const minEmp = icp.size_requirements?.min_employees;
  const maxEmp = icp.size_requirements?.max_employees;
  const hasSizeCriteria = employeeBands.length > 0 || minEmp !== undefined || maxEmp !== undefined;

  const minTurnover = icp.turnover_rules?.min_turnover_gbp;
  const excludeMicro = icp.turnover_rules?.exclude_micro_accounts;
  const penalizeBands = asArray(icp.turnover_rules?.penalize_turnover_bands);
  const hasRevenueCriteria = minTurnover !== undefined || excludeMicro || penalizeBands.length > 0;

  const scoringWeights = Object.entries(icp.scoring_weights || {});
  const notes = icp.notes;

  return (
    <>
      <Helmet>
        <title>ICP Profile - LeadScout Portal</title>
        <meta name="description" content="Ideal Customer Profile configuration and rules" />
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
                  <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Ideal Customer Profile</h1>
                  <p className="text-muted-foreground">Current targeting rules and qualification criteria</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {targetIndustries.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          Target Industries
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {targetIndustries.map((industry, i) => (
                            <Badge key={i} variant="secondary" className="text-sm py-1">
                              {industry}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {excludedIndustries.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-destructive" />
                          Excluded Industries & Dealbreakers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {excludedIndustries.map((industry, i) => (
                            <Badge key={i} variant="outline" className="text-sm py-1 border-destructive/30 text-destructive">
                              {industry}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {positiveSignals.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Positive Signals
                        </CardTitle>
                        <CardDescription>Keywords that increase fit score</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {positiveSignals.map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-sm py-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {negativeSignals.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          Negative Signals
                        </CardTitle>
                        <CardDescription>Keywords that decrease fit score</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {negativeSignals.map((keyword, i) => (
                            <Badge key={i} variant="outline" className="text-sm py-1 border-yellow-500/30 text-yellow-600 dark:text-yellow-500">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {hasSizeCriteria && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Company Size Criteria
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(minEmp !== undefined || maxEmp !== undefined) && (
                            <div>
                              <h4 className="font-medium mb-2 text-sm text-muted-foreground">Employee Count Limits</h4>
                              <div className="space-y-1">
                                {minEmp !== undefined && <p className="text-sm"><span className="font-medium">Minimum:</span> {minEmp}</p>}
                                {maxEmp !== undefined && <p className="text-sm"><span className="font-medium">Maximum:</span> {maxEmp}</p>}
                              </div>
                            </div>
                          )}
                          {employeeBands.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-sm text-muted-foreground">Target Employee Bands</h4>
                              <div className="flex flex-wrap gap-2">
                                {employeeBands.map((band, i) => (
                                  <Badge key={i} variant="secondary">{band}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {hasRevenueCriteria && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PoundSterling className="h-5 w-5 text-primary" />
                          Revenue Criteria
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {minTurnover !== undefined && (
                            <div>
                              <h4 className="font-medium mb-1 text-sm text-muted-foreground">Minimum Turnover</h4>
                              <p className="text-sm font-medium">{formatCurrencyGBP(minTurnover)}</p>
                            </div>
                          )}
                          {excludeMicro && (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span className="text-sm">Exclude micro accounts</span>
                            </div>
                          )}
                          {penalizeBands.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-sm text-muted-foreground">Penalized Turnover Bands</h4>
                              <div className="flex flex-wrap gap-2">
                                {penalizeBands.map((band, i) => (
                                  <Badge key={i} variant="outline" className="border-yellow-500/30 text-yellow-600 dark:text-yellow-500">{band}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {scoringWeights.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Scale className="h-5 w-5 text-primary" />
                          Scoring Weights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {scoringWeights.map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                              <span className="text-sm font-medium">{humanizeKey(key)}</span>
                              <Badge variant="secondary">{value}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default ICPProfilePage;