import supabaseAdmin from '../utils/supabaseAdmin.js';

const CONFIG_TABLE = 'portal_client_qualifier_config';
const UPSTREAM_TIMEOUT_MS = 20_000;

export class PortalQualifierError extends Error {
  constructor(code, message, status = 500, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = 'PortalQualifierError';
    this.code = code;
    this.status = status;
  }
}

const isLocalHostname = (hostname) => {
  const normalized = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
};

const isPrivateNetworkHostname = (hostname) => {
  const normalized = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (isLocalHostname(normalized) || normalized.endsWith('.local') || normalized.includes(':')) return true;

  const octets = normalized.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return octets[0] === 0
    || octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
};

export const buildPortalQualifierRequestBody = (body = {}) => {
  let website;
  try {
    website = new URL(String(body.website || '').trim());
  } catch {
    throw new PortalQualifierError('QUALIFIER_REQUEST_INVALID', 'A valid website URL is required.', 400);
  }

  if (
    !['http:', 'https:'].includes(website.protocol)
    || !website.hostname
    || website.username
    || website.password
    || isPrivateNetworkHostname(website.hostname)
  ) {
    throw new PortalQualifierError('QUALIFIER_REQUEST_INVALID', 'A valid website URL is required.', 400);
  }

  return {
    website: website.toString(),
    campaign_id: 'website_enquiry',
    signal_type: 'website',
    signal_sentiment_level: 'positive',
    signal_summary: 'Website enquiry submitted through LeadScout Portal'
  };
};

export const normalizeQualifierBaseUrl = (value, { allowLocalHttp = false } = {}) => {
  let parsed;
  try {
    parsed = new URL(String(value || '').trim());
  } catch {
    throw new PortalQualifierError(
      'CLIENT_QUALIFIER_CONFIG_INVALID',
      'Quick Qualify configuration is invalid for this client.',
      503
    );
  }

  const localHttpAllowed = allowLocalHttp && parsed.protocol === 'http:' && isLocalHostname(parsed.hostname);
  if (parsed.protocol !== 'https:' && !localHttpAllowed) {
    throw new PortalQualifierError(
      'CLIENT_QUALIFIER_CONFIG_INVALID',
      'Quick Qualify configuration is invalid for this client.',
      503
    );
  }

  if (
    parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || !['', '/'].includes(parsed.pathname)
    || (!localHttpAllowed && isPrivateNetworkHostname(parsed.hostname))
  ) {
    throw new PortalQualifierError(
      'CLIENT_QUALIFIER_CONFIG_INVALID',
      'Quick Qualify configuration is invalid for this client.',
      503
    );
  }

  return parsed.origin;
};

export const getPortalClientQualifierConfig = async (
  clientId,
  { database = supabaseAdmin, allowLocalHttp = process.env.NODE_ENV !== 'production' } = {}
) => {
  const normalizedClientId = String(clientId || '').trim();
  if (!normalizedClientId) {
    throw new PortalQualifierError(
      'CLIENT_QUALIFIER_NOT_CONFIGURED',
      'Quick Qualify has not been configured for this client.',
      503
    );
  }

  const { data, error } = await database
    .from(CONFIG_TABLE)
    .select('client_id, qualifier_base_url, is_active')
    .eq('client_id', normalizedClientId)
    .maybeSingle();

  if (error) {
    throw new PortalQualifierError(
      'CLIENT_QUALIFIER_CONFIG_UNAVAILABLE',
      'Quick Qualify configuration could not be loaded.',
      503,
      error
    );
  }

  if (!data) {
    throw new PortalQualifierError(
      'CLIENT_QUALIFIER_NOT_CONFIGURED',
      'Quick Qualify has not been configured for this client.',
      503
    );
  }

  if (data.is_active !== true) {
    throw new PortalQualifierError(
      'CLIENT_QUALIFIER_DISABLED',
      'Quick Qualify is disabled for this client.',
      503
    );
  }

  return {
    clientId: normalizedClientId,
    baseUrl: normalizeQualifierBaseUrl(data.qualifier_base_url, { allowLocalHttp })
  };
};

const readUpstreamPayload = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new PortalQualifierError(
      'QUALIFIER_UPSTREAM_INVALID_RESPONSE',
      'The Quick Qualify service returned an invalid response.',
      502
    );
  }
};

const requestUpstream = async (url, options, fetchImpl) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    return { status: response.status, payload: await readUpstreamPayload(response) };
  } catch (error) {
    if (error instanceof PortalQualifierError) throw error;
    throw new PortalQualifierError(
      'QUALIFIER_UPSTREAM_UNAVAILABLE',
      'The Quick Qualify service is currently unavailable.',
      502,
      error
    );
  } finally {
    clearTimeout(timeout);
  }
};

export const startPortalQualification = async (
  clientId,
  requestBody,
  { database = supabaseAdmin, fetchImpl = fetch, allowLocalHttp } = {}
) => {
  const config = await getPortalClientQualifierConfig(clientId, { database, allowLocalHttp });
  const normalizedRequestBody = buildPortalQualifierRequestBody(requestBody);
  return requestUpstream(`${config.baseUrl}/run`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(normalizedRequestBody)
  }, fetchImpl);
};

export const getPortalQualificationStatus = async (
  clientId,
  transactionId,
  { database = supabaseAdmin, fetchImpl = fetch, allowLocalHttp } = {}
) => {
  const normalizedTransactionId = String(transactionId || '').trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalizedTransactionId)) {
    throw new PortalQualifierError('QUALIFIER_JOB_INVALID', 'The qualification job identifier is invalid.', 400);
  }

  const config = await getPortalClientQualifierConfig(clientId, { database, allowLocalHttp });
  return requestUpstream(
    `${config.baseUrl}/runs/${encodeURIComponent(normalizedTransactionId)}`,
    { method: 'GET', headers: { 'Accept': 'application/json' } },
    fetchImpl
  );
};
