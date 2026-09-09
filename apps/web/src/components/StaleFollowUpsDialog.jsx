import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import supabaseDataService from '@/services/supabaseDataService.js';

const PAGE_SIZE = 50;

const formatDate = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const staleReasonLabel = (reason) => (
  reason === 'no_post_contact_note' ? 'No follow-up note' : 'Last note outside selected period'
);

const StaleFollowUpsDialog = ({ open, onOpenChange, clientId, dateFrom, dateTo, periodDays, onOpenBrief }) => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) setPage(0);
  }, [open, dateFrom, dateTo]);

  useEffect(() => {
    if (!open || !clientId || !dateFrom || !dateTo) return undefined;
    let active = true;

    const loadPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await supabaseDataService.fetchFeedbackStaleAccounts(
          clientId,
          dateFrom,
          dateTo,
          PAGE_SIZE,
          page * PAGE_SIZE
        );
        if (!active) return;
        setRows(data);
        setTotal(Number(data[0]?.total_count || 0));
      } catch (loadError) {
        if (!active) return;
        console.error('Failed to load stale follow-ups:', loadError);
        setRows([]);
        setError('Stale follow-ups could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();
    return () => { active = false; };
  }, [open, clientId, dateFrom, dateTo, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultRange = useMemo(() => {
    if (total === 0) return '0 accounts';
    const first = page * PAGE_SIZE + 1;
    const last = Math.min((page + 1) * PAGE_SIZE, total);
    return `${first}–${last} of ${total}`;
  }, [page, total]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Stale follow-ups</DialogTitle>
          <DialogDescription>
            Contacted, open accounts without a post-contact note in the last {periodDays} days.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Contacted</TableHead>
                <TableHead>Latest note</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow><TableCell colSpan={6} className="h-28 text-center text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No stale follow-ups in this period.</TableCell></TableRow>
              ) : rows.map((row) => (
                <TableRow key={`${row.company_id}:${row.run_id}`}>
                  <TableCell className="font-medium text-foreground">{row.company_name || row.company_id}</TableCell>
                  <TableCell className="text-muted-foreground">{row.assignee_display_name || row.assignee_email || 'Unassigned'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.contacted_at)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.latest_note_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{staleReasonLabel(row.stale_reason)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onOpenBrief(row.company_id)} title="Open brief">
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Open {row.company_name || row.company_id}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
          <span>{resultRange}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={loading || page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              <ChevronLeft className="mr-1 h-4 w-4" />Previous
            </Button>
            <span className="tabular-nums">Page {page + 1} of {pageCount}</span>
            <Button variant="outline" size="sm" disabled={loading || page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>
              Next<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaleFollowUpsDialog;

