import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCompanyQualifierRequestBody,
  clearActiveQualifierJob,
  COMPANY_QUALIFIER_BASE_URL,
  COMPANY_QUALIFIER_ENDPOINT,
  DEFAULT_COMPANY_QUALIFIER_BASE_URL,
  getCompanyQualifierStatus,
  loadActiveQualifierJob,
  normalizeCompanyQualifierBaseUrl,
  normalizeWebsiteInput,
  pollCompanyQualifier,
  QUALIFIER_JOB_MAX_AGE_MS,
  QUALIFIER_STORAGE_KEY,
  resolveCompanyQualifierStatusUrl,
  saveActiveQualifierJob,
  submitCompanyQualifier
} from './companyQualifierService.js';

const job = {
  transaction_id: 'txn_123',
  status_url: 'https://poc.growth-assist.co.uk/runs/txn_123',
  website: 'https://example.com/',
  submitted_at: '2026-08-04T12:00:00.000Z'
};

const response = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(payload),
  text: vi.fn().mockResolvedValue(JSON.stringify(payload))
});

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
      signal_summary: 'Website enquiry example.growth-assist.co.uk'
    });
  });

  it('uses the production qualifier URL by default', () => {
    expect(DEFAULT_COMPANY_QUALIFIER_BASE_URL).toBe('https://poc.growth-assist.co.uk');
    expect(COMPANY_QUALIFIER_BASE_URL).toBe(DEFAULT_COMPANY_QUALIFIER_BASE_URL);
    expect(COMPANY_QUALIFIER_ENDPOINT).toBe('https://poc.growth-assist.co.uk/run');
  });

  it('normalizes a configured ngrok qualifier URL', () => {
    expect(normalizeCompanyQualifierBaseUrl(
      '  https://unyearning-canonlike-donn.ngrok-free.dev///  '
    )).toBe('https://unyearning-canonlike-donn.ngrok-free.dev');
  });

  it('rejects an invalid qualifier backend URL', () => {
    expect(() => normalizeCompanyQualifierBaseUrl('not-a-url')).toThrow(
      'VITE_COMPANY_QUALIFIER_BASE_URL must be a valid HTTP or HTTPS URL.'
    );
    expect(() => normalizeCompanyQualifierBaseUrl('file:///tmp/qualifier')).toThrow(
      'VITE_COMPANY_QUALIFIER_BASE_URL must be a valid HTTP or HTTPS URL.'
    );
  });

  it('resolves relative polling URLs against the configured backend', () => {
    const ngrokBaseUrl = 'https://unyearning-canonlike-donn.ngrok-free.dev';
    expect(resolveCompanyQualifierStatusUrl('/runs/txn_123', ngrokBaseUrl)).toBe(
      'https://unyearning-canonlike-donn.ngrok-free.dev/runs/txn_123'
    );
  });

  it('rejects polling URLs from an origin other than the configured backend', () => {
    expect(() => resolveCompanyQualifierStatusUrl(
      'https://attacker.example/runs/txn_123',
      'https://unyearning-canonlike-donn.ngrok-free.dev'
    )).toThrow('Qualifier queue response included an untrusted status URL.');
  });

  it('posts to /run and returns an immediate 200 result', async () => {
    const result = { company_name: 'Example Co' };
    const fetchImpl = vi.fn().mockResolvedValue(response(200, result));

    await expect(submitCompanyQualifier('https://example.com', { fetchImpl })).resolves.toEqual({
      kind: 'completed',
      result
    });

    expect(fetchImpl).toHaveBeenCalledWith(COMPANY_QUALIFIER_ENDPOINT, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCompanyQualifierRequestBody('example.com'))
    }));
  });

  it('validates and normalizes a queued 202 response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(202, {
      status: 'queued',
      transaction_id: 'txn_123',
      status_url: '/runs/txn_123',
      submitted_at: job.submitted_at
    }));

    await expect(submitCompanyQualifier('example.com', { fetchImpl })).resolves.toEqual({
      kind: 'queued',
      job
    });
  });

  it('rejects a queued response without polling identifiers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(202, { status: 'queued' }));
    await expect(submitCompanyQualifier('example.com', { fetchImpl }))
      .rejects.toThrow('transaction ID');
  });

  it.each([
    ['queued', { stage: undefined }],
    ['processing', { stage: 'research' }],
    ['completed', { result: { company_name: 'Example Co' } }],
    ['failed', { error: 'Research failed.' }]
  ])('retrieves a %s status', async (status, extra) => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status, ...extra }));
    await expect(getCompanyQualifierStatus(job, { fetchImpl })).resolves.toMatchObject({
      transaction_id: 'txn_123',
      status,
      ...extra
    });
  });

  it('distinguishes unknown jobs from transient status errors', async () => {
    const missingFetch = vi.fn().mockResolvedValue(response(404, { error: 'Unknown transaction' }));
    await expect(getCompanyQualifierStatus(job, { fetchImpl: missingFetch }))
      .rejects.toMatchObject({ status: 404, transient: false });

    const unavailableFetch = vi.fn().mockResolvedValue(response(503, { error: 'Try again' }));
    await expect(getCompanyQualifierStatus(job, { fetchImpl: unavailableFetch }))
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
      sleepImpl: vi.fn().mockResolvedValue(),
      onTransientError
    })).resolves.toMatchObject({ kind: 'completed' });
    expect(onTransientError).toHaveBeenCalledOnce();
  });

  it('respects cancellation while waiting between polls', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status: 'queued' }));
    const promise = pollCompanyQualifier(job, { fetchImpl, signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns a delayed outcome after the automatic polling window', async () => {
    let clock = 0;
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status: 'processing', stage: 'research' }));
    const outcome = await pollCompanyQualifier(job, {
      fetchImpl,
      maxDurationMs: 10,
      now: () => clock,
      sleepImpl: async () => { clock = 10; }
    });
    expect(outcome).toMatchObject({ kind: 'delayed', job });
  });

  it('persists, restores, clears, and expires an active job', () => {
    saveActiveQualifierJob(job);
    expect(JSON.parse(localStorage.getItem(QUALIFIER_STORAGE_KEY))).toEqual(job);
    expect(loadActiveQualifierJob(localStorage, () => Date.parse(job.submitted_at) + 1000)).toEqual(job);

    expect(loadActiveQualifierJob(
      localStorage,
      () => Date.parse(job.submitted_at) + QUALIFIER_JOB_MAX_AGE_MS
    )).toBeNull();
    expect(localStorage.getItem(QUALIFIER_STORAGE_KEY)).toBeNull();

    saveActiveQualifierJob(job);
    clearActiveQualifierJob();
    expect(localStorage.getItem(QUALIFIER_STORAGE_KEY)).toBeNull();
  });
});
