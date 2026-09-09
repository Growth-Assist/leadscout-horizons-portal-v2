import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompanyQualifierPage from './CompanyQualifierPage.jsx';
import {
  clearActiveQualifierJob,
  getCompanyQualifierStatus,
  loadActiveQualifierJob,
  pollCompanyQualifier,
  saveActiveQualifierJob,
  submitCompanyQualifier
} from '@/services/companyQualifierService.js';

vi.mock('@/contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    currentUser: { email: 'demo@growth-assist.co.uk' },
    client_id: 'ultraict',
    session: { access_token: 'test-access-token' },
    logout: vi.fn()
  })
}));

vi.mock('@/services/companyQualifierService.js', async () => {
  const actual = await vi.importActual('@/services/companyQualifierService.js');
  return {
    ...actual,
    clearActiveQualifierJob: vi.fn(),
    getCompanyQualifierStatus: vi.fn(),
    loadActiveQualifierJob: vi.fn(),
    pollCompanyQualifier: vi.fn(),
    saveActiveQualifierJob: vi.fn(),
    submitCompanyQualifier: vi.fn()
  };
});

const job = {
  transaction_id: 'txn_123',
  status_url: '/api/portal/quick-qualify/runs/txn_123',
  website: 'https://quins.co.uk/',
  submitted_at: '2026-08-04T12:00:00.000Z'
};

const result = {
  company_id: 'quins.co.uk',
  company_name: 'Harlequins',
  website: 'https://www.quins.co.uk/',
  industry: 'Spectator sports',
  fit_score: 103,
  decision: 'target',
  rationale: ['Industry +67', 'External signal +10'],
  contacts: {
    contacts: [{ name: 'Sarah Carey', role: 'Commercial Director', email: 'sarah@example.com' }]
  },
  brief: '## Sales Executive Summary\n\nHarlequins is commercially relevant.',
  final_brief_url: 'https://poc.growth-assist.co.uk/outputs/final-brief/quins.co.uk/pdf-share',
  extended_brief_generated: true,
  quick_qualify_summary: {
    company_name: 'Harlequins',
    website: 'https://www.quins.co.uk/',
    industry: 'Spectator sports',
    fit_score: 103,
    decision: 'target',
    executive_summary: 'Harlequins is commercially relevant.',
    why_now: [
      'A new commercial partnership creates a timely opening.',
      'The club is reviewing its account priorities.',
      'Its regional reach supports targeted outreach.',
      'This fourth signal should not be displayed.'
    ],
    primary_contact: {
      name: 'Sarah Carey',
      role: 'Commercial Director',
      confidence: 'high',
      email: 'sarah@example.com',
      phone: '+44 161 555 0100',
      linkedin: 'https://www.linkedin.com/in/sarah-carey'
    },
    next_best_action: 'Invite Sarah to a short account-prioritisation conversation.'
  }
};

const renderPage = () => render(
  <MemoryRouter>
    <CompanyQualifierPage />
  </MemoryRouter>
);

const submitWebsite = (website = 'quins.co.uk') => {
  fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: website } });
  fireEvent.click(screen.getByRole('button', { name: /qualify/i }));
};

describe('CompanyQualifierPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadActiveQualifierJob.mockReturnValue(null);
  });

  it('blocks invalid website submissions', async () => {
    renderPage();
    submitWebsite('not-a-domain');

    expect(await screen.findByText('Enter a valid website URL.')).toBeInTheDocument();
    expect(submitCompanyQualifier).not.toHaveBeenCalled();
  });

  it('renders an immediate 200 qualifier response', async () => {
    submitCompanyQualifier.mockResolvedValue({ kind: 'completed', result });
    renderPage();
    submitWebsite();

    await waitFor(() => expect(submitCompanyQualifier).toHaveBeenCalledWith(
      'https://quins.co.uk/',
      { accessToken: 'test-access-token' }
    ));
    expect(await screen.findByText('Harlequins')).toBeInTheDocument();
    expect(screen.getByText('Spectator sports')).toBeInTheDocument();
    expect(screen.getByText('target')).toBeInTheDocument();
    expect(screen.getByText('Fit score 103')).toBeInTheDocument();
    expect(screen.getByText('Sarah Carey')).toBeInTheDocument();
    expect(screen.getByText(/Harlequins is commercially relevant/)).toBeInTheDocument();
    expect(screen.getByText('A new commercial partnership creates a timely opening.')).toBeInTheDocument();
    expect(screen.queryByText('This fourth signal should not be displayed.')).not.toBeInTheDocument();
    expect(screen.getByText('Invite Sarah to a short account-prioritisation conversation.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'sarah@example.com' })).toHaveAttribute(
      'href',
      'mailto:sarah@example.com'
    );
    expect(screen.getByRole('link', { name: '+44 161 555 0100' })).toHaveAttribute(
      'href',
      'tel:+44 161 555 0100'
    );
    expect(screen.getByRole('link', { name: /linkedin profile/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/sarah-carey'
    );
    expect(screen.getByRole('link', { name: /view full brief/i })).toHaveAttribute(
      'href',
      '/briefs/quins.co.uk'
    );
    expect(screen.queryByText('Raw JSON')).not.toBeInTheDocument();
    expect(screen.queryByText('Generated sales brief')).not.toBeInTheDocument();
  });

  it('renders fields from nested raw JSON-string response data', async () => {
    submitCompanyQualifier.mockResolvedValue({
      kind: 'completed',
      result: {
        _raw: {
          company_name: 'Raw Fallback Name',
          research: JSON.stringify({
            name: 'Saracens',
            website: 'https://saracens.com/',
            industry: 'Professional sports club'
          }),
          score: JSON.stringify({
            fit_score: 92,
            decision: 'target',
            rationale: ['Operational alignment +5']
          }),
          final_brief_url: 'https://poc.growth-assist.co.uk/outputs/final-brief/saracens.com/pdf-share'
        },
        brief: '## Sales Executive Summary\n\nSaracens is commercially relevant.'
      }
    });
    renderPage();
    submitWebsite('saracens.com');

    expect(await screen.findByText('Saracens')).toBeInTheDocument();
    expect(screen.getByText('Professional sports club')).toBeInTheDocument();
    expect(screen.getByText('Fit score 92')).toBeInTheDocument();
    expect(screen.getByText('Saracens is commercially relevant.')).toBeInTheDocument();
    expect(screen.getByText('Detailed research is not available for this qualification yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view full brief/i })).not.toBeInTheDocument();
  });

  it('omits an unavailable primary contact and full-brief action cleanly', async () => {
    submitCompanyQualifier.mockResolvedValue({
      kind: 'completed',
      result: {
        company_id: 'example.com',
        extended_brief_generated: false,
        contacts: {
          contacts: [{ name: 'Legacy Contact', role: 'Director' }]
        },
        quick_qualify_summary: {
          company_name: 'Example Company',
          industry: 'Business services',
          fit_score: 71,
          decision: 'watch',
          executive_summary: 'A potentially relevant account.',
          why_now: [],
          primary_contact: null,
          next_best_action: ''
        }
      }
    });
    renderPage();
    submitWebsite('example.com');

    expect(await screen.findByText('Example Company')).toBeInTheDocument();
    expect(screen.queryByText('Primary contact')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view full brief/i })).not.toBeInTheDocument();
    expect(screen.getByText('Detailed research is not available for this qualification yet.')).toBeInTheDocument();
  });

  it('polls a queued submission through to the existing result UI', async () => {
    submitCompanyQualifier.mockResolvedValue({ kind: 'queued', job });
    pollCompanyQualifier.mockImplementation(async (_job, options) => {
      options.onStatus({ status: 'processing', stage: 'research' });
      return { kind: 'completed', result };
    });
    renderPage();
    submitWebsite();

    await waitFor(() => expect(saveActiveQualifierJob).toHaveBeenCalledWith(job, { clientId: 'ultraict' }));
    expect(await screen.findByText('Harlequins')).toBeInTheDocument();
    expect(pollCompanyQualifier).toHaveBeenCalledWith(job, expect.objectContaining({
      signal: expect.any(AbortSignal),
      accessToken: 'test-access-token',
      onStatus: expect.any(Function),
      onTransientError: expect.any(Function)
    }));
    expect(clearActiveQualifierJob).toHaveBeenCalledWith({ clientId: 'ultraict' });
  });

  it('shows a safe backend failure and clears the terminal job', async () => {
    submitCompanyQualifier.mockResolvedValue({ kind: 'queued', job });
    pollCompanyQualifier.mockRejectedValue(new Error('Research could not be completed.'));
    renderPage();
    submitWebsite();

    expect(await screen.findByText('Research could not be completed.')).toBeInTheDocument();
    expect(clearActiveQualifierJob).toHaveBeenCalledWith({ clientId: 'ultraict' });
  });

  it('keeps the job active through a transient polling interruption', async () => {
    submitCompanyQualifier.mockResolvedValue({ kind: 'queued', job });
    pollCompanyQualifier.mockImplementation((_job, options) => {
      options.onTransientError(new Error('offline'));
      return new Promise(() => {});
    });
    renderPage();
    submitWebsite();

    expect(await screen.findByText('Connection interrupted — retrying automatically...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^qualify$/i })).toBeDisabled();
    expect(clearActiveQualifierJob).not.toHaveBeenCalled();
  });

  it('restores and resumes a persisted job after reload', async () => {
    loadActiveQualifierJob.mockReturnValue(job);
    pollCompanyQualifier.mockResolvedValue({ kind: 'completed', result });
    renderPage();

    await waitFor(() => expect(pollCompanyQualifier).toHaveBeenCalledWith(
      job,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    ));
    expect(await screen.findByText('Harlequins')).toBeInTheDocument();
    expect(clearActiveQualifierJob).toHaveBeenCalledWith({ clientId: 'ultraict' });
  });

  it('stops automatic polling for a delayed job and checks status on demand', async () => {
    submitCompanyQualifier.mockResolvedValue({ kind: 'queued', job });
    pollCompanyQualifier.mockResolvedValue({ kind: 'delayed', job });
    getCompanyQualifierStatus.mockResolvedValue({ status: 'completed', result });
    renderPage();
    submitWebsite();

    const checkButton = await screen.findByRole('button', { name: /check status/i });
    expect(screen.getByText('This qualification is taking longer than expected.')).toBeInTheDocument();
    fireEvent.click(checkButton);

    expect(await screen.findByText('Harlequins')).toBeInTheDocument();
    expect(getCompanyQualifierStatus).toHaveBeenCalledWith(job, { accessToken: 'test-access-token' });
    expect(clearActiveQualifierJob).toHaveBeenCalledWith({ clientId: 'ultraict' });
  });

  it('blocks duplicate submissions while a queued job is active', async () => {
    submitCompanyQualifier.mockResolvedValue({ kind: 'queued', job });
    pollCompanyQualifier.mockReturnValue(new Promise(() => {}));
    renderPage();
    submitWebsite();

    const button = await screen.findByRole('button', { name: /^qualify$/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(submitCompanyQualifier).toHaveBeenCalledTimes(1);
  });
});
