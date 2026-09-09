import apiServerClient from '@/lib/apiServerClient.js';

export const COMPANY_QUALIFIER_ENDPOINT = '/api/portal/quick-qualify/runs';
export const QUALIFIER_POLL_INTERVAL_MS = 3000;
export const QUALIFIER_MAX_AUTO_POLL_MS = 15 * 60 * 1000;
export const QUALIFIER_JOB_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const QUALIFIER_STORAGE_KEY_PREFIX = 'leadscout.quick-qualify.active-job.v2';

export const WEBSITE_ENQUIRY_METADATA = {
  campaign_id: 'website_enquiry',
  signal_type: 'website',
  signal_sentiment_level: 'positive',
  signal_summary: 'Website enquiry submitted through LeadScout Portal'
};

export const normalizeWebsiteInput = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    throw new Error('Enter a website URL.');
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed;

  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error('Enter a valid website URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw new Error('Enter a valid website URL.');
  }

  return parsed.toString();
};

export const buildCompanyQualifierRequestBody = (website) => ({
  website: normalizeWebsiteInput(website),
  ...WEBSITE_ENQUIRY_METADATA
});

const readErrorDetails = async (response) => {
  try {
    const text = await response.text();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      const errorValue = parsed?.error;
      return {
        code: parsed?.code || (typeof errorValue === 'object' ? errorValue?.code : undefined),
        message: parsed?.message
          || (typeof errorValue === 'object' ? errorValue?.message : errorValue)
          || text
      };
    } catch {
      return { message: text };
    }
  } catch {
    return {};
  }
};

const createRequestError = (message, status, transient = false, code = null) => {
  const error = new Error(message);
  error.status = status;
  error.transient = transient;
  error.code = code;
  return error;
};

export const resolveCompanyQualifierStatusUrl = (statusUrl, transactionId = '') => {
  const value = String(statusUrl || '').trim();
  const expectedTransactionId = String(transactionId || '').trim();
  const match = value.match(/^\/api\/portal\/quick-qualify\/runs\/([A-Za-z0-9_-]{1,128})$/);
  if (!match || (expectedTransactionId && match[1] !== expectedTransactionId)) {
    throw new Error('Qualifier queue response included an invalid status URL.');
  }
  return value;
};

const normalizeQueuedJob = (payload, website) => {
  const transactionId = String(payload?.transaction_id || '').trim();
  if (!transactionId) {
    throw new Error('Qualifier queue response did not include a transaction ID.');
  }

  const submittedAt = payload?.submitted_at || new Date().toISOString();
  if (Number.isNaN(Date.parse(submittedAt))) {
    throw new Error('Qualifier queue response included an invalid submission time.');
  }

  return {
    transaction_id: transactionId,
    status_url: resolveCompanyQualifierStatusUrl(payload?.status_url, transactionId),
    website: normalizeWebsiteInput(website),
    submitted_at: submittedAt
  };
};

export const submitCompanyQualifier = async (website, options = {}) => {
  const { fetchImpl = apiServerClient.fetch, signal, accessToken } = options;
  if (!accessToken) {
    throw createRequestError('Your portal session is unavailable. Please sign in again.', 401, false, 'PORTAL_AUTH_REQUIRED');
  }
  const body = buildCompanyQualifierRequestBody(website);
  const response = await fetchImpl(COMPANY_QUALIFIER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const details = await readErrorDetails(response);
    throw createRequestError(
      details.message || `Company qualifier failed with status ${response.status}.`,
      response.status,
      response.status >= 500 && !String(details.code || '').startsWith('CLIENT_QUALIFIER_'),
      details.code
    );
  }

  const payload = await response.json();
  if (response.status === 202) {
    return {
      kind: 'queued',
      job: normalizeQueuedJob(payload, website)
    };
  }

  return {
    kind: 'completed',
    result: payload
  };
};

export const getCompanyQualifierStatus = async (job, options = {}) => {
  const { fetchImpl = apiServerClient.fetch, signal, accessToken } = options;
  if (!accessToken) {
    throw createRequestError('Your portal session is unavailable. Please sign in again.', 401, false, 'PORTAL_AUTH_REQUIRED');
  }
  const statusUrl = resolveCompanyQualifierStatusUrl(job?.status_url, job?.transaction_id);
  let response;

  try {
    response = await fetchImpl(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createRequestError('Unable to reach the qualifier status service.', null, true);
  }

  if (!response.ok) {
    const details = await readErrorDetails(response);
    throw createRequestError(
      details.message || (response.status === 404
        ? 'This qualification job could not be found.'
        : `Unable to check qualification status (${response.status}).`),
      response.status,
      (response.status >= 500 || response.status === 429)
        && !String(details.code || '').startsWith('CLIENT_QUALIFIER_'),
      details.code
    );
  }

  const payload = await response.json();
  const status = String(payload?.status || '').toLowerCase();
  if (!['queued', 'processing', 'completed', 'failed'].includes(status)) {
    throw createRequestError('Qualifier status response was not recognised.', response.status, false);
  }

  return {
    ...payload,
    status,
    transaction_id: payload.transaction_id || job.transaction_id
  };
};

const waitForPollInterval = (delayMs, signal, sleepImpl) => {
  if (sleepImpl) return sleepImpl(delayMs, signal);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
};

export const pollCompanyQualifier = async (job, options = {}) => {
  const {
    fetchImpl = apiServerClient.fetch,
    signal,
    accessToken,
    intervalMs = QUALIFIER_POLL_INTERVAL_MS,
    maxDurationMs = QUALIFIER_MAX_AUTO_POLL_MS,
    now = () => Date.now(),
    sleepImpl,
    onStatus = () => {},
    onTransientError = () => {}
  } = options;
  const startedAt = now();
  let lastStatus = null;

  while (now() - startedAt < maxDurationMs) {
    try {
      const statusPayload = await getCompanyQualifierStatus(job, {
        fetchImpl,
        signal,
        accessToken
      });
      lastStatus = statusPayload;

      if (statusPayload.status === 'completed') {
        if (!statusPayload.result || typeof statusPayload.result !== 'object') {
          throw createRequestError('Completed qualification did not include a result.', 200, false);
        }
        return { kind: 'completed', result: statusPayload.result, status: statusPayload };
      }

      if (statusPayload.status === 'failed') {
        throw createRequestError(
          statusPayload.error || 'The qualification job failed.',
          200,
          false
        );
      }

      onStatus(statusPayload);
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      if (!error?.transient) throw error;
      onTransientError(error);
    }

    await waitForPollInterval(intervalMs, signal, sleepImpl);
  }

  return { kind: 'delayed', job, status: lastStatus };
};

export const getQualifierStorageKey = (clientId) => {
  const scope = String(clientId || '').trim();
  if (!scope) throw new Error('A client scope is required for Quick Qualify storage.');
  return `${QUALIFIER_STORAGE_KEY_PREFIX}:${encodeURIComponent(scope)}`;
};

export const saveActiveQualifierJob = (
  job,
  { clientId, storage = globalThis.localStorage } = {}
) => {
  storage?.setItem(getQualifierStorageKey(clientId), JSON.stringify(job));
};

export const clearActiveQualifierJob = (
  { clientId, storage = globalThis.localStorage } = {}
) => {
  storage?.removeItem(getQualifierStorageKey(clientId));
};

export const loadActiveQualifierJob = (
  { clientId, storage = globalThis.localStorage, now = () => Date.now() } = {}
) => {
  const raw = storage?.getItem(getQualifierStorageKey(clientId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const submittedAt = Date.parse(parsed?.submitted_at || '');
    if (
      !parsed?.transaction_id
      || !parsed?.status_url
      || !parsed?.website
      || Number.isNaN(submittedAt)
      || now() - submittedAt >= QUALIFIER_JOB_MAX_AGE_MS
    ) {
      clearActiveQualifierJob({ clientId, storage });
      return null;
    }

    return {
      transaction_id: String(parsed.transaction_id),
      status_url: resolveCompanyQualifierStatusUrl(parsed.status_url, parsed.transaction_id),
      website: normalizeWebsiteInput(parsed.website),
      submitted_at: new Date(submittedAt).toISOString()
    };
  } catch {
    clearActiveQualifierJob({ clientId, storage });
    return null;
  }
};

// Backwards-compatible name for callers that previously submitted the qualifier directly.
export const runCompanyQualifier = submitCompanyQualifier;
