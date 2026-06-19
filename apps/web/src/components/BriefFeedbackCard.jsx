import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, ThumbsDown, Minus, Loader2, AlertCircle, CheckCircle2, Send, Calendar, User, MessageSquarePlus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import supabaseDataService from '@/services/supabaseDataService.js';
import { cn } from '@/lib/utils.js';

const QUICK_REASON_OPTIONS = [
  { value: "good_fit", label: "Good fit" },
  { value: "useful_trigger", label: "Useful trigger" },
  { value: "right_contact", label: "Right contact" },
  { value: "weak_fit", label: "Weak fit" },
  { value: "weak_or_missing_evidence", label: "Weak or missing evidence" },
  { value: "wrong_or_missing_contact", label: "Wrong or missing contact" },
  { value: "other", label: "Other" }
];

const formatNoteDateTime = (value) => {
  if (!value) {
    return { date: 'Unknown date', time: 'Unknown time' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: 'Unknown date', time: 'Unknown time' };
  }

  return {
    date: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date),
    time: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  };
};

const BriefFeedbackCard = ({ clientId, companyId, finalBriefRunId, hasFinalizedBrief, onAssignmentUpdated }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  
  const [verdict, setVerdict] = useState(null);
  const [quickReason, setQuickReason] = useState("");
  const [contacted, setContacted] = useState(false);
  const [meetingBooked, setMeetingBooked] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [briefNotes, setBriefNotes] = useState([]);
  const [enrichedData, setEnrichedData] = useState(null);

  const [initialData, setInitialData] = useState({
    verdict: null,
    quickReason: "",
    contacted: false,
    meetingBooked: false
  });

  const isDirty = 
    quickReason !== initialData.quickReason || 
    (verdict !== initialData.verdict && verdict !== null) ||
    contacted !== initialData.contacted ||
    meetingBooked !== initialData.meetingBooked;

  const loadFeedback = useCallback(async () => {
    if (!clientId || !companyId || !finalBriefRunId || !hasFinalizedBrief) {
      setLoading(false);
      return;
    }

    try {
      const [record, notesRecords] = await Promise.all([
        supabaseDataService.fetchBriefFeedback(clientId, companyId, finalBriefRunId),
        supabaseDataService.fetchBriefNotes(clientId, companyId, finalBriefRunId)
      ]);

      setBriefNotes(notesRecords);

      if (record) {
        setVerdict(record.brief_verdict || null);
        setQuickReason(record.quick_reason || "");
        setContacted(record.contacted === true);
        setMeetingBooked(record.meeting_booked === true);
        setEnrichedData(record);
        
        setInitialData({
          verdict: record.brief_verdict || null,
          quickReason: record.quick_reason || "",
          contacted: record.contacted === true,
          meetingBooked: record.meeting_booked === true
        });
      } else {
        setVerdict(null);
        setQuickReason("");
        setContacted(false);
        setMeetingBooked(false);
        setEnrichedData(null);
        
        setInitialData({
          verdict: null,
          quickReason: "",
          contacted: false,
          meetingBooked: false
        });
      }
    } catch (err) {
      console.error('Error fetching brief feedback:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load existing feedback."
      });
      
      setVerdict(null);
      setQuickReason("");
      setContacted(false);
      setMeetingBooked(false);
      setBriefNotes([]);
      setEnrichedData(null);
      
      setInitialData({
        verdict: null,
        quickReason: "",
        contacted: false,
        meetingBooked: false
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, finalBriefRunId, hasFinalizedBrief, toast]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleSave = async (
    currentVerdict, 
    currentQuickReason, 
    currentContacted, 
    currentMeetingBooked
  ) => {
    if (!clientId || !companyId || !finalBriefRunId) return;

    if (!['good', 'mixed', 'bad'].includes(currentVerdict)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please choose Good, Mixed, or Bad before saving feedback."
      });
      return;
    }

    setSaving(true);
    setFeedbackSaved(false);
    
    try {
      const allowedReasons = new Set(QUICK_REASON_OPTIONS.map((opt) => opt.value));
      if (currentQuickReason && !allowedReasons.has(currentQuickReason)) {
        throw new Error("Invalid quick reason selected.");
      }

      const payload = {
        client_id: clientId,
        finalBriefRunId,
        company_id: companyId,
        brief_verdict: currentVerdict,
        quick_reason: currentQuickReason || null,
        contacted: currentContacted === true,
        meeting_booked: currentMeetingBooked === true
      };

      await supabaseDataService.saveBriefFeedback(payload);

      let assignmentClosed = false;
      let assignmentCloseError = null;
      if (currentVerdict === 'bad') {
        try {
          await supabaseDataService.closeBriefAssignmentForFeedback({
            clientId,
            companyId,
            finalBriefRunId
          });
          assignmentClosed = true;
          onAssignmentUpdated?.();
        } catch (err) {
          assignmentCloseError = err;
          console.error('Error closing assignment after bad feedback:', err);
        }
      }

      setFeedbackError(null);
      setFeedbackSaved(true);
      
      setInitialData({
        verdict: currentVerdict,
        quickReason: currentQuickReason || "",
        contacted: currentContacted === true,
        meetingBooked: currentMeetingBooked === true
      });

      toast({
        title: "Feedback saved",
        description: assignmentClosed
          ? "Feedback saved and assignment moved to closed."
          : assignmentCloseError
            ? "Feedback saved, but the assignment could not be moved to closed."
            : "Thank you for your feedback.",
        variant: assignmentCloseError ? "destructive" : undefined,
      });
      
      // Refetch to get updated creator/editor info
      await loadFeedback();

      setTimeout(() => setFeedbackSaved(false), 3000);
    } catch (err) {
      console.error('Error saving brief feedback:', err);
      setFeedbackError(err.message || "An unexpected error occurred.");
      toast({
        variant: "destructive",
        title: "Failed to save feedback",
        description: err.message || "An unexpected error occurred. Please try again."
      });
    } finally {
      setSaving(false);
    }
  };

  const onVerdictClick = (newVerdict) => {
    setVerdict(newVerdict);
    handleSave(newVerdict, quickReason, contacted, meetingBooked);
  };

  const onManualSave = () => {
    handleSave(verdict, quickReason, contacted, meetingBooked);
  };

  const onSaveNote = async () => {
    const noteText = newNote.trim();
    if (!noteText || !clientId || !companyId || !finalBriefRunId) return;

    setSavingNote(true);
    try {
      await supabaseDataService.createBriefNote({
        client_id: clientId,
        company_id: companyId,
        run_id: finalBriefRunId,
        note_text: noteText
      });

      setNewNote("");
      const notesRecords = await supabaseDataService.fetchBriefNotes(clientId, companyId, finalBriefRunId);
      setBriefNotes(notesRecords);

      toast({
        title: "Note added",
        description: "The activity note has been saved.",
      });
    } catch (err) {
      console.error('Error saving brief note:', err);
      toast({
        variant: "destructive",
        title: "Failed to save note",
        description: err.message || "An unexpected error occurred. Please try again."
      });
    } finally {
      setSavingNote(false);
    }
  };

  if (!finalBriefRunId || !hasFinalizedBrief) {
    return (
      <Card className="opacity-70 bg-muted/30">
        <CardHeader>
          <CardTitle>Brief feedback</CardTitle>
          <CardDescription>Feedback is available once a final brief has been generated.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brief feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>Brief feedback</CardTitle>
        <CardDescription>Help us improve future briefs and targeting</CardDescription>
        {enrichedData && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md border border-border/50">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">Feedback by:</span> 
              {enrichedData.created_by_display_name || enrichedData.created_by_email || "Unknown user"}
            </div>
            {enrichedData.updated_by_email && enrichedData.updated_by_email !== enrichedData.created_by_email && (
              <div className="flex items-center gap-1.5 pl-5">
                <span className="font-medium text-foreground">Last edited by:</span> 
                {enrichedData.updated_by_display_name || enrichedData.updated_by_email}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-5">
          {feedbackError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{feedbackError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className={cn(
                "flex-1 h-12 transition-all",
                verdict === 'good' 
                  ? "bg-green-50 border-green-500 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-950/40 dark:border-green-500/60 dark:text-green-400" 
                  : "hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400"
              )}
              onClick={() => onVerdictClick('good')}
              disabled={saving}
            >
              <ThumbsUp className={cn("h-5 w-5 mr-2", verdict === 'good' ? "fill-current" : "")} />
              Good
            </Button>
            
            <Button
              variant="outline"
              className={cn(
                "flex-1 h-12 transition-all",
                verdict === 'mixed' 
                  ? "bg-amber-50 border-amber-500 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/40 dark:border-amber-500/60 dark:text-amber-400" 
                  : "hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
              )}
              onClick={() => onVerdictClick('mixed')}
              disabled={saving}
            >
              <Minus className="h-5 w-5 mr-2" />
              Mixed
            </Button>

            <Button
              variant="outline"
              className={cn(
                "flex-1 h-12 transition-all",
                verdict === 'bad' 
                  ? "bg-red-50 border-red-500 text-red-700 hover:bg-red-100 hover:text-red-800 dark:bg-red-950/40 dark:border-red-500/60 dark:text-red-400" 
                  : "hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              )}
              onClick={() => onVerdictClick('bad')}
              disabled={saving}
            >
              <ThumbsDown className={cn("h-5 w-5 mr-2", verdict === 'bad' ? "fill-current" : "")} />
              Bad
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Quick reason
            </label>
            <Select 
              value={quickReason} 
              onValueChange={setQuickReason}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason (optional)" />
              </SelectTrigger>
              <SelectContent>
                {QUICK_REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Actions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-12 justify-center gap-2 transition-all",
                  contacted 
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30 hover:text-blue-300" 
                    : "hover:bg-muted"
                )}
                onClick={() => setContacted(!contacted)}
                disabled={saving}
              >
                <Send className={cn("h-4 w-4", contacted ? "fill-current" : "")} />
                Contacted
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-12 justify-center gap-2 transition-all",
                  meetingBooked 
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 hover:text-emerald-300" 
                    : "hover:bg-muted"
                )}
                onClick={() => setMeetingBooked(!meetingBooked)}
                disabled={saving}
              >
                <Calendar className={cn("h-4 w-4", meetingBooked ? "fill-current" : "")} />
                Meeting booked
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium leading-none">
                Previous notes
              </label>
              <span className="text-xs text-muted-foreground">
                {briefNotes.length} {briefNotes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>

            {briefNotes.length > 0 ? (
              <div className="max-h-80 overflow-y-auto rounded-md border border-border/60 bg-muted/10">
                <div className="divide-y divide-border/60">
                  {briefNotes.map((note) => {
                    const { date, time } = formatNoteDateTime(note.created_at);
                    const author = note.created_by_display_name || note.created_by_email || "Unknown user";

                    return (
                      <div key={note.id || `${note.created_at}-${note.note_text}`} className="p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <User className="h-3.5 w-3.5" />
                            {author}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {date}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {time}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {note.note_text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                No notes yet.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Add note
            </label>
            <Textarea
              placeholder="Add a dated activity note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={savingNote}
              className="resize-none"
              rows={4}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={onSaveNote}
                disabled={savingNote || !newNote.trim()}
              >
                {savingNote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving note...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    Add note
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            {feedbackSaved && !isDirty && (
              <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Saved
              </span>
            )}
            {isDirty && (
              <Button onClick={onManualSave} disabled={saving || !verdict}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save feedback"
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BriefFeedbackCard;
