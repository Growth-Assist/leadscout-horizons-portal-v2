import { describe, expect, it, vi } from 'vitest';
import {
  buildCompanyQualifierRequestBody,
  COMPANY_QUALIFIER_ENDPOINT,
  normalizeWebsiteInput,
  runCompanyQualifier
} from './companyQualifierService.js';

describe('companyQualifierService', () => {
  it('normalizes website URLs', () => {
    expect(normalizeWebsiteInput('example.com')).toBe('https://example.com/');
    expect(normalizeWebsiteInput(' https://example.com/path ')).toBe('https://example.com/path');
  });

  it('rejects invalid website URLs', () => {
    expect(() => normalizeWebsiteInput('')).toThrow('Enter a website URL.');
    expect(() => normalizeWebsiteInput('not-a-domain')).toThrow('Enter a valid website URL.');
  });

  it('builds the request body with fixed website enquiry metadata', () => {
    expect(buildCompanyQualifierRequestBody('example.com')).toEqual({
      website: 'https://example.com/',
      campaign_id: 'website_enquiry',
      signal_type: 'website',
      signal_sentiment_level: 'positive',
      signal_summary: 'Website enquiry example.growth-assist.co.uk'
    });
  });

  it('posts the fixed metadata body to the direct qualifier endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ company_name: 'Example Co' })
    });

    await runCompanyQualifier('https://example.com', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(COMPANY_QUALIFIER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        website: 'https://example.com/',
        campaign_id: 'website_enquiry',
        signal_type: 'website',
        signal_sentiment_level: 'positive',
        signal_summary: 'Website enquiry example.growth-assist.co.uk'
      })
    });
  });
});
