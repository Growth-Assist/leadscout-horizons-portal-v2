export const DEFAULT_COMPANY_QUALIFIER_BASE_URL = 'https://poc.growth-assist.co.uk';

export const normalizeCompanyQualifierBaseUrl = (
  value,
  fallback = DEFAULT_COMPANY_QUALIFIER_BASE_URL
) => {
  const configuredValue = String(value || '').trim();
  const candidate = configuredValue || fallback;
  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('VITE_COMPANY_QUALIFIER_BASE_URL must be a valid HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('VITE_COMPANY_QUALIFIER_BASE_URL must be a valid HTTP or HTTPS URL.');
  }

  return parsed.toString().replace(/\/+$/, '');
};

export const COMPANY_QUALIFIER_BASE_URL = normalizeCompanyQualifierBaseUrl(
  import.meta.env.VITE_COMPANY_QUALIFIER_BASE_URL
);
export const COMPANY_QUALIFIER_ENDPOINT = `${COMPANY_QUALIFIER_BASE_URL}/run`;
export const QUALIFIER_POLL_INTERVAL_MS = 3000;
export const QUALIFIER_MAX_AUTO_POLL_MS = 15 * 60 * 1000;
export const QUALIFIER_JOB_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const QUALIFIER_STORAGE_KEY = 'leadscout.quick-qualify.active-job.v1';

if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
  console.info(`[Quick Qualify] API origin: ${COMPANY_QUALIFIER_BASE_URL}`);
}

export const WEBSITE_ENQUIRY_METADATA = {
  campaign_id: 'website_enquiry',
  signal_type: 'website',
  signal_sentiment_level: 'positive',
  signal_summary: 'Website enquiry example.growth-assist.co.uk'
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
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      return parsed?.error || parsed?.message || text;
    } catch {
      return text;
    }
  } catch {
    return '';
  }
};

const createRequestError = (message, status, transient = false) => {
  const error = new Error(message);
  error.status = status;
  error.transient = transient;
  return error;
};

export const resolveCompanyQualifierStatusUrl = (
  statusUrl,
  baseUrl = COMPANY_QUALIFIER_BASE_URL
) => {
  if (!statusUrl || typeof statusUrl !== 'string') {
    throw new Error('Qualifier queue response did not include a status URL.');
  }

  const trustedBaseUrl = normalizeCompanyQualifierBaseUrl(baseUrl);
  let resolved;
  try {
    resolved = new URL(statusUrl, trustedBaseUrl);
  } catch {
    throw new Error('Qualifier queue response included an invalid status URL.');
  }

  if (resolved.origin !== new URL(trustedBaseUrl).origin) {
    throw new Error('Qualifier queue response included an untrusted status URL.');
  }

  return resolved.toString();
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
    status_url: resolveCompanyQualifierStatusUrl(payload?.status_url),
    website: normalizeWebsiteInput(website),
    submitted_at: submittedAt
  };
};

export const submitCompanyQualifier = async (website, options = {}) => {
  const { fetchImpl = fetch, signal } = options;
  const body = buildCompanyQualifierRequestBody(website);
  const response = await fetchImpl(COMPANY_QUALIFIER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const details = await readErrorDetails(response);
    throw createRequestError(
      details || `Company qualifier failed with status ${response.status}.`,
      response.status,
      response.status >= 500
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
  const { fetchImpl = fetch, signal } = options;
  const statusUrl = resolveCompanyQualifierStatusUrl(job?.status_url);
  let response;

  try {
    response = await fetchImpl(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
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
      details || (response.status === 404
        ? 'This qualification job could not be found.'
        : `Unable to check qualification status (${response.status}).`),
      response.status,
      response.status >= 500 || response.status === 429
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
    fetchImpl = fetch,
    signal,
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
      const statusPayload = await getCompanyQualifierStatus(job, { fetchImpl, signal });
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

export const saveActiveQualifierJob = (job, storage = globalThis.localStorage) => {
  storage?.setItem(QUALIFIER_STORAGE_KEY, JSON.stringify(job));
};

export const clearActiveQualifierJob = (storage = globalThis.localStorage) => {
  storage?.removeItem(QUALIFIER_STORAGE_KEY);
};

export const loadActiveQualifierJob = (
  storage = globalThis.localStorage,
  now = () => Date.now()
) => {
  const raw = storage?.getItem(QUALIFIER_STORAGE_KEY);
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
      clearActiveQualifierJob(storage);
      return null;
    }

    return {
      transaction_id: String(parsed.transaction_id),
      status_url: resolveCompanyQualifierStatusUrl(parsed.status_url),
      website: normalizeWebsiteInput(parsed.website),
      submitted_at: new Date(submittedAt).toISOString()
    };
  } catch {
    clearActiveQualifierJob(storage);
    return null;
  }
};

// Backwards-compatible name for callers that previously submitted the qualifier directly.
export const runCompanyQualifier = submitCompanyQualifier;
