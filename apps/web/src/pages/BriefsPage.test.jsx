import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BriefsPage from './BriefsPage.jsx';
import supabaseDataService from '@/services/supabaseDataService.js';

vi.mock('@/contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    client_id: 'test-client',
    currentUser: {
      id: 'user-1',
      email: 'user@example.com',
      app_metadata: { portal_role: 'user' }
    }
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/components/Header.jsx', () => ({
  default: () => <header>Header</header>
}));

vi.mock('@/components/Sidebar.jsx', () => ({
  default: () => <aside>Sidebar</aside>
}));

vi.mock('@/components/BriefDetailDrawer.jsx', () => ({
  default: () => null
}));

vi.mock('@/components/BulkCloseBriefsDialog.jsx', () => ({
  default: () => null
}));

vi.mock('@/services/supabaseDataService.js', () => ({
  default: {
    fetchPortalTeamMembers: vi.fn(),
    fetchAllTargetCompanyDetails: vi.fn(),
    fetchBriefAssignments: vi.fn(),
    fetchAllCompanySignals: vi.fn(),
    fetchAllBriefFeedback: vi.fn(),
    fetchFinalBriefJsonForBriefs: vi.fn(),
    bulkCloseBriefAssignments: vi.fn()
  }
}));

describe('BriefsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseDataService.fetchPortalTeamMembers.mockResolvedValue([]);
    supabaseDataService.fetchAllTargetCompanyDetails.mockResolvedValue([
      {
        client_id: 'test-client',
        company_id: 'acme',
        final_brief_run_id: 'run-1',
        name: 'Acme Ltd',
        website: 'https://acme.example',
        industry: 'Manufacturing',
        fit_score: 88,
        decision: 'target',
        latest_logged_at: '2026-09-09T12:00:00.000Z',
        has_finalized_brief: true
      }
    ]);
    supabaseDataService.fetchBriefAssignments.mockResolvedValue([]);
    supabaseDataService.fetchAllCompanySignals.mockResolvedValue([]);
    supabaseDataService.fetchAllBriefFeedback.mockResolvedValue([]);
  });

  it('continues rendering when populated briefs have no location fields', async () => {
    render(
      <MemoryRouter initialEntries={['/briefs']}>
        <BriefsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Acme Ltd')).toBeInTheDocument();
    expect(screen.getByText('Manufacturing')).toBeInTheDocument();
    expect(screen.getByText('Briefs Ready For Review')).toBeInTheDocument();
  });
});
