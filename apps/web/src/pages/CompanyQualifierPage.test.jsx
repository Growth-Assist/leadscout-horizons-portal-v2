import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompanyQualifierPage from './CompanyQualifierPage.jsx';
import { runCompanyQualifier } from '@/services/companyQualifierService.js';

vi.mock('@/contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    currentUser: {
      email: 'demo@growth-assist.co.uk'
    },
    logout: vi.fn()
  })
}));

vi.mock('@/services/companyQualifierService.js', async () => {
  const actual = await vi.importActual('@/services/companyQualifierService.js');
  return {
    ...actual,
    runCompanyQualifier: vi.fn()
  };
});

const renderPage = () => render(
  <MemoryRouter>
    <CompanyQualifierPage />
  </MemoryRouter>
);

describe('CompanyQualifierPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('blocks invalid website submissions', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: 'not-a-domain' } });
    fireEvent.click(screen.getByRole('button', { name: /qualify/i }));

    expect(await screen.findByText('Enter a valid website URL.')).toBeInTheDocument();
    expect(runCompanyQualifier).not.toHaveBeenCalled();
  });

  it('renders a successful qualifier response', async () => {
    runCompanyQualifier.mockResolvedValue({
      company_name: 'Harlequins',
      website: 'https://www.quins.co.uk/',
      industry: 'Spectator sports',
      fit_score: 103,
      decision: 'target',
      rationale: ['Industry +67', 'External signal +10'],
      contacts: {
        contacts: [
          {
            name: 'Sarah Carey',
            role: 'Commercial Director',
            email: 'sarah@example.com'
          }
        ]
      },
      brief: '## Sales Executive Summary\n\nHarlequins is commercially relevant.',
      final_brief_url: 'https://poc.growth-assist.co.uk/outputs/final-brief/quins.co.uk/pdf-share'
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: 'quins.co.uk' } });
    fireEvent.click(screen.getByRole('button', { name: /qualify/i }));

    await waitFor(() => expect(runCompanyQualifier).toHaveBeenCalledWith('https://quins.co.uk/'));
    expect(await screen.findByText('Harlequins')).toBeInTheDocument();
    expect(screen.getByText('Spectator sports')).toBeInTheDocument();
    expect(screen.getByText('target')).toBeInTheDocument();
    expect(screen.getByText('Fit score 103')).toBeInTheDocument();
    expect(screen.getByText('Sarah Carey')).toBeInTheDocument();
    expect(screen.getByText(/Harlequins is commercially relevant/)).toBeInTheDocument();
  });

  it('renders fields from nested raw JSON-string response data', async () => {
    runCompanyQualifier.mockResolvedValue({
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
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: 'saracens.com' } });
    fireEvent.click(screen.getByRole('button', { name: /qualify/i }));

    expect(await screen.findByText('Saracens')).toBeInTheDocument();
    expect(screen.getByText('Professional sports club')).toBeInTheDocument();
    expect(screen.getByText('target')).toBeInTheDocument();
    expect(screen.getByText('Fit score 92')).toBeInTheDocument();
    expect(screen.getByText('Operational alignment +5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open final brief/i })).toHaveAttribute(
      'href',
      'https://poc.growth-assist.co.uk/outputs/final-brief/saracens.com/pdf-share'
    );
  });

  it('shows an error when the qualifier request fails', async () => {
    runCompanyQualifier.mockRejectedValue(new Error('CORS blocked this request.'));

    renderPage();

    fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /qualify/i }));

    expect(await screen.findByText('CORS blocked this request.')).toBeInTheDocument();
  });

  it('shows estimated progress and elapsed time while the run is loading', async () => {
    vi.useFakeTimers();
    runCompanyQualifier.mockReturnValue(new Promise(() => {}));

    renderPage();

    fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /qualify/i }));

    expect(screen.getByText('Estimated run progress')).toBeInTheDocument();
    expect(screen.getByText('Researching the company website and profile...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Estimated run progress' })).toHaveAttribute('aria-valuenow', '5');
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(61000);
    });

    expect(screen.getByText('Running for 61s')).toBeInTheDocument();
    expect(screen.getByText('Still running. Sales intelligence can take a little longer for complex sites.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Estimated run progress' })).toHaveAttribute('aria-valuenow', '95');
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });
});
