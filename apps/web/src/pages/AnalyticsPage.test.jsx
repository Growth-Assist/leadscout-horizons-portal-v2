import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ResponsiveContainer } from 'recharts';
import AnalyticsPage from './AnalyticsPage.jsx';
import supabaseDataService from '@/services/supabaseDataService.js';

const originalScrollIntoView = Element.prototype.scrollIntoView;

vi.mock('@/contexts/AuthContext.jsx', () => ({ useAuth: () => ({ client_id: 'test-client' }) }));
vi.mock('@/components/Header.jsx', () => ({ default: () => <header>Header</header> }));
vi.mock('@/components/Sidebar.jsx', () => ({ default: () => <aside>Sidebar</aside> }));
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal(),
  ResponsiveContainer: vi.fn(() => <div>Campaign chart</div>)
}));
vi.mock('@/services/supabaseDataService.js', () => ({
  default: {
    fetchPortalTargetAnalyticsSnapshot: vi.fn(),
    fetchManagementCommercialData: vi.fn(),
    fetchDashboardSummary: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
  ResponsiveContainer.mockImplementation(() => <div>Campaign chart</div>);
  supabaseDataService.fetchPortalTargetAnalyticsSnapshot.mockResolvedValue({
    total_target_companies: 8,
    generated_briefs: 8,
    signal_type_options: ['growth'],
    campaign_breakdown: [
      { id: 'Example campaign', count: 5, generated: 5 },
      { id: '', count: 3, generated: 3 }
    ]
  });
  supabaseDataService.fetchManagementCommercialData.mockResolvedValue({ feedback: [], averageDealSize: null });
  supabaseDataService.fetchDashboardSummary.mockResolvedValue({ data: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalScrollIntoView) Element.prototype.scrollIntoView = originalScrollIntoView;
  else delete Element.prototype.scrollIntoView;
});

it('renders loaded analytics with an unnamed campaign and keeps named campaigns filterable', async () => {
  render(<AnalyticsPage />);

  await screen.findByRole('cell', { name: 'Example campaign' });
  fireEvent.keyDown(screen.getAllByRole('combobox')[0], { key: 'Enter' });
  expect(await screen.findByRole('option', { name: 'Example campaign' })).toBeInTheDocument();
  expect(screen.getAllByRole('option')).toHaveLength(2);
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

  const unnamed = await screen.findByRole('cell', { name: 'Unassigned' });
  expect(screen.getByRole('heading', { name: 'Management Analytics' })).toBeInTheDocument();
  expect(unnamed.closest('tr')).toHaveTextContent('3');
  fireEvent.click(unnamed);
  expect(supabaseDataService.fetchPortalTargetAnalyticsSnapshot).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('cell', { name: 'Example campaign' }));
  await waitFor(() => expect(supabaseDataService.fetchPortalTargetAnalyticsSnapshot)
    .toHaveBeenLastCalledWith('test-client', 'Example campaign', null, null));
});

it('excludes blank, missing and duplicate filter values without losing campaign counts', async () => {
  supabaseDataService.fetchPortalTargetAnalyticsSnapshot.mockResolvedValue({
    campaign_breakdown: [
      { id: null, count: 2 }, { id: '   ', count: 3 }, { count: 4 },
      { id: 'Example campaign', count: 5 }, { id: 'Example campaign', count: 6 }
    ],
    signal_type_options: ['', null, '  ', 'growth', 'growth', 42, 'all']
  });
  render(<AnalyticsPage />);
  expect(await screen.findAllByRole('cell', { name: 'Unassigned' })).toHaveLength(3);
  fireEvent.keyDown(screen.getAllByRole('combobox')[0], { key: 'Enter' });
  expect(await screen.findAllByRole('option')).toHaveLength(2);
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
  fireEvent.keyDown(screen.getAllByRole('combobox')[1], { key: 'Enter' });
  expect(await screen.findByRole('option', { name: 'growth' })).toBeInTheDocument();
  expect(screen.getAllByRole('option')).toHaveLength(2);
});

it('shows recovery controls for a chart render failure and refetches on retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ResponsiveContainer.mockImplementation(() => { throw new Error('Chart rendering failed'); });
  render(<AnalyticsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Analytics could not be displayed');
  expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/overview');

  ResponsiveContainer.mockImplementation(() => <div>Campaign chart</div>);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Campaign chart')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(supabaseDataService.fetchPortalTargetAnalyticsSnapshot).toHaveBeenCalledTimes(2);
});
