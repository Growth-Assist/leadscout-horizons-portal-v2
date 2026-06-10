import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, User, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import supabaseDataService from '@/services/supabaseDataService.js';
import { cn } from '@/lib/utils.js';

const STAGES = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'meeting_booked', label: 'Meeting Booked' },
  { id: 'closed', label: 'Closed' }
];

const BriefAssignmentCard = ({ 
  clientId, 
  companyId, 
  finalBriefRunId, 
  hasFinalizedBrief,
  currentUser 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignment, setAssignment] = useState(null);
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [isManager, setIsManager] = useState(false);

  const loadAssignment = useCallback(async () => {
    if (!clientId || !companyId || !finalBriefRunId) return;
    try {
      const record = await supabaseDataService.fetchBriefAssignment(clientId, companyId, finalBriefRunId);
      setAssignment(record);
    } catch (err) {
      console.error('Error fetching brief assignment:', err);
    }
  }, [clientId, companyId, finalBriefRunId]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    if (!clientId || !companyId || !finalBriefRunId) {
      setLoading(false);
      return;
    }

    try {
      await loadAssignment();
      
      const members = await supabaseDataService.fetchPortalTeamMembers(clientId);
      setTeamMembers(members || []);

      const isAdmin = currentUser?.app_metadata?.portal_role === 'admin';
      const userMember = (members || []).find(m => m.user_id === currentUser?.id || m.email === currentUser?.email);
      const isTeamManager = userMember?.team_role === 'manager';
      
      setIsManager(isAdmin || isTeamManager);
    } catch (err) {
      console.error('Error loading initial data:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load assignment information."
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, finalBriefRunId, currentUser, loadAssignment, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleClaim = async () => {
    if (!currentUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Unable to claim assignment because the logged-in user could not be identified. Please refresh and sign in again.'
      });
      return;
    }
    
    if (!clientId || !companyId || !finalBriefRunId) return;

    setActionLoading(true);
    try {
      await supabaseDataService.claimBriefAssignment({
        clientId,
        companyId,
        finalBriefRunId,
        userId: currentUser.id
      });
      
      toast({
        title: "Assignment claimed",
        description: "You have successfully claimed this brief."
      });
      
      await loadAssignment();
    } catch (err) {
      console.error('Error claiming assignment:', err);
      const errorMsg = err.message?.toLowerCase() || "";
      
      if (errorMsg.includes('duplicate key') || errorMsg.includes('already exists') || errorMsg.includes('unique constraint')) {
        toast({
          variant: "destructive",
          title: "Already claimed",
          description: "This brief was just claimed by someone else."
        });
        await loadAssignment();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to claim",
          description: err.message || "An unexpected error occurred."
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!assignment?.id) return;

    const previousStatus = assignment.status;
    
    setAssignment(prev => ({ ...prev, status: newStatus }));
    setActionLoading(true);

    try {
      await supabaseDataService.updateBriefAssignmentStatus({
        assignmentId: assignment.id,
        status: newStatus
      });
      
      toast({
        title: "Status updated",
        description: `Assignment status changed to ${STAGES.find(s => s.id === newStatus)?.label}.`
      });
    } catch (err) {
      console.error('Error updating status:', err);
      setAssignment(prev => ({ ...prev, status: previousStatus }));
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: err.message || "An unexpected error occurred."
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassign = async (newAssigneeId) => {
    if (!clientId || !companyId || !finalBriefRunId) return;

    setActionLoading(true);
    try {
      await supabaseDataService.upsertBriefAssignment({
        clientId,
        companyId,
        finalBriefRunId,
        assignedTo: newAssigneeId,
        status: assignment?.status || 'assigned'
      });

      toast({
        title: "Assignment updated",
        description: "Brief reassigned successfully."
      });

      await loadAssignment();
    } catch (err) {
      console.error('Error reassigning brief:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reassign brief."
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assignment & Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
          </div>
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  const currentStatusIndex = assignment 
    ? STAGES.findIndex(s => s.id === assignment.status)
    : -1;

  const assigneeName = assignment 
    ? (assignment.assigned_to_display_name || assignment.assigned_to_email || 'Unknown user')
    : 'Unassigned';

  const isAssigneeInactive = assignment && assignment.assigned_to_is_active === false;
  const isCurrentUserAssignee = assignment && currentUser && assignment.assigned_to === currentUser.id;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle>Assignment & Progress</CardTitle>
        <CardDescription>Track the outreach lifecycle for this brief</CardDescription>
        
        <div className="mt-3 flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-md border border-border/50">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Assignee:</span>
          <span className={cn("text-muted-foreground", !assignment && "italic")}>
            {assigneeName}
          </span>
          {isAssigneeInactive && (
            <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5 bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/20">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Funnel Visualization */}
        <div className="relative overflow-hidden py-1">
          <div className="flex items-center justify-between w-full">
            {STAGES.map((stage, index) => {
              const isCompleted = currentStatusIndex > index;
              const isCurrent = currentStatusIndex === index;
              
              return (
                <React.Fragment key={stage.id}>
                  <div className="flex flex-col items-center gap-2 relative z-10 flex-1">
                    <div 
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors bg-background",
                        isCompleted ? "border-green-500 text-green-500" : 
                        isCurrent ? "border-primary text-primary ring-4 ring-primary/20" : 
                        "border-muted-foreground/30 text-muted-foreground/30"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isCurrent ? (
                        <Circle className="h-3 w-3 fill-current" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                    </div>
                    <span 
                      className={cn(
                        "text-xs font-medium text-center px-1",
                        isCompleted ? "text-foreground" : 
                        isCurrent ? "text-primary" : 
                        "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </span>
                  </div>
                  
                  {/* Connecting Line */}
                  {index < STAGES.length - 1 && (
                    <div 
                      className="absolute top-5 flex items-center justify-center pointer-events-none" 
                      style={{ 
                        left: `${(index * (100 / STAGES.length)) + (100 / (STAGES.length * 2))}%`, 
                        width: `${100 / STAGES.length}%` 
                      }}
                    >
                      <div 
                        className={cn(
                          "h-[2px] w-full mx-4 transition-colors",
                          isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                        )}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Actions / Controls */}
        <div className="pt-2">
          {isManager ? (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Reassign Brief (Manager)
              </label>
              <Select 
                value={assignment?.assigned_to || undefined} 
                onValueChange={handleReassign}
                disabled={actionLoading || !finalBriefRunId}
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : !hasFinalizedBrief ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>Brief not yet finalized. Assignment and status tracking will be available once generated.</p>
            </div>
          ) : !assignment ? (
            <Button 
              onClick={handleClaim} 
              disabled={actionLoading || !currentUser?.id}
              className="w-full sm:w-auto"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim Assignment"
              )}
            </Button>
          ) : isCurrentUserAssignee ? (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Update Status
              </label>
              <Select 
                value={assignment.status} 
                onValueChange={handleStatusChange}
                disabled={actionLoading}
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-muted-foreground">
                Current Status
              </label>
              <div className="text-sm font-medium px-3 py-2 border rounded-md bg-muted/30 w-full sm:w-[240px]">
                {STAGES.find(s => s.id === assignment.status)?.label || assignment.status}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BriefAssignmentCard;