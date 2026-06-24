export const COMPANY_QUALIFIER_ENDPOINT = 'https://poc.growth-assist.co.uk/run-direct';

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

export const runCompanyQualifier = async (website, fetchImpl = fetch) => {
  const body = buildCompanyQualifierRequestBody(website);
  const response = await fetchImpl(COMPANY_QUALIFIER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch {
      details = '';
    }
    throw new Error(details || `Company qualifier failed with status ${response.status}.`);
  }

  return response.json();
};
