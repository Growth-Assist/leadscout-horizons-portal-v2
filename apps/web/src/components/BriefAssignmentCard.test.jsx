import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BriefAssignmentCard from './BriefAssignmentCard.jsx';
import supabaseDataService from '@/services/supabaseDataService.js';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/services/supabaseDataService.js', () => ({
  default: {
    fetchBriefAssignment: vi.fn(),
    fetchPortalTeamMembers: vi.fn(),
    claimBriefAssignment: vi.fn(),
    updateBriefAssignmentStatus: vi.fn(),
    upsertBriefAssignment: vi.fn()
  }
}));

describe('BriefAssignmentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the simplified lifecycle and displays stale reviewing status as assigned', async () => {
    supabaseDataService.fetchBriefAssignment.mockResolvedValue({
      id: 'assignment-1',
      client_id: 'growth-assist',
      company_id: 'company-1',
      run_id: 'run-1',
      assigned_to: 'user-1',
      assigned_to_display_name: 'Mike',
      assigned_to_email: 'mike@example.com',
      assigned_to_is_active: true,
      status: 'reviewing'
    });
    supabaseDataService.fetchPortalTeamMembers.mockResolvedValue([
      {
        user_id: 'user-1',
        email: 'mike@example.com',
        display_name: 'Mike',
        team_role: 'member',
        is_active: true
      }
    ]);

    render(
      <BriefAssignmentCard
        clientId="growth-assist"
        companyId="company-1"
        finalBriefRunId="run-1"
        hasFinalizedBrief
        currentUser={{
          id: 'user-1',
          email: 'mike@example.com',
          app_metadata: { portal_role: 'viewer' }
        }}
      />
    );

    expect((await screen.findAllByText('Assigned')).length).toBeGreaterThan(0);
    expect(screen.getByText('Nurture')).toBeInTheDocument();
    expect(screen.queryByText('Reviewing')).not.toBeInTheDocument();
  });

  it('updates assignment status when an allowed user clicks a lifecycle stage', async () => {
    supabaseDataService.fetchBriefAssignment.mockResolvedValue({
      id: 'assignment-1',
      client_id: 'growth-assist',
      company_id: 'company-1',
      run_id: 'run-1',
      assigned_to: 'user-1',
      assigned_to_display_name: 'Mike',
      assigned_to_email: 'mike@example.com',
      assigned_to_is_active: true,
      status: 'assigned'
    });
    supabaseDataService.fetchPortalTeamMembers.mockResolvedValue([
      {
        user_id: 'user-1',
        email: 'mike@example.com',
        display_name: 'Mike',
        team_role: 'member',
        is_active: true
      }
    ]);
    supabaseDataService.updateBriefAssignmentStatus.mockResolvedValue();

    render(
      <BriefAssignmentCard
        clientId="growth-assist"
        companyId="company-1"
        finalBriefRunId="run-1"
        hasFinalizedBrief
        currentUser={{
          id: 'user-1',
          email: 'mike@example.com',
          app_metadata: { portal_role: 'viewer' }
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Move assignment to Nurture' }));

    await waitFor(() => {
      expect(supabaseDataService.updateBriefAssignmentStatus).toHaveBeenCalledWith({
        assignmentId: 'assignment-1',
        status: 'nurture'
      });
    });
  });
});
