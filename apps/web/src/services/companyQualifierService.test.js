import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCompanyQualifierRequestBody,
  clearActiveQualifierJob,
  COMPANY_QUALIFIER_ENDPOINT,
  getCompanyQualifierStatus,
  getQualifierStorageKey,
  loadActiveQualifierJob,
  normalizeWebsiteInput,
  pollCompanyQualifier,
  QUALIFIER_JOB_MAX_AGE_MS,
  resolveCompanyQualifierStatusUrl,
  saveActiveQualifierJob,
  submitCompanyQualifier
} from './companyQualifierService.js';

const job = {
  transaction_id: 'txn_123',
  status_url: '/api/portal/quick-qualify/runs/txn_123',
  website: 'https://example.com/',
  submitted_at: '2026-08-04T12:00:00.000Z'
};

const response = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(payload),
  text: vi.fn().mockResolvedValue(JSON.stringify(payload))
});

const authenticated = { accessToken: 'test-access-token' };
const clientId = 'ultraict';

describe('companyQualifierService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes website URLs and rejects invalid values', () => {
    expect(normalizeWebsiteInput('example.com')).toBe('https://example.com/');
    expect(normalizeWebsiteInput(' https://example.com/path ')).toBe('https://example.com/path');
    expect(() => normalizeWebsiteInput('')).toThrow('Enter a website URL.');
    expect(() => normalizeWebsiteInput('not-a-domain')).toThrow('Enter a valid website URL.');
  });

  it('builds the unchanged website enquiry request body', () => {
    expect(buildCompanyQualifierRequestBody('example.com')).toEqual({
      website: 'https://example.com/',
      campaign_id: 'website_enquiry',
      signal_type: 'website',
      signal_sentiment_level: 'positive',
      signal_summary: 'Website enquiry submitted through LeadScout Portal'
    });
  });

  it('uses the authenticated same-origin portal proxy', () => {
    expect(COMPANY_QUALIFIER_ENDPOINT).toBe('/api/portal/quick-qualify/runs');
  });

  it('accepts only portal-proxy polling URLs for the same transaction', () => {
    expect(resolveCompanyQualifierStatusUrl(job.status_url, job.transaction_id)).toBe(job.status_url);
  });

  it('rejects direct or mismatched polling URLs', () => {
    expect(() => resolveCompanyQualifierStatusUrl(
      'https://ultraict.growth-assist.co.uk/runs/txn_123',
      'txn_123'
    )).toThrow('invalid status URL');
    expect(() => resolveCompanyQualifierStatusUrl(
      '/api/portal/quick-qualify/runs/other_txn',
      'txn_123'
    )).toThrow('invalid status URL');
  });

  it('posts to /run and returns an immediate 200 result', async () => {
    const result = { company_name: 'Example Co' };
    const fetchImpl = vi.fn().mockResolvedValue(response(200, result));

    await expect(submitCompanyQualifier('https://example.com', { fetchImpl, ...authenticated })).resolves.toEqual({
      kind: 'completed',
      result
    });

    expect(fetchImpl).toHaveBeenCalledWith(COMPANY_QUALIFIER_ENDPOINT, expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-access-token'
      },
      body: JSON.stringify(buildCompanyQualifierRequestBody('example.com'))
    }));
  });

  it('validates and normalizes a queued 202 response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(202, {
      status: 'queued',
      transaction_id: 'txn_123',
      status_url: job.status_url,
      submitted_at: job.submitted_at
    }));

    await expect(submitCompanyQualifier('example.com', { fetchImpl, ...authenticated })).resolves.toEqual({
      kind: 'queued',
      job
    });
  });

  it('rejects a queued response without polling identifiers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(202, { status: 'queued' }));
    await expect(submitCompanyQualifier('example.com', { fetchImpl, ...authenticated }))
      .rejects.toThrow('transaction ID');
  });

  it.each([
    ['queued', { stage: undefined }],
    ['processing', { stage: 'research' }],
    ['completed', { result: { company_name: 'Example Co' } }],
    ['failed', { error: 'Research failed.' }]
  ])('retrieves a %s status', async (status, extra) => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status, ...extra }));
    await expect(getCompanyQualifierStatus(job, { fetchImpl, ...authenticated })).resolves.toMatchObject({
      transaction_id: 'txn_123',
      status,
      ...extra
    });
  });

  it('distinguishes unknown jobs from transient status errors', async () => {
    const missingFetch = vi.fn().mockResolvedValue(response(404, { error: 'Unknown transaction' }));
    await expect(getCompanyQualifierStatus(job, { fetchImpl: missingFetch, ...authenticated }))
      .rejects.toMatchObject({ status: 404, transient: false });

    const unavailableFetch = vi.fn().mockResolvedValue(response(503, { error: 'Try again' }));
    await expect(getCompanyQualifierStatus(job, { fetchImpl: unavailableFetch, ...authenticated }))
      .rejects.toMatchObject({ status: 503, transient: true });
  });

  it('polls through processing to completion in status order', async () => {
    const onStatus = vi.fn();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(200, { status: 'queued' }))
      .mockResolvedValueOnce(response(200, { status: 'processing', stage: 'research' }))
      .mockResolvedValueOnce(response(200, { status: 'completed', result: { company_name: 'Example Co' } }));

    await expect(pollCompanyQualifier(job, {
      fetchImpl,
      ...authenticated,
      sleepImpl: vi.fn().mockResolvedValue(),
      onStatus
    })).resolves.toMatchObject({ kind: 'completed', result: { company_name: 'Example Co' } });
    expect(onStatus.mock.calls.map(([value]) => value.status)).toEqual(['queued', 'processing']);
  });

  it('retains polling after a transient error', async () => {
    const onTransientError = vi.fn();
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(response(200, { status: 'completed', result: { company_name: 'Example Co' } }));

    await expect(pollCompanyQualifier(job, {
      fetchImpl,
      ...authenticated,
      sleepImpl: vi.fn().mockResolvedValue(),
      onTransientError
    })).resolves.toMatchObject({ kind: 'completed' });
    expect(onTransientError).toHaveBeenCalledOnce();
  });

  it('respects cancellation while waiting between polls', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status: 'queued' }));
    const promise = pollCompanyQualifier(job, { fetchImpl, signal: controller.signal, ...authenticated });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns a delayed outcome after the automatic polling window', async () => {
    let clock = 0;
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status: 'processing', stage: 'research' }));
    const outcome = await pollCompanyQualifier(job, {
      fetchImpl,
      ...authenticated,
      maxDurationMs: 10,
      now: () => clock,
      sleepImpl: async () => { clock = 10; }
    });
    expect(outcome).toMatchObject({ kind: 'delayed', job });
  });

  it('persists, restores, clears, and expires an active job', () => {
    const storageKey = getQualifierStorageKey(clientId);
    saveActiveQualifierJob(job, { clientId });
    expect(JSON.parse(localStorage.getItem(storageKey))).toEqual(job);
    expect(loadActiveQualifierJob({
      clientId,
      now: () => Date.parse(job.submitted_at) + 1000
    })).toEqual(job);

    expect(loadActiveQualifierJob({
      clientId,
      now: () => Date.parse(job.submitted_at) + QUALIFIER_JOB_MAX_AGE_MS
    })).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();

    saveActiveQualifierJob(job, { clientId });
    clearActiveQualifierJob({ clientId });
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('requires authentication and keeps persisted jobs client-scoped', async () => {
    await expect(submitCompanyQualifier('example.com', { fetchImpl: vi.fn() }))
      .rejects.toMatchObject({ code: 'PORTAL_AUTH_REQUIRED' });

    saveActiveQualifierJob(job, { clientId: 'ultraict' });
    expect(loadActiveQualifierJob({ clientId: 'another-client' })).toBeNull();
  });
});
