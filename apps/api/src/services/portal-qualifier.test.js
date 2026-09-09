import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPortalQualifierRequestBody,
  getPortalClientQualifierConfig,
  getPortalQualificationStatus,
  normalizeQualifierBaseUrl,
  startPortalQualification
} from './portal-qualifier.js';

const databaseWith = (data, error = null) => ({
  from(table) {
    assert.equal(table, 'portal_client_qualifier_config');
    return {
      select() { return this; },
      eq(column, value) {
        assert.equal(column, 'client_id');
        assert.equal(value, 'ultraict');
        return this;
      },
      maybeSingle: async () => ({ data, error })
    };
  }
});

const jsonResponse = (status, payload) => ({
  status,
  text: async () => JSON.stringify(payload)
});

describe('portal qualifier configuration', () => {
  it('normalizes and whitelists the qualifier request body', () => {
    assert.deepEqual(buildPortalQualifierRequestBody({
      website: 'https://example.com',
      campaign_id: 'browser_override',
      client_id: 'attacker-selected-client',
      qualifier_base_url: 'https://attacker.example'
    }), {
      website: 'https://example.com/',
      campaign_id: 'website_enquiry',
      signal_type: 'website',
      signal_sentiment_level: 'positive',
      signal_summary: 'Website enquiry submitted through LeadScout Portal'
    });
    assert.throws(
      () => buildPortalQualifierRequestBody({ website: 'file:///tmp/data' }),
      { code: 'QUALIFIER_REQUEST_INVALID' }
    );
    assert.throws(
      () => buildPortalQualifierRequestBody({ website: 'http://127.0.0.1/private' }),
      { code: 'QUALIFIER_REQUEST_INVALID' }
    );
  });

  it('normalizes a secure origin and rejects paths or insecure deployed URLs', () => {
    assert.equal(
      normalizeQualifierBaseUrl('https://ultraict.growth-assist.co.uk/'),
      'https://ultraict.growth-assist.co.uk'
    );
    assert.throws(
      () => normalizeQualifierBaseUrl('https://ultraict.growth-assist.co.uk/run'),
      { code: 'CLIENT_QUALIFIER_CONFIG_INVALID' }
    );
    assert.throws(
      () => normalizeQualifierBaseUrl('http://ultraict.growth-assist.co.uk'),
      { code: 'CLIENT_QUALIFIER_CONFIG_INVALID' }
    );
  });

  it('loads the active UltraICT mapping without a fallback', async () => {
    const result = await getPortalClientQualifierConfig('ultraict', {
      database: databaseWith({
        client_id: 'ultraict',
        qualifier_base_url: 'https://ultraict.growth-assist.co.uk/',
        is_active: true
      })
    });

    assert.deepEqual(result, {
      clientId: 'ultraict',
      baseUrl: 'https://ultraict.growth-assist.co.uk'
    });
  });

  it('distinguishes missing and disabled client configuration', async () => {
    await assert.rejects(
      getPortalClientQualifierConfig('ultraict', { database: databaseWith(null) }),
      { code: 'CLIENT_QUALIFIER_NOT_CONFIGURED' }
    );
    await assert.rejects(
      getPortalClientQualifierConfig('ultraict', {
        database: databaseWith({
          client_id: 'ultraict',
          qualifier_base_url: 'https://ultraict.growth-assist.co.uk',
          is_active: false
        })
      }),
      { code: 'CLIENT_QUALIFIER_DISABLED' }
    );
  });
});

describe('portal qualifier proxy', () => {
  const database = databaseWith({
    client_id: 'ultraict',
    qualifier_base_url: 'https://ultraict.growth-assist.co.uk',
    is_active: true
  });

  it('submits to the configured UltraICT origin', async () => {
    const fetchImpl = async (url, options) => {
      assert.equal(url, 'https://ultraict.growth-assist.co.uk/run');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), {
        website: 'https://example.com/',
        campaign_id: 'website_enquiry',
        signal_type: 'website',
        signal_sentiment_level: 'positive',
        signal_summary: 'Website enquiry submitted through LeadScout Portal'
      });
      return jsonResponse(202, { transaction_id: 'txn_123', status: 'queued' });
    };

    const result = await startPortalQualification(
      'ultraict',
      { website: 'https://example.com/' },
      { database, fetchImpl }
    );

    assert.equal(result.status, 202);
    assert.equal(result.payload.transaction_id, 'txn_123');
  });

  it('polls the same client-specific origin', async () => {
    const fetchImpl = async (url, options) => {
      assert.equal(url, 'https://ultraict.growth-assist.co.uk/runs/txn_123');
      assert.equal(options.method, 'GET');
      return jsonResponse(200, { transaction_id: 'txn_123', status: 'processing' });
    };

    const result = await getPortalQualificationStatus(
      'ultraict',
      'txn_123',
      { database, fetchImpl }
    );

    assert.equal(result.status, 200);
    assert.equal(result.payload.status, 'processing');
  });

  it('rejects a transaction identifier that could alter the upstream path', async () => {
    await assert.rejects(
      getPortalQualificationStatus('ultraict', '../other-client', { database, fetchImpl: assert.fail }),
      { code: 'QUALIFIER_JOB_INVALID' }
    );
  });
});
