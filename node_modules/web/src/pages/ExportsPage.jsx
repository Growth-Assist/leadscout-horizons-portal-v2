import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ExportsPage = () => {
  const { client_id } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Mock data for exports history
  const exportsHistory = [
    { id: 1, name: 'Target Accounts Q1', date: '2026-04-20', format: 'CSV', size: '2.4 MB', status: 'Ready' },
    { id: 2, name: 'All Processed Companies', date: '2026-04-15', format: 'Excel', size: '8.1 MB', status: 'Ready' },
    { id: 3, name: 'Watchlist Update', date: '2026-04-10', format: 'CSV', size: '1.2 MB', status: 'Ready' },
  ];

  if (!client_id) {
    return (
      <>
        <Helmet>
          <title>Data Exports - LeadScout Portal</title>
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
        <title>Data Exports - LeadScout Portal</title>
        <meta name="description" content="Export your lead intelligence data" />
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
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Data Exports</h1>
                    <p className="text-muted-foreground">Download your intelligence data for external use</p>
                  </div>
                  <Button className="shrink-0">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    New Export
                  </Button>
                </div>

                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Quick Exports</CardTitle>
                    <CardDescription>Commonly requested data sets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2">
                        <Download className="h-6 w-6 text-primary" />
                        <span>All Target Accounts</span>
                        <span className="text-xs text-muted-foreground font-normal">CSV Format</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2">
                        <Download className="h-6 w-6 text-primary" />
                        <span>Recent Briefs (Last 30 Days)</span>
                        <span className="text-xs text-muted-foreground font-normal">ZIP Archive</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2">
                        <Download className="h-6 w-6 text-primary" />
                        <span>Full Database Dump</span>
                        <span className="text-xs text-muted-foreground font-normal">Excel Format</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export History</CardTitle>
                    <CardDescription>Previously generated exports available for download</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exportsHistory.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-muted-foreground">{item.date}</TableCell>
                              <TableCell>{item.format}</TableCell>
                              <TableCell className="text-muted-foreground">{item.size}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                  {item.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
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

export default ExportsPage;